using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.ColorWaterDelivery.Core;

namespace Pono.ColorWaterDelivery.Tests.EditMode
{
    public sealed class ColorWaterDeliveryValueTests
    {
        [Test]
        public void WaterMixture_ReportsFractionsAndImbalance()
        {
            var mixture = new WaterMixture(3f, 2f);

            Assert.That(mixture.TotalAmount, Is.EqualTo(5f));
            Assert.That(mixture.BlueFraction, Is.EqualTo(0.6f).Within(0.0001f));
            Assert.That(mixture.YellowFraction, Is.EqualTo(0.4f).Within(0.0001f));
            Assert.That(mixture.ImbalanceRatio, Is.EqualTo(0.2f).Within(0.0001f));
        }

        [Test]
        public void EmptyWaterMixture_HasSafeZeroRatios()
        {
            var mixture = new WaterMixture(0f, 0f);

            Assert.That(mixture.IsEmpty, Is.True);
            Assert.That(mixture.BlueFraction, Is.Zero);
            Assert.That(mixture.YellowFraction, Is.Zero);
            Assert.That(mixture.ImbalanceRatio, Is.Zero);
        }

        [Test]
        public void WaterMixture_RejectsNegativeAndNonFiniteAmounts()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new WaterMixture(-0.01f, 1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new WaterMixture(1f, -0.01f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new WaterMixture(float.NaN, 1f));
            Assert.Throws<ArgumentOutOfRangeException>(() => new WaterMixture(1f, float.PositiveInfinity));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new WaterMixture(float.MaxValue, float.MaxValue));
        }

        [Test]
        public void Rules_RejectInvalidTargetsToleranceAndMinimumBatch()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(0f, 0.2f, 0f));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(10f, -0.01f, 0f));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(10f, 1f, 0f));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(10f, 0.2f, -0.01f));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(10f, 0.2f, 10.1f));
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new ColorWaterDeliveryRules(float.NaN, 0.2f, 0f));
        }

        [Test]
        public void LeafGateDefinition_RequiresExactlyTwoOrFourUniqueDirections()
        {
            Assert.Throws<ArgumentException>(() => new LeafGateDefinition(
                "gate",
                new[] { CardinalDirection.North },
                CardinalDirection.North));
            Assert.Throws<ArgumentException>(() => new LeafGateDefinition(
                "gate",
                new[]
                {
                    CardinalDirection.North,
                    CardinalDirection.East,
                    CardinalDirection.South
                },
                CardinalDirection.North));
            Assert.Throws<ArgumentException>(() => new LeafGateDefinition(
                "gate",
                new[] { CardinalDirection.North, CardinalDirection.North },
                CardinalDirection.North));
        }

        [Test]
        public void LeafGateDefinition_RequiresValidIdAndInitialDirection()
        {
            Assert.Throws<ArgumentException>(() => new LeafGateDefinition(
                " ",
                new[] { CardinalDirection.North, CardinalDirection.South },
                CardinalDirection.North));
            Assert.Throws<ArgumentException>(() => new LeafGateDefinition(
                "gate",
                new[] { CardinalDirection.North, CardinalDirection.South },
                CardinalDirection.East));
            Assert.Throws<ArgumentOutOfRangeException>(() => new LeafGateDefinition(
                "gate",
                new[] { CardinalDirection.North, (CardinalDirection)99 },
                CardinalDirection.North));
        }

        [Test]
        public void LeafGateDefinition_CopiesDirectionInput()
        {
            var source = new List<CardinalDirection>
            {
                CardinalDirection.East,
                CardinalDirection.West
            };
            var definition = new LeafGateDefinition(
                "gate",
                source,
                CardinalDirection.East);

            source[0] = CardinalDirection.North;
            source.Add(CardinalDirection.South);

            Assert.That(definition.Mode, Is.EqualTo(LeafGateMode.TwoWay));
            Assert.That(definition.Directions, Is.EqualTo(new[]
            {
                CardinalDirection.East,
                CardinalDirection.West
            }));
        }
    }
}
