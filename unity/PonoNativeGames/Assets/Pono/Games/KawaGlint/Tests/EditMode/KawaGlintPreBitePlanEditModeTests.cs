using System;
using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Pure-function tests for <see cref="KawaGlintPreBitePlan"/> -- the
    /// per-cast Shallow/Deep event schedule that drives both the target
    /// fish's two-phase travel/event approach and the bobber's
    /// Twitch/BiteSink presentation during the Wait phase. No MonoBehaviour,
    /// no scene: everything here is either a deterministic Create() draw or
    /// a plain float-in/float-out curve.
    /// </summary>
    public sealed class KawaGlintPreBitePlanEditModeTests
    {
        private const int SeedCount = 50;
        private const float WaitTotalSec = 8f; // Mid-range of TsuriKawaTuning.WaitSecRange [6,10].
        private const float Epsilon = 1e-4f;

        // Sweeps the practical wait-time range: TsuriKawaTuning.WaitSecRangeAfterMiss
        // is [3,5] and WaitSecRange is [6,10], plus a couple of values below
        // 1s that must degrade to the zero-event fallback.
        private static readonly float[] WaitTotalsForSweep = { 0.5f, 1f, 2f, 3f, 4f, 5f, 6f, 8f, 10f };

        // TsuriKawaTuning.WaitSecRangeAfterMiss's range -- a short post-miss
        // recast wait must never throw, and (per the width math worked out
        // for these constants) always fully degrades any Deep pull before
        // ever needing to touch the Shallow count.
        private static readonly float[] ShortAfterMissWaits = { 3f, 4f, 5f };

        private static int CountShallow(KawaGlintPreBitePlan plan)
        {
            var n = 0;
            for (var i = 0; i < plan.EventCount; i++)
            {
                if (plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Shallow)
                {
                    n++;
                }
            }
            return n;
        }

        private static int CountDeep(KawaGlintPreBitePlan plan)
        {
            var n = 0;
            for (var i = 0; i < plan.EventCount; i++)
            {
                if (plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Deep)
                {
                    n++;
                }
            }
            return n;
        }

        [Test]
        public void Create_AcrossManySeeds_ShallowCountIsWithinBounds()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var shallowCount = CountShallow(plan);
                    Assert.That(shallowCount, Is.InRange(0, KawaGlintPreBitePlan.MaxNibbles),
                        $"waitTotal={waitTotal} seed={seed}: Shallow count out of [0,{KawaGlintPreBitePlan.MaxNibbles}].");
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_DeepCountWithinZeroToTwo_AndFitsUsableWindow()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                var usableStart = KawaGlintPreBitePlan.ArrivalFrac * waitTotal;
                var usableEnd = waitTotal - KawaGlintPreBitePlan.QuietTailSec;

                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var deepCount = CountDeep(plan);
                    Assert.That(deepCount, Is.InRange(0, KawaGlintPreBitePlan.MaxDeepEvents),
                        $"waitTotal={waitTotal} seed={seed}: Deep count out of [0,{KawaGlintPreBitePlan.MaxDeepEvents}].");

                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        Assert.That(plan.EventStartSec(i), Is.GreaterThanOrEqualTo(usableStart - Epsilon),
                            $"waitTotal={waitTotal} seed={seed} event {i}: start before usable window (arrival).");
                        Assert.That(plan.EventEndSec(i), Is.LessThanOrEqualTo(usableEnd + Epsilon),
                            $"waitTotal={waitTotal} seed={seed} event {i}: end after usable window (into the quiet tail).");
                    }
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_EventsDoNotOverlapAndHaveKindAppropriateMinimumGap()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount - 1; i++)
                    {
                        var gap = plan.EventStartSec(i + 1) - plan.EventEndSec(i);
                        var bothDeep = plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Deep
                            && plan.EventKindAt(i + 1) == KawaGlintPreBiteEventKind.Deep;
                        var minGap = bothDeep ? KawaGlintPreBitePlan.DeepGapMinSec : KawaGlintPreBitePlan.NibbleGapMinSec;
                        Assert.That(gap, Is.GreaterThanOrEqualTo(minGap - Epsilon),
                            $"waitTotal={waitTotal} seed={seed}: gap between event {i} and {i + 1} was {gap}, below the minimum ({minGap}).");
                    }
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_ShallowDurationsAreWithinRange()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Shallow)
                        {
                            continue;
                        }
                        var duration = plan.EventEndSec(i) - plan.EventStartSec(i);
                        Assert.That(duration, Is.InRange(
                            KawaGlintPreBitePlan.NibbleDurationMinSec - Epsilon,
                            KawaGlintPreBitePlan.NibbleDurationMaxSec + Epsilon),
                            $"waitTotal={waitTotal} seed={seed} event {i}: Shallow duration {duration} out of range.");
                    }
                }
            }
        }

        [Test]
        public void Create_AcrossManySeeds_DeepDurationIsExactlyDeepWindowSec()
        {
            var foundADeepEvent = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Deep)
                        {
                            continue;
                        }
                        foundADeepEvent = true;
                        var duration = plan.EventEndSec(i) - plan.EventStartSec(i);
                        Assert.That(duration, Is.EqualTo(KawaGlintPreBitePlan.DeepWindowSec).Within(Epsilon),
                            $"waitTotal={waitTotal} seed={seed} event {i}: Deep duration {duration} was not exactly DeepWindowSec.");
                    }
                }
            }
            Assert.That(foundADeepEvent, Is.True, "No seed/wait combo in the sweep produced any Deep event -- test would be vacuous.");
        }

        [Test]
        public void Create_AcrossManySeeds_ShallowIntensityIsWithinRange_DeepIntensityIsOne()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        var intensity = plan.EventIntensity01(i);
                        if (plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Shallow)
                        {
                            Assert.That(intensity, Is.InRange(0.7f, 1.3f),
                                $"waitTotal={waitTotal} seed={seed} event {i}: Shallow intensity {intensity} out of range.");
                        }
                        else
                        {
                            Assert.That(intensity, Is.EqualTo(1f),
                                $"waitTotal={waitTotal} seed={seed} event {i}: Deep intensity should be reported as 1.");
                        }
                    }
                }
            }
        }

        [Test]
        public void Create_SameSeed_IsFullyReproducible()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var planA = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var planB = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);

                    Assert.That(planB.EventCount, Is.EqualTo(planA.EventCount), $"waitTotal={waitTotal} seed={seed}: EventCount diverged.");
                    for (var i = 0; i < planA.EventCount; i++)
                    {
                        Assert.That(planB.EventKindAt(i), Is.EqualTo(planA.EventKindAt(i)), $"waitTotal={waitTotal} seed={seed} event {i}: kind diverged.");
                        Assert.That(planB.EventStartSec(i), Is.EqualTo(planA.EventStartSec(i)).Within(1e-6f), $"waitTotal={waitTotal} seed={seed} event {i}: start diverged.");
                        Assert.That(planB.EventEndSec(i), Is.EqualTo(planA.EventEndSec(i)).Within(1e-6f), $"waitTotal={waitTotal} seed={seed} event {i}: end diverged.");
                        Assert.That(planB.EventIntensity01(i), Is.EqualTo(planA.EventIntensity01(i)).Within(1e-6f), $"waitTotal={waitTotal} seed={seed} event {i}: intensity diverged.");
                    }
                }
            }
        }

        [Test]
        public void Create_VeryShortWait_FallsBackToZeroEvents()
        {
            // usableWidth shrinks below NibbleDurationMinSec for a very
            // short wait -- must degrade gracefully to "no pre-bite" rather
            // than throw or produce an invalid event.
            const float veryShortWait = 0.5f;
            var plan = KawaGlintPreBitePlan.Create(new System.Random(1), veryShortWait);
            Assert.That(plan.EventCount, Is.Zero);
        }

        [Test]
        public void Create_ShallowAlwaysPrecedesDeep()
        {
            var foundBothKinds = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);

                    var seenDeep = false;
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Deep)
                        {
                            seenDeep = true;
                        }
                        else if (seenDeep)
                        {
                            Assert.Fail($"waitTotal={waitTotal} seed={seed}: a Shallow event appeared after a Deep event at index {i} -- ordering invariant broken.");
                        }
                    }

                    var lastShallowEnd = float.NegativeInfinity;
                    var firstDeepStart = float.PositiveInfinity;
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) == KawaGlintPreBiteEventKind.Shallow)
                        {
                            lastShallowEnd = Mathf.Max(lastShallowEnd, plan.EventEndSec(i));
                        }
                        else
                        {
                            firstDeepStart = Mathf.Min(firstDeepStart, plan.EventStartSec(i));
                            foundBothKinds = true;
                        }
                    }
                    if (!float.IsNegativeInfinity(lastShallowEnd) && !float.IsPositiveInfinity(firstDeepStart))
                    {
                        Assert.That(firstDeepStart, Is.GreaterThanOrEqualTo(lastShallowEnd - Epsilon),
                            $"waitTotal={waitTotal} seed={seed}: first Deep start ({firstDeepStart}) was before the last Shallow end ({lastShallowEnd}).");
                    }
                }
            }
            Assert.That(foundBothKinds, Is.True, "No seed/wait combo in the sweep produced both a Shallow and a Deep event -- test would be vacuous.");
        }

        [Test]
        public void Create_ShortAfterMissWait_DegradesDeepFirstThenShallow_NeverThrows()
        {
            foreach (var waitTotal in ShortAfterMissWaits)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    KawaGlintPreBitePlan plan = null;
                    Assert.DoesNotThrow(() => plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal),
                        $"waitTotal={waitTotal} seed={seed}: Create threw.");

                    // Worked out from the fixed constants (DeepWindowSec=2.2,
                    // DeepGapMinSec=0.6, NibbleGapMinSec=0.25, ArrivalFrac=0.35,
                    // QuietTailSec=0.45): a single Deep pull never fits inside
                    // the usable window for any wait in [3,5]s, so Deep must
                    // always degrade all the way to 0 here -- Shallow (whose
                    // minimum footprint is far smaller) never needs to be
                    // touched at all.
                    Assert.That(CountDeep(plan), Is.Zero,
                        $"waitTotal={waitTotal} seed={seed}: expected Deep to fully degrade to 0 for a short after-miss wait.");
                    Assert.That(CountShallow(plan), Is.InRange(KawaGlintPreBitePlan.MinShallowEvents, KawaGlintPreBitePlan.MaxNibbles),
                        $"waitTotal={waitTotal} seed={seed}: Shallow should not need to degrade below its initial draw here.");
                }
            }
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
                Assert.That(plan.ApproachDisplayProgress(WaitTotalSec + 0.2f), Is.EqualTo(1f).Within(1e-3f));
            }
        }

        [Test]
        public void ApproachDisplayProgress_ReachesExactlyOneAtArrivalSec()
        {
            for (var seed = 0; seed < SeedCount; seed++)
            {
                var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), WaitTotalSec);
                Assert.That(plan.ApproachDisplayProgress(plan.ArrivalSec), Is.EqualTo(1f).Within(1e-3f),
                    $"seed {seed}: progress must already be exactly 1.0 at ArrivalSec, before any event can start.");
            }
        }

        [Test]
        public void ApproachAndOffset_BeforeArrival_ProgressIsMonotonicNonDecreasingAndOffsetIsZero()
        {
            const int samples = 40;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var arrivalSec = plan.ArrivalSec;
                    var previous = float.NegativeInfinity;
                    for (var s = 0; s <= samples; s++)
                    {
                        var t = arrivalSec * s / samples;

                        var offset = plan.MotionOffset(t);
                        Assert.That(offset, Is.EqualTo(0f).Within(1e-6f),
                            $"waitTotal={waitTotal} seed={seed}: MotionOffset must be exactly 0 before arrival (t={t}, arrivalSec={arrivalSec}) -- nothing may move while the fish is still travelling.");

                        var progress = plan.ApproachDisplayProgress(t);
                        Assert.That(progress, Is.GreaterThanOrEqualTo(previous - 1e-6f),
                            $"waitTotal={waitTotal} seed={seed}: ApproachDisplayProgress must be monotonic non-decreasing before arrival (t={t}, progress={progress}, previous={previous}).");
                        previous = progress;
                    }
                }
            }
        }

        [Test]
        public void Create_AcrossManySeedsAndWaits_EventStartsNeverBeforeArrival()
        {
            var sampledAnyEvent = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var arrivalSec = plan.ArrivalSec;
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        sampledAnyEvent = true;
                        Assert.That(plan.EventStartSec(i), Is.GreaterThanOrEqualTo(arrivalSec - Epsilon),
                            $"waitTotal={waitTotal} seed={seed} event {i}: started at {plan.EventStartSec(i)}, before arrival ({arrivalSec}). An event must never fire while the fish is still travelling.");
                    }
                }
            }
            Assert.That(sampledAnyEvent, Is.True, "No seed/wait combo in the sweep produced any event -- test would be vacuous.");
        }

        [Test]
        public void ComposedProgress_AfterArrival_StaysNearOneNoLongDistanceRedo()
        {
            // Generous vs. the individual per-event terms (LungeProgressAmp
            // 0.07 / RetreatProgressAmp 0.04 / DeepLungeProgressAmp 0.12,
            // even allowing for some overlap/stacking across events), but
            // far below the magnitude of the old bug class -- where the fish
            // visibly reversed and re-traveled while still near the
            // WindowStartFrac mark -- so this still fails loudly if that
            // regresses.
            const float maxAllowedDeviation = 0.25f;
            const int samples = 60;
            var sampledAnyPostArrivalPoint = false;

            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    var arrivalSec = plan.ArrivalSec;
                    if (arrivalSec >= waitTotal)
                    {
                        continue;
                    }

                    for (var s = 0; s <= samples; s++)
                    {
                        var t = arrivalSec + (waitTotal - arrivalSec) * s / samples;
                        sampledAnyPostArrivalPoint = true;

                        var composed = plan.ApproachDisplayProgress(t) + plan.MotionOffset(t);
                        Assert.That(composed, Is.GreaterThanOrEqualTo(1f - maxAllowedDeviation),
                            $"waitTotal={waitTotal} seed={seed}: composed progress {composed} at t={t} regressed too far below the arrival anchor.");
                        Assert.That(composed, Is.LessThanOrEqualTo(1f + maxAllowedDeviation),
                            $"waitTotal={waitTotal} seed={seed}: composed progress {composed} at t={t} overshot too far past the arrival anchor.");
                    }
                }
            }
            Assert.That(sampledAnyPostArrivalPoint, Is.True, "No seed/wait combo produced a sampleable post-arrival point -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_DuringShallowBurst_IsPositive()
        {
            var foundABurstToSample = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Shallow)
                        {
                            continue;
                        }
                        foundABurstToSample = true;
                        var mid = (plan.EventStartSec(i) + plan.EventEndSec(i)) * 0.5f;
                        var offset = plan.MotionOffset(mid);
                        Assert.That(offset, Is.GreaterThan(0f),
                            $"waitTotal={waitTotal} seed={seed} event {i}: mid-burst MotionOffset should lunge forward (positive).");
                    }
                }
            }
            Assert.That(foundABurstToSample, Is.True, "No seed/wait combo produced a Shallow burst -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_DuringDeepPull_IsPositiveAndReachesFullAmplitudeAtHold()
        {
            var foundADeepEvent = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Deep)
                        {
                            continue;
                        }
                        foundADeepEvent = true;
                        var mid = (plan.EventStartSec(i) + plan.EventEndSec(i)) * 0.5f;
                        var offset = plan.MotionOffset(mid);
                        // MotionOffset is a COMPOSED sum over every event, not DeepMotion in
                        // isolation -- a preceding Shallow burst's retreat term
                        // (-RetreatProgressAmp * x * exp(1-x)) is asymptotic and never reaches
                        // exactly 0, so it can still contribute a small residual this far out.
                        // Bounded well below this tolerance: the fixed minimum Shallow->Deep gap
                        // (NibbleGapMinSec=0.25) plus half of DeepWindowSec (1.1) means x is
                        // always >= 3.375 at a Deep event's own mid-point, comfortably past the
                        // retreat curve's x==1 peak (where it is monotonically decreasing) --
                        // worst case bleed is ~0.013, not the full RetreatProgressAmp (0.04).
                        Assert.That(offset, Is.EqualTo(KawaGlintPreBitePlan.DeepLungeProgressAmp).Within(0.03f),
                            $"waitTotal={waitTotal} seed={seed} event {i}: mid-pull (held plateau) MotionOffset should sit at (within a small Shallow-retreat-bleed tolerance of) the full DeepLungeProgressAmp.");
                    }
                }
            }
            Assert.That(foundADeepEvent, Is.True, "No seed/wait combo produced a Deep event -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_JustAfterShallowBurst_IsNegative()
        {
            var foundASampleableGap = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Shallow)
                        {
                            continue;
                        }
                        var end = plan.EventEndSec(i);
                        var sampleT = end + 0.05f;
                        var nextStart = i + 1 < plan.EventCount ? plan.EventStartSec(i + 1) : waitTotal;
                        if (sampleT >= nextStart || sampleT >= waitTotal - KawaGlintPreBitePlan.QuietTailSec)
                        {
                            continue;
                        }

                        foundASampleableGap = true;
                        var offset = plan.MotionOffset(sampleT);
                        Assert.That(offset, Is.LessThan(0f),
                            $"waitTotal={waitTotal} seed={seed} event {i}: just-after-burst MotionOffset should retreat (negative).");
                    }
                }
            }
            Assert.That(foundASampleableGap, Is.True, "No seed/wait combo produced a sampleable post-burst gap -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_AcrossShallowBurstEndBoundary_HasNoVisibleJump()
        {
            // Regression test for the original reviewed bug: the lunge term
            // (active for t <= burst.End) must land on the same value the
            // retreat term (active for t > burst.End) starts from, or the
            // target fish visibly teleports for one frame right at the
            // boundary.
            const float maxAllowedJump = 0.005f;
            var foundABoundaryToSample = false;

            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Shallow)
                        {
                            continue;
                        }
                        var end = plan.EventEndSec(i);
                        if (end + Epsilon >= waitTotal)
                        {
                            continue;
                        }

                        foundABoundaryToSample = true;
                        var justBefore = plan.MotionOffset(end - Epsilon);
                        var atEnd = plan.MotionOffset(end);
                        var justAfter = plan.MotionOffset(end + Epsilon);

                        Assert.That(Mathf.Abs(atEnd - justBefore), Is.LessThan(maxAllowedJump),
                            $"waitTotal={waitTotal} seed={seed} event {i}: jump at t==End (lunge side) was {atEnd - justBefore}.");
                        Assert.That(Mathf.Abs(justAfter - atEnd), Is.LessThan(maxAllowedJump),
                            $"waitTotal={waitTotal} seed={seed} event {i}: jump just after t==End (retreat side) was {justAfter - atEnd}.");
                    }
                }
            }
            Assert.That(foundABoundaryToSample, Is.True, "No seed/wait combo produced a sampleable Shallow burst end -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_ContinuousAcrossDeepBoundaries()
        {
            const float maxAllowedJump = 0.005f;
            var foundABoundaryToSample = false;

            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Deep)
                        {
                            continue;
                        }

                        var start = plan.EventStartSec(i);
                        var end = plan.EventEndSec(i);

                        // Ramp-in boundary at the event's own Start: nothing
                        // (0) just before, SmoothStep(0)==0 just at/after.
                        if (start > Epsilon)
                        {
                            foundABoundaryToSample = true;
                            var justBeforeStart = plan.MotionOffset(start - Epsilon);
                            var atStart = plan.MotionOffset(start);
                            Assert.That(Mathf.Abs(atStart - justBeforeStart), Is.LessThan(maxAllowedJump),
                                $"waitTotal={waitTotal} seed={seed} event {i}: jump at Deep Start was {atStart - justBeforeStart}.");
                        }

                        // Hold -> release boundary at the event's End: the
                        // held plateau (DeepLungeProgressAmp) must match the
                        // release curve's own starting value.
                        if (end + Epsilon < waitTotal)
                        {
                            foundABoundaryToSample = true;
                            var justBeforeEnd = plan.MotionOffset(end - Epsilon);
                            var atEnd = plan.MotionOffset(end);
                            var justAfterEnd = plan.MotionOffset(end + Epsilon);
                            Assert.That(Mathf.Abs(atEnd - justBeforeEnd), Is.LessThan(maxAllowedJump),
                                $"waitTotal={waitTotal} seed={seed} event {i}: jump at t==End (hold side) was {atEnd - justBeforeEnd}.");
                            Assert.That(Mathf.Abs(justAfterEnd - atEnd), Is.LessThan(maxAllowedJump),
                                $"waitTotal={waitTotal} seed={seed} event {i}: jump just after t==End (release side) was {justAfterEnd - atEnd}.");
                        }
                    }
                }
            }
            Assert.That(foundABoundaryToSample, Is.True, "No seed/wait combo produced a sampleable Deep boundary -- test would be vacuous.");
        }

        [Test]
        public void MotionOffset_AtWaitTotal_IsExactlyZero()
        {
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    Assert.That(plan.MotionOffset(waitTotal), Is.EqualTo(0f).Within(1e-3f),
                        $"waitTotal={waitTotal} seed={seed}: MotionOffset must fade to exactly 0 by t=T for continuity with the Bite phase's SetTargetFishApproach(1f, ...) call.");
                }
            }
        }

        [Test]
        public void CurrentEventIndex_OutsideAnyEvent_ReturnsNegativeOne()
        {
            var plan = KawaGlintPreBitePlan.Create(new System.Random(7), WaitTotalSec);
            Assert.That(plan.CurrentEventIndex(0f), Is.EqualTo(-1), "t=0 (before the window opens) must not be inside any event.");
        }

        [Test]
        public void CurrentEventIndex_InsideAnEvent_ReturnsThatIndex()
        {
            var foundAnEventToSample = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        foundAnEventToSample = true;
                        var mid = (plan.EventStartSec(i) + plan.EventEndSec(i)) * 0.5f;
                        Assert.That(plan.CurrentEventIndex(mid), Is.EqualTo(i), $"waitTotal={waitTotal} seed={seed} event {i}: mid-event index mismatch.");
                    }
                }
            }
            Assert.That(foundAnEventToSample, Is.True, "No seed/wait combo produced any event -- test would be vacuous.");
        }

        [Test]
        public void IsDeepWindowOpen_TrueDuringWindowAndGrace_FalseOutside()
        {
            var foundADeepEvent = false;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Deep)
                        {
                            continue;
                        }
                        foundADeepEvent = true;
                        var start = plan.EventStartSec(i);
                        var end = plan.EventEndSec(i);

                        Assert.That(plan.IsDeepWindowOpen(start), Is.True, $"waitTotal={waitTotal} seed={seed} event {i}: should be open at Start.");
                        Assert.That(plan.IsDeepWindowOpen((start + end) * 0.5f), Is.True, $"waitTotal={waitTotal} seed={seed} event {i}: should be open mid-window.");
                        Assert.That(plan.IsDeepWindowOpen(end - Epsilon), Is.True, $"waitTotal={waitTotal} seed={seed} event {i}: should be open just before End.");
                        Assert.That(plan.IsDeepWindowOpen(end), Is.True, $"waitTotal={waitTotal} seed={seed} event {i}: should still be open exactly at End (grace begins).");

                        var graceMid = end + KawaGlintPreBitePlan.DeepTapGraceSec * 0.5f;
                        Assert.That(plan.IsDeepWindowOpen(graceMid), Is.True, $"waitTotal={waitTotal} seed={seed} event {i}: should be open mid-grace.");

                        if (start > Epsilon)
                        {
                            Assert.That(plan.IsDeepWindowOpen(start - Epsilon), Is.False, $"waitTotal={waitTotal} seed={seed} event {i}: should be closed just before Start.");
                        }

                        // Only sample "closed after grace" for the LAST Deep
                        // event in the plan -- an earlier one's grace tail
                        // could otherwise run into the next Deep event's own
                        // window (though DeepGapMinSec > DeepTapGraceSec
                        // makes that unlikely, this keeps the assertion
                        // unconditionally safe).
                        if (i == plan.EventCount - 1)
                        {
                            var afterGrace = end + KawaGlintPreBitePlan.DeepTapGraceSec + Epsilon;
                            Assert.That(plan.IsDeepWindowOpen(afterGrace), Is.False, $"waitTotal={waitTotal} seed={seed} event {i}: should be closed just after grace ends.");
                        }
                    }
                }
            }
            Assert.That(foundADeepEvent, Is.True, "No seed/wait combo produced a Deep event -- test would be vacuous.");
        }

        [Test]
        public void DeepWindowRemaining01_IsOneAtStart_ZeroAtEnd_MonotonicWithin()
        {
            var foundADeepEvent = false;
            const int samples = 20;
            foreach (var waitTotal in WaitTotalsForSweep)
            {
                for (var seed = 0; seed < SeedCount; seed++)
                {
                    var plan = KawaGlintPreBitePlan.Create(new System.Random(seed), waitTotal);
                    for (var i = 0; i < plan.EventCount; i++)
                    {
                        if (plan.EventKindAt(i) != KawaGlintPreBiteEventKind.Deep)
                        {
                            continue;
                        }
                        foundADeepEvent = true;
                        var start = plan.EventStartSec(i);
                        var end = plan.EventEndSec(i);

                        Assert.That(plan.DeepWindowRemaining01(start), Is.EqualTo(1f).Within(1e-3f),
                            $"waitTotal={waitTotal} seed={seed} event {i}: remaining01 should be 1 at Start.");
                        Assert.That(plan.DeepWindowRemaining01(end - Epsilon), Is.LessThan(0.01f),
                            $"waitTotal={waitTotal} seed={seed} event {i}: remaining01 should be ~0 just before End.");

                        var previous = float.PositiveInfinity;
                        for (var s = 0; s <= samples; s++)
                        {
                            var t = start + (end - start) * s / samples;
                            if (t >= end)
                            {
                                continue;
                            }
                            var remaining = plan.DeepWindowRemaining01(t);
                            Assert.That(remaining, Is.LessThanOrEqualTo(previous + 1e-6f),
                                $"waitTotal={waitTotal} seed={seed} event {i}: remaining01 not monotonic non-increasing at t={t}.");
                            previous = remaining;
                        }

                        Assert.That(plan.DeepWindowRemaining01(end), Is.Zero, $"waitTotal={waitTotal} seed={seed} event {i}: remaining01 must be 0 at/after End.");
                        if (start > Epsilon)
                        {
                            Assert.That(plan.DeepWindowRemaining01(start - Epsilon), Is.Zero, $"waitTotal={waitTotal} seed={seed} event {i}: remaining01 must be 0 before Start.");
                        }
                    }
                }
            }
            Assert.That(foundADeepEvent, Is.True, "No seed/wait combo produced a Deep event -- test would be vacuous.");
        }
    }
}
