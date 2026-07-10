using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.ColorWaterDelivery.Core;

namespace Pono.ColorWaterDelivery.Tests.EditMode
{
    public sealed class ColorWaterDeliveryModelTests
    {
        [Test]
        public void Constructor_AcceptsTwoOrThreeUniqueGatesOnly()
        {
            Assert.DoesNotThrow(() => new ColorWaterDeliveryModel(TestRules(), CreateGates(2)));
            Assert.DoesNotThrow(() => new ColorWaterDeliveryModel(TestRules(), CreateGates(3)));
            Assert.Throws<ArgumentException>(() =>
                new ColorWaterDeliveryModel(TestRules(), CreateGates(1)));
            Assert.Throws<ArgumentException>(() =>
                new ColorWaterDeliveryModel(TestRules(), CreateGates(4)));

            var duplicateGates = new[]
            {
                TwoWayGate("same"),
                TwoWayGate("same")
            };
            Assert.Throws<ArgumentException>(() =>
                new ColorWaterDeliveryModel(TestRules(), duplicateGates));
            Assert.Throws<ArgumentException>(() =>
                new ColorWaterDeliveryModel(default, CreateGates(2)));
        }

        [Test]
        public void InitialSnapshot_IsRunningAndContainsGateState()
        {
            var model = CreateModel();

            var snapshot = model.GetSnapshot();

            Assert.That(snapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Running));
            Assert.That(snapshot.Progress, Is.Zero);
            Assert.That(snapshot.DeliveredGreenAmount, Is.Zero);
            Assert.That(snapshot.AcceptedDeliveryCount, Is.Zero);
            Assert.That(snapshot.WrongColorDeliveryCount, Is.Zero);
            Assert.That(snapshot.DeliveryAttemptCount, Is.Zero);
            Assert.That(snapshot.LastReaction, Is.EqualTo(DeliveryReaction.None));
            Assert.That(snapshot.Gates.Count, Is.EqualTo(3));
            Assert.That(snapshot.Gates[0].Direction, Is.EqualTo(CardinalDirection.North));
        }

        [Test]
        public void BalancedBlueAndYellow_AccumulatesGreenProgress()
        {
            var model = CreateModel();

            var result = model.ProcessDelivery(new WaterMixture(2f, 2f));

            Assert.That(result.Reaction, Is.EqualTo(DeliveryReaction.GreenAccepted));
            Assert.That(result.IsAccepted, Is.True);
            Assert.That(result.AcceptedGreenAmount, Is.EqualTo(4f));
            Assert.That(result.Snapshot.DeliveredGreenAmount, Is.EqualTo(4f));
            Assert.That(result.Snapshot.Progress, Is.EqualTo(0.4f).Within(0.0001f));
            Assert.That(result.Snapshot.AcceptedDeliveryCount, Is.EqualTo(1));
            Assert.That(result.Snapshot.DeliveryAttemptCount, Is.EqualTo(1));
            Assert.That(result.Snapshot.IsComplete, Is.False);
        }

        [Test]
        public void GreenToleranceBoundary_IsAccepted()
        {
            var model = CreateModel();

            var result = model.ProcessDelivery(new WaterMixture(6f, 4f));

            Assert.That(result.Reaction, Is.EqualTo(DeliveryReaction.GreenAccepted));
            Assert.That(result.Snapshot.IsComplete, Is.True);
        }

