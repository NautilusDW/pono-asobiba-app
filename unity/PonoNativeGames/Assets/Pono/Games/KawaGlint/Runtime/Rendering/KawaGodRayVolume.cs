using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Volume-tunable settings for KawaGlint's cutaway-view god-ray (light shaft) screen-space
    /// effect: light streams from the sky sun, through the waterline, into the underwater half of
    /// frame only. See <see cref="KawaGodRayFeature"/> for the ScriptableRendererFeature that
    /// reads these values every frame and renders the effect, adapted from
    /// <c>Pono.AquaLumina.Rendering.AquaGodRayVolume</c>'s GPU Gems 3 ch.13 "Volumetric Light
    /// Scattering as a Post-Process" technique (that spike is all-underwater and dark, so its
    /// rays can seed from a broad upper-frame threshold; this one's sky half is a bright pastel
    /// gradient, so this component adds a sun-proximity seed window and a hard waterline clip on
    /// top -- see <see cref="seedRadius"/> and <see cref="depthReach"/>).
    /// </summary>
    /// <remarks>
    /// <see cref="intensity"/> defaults to genuine zero, so <see cref="IsActive"/> returns false
    /// and <see cref="KawaGodRayFeature"/> skips the pass entirely until a scene Volume profile
    /// explicitly overrides it (KawaGlint's own <c>KawaGlintVolumeProfile.asset</c> overrides it
    /// on -- see the integration step's EnsureGodRayOverrides). This matters even beyond the
    /// obvious "no override -> no effect" case:
    /// <c>VolumeManager.instance.stack.GetComponent&lt;T&gt;()</c> returns a phantom instance
    /// carrying these class-default field values (with <c>active == true</c>) whenever nothing in
    /// the stack overrides the component -- including, in practice, the auto-synced stub Unity's
    /// Volume system appends to the project's shared global default profile the first time a new
    /// VolumeComponent subclass is compiled (this is exactly the contamination bug that hit
    /// AquaLumina, and later KawaRefractionVolume, during integration: a newly compiled
    /// VolumeComponent subclass got auto-synced into the shared
    /// <c>Assets/DefaultVolumeProfile.asset</c> via VolumeManager's default-state evaluation after
    /// a domain reload). A non-zero <see cref="intensity"/> default here would leak into every
    /// camera in the project through that stub. Keeping intensity at a true zero default is what
    /// makes the QA harness's "baseline" capture mode (all effects off) actually render without
    /// rays, not just nominally "off", and is what keeps <c>Assets/DefaultVolumeProfile.asset</c>
    /// byte-identical even if this component's stub gets auto-synced into it (a zero-intensity
    /// stub contributes nothing observable, and the integration step's
    /// <c>RemoveOrphanedDefaultProfileEntries()</c> cleans up the stub entry itself anyway). Every
    /// other strength-shaped parameter below (density/decay/threshold/beamNoiseStrength/tint) is
    /// deliberately allowed a non-zero class default because none of them gate visibility on
    /// their own -- <see cref="IsActive"/> is gated on <see cref="intensity"/> alone, so a phantom
    /// instance of this component is fully inert regardless of what any other field holds.
    /// </remarks>
    [Serializable, VolumeComponentMenu("Pono Kawa Glint/God Rays")]
    [SupportedOnRenderPipeline(typeof(UniversalRenderPipelineAsset))]
    public sealed class KawaGodRayVolume : VolumeComponent, IPostProcessComponent
    {
        [Tooltip("Overall strength of the ray contribution added on top of the scene. 0 = feature is fully inactive (see IsActive) -- the sole on/off gate. The scene profile overrides this to 0.55 (child-safe, well below AquaLumina's 0.85).")]
        public ClampedFloatParameter intensity = new ClampedFloatParameter(0f, 0f, 2f);

        [Tooltip("How far apart each radial-blur tap sits, as a fraction of the distance to the light. Values close to 1 stretch samples for long shafts; lower values keep the blur tighter.")]
        public ClampedFloatParameter density = new ClampedFloatParameter(0.96f, 0.5f, 1f);

        [Tooltip("Per-tap energy falloff walking the radial blur back toward the light. Lower than AquaLumina's 0.95 on purpose: the cutaway view's water only occupies the bottom half of frame, so shorter shafts read correctly instead of over-reaching past the waterline clip.")]
        public ClampedFloatParameter decay = new ClampedFloatParameter(0.95f, 0.5f, 1f);

        [Tooltip("Number of radial-blur taps per pass. Higher counts smooth the classic banded look of a screen-space radial blur; kept mobile-friendly at half resolution.")]
        public ClampedIntParameter sampleCount = new ClampedIntParameter(64, 16, 96);

        [Tooltip("Screen-space (viewport UV) position the rays converge toward -- the sun's projected position. Positional, not an intensity, so a non-zero default is safe (mirrors KawaRefractionVolume.waterlineViewportY's precedent). KawaGlintBootstrap overrides this once from KawaStageInfo.SunViewportPosition on scene load.")]
        public Vector2Parameter lightViewportPosition = new Vector2Parameter(new Vector2(0.82f, 0.90f));

        [Tooltip("Viewport-space Y (0 = bottom, 1 = top) of the river waterline -- shared contract with KawaRefractionVolume.waterlineViewportY. Positional, not an intensity, so a non-zero default is safe. KawaGlintBootstrap overrides this once from the camera's actual WorldToViewportPoint of the waterline.")]
        public ClampedFloatParameter waterlineViewportY = new ClampedFloatParameter(0.66f, 0f, 1f);

        [Tooltip("Luminance cutoff above which a pixel seeds a ray. Higher than AquaLumina's 0.55 because KawaGlint's sky is a bright pastel gradient (not a dark underwater scene) -- combined with seedRadius's sun-proximity window, this keeps the whole sky from becoming one giant seed.")]
        public ClampedFloatParameter threshold = new ClampedFloatParameter(0.62f, 0f, 2f);

        [Tooltip("Blends between uniform rays (0) and rays broken up by animated hash-noise beams (1). Kept below AquaLumina's 0.55 for a calmer, less busy shaft pattern appropriate for young children.")]
        public ClampedFloatParameter beamNoiseStrength = new ClampedFloatParameter(0.5f, 0f, 1f);

        [Tooltip("Radius (viewport units) of the sun-proximity seed window applied on top of the luminance threshold. Only pixels near the sun's screen position can seed a ray -- without this, KawaGlint's bright pastel sky would seed rays everywhere instead of just streaming from the sun.")]
        public ClampedFloatParameter seedRadius = new ClampedFloatParameter(0.35f, 0.1f, 0.8f);

        [Tooltip("Distance (viewport units, measured down from the waterline) over which the composited rays fade out underwater. Keeps shafts confined to a believable near-surface depth instead of reaching the bottom of frame at full strength.")]
        public ClampedFloatParameter depthReach = new ClampedFloatParameter(0.45f, 0.05f, 1f);

        [Tooltip("Color multiplied onto the accumulated ray light before it's added to the scene. HDR so authors can push warm sunlight tones past 1.0; alpha is not exposed since rays have no transparency concept of their own -- only additive strength via intensity.")]
        public ColorParameter tint = new ColorParameter(new Color(1f, 0.94f, 0.78f), true, false, true);

        /// <summary>
        /// Effect is active only once an author (or the QA harness) has dialed intensity above
        /// zero. Keeping the "on" condition tied to intensity rather than a separate bool means
        /// there is exactly one value to flip when validating this effect end-to-end, and exactly
        /// one value that must stay zero to keep a phantom/default instance fully inert (see the
        /// class remarks on shared DefaultVolumeProfile contamination).
        /// </summary>
        public bool IsActive()
        {
            return intensity.value > 0.001f;
        }
    }
}
