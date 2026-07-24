using System;
using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Pure-function tests for <see cref="KawaGlintPreBitePlan"/> -- the
    /// per-cast nibble-burst schedule that drives both the target fish's
    /// lunge/retreat approach and the bobber's Twitch bursts during the
    /// Wait phase. No MonoBehaviour, no scene: everything here is either a
    /// deterministic Create() draw or a plain float-in/float-out curve.
    /// </summary>
    public sealed class KawaGlintPreBitePlanEditModeTests
    {
        private const int SeedCount = 50;
        private const float WaitTotalSec = 3f; // Mid-range of TsuriKawaTuning.WaitSecRange [2,5].

        [Test]
        public void Create_AcrossManySeeds_NibbleCountIsWithinOneToThree()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                Assert.That(plan.NibbleCount, Is.InRange(1, KawaGlintPreBitePlan.MaxNibbles),
                    $"seed {seed}: NibbleCount out of [1,3] at waitTotalSec={WaitTotalSec}.");
            }
        }

        [Test]
        public void Create_AcrossManySeeds_BurstsStayInsideUsableWindow()
        {
            var usableStart = KawaGlintPreBitePlan.WindowStartFrac * WaitTotalSec;
            var usableEnd = WaitTotalSec - KawaGlintPreBitePlan.QuietTailSec;

            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    var start = plan.NibbleStartSec(i);
                    var end = plan.NibbleEndSec(i);
                    Assert.That(start, Is.GreaterThanOrEqualTo(usableStart - 1e-4f),
                        $"seed {seed} burst {i}: start before usable window.");
                    Assert.That(end, Is.LessThanOrEqualTo(usableEnd + 1e-4f),
                        $"seed {seed} burst {i}: end after usable window (into the quiet tail).");
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_BurstsDoNotOverlapAndHaveMinimumGap()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount - 1; i++)
                {
                    var gap = plan.NibbleStartSec(i + 1) - plan.NibbleEndSec(i);
                    Assert.That(gap, Is.GreaterThanOrEqualTo(KawaGlintPreBitePlan.NibbleGapMinSec - 1e-4f),
                        $"seed {seed}: gap between burst {i} and {i + 1} was {gap}, below the minimum.");
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_DurationsAreWithinRange()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    var duration = plan.NibbleEndSec(i) - plan.NibbleStartSec(i);
                    Assert.That(duration, Is.InRange(
                        KawaGlintPreBitePlan.NibbleDurationMinSec - 1e-4f,
                        KawaGlintPreBitePlan.NibbleDurationMaxSec + 1e-4f),
                        $"seed {seed} burst {i}: duration {duration} out of range.");
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_IntensityIsWithinRange()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    var intensity = plan.NibbleIntensity01(i);
                    Assert.That(intensity, Is.InRange(0.7f, 1.3f),
                        $"seed {seed} burst {i}: intensity {intensity} out of range.");
                }
            }
        }

        [Test]
        public void Create_SameSeed_IsFullyReproducible()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var planA = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                var planB = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);

                Assert.That(planB.NibbleCount, Is.EqualTo(planA.NibbleCount), $"seed {seed}: NibbleCount diverged.");
                for (var i = 0; i < planA.NibbleCount; i++)
                {
                    Assert.That(planB.NibbleStartSec(i), Is.EqualTo(planA.NibbleStartSec(i)).Within(1e-6f), $"seed {seed} burst {i}: start diverged.");
                    Assert.That(planB.NibbleEndSec(i), Is.EqualTo(planA.NibbleEndSec(i)).Within(1e-6f), $"seed {seed} burst {i}: end diverged.");
                    Assert.That(planB.NibbleIntensity01(i), Is.EqualTo(planA.NibbleIntensity01(i)).Within(1e-6f), $"seed {seed} burst {i}: intensity diverged.");
                }
            }
        }

        [Test]
        public void Create_VeryShortWait_FallsBackToZeroNibbles()
        {
            // usableWidth = 0.35*0.5 window shrinks below NibbleDurationMinSec
            // for a very short wait -- must degrade gracefully to "no pre-bite"
            // rather than throw or produce an invalid burst.
            const float veryShortWait = 0.5f;
            var plan = KawaGlintPreBitePlan.Create(new System.Random(1), veryShortWait);
            Assert.That(plan.NibbleCount, Is.Zero);
        }

        [Test]
        public void ApproachDisplayProgress_AcrossManySeeds_StaysWithinZeroToOne()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                const int samples = 60;
                for (var s = 0; s <= samples; s++)
                {
                    var t = WaitTotalSec * s / samples;
                    var progress = plan.ApproachDisplayProgress(t);
                    Assert.That(progress, Is.InRange(0f, 1f), $"seed {seed}: progress out of [0,1] at t={t}.");
                }
            }
        }

        [Test]
        public void ApproachDisplayProgress_AtWaitTotal_IsExactlyOne()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                Assert.That(plan.ApproachDisplayProgress(WaitTotalSec), Is.EqualTo(1f).Within(1e-3f),
                    $"seed {seed}: progress at t=T must land exactly on 1.0 for BiteUi continuity.");
                // Also confirm times past T (defensive -- callers should never
                // pass these, but Tick's own dt clamping could overshoot by dt).
                Assert.That(plan.ApproachDisplayProgress(WaitTotalSec + 0.2f), Is.EqualTo(1f).Within(1e-3f));
            }
        }

        [Test]
        public void ApproachDisplayProgress_DuringBurst_LungesAheadOfLinearBaseline()
        {
            var foundABurstToSample = false;
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    foundABurstToSample = true;
                    var mid = (plan.NibbleStartSec(i) + plan.NibbleEndSec(i)) * 0.5f;
                    var progress = plan.ApproachDisplayProgress(mid);
                    var linearBaseline = mid / WaitTotalSec;
                    Assert.That(progress, Is.GreaterThan(linearBaseline),
                        $"seed {seed} burst {i}: mid-burst progress should lunge ahead of the linear baseline.");
                }
            }
            Assert.That(foundABurstToSample, Is.True, "No seed in the sweep produced any burst -- test would be vacuous.");
        }

        [Test]
        public void ApproachDisplayProgress_JustAfterBurst_RetreatsBelowLinearBaseline()
        {
            var foundASampleableGap = false;
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    var end = plan.NibbleEndSec(i);
                    var sampleT = end + 0.05f;
                    // Only sample points that stay inside [0, waitTotal) and
                    // ahead of the next burst's start (if any), so this checks
                    // the retreat curve in isolation.
                    var nextStart = i + 1 < plan.NibbleCount ? plan.NibbleStartSec(i + 1) : WaitTotalSec;
                    if (sampleT >= nextStart || sampleT >= WaitTotalSec - KawaGlintPreBitePlan.QuietTailSec)
                    {
                        continue;
                    }

                    foundASampleableGap = true;
                    var progress = plan.ApproachDisplayProgress(sampleT);
                    var linearBaseline = sampleT / WaitTotalSec;
                    Assert.That(progress, Is.LessThan(linearBaseline),
                        $"seed {seed} burst {i}: just-after-burst progress should retreat below the linear baseline.");
                }
            }
            Assert.That(foundASampleableGap, Is.True, "No seed in the sweep produced a sampleable post-burst gap -- test would be vacuous.");
        }

        [Test]
        public void ApproachDisplayProgress_AcrossNibbleEndBoundary_HasNoVisibleJump()
        {
            // Regression test for the reviewed bug: the lunge term (active
            // for t <= nibble.End) must land on the same value the retreat
            // term (active for t > nibble.End) starts from, or the target
            // fish visibly teleports for one frame right at the burst
            // boundary. A max single-frame delta comparable to the largest
            // per-frame progress change we'd expect from a smooth curve
            // (well under LungeProgressAmp/RetreatProgressAmp themselves)
            // is used as the tolerance so a reintroduced snap -- which jumps
            // by close to a full RetreatProgressAmp (0.04) -- fails loudly.
            const float epsilon = 1e-4f;
            const float maxAllowedJump = 0.005f;
            var foundABoundaryToSample = false;

            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    var end = plan.NibbleEndSec(i);
                    if (end + epsilon >= WaitTotalSec)
                    {
                        continue;
                    }

                    foundABoundaryToSample = true;
                    var justBefore = plan.ApproachDisplayProgress(end - epsilon);
                    var atEnd = plan.ApproachDisplayProgress(end);
                    var justAfter = plan.ApproachDisplayProgress(end + epsilon);

                    Assert.That(Mathf.Abs(atEnd - justBefore), Is.LessThan(maxAllowedJump),
                        $"seed {seed} burst {i}: jump at t==End (lunge side) was {atEnd - justBefore}.");
                    Assert.That(Mathf.Abs(justAfter - atEnd), Is.LessThan(maxAllowedJump),
                        $"seed {seed} burst {i}: jump just after t==End (retreat side) was {justAfter - atEnd} -- the target fish teleported.");
                }
            }
            Assert.That(foundABoundaryToSample, Is.True, "No seed in the sweep produced a sampleable nibble end -- test would be vacuous.");
        }

        [Test]
        public void CurrentNibbleIndex_OutsideAnyBurst_ReturnsNegativeOne()
        {
            var plan = KawaGlintPreBitePlan.Create(new System.Random(7), WaitTotalSec);
            Assert.That(plan.CurrentNibbleIndex(0f), Is.EqualTo(-1), "t=0 (before the window opens) must not be nibbling.");
            Assert.That(plan.IsNibbling(0f), Is.False);
        }

        [Test]
        public void CurrentNibbleIndex_InsideABurst_ReturnsThatIndex()
        {
            var foundABurstToSample = false;
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                for (var i = 0; i < plan.NibbleCount; i++)
                {
                    foundABurstToSample = true;
                    var mid = (plan.NibbleStartSec(i) + plan.NibbleEndSec(i)) * 0.5f;
                    Assert.That(plan.CurrentNibbleIndex(mid), Is.EqualTo(i), $"seed {seed} burst {i}: mid-burst index mismatch.");
                    Assert.That(plan.IsNibbling(mid), Is.True);
                }
            }
            Assert.That(foundABurstToSample, Is.True, "No seed in the sweep produced any burst -- test would be vacuous.");
        }
    }
}
