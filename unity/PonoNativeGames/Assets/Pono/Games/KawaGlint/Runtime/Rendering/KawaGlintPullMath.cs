using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// One ripple ring's per-frame presentation values, returned by
    /// <see cref="KawaGlintPullMath.RingParamsFor"/>. A readonly struct (not a
    /// class) so the per-frame ring loop in the actors controller allocates
    /// nothing.
    /// </summary>
    public readonly struct KawaGlintRingParams
    {
        /// <summary>Uniform world-space scale of the ring sprite this frame.</summary>
        public readonly float Scale;

        /// <summary>Ring opacity this frame (fades to 0 at the end of every loop).</summary>
        public readonly float Alpha;

        /// <summary>
        /// World-space X offset from the ring's anchor. Non-zero only in
        /// Pull mode, where the ring visibly drifts toward the fish so the
        /// ripple pattern reads as asymmetric ("something is dragging the
        /// water"), not as the usual concentric ambient pulse.
        /// </summary>
        public readonly float CenterOffsetX;

        public KawaGlintRingParams(float scale, float alpha, float centerOffsetX)
        {
            Scale = scale;
            Alpha = alpha;
            CenterOffsetX = centerOffsetX;
        }
    }

    /// <summary>
    /// Pure math for the "食いつき牽引" (bite-pull) presentation layer: the
    /// bobber's lateral drag + tilt ramps, the renda tug decay, the rod-load
    /// curve, the three fishing-line modes and the three ripple-ring modes.
    ///
    /// Deliberately free of <see cref="MonoBehaviour"/> and of any per-frame
    /// state, exactly like <see cref="KawaGlintSplashMath"/> and
    /// <c>KawaGlintPreBitePlan</c> -- every function here is directly unit
    /// testable from EditMode with no scene at all, which is where the
    /// child-safety frequency ceiling and the tilt clamp are actually pinned.
    ///
    /// <b>Why the mode parameters are ints, not enums.</b> The three-way
    /// branch itself belongs to <c>KawaGlintActorsController</c> (a different
    /// workstream's file), which declares the public
    /// <c>KawaGlintLineMode</c>/<c>KawaGlintRingMode</c> enums that the rest
    /// of the game talks in. This module supplies only the numbers, so it
    /// takes <c>(int)mode</c> and keeps zero compile-time dependency on that
    /// file -- the pure-math layer therefore always builds (and its EditMode
    /// tests always run) regardless of which order the two land in. The
    /// integer codes below are pinned to the enum's declaration order and
    /// guarded by an EditMode test, mirroring the existing
    /// "<c>TsuriRarity</c> enum order is a contract" convention.
    ///
    /// <b>Ramps, not SmoothDamp.</b> The design spec words the lateral drag
    /// and tilt as "smooth times". They are implemented here as explicit
    /// <c>SmoothStep</c> ramps of the same durations instead, because (a) a
    /// ramp has exact endpoints (0 at t=0, 1 at t>=ramp) that can be pinned
    /// by a test, where <see cref="Mathf.SmoothDamp"/> only ever converges
    /// asymptotically, and (b) it keeps the whole curve outside the
    /// MonoBehaviour, so the "SmoothDamp silently ate half my amplitude"
    /// class of bug already documented in <see cref="KawaGlintBobber"/>
    /// cannot recur here.
    /// </summary>
    public static class KawaGlintPullMath
    {
        // -----------------------------------------------------------------
        // Mode codes (pinned to the actors controller's enum order)
        // -----------------------------------------------------------------

        /// <summary>Line hangs loose from the rod tip to the bobber (the default).</summary>
        public const int LineModeSlack = 0;

        /// <summary>Line is pulled taut toward the bobber while a fish is dragging it under (BiteSink).</summary>
        public const int LineModePullTaut = 1;

        /// <summary>Line is taut to the hooked fish's mouth during renda ("引き寄せ").</summary>
        public const int LineModeRenda = 2;

        /// <summary>Idle concentric ripples around the floating bobber.</summary>
        public const int RingModeAmbient = 0;

        /// <summary>Faster, stronger, drifting ripples while the bobber is being dragged under.</summary>
        public const int RingModePull = 1;

        /// <summary>Fastest, largest ripples around the line's water-entry point during renda.</summary>
        public const int RingModeRenda = 2;

        // -----------------------------------------------------------------
        // Child-safety ceiling (AGENTS.md / DESIGN.md: nothing that flickers
        // in brightness or alpha may reach 3 Hz for a 3-7 year old audience)
        // -----------------------------------------------------------------

        /// <summary>Hard upper bound every new oscillator in this feature is checked against.</summary>
        public const float ChildSafeMaxHertz = 3f;

        // -----------------------------------------------------------------
        // Bobber: lateral drag toward the fish
        // -----------------------------------------------------------------

        /// <summary>
        /// How far the bobber slides toward the fish while it is being
        /// dragged under. 0.28 wu is ~30px at 1080p -- clearly readable, and
        /// deliberately well inside the cast clamp's own 1.2/0.8 wu margins
        /// so a pulled bobber can never leave the castable water band.
        /// </summary>
        public const float BitePullLateralWorld = 0.28f;

        /// <summary>Ramp-in duration of the lateral drag -- the grab is fast.</summary>
        public const float BitePullLateralRampSeconds = 0.10f;

        /// <summary>Ramp-out duration of the lateral drag -- the release is slower and calmer than the grab.</summary>
        public const float BitePullLateralReleaseRampSeconds = 0.22f;

        // -----------------------------------------------------------------
        // Bobber: tilt toward the fish (the primary "it's being pulled" cue)
        // -----------------------------------------------------------------

        /// <summary>
        /// Peak tilt, multiplied by the pull direction. Negative Z-rotation
        /// leans the bobber's top (its antenna) toward +X, so a fish on the
        /// +X side visibly hauls the antenna over toward itself.
        /// </summary>
        public const float BitePullTiltDegrees = -26f;

        /// <summary>Ramp duration of the tilt. Never a snap -- the "don't startle a 3-7yo" contract.</summary>
        public const float BitePullTiltRampSeconds = 0.18f;

        /// <summary>
        /// Hard clamp for the pull tilt only. The ambient
        /// <c>KawaGlintBobber.MaxTiltDegrees</c> (8) still governs
        /// Floating/Twitch and is untouched.
        /// </summary>
        public const float MaxPullTiltDegrees = 32f;

        /// <summary>Wave-slope tilt is damped to 30% while pulling so the drag tilt stays the lead cue.</summary>
        public const float PullWaveSlopeContribution = 0.30f;

        /// <summary>
        /// "The fish is nibbling at it" jitter, in radians/second.
        /// 11 rad/s = 1.751 Hz -- keeps the ~2.2s bite window alive instead
        /// of frozen, and stays well under <see cref="ChildSafeMaxHertz"/>.
        /// </summary>
        public const float BitePullJitterRadiansPerSecond = 11f;

        /// <summary>Vertical jitter amplitude (world units) layered on the sink.</summary>
        public const float BitePullJitterWorldY = 0.05f;

        /// <summary>Tilt jitter amplitude (degrees) layered on the ramped drag tilt.</summary>
        public const float BitePullJitterTiltDegrees = 4f;

        /// <summary>
        /// Upward velocity handed to the bobber's buoyancy SmoothDamp the
        /// instant a bite is released. On its own this only sharpens the
        /// first few frames of the rise -- see
        /// <see cref="BiteReleasePopWorldY"/> for why it cannot produce the
        /// pop by itself.
        /// </summary>
        public const float BiteReleasePopVelocity = 1.2f;

        /// <summary>Peak height of the release pop above the settling float, in world units (~22px at 1080p).</summary>
        public const float BiteReleasePopWorld = 0.20f;

        /// <summary>Time from release to the peak of the pop.</summary>
        public const float BiteReleasePopTauSeconds = 0.18f;

        /// <summary>After this many time constants the pop is under a pixel and is switched off.</summary>
        public const float BiteReleasePopTauCount = 8f;

        // -----------------------------------------------------------------
        // Renda tug (one tap = one yank)
        // -----------------------------------------------------------------

        /// <summary>Exponential time constant of a single tap's tug impulse.</summary>
        public const float TugDecaySeconds = 0.18f;

        /// <summary>A full tug shortens the taut line's sag by this fraction.</summary>
        public const float TugLineSagFactor = 0.5f;

        /// <summary>A full tug drags the line's control point this far back toward the rod.</summary>
        public const float TugLineControlWorld = 0.10f;

        /// <summary>A full tug drags the hooked fish this far toward Pono -- "I am winning".</summary>
        public const float TugFishPullWorld = 0.08f;

        // -----------------------------------------------------------------
        // Fishing line: three modes
        // -----------------------------------------------------------------

        /// <summary>Slack sag below the straight rod-tip-to-bobber midpoint (the current shipped value).</summary>
        public const float LineSagSlackWorld = 0.35f;

        /// <summary>Sag the line settles to once fully pulled taut by a biting fish.</summary>
        public const float LineSagPullTautWorld = 0.12f;

        /// <summary>Sag during renda (the current shipped tense value).</summary>
        public const float LineSagRendaWorld = 0.06f;

        /// <summary>How long the slack line takes to draw taut when a fish bites.</summary>
        public const float LinePullTautRampSeconds = 0.18f;

        /// <summary>Line width multipliers per mode -- a loaded line reads thicker.</summary>
        public const float LineWidthMultiplierSlack = 1.0f;

        public const float LineWidthMultiplierPullTaut = 1.3f;

        public const float LineWidthMultiplierRenda = 1.5f;

        /// <summary>
        /// Tremble on the line's interior sample points. This is a
        /// sub-pixel *positional* vibration, not a brightness flicker, so
        /// the 3 Hz ceiling (which is a photosensitivity rule about
        /// luminance) does not apply to it -- see the safety table in the
        /// design spec.
        /// </summary>
        public const float LineTrembleFrequencyPullTaut = 34f;

        public const float LineTrembleFrequencyRenda = 46f;

        public const float LineTrembleAmplitudePullTaut = 0.010f;

        public const float LineTrembleAmplitudeRenda = 0.015f;

        // -----------------------------------------------------------------
        // Ripple rings: three modes
        // -----------------------------------------------------------------

        /// <summary>Ambient ripple loop -- unchanged from the shipped value.</summary>
        public const float RingLoopAmbientSeconds = 2.2f;

        /// <summary>Pull ripple loop. 0.9s -> a perceived 2.22 Hz with two half-period-offset rings.</summary>
        public const float RingLoopPullSeconds = 0.9f;

        /// <summary>
        /// Renda ripple loop. 0.8s -> a perceived 2.50 Hz. Deliberately not
        /// 0.7s, which would land on 2.86 Hz and leave no margin under
        /// <see cref="ChildSafeMaxHertz"/>.
        /// </summary>
        public const float RingLoopRendaSeconds = 0.8f;

        public const float RingMinScaleAmbient = 0.30f;
        public const float RingMaxScaleAmbient = 1.10f;
        public const float RingMaxAlphaAmbient = 0.35f;

        public const float RingMinScalePull = 0.25f;
        public const float RingMaxScalePull = 1.40f;
        public const float RingMaxAlphaPull = 0.50f;

        public const float RingMinScaleRenda = 0.30f;
        public const float RingMaxScaleRenda = 1.60f;
        public const float RingMaxAlphaRenda = 0.55f;

        /// <summary>How far a Pull-mode ring drifts toward the fish over one loop.</summary>
        public const float RingPullCenterDriftWorld = 0.12f;

        // -----------------------------------------------------------------
        // Bobber wake (the foam ridge dragged along the surface)
        // -----------------------------------------------------------------

        /// <summary>Wake anchor offset from the bobber, along the pull direction.</summary>
        public const float WakeOffsetWorldX = 0.10f;

        /// <summary>Rendered world width of the wake foam sprite (height follows its own aspect ratio).</summary>
        public const float WakeWorldWidth = 0.85f;

        public const float WakeFadeInSeconds = 0.15f;
        public const float WakeFadeOutSeconds = 0.25f;
        public const float WakePeakAlpha = 0.70f;
        public const float WakeAlphaBreath = 0.12f;

        /// <summary>Uniform (never x-only -- AR rule) scale pulse of the foam, +/-5%.</summary>
        public const float WakeScalePulse = 0.05f;

        /// <summary>Breathing rate of the wake's alpha and uniform scale pulse.</summary>
        public const float WakeBreathHertz = 1.6f;

        // -----------------------------------------------------------------
        // Rod load (consumed by the angler rig -- the numbers live here so
        // they are testable without a scene)
        // -----------------------------------------------------------------

        /// <summary>Rod lean while a fish is dragging: negative = the tip bows toward the water.</summary>
        public const float RodBendMaxDegrees = -9f;

        /// <summary>Momentary counter-lean on a renda tap: positive = Pono hauling back.</summary>
        public const float RodHaulDegrees = 4f;

        public const float RodJitterDegrees = 0.9f;

        /// <summary>Rod judder rate during renda.</summary>
        public const float RodJudderHertz = 2.4f;

        public const float RodLoadSmoothTime = 0.12f;
        public const float RodLoadTwitch01 = 0.15f;
        public const float RodLoadBiteSink01 = 0.75f;
        public const float RodLoadBiteSinkWobble01 = 0.12f;
        public const float RendaRodLoadMin01 = 0.60f;
        public const float RendaRodLoadMax01 = 0.85f;

        /// <summary>How fast the rod springs straight again after the fish escapes -- the clearest "逃げられた" read.</summary>
        public const float RodLoadEscapeReleaseSeconds = 0.30f;

        public const float RodLoadLandedReleaseSeconds = 0.40f;

        // Reuses the bobber's own nibble rate so the rod and the float
        // breathe together rather than beating against each other.
        private const float RodLoadWobbleRadiansPerSecond = BitePullJitterRadiansPerSecond;

        // -----------------------------------------------------------------
        // Submerge shader mirror (the .shader file is the authority for the
        // values; only the frequency is duplicated here, and only so the
        // child-safety test can see it)
        // -----------------------------------------------------------------

        /// <summary>Mirrors <c>KawaBobberSubmerge.shader</c>'s <c>_UnderWobbleFreq</c> default (9 rad/s = 1.43 Hz).</summary>
        public const float SubmergeWobbleRadiansPerSecond = 9f;

        // -----------------------------------------------------------------
        // Renda progress feedback
        // -----------------------------------------------------------------

        /// <summary>Thrash amplitude multiplier at renda progress 0 (fresh fish).</summary>
        public const float RendaThrashAmplitudeAtStart = 1.0f;

        /// <summary>Thrash amplitude multiplier at renda progress 1 (tired fish) -- readable without reading a number.</summary>
        public const float RendaThrashAmplitudeAtEnd = 0.6f;

        // =================================================================
        // Ramps and decays
        // =================================================================

        /// <summary>
        /// SmoothStep ramp from 0 to 1 over <paramref name="rampSeconds"/>.
        /// Exactly 0 at (and before) t = 0 and exactly 1 at (and after)
        /// t = rampSeconds -- the endpoint guarantee that makes every ramp
        /// in this module unit-testable.
        /// </summary>
        public static float SmoothRamp01(float elapsedSeconds, float rampSeconds)
        {
            if (rampSeconds <= 0f)
            {
                return elapsedSeconds > 0f ? 1f : 0f;
            }

            var t = Mathf.Clamp01(elapsedSeconds / rampSeconds);
            return t * t * (3f - 2f * t);
        }

        /// <summary>Ramp-in weight of the bobber's lateral drag, <paramref name="elapsedSeconds"/> after the bite began.</summary>
        public static float LateralEase01(float elapsedSeconds)
        {
            return SmoothRamp01(elapsedSeconds, BitePullLateralRampSeconds);
        }

        /// <summary>
        /// Ramp-out weight, <paramref name="elapsedSeconds"/> after the bite
        /// released: 0 means "still fully pulled aside", 1 means "fully back
        /// at rest". Slower than <see cref="LateralEase01"/> on purpose.
        /// </summary>
        public static float LateralRelease01(float elapsedSeconds)
        {
            return SmoothRamp01(elapsedSeconds, BitePullLateralReleaseRampSeconds);
        }

        /// <summary>Ramp-in weight of the bobber's drag tilt.</summary>
        public static float TiltRamp01(float elapsedSeconds)
        {
            return SmoothRamp01(elapsedSeconds, BitePullTiltRampSeconds);
        }

        /// <summary>
        /// Impulse envelope of one renda tap: exactly 1 at the instant of
        /// the tap, decaying as exp(-t / <see cref="TugDecaySeconds"/>).
        /// </summary>
        public static float TugDecay(float elapsedSeconds)
        {
            if (elapsedSeconds <= 0f)
            {
                return 1f;
            }

            return Mathf.Exp(-elapsedSeconds / TugDecaySeconds);
        }

        // =================================================================
        // Bobber pose
        // =================================================================

        /// <summary>
        /// The "ぷかっ" release pop, in world units above wherever the float
        /// is currently settling. Exactly 0 at t = 0 (so it can never snap),
        /// peaks at <see cref="BiteReleasePopWorld"/> after
        /// <see cref="BiteReleasePopTauSeconds"/>, then decays away.
        ///
        /// <b>Why this is an explicit curve and not just an initial velocity.</b>
        /// The obvious one-line implementation -- seed the existing buoyancy
        /// <see cref="Mathf.SmoothDamp"/> with a positive velocity and let it
        /// overshoot -- does not work here, and measurably so. SmoothDamp is
        /// a critically-damped spring with omega = 2 / smoothTime = 25 rad/s,
        /// and it can only overshoot its target if the seeded velocity
        /// exceeds omega times the current displacement. Releasing from a
        /// 0.55 wu sink that threshold is 13.75 wu/s; the specified 1.2 wu/s
        /// moves the float by at most 0.018 wu (about 2 px at 1080p) and
        /// never crosses the waterline at all. Layering the pop on top of
        /// the smoothed value instead -- the same rule this file already
        /// applies to the Twitch and bite jitters, and for the same reason --
        /// is what makes "the fish let go" actually readable.
        /// </summary>
        public static float BiteReleasePopWorldY(float elapsedSeconds)
        {
            if (elapsedSeconds <= 0f || BiteReleasePopTauSeconds <= 0f)
            {
                return 0f;
            }

            var t = elapsedSeconds / BiteReleasePopTauSeconds;
            return BiteReleasePopWorld * t * Mathf.Exp(1f - t);
        }

        /// <summary>
        /// World-space X offset from the bobber's rest position for a drag
        /// weight of <paramref name="ease01"/> toward <paramref name="pullDirX"/>.
        /// </summary>
        public static float BobberPullLateralOffsetWorld(float ease01, float pullDirX)
        {
            return BitePullLateralWorld * PullSign(pullDirX) * Mathf.Clamp01(ease01);
        }

        /// <summary>
        /// Final Z rotation (degrees) of a bobber being dragged under:
        /// the ramped drag tilt toward the fish, plus a damped share of the
        /// local wave slope, plus the nibble jitter -- all hard-clamped to
        /// +/-<see cref="MaxPullTiltDegrees"/>.
        /// </summary>
        /// <param name="tiltWeight01">Ramp weight (see <see cref="TiltRamp01"/>), 0 = not pulling, 1 = fully pulled.</param>
        /// <param name="pullDirX">Sign of the direction the fish is pulling toward.</param>
        /// <param name="waveTiltDegrees">The bobber's ordinary wave-slope tilt, already clamped by the caller.</param>
        /// <param name="jitter11">Nibble oscillator in [-1, 1].</param>
        /// <remarks>
        /// The wave-slope damping is itself ramped in by
        /// <paramref name="tiltWeight01"/> rather than applied flat. A flat
        /// 0.30 would make this function disagree with the un-pulled tilt
        /// (plain <paramref name="waveTiltDegrees"/>) at weight 0, so the very
        /// first frame of a bite -- and the frame the release ramp finally
        /// reaches zero -- would jump the float by up to
        /// 0.7 x 5.43 = 3.8 degrees in a single frame, roughly 19x the wave's
        /// own peak per-frame rate. The design contract for this feature is
        /// explicitly "0.18s slow-in, never an instantaneous snap", so the
        /// endpoint has to be continuous: at weight 0 this returns exactly
        /// <paramref name="waveTiltDegrees"/>, and the damping to 0.30 fades
        /// in over the same ramp as the drag tilt itself.
        /// </remarks>
        public static float BobberPullTiltDegrees(float tiltWeight01, float pullDirX, float waveTiltDegrees, float jitter11)
        {
            var weight = Mathf.Clamp01(tiltWeight01);
            var tilt = BitePullTiltDegrees * PullSign(pullDirX) * weight
                + waveTiltDegrees * Mathf.Lerp(1f, PullWaveSlopeContribution, weight)
                + BitePullJitterTiltDegrees * Mathf.Clamp(jitter11, -1f, 1f) * weight;

            return Mathf.Clamp(tilt, -MaxPullTiltDegrees, MaxPullTiltDegrees);
        }

        /// <summary>
        /// Vertical nibble jitter added to the bobber's sink, in world
        /// units. Deliberately one-sided (range [-<see cref="BitePullJitterWorldY"/>, 0],
        /// i.e. it only ever makes the float sit *deeper*, never shallower)
        /// so it can never eat into the pinned "a Deep bite sinks the bobber
        /// by at least 0.35 wu" regression guard in
        /// <c>KawaGlintPreBitePlayModeTests</c>: at the worst-case wave phase
        /// difference that assertion only has ~0.036 wu of headroom, which a
        /// symmetric +/-0.05 jitter would consume. Sinking deeper also reads
        /// as *more* distinct from a Shallow twitch, never less.
        /// </summary>
        public static float BobberPullJitterWorldY(float timeSeconds)
        {
            var oscillator = Mathf.Sin(timeSeconds * BitePullJitterRadiansPerSecond);
            return (oscillator - 1f) * 0.5f * BitePullJitterWorldY;
        }

        // =================================================================
        // Fishing line
        // =================================================================

        /// <summary>
        /// Sag (world units below the straight midpoint) for
        /// <paramref name="lineMode"/>, <paramref name="engagedSeconds"/>
        /// after that mode was entered. Only PullTaut is time-dependent --
        /// it is the slack line visibly drawing tight, which is the
        /// universal "it bit!" signal this whole feature exists to restore.
        /// </summary>
        public static float LineSagFor(int lineMode, float engagedSeconds)
        {
            switch (lineMode)
            {
                case LineModePullTaut:
                    return Mathf.Lerp(
                        LineSagSlackWorld,
                        LineSagPullTautWorld,
                        SmoothRamp01(engagedSeconds, LinePullTautRampSeconds));
                case LineModeRenda:
                    return LineSagRendaWorld;
                default:
                    return LineSagSlackWorld;
            }
        }

        /// <summary>Line width multiplier for <paramref name="lineMode"/>.</summary>
        public static float LineWidthMultiplierFor(int lineMode)
        {
            switch (lineMode)
            {
                case LineModePullTaut:
                    return LineWidthMultiplierPullTaut;
                case LineModeRenda:
                    return LineWidthMultiplierRenda;
                default:
                    return LineWidthMultiplierSlack;
            }
        }

        /// <summary>Tremble angular frequency (rad/s) for <paramref name="lineMode"/>; 0 for a slack line.</summary>
        public static float LineTrembleFrequencyFor(int lineMode)
        {
            switch (lineMode)
            {
                case LineModePullTaut:
                    return LineTrembleFrequencyPullTaut;
                case LineModeRenda:
                    return LineTrembleFrequencyRenda;
                default:
                    return 0f;
            }
        }

        /// <summary>Tremble amplitude (world units) for <paramref name="lineMode"/>; 0 for a slack line.</summary>
        public static float LineTrembleAmplitudeFor(int lineMode)
        {
            switch (lineMode)
            {
                case LineModePullTaut:
                    return LineTrembleAmplitudePullTaut;
                case LineModeRenda:
                    return LineTrembleAmplitudeRenda;
                default:
                    return 0f;
            }
        }

        /// <summary>
        /// Finds where an already-sampled fishing line first crosses the
        /// water surface, walking from the rod tip outward, and returns the
        /// linearly interpolated world X of that crossing. This is the
        /// tug-of-war anchor during renda (the bobber itself is hidden
        /// underwater then, so there is nothing else on the surface to hang
        /// the wake and the ripple rings off).
        ///
        /// Costs nothing extra: it reads the very buffer the LineRenderer
        /// was just handed.
        /// </summary>
        public static bool TryFindWaterCrossingX(Vector3[] points, int count, float surfaceWorldY, out float worldX)
        {
            worldX = 0f;
            if (points == null || count < 2)
            {
                return false;
            }

            var usable = Mathf.Min(count, points.Length);
            for (var i = 1; i < usable; i++)
            {
                var a = points[i - 1];
                var b = points[i];
                var da = a.y - surfaceWorldY;
                var db = b.y - surfaceWorldY;
                if ((da > 0f && db > 0f) || (da < 0f && db < 0f))
                {
                    continue;
                }

                var denominator = da - db;
                var t = Mathf.Abs(denominator) < 1e-6f ? 0f : da / denominator;
                worldX = Mathf.Lerp(a.x, b.x, Mathf.Clamp01(t));
                return true;
            }

            return false;
        }

        // =================================================================
        // Ripple rings
        // =================================================================

        /// <summary>Loop duration (seconds) for <paramref name="ringMode"/>.</summary>
        public static float RingLoopDurationFor(int ringMode)
        {
            switch (ringMode)
            {
                case RingModePull:
                    return RingLoopPullSeconds;
                case RingModeRenda:
                    return RingLoopRendaSeconds;
                default:
                    return RingLoopAmbientSeconds;
            }
        }

        /// <summary>
        /// Normalized loop position of a ring whose phase is
        /// <paramref name="phase01"/> (a *fraction of a loop*, not seconds).
        ///
        /// Phase must be normalized rather than expressed in seconds: the
        /// two rings are meant to sit exactly half a period apart, and a
        /// fixed second-offset derived from the ambient 2.2s loop stops
        /// being half a period the moment the loop shortens to 0.9s or 0.8s
        /// -- at which point the two rings drift into near-unison and the
        /// ripple stops reading as a continuous outward pulse.
        /// </summary>
        public static float RingLoopT(float timeSeconds, float loopDurationSeconds, float phase01)
        {
            if (loopDurationSeconds <= 0f)
            {
                return 0f;
            }

            return Mathf.Repeat(timeSeconds / loopDurationSeconds + phase01, 1f);
        }

        /// <summary>
        /// Scale/alpha/center-drift of a ripple ring at normalized loop
        /// position <paramref name="loopT"/> in <paramref name="ringMode"/>.
        /// </summary>
        public static KawaGlintRingParams RingParamsFor(int ringMode, float loopT, float pullDirX)
        {
            var t = Mathf.Clamp01(loopT);

            float minScale;
            float maxScale;
            float maxAlpha;
            float centerOffsetX;

            switch (ringMode)
            {
                case RingModePull:
                    minScale = RingMinScalePull;
                    maxScale = RingMaxScalePull;
                    maxAlpha = RingMaxAlphaPull;
                    centerOffsetX = PullSign(pullDirX) * RingPullCenterDriftWorld * t;
                    break;
                case RingModeRenda:
                    minScale = RingMinScaleRenda;
                    maxScale = RingMaxScaleRenda;
                    maxAlpha = RingMaxAlphaRenda;
                    centerOffsetX = 0f;
                    break;
                default:
                    minScale = RingMinScaleAmbient;
                    maxScale = RingMaxScaleAmbient;
                    maxAlpha = RingMaxAlphaAmbient;
                    centerOffsetX = 0f;
                    break;
            }

            return new KawaGlintRingParams(
                Mathf.Lerp(minScale, maxScale, t),
                Mathf.Lerp(maxAlpha, 0f, t),
                centerOffsetX);
        }

        /// <summary>
        /// Perceived flicker rate of a two-ring set at
        /// <paramref name="loopDurationSeconds"/>: two rings half a period
        /// apart present two fade cycles per loop, so the rate a viewer
        /// actually sees is twice the loop rate.
        /// </summary>
        public static float RingPerceivedHertz(float loopDurationSeconds)
        {
            if (loopDurationSeconds <= 0f)
            {
                return 0f;
            }

            return 2f / loopDurationSeconds;
        }

        // =================================================================
        // Rod load
        // =================================================================

        /// <summary>
        /// Instantaneous rod load in [0,1]: a steady base, a slow wobble
        /// while a fish is working the bait, and any live tap impulse.
        /// The angler rig turns this into a lean angle; keeping the curve
        /// here means the safety review can read it without a scene.
        /// </summary>
        public static float RodLoadCurve(float baseLoad01, float wobbleAmplitude01, float pulse01, float timeSeconds)
        {
            var wobble = wobbleAmplitude01 * Mathf.Sin(timeSeconds * RodLoadWobbleRadiansPerSecond);
            return Mathf.Clamp01(baseLoad01 + wobble + pulse01);
        }

        /// <summary>Base rod load during renda -- the closer the fish gets, the more Pono has to brace.</summary>
        public static float RendaRodLoad01(float progress01)
        {
            return Mathf.Lerp(RendaRodLoadMin01, RendaRodLoadMax01, Mathf.Clamp01(progress01));
        }

        /// <summary>
        /// Thrash amplitude multiplier as renda progresses: the fish
        /// visibly tires. This is the progress read for a 3-4 year old who
        /// cannot read the gauge's number.
        /// </summary>
        public static float RendaThrashAmplitudeMultiplier(float progress01)
        {
            return Mathf.Lerp(RendaThrashAmplitudeAtStart, RendaThrashAmplitudeAtEnd, Mathf.Clamp01(progress01));
        }

        // =================================================================
        // Shared helpers
        // =================================================================

        /// <summary>Clamps a world X so a sprite of half-width <paramref name="halfWidth"/> stays fully inside [<paramref name="minX"/>, <paramref name="maxX"/>].</summary>
        public static float ClampInsideRect(float worldX, float halfWidth, float minX, float maxX)
        {
            var low = minX + halfWidth;
            var high = maxX - halfWidth;
            if (low > high)
            {
                return (minX + maxX) * 0.5f;
            }

            return Mathf.Clamp(worldX, low, high);
        }

        /// <summary>Converts radians/second into hertz -- used by the child-safety tests and by the wake's breathing rate.</summary>
        public static float RadiansPerSecondToHertz(float radiansPerSecond)
        {
            return radiansPerSecond / (2f * Mathf.PI);
        }

        /// <summary>Converts hertz into radians/second.</summary>
        public static float HertzToRadiansPerSecond(float hertz)
        {
            return hertz * 2f * Mathf.PI;
        }

        // A zero pull direction (never set, or a fish exactly on top of the
        // bobber) resolves to +1 rather than 0, so the drag never silently
        // becomes a no-op with no visible cue at all.
        private static float PullSign(float pullDirX)
        {
            return pullDirX < 0f ? -1f : 1f;
        }
    }
}
