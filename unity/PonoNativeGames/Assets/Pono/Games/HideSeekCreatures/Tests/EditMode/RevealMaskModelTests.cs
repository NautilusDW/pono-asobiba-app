using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.HideSeek.Core;

namespace Pono.HideSeek.Tests.EditMode
{
    public sealed class RevealMaskModelTests
    {
        [Test]
        public void Dimensions_AreFixedAt256By144()
        {
            var model = new RevealMaskModel();

            Assert.That(RevealMaskModel.Width, Is.EqualTo(256));
            Assert.That(RevealMaskModel.Height, Is.EqualTo(144));
            Assert.That(RevealMaskModel.CellCount, Is.EqualTo(256 * 144));
            Assert.That(model.Version, Is.Zero);
            Assert.That(model.IsDirty, Is.False);
            Assert.That(model.DirtyBounds.IsEmpty, Is.True);
        }

        [Test]
        public void ApplyStamp_OnlyIncreasesCells_AndVersionsOnlyRealChanges()
        {
            var model = new RevealMaskModel();
            var center = new NormalizedPoint(0.5f, 0.5f);

            var first = model.ApplyStamp(center, new RevealBrush(0, 200));
            var afterFirst = model.GetValue(128, 72);
            var weaker = model.ApplyStamp(center, new RevealBrush(0, 100));
            var stronger = model.ApplyStamp(center, new RevealBrush(0, 255));

            Assert.That(first.HasChanges, Is.True);
            Assert.That(first.Version, Is.EqualTo(1));
            Assert.That(afterFirst, Is.EqualTo(200));
            Assert.That(weaker.HasChanges, Is.False);
            Assert.That(weaker.Version, Is.EqualTo(1));
            Assert.That(stronger.HasChanges, Is.True);
            Assert.That(stronger.Version, Is.EqualTo(2));
            Assert.That(model.GetValue(128, 72), Is.EqualTo(255));
        }

        [Test]
        public void ApplyStroke_FastHorizontalMove_HasNoCellGaps()
        {
            var model = new RevealMaskModel(128);
            RevealThresholdCrossedEventArgs crossing = null;
            model.ThresholdCrossed += (_, eventArgs) => crossing = eventArgs;

            var change = model.ApplyStroke(
                new NormalizedPoint(0f, 0.5f),
                new NormalizedPoint(1f, 0.5f),
                new RevealBrush(0, 255));

            for (var x = 0; x < RevealMaskModel.Width; x++)
            {
                Assert.That(model.GetValue(x, 72), Is.EqualTo(255), $"Gap at x={x}");
            }

            Assert.That(change.ThresholdCrossedCellCount, Is.EqualTo(RevealMaskModel.Width));
            Assert.That(crossing, Is.Not.Null);
            Assert.That(crossing.CellIndices.Count, Is.EqualTo(RevealMaskModel.Width));
            Assert.That(crossing.Version, Is.EqualTo(change.Version));
        }

        [Test]
        public void ApplyStroke_UsesRadiusAwareSamplingWithoutGaps()
        {
            var model = new RevealMaskModel(128);

            model.ApplyStroke(
                new NormalizedPoint(0f, 0f),
                new NormalizedPoint(1f, 1f),
                new RevealBrush(8, 255));

            // Every point on the integer diagonal is covered even though the source
            // pointer supplied only two far-apart positions.
            for (var x = 0; x < RevealMaskModel.Width; x++)
            {
                var y = (int)Math.Round(
                    x * ((RevealMaskModel.Height - 1d) / (RevealMaskModel.Width - 1d)),
                    MidpointRounding.AwayFromZero);
                Assert.That(model.GetValue(x, y), Is.EqualTo(255), $"Gap near ({x},{y})");
            }
        }

        [Test]
        public void StampAtCorner_IsClippedToMask()
        {
            var model = new RevealMaskModel();

            var change = model.ApplyStamp(
                new NormalizedPoint(0f, 0f),
                new RevealBrush(2, 255));

            Assert.That(change.ChangedCellCount, Is.EqualTo(6));
            Assert.That(change.Bounds, Is.EqualTo(new GridBounds(0, 0, 2, 2)));
            Assert.That(model.GetValue(0, 0), Is.EqualTo(255));
            Assert.That(model.GetValue(2, 2), Is.Zero);
        }

        [Test]
        public void ThresholdEvent_FiresOnlyWhenCellsCrossForFirstTime()
        {
            var model = new RevealMaskModel(160);
            var events = new List<RevealThresholdCrossedEventArgs>();
            model.ThresholdCrossed += (_, eventArgs) => events.Add(eventArgs);
            var point = new NormalizedPoint(0.25f, 0.25f);

            var below = model.ApplyStamp(point, new RevealBrush(0, 159));
            var crossing = model.ApplyStamp(point, new RevealBrush(0, 160));
            var above = model.ApplyStamp(point, new RevealBrush(0, 255));

            Assert.That(below.ThresholdCrossedCellCount, Is.Zero);
            Assert.That(crossing.ThresholdCrossedCellCount, Is.EqualTo(1));
            Assert.That(above.ThresholdCrossedCellCount, Is.Zero);
            Assert.That(events, Has.Count.EqualTo(1));
            Assert.That(events[0].Threshold, Is.EqualTo(160));
        }

        [Test]
        public void DirtyBounds_AccumulateUntilMarkClean()
        {
            var model = new RevealMaskModel();
            model.ApplyStamp(new NormalizedPoint(0f, 0f), new RevealBrush(0, 255));
            model.ApplyStamp(new NormalizedPoint(1f, 1f), new RevealBrush(0, 255));
            var versionBeforeClean = model.Version;

            Assert.That(
                model.DirtyBounds,
                Is.EqualTo(new GridBounds(0, 0, RevealMaskModel.Width - 1, RevealMaskModel.Height - 1)));

            model.MarkClean();

            Assert.That(model.IsDirty, Is.False);
            Assert.That(model.DirtyBounds.IsEmpty, Is.True);
            Assert.That(model.Version, Is.EqualTo(versionBeforeClean));
            Assert.That(model.GetValue(0, 0), Is.EqualTo(255));
        }

        [Test]
        public void CopyValuesTo_CopiesStateWithoutExposingBackingArray()
        {
            var model = new RevealMaskModel();
            model.ApplyStamp(new NormalizedPoint(0f, 0f), new RevealBrush(0, 255));
            var copy = new byte[RevealMaskModel.CellCount];

            model.CopyValuesTo(copy);
            copy[0] = 0;

            Assert.That(model.GetValue(0), Is.EqualTo(255));
            Assert.Throws<ArgumentException>(() => model.CopyValuesTo(new byte[10]));
        }

        [Test]
        public void NormalizedPoint_ClampsFiniteCoordinates_AndRejectsNonFinite()
        {
            var point = new NormalizedPoint(-2f, 4f);

            Assert.That(point.X, Is.Zero);
            Assert.That(point.Y, Is.EqualTo(1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new NormalizedPoint(float.NaN, 0f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new NormalizedPoint(0f, float.PositiveInfinity));
        }

        [Test]
        public void InvalidThresholdBrushAndCoordinates_AreRejected()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new RevealMaskModel(0));
            Assert.Throws<ArgumentOutOfRangeException>(() => new RevealBrush(-1, 255));
            Assert.Throws<ArgumentOutOfRangeException>(() => new RevealBrush(0, 0));
            Assert.Throws<ArgumentOutOfRangeException>(() => RevealMaskModel.GetCellIndex(-1, 0));
            Assert.Throws<ArgumentOutOfRangeException>(() => RevealMaskModel.GetCellIndex(0, 144));
        }
    }
}
