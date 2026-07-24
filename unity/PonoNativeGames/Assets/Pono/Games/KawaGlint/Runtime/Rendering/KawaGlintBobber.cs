using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Visual/behavioral state of <see cref="KawaGlintBobber"/>. Purely a
    /// presentation state machine -- it carries no gameplay rules and is
    /// driven entirely by the Gameplay-layer game controller (a different
    /// module) via <see cref="KawaGlintBobber.SetVisualState"/> and
    /// <see cref="KawaGlintBobber.BeginCast"/>.
    /// </summary>
    public enum KawaGlintBobberState
    {
        Hidden,
        Flying,
        Floating,
        Twitch,
        BiteSink,
        EscapePop
    }

    /// <summary>
    /// A half-submerged float (ウキ) that rides the pinned <see cref="KawaWave"/>
    /// formula at its current world-space X. Its target height is smoothed
    /// with <see cref="Mathf.SmoothDamp"/> (rather than snapping straight onto
    /// the wave) so it reads as buoyant, and it tilts to the local wave
    /// slope.
    ///
    /// The bobber sprite's pivot is set to its own vertical center by
    /// <see cref="KawaGlintActorsBuilder"/>, so resting the transform exactly
    /// on the waterline already reads as "half submerged" purely from the
    /// pivot placement -- this component never needs a separate submersion
    /// parameter.
    ///
    /// This class carries zero gameplay rules -- it exposes only a passive
    /// presentation API (<see cref="VisualState"/>, <see cref="SetVisualState"/>,
    /// <see cref="BeginCast"/>) driven by the Gameplay-layer game controller,
    /// which is the only module allowed to know about tap input, casting
    /// targets, or bite windows.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintBobber : MonoBehaviour
    {
        // Buoyancy feel: large enough that the float visibly lags the wave
        // (reads as floating, not glued to it) while still small enough to
        // stay clearly synced with the waterline shape at a glance.
        private const float SmoothTime = 0.08f;

        // BiteSink sinks noticeably faster than the ambient Floating sway so
        // the "real bite" reads as a distinct, sudden pull versus Twitch's
        // idle jitter.
        private const float BiteSinkSmoothTime = SmoothTime * 0.5f;

        // Converts the wave's dimensionless slope into a small, child-safe
        // tilt: 0.6 scales the raw arctangent-degrees down, and the result is
        // additionally hard-clamped to +/-MaxTiltDegrees below.
        private const float TiltDegreesPerSlopeUnit = 0.6f;
        private const float MaxTiltDegrees = 8f;

        // Flying tilts a fixed fraction of the max, toward the direction of
        // travel, rather than following the wave slope (there is no wave to
        // read while airborne).
        private const float FlyingTiltDegrees = MaxTiltDegrees * 0.5f;

        // Cast flight arc: added on top of the straight-line X/Y lerp from
        // the rod tip to the landing point so the bobber visibly arcs
        // through the air rather than sliding along a straight line.
        private const float ArcHeightWorld = 1.2f;

        // Twitch ("前あたり" / Shallow event): a fast jitter layered on top of
        // the Floating target Y -- distinct in frequency from any of the
        // three ambient wave components in KawaWave. Applied AFTER the
        // SmoothDamp smoothing below (see UpdateTwitch), not baked into the
        // SmoothDamp target, so SmoothTime's own damping never eats half the
        // amplitude -- that under-damping was the original root cause of the
        // "the bobber barely moves" bug report (jitter used to be folded
        // into the SmoothDamp target and lost ~half its amplitude to the
        // 0.08s smoothing before ever reaching the screen).
        private const float TwitchFrequency = 18f;
        private const float TwitchAmplitude = 0.12f;

        // SetTwitchIntensity clamp range -- keeps even the strongest Shallow
        // burst clearly visible but never a violent jolt (never more than
        // 1.5x the base amplitude, per the "no exaggerated/scary motion for
        // 3-7yo" contract).
        private const float MinTwitchIntensity = 0.5f;
        private const float MaxTwitchIntensity = 1.5f;

        // BiteSink ("本あたり" / Deep event): the float visibly sinks well
        // below its floating rest height -- deliberately several times
        // TwitchAmplitude so "just a little wiggle" (Shallow) and "a big
        // pull" (Deep) are unmistakably different at a glance, even to a
        // 3-7yo audience.
        private const float BiteSinkOffsetWorld = 0.55f;

        // EscapePop: a brief upward pop above the waterline before the
        // caller hides the bobber (fish got away).
        private const float EscapePopOffsetWorld = 0.3f;
        private const float EscapePopDurationSeconds = 0.35f;

        private float _x;
        private float _waterlineY;
        private float _halfHeightWorld;
        private float _y;
        private float _velocity;

        // The Twitch jitter is layered on top of _y (the SmoothDamp'd
        // target) rather than folded into _y itself, so it is never eaten by
        // SmoothDamp's own damping (see TwitchAmplitude). _renderY is what
        // actually gets written to transform.position/TopWorldY every frame;
        // outside of Twitch it is always exactly equal to _y.
        private float _renderY;

        private SpriteRenderer _renderer;

        private Vector3 _flightFromWorld;
        private float _flightTargetX;
        private float _flightSeconds;
        private float _flightElapsed;

        private float _escapePopStartY;
        private float _escapePopElapsed;

        private float _twitchIntensity = 1f;

        /// <summary>Current presentation state (Hidden/Flying/Floating/Twitch/BiteSink/EscapePop).</summary>
        public KawaGlintBobberState VisualState { get; private set; } = KawaGlintBobberState.Floating;

        /// <summary>
        /// Raised exactly once per cast, at the instant the bobber lands on the
        /// water (Flying -> Floating arrival, or the immediate-landing path of
        /// <see cref="BeginCast"/> when flightSeconds &lt;= 0). The argument is
        /// the landing point in world space (x = <see cref="CenterWorldX"/>,
        /// y = the waterline Y at rest). NOT raised by arbitrary
        /// <see cref="SetVisualState"/> calls -- only by the two landing paths
        /// above -- so a subscriber never has to guess whether a given
        /// Floating transition was a genuine splashdown.
        /// </summary>
        public event System.Action<Vector3> OnLanded;

        /// <summary>
        /// World-space X of the bobber. Fixed while Floating/Twitch/BiteSink,
        /// but updated every frame while <see cref="KawaGlintBobberState.Flying"/>
        /// (a cast in flight) -- callers that read this every frame (the
        /// ripple rings, the fishing line) automatically track the cast.
        /// </summary>
        public float CenterWorldX => _x;

        /// <summary>
        /// Current world-space Y of the top edge of the bobber sprite -- the
        /// fishing line's endpoint. Tracks <c>_renderY</c> (the actually
        /// rendered Y, including any Twitch jitter) rather than the
        /// SmoothDamp target alone, so the fishing line visibly follows the
        /// ちょんちょん jitter instead of staying glued to the un-jittered
        /// target.
        /// </summary>
        public float TopWorldY => _renderY + _halfHeightWorld;

        /// <summary>
        /// Sets the bobber's initial rest X, the waterline it rides, and half
        /// of its own rendered world height (used to find the sprite's top
        /// edge for the fishing-line attachment point). Called once by
        /// <see cref="KawaGlintActorsBuilder.Build"/> immediately after this
        /// component is added.
        /// </summary>
        internal void Initialize(float restWorldX, float waterlineWorldY, float halfHeightWorld)
        {
            _x = restWorldX;
            _waterlineY = waterlineWorldY;
            _halfHeightWorld = halfHeightWorld;
            _y = waterlineWorldY;
            _renderY = _y;
            _velocity = 0f;
            _twitchIntensity = 1f;
            _renderer = GetComponent<SpriteRenderer>();
            transform.position = new Vector3(_x, _renderY, 0f);
            ApplyVisibility();
        }

        /// <summary>
        /// Switches the bobber's presentation state. Gameplay-driven --
        /// carries no rules of its own beyond toggling renderer visibility
        /// and resetting the EscapePop timer.
        /// </summary>
        public void SetVisualState(KawaGlintBobberState state)
        {
            VisualState = state;
            if (state == KawaGlintBobberState.EscapePop)
            {
                _escapePopElapsed = 0f;
                // Starts from the visually rendered Y (including any live
                // Twitch jitter), not the un-jittered _y target, so the pop
                // never snaps by the jitter's amplitude on the first frame.
                _escapePopStartY = _renderY;
            }
            ApplyVisibility();
        }

        /// <summary>
        /// Scales the amplitude of the next (or current) <see cref="KawaGlintBobberState.Twitch"/>
        /// jitter -- driven per-Shallow-burst by the game controller from
        /// <see cref="KawaGlintPreBitePlan.EventIntensity01"/> so stronger
        /// bursts read as a visibly bigger tug. Clamped to
        /// [<see cref="MinTwitchIntensity"/>, <see cref="MaxTwitchIntensity"/>]
        /// so even the strongest Shallow burst stays clearly visible but
        /// never a jolt.
        /// </summary>
        public void SetTwitchIntensity(float scale)
        {
            _twitchIntensity = Mathf.Clamp(scale, MinTwitchIntensity, MaxTwitchIntensity);
        }

        /// <summary>
        /// Begins a cast: the bobber flies from <paramref name="fromWorld"/>
        /// (typically the rod tip) to <paramref name="targetWorldX"/> on the
        /// waterline along a shallow arc, then self-transitions to
        /// <see cref="KawaGlintBobberState.Floating"/> on arrival. A
        /// non-positive <paramref name="flightSeconds"/> lands immediately.
        /// </summary>
        public void BeginCast(Vector3 fromWorld, float targetWorldX, float flightSeconds)
        {
            _flightFromWorld = fromWorld;
            _flightTargetX = targetWorldX;
            _flightSeconds = flightSeconds;
            _flightElapsed = 0f;
            _velocity = 0f;

            if (flightSeconds <= 0f)
            {
                _x = targetWorldX;
                _y = _waterlineY;
                _renderY = _y;
                transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.identity);
                SetVisualState(KawaGlintBobberState.Floating);
                RaiseLanded();
                return;
            }

            _x = fromWorld.x;
            _y = fromWorld.y;
            _renderY = _y;
            transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.identity);
            SetVisualState(KawaGlintBobberState.Flying);
        }

        private void Update()
        {
            var time = Time.time;
            switch (VisualState)
            {
                case KawaGlintBobberState.Hidden:
                    break;
                case KawaGlintBobberState.Flying:
                    UpdateFlying();
                    break;
                case KawaGlintBobberState.Floating:
                    UpdateFloating(time);
                    break;
                case KawaGlintBobberState.Twitch:
                    UpdateTwitch(time);
                    break;
                case KawaGlintBobberState.BiteSink:
                    UpdateBiteSink(time);
                    break;
                case KawaGlintBobberState.EscapePop:
                    UpdateEscapePop(time);
                    break;
            }
        }

        private void UpdateFlying()
        {
            _flightElapsed += Time.deltaTime;
            var t = _flightSeconds > 0f ? Mathf.Clamp01(_flightElapsed / _flightSeconds) : 1f;

            _x = Mathf.Lerp(_flightFromWorld.x, _flightTargetX, t);
            var straightY = Mathf.Lerp(_flightFromWorld.y, _waterlineY, t);
            var arcBump = ArcHeightWorld * 4f * t * (1f - t);
            _y = straightY + arcBump;
            _renderY = _y;

            var direction = Mathf.Sign(_flightTargetX - _flightFromWorld.x);
            var tilt = direction * FlyingTiltDegrees;
            transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.Euler(0f, 0f, tilt));

            if (t >= 1f)
            {
                _x = _flightTargetX;
                _y = _waterlineY;
                _renderY = _y;
                _velocity = 0f;
                transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.identity);
                SetVisualState(KawaGlintBobberState.Floating);
                RaiseLanded();
            }
        }

        private void UpdateFloating(float time)
        {
            var wave = KawaWave.Height(_x, time);
            var targetY = _waterlineY + wave;
            _y = Mathf.SmoothDamp(_y, targetY, ref _velocity, SmoothTime);
            _renderY = _y;
            ApplyWaveTiltedPosition(time);
        }

        private void UpdateTwitch(float time)
        {
            // The SmoothDamp target below is the plain wave height -- no
            // jitter baked in -- so SmoothTime's damping never eats the
            // jitter's amplitude. The jitter is instead added to _renderY
            // AFTER smoothing, every frame, so it always reads at its full
            // configured amplitude regardless of how quickly _y is
            // converging onto the wave.
            var wave = KawaWave.Height(_x, time);
            var targetY = _waterlineY + wave;
            _y = Mathf.SmoothDamp(_y, targetY, ref _velocity, SmoothTime);

            var jitter = Mathf.Sin(time * TwitchFrequency) * TwitchAmplitude * _twitchIntensity;
            _renderY = _y + jitter;
            ApplyWaveTiltedPosition(time);
        }

        private void UpdateBiteSink(float time)
        {
            var wave = KawaWave.Height(_x, time);
            var targetY = _waterlineY + wave - BiteSinkOffsetWorld;
            _y = Mathf.SmoothDamp(_y, targetY, ref _velocity, BiteSinkSmoothTime);
            _renderY = _y;
            ApplyWaveTiltedPosition(time);
        }

        private void UpdateEscapePop(float time)
        {
            _escapePopElapsed += Time.deltaTime;
            var t = EscapePopDurationSeconds > 0f ? Mathf.Clamp01(_escapePopElapsed / EscapePopDurationSeconds) : 1f;
            _y = Mathf.Lerp(_escapePopStartY, _waterlineY + EscapePopOffsetWorld, t);
            _renderY = _y;
            ApplyWaveTiltedPosition(time);

            if (_escapePopElapsed >= EscapePopDurationSeconds)
            {
                SetVisualState(KawaGlintBobberState.Hidden);
            }
        }

        // Reads _renderY (set by every caller above, immediately before this
        // is invoked) rather than _y directly, so the Twitch jitter added on
        // top of _y in UpdateTwitch is reflected in the actual transform
        // position, not just tracked internally.
        private void ApplyWaveTiltedPosition(float time)
        {
            var slope = KawaWave.Slope(_x, time);
            var tilt = Mathf.Clamp(
                Mathf.Atan(slope) * Mathf.Rad2Deg * TiltDegreesPerSlopeUnit,
                -MaxTiltDegrees,
                MaxTiltDegrees);

            transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.Euler(0f, 0f, tilt));
        }

        private void ApplyVisibility()
        {
            if (_renderer != null)
            {
                _renderer.enabled = VisualState != KawaGlintBobberState.Hidden;
            }
        }

        // Invoked from exactly the two landing paths above (never from inside
        // SetVisualState itself), so a future gameplay-driven Floating
        // transition unrelated to an actual splashdown can never
        // double-trigger the splash effect.
        private void RaiseLanded()
        {
            OnLanded?.Invoke(new Vector3(_x, _y, 0f));
        }
    }
}
