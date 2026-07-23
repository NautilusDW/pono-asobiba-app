using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Volume-tunable settings for the underwater god-ray (light shaft) screen-space effect.
    /// See <see cref="AquaGodRayFeature"/> for the ScriptableRendererFeature that reads these
    /// values every frame and renders the effect.
    ///
    /// Defaults are OFF (intensity 0, see <see cref="IsActive"/>): a spike/QA scene turns the
    /// effect on purely by adding a Volume with this component overridden, without needing to
    /// touch the renderer feature itself. This mirrors how URP's own Bloom works and is what
    /// lets a visual-QA capture harness toggle the effect on/off just by (de)activating the
    /// component's override, with no code changes.
    /// </summary>
    [Serializable]
    [VolumeComponentMenu("Pono/Aqua Lumina/God Rays")]
    public sealed class AquaGodRayVolume : VolumeComponent, IPostProcessComponent
    {
        /// <summary>
        /// Overall strength of the ray contribution added on top of the scene. 0 = feature is
        /// fully inactive (see <see cref="IsActive"/>), so this single parameter is both the
        /// "how strong" and the "on/off" switch for the whole effect.
        /// </summary>
        public ClampedFloatParameter intensity = new ClampedFloatParameter(0f, 0f, 2f);

        /// <summary>
        /// How far apart each of the radial-blur taps sits, as a fraction of the distance to the
        /// light. Values close to 1 stretch samples across almost the whole screen for long
        /// shafts; lower values keep the blur tighter and more local to the bright seed pixels.
        /// </summary>
        public ClampedFloatParameter density = new ClampedFloatParameter(0.96f, 0.5f, 1f);

        /// <summary>
        /// Per-tap energy falloff applied while walking the radial blur back toward the light.
        /// Lower values make rays fade out closer to their source; values near 1 let them carry
        /// almost undiminished all the way across the radial-blur sample chain.
        /// </summary>
        public ClampedFloatParameter decay = new ClampedFloatParameter(0.95f, 0.5f, 1f);

        /// <summary>
        /// Number of radial-blur taps per pass. Higher counts smooth out the classic
        /// "stepped"/banded look of a screen-space radial blur at the cost of more texture
        /// samples; two blur passes at this count is what keeps the result banding-free without
        /// needing an unreasonably high tap count in either single pass.
        /// </summary>
        public ClampedIntParameter sampleCount = new ClampedIntParameter(64, 16, 96);

        /// <summary>
        /// Screen-space (viewport UV) position the rays converge toward, standing in for the
        /// projected position of the sun/light source. Y is intentionally allowed to exceed 1.0
        /// (default 1.05) so the apparent light source sits just above the top edge of frame,
        /// which is what gives rays their natural "streaming down from the surface" direction.
        /// </summary>
        public Vector2Parameter lightViewportPosition = new Vector2Parameter(new Vector2(0.5f, 1.05f));

        /// <summary>
        /// Luminance cutoff (gamma-space-ish scene brightness) above which a pixel seeds a ray.
        /// Raising this restricts rays to only the brightest highlights near the light position;
        /// lowering it lets more of the frame's midtones bleed into the ray pattern.
        /// </summary>
        public ClampedFloatParameter threshold = new ClampedFloatParameter(0.55f, 0f, 2f);

        /// <summary>
        /// Blends between uniform rays (0) and rays broken up by animated hash-noise beams (1).
        /// At 1 the seed pattern is fully noise-modulated, which is what makes individual shafts
        /// read as distinct and gives them their slow flicker once smeared by the radial blur.
        /// </summary>
        public ClampedFloatParameter beamNoiseStrength = new ClampedFloatParameter(0.55f, 0f, 1f);

        /// <summary>
        /// Color multiplied onto the accumulated ray light before it's added to the scene. HDR
        /// (true) so authors can push warm sunlight tones past 1.0 if the underwater grading
        /// calls for it; alpha is not exposed (showAlpha: false) since rays have no transparency
        /// concept of their own - only additive strength via <see cref="intensity"/>.
        /// </summary>
        public ColorParameter tint = new ColorParameter(new Color(1f, 0.92f, 0.76f), true, false, true);

        /// <summary>
        /// Effect is active only once an author (or the QA harness) has dialed intensity above
        /// zero. Keeping the "on" condition tied to intensity rather than a separate bool means
        /// there's exactly one value to flip when validating this effect end-to-end.
        /// </summary>
        public bool IsActive()
        {
            return intensity.value > 0.001f;
        }
    }
}
