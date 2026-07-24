using System;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Rendering;
using Pono.KawaGlint.UI;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.KawaGlint.Bootstrap
{
    /// <summary>
    /// Wires the four independently-built KawaGlint rendering modules (stage content, surface
    /// band, actors, refraction Volume) together at scene runtime. This is the only piece of the
    /// spike that knows about all four modules at once - each module itself (see Runtime/Rendering)
    /// has zero knowledge of the others. Mirrors <c>Pono.AquaLumina.Bootstrap.AquaLuminaBootstrap</c>
    /// clause for clause.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintBootstrap : MonoBehaviour
    {
        /// <summary>Effects a QA capture (or any other caller) can independently toggle at runtime.</summary>
        public enum KawaEffect
        {
            Refraction,
            Surface,
            Actors,
            Bloom,
            Caustics,
            GodRays
        }

        // Contract constants shared with KawaGlintStageBuilder/KawaSurfaceBand/KawaGlintActorsBuilder
        // (see DESIGN.md "Surface band creation constants" / sorting-order table): sortingOrder 30,
        // intensity 1.0.
        private const int SurfaceSortingOrder = 30;
        private const float SurfaceIntensity = 1.0f;

        // Sorting order 16 sits between the underwater content (riverbed 10 / plants 12 / fish
        // shadows 14) and the shallower layers (motes 18 / surface band 30 / shore 40) in the
        // stage's shared sorting-order contract (see KawaGlintStageBuilder) - caustics read as
        // light patterns cast onto the riverbed/plants/fish, above them but below the motes drifting
        // through the water column. It is deliberately additive so it is fine for it to render "over"
        // the fish silhouettes too (the later refraction post-pass wobbles this quad's underwater
        // content again for free, exactly like AquaCausticsSurface is wobbled by AquaLumina's
        // distortion pass - the physically plausible "light passes through water, then the whole
        // scene refracts together" layering order).
        private const int CausticsSortingOrder = 16;
        private const float CausticsIntensity = 0.5f;

        private Camera _camera;
        private KawaStageInfo _stage;
        private KawaSurfaceBand _surface;
        private KawaCausticsSurface _caustics;
        private KawaGlintActorsController _actors;
        private Volume _volume;
        private KawaGlintGameController _gameController;

        /// <summary>The playable game-loop controller wired up in Awake (null only if no Camera.main was found).</summary>
        public KawaGlintGameController GameController => _gameController;

        /// <summary>Human-readable renderer identity for the QA capture sidecar (e.g. "Renderer2D").</summary>
        public string RendererLabel
        {
            get
            {
                if (_camera == null)
                {
                    return "no-camera";
                }

                var cameraData = _camera.GetUniversalAdditionalCameraData();
                var renderer = cameraData != null ? cameraData.scriptableRenderer : null;
                return renderer != null ? renderer.GetType().Name : "unknown";
            }
        }

        private void Awake()
        {
            _camera = Camera.main;
            if (_camera == null)
            {
                Debug.LogWarning("[KawaGlintBootstrap] No Camera.main found; the river stage was not built.");
                return;
            }

            _stage = KawaGlintStageBuilder.Build(transform, _camera);

            // KawaSurfaceBand.Create is a graceful no-op (returns null) when its shader is
            // missing/unsupported - every caller here (SetEffectEnabled/IsEffectAvailable) already
            // tolerates a null _surface.
            _surface = KawaSurfaceBand.Create(
                transform,
                _stage.WaterWorldRect,
                _stage.WaterlineWorldY,
                _stage.ShoreRightEdgeWorldX,
                SurfaceSortingOrder,
                SurfaceIntensity);

            // KawaCausticsSurface.Create is a graceful no-op (returns null) when its shader is
            // missing/unsupported - every caller here (SetEffectEnabled/IsEffectAvailable) already
            // tolerates a null _caustics. The rect covers the underwater column only (WaterWorldRect's
            // yMin up to the waterline itself, not the 5%-expanded yMax which pokes above it) so the
            // caustics fade coordinate (see KawaCaustics.shader's vertical fade) lines up with the
            // actual water surface rather than the slightly-taller full-screen-pass rect.
            var causticsRect = new Rect(
                _stage.WaterWorldRect.xMin,
                _stage.WaterWorldRect.yMin,
                _stage.WaterWorldRect.width,
                _stage.WaterlineWorldY - _stage.WaterWorldRect.yMin);
            _caustics = KawaCausticsSurface.Create(transform, causticsRect, CausticsSortingOrder, CausticsIntensity);

            _actors = KawaGlintActorsBuilder.Build(transform, _stage.WaterWorldRect, _stage.WaterlineWorldY, _stage.RodTipWorldPosition);

            _volume = FindFirstObjectByType<Volume>();
            if (_volume != null && _volume.profile != null && _volume.profile.TryGet(out KawaRefractionVolume refraction))
            {
                // Volume.profile (not sharedProfile) instantiates a per-Volume runtime copy the
                // first time it's touched, so overriding it here never mutates the project asset -
                // safe to call from a player build, not just the Editor. Aligns the post-process
                // pass's waterline with the stage's own measured waterline (WorldToViewportPoint of
                // the actual waterline world Y), rather than trusting the two to agree by coincidence.
                var viewportY = _camera.WorldToViewportPoint(new Vector3(0f, _stage.WaterlineWorldY, 0f)).y;
                refraction.waterlineViewportY.Override(viewportY);
            }

            // Same Volume.profile-runtime-copy pattern as the KawaRefractionVolume block above
            // (never mutates the project asset). The sun is position-fixed (only a scale pulse,
            // see KawaGlintStageBuilder.BuildSunGlow/RegisterSun), so a one-time Awake override is
            // sufficient - no per-frame sync is required (see DESIGN.md §2.3).
            if (_volume != null && _volume.profile != null && _volume.profile.TryGet(out KawaGodRayVolume godRays))
            {
                var waterlineViewportY = _camera.WorldToViewportPoint(new Vector3(0f, _stage.WaterlineWorldY, 0f)).y;
                godRays.waterlineViewportY.Override(waterlineViewportY);
                godRays.lightViewportPosition.Override(_stage.SunViewportPosition);
            }

            if (_actors != null)
            {
                var hud = KawaGlintHud.Build(transform);
                KawaGlintUiFactory.EnsureEventSystem();
                var gameControllerGo = new GameObject("KawaGlintGameController");
                gameControllerGo.transform.SetParent(transform, false);
                _gameController = gameControllerGo.AddComponent<KawaGlintGameController>();

                // 海拡張 (実装契約v1.0 §C-3): fishdex ローカルストアを配線し、ロケーション
                // 選択パネルを構築する。 fishdex の保存先は persistentDataPath 配下の
                // 専用サブディレクトリ (TsuriDexStore がアトミック書込を担当)。
                var fishdex = new KawaGlintFishdexService(
                    System.IO.Path.Combine(Application.persistentDataPath, "pono", "tsuri"));
                _gameController.Configure(_actors, hud, hud.InputSurface, _camera, _stage, Environment.TickCount, fishdex);

                var locationPanel = KawaGlintLocationSelectPanel.Build(transform);
                locationPanel.Configure(_gameController, hud.InputSurface, fishdex.ZoneCatchCount);
            }

            KawaGlintQaCapture.AttachIfRequested(gameObject, this);
        }

        /// <summary>Toggles one effect on/off at runtime (used by the QA capture harness and available for manual testing).</summary>
        public void SetEffectEnabled(KawaEffect effect, bool enabled)
        {
            switch (effect)
            {
                case KawaEffect.Refraction:
                    SetComponentActive<KawaRefractionVolume>(enabled);
                    break;
                case KawaEffect.Bloom:
                    SetComponentActive<Bloom>(enabled);
                    break;
                case KawaEffect.Surface:
                    if (_surface != null)
                    {
                        _surface.gameObject.SetActive(enabled);
                    }
                    break;
                case KawaEffect.Actors:
                    if (_actors != null)
                    {
                        _actors.gameObject.SetActive(enabled);
                    }
                    break;
                case KawaEffect.Caustics:
                    if (_caustics != null)
                    {
                        _caustics.gameObject.SetActive(enabled);
                    }
                    break;
                case KawaEffect.GodRays:
                    SetComponentActive<KawaGodRayVolume>(enabled);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(effect), effect, null);
            }
        }

        /// <summary>Whether the given effect actually has something to toggle (a Volume + matching component was found, or the module built successfully).</summary>
        public bool IsEffectAvailable(KawaEffect effect)
        {
            switch (effect)
            {
                case KawaEffect.Refraction:
                    return HasComponent<KawaRefractionVolume>();
                case KawaEffect.Bloom:
                    return HasComponent<Bloom>();
                case KawaEffect.Surface:
                    return _surface != null;
                case KawaEffect.Actors:
                    return _actors != null;
                case KawaEffect.Caustics:
                    return _caustics != null;
                case KawaEffect.GodRays:
                    return HasComponent<KawaGodRayVolume>();
                default:
                    return false;
            }
        }

        private void SetComponentActive<T>(bool enabled) where T : VolumeComponent
        {
            if (_volume != null && _volume.profile != null && _volume.profile.TryGet(out T component))
            {
                component.active = enabled;
            }
        }

        private bool HasComponent<T>() where T : VolumeComponent
        {
            return _volume != null && _volume.profile != null && _volume.profile.TryGet(out T _);
        }
    }
}
