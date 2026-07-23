using System;
using Pono.KawaGlint.Rendering;
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
            Bloom
        }

        // Contract constants shared with KawaGlintStageBuilder/KawaSurfaceBand/KawaGlintActorsBuilder
        // (see DESIGN.md "Surface band creation constants" / sorting-order table): sortingOrder 30,
        // intensity 1.0.
        private const int SurfaceSortingOrder = 30;
        private const float SurfaceIntensity = 1.0f;

        private Camera _camera;
        private KawaStageInfo _stage;
        private KawaSurfaceBand _surface;
        private KawaGlintActorsController _actors;
        private Volume _volume;

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
