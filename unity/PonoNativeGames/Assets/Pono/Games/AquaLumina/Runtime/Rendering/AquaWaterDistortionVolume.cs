using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Volume-tunable settings for the combined water refraction/shimmer full-screen pass.
    /// Covers both visual goal (c) refraction/water distortion and (d) shimmer/ambient water
    /// motion in a single component because <see cref="AquaWaterDistortionFeature"/> renders
    /// them together in one pass, sharing one scene copy and one noise field.
    /// </summary>
    /// <remarks>
    /// Both <see cref="refractionStrength"/> and <see cref="shimmerStrength"/> default to (near)
    /// zero/idle so the pass stays inert (<see cref="IsActive"/> returns false and the render
    /// feature skips it) until a scene Volume profile explicitly overrides them. QA can toggle
    /// the whole effect at runtime via the inherited <see cref="VolumeComponent.active"/> flag.
    /// </remarks>
    [Serializable, VolumeComponentMenu("Pono Aqua Lumina/Water Distortion")]
    [SupportedOnRenderPipeline(typeof(UniversalRenderPipelineAsset))]
    public sealed class AquaWaterDistortionVolume : VolumeComponent, IPostProcessComponent
    {
        [Tooltip("UV-space refraction displacement amount. 0 = off. The scene profile overrides this to 0.012.")]
        public ClampedFloatParameter refractionStrength = new ClampedFloatParameter(0f, 0f, 0.05f);

        [Tooltip("Strength of the sparkle + slow ambient-banding shimmer overlay.")]
        public ClampedFloatParameter shimmerStrength = new ClampedFloatParameter(0.35f, 0f, 1f);

        [Tooltip("Spatial frequency of the underlying flow/shimmer noise field.")]
        public ClampedFloatParameter waveScale = new ClampedFloatParameter(1.6f, 0.25f, 8f);

        [Tooltip("Playback speed of the flow/shimmer animation.")]
        public ClampedFloatParameter speed = new ClampedFloatParameter(0.5f, 0f, 3f);

        [Tooltip("Per-channel UV split layered on top of the refraction offset (subtle chromatic fringing, capped well under a handful of pixels at 1080p).")]
        public ClampedFloatParameter chromaticShift = new ClampedFloatParameter(0.0025f, 0f, 0.01f);

        /// <summary>
        /// Tells <see cref="AquaWaterDistortionFeature"/> whether the pass has anything to do
        /// this frame. Kept deliberately cheap (no allocations) since it runs every frame.
        /// </summary>
        public bool IsActive()
        {
            return refractionStrength.value > 0.0001f || shimmerStrength.value > 0.001f;
        }
    }
}
