using System;
using Pono.AquaLumina.Rendering;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.AquaLumina.Bootstrap
{
    /// <summary>
    /// Wires the four independently-built AquaLumina rendering modules (stage content, caustics
    /// surface, god-ray Volume, water-distortion Volume) together at scene runtime. This is the
    /// only piece of the spike that knows about all four modules at once - each module itself
    /// (see Runtime/Rendering) has zero knowledge of the others.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class AquaLuminaBootstrap : MonoBehaviour
    {
        /// <summary>Effects a QA capture (or any other caller) can independently toggle at runtime.</summary>
        public enum AquaEffect
        {
            GodRays,
            Caustics,
            Distortion,
            Bloom
        }

        // Sorting order 20 sits between the near rocks (16) and the sun disc (30) in the stage's
        // shared sorting-order contract (see AquaLuminaStageBuilder) - caustics read as light
        // patterns cast onto the mid-ground, above rocks/kelp/fish but below the sun itself.
        private const int CausticsSortingOrder = 20;
        private const float CausticsIntensity = 0.9f;

        // The stage's sun disc sits at SunViewportPosition (see AquaLuminaStageBuilder), but the
        // god-ray shafts should appear to emanate from slightly above the disc's own screen
        // position (mirroring how real underwater light shafts fan out from just above/at the
        // surface, not from the middle of the sun's glow) - a small fixed viewport-Y offset gets
        // this without either module needing to know about the other's exact layout.
        private static readonly Vector2 SunAlignmentOffset = new Vector2(0f, 0.17f);

        private Camera _camera;
        private AquaStageInfo _stage;
        private AquaCausticsSurface _caustics;
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
                Debug.LogWarning("[AquaLuminaBootstrap] No Camera.main found; the underwater stage was not built.");
                return;
            }

            _stage = AquaLuminaStageBuilder.Build(transform, _camera);

            // AquaCausticsSurface.Create is a graceful no-op (returns null) when its shader is
            // missing/unsupported - every caller here (SetEffectEnabled/IsEffectAvailable) already
            // tolerates a null _caustics.
            _caustics = AquaCausticsSurface.Create(transform, _stage.WaterWorldRect, CausticsSortingOrder, CausticsIntensity);

            _volume = FindFirstObjectByType<Volume>();
            if (_volume != null && _volume.profile != null && _volume.profile.TryGet(out AquaGodRayVolume godRays))
            {
                // Volume.profile (not sharedProfile) instantiates a per-Volume runtime copy the
                // first time it's touched, so overriding it here never mutates the project asset -
                // safe to call from a player build, not just the Editor.
                godRays.lightViewportPosition.Override(_stage.SunViewportPosition + SunAlignmentOffset);
            }

            AquaLuminaQaCapture.AttachIfRequested(gameObject, this);
        }

        /// <summary>Toggles one effect on/off at runtime (used by the QA capture harness and available for manual testing).</summary>
        public void SetEffectEnabled(AquaEffect effect, bool enabled)
        {
            switch (effect)
            {
                case AquaEffect.GodRays:
                    SetComponentActive<AquaGodRayVolume>(enabled);
                    break;
                case AquaEffect.Distortion:
                    SetComponentActive<AquaWaterDistortionVolume>(enabled);
                    break;
                case AquaEffect.Bloom:
                    SetComponentActive<Bloom>(enabled);
                    break;
                case AquaEffect.Caustics:
                    if (_caustics != null)
                    {
                        _caustics.gameObject.SetActive(enabled);
                    }
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(effect), effect, null);
            }
        }

        /// <summary>Whether the given effect actually has something to toggle (a Volume + matching component was found).</summary>
        public bool IsEffectAvailable(AquaEffect effect)
        {
            switch (effect)
            {
                case AquaEffect.GodRays:
                    return HasComponent<AquaGodRayVolume>();
                case AquaEffect.Distortion:
                    return HasComponent<AquaWaterDistortionVolume>();
                case AquaEffect.Bloom:
                    return HasComponent<Bloom>();
                case AquaEffect.Caustics:
                    return _caustics != null;
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
