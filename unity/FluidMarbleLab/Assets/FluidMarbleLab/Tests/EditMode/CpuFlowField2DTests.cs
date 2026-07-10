using NUnit.Framework;
using UnityEngine;

namespace Pono.FluidMarbleLab.Tests
{
    public sealed class CpuFlowField2DTests
    {
        [Test]
        public void InjectPushesInRequestedDirection()
        {
            using var field = new CpuFlowField2D(32, 18);
            field.Inject(new Vector2(0.5f, 0.5f), new Vector2(1.2f, 0.35f), Color.cyan, 0.12f);

            var velocity = field.SampleVelocity(new Vector2(0.5f, 0.5f));

            Assert.That(velocity.x, Is.GreaterThan(0.5f));
            Assert.That(velocity.y, Is.GreaterThan(0.1f));
            Assert.That(field.HasFiniteValues(), Is.True);
        }

        [Test]
        public void SimulationDecaysAndRemainsFinite()
        {
            using var field = new CpuFlowField2D(48, 27);
            field.Inject(new Vector2(0.3f, 0.7f), new Vector2(2.4f, -1.1f), Color.magenta, 0.2f);
            var initialSpeed = field.AverageSpeed();

            for (var i = 0; i < 600; i++)
            {
                field.Step(1f / 60f);
            }

            Assert.That(field.HasFiniteValues(), Is.True);
            Assert.That(field.AverageSpeed(), Is.LessThan(initialSpeed));
        }

        [Test]
        public void ClearRemovesAllFlow()
        {
            using var field = new CpuFlowField2D(24, 16);
            field.Inject(new Vector2(0.5f, 0.5f), Vector2.one, Color.yellow, 0.15f);

            field.Clear();

            Assert.That(field.AverageSpeed(), Is.EqualTo(0f).Within(0.000001f));
            Assert.That(field.SampleVelocity(new Vector2(0.5f, 0.5f)), Is.EqualTo(Vector2.zero));
        }
    }
}
