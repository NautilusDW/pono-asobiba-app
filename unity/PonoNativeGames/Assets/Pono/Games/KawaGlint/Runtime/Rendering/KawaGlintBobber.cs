using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Visual/behavioral state of <see cref="KawaGlintBobber"/>. Purely a
    /// presentation state machine -- it carries no gameplay rules and is
    /// driven entirely by the Gameplay-layer game controller (a different
    /// module) via <see cref="KawaGlintBobber.SetVisualState"/> and
    /// <see cref="KawaGlintBobber.BeginCast"/>.
    ///
    /// <see cref="BiteSink"/> must never be renamed or renumbered:
    /// <c>KawaGlintPreBitePlayModeTests</c> references it by name and pins
    /// the depth it produces.
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
    /// A float (ウキ) that rides the pinned <see cref="KawaWave"/> formula at
    /// its current world-space X. Its target height is smoothed with
    /// <see cref="Mathf.SmoothDamp"/> (rather than snapping straight onto the
    /// wave) so it reads as buoyant, and it tilts to the local wave slope.
    ///
    /// The sprite's pivot is expected to sit at the float's waistline
    /// (<see cref="KawaGlintBobberArt.WaistV"/>), not at its geometric
    /// centre, so writing the waterline straight into
    /// <c>transform.position.y</c> literally means "the waist is on the
    /// water". <see cref="Initialize"/>'s third argument is therefore the
    /// distance from that waist up to the antenna bead, not half the sprite
    /// height. (The old centre-pivot art happens to satisfy both readings
    /// with the same number, so a builder that has not been updated yet
    /// still behaves exactly as before.)
    ///
    /// On a bite it does much more than sink: it is dragged sideways toward
    /// the fish, tips its antenna over in that direction, and jitters as the
    /// fish worries at the bait -- the "食いつき牽引" cue. Every one of those
    /// curves lives in <see cref="KawaGlintPullMath"/> so it can be pinned by
    /// EditMode tests without a scene.
    ///
    /// This class carries zero gameplay rules -- it exposes only a passive
    /// presentation API (<see cref="VisualState"/>, <see cref="SetVisualState"/>,
    /// <see cref="BeginCast"/>, <see cref="SetPullDirection"/>) driven by the
    /// Gameplay-layer game controller, which is the only module allowed to
    /// know about tap input, casting targets, or bite windows.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintBobber : MonoBehaviour
    {
        /// <summary>Resource path of the "part of me is underwater" sprite shader.</summary>
        private const string SubmergeShaderResourcePath = "KawaGlint/Rendering/KawaBobberSubmerge";

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

        // Ambient tilt clamp -- Floating/Twitch/EscapePop only. The bite-pull
        // tilt has its own, much larger clamp
        // (KawaGlintPullMath.MaxPullTiltDegrees) and deliberately does not
        // widen this one.
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
        //
        // PINNED: KawaGlintPreBitePlayModeTests asserts a Deep bite drops the
        // float by at least 0.35 world units, and the whole shallow-vs-deep
        // read is calibrated against this number. Do not change it.
        private const float BiteSinkOffsetWorld = 0.55f;

        // SetSinkIntensity clamp -- a bigger fish may pull harder, but never
        // less hard than the pinned baseline above (which would break the
        // 0.35 regression guard) and never so hard it becomes a jolt.
        private const float MinSinkIntensity = 1.0f;
        private const float MaxSinkIntensity = 1.4f;

        // EscapePop: a brief upward pop above the waterline before the
        // caller hides the bobber (fish got away).
        private const float EscapePopOffsetWorld = 0.3f;
        private const float EscapePopDurationSeconds = 0.35f;

        private static readonly int SurfaceWorldYId = Shader.PropertyToID("_SurfaceWorldY");
        private static readonly int KawaTimeId = Shader.PropertyToID("_KawaTime");

        // Logged at most once per process so a stripped/unsupported shader
        // does not spam the console on every scene rebuild.
        private static bool _missingSubmergeShaderWarningLogged;

        private float _x;
        private float _waterlineY;
        private float _topOffsetWorld;
        private float _y;
        private float _velocity;

        // The Twitch jitter is layered on top of _y (the SmoothDamp'd
        // target) rather than folded into _y itself, so it is never eaten by
        // SmoothDamp's own damping (see TwitchAmplitude). _renderY is what
        // actually gets written to transform.position/TopWorldY every frame;
        // outside of Twitch/BiteSink it is always exactly equal to _y.
        private float _renderY;

        private SpriteRenderer _renderer;

        private Vector3 _flightFromWorld;
        private float _flightTargetX;
        private float _flightSeconds;
        private float _flightElapsed;

        private float _escapePopStartY;
        private float _escapePopElapsed;

        private float _twitchIntensity = 1f;

        // --- bite-pull state -------------------------------------------
        // Where the float would sit with no fish on it. Captured at the
        // moment a cast lands so the sideways drag is always measured from
        // the landing point, never from wherever a previous drag left it.
        private float _restX;

        // Which way the fish is tugging. Fish approach from +X, so +1 is the
        // normal case; the game controller overrides it per bite.
        private float _pullDirX = 1f;

        private float _sinkIntensity = 1f;

        // How much of KawaWave's height the *cut line on the sprite* follows.
        // Deliberately NOT applied to _renderY: the float's own bob always
        // rides the full wave; only the submerge shader's boundary is damped,
        // for backgrounds whose painted foam already implies a flatter
        // surface.
        private float _waveFollow = 1f;

        private float _pullElapsed;
        private float _releaseElapsed;
        private float _lateralEase;
        private float _tiltWeight;
        private float _lateralEaseAtRelease;
        private float _tiltWeightAtRelease;

        private bool _releasePopActive;
        private float _releasePopElapsed;

        private float _surfaceWorldY;
        private MaterialPropertyBlock _surfacePropertyBlock;

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
        /// World-space X of the bobber. Updated every frame while
        /// <see cref="KawaGlintBobberState.Flying"/> (a cast in flight) and
        /// while a bite drags it sideways -- callers that read this every
        /// frame (the ripple rings, the fishing line, the HUD timing ring)
        /// therefore track both for free, with no extra wiring.
        /// </summary>
        public float CenterWorldX => _x;

        /// <summary>World-space X the float returns to once nothing is pulling on it.</summary>
        public float RestWorldX => _restX;

        /// <summary>Sign of the direction a biting fish is currently pulling toward (+1 = toward +X).</summary>
        public float PullDirectionX => _pullDirX;

        /// <summary>The still-water line this float rides (the shared <c>WaterlineWorldY</c> contract).</summary>
        public float WaterlineWorldY => _waterlineY;

        /// <summary>
        /// World-space Y of the water surface at the float's current X, as of
        /// the last frame -- i.e. <c>waterlineY + KawaWave.Height(x, t) * waveFollow</c>.
        /// This is the single value the submerge shader cuts against, and the
        /// correct origin for any surface-level effect that wants to appear
        /// "where the float meets the water" (splashes, wake foam) without
        /// re-deriving the wave and risking a third divergent copy of it.
        /// </summary>
        public float SurfaceWorldY => _surfaceWorldY;

        /// <summary>The point where the float meets the water, in world space.</summary>
        public Vector3 SurfaceWorldPosition => new Vector3(_x, _surfaceWorldY, 0f);

        /// <summary>
        /// Current world-space Y of the fishing line's attachment point --
        /// the tip of the antenna bead. Tracks <c>_renderY</c> (the actually
        /// rendered Y, including any Twitch/bite jitter) rather than the
        /// SmoothDamp target alone, so the fishing line visibly follows the
        /// ちょんちょん jitter instead of staying glued to the un-jittered
        /// target.
        /// </summary>
        public float TopWorldY => _renderY + _topOffsetWorld;

        /// <summary>
        /// Builds the material the float should render with: the
        /// <c>Pono/KawaGlint/BobberSubmerge</c> shader, which tints and
        /// softens whichever part of the sprite is currently below the
        /// surface. Returns <paramref name="fallbackMaterial"/> unchanged
        /// (after one warning) when that shader is missing or unsupported, so
        /// the actors builder's "always succeeds, stock shaders only"
        /// contract still holds on every platform.
        ///
        /// The returned Material is runtime-generated and is never a project
        /// asset -- register it with
        /// <c>KawaGlintActorsController.RegisterGeneratedAsset</c> like every
        /// other generated asset in this module.
        /// </summary>
        public static Material CreateSubmergeMaterial(Material fallbackMaterial)
        {
            var shader = Resources.Load<Shader>(SubmergeShaderResourcePath);
            if (shader == null)
            {
                shader = Shader.Find("Pono/KawaGlint/BobberSubmerge");
            }

            if (shader == null || !shader.isSupported)
            {
                if (!_missingSubmergeShaderWarningLogged)
                {
                    Debug.LogWarning("KawaGlint: KawaBobberSubmerge shader is missing or unsupported on this platform; the float will render fully opaque above and below the waterline.");
                    _missingSubmergeShaderWarningLogged = true;
                }
                return fallbackMaterial;
            }

            return new Material(shader)
            {
                name = "KawaGlint Bobber Submerge (Runtime)",
                hideFlags = HideFlags.DontSave
            };
        }

        /// <summary>
        /// Sets the bobber's initial rest X, the waterline it rides, and the
        /// world-space distance from its pivot (the waistline) up to the
        /// fishing line's attachment point at the top of the antenna. Called
        /// once by <see cref="KawaGlintActorsBuilder.Build"/> immediately
        /// after this component is added.
        ///
        /// <paramref name="topOffsetWorld"/> replaced the old
        /// "halfHeightWorld" argument when the sprite pivot moved from the
        /// geometric centre to the waistline; for a centre-pivoted sprite the
        /// two are the same number, so an un-migrated caller is unaffected.
        /// </summary>
        internal void Initialize(float restWorldX, float waterlineWorldY, float topOffsetWorld)
        {
            _x = restWorldX;
            _restX = restWorldX;
            _waterlineY = waterlineWorldY;
            _topOffsetWorld = topOffsetWorld;
            _y = waterlineWorldY;
            _renderY = _y;
            _surfaceWorldY = waterlineWorldY;
            _velocity = 0f;
            _twitchIntensity = 1f;
            _sinkIntensity = 1f;
            ResetPullState();
            _renderer = GetComponent<SpriteRenderer>();
            transform.position = new Vector3(_x, _renderY, 0f);
            ApplyVisibility();
        }

        /// <summary>
        /// Switches the bobber's presentation state. Gameplay-driven --
        /// carries no rules of its own beyond toggling renderer visibility,
        /// resetting the EscapePop timer, and running the bite-pull
        /// engage/release ramps.
        /// </summary>
        public void SetVisualState(KawaGlintBobberState state)
        {
            var previous = VisualState;
            VisualState = state;

            if (state == KawaGlintBobberState.BiteSink)
            {
                // Re-entering BiteSink from BiteSink (the game controller has
                // more than one path into it) must not restart the ramp
                // mid-drag and re-snap the float.
                if (previous != KawaGlintBobberState.BiteSink)
                {
                    _pullElapsed = 0f;
                }
            }
            else if (previous == KawaGlintBobberState.BiteSink)
            {
                // Release: remember how far the drag had actually got so the
                // ramp-out starts from there rather than from a full 1.0,
                // which would visibly jump on a bite that was cut short.
                _releaseElapsed = 0f;
                _lateralEaseAtRelease = _lateralEase;
                _tiltWeightAtRelease = _tiltWeight;

                if (state == KawaGlintBobberState.Floating)
                {
                    // "ぷかっ" -- the moment the fish lets go. The velocity
                    // seed sharpens the first frames of the rise; the actual
                    // readable pop is the additive curve applied in
                    // UpdateFloating (see KawaGlintPullMath.BiteReleasePopWorldY
                    // for the measurement showing why the velocity alone
                    // cannot overshoot at this smooth time).
                    _velocity = KawaGlintPullMath.BiteReleasePopVelocity;
                    _releasePopActive = true;
                    _releasePopElapsed = 0f;
                }
            }

            if (state != KawaGlintBobberState.Floating)
            {
                _releasePopActive = false;
            }

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
        /// Sets which way a biting fish is dragging the float. Called by the
        /// game controller when a Deep event or a terminal bite begins,
        /// typically as <c>Mathf.Sign(targetFishX - bobberX)</c>. A zero
        /// argument is treated as +1 rather than as "no direction", so the
        /// drag always produces a visible cue.
        /// </summary>
        public void SetPullDirection(float dirX)
        {
            _pullDirX = dirX < 0f ? -1f : 1f;
        }

        /// <summary>
        /// Scales how deep a bite drags the float, clamped to
        /// [<see cref="MinSinkIntensity"/>, <see cref="MaxSinkIntensity"/>]:
        /// a bigger fish may pull harder, but never shallower than the pinned
        /// baseline (which the Deep-bite regression test depends on) and
        /// never hard enough to read as a jolt.
        /// </summary>
        public void SetSinkIntensity(float scale)
        {
            _sinkIntensity = Mathf.Clamp(scale, MinSinkIntensity, MaxSinkIntensity);
        }

        /// <summary>
        /// How much of the analytic wave the submerge shader's cut line
        /// follows, in [0,1]. Backgrounds whose painted water already implies
        /// a flatter, higher-contrast surface use a reduced value so the
        /// shader's boundary never separates from the painted foam and reads
        /// as a second waterline. Deliberately does not affect the float's
        /// own bob.
        /// </summary>
        public void SetWaveFollow(float waveFollow)
        {
            _waveFollow = Mathf.Clamp01(waveFollow);
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
            _restX = targetWorldX;
            ResetPullState();

            if (flightSeconds <= 0f)
            {
                _x = targetWorldX;
                _y = _waterlineY;
                _renderY = _y;
                transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.identity);
                SetVisualState(KawaGlintBobberState.Floating);
                // Casting straight out of a bite is a fresh throw, not a
                // release, so it must not inherit the "the fish let go" pop.
                _releasePopActive = false;
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
            AdvancePullRamps(Time.deltaTime);

            // Every surface-riding state (including Hidden, so the drag has
            // fully unwound by the time renda gives the float back) derives X
            // from the rest point plus the current drag. Flying is the one
            // exception: it drives X from its own flight lerp.
            if (VisualState != KawaGlintBobberState.Flying)
            {
                ApplyPullLateral();
            }

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

            _surfaceWorldY = _waterlineY + KawaWave.Height(_x, time) * _waveFollow;
            PushSurfaceToMaterial(time);
        }

        // Advances the engage/release ramps once per frame, before any state
        // handler reads them, so _x and the tilt are always derived from the
        // same weights within a frame.
        private void AdvancePullRamps(float deltaTime)
        {
            if (VisualState == KawaGlintBobberState.BiteSink)
            {
                _pullElapsed += deltaTime;
                _lateralEase = KawaGlintPullMath.LateralEase01(_pullElapsed);
                _tiltWeight = KawaGlintPullMath.TiltRamp01(_pullElapsed);
                return;
            }

            if (_lateralEaseAtRelease <= 0f && _tiltWeightAtRelease <= 0f)
            {
                _lateralEase = 0f;
                _tiltWeight = 0f;
                return;
            }

            _releaseElapsed += deltaTime;
            var remaining = 1f - KawaGlintPullMath.LateralRelease01(_releaseElapsed);
            _lateralEase = _lateralEaseAtRelease * remaining;
            _tiltWeight = _tiltWeightAtRelease * remaining;

            if (remaining <= 0f)
            {
                _lateralEaseAtRelease = 0f;
                _tiltWeightAtRelease = 0f;
            }
        }

        // The sideways drag is applied to the surface-riding states only;
        // Flying drives _x from its own flight lerp and must not be
        // overwritten.
        private void ApplyPullLateral()
        {
            _x = _restX + KawaGlintPullMath.BobberPullLateralOffsetWorld(_lateralEase, _pullDirX);
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

            // Added on top of the smoothed value, never folded into its
            // target -- same rule as the Twitch and bite jitters above.
            _renderY = _y + ConsumeReleasePop();
            ApplyWaveTiltedPosition(time);
        }

        // Advances (and eventually retires) the release pop. Returns the
        // world-space offset to add to this frame's rendered Y.
        private float ConsumeReleasePop()
        {
            if (!_releasePopActive)
            {
                return 0f;
            }

            _releasePopElapsed += Time.deltaTime;
            if (_releasePopElapsed > KawaGlintPullMath.BiteReleasePopTauSeconds * KawaGlintPullMath.BiteReleasePopTauCount)
            {
                _releasePopActive = false;
                return 0f;
            }

            return KawaGlintPullMath.BiteReleasePopWorldY(_releasePopElapsed);
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
            var targetY = _waterlineY + wave - BiteSinkOffsetWorld * _sinkIntensity;
            _y = Mathf.SmoothDamp(_y, targetY, ref _velocity, BiteSinkSmoothTime);

            // Same "add after the SmoothDamp, never inside its target" rule
            // as Twitch above. The nibble jitter is one-sided downward (see
            // KawaGlintPullMath.BobberPullJitterWorldY) so it can never make
            // the sink read shallower than the pinned 0.55.
            _renderY = _y + KawaGlintPullMath.BobberPullJitterWorldY(time);
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
        // is invoked) rather than _y directly, so the jitter added on top of
        // _y in UpdateTwitch/UpdateBiteSink is reflected in the actual
        // transform position, not just tracked internally.
        private void ApplyWaveTiltedPosition(float time)
        {
            var slope = KawaWave.Slope(_x, time);
            var waveTilt = Mathf.Clamp(
                Mathf.Atan(slope) * Mathf.Rad2Deg * TiltDegreesPerSlopeUnit,
                -MaxTiltDegrees,
                MaxTiltDegrees);

            float tilt;
            if (_tiltWeight > 0.0001f)
            {
                // The nibble tilt jitter only runs while the fish is actually
                // on it; during the release ramp the tilt just eases back to
                // the wave, with no residual buzzing.
                var jitter = VisualState == KawaGlintBobberState.BiteSink
                    ? Mathf.Sin(time * KawaGlintPullMath.BitePullJitterRadiansPerSecond)
                    : 0f;
                tilt = KawaGlintPullMath.BobberPullTiltDegrees(_tiltWeight, _pullDirX, waveTilt, jitter);
            }
            else
            {
                tilt = waveTilt;
            }

            transform.SetPositionAndRotation(new Vector3(_x, _renderY, 0f), Quaternion.Euler(0f, 0f, tilt));
        }

        // Feeds the submerge shader the surface height the float is itself
        // riding, rather than letting the shader re-derive the wave -- see
        // that shader's header for why a third copy of KawaWave's formula is
        // forbidden. Written through a MaterialPropertyBlock, so the shared
        // material is never cloned.
        private void PushSurfaceToMaterial(float time)
        {
            if (_renderer == null || !_renderer.enabled)
            {
                return;
            }

            if (_surfacePropertyBlock == null)
            {
                _surfacePropertyBlock = new MaterialPropertyBlock();
            }

            _renderer.GetPropertyBlock(_surfacePropertyBlock);
            _surfacePropertyBlock.SetFloat(SurfaceWorldYId, _surfaceWorldY);
            _surfacePropertyBlock.SetFloat(KawaTimeId, time);
            _renderer.SetPropertyBlock(_surfacePropertyBlock);
        }

        private void ResetPullState()
        {
            _pullElapsed = 0f;
            _releaseElapsed = 0f;
            _lateralEase = 0f;
            _tiltWeight = 0f;
            _lateralEaseAtRelease = 0f;
            _tiltWeightAtRelease = 0f;
            _releasePopActive = false;
            _releasePopElapsed = 0f;
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
