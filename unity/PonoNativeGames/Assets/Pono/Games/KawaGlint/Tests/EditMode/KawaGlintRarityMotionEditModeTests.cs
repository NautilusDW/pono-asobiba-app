using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Pins the per-rarity motion table (<see cref="KawaGlintRarityMotion"/>)
    /// and the child-safety limits every value in it has to respect.
    ///
    /// The load-bearing test here is <see cref="Tier0Standard_MatchesPreRarityConstantsExactly"/>:
    /// tier0 is what every ordinary catch in river_asase looks like, and it is
    /// supposed to be byte-identical to the behaviour that shipped before
    /// rarity existed. If it drifts, the regression is invisible in code review
    /// and obvious on a device.
    /// </summary>
    public sealed class KawaGlintRarityMotionEditModeTests
    {
        // Literal values from before the rarity table existed, transcribed from
        // KawaGlintActorsController's old private constants and
        // KawaFishWag.shader's material defaults. Deliberately duplicated here
        // rather than read from the table under test.
        private const float LegacyAppearY = -1.5f;
        private const float LegacyWagStartU = 0.55f;
        private const float LegacyWagWave = 4.0f;
        private const float LegacyWagApproachAmplitude = 0.03f;
        private const float LegacyWagApproachSpeed = 8.2f;
        private const float LegacyWagThrashAmplitude = 0.05f;
        private const float LegacyWagThrashSpeed = 16f;
        private const float LegacyWagFleeAmplitude = 0.055f;
        private const float LegacyWagFleeSpeed = 18f;
        private const float LegacyThrashAmplitudeX = 0.15f;
        private const float LegacyThrashFrequency = 20f;
        private const float LegacyFleeSpeedWorld = 8f;

        [Test]
        public void Tier0Standard_MatchesPreRarityConstantsExactly()
        {
            var p = KawaGlintRarityMotion.For(0);

            Assert.That(p.LengthMul, Is.EqualTo(1f), "tier0 must not resize the fish.");
            Assert.That(p.AppearY, Is.EqualTo(LegacyAppearY));
            Assert.That(p.DepthHoldFrac, Is.EqualTo(0f), "tier0 must not hold depth.");
            Assert.That(p.ApproachExp, Is.EqualTo(1f), "tier0 must rise linearly.");
            Assert.That(p.WeaveAmpY, Is.EqualTo(0f), "tier0 must not weave.");

            Assert.That(p.WagStartU, Is.EqualTo(LegacyWagStartU));
            Assert.That(p.WagWave, Is.EqualTo(LegacyWagWave));
            Assert.That(p.WagAmpApproach, Is.EqualTo(LegacyWagApproachAmplitude));
            Assert.That(p.WagSpeedApproach, Is.EqualTo(LegacyWagApproachSpeed));
            Assert.That(p.WagAmpThrash, Is.EqualTo(LegacyWagThrashAmplitude));
            Assert.That(p.WagSpeedThrash, Is.EqualTo(LegacyWagThrashSpeed));
            Assert.That(p.WagAmpFlee, Is.EqualTo(LegacyWagFleeAmplitude));
            Assert.That(p.WagSpeedFlee, Is.EqualTo(LegacyWagFleeSpeed));

            Assert.That(p.ThrashAmpX, Is.EqualTo(LegacyThrashAmplitudeX));
            Assert.That(p.ThrashFreq, Is.EqualTo(LegacyThrashFrequency));
            Assert.That(p.FleeSpeed, Is.EqualTo(LegacyFleeSpeedWorld));

            Assert.That(p.PreBiteLungeMul, Is.EqualTo(1f));
            Assert.That(p.TwitchIntensityMul, Is.EqualTo(1f));
            Assert.That(p.BiteSinkMul, Is.EqualTo(1f));

            Assert.That(p.IsNeutralApproach, Is.True,
                "tier0 must take the original LerpUnclamped approach path, overshoot included.");
        }

        [Test]
        public void TierProfiles_AreMonotone_BiggerAndSlowerAsRarityRises()
        {
            for (var tier = 1; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                var previous = KawaGlintRarityMotion.For(tier - 1);
                var current = KawaGlintRarityMotion.For(tier);

                Assert.That(current.LengthMul, Is.GreaterThanOrEqualTo(previous.LengthMul),
                    $"tier{tier} must not be smaller than tier{tier - 1}.");
                Assert.That(current.ThrashAmpX, Is.GreaterThanOrEqualTo(previous.ThrashAmpX),
                    $"tier{tier} must not thrash in a narrower arc than tier{tier - 1}.");

                // Rarer is slower, never faster. This is the whole design
                // stance: "heavy and unhurried", not "fast and frantic".
                Assert.That(current.WagSpeedApproach, Is.LessThanOrEqualTo(previous.WagSpeedApproach));
                Assert.That(current.WagSpeedThrash, Is.LessThanOrEqualTo(previous.WagSpeedThrash));
                Assert.That(current.WagSpeedFlee, Is.LessThanOrEqualTo(previous.WagSpeedFlee));
                Assert.That(current.FleeSpeed, Is.LessThanOrEqualTo(previous.FleeSpeed));
                Assert.That(current.ThrashFreq, Is.LessThanOrEqualTo(previous.ThrashFreq));

                Assert.That(current.AppearY, Is.LessThanOrEqualTo(previous.AppearY),
                    $"tier{tier} must appear at least as deep as tier{tier - 1}.");
            }
        }

        [Test]
        public void TierLookup_ClampsAboveAndBelowTheTable()
        {
            var top = KawaGlintRarityMotion.For(KawaGlintRarityMotion.TierCount - 1);

            // A rarity step added by the species work must degrade to the most
            // impressive profile available, never throw.
            Assert.That(KawaGlintRarityMotion.For(KawaGlintRarityMotion.TierCount).LengthMul, Is.EqualTo(top.LengthMul));
            Assert.That(KawaGlintRarityMotion.For(99).FleeSpeed, Is.EqualTo(top.FleeSpeed));

            var bottom = KawaGlintRarityMotion.For(0);
            Assert.That(KawaGlintRarityMotion.For(-5).LengthMul, Is.EqualTo(bottom.LengthMul));
        }

        [Test]
        public void EveryTier_RespectsTheWagShadersFourPercentPad()
        {
            for (var tier = 0; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                var p = KawaGlintRarityMotion.For(tier);

                // The shadow PNGs carry a 38px-of-1024 (~4%) transparent
                // margin. Exceed it and the wag shader samples off-texture,
                // visibly slicing the tail off.
                Assert.That(p.WagAmpApproach, Is.LessThanOrEqualTo(KawaGlintRarityMotion.MaxWagAmplitude), $"tier{tier} approach wag amplitude");
                Assert.That(p.WagAmpThrash, Is.LessThanOrEqualTo(KawaGlintRarityMotion.MaxWagAmplitude), $"tier{tier} thrash wag amplitude");
                Assert.That(p.WagAmpFlee, Is.LessThanOrEqualTo(KawaGlintRarityMotion.MaxWagAmplitude), $"tier{tier} flee wag amplitude");

                Assert.That(p.WagStartU, Is.GreaterThanOrEqualTo(KawaGlintRarityMotion.MinWagStartU),
                    $"tier{tier} starts the body wave too far forward for the art's edge padding.");
            }
        }

        [Test]
        public void EveryOscillator_StaysUnderTheChildSafetyCeiling()
        {
            const float hzPerRadPerSec = 1f / (2f * Mathf.PI);

            for (var tier = 0; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                var p = KawaGlintRarityMotion.For(tier);

                // Weave is a slow drift, and it is the only motion parameter
                // expressed directly in Hz.
                Assert.That(p.WeaveHz, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz), $"tier{tier} weave");

                // The wag is positional, but KawaFishWag.shader's own header
                // commits to staying under 3 Hz, so hold the table to it.
                Assert.That(p.WagSpeedApproach * hzPerRadPerSec, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz));
                Assert.That(p.WagSpeedThrash * hzPerRadPerSec, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz));
                Assert.That(p.WagSpeedFlee * hzPerRadPerSec, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz));
                Assert.That(p.WagSpeedFlee, Is.LessThanOrEqualTo(KawaGlintRarityMotion.MaxWagSpeedRadiansPerSecond));
            }

            // Alpha oscillators introduced by the aura.
            Assert.That(KawaGlintRareAura.HaloBreatheHz, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz),
                "halo breathing");
            Assert.That(1f / KawaGlintRareAura.SparkleMinLifetimeSeconds, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz),
                "one sparkle's fade-in/out envelope is one cycle per lifetime");

            // The two rings sit half a period apart, so a viewer sees two fade
            // cycles per loop -- the rate that actually matters is twice the
            // loop rate.
            var ringModes = new[]
            {
                KawaGlintPullMath.RingModeAmbient,
                KawaGlintPullMath.RingModePull,
                KawaGlintPullMath.RingModeRenda
            };
            foreach (var mode in ringModes)
            {
                var perceived = KawaGlintActorsController.RingCount / KawaGlintPullMath.RingLoopDurationFor(mode);
                Assert.That(perceived, Is.LessThan(KawaGlintRarityMotion.MaxAlphaOscillatorHz),
                    $"ripple ring mode {mode} pulses at {perceived:F2} Hz");
            }
        }

        [Test]
        public void WeaveWindow_IsExactlyZeroAtBothEndpoints()
        {
            // Not "approximately zero": the fishing line's tension endpoint and
            // the thrash anchor are both derived from the fish's position at
            // progress 1, and Mathf.Sin(Mathf.PI) is -8.7e-8, not 0.
            Assert.That(KawaGlintRarityMotion.WeaveWindow01(0f), Is.EqualTo(0f));
            Assert.That(KawaGlintRarityMotion.WeaveWindow01(1f), Is.EqualTo(0f));
            Assert.That(KawaGlintRarityMotion.WeaveWindow01(1.07f), Is.EqualTo(0f), "nibble overshoot must not reopen the window");
            Assert.That(KawaGlintRarityMotion.WeaveWindow01(0.5f), Is.EqualTo(1f).Within(1e-5f));

            for (var tier = 0; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                Assert.That(KawaGlintRarityMotion.WeaveY(tier, 0f, 12.34f, 0.7f), Is.EqualTo(0f));
                Assert.That(KawaGlintRarityMotion.WeaveY(tier, 1f, 12.34f, 0.7f), Is.EqualTo(0f));
            }
        }

        [Test]
        public void ApproachRise_IsIdentityForTier0_AndHoldsDepthForRarer()
        {
            // tier0 passes progress straight through, overshoot included, so
            // the caller's LerpUnclamped is untouched.
            Assert.That(KawaGlintRarityMotion.ApproachRise01(0, 0f), Is.EqualTo(0f));
            Assert.That(KawaGlintRarityMotion.ApproachRise01(0, 0.37f), Is.EqualTo(0.37f));
            Assert.That(KawaGlintRarityMotion.ApproachRise01(0, 1.07f), Is.EqualTo(1.07f));

            for (var tier = 1; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                var profile = KawaGlintRarityMotion.For(tier);
                Assert.That(KawaGlintRarityMotion.ApproachRise01(tier, 0f), Is.EqualTo(0f).Within(1e-6f));
                Assert.That(KawaGlintRarityMotion.ApproachRise01(tier, profile.DepthHoldFrac), Is.EqualTo(0f).Within(1e-6f),
                    $"tier{tier} must still be at its appear depth when the hold ends");
                Assert.That(KawaGlintRarityMotion.ApproachRise01(tier, 1f), Is.EqualTo(1f).Within(1e-6f));

                // Rarer fish stall as they near the surface: at the halfway
                // point of the rise they are still lower than a linear rise
                // would put them.
                var mid = KawaGlintRarityMotion.ApproachRise01(tier, Mathf.Lerp(profile.DepthHoldFrac, 1f, 0.5f));
                Assert.That(mid, Is.LessThan(0.5f), $"tier{tier} should ease out, not race up");
            }
        }

        [Test]
        public void WagFor_IdleMode_IsCompletelyStill()
        {
            for (var tier = 0; tier < KawaGlintRarityMotion.TierCount; tier++)
            {
                KawaGlintRarityMotion.WagFor(tier, KawaGlintWagMode.Idle, out var amplitude, out var speed);
                Assert.That(amplitude, Is.EqualTo(0f));
                Assert.That(speed, Is.EqualTo(0f));
            }
        }
    }
}
