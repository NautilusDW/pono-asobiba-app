using System.Collections;
using NUnit.Framework;
using Pono.ColorWaterDelivery.Bootstrap;
using Pono.ColorWaterDelivery.Core;
using Pono.ColorWaterDelivery.Gameplay;
using Pono.ColorWaterDelivery.Rendering;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.Tests.PlayMode
{
    public sealed class ColorWaterDeliveryRuntimeTests
    {
        [UnityTest]
        public IEnumerator BootstrapCreatesIndependentPlayableSurface()
        {
            var root = new GameObject(
                "Color Water Test Root",
                typeof(ColorWaterDeliveryBootstrap));
            yield return null;
            yield return null;

            var controller = root.GetComponent<ColorWaterDeliveryController>();
            Assert.That(controller, Is.Not.Null);
            Assert.That(controller.Model, Is.Not.Null);
            Assert.That(controller.Model.GateCount, Is.EqualTo(3));
            Assert.That(controller.Fluid, Is.Not.Null);
            Assert.That(controller.Fluid.BackendLabel, Is.Not.Empty);

            var texts = root.GetComponentsInChildren<Text>(true);
            Assert.That(texts, Has.Some.Matches<Text>(item =>
                item.text == "あお ＋ きいろ ＝ みどり"));
            Assert.That(texts, Has.Some.Matches<Text>(item =>
                item.text == "はっぱを さわって みずを まげよう"));

            Object.Destroy(root);
            yield return null;
        }

        [Test]
        public void CpuGoalMetricsUseNewlyAbsorbedFluidOnly()
        {
            using var fluid = new CpuColorWaterFluidBackend(64, 36);
            fluid.SetGoal(FluidGoalRegion.Circle(new Vector2(0.5f, 0.5f), 0.10f));
            for (var frame = 0; frame < 12; frame++)
            {
                fluid.InjectSource(
                    ColorWaterSource.Blue,
                    new Vector2(0.5f, 0.5f),
                    Vector2.zero,
                    0.065f,
                    0.8f);
                fluid.InjectSource(
                    ColorWaterSource.Yellow,
                    new Vector2(0.5f, 0.5f),
                    Vector2.zero,
                    0.065f,
                    0.8f);
                fluid.Tick(1f / 30f);
            }

            GoalFluidMetrics first = default;
            Assert.That(fluid.RequestGoalMetrics(value => first = value), Is.True);
            Assert.That(first.IsValid, Is.True);
            Assert.That(first.Blue, Is.GreaterThan(0f));
            Assert.That(first.Yellow, Is.GreaterThan(0f));
            Assert.That(first.Green, Is.GreaterThan(0f));

            GoalFluidMetrics second = default;
            Assert.That(fluid.RequestGoalMetrics(value => second = value), Is.True);
            Assert.That(second.IsValid, Is.False);
        }

        [Test]
        public void InitialGatesNeedOneTapForPrototypeSolution()
        {
            var model = new ColorWaterDeliveryModel(
                ColorWaterDeliveryRules.Prototype,
                new[]
                {
                    new LeafGateDefinition(
                        "blue_gate",
                        new[] { CardinalDirection.East, CardinalDirection.South },
                        CardinalDirection.East),
                    new LeafGateDefinition(
                        "yellow_gate",
                        new[] { CardinalDirection.East, CardinalDirection.North },
                        CardinalDirection.East),
                    new LeafGateDefinition(
                        "goal_gate",
                        new[] { CardinalDirection.South, CardinalDirection.East },
                        CardinalDirection.South)
                });

            Assert.That(model.TryAdvanceGate("blue_gate"), Is.EqualTo(GateInputResult.Applied));
            Assert.That(model.TryAdvanceGate("yellow_gate"), Is.EqualTo(GateInputResult.Applied));
            Assert.That(model.TryAdvanceGate("goal_gate"), Is.EqualTo(GateInputResult.Applied));
            Assert.That(model.GetGateSnapshot("blue_gate").Direction, Is.EqualTo(CardinalDirection.South));
            Assert.That(model.GetGateSnapshot("yellow_gate").Direction, Is.EqualTo(CardinalDirection.North));
            Assert.That(model.GetGateSnapshot("goal_gate").Direction, Is.EqualTo(CardinalDirection.East));
        }
    }
}
