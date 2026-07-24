using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// The "きらきら" channel of the rare-fish readability design: a soft
    /// elliptical halo behind the target fish's silhouette plus a slow drift
    /// of sparkle motes above it. Entirely procedural -- no art dependency.
    ///
    /// <b>Only for the target fish, only for tier &gt;= 1, and deliberately
    /// late.</b> The reveal is driven from the approach progress
    /// (<see cref="SetReveal01"/>) so nothing lights up at the moment of the
    /// cast: if it did, nine casts out of ten would announce "not this time"
    /// before the wait even began and the tension of waiting would be gone.
    /// Lighting up as the shape resolves out of the depths turns the same
    /// effect into the peak of the sequence instead.
    ///
    /// Ambient background fish never get an aura. Handing it out freely is
    /// exactly how "special" stops meaning anything.
    ///
    /// Child-safety constraints baked into the numbers below (do not relax):
    /// the halo breathes at 0.35 Hz and every sparkle's alpha envelope spans
    /// at least 0.9 s (&lt;= ~1.1 Hz), both far under the 3 Hz
    /// photosensitivity ceiling; particles carry independent phases so the
    /// screen never pulses as a whole; and the palette is warm gold / pink /
    /// periwinkle -- never red, black or a dark ominous purple, no spikes, no
    /// fangs, no glowing eyes, no silhouette growth.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintRareAura : MonoBehaviour
    {
        /// <summary>
        /// Feature flag. The aura only makes sense once rare species are
        /// genuinely rare: on the pre-rework probability model two of the
        /// river locations roll a rare on 26-40% of casts, and an effect that
        /// fires on a third of all casts stops reading as special. Ship this
        /// false if the probability rework is not landing in the same build.
        /// </summary>
        public static bool Enabled = true;

        /// <summary>Rarity tier at or above which an aura appears at all.</summary>
        public const int MinimumAuraTier = 1;

        /// <summary>Halo breathing frequency, Hz. One eighth of the 3 Hz ceiling.</summary>
        public const float HaloBreatheHz = 0.35f;

        /// <summary>Halo alpha oscillates by +/-0.15 around this fraction of its peak (so 0.70 - 1.00 of peak).</summary>
        public const float HaloBreatheBase = 0.85f;

        /// <summary>Halo diameter relative to the fish's own world length.</summary>
        public const float HaloLengthMultiplier = 1.30f;

        /// <summary>Shortest sparkle lifetime -- one alpha envelope per particle, so the effective per-particle flicker rate is 1/0.9 ~= 1.11 Hz.</summary>
        public const float SparkleMinLifetimeSeconds = 0.9f;

        /// <summary>Longest sparkle lifetime.</summary>
        public const float SparkleMaxLifetimeSeconds = 1.5f;

        /// <summary>Approach progress the halo starts fading in at.</summary>
        public const float RevealStartProgress = 0.45f;

        /// <summary>Approach progress the halo reaches full strength at.</summary>
        public const float RevealFullProgress = 0.70f;

        private const float FadeInSeconds = 0.4f;
        private const float FadeOutSeconds = 0.25f;

        // Peak halo alpha per tier (index = clamped rarity tier). Kept low on
        // purpose: this sits behind a dark silhouette over painted artwork, so
        // it should read as "the water around it is glowing", not as a sticker.
        private static readonly float[] HaloPeakAlphaByTier = { 0f, 0.30f, 0.34f, 0.34f };

        // Sparkle emission rate per tier. Tier 2 and 3 share a rate -- past
        // ~7/s the motes stop reading as individual glints.
        private static readonly float[] SparkleRateByTier = { 0f, 4f, 7f, 7f };

        // Sparkle body color per tier: a pale wash of the same accent hue the
        // halo, HUD dot and ripple rings use (KawaGlintRarityPalette).
        private static readonly Color[] SparkleColorByTier =
        {
            new Color32(0xFF, 0xFF, 0xFF, 0xFF),
            new Color32(0xFF, 0xF2, 0xB8, 0xFF),
            new Color32(0xFF, 0xD8, 0xF0, 0xFF),
            new Color32(0xE4, 0xDB, 0xFF, 0xFF)
        };

        private Transform _haloTransform;
        private SpriteRenderer _haloRenderer;
        private ParticleSystem _sparkles;
        private ParticleSystem.EmissionModule _sparkleEmission;

        private int _tier;
        private float _worldLength;
        private float _peakAlpha;
        private float _sparkleRate;
        private float _revealTarget;
        private float _fade;
        private bool _active;

        /// <summary>Current 0-1 fade weight (0 = fully hidden). Exposed for PlayMode assertions.</summary>
        public float Fade01 => _fade;

        /// <summary>Rarity tier this aura was last configured for.</summary>
        public int Tier => _tier;

        /// <summary>Halo peak alpha for a tier (clamped). Single source shared with the EditMode safety tests.</summary>
        public static float HaloPeakAlphaForTier(int tier)
        {
            return HaloPeakAlphaByTier[Mathf.Clamp(tier, 0, HaloPeakAlphaByTier.Length - 1)];
        }

        /// <summary>Sparkle emission rate for a tier (clamped).</summary>
        public static float SparkleRateForTier(int tier)
        {
            return SparkleRateByTier[Mathf.Clamp(tier, 0, SparkleRateByTier.Length - 1)];
        }

        /// <summary>Sparkle particle color for a tier (clamped).</summary>
        public static Color SparkleColorForTier(int tier)
        {
            return SparkleColorByTier[Mathf.Clamp(tier, 0, SparkleColorByTier.Length - 1)];
        }

        /// <summary>Halo body color for a tier -- the shared rarity accent, so a palette change can never desync the halo from the HUD dot.</summary>
        public static Color HaloColorForTier(int tier)
        {
            return KawaGlintRarityPalette.For(tier);
        }

        /// <summary>
        /// Wires in the renderers <see cref="KawaGlintActorsBuilder"/> built.
        /// Separate from <see cref="Configure"/> because the object graph is
        /// built once and reconfigured on every cast.
        /// </summary>
        internal void Bind(Transform haloTransform, SpriteRenderer haloRenderer, ParticleSystem sparkles)
        {
            _haloTransform = haloTransform;
            _haloRenderer = haloRenderer;
            _sparkles = sparkles;
            if (_sparkles != null)
            {
                _sparkleEmission = _sparkles.emission;
            }
            ApplyHidden();
        }

        /// <summary>
        /// Re-arms the aura for one cast. <paramref name="worldLength"/> is
        /// the fish's final on-screen length. A tier under
        /// <see cref="MinimumAuraTier"/> (or the feature flag being off)
        /// leaves the aura completely dormant -- no halo, no emission, and
        /// <see cref="SetReveal01"/> becomes a no-op until the next
        /// <see cref="Configure"/>.
        /// </summary>
        public void Configure(int tier, float worldLength)
        {
            _tier = Mathf.Max(0, tier);
            _worldLength = Mathf.Max(0.01f, worldLength);
            _active = Enabled && _tier >= MinimumAuraTier;
            _revealTarget = 0f;
            _fade = 0f;

            if (!_active)
            {
                ApplyHidden();
                return;
            }

            _peakAlpha = HaloPeakAlphaForTier(_tier);
            _sparkleRate = SparkleRateForTier(_tier);

            // Undo the target fish's own non-unit scale so everything below
            // can be expressed directly in world units. The parent's scale is
            // always uniform (a single scalar derived from the sprite's native
            // width), so this stays a uniform scale too -- the halo ellipse is
            // never squashed off its baked aspect ratio.
            var parentScale = transform.parent != null ? transform.parent.lossyScale.x : 1f;
            var inverse = Mathf.Abs(parentScale) > 0.0001f ? 1f / parentScale : 1f;
            transform.localScale = new Vector3(inverse, inverse, 1f);
            transform.localPosition = Vector3.zero;

            if (_haloTransform != null)
            {
                // Uniform scalar on both axes. The halo texture is baked as an
                // ellipse (2:1) at authoring time precisely so it never has to
                // be squashed here.
                var haloScale = _worldLength * HaloLengthMultiplier;
                _haloTransform.localScale = new Vector3(haloScale, haloScale, 1f);
            }

            if (_haloRenderer != null)
            {
                var color = HaloColorForTier(_tier);
                color.a = 0f;
                _haloRenderer.color = color;
                _haloRenderer.enabled = true;
            }

            if (_sparkles != null)
            {
                var main = _sparkles.main;
                main.startColor = new ParticleSystem.MinMaxGradient(SparkleColorForTier(_tier));

                var shape = _sparkles.shape;
                shape.scale = new Vector3(_worldLength * 0.9f, _worldLength * 0.35f, 1f);

                _sparkleEmission.rateOverTime = 0f;
                if (!_sparkles.isPlaying)
                {
                    _sparkles.Play();
                }
            }
        }

        /// <summary>
        /// Drives the reveal from the approach progress. Callers pass
        /// <c>Mathf.InverseLerp(RevealStartProgress, RevealFullProgress, progress)</c>;
        /// see <see cref="RevealFromApproach01"/>.
        /// </summary>
        public void SetReveal01(float reveal01)
        {
            if (!_active)
            {
                return;
            }
            _revealTarget = Mathf.Clamp01(reveal01);
        }

        /// <summary>Maps raw approach progress to the reveal weight, so the mapping lives in exactly one place.</summary>
        public static float RevealFromApproach01(float approachProgress)
        {
            return Mathf.InverseLerp(RevealStartProgress, RevealFullProgress, Mathf.Clamp01(approachProgress));
        }

        /// <summary>Fades the aura back out (target fish hidden, escaped, or landed).</summary>
        public void Hide()
        {
            _revealTarget = 0f;
            if (!_active)
            {
                ApplyHidden();
            }
        }

        /// <summary>Cuts the aura immediately with no fade (location switch / teardown).</summary>
        public void HideImmediate()
        {
            _revealTarget = 0f;
            _fade = 0f;
            _active = false;
            ApplyHidden();
        }

        private void ApplyHidden()
        {
            if (_haloRenderer != null)
            {
                var color = _haloRenderer.color;
                color.a = 0f;
                _haloRenderer.color = color;
                _haloRenderer.enabled = false;
            }
            if (_sparkles != null)
            {
                _sparkleEmission.rateOverTime = 0f;
            }
        }

        private void Update()
        {
            if (!_active)
            {
                return;
            }

            var deltaTime = Time.deltaTime;
            if (_fade < _revealTarget)
            {
                _fade = FadeInSeconds > 0f
                    ? Mathf.Min(_revealTarget, _fade + deltaTime / FadeInSeconds)
                    : _revealTarget;
            }
            else if (_fade > _revealTarget)
            {
                _fade = FadeOutSeconds > 0f
                    ? Mathf.Max(_revealTarget, _fade - deltaTime / FadeOutSeconds)
                    : _revealTarget;
            }

            if (_haloRenderer != null)
            {
                // 0.35 Hz breathing: 0.85 +/- 0.15 of the peak alpha. Slow and
                // shallow on purpose -- it should look like the water is
                // shimmering, not like something is blinking.
                var breathe = HaloBreatheBase
                    + (1f - HaloBreatheBase) * Mathf.Sin(2f * Mathf.PI * HaloBreatheHz * Time.time);
                var color = _haloRenderer.color;
                color.a = _peakAlpha * breathe * _fade;
                _haloRenderer.color = color;
                _haloRenderer.enabled = color.a > 0.001f;
            }

            if (_sparkles != null)
            {
                _sparkleEmission.rateOverTime = _sparkleRate * _fade;
            }
        }
    }
}