        [Test]
        public void BlueDominantDelivery_RequestsYellowWithoutFailure()
        {
            var model = CreateModel();

            var result = model.ProcessDelivery(new WaterMixture(4f, 1f));

            Assert.That(result.Reaction, Is.EqualTo(DeliveryReaction.NeedsMoreYellow));
            Assert.That(result.IsWrongColor, Is.True);
            Assert.That(result.AcceptedGreenAmount, Is.Zero);
            Assert.That(result.Snapshot.DeliveredGreenAmount, Is.Zero);
            Assert.That(result.Snapshot.WrongColorDeliveryCount, Is.EqualTo(1));
            Assert.That(result.Snapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Running));
        }

        [Test]
        public void YellowDominantDelivery_RequestsBlueAndPlayContinues()
        {
            var model = CreateModel();

            var wrong = model.ProcessDelivery(new WaterMixture(1f, 4f));
            var corrected = model.ProcessDelivery(new WaterMixture(2.5f, 2.5f));

            Assert.That(wrong.Reaction, Is.EqualTo(DeliveryReaction.NeedsMoreBlue));
            Assert.That(corrected.Reaction, Is.EqualTo(DeliveryReaction.GreenAccepted));
            Assert.That(corrected.Snapshot.DeliveredGreenAmount, Is.EqualTo(5f));
            Assert.That(corrected.Snapshot.WrongColorDeliveryCount, Is.EqualTo(1));
            Assert.That(corrected.Snapshot.DeliveryAttemptCount, Is.EqualTo(2));
        }

        [Test]
        public void EmptyAndTooLittleDeliveries_DoNotCountAsWrongColours()
        {
            var model = CreateModel();

            var empty = model.ProcessDelivery(new WaterMixture(0f, 0f));
            var tiny = model.ProcessDelivery(new WaterMixture(0.1f, 0.1f));

            Assert.That(empty.Reaction, Is.EqualTo(DeliveryReaction.Empty));
            Assert.That(tiny.Reaction, Is.EqualTo(DeliveryReaction.TooLittle));
            Assert.That(tiny.Snapshot.DeliveredGreenAmount, Is.Zero);
            Assert.That(tiny.Snapshot.WrongColorDeliveryCount, Is.Zero);
            Assert.That(tiny.Snapshot.DeliveryAttemptCount, Is.EqualTo(2));
        }

        [Test]
        public void MultipleGreenBatches_CompleteCumulativelyAndClampOverDelivery()
        {
            var model = CreateModel();

            model.ProcessDelivery(new WaterMixture(2f, 2f));
            model.ProcessDelivery(new WaterMixture(1.5f, 1.5f));
            var final = model.ProcessDelivery(new WaterMixture(3f, 3f));

            Assert.That(final.CompletedStage, Is.True);
            Assert.That(final.AcceptedGreenAmount, Is.EqualTo(3f));
            Assert.That(final.Snapshot.DeliveredGreenAmount, Is.EqualTo(10f));
            Assert.That(final.Snapshot.Progress, Is.EqualTo(1f));
            Assert.That(final.Snapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Complete));
        }

        [Test]
        public void CompletionEvent_RaisesOnceAfterProcessedEventWithCompleteSnapshot()
        {
            var model = CreateModel();
            var eventOrder = new List<string>();
            DeliveryResult processedResult = default;
            DeliverySnapshot completedSnapshot = default;
            model.DeliveryProcessed += (_, args) =>
            {
                eventOrder.Add("processed");
                processedResult = args.Result;
            };
            model.DeliveryCompleted += (_, args) =>
            {
                eventOrder.Add("completed");
                completedSnapshot = args.Snapshot;
            };

            model.ProcessDelivery(new WaterMixture(5f, 5f));
            model.ProcessDelivery(new WaterMixture(5f, 5f));

            Assert.That(eventOrder, Is.EqualTo(new[]
            {
                "processed",
                "completed",
                "processed"
            }));
            Assert.That(processedResult.Reaction, Is.EqualTo(DeliveryReaction.IgnoredComplete));
            Assert.That(completedSnapshot.IsComplete, Is.True);
            Assert.That(completedSnapshot.DeliveredGreenAmount, Is.EqualTo(10f));
        }

        [Test]
        public void CompletedStage_IsTerminalUntilReset()
        {
            var model = CreateModel();
            model.ProcessDelivery(new WaterMixture(5f, 5f));
            var before = model.GetSnapshot();

            var ignored = model.ProcessDelivery(new WaterMixture(5f, 5f));

            Assert.That(ignored.Reaction, Is.EqualTo(DeliveryReaction.IgnoredComplete));
            Assert.That(ignored.AcceptedGreenAmount, Is.Zero);
            Assert.That(ignored.Snapshot.Revision, Is.EqualTo(before.Revision));
            Assert.That(ignored.Snapshot.DeliveryAttemptCount, Is.EqualTo(1));
            Assert.That(model.TryAdvanceGate("split"), Is.EqualTo(GateInputResult.RejectedComplete));
            Assert.That(model.SetPaused(true), Is.EqualTo(PauseInputResult.RejectedComplete));
        }

        [Test]
        public void Pause_BlocksDeliveryAndGateInputUntilResumed()
        {
            var model = CreateModel();

            Assert.That(model.SetPaused(true), Is.EqualTo(PauseInputResult.Applied));
            var pausedRevision = model.GetSnapshot().Revision;
            var ignored = model.ProcessDelivery(new WaterMixture(2f, 2f));

            Assert.That(ignored.Reaction, Is.EqualTo(DeliveryReaction.IgnoredPaused));
            Assert.That(ignored.Snapshot.IsPaused, Is.True);
            Assert.That(ignored.Snapshot.DeliveredGreenAmount, Is.Zero);
            Assert.That(ignored.Snapshot.Revision, Is.EqualTo(pausedRevision));
            Assert.That(model.TryAdvanceGate("split"), Is.EqualTo(GateInputResult.RejectedPaused));
            Assert.That(model.SetPaused(true), Is.EqualTo(PauseInputResult.NoChange));
            Assert.That(model.SetPaused(false), Is.EqualTo(PauseInputResult.Applied));
            Assert.That(model.ProcessDelivery(new WaterMixture(2f, 2f)).IsAccepted, Is.True);
        }

        [Test]
        public void PauseChangedEvent_CarriesCoherentSnapshot()
        {
            var model = CreateModel();
            PauseChangedEventArgs eventArgs = null;
            model.PauseChanged += (_, args) => eventArgs = args;

            model.SetPaused(true);

            Assert.That(eventArgs, Is.Not.Null);
            Assert.That(eventArgs.IsPaused, Is.True);
            Assert.That(eventArgs.Snapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Paused));
            Assert.That(eventArgs.Snapshot.Revision, Is.EqualTo(1));
        }

        [Test]
        public void FourWayGate_CyclesInDeclaredOrderAndWraps()
        {
            var model = CreateModel();

            Assert.That(model.TryAdvanceGate("split"), Is.EqualTo(GateInputResult.Applied));
            Assert.That(model.GetGateSnapshot("split").Direction, Is.EqualTo(CardinalDirection.East));
            model.TryAdvanceGate("split");
            model.TryAdvanceGate("split");
            model.TryAdvanceGate("split");

            var wrapped = model.GetGateSnapshot("split");
            Assert.That(wrapped.Mode, Is.EqualTo(LeafGateMode.FourWay));
            Assert.That(wrapped.Direction, Is.EqualTo(CardinalDirection.North));
            Assert.That(wrapped.DirectionIndex, Is.Zero);
        }

        [Test]
        public void TwoWayGate_OnlyAcceptsItsDeclaredDirections()
        {
            var model = CreateModel();

            Assert.That(
                model.TrySetGateDirection("left", CardinalDirection.South),
                Is.EqualTo(GateInputResult.InvalidDirection));
            Assert.That(
                model.TrySetGateDirection("left", CardinalDirection.East),
                Is.EqualTo(GateInputResult.NoChange));
            Assert.That(
                model.TrySetGateDirection("left", CardinalDirection.West),
                Is.EqualTo(GateInputResult.Applied));
            Assert.That(
                model.GetGateSnapshot("left").Direction,
                Is.EqualTo(CardinalDirection.West));
        }

        [Test]
        public void UnknownGateInput_IsRejectedWithoutMutation()
        {
            var model = CreateModel();
            var revision = model.GetSnapshot().Revision;

            Assert.That(model.TryAdvanceGate("missing"), Is.EqualTo(GateInputResult.UnknownGate));
            Assert.That(model.TryAdvanceGate(null), Is.EqualTo(GateInputResult.UnknownGate));
            Assert.That(model.TryGetGateSnapshot("missing", out _), Is.False);
            Assert.Throws<KeyNotFoundException>(() => model.GetGateSnapshot("missing"));
            Assert.That(model.GetSnapshot().Revision, Is.EqualTo(revision));
        }

        [Test]
        public void GateChangedEvent_ReportsPreviousCurrentAndWholeSnapshot()
        {
            var model = CreateModel();
            LeafGateChangedEventArgs eventArgs = null;
            model.GateChanged += (_, args) => eventArgs = args;

            model.TryAdvanceGate("split");

            Assert.That(eventArgs, Is.Not.Null);
            Assert.That(eventArgs.Previous.Direction, Is.EqualTo(CardinalDirection.North));
            Assert.That(eventArgs.Current.Direction, Is.EqualTo(CardinalDirection.East));
            Assert.That(eventArgs.Snapshot.Gates[0].Direction, Is.EqualTo(CardinalDirection.East));
            Assert.That(eventArgs.Snapshot.Revision, Is.EqualTo(1));
        }

        [Test]
        public void Reset_RestoresProgressPauseCountersAndInitialGates()
        {
            var model = CreateModel();
            model.TryAdvanceGate("split");
            model.ProcessDelivery(new WaterMixture(4f, 1f));
            model.ProcessDelivery(new WaterMixture(2f, 2f));
            model.SetPaused(true);
            DeliverySnapshot resetSnapshot = default;
            var resetEvents = 0;
            model.ResetPerformed += (_, args) =>
            {
                resetEvents++;
                resetSnapshot = args.Snapshot;
            };

            model.Reset();

            Assert.That(resetEvents, Is.EqualTo(1));
            Assert.That(resetSnapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Running));
            Assert.That(resetSnapshot.DeliveredGreenAmount, Is.Zero);
            Assert.That(resetSnapshot.DeliveryAttemptCount, Is.Zero);
            Assert.That(resetSnapshot.AcceptedDeliveryCount, Is.Zero);
            Assert.That(resetSnapshot.WrongColorDeliveryCount, Is.Zero);
            Assert.That(resetSnapshot.LastReaction, Is.EqualTo(DeliveryReaction.None));
            Assert.That(resetSnapshot.Gates[0].Direction, Is.EqualTo(CardinalDirection.North));
        }

        [Test]
        public void Reset_ReopensACompletedStage()
        {
            var model = CreateModel();
            model.ProcessDelivery(new WaterMixture(5f, 5f));

            model.Reset();
            var afterReset = model.ProcessDelivery(new WaterMixture(1f, 1f));

            Assert.That(afterReset.IsAccepted, Is.True);
            Assert.That(afterReset.Snapshot.Status, Is.EqualTo(ColorWaterDeliveryStatus.Running));
            Assert.That(afterReset.Snapshot.DeliveredGreenAmount, Is.EqualTo(2f));
        }

        private static ColorWaterDeliveryModel CreateModel()
        {
            return new ColorWaterDeliveryModel(TestRules(), CreateGates(3));
        }

        private static ColorWaterDeliveryRules TestRules()
        {
            return new ColorWaterDeliveryRules(
                requiredGreenAmount: 10f,
                maximumImbalanceRatio: 0.2f,
                minimumBatchAmount: 0.5f);
        }

        private static LeafGateDefinition[] CreateGates(int count)
        {
            var gates = new List<LeafGateDefinition>
            {
                new LeafGateDefinition(
                    "split",
                    new[]
                    {
                        CardinalDirection.North,
                        CardinalDirection.East,
                        CardinalDirection.South,
                        CardinalDirection.West
                    },
                    CardinalDirection.North),
                TwoWayGate("left")
            };

            if (count >= 3)
            {
                gates.Add(new LeafGateDefinition(
                    "right",
                    new[] { CardinalDirection.North, CardinalDirection.South },
                    CardinalDirection.South));
            }

            while (gates.Count < count)
            {
                gates.Add(TwoWayGate("extra-" + gates.Count));
            }

            if (count < gates.Count)
            {
                gates.RemoveRange(count, gates.Count - count);
            }

            return gates.ToArray();
        }

        private static LeafGateDefinition TwoWayGate(string id)
        {
            return new LeafGateDefinition(
                id,
                new[] { CardinalDirection.East, CardinalDirection.West },
                CardinalDirection.East);
        }
    }
}
