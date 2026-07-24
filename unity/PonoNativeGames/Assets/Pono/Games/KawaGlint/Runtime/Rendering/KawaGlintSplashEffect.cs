using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Pure math for the one-shot landing splash (module A): five decorative
    /// water droplets lobbed on a fixed, non-random ballistic arc plus a
    /// single expanding-and-fading ring, both keyed off a single elapsed-time
    /// parameter. Kept free of <see cref="MonoBehaviour"/> and any per-frame
    /// state so <see cref="KawaGlintSplashEffect"/> can stay a thin applyer
    /// and every curve here is directly unit-testable from EditMode.
    /// </summary>
    public static class KawaGlintSplashMath
    {
        /// <summary>Number of decorative droplets kicked up by a single splash.</summary>
        public const int DropletCount = 5;

        /// <summary>Total lifetime of a single droplet (also the splash effect's total duration).</summary>
        public const float DropletLifeSeconds = 0.55f;

        /// <summary>Lifetime of the expanding splash ring (shorter than the droplets' arc).</summary>
        public const float RingDurationSeconds = 0.5f;

        /// <summary>
        /// Total duration of the whole one-shot effect -- equal to
        /// <see cref="DropletLifeSeconds"/> since the droplets outlive the ring.
        /// </summary>
        public const float TotalDurationSeconds = DropletLifeSeconds;

        // Downward acceleration applied to every droplet. Tuned so the
        // fastest droplet (index 1/3, 2.3 wu/s at ~78-102 degrees) peaks at
        // roughly a third of the bobber's own world height -- a readable but
        // decidedly small "splash", not a fountain.
        private const float Gravity = 7.5f;

        // Fixed per-droplet launch angle (degrees, measured from +X) and
        // initial speed (world units/second). Deliberately not randomized --
        // DESIGN.md pins the splash to a decisive, reproducible arc.
        private static readonly float[] DropletAngleDegrees = { 62f, 78f, 90f, 102f, 118f };
        private static readonly float[] DropletSpeedWorld = { 1.9f, 2.3f, 1.6f, 2.3f, 1.9f };

        /// <summary>
        /// World-space offset (relative to the splash origin) of droplet
        /// <paramref name="index"/> at <paramref name="elapsedSeconds"/> since
        /// the splash began: straight-line launch velocity plus a downward
        /// gravity term, so the droplet arcs up and falls back.
        /// </summary>
        public static Vector2 DropletPosition(int index, float elapsedSeconds)
        {
            var angleRad = DropletAngleDegrees[index] * Mathf.Deg2Rad;
            var speed = DropletSpeedWorld[index];
            var direction = new Vector2(Mathf.Cos(angleRad), Mathf.Sin(angleRad));

            var x = direction.x * speed * elapsedSeconds;
            var y = direction.y * speed * elapsedSeconds - 0.5f * Gravity * elapsedSeconds * elapsedSeconds;
            return new Vector2(x, y);
        }

        /// <summary>Droplet opacity as a function of normalized life <paramref name="t01"/> (0 at birth, 1 at death) -- eases out to fully transparent.</summary>
        public static float DropletAlpha01(float t01)
        {
            var oneMinusT = 1f - Mathf.Clamp01(t01);
            return 0.9f * oneMinusT * oneMinusT;
        }

        /// <summary>Droplet uniform-scale multiplier (of its base diameter) as a function of normalized life <paramref name="t01"/> -- shrinks slightly as it falls.</summary>
        public static float DropletScale01(float t01)
        {
            return Mathf.Lerp(1f, 0.55f, Mathf.Clamp01(t01));
        }

        /// <summary>Splash ring uniform-scale as a function of normalized life <paramref name="t01"/> (0..1 over <see cref="RingDurationSeconds"/>) -- expands from 0.25 to 1.5 world units.</summary>
        public static float RingScale(float t01)
        {
            return Mathf.Lerp(0.25f, 1.5f, Mathf.Clamp01(t01));
        }

        /// <summary>Splash ring opacity as a function of normalized life <paramref name="t01"/> -- a stronger, faster fade than the ambient ripple rings.</summary>
        public static float RingAlpha(float t01)
        {
            return 0.55f * (1f - Mathf.Clamp01(t01));
        }
    }

    /// <summary>
    /// One-shot, event-driven "ポチャン" (splash) effect: five small droplets
    /// pop up and fall back under gravity, and a single ring expands and
    /// fades at the landing point. Deliberately separate from the always-on
    /// ambient ripple rings built by <see cref="KawaGlintActorsBuilder"/> --
    /// this component only ever plays when <see cref="KawaGlintBobber.OnLanded"/>
    /// fires (or <see cref="Play"/> is called directly, e.g. from a test).
    ///
    /// A thin applyer only: every curve it draws on comes from the pure
    /// <see cref="KawaGlintSplashMath"/> functions above.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintSplashEffect : MonoBehaviour
    {
        // Native diameter of a droplet at the start of its life (world
        // units) -- shrinks toward DropletScale01's 0.55 floor as it falls,
        // per DESIGN.md. Uniform on both axes (AR rule): never stretched.
        private const float DropletDiameterWorld = 0.06f;

        private Transform _ringTransform;
        private SpriteRenderer _ringRenderer;
        private SpriteRenderer[] _dropletRenderers;

        // Lower bound on Play's scale argument -- a zero or negative
        // multiplier would collapse the whole effect into an invisible dot
        // (or mirror it), which is never what a caller means.
        private const float MinPlayScale = 0.05f;

        private KawaGlintBobber _bobber;

        private Vector3 _origin;
        private float _elapsed;
        private float _scale = 1f;

        /// <summary>True while a splash is actively animating (from <see cref="Play"/> until its total duration elapses).</summary>
        public bool IsPlaying { get; private set; }

        /// <summary>
        /// Wires the ring/droplet renderers built by
        /// <see cref="KawaGlintActorsBuilder"/>. Called exactly once, right
        /// after this component is added.
        /// </summary>
        internal void Configure(Transform ringTransform, SpriteRenderer ringRenderer, SpriteRenderer[] dropletRenderers)
        {
            _ringTransform = ringTransform;
            _ringRenderer = ringRenderer;
            _dropletRenderers = dropletRenderers;
            SetRenderersEnabled(false);
        }

        /// <summary>
        /// Subscribes to <paramref name="bobber"/>'s <see cref="KawaGlintBobber.OnLanded"/>
        /// event so every splashdown plays this effect automatically. A null
        /// bobber (defensive) leaves this effect permanently idle rather than
        /// throwing.
        /// </summary>
        internal void Initialize(KawaGlintBobber bobber)
        {
            _bobber = bobber;
            if (_bobber != null)
            {
                _bobber.OnLanded += HandleLanded;
            }
        }

        /// <summary>
        /// Starts (or restarts, from the head, if already playing) the
        /// one-shot splash at <paramref name="landingWorld"/>.
        ///
        /// <paramref name="scale"/> uniformly scales how far the droplets
        /// travel, how big they are, and how wide the ring grows -- 1
        /// (the default) is byte-for-byte the shipped landing splash, and a
        /// smaller value gives each mid-cast "グイン" its own smaller,
        /// clearly secondary plink without inventing a second effect.
        ///
        /// The multiplier is applied here, on the presentation side only:
        /// the curves in <see cref="KawaGlintSplashMath"/> are pinned by
        /// EditMode tests and must not move.
        /// </summary>
        public void Play(Vector3 landingWorld, float scale = 1f)
        {
            _origin = landingWorld;
            _scale = Mathf.Max(MinPlayScale, scale);
            _elapsed = 0f;
            IsPlaying = true;
            SetRenderersEnabled(true);
        }

        // Adapter for KawaGlintBobber.OnLanded: a method group with an
        // optional parameter is not convertible to Action<Vector3>, and a
        // real splashdown always plays at full size anyway.
        private void HandleLanded(Vector3 landingWorld)
        {
            Play(landingWorld, 1f);
        }

        private void Update()
        {
            if (!IsPlaying)
            {
                return;
            }

            _elapsed += Time.deltaTime;
            if (_elapsed >= KawaGlintSplashMath.TotalDurationSeconds)
            {
                IsPlaying = false;
                SetRenderersEnabled(false);
                return;
            }

            ApplyRing();
            ApplyDroplets();
        }

        private void ApplyRing()
        {
            if (_ringTransform == null || _ringRenderer == null)
            {
                return;
            }

            if (_elapsed >= KawaGlintSplashMath.RingDurationSeconds)
            {
                _ringRenderer.enabled = false;
                return;
            }

            var t01 = _elapsed / KawaGlintSplashMath.RingDurationSeconds;
            var scale = KawaGlintSplashMath.RingScale(t01) * _scale;
            _ringTransform.position = _origin;
            _ringTransform.localScale = new Vector3(scale, scale, 1f);

            var color = _ringRenderer.color;
            color.a = KawaGlintSplashMath.RingAlpha(t01);
            _ringRenderer.color = color;
        }

        private void ApplyDroplets()
        {
            if (_dropletRenderers == null)
            {
                return;
            }

            var t01 = _elapsed / KawaGlintSplashMath.DropletLifeSeconds;
            for (var i = 0; i < _dropletRenderers.Length; i++)
            {
                var renderer = _dropletRenderers[i];
                if (renderer == null)
                {
                    continue;
                }

                var offset = KawaGlintSplashMath.DropletPosition(i, _elapsed) * _scale;
                renderer.transform.position = _origin + new Vector3(offset.x, offset.y, 0f);

                var scale = DropletDiameterWorld * KawaGlintSplashMath.DropletScale01(t01) * _scale;
                renderer.transform.localScale = new Vector3(scale, scale, 1f);

                var color = renderer.color;
                color.a = KawaGlintSplashMath.DropletAlpha01(t01);
                renderer.color = color;
            }
        }

        private void SetRenderersEnabled(bool enabled)
        {
            if (_ringRenderer != null)
            {
                _ringRenderer.enabled = enabled;
            }

            if (_dropletRenderers != null)
            {
                for (var i = 0; i < _dropletRenderers.Length; i++)
                {
                    if (_dropletRenderers[i] != null)
                    {
                        _dropletRenderers[i].enabled = enabled;
                    }
                }
            }
        }

        private void OnDestroy()
        {
            if (_bobber != null)
            {
                _bobber.OnLanded -= HandleLanded;
            }
        }
    }
}
