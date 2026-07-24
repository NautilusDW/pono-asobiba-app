using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>How the fishing line is drawn right now. See <see cref="KawaGlintActorsController.SetLineMode"/>.</summary>
    public enum KawaGlintLineMode
    {
        /// <summary>Idle: a relaxed catenary from the rod tip down to the bobber. The default.</summary>
        Slack,

        /// <summary>A fish is dragging the bobber under: still drawn to the bobber, but tightening and thickening.</summary>
        PullTaut,

        /// <summary>Reeling in (連打): drawn taut all the way to the fish's mouth.</summary>
        Renda
    }

    /// <summary>How the surface ripple rings are drawn right now. See <see cref="KawaGlintActorsController.SetRingMode"/>.</summary>
    public enum KawaGlintRingMode
    {
        /// <summary>Slow idle rings around a floating bobber.</summary>
        Ambient,

        /// <summary>Faster, wider, brighter rings while the bobber is being dragged.</summary>
        Pull,

        /// <summary>Widest and brightest, anchored to the drag wake, while reeling in.</summary>
        Renda
    }

    /// <summary>
    /// Root of every wave-synced actor built by <see cref="KawaGlintActorsBuilder"/>:
    /// fish-shadow drift/bob/wrap, ripple-ring looping, and the fishing
    /// line's per-frame quadratic-bezier re-sampling to the bobber. Also owns
    /// the lifecycle of every runtime-generated Texture2D/Sprite/Material
    /// the builder created, since none of it exists as a project asset and
    /// nothing else in the project would otherwise free it.
    ///
    /// The public surface here is the Gameplay layer's whole vocabulary for
    /// "what does the water look like right now": which line/ring mode is
    /// active, which fish is on the hook and how rare it is, and how far along
    /// the reel-in the player is. Everything takes plain values (strings,
    /// ints, floats) so this assembly never references
    /// <c>Pono.KawaGlint.Core</c>.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintActorsController : MonoBehaviour
    {
        // Ambient ripple loop, pinned by DESIGN.md module 4 ("scale 0.3->1.1
        // world units / 2.2 seconds"). Aliased (not re-declared) from
        // KawaGlintPullMath so there is exactly one copy of the number.
        public const float RingLoopDurationSeconds = KawaGlintPullMath.RingLoopAmbientSeconds;

        /// <summary>Number of ripple rings the builder creates. Their phases are evenly spread across one loop.</summary>
        public const int RingCount = 2;

        // Small structs of raw animation parameters (not per-actor
        // MonoBehaviours) so Update() below touches zero managed-heap
        // allocations per frame beyond simple indexing over pre-sized lists.
        private struct FishEntry
        {
            public Transform Transform;
            public SpriteRenderer Renderer;
            public float Speed;
            public float Direction;
            public float BaseY;
            public float BobSpeed;
            public float BobPhase;
            public float BobAmplitude;
            public float HalfWidth;
            public float Length;
        }

        private struct RingEntry
        {
            public Transform Transform;
            public SpriteRenderer Renderer;

            /// <summary>
            /// Phase as a fraction of one loop, NOT seconds. Normalizing it
            /// is what lets the loop duration change per ring mode while the
            /// two rings stay exactly half a period apart -- a phase measured
            /// in seconds silently stops being a half-period the moment the
            /// duration changes.
            /// </summary>
            public float Phase01;
        }

        // Target fish (the one the player actually catches) is driven
        // step-by-step by the Gameplay-layer game controller rather than
        // animating ambiently like the four FishEntry silhouettes above --
        // hence a small explicit mode enum instead of a per-frame formula.
        private enum TargetFishMode
        {
            Hidden,
            Approach,
            Thrash,
            Flee
        }

        // Every line/ring/tug number below comes from KawaGlintPullMath --
        // one testable, MonoBehaviour-free table shared with the bobber, the
        // wake and the rod, so the four cues that fire on a single bite
        // cannot drift apart. The only numbers kept locally are the two that
        // are purely about rarity readability and belong to no one else.

        // Ripple rings are the one piece of rare-fish feedback the player is
        // guaranteed to be looking at, because during the wait the bobber is
        // the only thing moving. Lifting their alpha and tinting them toward
        // the rarity accent costs nothing and is visible before the fish is.
        private const float RingAmbientRareMaxAlpha = 0.45f;
        private const float RingRarityTintMix = 0.35f;

        private const float TargetFishAnchorY = 0.6f;
        private const float TargetFishTargetXOffset = 0.4f;
        private const float TargetFishFleeSinkSpeedWorld = 0.5f;

        // Golden-angle step so successive casts' weave phases spread out
        // instead of repeating; consumes no randomness.
        private const float WeavePhaseStep = 2.3999632f;

        private static readonly int WagAmpId = Shader.PropertyToID("_WagAmp");
        private static readonly int WagSpeedId = Shader.PropertyToID("_WagSpeed");
        private static readonly int WagStartUId = Shader.PropertyToID("_WagStartU");
        private static readonly int WagWaveId = Shader.PropertyToID("_WagWave");

        private readonly List<Object> _generatedAssets = new List<Object>();
        private readonly List<FishEntry> _fish = new List<FishEntry>();
        private readonly List<RingEntry> _rings = new List<RingEntry>();

        private float _wrapMinX;
        private float _wrapMaxX;

        private KawaGlintBobber _bobber;
        private KawaGlintBobberWake _wake;
        private LineRenderer _fishingLine;
        private Vector3 _rodTipWorldPosition;
        private Vector3[] _lineBuffer;

        private bool _ringsVisible = true;
        private bool _lineVisible = true;
        private KawaGlintLineMode _lineMode = KawaGlintLineMode.Slack;
        private float _lineModeElapsed;
        private float _lineBaseWidth = 1f;

        private KawaGlintRingMode _ringMode = KawaGlintRingMode.Ambient;

        // +1 when the fish pulls toward +X, -1 the other way. Fish approach
        // from the right, so +1 is the normal case.
        private float _pullDirX = 1f;

        private float _tugAge = float.MaxValue;
        private float _rendaProgress01;

        // How strongly surface-anchored actors follow the wave (0 = pinned to
        // the flat waterline). Owned by the background/waterline work; stored
        // here so a single call can fan it out to every surface actor.
        private float _surfaceWaveFollow = 1f;

        private Transform _targetFishTransform;
        private SpriteRenderer _targetFishRenderer;
        private KawaGlintRareAura _targetFishAura;
        private float _targetFishNativeWidthWorld;
        private float _targetFishWorldLength;
        private int _targetFishTier;
        private TargetFishMode _targetFishMode = TargetFishMode.Hidden;
        private Vector3 _targetFishAppearWorld;
        private float _targetFishTargetAnchorX;
        private float _targetFishProgress;
        private float _targetFishWeavePhase;
        private int _castCounter;

        // Tail-wag MPB state (module D). Tracked separately from
        // _targetFishMode so ApplyTargetFishWag can cheaply no-op on the many
        // per-frame calls that re-set _targetFishMode to the same value it
        // already was (e.g. SetTargetFishApproach during a multi-second
        // approach) -- the MPB update only actually runs on a genuine
        // mode-or-tier transition.
        private MaterialPropertyBlock _targetFishWagMpb;
        private TargetFishMode _targetFishWagAppliedMode;
        private int _targetFishWagAppliedTier;
        private bool _targetFishWagApplied;

        /// <summary>The bobber this controller drives the ripple rings/fishing line against.</summary>
        public KawaGlintBobber Bobber => _bobber;

        /// <summary>Rarity tier of the fish currently on the hook (0 when none/normal). Drives the ripple-ring tint.</summary>
        public int TargetFishTier => _targetFishTier;

        /// <summary>Whether the ambient ripple rings are currently drawn (default true, spike-compatible).</summary>
        public void SetRingsVisible(bool visible)
        {
            _ringsVisible = visible;
            for (var i = 0; i < _rings.Count; i++)
            {
                _rings[i].Renderer.enabled = visible;
            }
        }

        /// <summary>Whether the rod-tip-to-bobber fishing line is currently drawn (default true, spike-compatible).</summary>
        public void SetFishingLineVisible(bool visible)
        {
            _lineVisible = visible;
        }

        /// <summary>
        /// Selects how the fishing line is drawn. See
        /// <see cref="KawaGlintLineMode"/>.
        ///
        /// Re-selecting the current mode is a no-op (the sag ramp is not
        /// restarted), so this is safe to call every frame.
        /// </summary>
        public void SetLineMode(KawaGlintLineMode mode)
        {
            if (_lineMode == mode)
            {
                return;
            }

            _lineMode = mode;
            _lineModeElapsed = 0f;

            if (_fishingLine != null)
            {
                _fishingLine.widthMultiplier =
                    _lineBaseWidth * KawaGlintPullMath.LineWidthMultiplierFor(PullMathLineMode(mode));
            }

            if (_lineMode != KawaGlintLineMode.Renda && _wake != null)
            {
                // Renda is the only mode whose wake follows the line's water
                // entry point instead of the float; drop the stale anchor as
                // soon as we leave it.
                _wake.ClearRendaAnchor();
            }
        }

        /// <summary>
        /// Selects how the surface ripple rings are drawn. See
        /// <see cref="KawaGlintRingMode"/>. Also drives the surface wake,
        /// whose three states line up exactly with the ring modes (idle /
        /// being dragged under / being reeled in) -- keeping them on one call
        /// is what stops the foam and the ripples from ever disagreeing about
        /// whether something is being towed through the water.
        /// </summary>
        public void SetRingMode(KawaGlintRingMode mode)
        {
            _ringMode = mode;

            if (_wake != null)
            {
                switch (mode)
                {
                    case KawaGlintRingMode.Pull:
                        _wake.SetMode(KawaGlintBobberWakeMode.Pull);
                        break;
                    case KawaGlintRingMode.Renda:
                        _wake.SetMode(KawaGlintBobberWakeMode.Renda);
                        break;
                    default:
                        _wake.SetMode(KawaGlintBobberWakeMode.Hidden);
                        break;
                }
            }
        }

        // KawaGlintPullMath keys its tables on plain ints so it stays free of
        // any dependency on this file. Mapped explicitly rather than by cast:
        // the two enums happen to agree today, and a silent ordinal
        // dependency is exactly the kind of thing that breaks when someone
        // inserts a mode.
        private static int PullMathLineMode(KawaGlintLineMode mode)
        {
            switch (mode)
            {
                case KawaGlintLineMode.PullTaut:
                    return KawaGlintPullMath.LineModePullTaut;
                case KawaGlintLineMode.Renda:
                    return KawaGlintPullMath.LineModeRenda;
                default:
                    return KawaGlintPullMath.LineModeSlack;
            }
        }

        private static int PullMathRingMode(KawaGlintRingMode mode)
        {
            switch (mode)
            {
                case KawaGlintRingMode.Pull:
                    return KawaGlintPullMath.RingModePull;
                case KawaGlintRingMode.Renda:
                    return KawaGlintPullMath.RingModeRenda;
                default:
                    return KawaGlintPullMath.RingModeAmbient;
            }
        }

        /// <summary>
        /// Toggles the renda ("引き寄せ") line-tension look. Preserved as-is
        /// for existing callers and tests: true means <b>Renda</b>
        /// specifically, not "any loaded line". The bite-sink PullTaut look is
        /// deliberately NOT reachable through this method and deliberately
        /// does NOT make <see cref="IsFishingLineTense"/> true -- that
        /// property means "reeling in", and several tests read it that way.
        /// </summary>
        public void SetFishingLineTension(bool tense)
        {
            SetLineMode(tense ? KawaGlintLineMode.Renda : KawaGlintLineMode.Slack);
        }

        /// <summary>True only while the renda line-tension look is active (see <see cref="SetFishingLineTension"/>). PullTaut does not count.</summary>
        public bool IsFishingLineTense => _lineMode == KawaGlintLineMode.Renda;

        /// <summary>The line mode currently in effect.</summary>
        public KawaGlintLineMode LineMode => _lineMode;

        /// <summary>The ring mode currently in effect.</summary>
        public KawaGlintRingMode RingMode => _ringMode;

        /// <summary>
        /// Which way the fish is pulling: +1 toward +X (the normal case, fish
        /// approach from the right), -1 the other way. Drives the pull rings'
        /// drift, the tug's line shift and the direction the fish is hauled.
        /// </summary>
        public void SetPullDirection(float directionX)
        {
            _pullDirX = directionX >= 0f ? 1f : -1f;
            if (_bobber != null)
            {
                _bobber.SetPullDirection(_pullDirX);
            }
            if (_wake != null)
            {
                _wake.SetPullDirection(_pullDirX);
            }
        }

        /// <summary>
        /// One "グイン" impulse, fired on each reel-in tap. Decays as
        /// exp(-t/0.18). Consumed here by the line and the fish; the rod's own
        /// load spike is driven separately from the Gameplay layer so the rod
        /// and the water react to the same tap on the same frame.
        /// </summary>
        public void PulseLineTug()
        {
            _tugAge = 0f;
        }

        /// <summary>
        /// Reel-in progress, 0-1. Damps the fish's thrash amplitude as the
        /// fight is won -- the fish visibly tires. This is the progress cue
        /// for players who cannot read the gauge, which at 3-4 years old is
        /// most of them.
        /// </summary>
        public void SetRendaProgress01(float progress01)
        {
            _rendaProgress01 = Mathf.Clamp01(progress01);
        }

        /// <summary>
        /// How strongly surface actors follow the wave (0 = pinned flat).
        /// Owned by the waterline work: every surface-anchored actor must
        /// derive its Y from the same waterline + wave expression, or the
        /// player sees more than one "water surface" at once.
        /// </summary>
        public void SetSurfaceStyle(float waveFollow)
        {
            _surfaceWaveFollow = Mathf.Clamp01(waveFollow);
            if (_bobber != null)
            {
                _bobber.SetWaveFollow(_surfaceWaveFollow);
            }
            if (_wake != null)
            {
                _wake.SetWaveFollow(_surfaceWaveFollow);
            }
        }

        /// <summary>The surface wave-follow weight last set via <see cref="SetSurfaceStyle"/>.</summary>
        public float SurfaceWaveFollow => _surfaceWaveFollow;

        /// <summary>True while the single catchable target fish is shown (Approach/Thrash/Flee, not Hidden).</summary>
        public bool IsTargetFishVisible => _targetFishTransform != null && _targetFishTransform.gameObject.activeSelf;

        /// <summary>The rare-fish aura attached to the target fish, or null if the builder could not create one.</summary>
        public KawaGlintRareAura TargetFishAura => _targetFishAura;

        /// <summary>
        /// Reveals the target fish just off the right edge of the water and
        /// begins its Approach toward wherever <see cref="SetTargetFishApproach"/>
        /// is subsequently told to move it. <paramref name="worldLength"/>
        /// uniformly scales the shared silhouette sprite (aspect preserved).
        /// Equivalent to <c>ShowTargetFish(null, worldLength)</c> -- keeps
        /// whatever sprite the builder last assigned the target fish.
        /// </summary>
        public void ShowTargetFish(float worldLength)
        {
            ShowTargetFish(new KawaGlintFishPresentation(null, 0, worldLength));
        }

        /// <summary>
        /// Same as <see cref="ShowTargetFish(float)"/>, but first swaps the
        /// target fish's sprite to <paramref name="speciesId"/>'s illustrated
        /// shadow art when that species' resource resolves. Rarity tier 0.
        /// </summary>
        public void ShowTargetFish(string speciesId, float worldLength)
        {
            ShowTargetFish(new KawaGlintFishPresentation(speciesId, 0, worldLength));
        }

        /// <summary>
        /// Reveals the target fish for one cast, with its species art, its
        /// final world length and its rarity tier all applied at once.
        ///
        /// The tier drives everything that makes a rare fish read as rare:
        /// which silhouette resolves, how deep it appears, how slowly it
        /// rises, how it weaves and wags, and whether the halo/sparkles arm
        /// (they still will not light up until the approach passes the reveal
        /// threshold -- see <see cref="KawaGlintRareAura"/>).
        /// </summary>
        public void ShowTargetFish(in KawaGlintFishPresentation presentation)
        {
            if (_targetFishTransform == null)
            {
                return;
            }

            _targetFishTier = Mathf.Max(0, presentation.RarityTier);
            var worldLength = presentation.WorldLength;

            if (!string.IsNullOrEmpty(presentation.SpeciesId) && _targetFishRenderer != null)
            {
                var artSprite = KawaGlintSpriteCatalog.LoadFishShadow(presentation.SpeciesId, _targetFishTier);
                if (artSprite != null)
                {
                    _targetFishRenderer.sprite = artSprite;
                    _targetFishNativeWidthWorld = artSprite.bounds.size.x;
                }
            }

            _targetFishWorldLength = worldLength;
            var scale = _targetFishNativeWidthWorld > 0.0001f ? worldLength / _targetFishNativeWidthWorld : 1f;
            _targetFishTransform.localScale = new Vector3(scale, scale, 1f);

            var profile = KawaGlintRarityMotion.For(_targetFishTier);
            _targetFishAppearWorld = new Vector3(_wrapMaxX + worldLength * 0.5f, profile.AppearY, 0f);
            _targetFishTransform.position = _targetFishAppearWorld;
            _targetFishProgress = 0f;
            _targetFishWeavePhase = _castCounter * WeavePhaseStep;
            _castCounter++;

            if (_targetFishRenderer != null)
            {
                // Approach always travels -X (right edge toward the bobber);
                // the shared silhouette already faces -X unflipped.
                _targetFishRenderer.flipX = false;
            }
            _targetFishTransform.gameObject.SetActive(true);
            _targetFishMode = TargetFishMode.Approach;
            ApplyTargetFishWag(TargetFishMode.Approach);

            if (_targetFishAura != null)
            {
                // Armed but dark: the reveal only happens once the approach
                // crosses KawaGlintRareAura.RevealStartProgress.
                _targetFishAura.Configure(_targetFishTier, worldLength);
            }
        }

        /// <summary>
        /// Moves the (already-shown) target fish from its appear point toward
        /// <paramref name="targetWorldX"/> (offset by a fixed anchor gap) as
        /// <paramref name="progress01"/> advances from 0 to 1.
        ///
        /// Deliberately <b>not</b> clamped to [0,1]: during the post-arrival
        /// nibble phase the caller feeds
        /// <c>KawaGlintPreBitePlan.ApproachDisplayProgress(t) + MotionOffset(t)</c>,
        /// which is pinned at exactly 1.0 (the anchor) between bursts but
        /// intentionally overshoots slightly past 1.0 during a lunge (the
        /// fish pecking a little further in at the hook) and dips slightly
        /// under 1.0 during the following drift-back. If this clamped to
        /// [0,1] the way in (progress &gt; 1) would be invisible -- Lerp at
        /// t=1 and t=1.07 both land exactly on the anchor -- silently
        /// swallowing half of every nibble's back-and-forth motion.
        ///
        /// For tier0 the resulting position is bit-identical to the original
        /// single <c>Vector3.LerpUnclamped</c>, overshoot included.
        /// </summary>
        public void SetTargetFishApproach(float progress01, float targetWorldX)
        {
            if (_targetFishTransform == null || _targetFishMode == TargetFishMode.Hidden)
            {
                return;
            }

            _targetFishMode = TargetFishMode.Approach;
            ApplyTargetFishWag(TargetFishMode.Approach);
            _targetFishTargetAnchorX = targetWorldX + TargetFishTargetXOffset;
            _targetFishProgress = progress01;
            ApplyApproachPose(Time.time);

            if (_targetFishAura != null)
            {
                _targetFishAura.SetReveal01(KawaGlintRareAura.RevealFromApproach01(progress01));
            }
        }

        /// <summary>Toggles the renda ("引き寄せ") thrash jitter around the current anchor on/off.</summary>
        public void SetTargetFishThrash(bool thrashing)
        {
            if (_targetFishTransform == null || _targetFishMode == TargetFishMode.Hidden)
            {
                return;
            }

            _targetFishMode = thrashing ? TargetFishMode.Thrash : TargetFishMode.Approach;
            ApplyTargetFishWag(_targetFishMode);
        }

        /// <summary>Sends the target fish fleeing off the right edge; it self-hides once fully off-screen.</summary>
        public void FleeTargetFish()
        {
            if (_targetFishTransform == null)
            {
                return;
            }

            if (_targetFishRenderer != null)
            {
                // Flees +X (back toward the right edge it appeared from), so
                // flip to face the direction of travel.
                _targetFishRenderer.flipX = true;
            }
            _targetFishMode = TargetFishMode.Flee;
            ApplyTargetFishWag(TargetFishMode.Flee);

            // The aura deliberately stays lit while the fish escapes. Losing a
            // rare must never be dressed as a punishment -- the narration stays
            // positive ("おおきいのが いたね!"), and so does the picture.
        }

        /// <summary>Immediately hides the target fish (e.g. after a catch banner closes).</summary>
        public void HideTargetFish()
        {
            if (_targetFishTransform == null)
            {
                return;
            }

            _targetFishMode = TargetFishMode.Hidden;
            _targetFishTransform.gameObject.SetActive(false);
            ApplyTargetFishWag(TargetFishMode.Hidden);
            if (_targetFishAura != null)
            {
                _targetFishAura.HideImmediate();
            }
        }

        /// <summary>
        /// Re-skins the four ambient background fish to the species that
        /// actually live at the current location.
        ///
        /// Only the sprite (and the uniform scale derived from its native
        /// width) changes: every position, direction, speed, bob phase and
        /// wag phase came from the seeded generation pass and is left exactly
        /// as it was. Switching location must not visibly re-shuffle the
        /// background.
        /// </summary>
        public void SetAmbientSpecies(string[] speciesIds)
        {
            if (speciesIds == null || speciesIds.Length == 0)
            {
                return;
            }

            // Filtered here rather than trusting the caller. A location's
            // spawn list legitimately contains clams, turban shells, starfish
            // and boots -- all perfectly catchable, none of which swim across
            // open water. Anything that reaches the ambient pool becomes a
            // silhouette gliding sideways through midwater, which is the exact
            // "貝が横に泳いでいる" bug this filter exists to make impossible.
            // Returns null when a location has nothing that swims, in which
            // case the previous sprites are kept rather than blanked.
            var swimmers = KawaGlintFishSilhouettes.SelectAmbientSpecies(speciesIds, _fish.Count > 0 ? _fish.Count : 1);
            if (swimmers == null)
            {
                return;
            }

            for (var i = 0; i < _fish.Count; i++)
            {
                var entry = _fish[i];
                if (entry.Renderer == null)
                {
                    continue;
                }

                var speciesId = swimmers[i % swimmers.Length];
                var sprite = KawaGlintSpriteCatalog.LoadFishShadow(speciesId);
                if (sprite == null)
                {
                    continue;
                }

                entry.Renderer.sprite = sprite;

                var nativeWidth = sprite.bounds.size.x;
                if (nativeWidth > 0.0001f && entry.Length > 0f)
                {
                    // Single uniform scalar on both axes: the fish keeps its
                    // drawn length, and the new sprite keeps its own aspect
                    // ratio exactly. Never scale the axes independently.
                    var scale = entry.Length / nativeWidth;
                    entry.Transform.localScale = new Vector3(scale, scale, 1f);
                }
            }
        }

        /// <summary>
        /// Applies the tail-wag amplitude/speed/shape for
        /// <paramref name="mode"/> at the current rarity tier via
        /// MaterialPropertyBlock -- deliberately only on an actual
        /// mode-or-tier transition, so this never becomes a per-frame
        /// SetPropertyBlock call. Harmless no-op if the target fish's material
        /// fell back to the plain sprite material in
        /// <see cref="KawaGlintActorsBuilder"/> (that shader has none of these
        /// properties, so the block's values are simply unused -- static art,
        /// no wag).
        ///
        /// _WagStartU/_WagWave used to be material constants shared by every
        /// fish, which meant a tuna and a minnow wagged identically. Moving
        /// them into the per-instance block is what lets a rare fish undulate
        /// along its whole body instead of just flicking its tail.
        /// </summary>
        private void ApplyTargetFishWag(TargetFishMode mode)
        {
            if (_targetFishRenderer == null)
            {
                return;
            }
            if (_targetFishWagApplied && mode == _targetFishWagAppliedMode && _targetFishTier == _targetFishWagAppliedTier)
            {
                return;
            }
            _targetFishWagApplied = true;
            _targetFishWagAppliedMode = mode;
            _targetFishWagAppliedTier = _targetFishTier;

            KawaGlintWagMode wagMode;
            switch (mode)
            {
                case TargetFishMode.Approach:
                    wagMode = KawaGlintWagMode.Approach;
                    break;
                case TargetFishMode.Thrash:
                    wagMode = KawaGlintWagMode.Thrash;
                    break;
                case TargetFishMode.Flee:
                    wagMode = KawaGlintWagMode.Flee;
                    break;
                default:
                    wagMode = KawaGlintWagMode.Idle;
                    break;
            }

            KawaGlintRarityMotion.WagFor(_targetFishTier, wagMode, out var amplitude, out var speed);
            var profile = KawaGlintRarityMotion.For(_targetFishTier);

            if (_targetFishWagMpb == null)
            {
                _targetFishWagMpb = new MaterialPropertyBlock();
            }
            _targetFishRenderer.GetPropertyBlock(_targetFishWagMpb);
            _targetFishWagMpb.SetFloat(WagAmpId, amplitude);
            _targetFishWagMpb.SetFloat(WagSpeedId, speed);
            _targetFishWagMpb.SetFloat(WagStartUId, profile.WagStartU);
            _targetFishWagMpb.SetFloat(WagWaveId, profile.WagWave);
            _targetFishRenderer.SetPropertyBlock(_targetFishWagMpb);
        }

        /// <summary>
        /// Registers the single target-fish actor built by
        /// <see cref="KawaGlintActorsBuilder"/> (kept out of <see cref="RegisterFish"/>
        /// so it never joins the ambient wrap-drift pool). Not consumed by
        /// randomness -- built after all seeded generation so ambient fish
        /// placement stays reproducible.
        /// </summary>
        internal void SetTargetFish(Transform targetFishTransform, SpriteRenderer targetFishRenderer, float nativeWidthWorld)
        {
            _targetFishTransform = targetFishTransform;
            _targetFishRenderer = targetFishRenderer;
            _targetFishNativeWidthWorld = nativeWidthWorld;
        }

        /// <summary>Registers the rare-fish halo/sparkle component the builder attached under the target fish.</summary>
        internal void SetTargetFishAura(KawaGlintRareAura aura)
        {
            _targetFishAura = aura;
        }

        /// <summary>Tracks a runtime-only asset (Texture2D/Sprite/Mesh/Material) for destruction in OnDestroy.</summary>
        internal void RegisterGeneratedAsset(Object asset)
        {
            if (asset != null)
            {
                _generatedAssets.Add(asset);
            }
        }

        /// <summary>World-space X bounds fish drift wraps against once fully off the opposite edge.</summary>
        internal void SetWrapBounds(float minX, float maxX)
        {
            _wrapMinX = minX;
            _wrapMaxX = maxX;
        }

        internal void RegisterFish(
            Transform fishTransform,
            SpriteRenderer fishRenderer,
            float speed,
            float direction,
            float baseY,
            float bobSpeed,
            float bobPhase,
            float bobAmplitude,
            float halfWidth,
            float length)
        {
            _fish.Add(new FishEntry
            {
                Transform = fishTransform,
                Renderer = fishRenderer,
                Speed = speed,
                Direction = direction,
                BaseY = baseY,
                BobSpeed = bobSpeed,
                BobPhase = bobPhase,
                BobAmplitude = bobAmplitude,
                HalfWidth = halfWidth,
                Length = length
            });
        }

        /// <summary>
        /// Registers one ripple ring with its phase expressed as a
        /// <b>fraction of a loop</b> (0-1), not seconds -- see
        /// <see cref="RingEntry.Phase01"/> for why that distinction matters
        /// now that the loop duration changes with the ring mode.
        /// </summary>
        internal void RegisterRing(Transform ringTransform, SpriteRenderer ringRenderer, float phase01)
        {
            _rings.Add(new RingEntry
            {
                Transform = ringTransform,
                Renderer = ringRenderer,
                Phase01 = Mathf.Repeat(phase01, 1f)
            });
        }

        internal void SetBobber(KawaGlintBobber bobber)
        {
            _bobber = bobber;
        }

        /// <summary>Registers the surface wake actor the builder created (see <see cref="KawaGlintBobberWake.Create"/>).</summary>
        internal void SetBobberWake(KawaGlintBobberWake wake)
        {
            _wake = wake;
            if (_wake == null)
            {
                return;
            }
            // Adopt whatever direction/surface style was already selected, so
            // the wake never starts out disagreeing with the float.
            _wake.SetPullDirection(_pullDirX);
            _wake.SetWaveFollow(_surfaceWaveFollow);
        }

        /// <summary>The surface foam ridge drawn while something is being towed through the water. Null if it was never built.</summary>
        public KawaGlintBobberWake Wake => _wake;

        /// <summary>
        /// Wires the fishing-line LineRenderer in and allocates its
        /// per-frame position buffer exactly once (never again -- Update
        /// below only ever overwrites this array's contents in place).
        /// </summary>
        internal void SetFishingLine(LineRenderer lineRenderer, Vector3 rodTipWorldPosition, int pointCount)
        {
            _fishingLine = lineRenderer;
            _rodTipWorldPosition = rodTipWorldPosition;
            _lineBuffer = new Vector3[pointCount];
            _lineBaseWidth = lineRenderer != null ? lineRenderer.widthMultiplier : 1f;
        }

        /// <summary>
        /// Re-anchors the fishing line's start point (§D-3 location switch)
        /// without touching the LineRenderer/buffer set up by
        /// <see cref="SetFishingLine"/> -- called by
        /// <c>KawaGlintBootstrap</c> (a different asmdef, hence public
        /// rather than internal like this class's other Set*/Register*
        /// members, which are only ever called from within this same
        /// Rendering assembly by <c>KawaGlintActorsBuilder</c>) right after
        /// <c>KawaGlintStageBuilder.SetAnglerPosition</c> moves the
        /// illustrated Pono sprite itself, so the idle/attached line drawn
        /// every frame (see <c>Update</c>'s <c>start = _rodTipWorldPosition</c>)
        /// never visually detaches from wherever Pono now sits.
        /// </summary>
        public void SetRodTipWorldPosition(Vector3 rodTipWorldPosition)
        {
            _rodTipWorldPosition = rodTipWorldPosition;
        }

        private void Update()
        {
            var time = Time.time;
            var deltaTime = Time.deltaTime;
            _lineModeElapsed += deltaTime;
            if (_tugAge < float.MaxValue)
            {
                _tugAge += deltaTime;
            }

            AnimateFish(time, deltaTime);
            AnimateRings(time);
            AnimateFishingLine(time);
            AnimateTargetFish(time, deltaTime);
        }

        /// <summary>Current tug impulse strength, 1 right after a tap, decaying to 0 as exp(-t/0.18).</summary>
        private float CurrentTug()
        {
            if (_tugAge >= float.MaxValue)
            {
                return 0f;
            }
            var tug = KawaGlintPullMath.TugDecay(_tugAge);
            return tug < 0.001f ? 0f : tug;
        }

        private void AnimateFish(float time, float deltaTime)
        {
            for (var i = 0; i < _fish.Count; i++)
            {
                var entry = _fish[i];
                var position = entry.Transform.position;
                position.x += entry.Direction * entry.Speed * deltaTime;

                // Fish drift in a fixed direction and simply wrap once fully
                // off the opposite edge, rather than turning around -- the
                // simplest behavior that matches "drifting... wrapping at
                // waterWorldRect edges" (DESIGN.md module 4, item 1).
                if (entry.Direction > 0f && position.x - entry.HalfWidth > _wrapMaxX)
                {
                    position.x = _wrapMinX - entry.HalfWidth;
                }
                else if (entry.Direction < 0f && position.x + entry.HalfWidth < _wrapMinX)
                {
                    position.x = _wrapMaxX + entry.HalfWidth;
                }

                position.y = entry.BaseY + Mathf.Sin(time * entry.BobSpeed + entry.BobPhase) * entry.BobAmplitude;
                entry.Transform.position = position;
            }
        }

        private void AnimateRings(float time)
        {
            if (_rings.Count == 0 || _bobber == null || !_ringsVisible)
            {
                return;
            }

            var pullMathRingMode = PullMathRingMode(_ringMode);
            var loopDuration = KawaGlintPullMath.RingLoopDurationFor(pullMathRingMode);

            // Rare-only alpha lift, applied to the idle rings the player
            // stares at during the wait. Not part of the shared pull table
            // because it is about rarity readability, not about the pull.
            var rareAlphaBoost = _ringMode == KawaGlintRingMode.Ambient && _targetFishTier >= 1
                ? RingAmbientRareMaxAlpha / KawaGlintPullMath.RingMaxAlphaAmbient
                : 1f;

            // Tint toward the rarity accent rather than replacing white with
            // it: the rings must still read as water first, hint second.
            var tint = _targetFishTier >= 1
                ? Color.Lerp(Color.white, KawaGlintRarityPalette.For(_targetFishTier), RingRarityTintMix)
                : Color.white;

            // Rings sit ON the surface; their Y stays pinned to the waterline
            // (set once at build time and never touched here) rather than
            // following the bobber's bob. While reeling in, the float is
            // underwater and invisible, so the rings follow the wake's anchor
            // (the line's water-entry point) instead -- otherwise they would
            // keep rippling around a float nobody can see.
            var centerX = _bobber.CenterWorldX;
            if (_ringMode == KawaGlintRingMode.Renda && _wake != null)
            {
                centerX = _wake.AnchorWorldX;
            }

            for (var i = 0; i < _rings.Count; i++)
            {
                var entry = _rings[i];
                var loopT = KawaGlintPullMath.RingLoopT(time, loopDuration, entry.Phase01);
                var ring = KawaGlintPullMath.RingParamsFor(pullMathRingMode, loopT, _pullDirX);

                var position = entry.Transform.position;
                position.x = centerX + ring.CenterOffsetX;
                entry.Transform.position = position;
                entry.Transform.localScale = new Vector3(ring.Scale, ring.Scale, 1f);

                var color = tint;
                color.a = ring.Alpha * rareAlphaBoost;
                entry.Renderer.color = color;
            }
        }

        private void AnimateFishingLine(float time)
        {
            if (_fishingLine == null || _bobber == null || _lineBuffer == null)
            {
                return;
            }

            // Normally the line is only drawn while the bobber is out
            // (Floating/Twitch/etc, i.e. not Hidden). During renda the
            // bobber itself goes Hidden, but the tense line still draws --
            // taut to the target fish's mouth -- as long as that fish is
            // actually on screen to draw it to.
            var renda = _lineMode == KawaGlintLineMode.Renda && IsTargetFishVisible;
            var visible = _lineVisible && (_bobber.VisualState != KawaGlintBobberState.Hidden || renda);
            _fishingLine.enabled = visible;
            if (!visible)
            {
                return;
            }

            var tug = CurrentTug();

            // Slack whenever the taut look was asked for but there is no fish
            // on screen to draw it to, so the sag/width/tremble table is
            // always consulted with the mode actually being rendered.
            var effectiveMode = _lineMode == KawaGlintLineMode.Renda && !renda
                ? KawaGlintLineMode.Slack
                : _lineMode;
            var pullMathLineMode = PullMathLineMode(effectiveMode);

            var start = _rodTipWorldPosition;
            Vector3 end;
            var fishPosition = Vector3.zero;

            // The PullTaut sag is ramped, never snapped: the 0.18 s tighten is
            // the entire "a fish just took it" read, and an instant jump to
            // the taut sag registers as a glitch instead of an event.
            var sag = KawaGlintPullMath.LineSagFor(pullMathLineMode, _lineModeElapsed);
            var trembleFrequency = KawaGlintPullMath.LineTrembleFrequencyFor(pullMathLineMode);
            var trembleAmplitude = KawaGlintPullMath.LineTrembleAmplitudeFor(pullMathLineMode);

            if (renda)
            {
                // Taut to the fish's mouth (nose-side of the sprite, which
                // faces -X while thrashing) so the endpoint rides along with
                // the fish's own thrash jitter -- the main "fish is pulling"
                // cue -- with no extra formula needed here.
                fishPosition = _targetFishTransform.position;
                end = new Vector3(fishPosition.x - _targetFishWorldLength * 0.45f, fishPosition.y, 0f);
                sag *= 1f - KawaGlintPullMath.TugLineSagFactor * tug;
            }
            else
            {
                end = new Vector3(_bobber.CenterWorldX, _bobber.TopWorldY, 0f);
            }

            var midpoint = (start + end) * 0.5f;
            var control = midpoint - new Vector3(0f, sag, 0f);
            if (renda)
            {
                // Control point sways half as far as the fish strays from its
                // resting anchor, so the line's belly lags the fish's own
                // thrash jitter instead of snapping straight -- same
                // frequency as the fish, no new constant introduced. Uses the
                // fish's raw center-X (not `end.x`, which is already offset
                // toward the mouth by -worldLength*0.45) so only the
                // oscillating jitter term applies here, not a fixed bias
                // proportional to fish size.
                control.x += (fishPosition.x - _targetFishTargetAnchorX) * 0.5f;

                // Each tap yanks the belly back toward the rod.
                control.x += -_pullDirX * KawaGlintPullMath.TugLineControlWorld * tug;
            }

            var segmentCount = _lineBuffer.Length - 1;
            var trembles = trembleAmplitude > 0f;
            for (var i = 0; i < _lineBuffer.Length; i++)
            {
                var t = segmentCount > 0 ? i / (float)segmentCount : 0f;
                var oneMinusT = 1f - t;

                // Quadratic bezier: (1-t)^2 * P0 + 2(1-t)t * C + t^2 * P2.
                _lineBuffer[i] = oneMinusT * oneMinusT * start
                    + 2f * oneMinusT * t * control
                    + t * t * end;

                if (trembles)
                {
                    // Fine tremble on interior points only -- the sin(pi*t)
                    // window is 0 at t=0/1 so the rod tip and the far endpoint
                    // themselves never jitter, only the line between.
                    var window = Mathf.Sin(t * Mathf.PI);
                    _lineBuffer[i].x += Mathf.Sin(time * trembleFrequency + i * 1.9f) * trembleAmplitude * window;
                }
            }

            _fishingLine.SetPositions(_lineBuffer);

            // While reeling in, the float is underwater and the only thing
            // left on the surface is where the line cuts through it -- so the
            // foam (and, above, the ripple rings) follow that point. Derived
            // from the bobber's own surface Y, never from a second waterline
            // expression: inventing one is exactly how the water ends up
            // looking like it has two surfaces.
            if (renda && _wake != null)
            {
                if (KawaGlintPullMath.TryFindWaterCrossingX(_lineBuffer, _lineBuffer.Length, _bobber.SurfaceWorldY, out var crossingX))
                {
                    _wake.SetRendaAnchorX(crossingX);
                }
            }
        }

        /// <summary>
        /// Places the target fish for the current approach progress. Shared by
        /// <see cref="SetTargetFishApproach"/> (so the position updates the
        /// instant the caller advances progress) and by
        /// <see cref="AnimateTargetFish"/> (so the weave keeps moving between
        /// those calls).
        /// </summary>
        private void ApplyApproachPose(float time)
        {
            var profile = KawaGlintRarityMotion.For(_targetFishTier);
            var anchorY = TargetFishAnchorY;
            var progress = _targetFishProgress;

            var x = Mathf.LerpUnclamped(_targetFishAppearWorld.x, _targetFishTargetAnchorX, progress);

            float y;
            if (profile.IsNeutralApproach)
            {
                // Byte-for-byte the original behavior, including the
                // deliberate Y overshoot during a pre-bite nibble.
                y = Mathf.LerpUnclamped(_targetFishAppearWorld.y, anchorY, progress);
            }
            else
            {
                var rise = KawaGlintRarityMotion.ApproachRise01(_targetFishTier, progress);
                y = Mathf.Lerp(_targetFishAppearWorld.y, anchorY, rise)
                    + KawaGlintRarityMotion.WeaveY(_targetFishTier, progress, time, _targetFishWeavePhase);
            }

            _targetFishTransform.position = new Vector3(x, y, 0f);
        }

        private void AnimateTargetFish(float time, float deltaTime)
        {
            if (_targetFishTransform == null || _targetFishMode == TargetFishMode.Hidden)
            {
                return;
            }

            var profile = KawaGlintRarityMotion.For(_targetFishTier);

            switch (_targetFishMode)
            {
                case TargetFishMode.Thrash:
                {
                    // Jitters around the anchor set by the last
                    // SetTargetFishApproach call; Y stays pinned to the anchor.
                    // Amplitude shrinks as the reel-in progresses (the fish
                    // tires) and each tap hauls it a little toward the rod --
                    // two ways to see you are winning without reading a gauge.
                    var fatigue = KawaGlintPullMath.RendaThrashAmplitudeMultiplier(_rendaProgress01);
                    var jitterX = Mathf.Sin(time * profile.ThrashFreq) * profile.ThrashAmpX * fatigue;
                    var haulX = -_pullDirX * KawaGlintPullMath.TugFishPullWorld * CurrentTug();
                    _targetFishTransform.position = new Vector3(_targetFishTargetAnchorX + jitterX + haulX, TargetFishAnchorY, 0f);
                    break;
                }
                case TargetFishMode.Flee:
                {
                    var position = _targetFishTransform.position;
                    position.x += profile.FleeSpeed * deltaTime;
                    position.y -= TargetFishFleeSinkSpeedWorld * deltaTime;
                    _targetFishTransform.position = position;

                    var halfWidth = _targetFishWorldLength * 0.5f;
                    if (position.x - halfWidth > _wrapMaxX)
                    {
                        _targetFishMode = TargetFishMode.Hidden;
                        _targetFishTransform.gameObject.SetActive(false);
                        if (_targetFishAura != null)
                        {
                            _targetFishAura.HideImmediate();
                        }
                    }
                    break;
                }
                case TargetFishMode.Approach:
                    // Re-evaluated every frame (not just when the caller
                    // advances progress) so the rare-tier vertical weave keeps
                    // drifting during the long stretches where progress is
                    // pinned at 1.0. A neutral tier0 profile produces exactly
                    // the same position it was already at, so this costs
                    // nothing for a normal catch.
                    ApplyApproachPose(time);
                    break;
            }
        }

        private void OnDestroy()
        {
            for (var i = 0; i < _generatedAssets.Count; i++)
            {
                DestroyGeneratedAsset(_generatedAssets[i]);
            }
            _generatedAssets.Clear();
        }

        private static void DestroyGeneratedAsset(Object asset)
        {
            if (asset == null)
            {
                return;
            }

            // Runtime-generated Texture2D/Sprite/Material are not project
            // assets, so nothing else in the project frees them -- mirrors
            // the Application.isEditor DestroyImmediate/Destroy split used
            // by AquaLuminaStageContent (this spike's sibling module).
            if (Application.isEditor)
            {
                DestroyImmediate(asset);
            }
            else
            {
                Destroy(asset);
            }
        }
    }
}
