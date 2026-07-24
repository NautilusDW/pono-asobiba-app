using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>Which of the target fish's animation modes a wag profile is being asked for.</summary>
    public enum KawaGlintWagMode
    {
        Idle,
        Approach,
        Thrash,
        Flee
    }

    /// <summary>
    /// Per-rarity-tier motion profile for the single catchable target fish:
    /// how big it is, how deep it appears, how slowly it rises, how far it
    /// weaves, how its tail wags, how hard it thrashes and how fast it flees.
    ///
    /// Design principle (deliberate, do not "fix"): rarer is <b>slower,
    /// bigger and heavier</b> -- never faster or more frantic. Speeding a rare
    /// fish up reads as menacing to a 3-7 year old and pushes oscillators
    /// toward the 3 Hz photosensitivity ceiling; slowing it down reads as
    /// "おおもの" and costs nothing on either axis.
    ///
    /// Pure data + pure static functions with no MonoBehaviour and no
    /// UnityEngine object access, mirroring <see cref="KawaGlintSplashMath"/>
    /// and <see cref="KawaGlintPreBitePlan"/>, so every value here is
    /// assertable from EditMode tests with no scene.
    ///
    /// <b>tier0 is a bit-exact copy of the pre-rarity constants</b> that used
    /// to live as literals in <see cref="KawaGlintActorsController"/>. That is
    /// pinned by an EditMode test; changing a tier0 number is a visible
    /// regression to every normal catch in river_asase, not a tuning tweak.
    /// </summary>
    public static class KawaGlintRarityMotion
    {
        /// <summary>One tier's complete motion parameter set. Fields, not properties, so the table below reads as a table.</summary>
        public readonly struct Profile
        {
            /// <summary>Multiplies the species' base world length.</summary>
            public readonly float LengthMul;

            /// <summary>World Y the fish first appears at (rarer = deeper).</summary>
            public readonly float AppearY;

            /// <summary>Fraction of the approach spent holding depth before rising at all.</summary>
            public readonly float DepthHoldFrac;

            /// <summary>Exponent on the rise curve (&gt;1 = stalls near the top).</summary>
            public readonly float ApproachExp;

            /// <summary>World-unit amplitude of the slow vertical weave layered onto the approach.</summary>
            public readonly float WeaveAmpY;

            /// <summary>Weave frequency in Hz (0 for tier0, which does not weave at all).</summary>
            public readonly float WeaveHz;

            /// <summary>Shader _WagStartU: how far back along the body the tail wag starts.</summary>
            public readonly float WagStartU;

            /// <summary>Shader _WagWave: how many wave periods travel down the body.</summary>
            public readonly float WagWave;

            public readonly float WagAmpApproach;
            public readonly float WagAmpThrash;
            public readonly float WagAmpFlee;

            public readonly float WagSpeedApproach;
            public readonly float WagSpeedThrash;
            public readonly float WagSpeedFlee;

            /// <summary>World-unit half-amplitude of the renda thrash jitter around the anchor.</summary>
            public readonly float ThrashAmpX;

            /// <summary>Thrash jitter frequency in rad/s (positional, not luminance -- see <see cref="MaxAlphaOscillatorHz"/>).</summary>
            public readonly float ThrashFreq;

            /// <summary>Multiplies <c>KawaGlintPreBitePlan.MotionOffset</c> at the composition point (that file is never edited).</summary>
            public readonly float PreBiteLungeMul;

            /// <summary>Multiplies the bobber's pre-bite twitch intensity.</summary>
            public readonly float TwitchIntensityMul;

            /// <summary>Multiplies the bobber's bite-sink depth (the bobber clamps this itself).</summary>
            public readonly float BiteSinkMul;

            /// <summary>World units/second the fish escapes at.</summary>
            public readonly float FleeSpeed;

            public Profile(
                float lengthMul,
                float appearY,
                float depthHoldFrac,
                float approachExp,
                float weaveAmpY,
                float weaveHz,
                float wagStartU,
                float wagWave,
                float wagAmpApproach,
                float wagAmpThrash,
                float wagAmpFlee,
                float wagSpeedApproach,
                float wagSpeedThrash,
                float wagSpeedFlee,
                float thrashAmpX,
                float thrashFreq,
                float preBiteLungeMul,
                float twitchIntensityMul,
                float biteSinkMul,
                float fleeSpeed)
            {
                LengthMul = lengthMul;
                AppearY = appearY;
                DepthHoldFrac = depthHoldFrac;
                ApproachExp = approachExp;
                WeaveAmpY = weaveAmpY;
                WeaveHz = weaveHz;
                WagStartU = wagStartU;
                WagWave = wagWave;
                WagAmpApproach = wagAmpApproach;
                WagAmpThrash = wagAmpThrash;
                WagAmpFlee = wagAmpFlee;
                WagSpeedApproach = wagSpeedApproach;
                WagSpeedThrash = wagSpeedThrash;
                WagSpeedFlee = wagSpeedFlee;
                ThrashAmpX = thrashAmpX;
                ThrashFreq = thrashFreq;
                PreBiteLungeMul = preBiteLungeMul;
                TwitchIntensityMul = twitchIntensityMul;
                BiteSinkMul = biteSinkMul;
                FleeSpeed = fleeSpeed;
            }

            /// <summary>
            /// True when this profile is behaviorally identical to the
            /// pre-rarity approach path (no depth hold, linear rise, no
            /// weave). <see cref="KawaGlintActorsController"/> uses this to
            /// take the literal original <c>Vector3.LerpUnclamped</c> code
            /// path for tier0, so a normal catch cannot regress by even a
            /// float ulp -- including the deliberate Y overshoot during a
            /// pre-bite nibble, which the clamped rarity path drops.
            /// </summary>
            public bool IsNeutralApproach =>
                DepthHoldFrac <= 0f && ApproachExp == 1f && WeaveAmpY <= 0f;
        }

        /// <summary>
        /// Ceiling every alpha/luminance oscillator introduced by the rarity
        /// work stays strictly under (photosensitivity budget for 3-7 year
        /// olds). Positional oscillators (tail wag, thrash jitter, line
        /// tremble) are sub-pixel or sub-body-length movements of an opaque
        /// silhouette, not brightness flicker, and are governed by
        /// <see cref="MaxWagSpeedRadiansPerSecond"/> instead.
        /// </summary>
        public const float MaxAlphaOscillatorHz = 3f;

        /// <summary>
        /// Upper bound on any tier's tail-wag speed, in rad/s. 18 rad/s is
        /// ~2.86 Hz, which keeps the wag under the same 3 Hz line
        /// <c>KawaFishWag.shader</c>'s own header comment commits to.
        /// </summary>
        public const float MaxWagSpeedRadiansPerSecond = 18f;

        /// <summary>
        /// Hard cap on wag amplitude. <c>KawaFishWag.shader</c> shifts UVs
        /// sideways, and the shadow PNG pipeline only bakes a 4% (38px of
        /// 1024px) transparent margin on each edge -- exceed that and the tail
        /// samples off-texture and visibly clips.
        /// </summary>
        public const float MaxWagAmplitude = 0.055f;

        /// <summary>
        /// Floor on <c>_WagStartU</c> for the same reason: starting the wave
        /// further forward than this swings the fish's mid-body far enough to
        /// eat the 4% pad even at legal amplitudes.
        /// </summary>
        public const float MinWagStartU = 0.38f;

        // ---------------------------------------------------------------
        // Tier table. Row 0 is pinned to the historical constants; rows 1-3
        // are monotone in the directions asserted by the EditMode tests
        // (bigger/wider thrash going up, slower wag/flee going up).
        // ---------------------------------------------------------------
        private static readonly Profile[] Profiles =
        {
            // tier0 Normal -- BIT-EXACT with the constants that used to live in
            // KawaGlintActorsController (TargetFishAppearY, TargetFishWag*,
            // TargetFishThrash*, TargetFishFleeSpeedWorld) and with
            // KawaFishWag.shader's own _WagStartU/_WagWave material defaults.
            new Profile(
                lengthMul: 1.00f,
                appearY: -1.5f,
                depthHoldFrac: 0f,
                approachExp: 1f,
                weaveAmpY: 0f,
                weaveHz: 0f,
                wagStartU: 0.55f,
                wagWave: 4.0f,
                wagAmpApproach: 0.03f,
                wagAmpThrash: 0.05f,
                wagAmpFlee: 0.055f,
                wagSpeedApproach: 8.2f,
                wagSpeedThrash: 16f,
                wagSpeedFlee: 18f,
                thrashAmpX: 0.15f,
                thrashFreq: 20f,
                preBiteLungeMul: 1.00f,
                twitchIntensityMul: 1.00f,
                biteSinkMul: 1.00f,
                fleeSpeed: 8.0f),

            // tier1 Rare
            new Profile(
                lengthMul: 1.15f,
                appearY: -2.2f,
                depthHoldFrac: 0.25f,
                approachExp: 1.15f,
                weaveAmpY: 0.22f,
                weaveHz: 0.32f,
                wagStartU: 0.45f,
                wagWave: 4.6f,
                wagAmpApproach: 0.034f,
                wagAmpThrash: 0.050f,
                wagAmpFlee: 0.055f,
                wagSpeedApproach: 5.6f,
                wagSpeedThrash: 12.5f,
                wagSpeedFlee: 16f,
                thrashAmpX: 0.20f,
                thrashFreq: 16f,
                preBiteLungeMul: 1.25f,
                twitchIntensityMul: 1.15f,
                biteSinkMul: 1.15f,
                fleeSpeed: 7.0f),

            // tier2 Super
            new Profile(
                lengthMul: 1.35f,
                appearY: -3.0f,
                depthHoldFrac: 0.50f,
                approachExp: 1.35f,
                weaveAmpY: 0.34f,
                weaveHz: 0.22f,
                // 0.38 (not the 0.30 the first draft asked for): 0.30 swings
                // the mid-body far enough to eat the shadow art's 4% pad.
                wagStartU: 0.38f,
                wagWave: 6.0f,
                wagAmpApproach: 0.038f,
                wagAmpThrash: 0.052f,
                wagAmpFlee: 0.055f,
                wagSpeedApproach: 4.2f,
                wagSpeedThrash: 10f,
                wagSpeedFlee: 14f,
                thrashAmpX: 0.26f,
                thrashFreq: 13f,
                preBiteLungeMul: 1.50f,
                twitchIntensityMul: 1.30f,
                biteSinkMul: 1.30f,
                fleeSpeed: 6.0f),

            // tier3 -- reserved for the "legendary" step the species/probability
            // work may add. Already reachable: any tier >= 3 clamps here, so a
            // new rarity value can ship data-only with no change in Rendering.
            new Profile(
                lengthMul: 1.50f,
                appearY: -3.4f,
                depthHoldFrac: 0.60f,
                approachExp: 1.45f,
                weaveAmpY: 0.40f,
                weaveHz: 0.18f,
                wagStartU: 0.38f,
                wagWave: 6.6f,
                wagAmpApproach: 0.040f,
                wagAmpThrash: 0.054f,
                wagAmpFlee: 0.055f,
                wagSpeedApproach: 3.6f,
                wagSpeedThrash: 9f,
                wagSpeedFlee: 12f,
                thrashAmpX: 0.30f,
                thrashFreq: 12f,
                preBiteLungeMul: 1.65f,
                twitchIntensityMul: 1.40f,
                biteSinkMul: 1.40f,
                fleeSpeed: 5.5f)
        };

        /// <summary>Number of distinct tier rows. Any tier at or above this clamps to the last row.</summary>
        public static int TierCount => Profiles.Length;

        /// <summary>Motion profile for <paramref name="tier"/>, clamped into range (negative and far-future tiers are both safe).</summary>
        public static Profile For(int tier)
        {
            return Profiles[Mathf.Clamp(tier, 0, Profiles.Length - 1)];
        }

        /// <summary>Tail-wag amplitude/speed for one tier and animation mode (fed straight into the fish's MaterialPropertyBlock).</summary>
        public static void WagFor(int tier, KawaGlintWagMode mode, out float amplitude, out float speed)
        {
            var profile = For(tier);
            switch (mode)
            {
                case KawaGlintWagMode.Approach:
                    amplitude = profile.WagAmpApproach;
                    speed = profile.WagSpeedApproach;
                    break;
                case KawaGlintWagMode.Thrash:
                    amplitude = profile.WagAmpThrash;
                    speed = profile.WagSpeedThrash;
                    break;
                case KawaGlintWagMode.Flee:
                    amplitude = profile.WagAmpFlee;
                    speed = profile.WagSpeedFlee;
                    break;
                default:
                    amplitude = 0f;
                    speed = 0f;
                    break;
            }
        }

        /// <summary>
        /// Bell window that is <b>exactly</b> zero at both endpoints, so the
        /// weave cannot leak a fraction of a world unit into the moment the
        /// fish reaches its bite anchor. <c>Mathf.Sin(Mathf.PI)</c> is
        /// -8.7e-8, not 0, which is why the endpoints are special-cased
        /// instead of trusting the trig -- the fishing line's tension endpoint
        /// and the thrash anchor are both derived from this position.
        /// </summary>
        public static float WeaveWindow01(float progress01)
        {
            if (progress01 <= 0f || progress01 >= 1f)
            {
                return 0f;
            }
            return Mathf.Sin(progress01 * Mathf.PI);
        }

        /// <summary>
        /// Vertical weave offset at <paramref name="progress01"/> for
        /// <paramref name="tier"/>. <paramref name="phaseSeed"/> keeps
        /// successive casts from weaving in lockstep. Always 0 for tier0.
        /// </summary>
        public static float WeaveY(int tier, float progress01, float time, float phaseSeed)
        {
            var profile = For(tier);
            if (profile.WeaveAmpY <= 0f || profile.WeaveHz <= 0f)
            {
                return 0f;
            }
            var window = WeaveWindow01(progress01);
            if (window == 0f)
            {
                return 0f;
            }
            return profile.WeaveAmpY * window * Mathf.Sin(2f * Mathf.PI * profile.WeaveHz * time + phaseSeed);
        }

        /// <summary>
        /// Normalized rise parameter: 0 while the fish is still holding depth,
        /// ramping to 1 at the anchor, then bent by <c>ApproachExp</c> so
        /// rarer fish stall as they near the surface.
        ///
        /// For a neutral (tier0) profile this returns
        /// <paramref name="progress01"/> untouched -- including values above 1
        /// during a pre-bite nibble overshoot -- so the caller's
        /// <c>LerpUnclamped</c> keeps behaving exactly as it always has.
        /// </summary>
        public static float ApproachRise01(int tier, float progress01)
        {
            var profile = For(tier);
            if (profile.IsNeutralApproach)
            {
                return progress01;
            }

            var clamped = Mathf.Clamp01(progress01);
            var rise = Mathf.InverseLerp(profile.DepthHoldFrac, 1f, clamped);
            return profile.ApproachExp == 1f ? rise : Mathf.Pow(rise, profile.ApproachExp);
        }
    }
}
