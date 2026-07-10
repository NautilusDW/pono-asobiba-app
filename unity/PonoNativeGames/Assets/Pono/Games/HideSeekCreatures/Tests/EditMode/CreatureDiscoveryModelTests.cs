using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.HideSeek.Core;

namespace Pono.HideSeek.Tests.EditMode
{
    public sealed class CreatureDiscoveryModelTests
    {
        private static readonly RevealBrush FullRevealBrush = new RevealBrush(0, 255);

        [Test]
        public void Constructor_RequiresExactlyThreeUniqueCreatures()
        {
            var mask = new RevealMaskModel();
            var onlyTwo = new[]
            {
                CreateDefinition("a", 10),
                CreateDefinition("b", 20)
            };
            var duplicateIds = new[]
            {
                CreateDefinition("same", 10),
                CreateDefinition("same", 20),
                CreateDefinition("c", 30)
            };

            Assert.Throws<ArgumentException>(() => new CreatureDiscoveryModel(mask, onlyTwo));
            Assert.Throws<ArgumentException>(() => new CreatureDiscoveryModel(mask, duplicateIds));
        }

        [Test]
        public void RequiredCoverageWithoutEnoughAnchors_RemainsSearching()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());

            RevealCell(mask, 10, 10); // face
            RevealCell(mask, 13, 10); // required-only cell
            var beforeSecondAnchor = model.GetSnapshot("a");

            Assert.That(beforeSecondAnchor.RequiredCoverage, Is.EqualTo(0.5f));
            Assert.That(beforeSecondAnchor.SatisfiedAnchorRegions, Is.EqualTo(1));
            Assert.That(beforeSecondAnchor.Status, Is.EqualTo(CreatureDiscoveryStatus.Searching));

            RevealCell(mask, 11, 10); // body

