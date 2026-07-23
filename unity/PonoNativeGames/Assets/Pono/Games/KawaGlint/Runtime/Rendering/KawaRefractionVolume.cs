using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Volume-tunable settings for KawaGlint's waterline-masked refraction + squashed-reflection +
    /// underwater shimmer full-screen pass. All three strength-like parameters are combined into a
    /// single component because <see cref="KawaRefractionFeature"/> renders them together in one
    /// pass, sharing one scene copy and one flow-noise field (same layering argument as
    /// AquaLumina's AquaWaterDistortionVolume/Feature pair, which this spike follows verbatim).
    /// </summary>
    /// <remarks>
    /// <see cref="refractionStrength"/>, <see cref="reflectionStrength"/> and
    /// <see cref="shimmerStrength"/> all default to genuine zero, so <see cref="IsActive"/> returns
    /// false and <see cref="KawaRefractionFeature"/> skips the pass entirely until a scene Volume
    /// profile explicitly overrides them (the spike's own <c>KawaGlintVolumeProfile.asset</c>
    /// overrides them on -- see the integration step's EnsureVolumeProfile). This matters even
    /// beyond the obvious "no override -> no effect" case: <c>VolumeManager.instance.stack.GetComponent&lt;T&gt;()</c>
    /// returns a phantom instance carrying these class-default field values (with <c>active ==
    /// true</c>) whenever nothing in the stack overrides the component -- including, in practice,
    /// the auto-synced stub Unity's Volume system appends to the project's shared global default
    /// profile the first time a new VolumeComponent subclass is compiled (this is exactly the
    /// contamination bug that hit AquaLumina during its integration: a newly compiled
    /// VolumeComponent subclass got auto-synced into the shared <c>Assets/DefaultVolumeProfile.asset</c>
    /// via VolumeManager's default-state evaluation after a domain reload). A non-zero default here
    /// would leak into every camera in the project through that stub, and would also survive the
    /// scene Volume's own component being disabled (<c>component.active = false</c>, used by QA
    /// toggling) -- disabling a component only stops IT from contributing an override, it does not
    /// zero out the interpolated stack's fallback state. Keeping all three parameters at a true zero
    /// default is what makes the QA harness's "baseline" capture mode (all effects off) actually
    /// render undistorted, not just nominally "off", and is what keeps
    /// <c>Assets/DefaultVolumeProfile.asset</c> byte-identical even if this component's stub gets
    /// auto-synced into it (a zero-default stub contributes nothing observable, and the integration
    /// step's <c>RemoveOrphanedDefaultProfileEntries()</c> cleans up the stub entry itself anyway).
    /// </remarks>
    [Serializable, VolumeComponentMenu("Pono Kawa Glint/River Refraction")]
    [SupportedOnRenderPipeline(typeof(UniversalRenderPipelineAsset))]
    public sealed class KawaRefractionVolume : VolumeComponent, IPostProcessComponent
    {
        [Tooltip("UV-space refraction displacement amount. 0 = off. The scene profile overrides this to 0.010.")]
        public ClampedFloatParameter refractionStrength = new ClampedFloatParameter(0f, 0f, 0.05f);

        [Tooltip("Strength of the squashed-mirror reflection band hugging the underside of the waterline. 0 = off. The scene profile overrides this to 0.35.")]
        public ClampedFloatParameter reflectionStrength = new ClampedFloatParameter(0f, 0f, 1f);

        [Tooltip("Strength of the underwater sparkle + slow ambient-banding shimmer overlay. 0 = off. The scene profile overrides this to 0.30.")]
        public ClampedFloatParameter shimmerStrength = new ClampedFloatParameter(0f, 0f, 1f);

        [Tooltip("Spatial frequency of the underlying flow/shimmer noise field.")]
        public ClampedFloatParameter waveScale = new ClampedFloatParameter(1.8f, 0.25f, 8f);

        [Tooltip("Playback speed of the flow/shimmer animation.")]
        public ClampedFloatParameter speed = new ClampedFloatParameter(0.6f, 0f, 3f);

        [Tooltip("Chromatic fringing amount at the waterline, independent of refractionStrength (see the shader's chromaOffset derivation): capped at a small fraction of a pixel range even at this parameter's own max.")]
        public ClampedFloatParameter chromaticShift = new ClampedFloatParameter(0.002f, 0f, 0.01f);

        [Tooltip("Viewport-space Y (0 = bottom, 1 = top) of the river waterline. Positional, not an intensity -- a non-zero default is safe here (see KawaGlintBootstrap, which re-aligns this every scene load from the camera's actual WorldToViewportPoint of the waterline).")]
        public ClampedFloatParameter waterlineViewportY = new ClampedFloatParameter(0.66f, 0f, 1f);

        /// <summary>
        /// Tells <see cref="KawaRefractionFeature"/> whether the pass has anything to do this
        /// frame. Kept deliberately cheap (no allocations) since it runs every frame.
        /// </summary>
        public bool IsActive()
        {
            return refractionStrength.value > 0.0001f
                || reflectionStrength.value > 0.001f
                || shimmerStrength.value > 0.001f;
        }
    }
}
