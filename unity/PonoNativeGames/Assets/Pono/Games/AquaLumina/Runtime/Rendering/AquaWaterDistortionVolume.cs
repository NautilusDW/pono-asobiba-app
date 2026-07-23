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
    /// Both <see cref="refractionStrength"/> and <see cref="shimmerStrength"/> default to genuine
    /// zero, so <see cref="IsActive"/> returns false and <see cref="AquaWaterDistortionFeature"/>
    /// skips the pass entirely until a scene Volume profile explicitly overrides them (the spike's
    /// own <c>AquaLuminaVolumeProfile.asset</c> overrides shimmerStrength to 0.35 - see
    /// EnsureWaterDistortionOverrides in AquaLuminaProjectSetup.cs). This matters even beyond the
    /// obvious "no override -> no effect" case: <c>VolumeManager.instance.stack.GetComponent&lt;T&gt;()</c>
    /// returns a phantom instance carrying these class-default field values (with <c>active ==
    /// true</c>) whenever nothing in the stack overrides the component - including, in practice,
    /// the auto-synced stub Unity's Volume system appends to the project's shared global default
    /// profile the first time a new VolumeComponent subclass is compiled (see
    /// AquaLuminaProjectSetup.SharedDefaultVolumeProfilePath's doc comment). A non-zero default
    /// here would leak into every camera in the project through that stub, and would also survive
    /// <c>AquaLuminaBootstrap.SetComponentActive&lt;T&gt;</c> (Bootstrap assembly; not referenced
    /// from here, hence plain-text rather than a resolvable cref) disabling this component on the
    /// scene's own Volume - disabling a component only stops IT from contributing an override, it
    /// does not zero out the interpolated stack's fallback state. Keeping both parameters at a
    /// true zero default is what makes the QA harness's "baseline" capture mode (all effects off)
    /// actually render undistorted, not just nominally "off".
    /// </remarks>
    [Serializable, VolumeComponentMenu("Pono Aqua Lumina/Water Distortion")]
    [SupportedOnRenderPipeline(typeof(UniversalRenderPipelineAsset))]
    public sealed class AquaWaterDistortionVolume : VolumeComponent, IPostProcessComponent
    {
        [Tooltip("UV-space refraction displacement amount. 0 = off. The scene profile overrides this to 0.012.")]
        public ClampedFloatParameter refractionStrength = new ClampedFloatParameter(0f, 0f, 0.05f);

        [Tooltip("Strength of the sparkle + slow ambient-banding shimmer overlay. 0 = off. The scene profile overrides this to 0.35.")]
        public ClampedFloatParameter shimmerStrength = new ClampedFloatParameter(0f, 0f, 1f);

        [Tooltip("Spatial frequency of the underlying flow/shimmer noise field.")]
        public ClampedFloatParameter waveScale = new ClampedFloatParameter(1.6f, 0.25f, 8f);

        [Tooltip("Playback speed of the flow/shimmer animation.")]
        public ClampedFloatParameter speed = new ClampedFloatParameter(0.5f, 0f, 3f);

        [Tooltip("Chromatic fringing amount, independent of refractionStrength (the split direction follows the flow field, but its magnitude is driven only by this value): capped at ~5px at 1080p height even at this parameter's own max, regardless of how refractionStrength is set.")]
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
