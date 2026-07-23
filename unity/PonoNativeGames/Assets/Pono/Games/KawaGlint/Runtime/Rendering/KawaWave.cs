using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// The single C# source of truth for the analytic wave that shapes the
    /// KawaGlint river's waterline. The identical 3-sine formula is
    /// duplicated in HLSL inside the surface-band shader (a different
    /// module, see KawaSurface.shader / DESIGN.md "Wave contract") -- the two
    /// copies must never drift apart, since the bobber only reads as
    /// "floating on the surface" if it rides exactly the same curve the
    /// shader draws as the crest line.
    ///
    /// Do not change any of the nine literal constants below without also
    /// updating the HLSL copy in lockstep; they are hardcoded here rather
    /// than exposed as tunable fields specifically so that an accidental,
    /// silent divergence from this side is impossible.
    /// </summary>
    public static class KawaWave
    {
        /// <summary>
        /// Wave height in world units at world-space x and time t (seconds,
        /// always Time.time -- never engine-relative _Time.y equivalents,
        /// per the shared time-base contract). Max |Height| = 0.082 world
        /// units (~0.8% of the 10-unit visible height).
        /// </summary>
        public static float Height(float x, float t)
        {
            return 0.045f * Mathf.Sin(0.9f * x + 1.2f * t)
                + 0.025f * Mathf.Sin(2.3f * x - 2.1f * t + 1.7f)
                + 0.012f * Mathf.Sin(5.1f * x + 3.7f * t + 4.2f);
        }

        /// <summary>
        /// Analytic d(Height)/dx at world-space x and time t -- used to tilt
        /// the bobber to the local slope of the water surface instead of
        /// only bobbing it vertically.
        /// </summary>
        public static float Slope(float x, float t)
        {
            return 0.0405f * Mathf.Cos(0.9f * x + 1.2f * t)
                + 0.0575f * Mathf.Cos(2.3f * x - 2.1f * t + 1.7f)
                + 0.0612f * Mathf.Cos(5.1f * x + 3.7f * t + 4.2f);
        }
    }
}
