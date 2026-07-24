using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// What the bobber wake is currently reacting to. Driven by the actors
    /// controller from the gameplay phase, because during renda the float
    /// itself is hidden underwater and the wake has to follow the fishing
    /// line's water-entry point instead.
    /// </summary>
    public enum KawaGlintBobberWakeMode
    {
        /// <summary>Nothing is dragging the surface -- the wake fades out.</summary>
        Hidden,

        /// <summary>A fish is dragging the float under (BiteSink).</summary>
        Pull,

        /// <summary>The hooked fish is being reeled in (renda).</summary>
        Renda
    }

    /// <summary>
    /// The foam ridge that appears on the water surface while something is
    /// being towed through it -- one of the four simultaneous "it bit!" cues
    /// (taut line / tilted float / bent rod / surface wake).
    ///
    /// <b>Why a ridge and not a V-shaped wake.</b> This camera is a cutaway
    /// (the horizon is a straight horizontal line and the water is seen edge
    /// on, above and below at once). A V wake is a phenomenon you can only
    /// see from above or from behind at an angle; drawn into this
    /// composition it becomes a mysterious triangle floating on the water,
    /// and it would make the already-reported "there seem to be two water
    /// surfaces" problem worse. A side-on crescent of foam is the correct
    /// read for this viewpoint.
    ///
    /// Renders at sorting order 31 -- the one free slot between the surface
    /// band (30) and the ripple/splash rings (32), so it can never z-fight
    /// with either.
    ///
    /// Fully self-contained: it generates and owns its own texture/sprite
    /// (via <see cref="KawaGlintBobberArt.CreateWakeFoamTexture"/>) and frees
    /// them in <see cref="OnDestroy"/>, so the actors builder only has to
    /// call <see cref="Create"/> and hand the result to the controller.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintBobberWake : MonoBehaviour
    {
        /// <summary>
        /// Sorting order of the foam. 30 is the surface band and 32 is the
        /// ripple/splash rings, so 31 is the only value that sits visually
        /// "on" the surface without colliding with an existing layer.
        /// </summary>
        public const int SortingOrder = 31;

        private const float PixelsPerUnit = 100f;

        private SpriteRenderer _renderer;
        private Texture2D _texture;
        private Sprite _sprite;

        private KawaGlintBobber _bobber;
        private float _waterlineY;
        private float _waterMinX;
        private float _waterMaxX;
        private float _waveFollow = 1f;
        private float _pullDirX = 1f;

        private float _baseScale = 1f;
        private float _halfWidthWorld;

        private float _fade01;
        private float _rendaAnchorX;
        private bool _hasRendaAnchor;

        /// <summary>What the wake is currently reacting to (default <see cref="KawaGlintBobberWakeMode.Hidden"/>).</summary>
        public KawaGlintBobberWakeMode Mode { get; private set; } = KawaGlintBobberWakeMode.Hidden;

        /// <summary>True while the foam is actually being drawn (i.e. it has faded in at all).</summary>
        public bool IsVisible => _renderer != null && _renderer.enabled;

        /// <summary>Current rendered opacity of the foam -- 0 while hidden, ~0.58-0.82 while breathing at full fade-in.</summary>
        public float Alpha => _renderer != null ? _renderer.color.a : 0f;

        /// <summary>
        /// World-space X the foam is centred on this frame (after the water
        /// rect clamp). The renda ripple rings hang off this so the tug of
        /// war has a single shared anchor on the surface.
        /// </summary>
        public float AnchorWorldX { get; private set; }

        /// <summary>World-space Y the foam is centred on this frame -- the wave surface at <see cref="AnchorWorldX"/>.</summary>
        public float AnchorWorldY { get; private set; }

        /// <summary>
        /// Builds a wake actor under <paramref name="parent"/>. Intended to
        /// be called once from <c>KawaGlintActorsBuilder</c>, after every
        /// seeded random draw (it consumes no randomness itself, but the
        /// builder's "build the extras last" convention keeps the ambient
        /// fish placement reproducible by construction):
        /// <code>
        /// var wake = KawaGlintBobberWake.Create(root.transform, spriteMaterial, controller.Bobber, waterlineWorldY, waterWorldRect);
        /// controller.SetBobberWake(wake);
        /// </code>
        /// </summary>
        public static KawaGlintBobberWake Create(
            Transform parent,
            Material material,
            KawaGlintBobber bobber,
            float waterlineWorldY,
            Rect waterWorldRect)
        {
            var go = new GameObject("BobberWake");
            go.transform.SetParent(parent, false);

            var wake = go.AddComponent<KawaGlintBobberWake>();
            wake.Initialize(material, bobber, waterlineWorldY, waterWorldRect);
            return wake;
        }

        /// <summary>
        /// Wires the wake up and generates its foam sprite. Prefer
        /// <see cref="Create"/>; this exists separately only so a test can
        /// attach the component to a GameObject it already owns.
        /// </summary>
        internal void Initialize(Material material, KawaGlintBobber bobber, float waterlineWorldY, Rect waterWorldRect)
        {
            _bobber = bobber;
            _waterlineY = waterlineWorldY;
            _waterMinX = waterWorldRect.xMin;
            _waterMaxX = waterWorldRect.xMax;

            _texture = KawaGlintBobberArt.CreateWakeFoamTexture();
            _sprite = Sprite.Create(
                _texture,
                new Rect(0f, 0f, _texture.width, _texture.height),
                new Vector2(0.5f, KawaGlintBobberArt.WakeFoamRidgeV),
                PixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            _sprite.name = "KawaGlint Bobber Wake Foam";

            _renderer = gameObject.GetComponent<SpriteRenderer>();
            if (_renderer == null)
            {
                _renderer = gameObject.AddComponent<SpriteRenderer>();
            }
            _renderer.sprite = _sprite;
            if (material != null)
            {
                _renderer.sharedMaterial = material;
            }
            _renderer.sortingOrder = SortingOrder;
            _renderer.color = new Color(1f, 1f, 1f, 0f);
            _renderer.enabled = false;

            // Single uniform scalar from the sprite's own native width: the
            // foam never stretches on one axis (project-wide aspect-ratio
            // rule), so its height simply follows from its authored AR.
            var nativeWidth = _sprite.bounds.size.x;
            _baseScale = nativeWidth > 0.0001f ? KawaGlintPullMath.WakeWorldWidth / nativeWidth : 1f;
            _halfWidthWorld = KawaGlintPullMath.WakeWorldWidth * 0.5f;
            transform.localScale = new Vector3(_baseScale, _baseScale, 1f);

            AnchorWorldX = _bobber != null ? _bobber.CenterWorldX : waterWorldRect.center.x;
            AnchorWorldY = waterlineWorldY;
            transform.position = new Vector3(AnchorWorldX, AnchorWorldY, 0f);
        }

        /// <summary>
        /// Switches what the wake follows. Fades in over
        /// <see cref="KawaGlintPullMath.WakeFadeInSeconds"/> on any non-hidden
        /// mode and out over <see cref="KawaGlintPullMath.WakeFadeOutSeconds"/>
        /// on <see cref="KawaGlintBobberWakeMode.Hidden"/> -- never a pop.
        /// </summary>
        public void SetMode(KawaGlintBobberWakeMode mode)
        {
            Mode = mode;
        }

        /// <summary>Sets which way the tow is heading; mirrors the foam crescent with <c>flipX</c> (never by negative scale).</summary>
        public void SetPullDirection(float dirX)
        {
            _pullDirX = dirX < 0f ? -1f : 1f;
        }

        /// <summary>
        /// How much of the analytic wave the foam's Y follows. Shares the
        /// float's own <c>waveFollow</c> so the foam, the float and the
        /// submerge cut line all sit on exactly one surface -- the fix for
        /// the "the water has two surfaces" report is that nothing here ever
        /// invents its own waterline.
        /// </summary>
        public void SetWaveFollow(float waveFollow)
        {
            _waveFollow = Mathf.Clamp01(waveFollow);
        }

        /// <summary>
        /// Anchors the foam to the fishing line's water-entry point for
        /// <see cref="KawaGlintBobberWakeMode.Renda"/> (the float is hidden
        /// underwater by then, so there is nothing else on the surface to
        /// follow). Ignored in the other modes.
        /// </summary>
        public void SetRendaAnchorX(float worldX)
        {
            _rendaAnchorX = worldX;
            _hasRendaAnchor = true;
        }

        /// <summary>Forgets the renda anchor, so the wake falls back to tracking the float.</summary>
        public void ClearRendaAnchor()
        {
            _hasRendaAnchor = false;
        }

        private void Update()
        {
            var time = Time.time;
            var deltaTime = Time.deltaTime;

            var wantsVisible = Mode != KawaGlintBobberWakeMode.Hidden;
            var fadeSeconds = wantsVisible
                ? KawaGlintPullMath.WakeFadeInSeconds
                : KawaGlintPullMath.WakeFadeOutSeconds;
            var step = fadeSeconds > 0f ? deltaTime / fadeSeconds : 1f;
            _fade01 = Mathf.Clamp01(_fade01 + (wantsVisible ? step : -step));

            if (_renderer == null)
            {
                return;
            }

            if (_fade01 <= 0f)
            {
                if (_renderer.enabled)
                {
                    _renderer.enabled = false;
                    var cleared = _renderer.color;
                    cleared.a = 0f;
                    _renderer.color = cleared;
                }
                return;
            }

            _renderer.enabled = true;

            var breath = Mathf.Sin(time * KawaGlintPullMath.HertzToRadiansPerSecond(KawaGlintPullMath.WakeBreathHertz));

            // Uniform on both axes -- an x-only stretch would violate the
            // project's absolute aspect-ratio rule and visibly smear the
            // painted foam.
            var pulse = 1f + KawaGlintPullMath.WakeScalePulse * breath;
            transform.localScale = new Vector3(_baseScale * pulse, _baseScale * pulse, 1f);

            var color = _renderer.color;
            color.a = Mathf.Clamp01(_fade01 * (KawaGlintPullMath.WakePeakAlpha + KawaGlintPullMath.WakeAlphaBreath * breath));
            _renderer.color = color;
            _renderer.flipX = _pullDirX < 0f;

            AnchorWorldX = KawaGlintPullMath.ClampInsideRect(
                ResolveAnchorX(),
                _halfWidthWorld * pulse,
                _waterMinX,
                _waterMaxX);
            AnchorWorldY = _waterlineY + KawaWave.Height(AnchorWorldX, time) * _waveFollow;
            transform.position = new Vector3(AnchorWorldX, AnchorWorldY, 0f);
        }

        private float ResolveAnchorX()
        {
            if (Mode == KawaGlintBobberWakeMode.Renda && _hasRendaAnchor)
            {
                return _rendaAnchorX;
            }

            var center = _bobber != null ? _bobber.CenterWorldX : AnchorWorldX;
            return center + KawaGlintPullMath.WakeOffsetWorldX * _pullDirX;
        }

        private void OnDestroy()
        {
            DestroyGeneratedAsset(_sprite);
            DestroyGeneratedAsset(_texture);
            _sprite = null;
            _texture = null;
        }

        // Runtime-generated assets are not project assets, so nothing else in
        // the project frees them -- mirrors the editor/runtime split used by
        // KawaGlintActorsController.
        private static void DestroyGeneratedAsset(Object asset)
        {
            if (asset == null)
            {
                return;
            }

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