            Assert.That(model.GetSnapshot("a").Status, Is.EqualTo(CreatureDiscoveryStatus.Holding));
        }

        [Test]
        public void HoldingTime_IsRequiredBeforeFound()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());
            var foundEvents = 0;
            model.CreatureFound += (_, __) => foundEvents++;
            RevealEligiblePair(mask, 10);

            model.Advance(0.3f);
            var holding = model.GetSnapshot("a");
            model.Advance(0.2f);
            var found = model.GetSnapshot("a");

            Assert.That(holding.Status, Is.EqualTo(CreatureDiscoveryStatus.Holding));
            Assert.That(holding.HoldProgress, Is.EqualTo(0.6f).Within(0.0001f));
            Assert.That(found.Status, Is.EqualTo(CreatureDiscoveryStatus.Found));
            Assert.That(foundEvents, Is.EqualTo(1));
        }

        [Test]
        public void CreaturesCanBeFoundInAnyOrder()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());

            RevealEligiblePair(mask, 30);
            model.Advance(0.5f);
            RevealEligiblePair(mask, 10);
            model.Advance(0.5f);
            RevealEligiblePair(mask, 20);
            model.Advance(0.5f);

            Assert.That(model.AllFound, Is.True);
            Assert.That(model.FoundCount, Is.EqualTo(3));
            Assert.That(model.FoundOrder, Is.EqualTo(new[] { "c", "a", "b" }));
        }

        [Test]
        public void FoundState_IsTerminal_AndEventsDoNotRepeat()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());
            var foundEvents = 0;
            model.CreatureFound += (_, __) => foundEvents++;
            RevealEligiblePair(mask, 10);
            model.Advance(0.5f);

            RevealCell(mask, 12, 10);
            RevealCell(mask, 13, 10);
            model.Advance(100f);

            Assert.That(model.GetSnapshot("a").Status, Is.EqualTo(CreatureDiscoveryStatus.Found));
            Assert.That(model.FoundCount, Is.EqualTo(1));
            Assert.That(foundEvents, Is.EqualTo(1));
        }

        [Test]
        public void AllFoundEvent_IsRaisedExactlyOnce()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());
            var allFoundEvents = 0;
            model.AllCreaturesFound += (_, __) => allFoundEvents++;

            RevealEligiblePair(mask, 10);
            RevealEligiblePair(mask, 20);
            RevealEligiblePair(mask, 30);
            model.Advance(0.5f);
            model.Advance(20f);

            Assert.That(model.AllFound, Is.True);
            Assert.That(allFoundEvents, Is.EqualTo(1));
        }

        [Test]
        public void ExistingMaskReveal_IsObservedWhenModelIsCreated()
        {
            var mask = new RevealMaskModel(128);
            RevealEligiblePair(mask, 20);

            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());

            Assert.That(model.GetSnapshot("b").Status, Is.EqualTo(CreatureDiscoveryStatus.Holding));
            model.Advance(0.5f);
            Assert.That(model.GetSnapshot("b").IsFound, Is.True);
        }

        [Test]
        public void HoldTimer_DoesNotAccumulateBeforeEligibility()
        {
            var mask = new RevealMaskModel(128);
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());

            model.Advance(10f);
            RevealEligiblePair(mask, 10);
            model.Advance(0.1f);

            var snapshot = model.GetSnapshot("a");
            Assert.That(snapshot.Status, Is.EqualTo(CreatureDiscoveryStatus.Holding));
            Assert.That(snapshot.HoldElapsedSeconds, Is.EqualTo(0.1f).Within(0.0001f));
        }

        [Test]
        public void ZeroHoldDuration_FindsOnAdvanceZero()
        {
            var mask = new RevealMaskModel(128);
            var rules = new CreatureDiscoveryRules(0.5f, 1f, 2, 0f);
            var definitions = new[]
            {
                CreateDefinition("a", 10, rules),
                CreateDefinition("b", 20, rules),
                CreateDefinition("c", 30, rules)
            };
            using var model = new CreatureDiscoveryModel(mask, definitions);
            RevealEligiblePair(mask, 10);

            model.Advance(0f);

            Assert.That(model.GetSnapshot("a").IsFound, Is.True);
        }

        [Test]
        public void Dispose_UnsubscribesFromRevealMask_AndAdvanceBecomesInvalid()
        {
            var mask = new RevealMaskModel(128);
            var model = new CreatureDiscoveryModel(mask, CreateDefinitions());
            model.Dispose();

            RevealEligiblePair(mask, 10);

            Assert.That(model.GetSnapshot("a").Status, Is.EqualTo(CreatureDiscoveryStatus.Searching));
            Assert.Throws<ObjectDisposedException>(() => model.Advance(0.5f));
        }

        [Test]
        public void Definition_RejectsInvalidRegionsAndRules()
        {
            var rules = TestRules();
            var validRequired = new[] { Cell(10, 10), Cell(11, 10), Cell(12, 10) };

            Assert.Throws<ArgumentException>(() => new CreatureDiscoveryDefinition(
                "a",
                validRequired,
                new[] { Cell(9, 10) },
                new[] { Cell(11, 10) },
                new[] { Cell(12, 10) },
                rules));

            Assert.Throws<ArgumentException>(() => new CreatureDiscoveryDefinition(
                "a",
                new[] { Cell(10, 10), Cell(10, 10) },
                new[] { Cell(10, 10) },
                new[] { Cell(10, 10) },
                new[] { Cell(10, 10) },
                rules));

            Assert.Throws<ArgumentException>(() => new CreatureDiscoveryDefinition(
                "a",
                validRequired,
                new[] { Cell(10, 10) },
                new[] { Cell(11, 10) },
                new[] { Cell(12, 10) },
                default));
        }

        [Test]
        public void Rules_RejectInvalidRatiosHoldAndAnchorCounts()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new CreatureDiscoveryRules(-0.1f, 0.5f, 2, 1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new CreatureDiscoveryRules(0.5f, 1.1f, 2, 1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new CreatureDiscoveryRules(0.5f, 0.5f, 0, 1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new CreatureDiscoveryRules(0.5f, 0.5f, 2, -1f));
        }

        [Test]
        public void Advance_RejectsNegativeAndNonFiniteTime()
        {
            var mask = new RevealMaskModel();
            using var model = new CreatureDiscoveryModel(mask, CreateDefinitions());

            Assert.Throws<ArgumentOutOfRangeException>(() => model.Advance(-0.1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => model.Advance(float.NaN));
            Assert.Throws<ArgumentOutOfRangeException>(() => model.Advance(float.PositiveInfinity));
        }

        private static CreatureDiscoveryDefinition[] CreateDefinitions()
        {
            return new[]
            {
                CreateDefinition("a", 10),
                CreateDefinition("b", 20),
                CreateDefinition("c", 30)
            };
        }

        private static CreatureDiscoveryDefinition CreateDefinition(
            string id,
            int startX,
            CreatureDiscoveryRules? rules = null)
        {
            return new CreatureDiscoveryDefinition(
                id,
                new[]
                {
                    Cell(startX, 10),
                    Cell(startX + 1, 10),
                    Cell(startX + 2, 10),
                    Cell(startX + 3, 10)
                },
                new[] { Cell(startX, 10) },
                new[] { Cell(startX + 1, 10) },
                new[] { Cell(startX + 2, 10) },
                rules ?? TestRules());
        }

        private static CreatureDiscoveryRules TestRules()
        {
            return new CreatureDiscoveryRules(
                requiredCoverageRatio: 0.5f,
                anchorCoverageRatio: 1f,
                minimumAnchorRegions: 2,
                holdSeconds: 0.5f);
        }

        private static void RevealEligiblePair(RevealMaskModel mask, int startX)
        {
            RevealCell(mask, startX, 10);
            RevealCell(mask, startX + 1, 10);
        }

        private static void RevealCell(RevealMaskModel mask, int x, int y)
        {
            mask.ApplyStamp(
                new NormalizedPoint(
                    x / (float)(RevealMaskModel.Width - 1),
                    y / (float)(RevealMaskModel.Height - 1)),
                FullRevealBrush);
        }

        private static int Cell(int x, int y)
        {
            return RevealMaskModel.GetCellIndex(x, y);
        }
    }
}
