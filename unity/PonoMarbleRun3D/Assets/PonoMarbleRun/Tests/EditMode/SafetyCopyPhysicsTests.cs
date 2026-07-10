using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using Pono.MarbleRun3D.UI;
using UnityEditor;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class SafetyCopyPhysicsTests
    {
        [Test]
        public void SafeAreaIsClampedInsideTransientDesktopWindowBounds()
        {
            var normalized = SafeAreaPanel.ClampToScreen(new Rect(-80f, -20f, 1440f, 780f), 1280, 720);
            Assert.That(normalized, Is.EqualTo(new Rect(0f, 0f, 1280f, 720f)));

            var notched = SafeAreaPanel.ClampToScreen(new Rect(42f, 0f, 1196f, 720f), 1280, 720);
            Assert.That(notched, Is.EqualTo(new Rect(42f, 0f, 1196f, 720f)));
        }

        [Test]
        public void StallRequiresSustainedLowMotionAndRaisesOnce()
        {
            var model = new MarbleSafetyModel { StallDelay = 1f };
            Assert.That(model.Tick(Vector3.zero, Vector3.one, Vector3.zero, 0.8f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 0.6f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 0.5f), Is.EqualTo(MarbleSafetyEvent.Stalled));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.one, Vector3.zero, 0.1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(Vector3.zero, Vector3.zero, Vector3.zero, 1.1f), Is.EqualTo(MarbleSafetyEvent.Stalled));
        }

        [Test]
        public void OutOfBoundsWinsImmediately()
        {
            var model = new MarbleSafetyModel();
            Assert.That(model.Tick(new Vector3(0f, -3f, 0f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
            Assert.That(model.Tick(new Vector3(80f, 1f, 0f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
            Assert.That(model.Tick(new Vector3(0f, 1f, 17f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
        }

        [Test]
        public void KanaValidatorAcceptsUiCopyAndRejectsKanjiLatinAndIterationMark()
        {
            var labels = new List<string>(MarbleRunCopy.All);
            foreach (var part in PartCatalog.All) labels.Add(part.DisplayName);
            labels.Add(ChallengeCatalog.Tutorial.DisplayName);
            labels.Add(ChallengeCatalog.Tutorial.GuideText);
            labels.Add(ChallengeCatalog.Starter.DisplayName);
            labels.Add(ChallengeCatalog.Starter.GuideText);
            labels.Add(ChallengeCatalog.Sandbox.DisplayName);
            labels.Add(ChallengeCatalog.Sandbox.GuideText);
            foreach (var challenge in ChallengeCatalog.Challenges)
            {
                labels.Add(challenge.DisplayName);
                labels.Add(challenge.GuideText);
            }
            foreach (var sample in ChallengeCatalog.Samples)
            {
                labels.Add(sample.DisplayName);
                labels.Add(sample.GuideText);
            }
            foreach (var label in labels)
            {
                Assert.That(ChildFacingTextValidator.IsKanaSafe(label, out var invalid), Is.True,
                    label + " invalid=" + invalid);
            }
            Assert.That(ChildFacingTextValidator.IsKanaSafe("保存", out _), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaSafe("SAVE", out _), Is.False);
            Assert.That(ChildFacingTextValidator.IsKanaSafe("いろ々", out _), Is.False);
        }

        [Test]
        public void EveryJapaneseRuntimeStringLiteralIsKanaSafe()
        {
            var stringLiteral = new Regex("\"((?:\\\\.|[^\"\\\\])*)\"");
            var hasJapanese = new Regex("[ぁ-んァ-ヶ一-龯]");
            var scripts = AssetDatabase.FindAssets("t:MonoScript", new[] { "Assets/PonoMarbleRun/Runtime" });
            foreach (var guid in scripts)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var source = File.ReadAllText(path);
                foreach (Match match in stringLiteral.Matches(source))
                {
                    var value = Regex.Unescape(match.Groups[1].Value);
                    if (!hasJapanese.IsMatch(value)) continue;
                    Assert.That(ChildFacingTextValidator.IsKanaSafe(value, out var invalid), Is.True,
                        path + " value=" + value + " invalid=" + invalid);
                }
            }
        }

        [Test]
        public void PhysicsProfileIsExplicitAndMobileReasonable()
        {
            Assert.That(MarbleRunPhysicsProfile.FixedTimestep, Is.EqualTo(1f / 60f).Within(0.000001f));
            Assert.That(MarbleRunPhysicsProfile.MaximumTimestep, Is.LessThanOrEqualTo(1f / 15f + 0.00001f));
            Assert.That(MarbleRunPhysicsProfile.SolverIterations, Is.GreaterThanOrEqualTo(8));
            Assert.That(MarbleRunPhysicsProfile.SolverVelocityIterations, Is.GreaterThanOrEqualTo(3));
            Assert.That(MarbleRunPhysicsProfile.MarbleMaximumSpeed, Is.InRange(10f, 18f));
            Assert.That(MarbleRunPhysicsProfile.MarbleLaunchSpeed, Is.InRange(0f, 1f),
                "the hopper ramp and gravity, not a horizontal launch, supply the energy");
            Assert.That(MarbleRunPhysicsProfile.MarbleLinearDamping, Is.InRange(0f, 0.01f));
            Assert.That(MarbleRunPhysicsProfile.MarbleAngularDamping, Is.InRange(0f, 0.02f));
            Assert.That(MarbleRunPhysicsProfile.MarbleBounciness, Is.LessThan(0.1f));
            Assert.That(MarbleRunPhysicsProfile.SlopeDegrees, Is.InRange(24f, 26f));
            Assert.That(
                Mathf.Tan(MarbleRunPhysicsProfile.SlopeDegrees * Mathf.Deg2Rad) * WoodenPieceFactory.CellSize,
                Is.EqualTo(WoodenPieceFactory.LevelHeight).Within(0.01f));
        }

        [Test]
        public void PassiveEnergyConstraintPreservesEntrySpeedAtTheSameHeight()
        {
            const float gravity = 9.81f;
            const float height = 2.25f;
            var entryVelocity = new Vector3(3f, 0f, 4f);

            Assert.That(PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                entryVelocity, height, gravity, out var specificEnergy), Is.True);

            var constrained = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                specificEnergy,
                height,
                Vector3.right,
                gravity);

            Assert.That(constrained.magnitude, Is.EqualTo(entryVelocity.magnitude).Within(0.0001f));
            Assert.That(constrained.x, Is.EqualTo(entryVelocity.magnitude).Within(0.0001f));
            Assert.That(constrained.y, Is.EqualTo(0f).Within(0.0001f));
            Assert.That(constrained.z, Is.EqualTo(0f).Within(0.0001f));
        }

        [Test]
        public void PassiveEnergyConstraintSlowsUphillAndAcceleratesDownhill()
        {
            const float gravity = 9.81f;
            const float entryHeight = 3f;
            const float entrySpeed = 8f;
            Assert.That(PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                Vector3.forward * entrySpeed, entryHeight, gravity, out var specificEnergy), Is.True);

            var uphillHeight = entryHeight + 1.5f;
            var downhillHeight = entryHeight - 1.5f;
            var uphill = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                specificEnergy, uphillHeight, Vector3.forward, gravity);
            var downhill = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                specificEnergy, downhillHeight, Vector3.forward, gravity);

            Assert.That(uphill.magnitude, Is.EqualTo(
                Mathf.Sqrt(entrySpeed * entrySpeed - 2f * gravity * 1.5f)).Within(0.0001f));
            Assert.That(uphill.magnitude, Is.LessThan(entrySpeed));
            Assert.That(downhill.magnitude, Is.EqualTo(
                Mathf.Sqrt(entrySpeed * entrySpeed + 2f * gravity * 1.5f)).Within(0.0001f));
            Assert.That(downhill.magnitude, Is.GreaterThan(entrySpeed));
        }

        [Test]
        public void PassiveEnergyConstraintNeverExceedsAvailableEnergyOrSpeedCap()
        {
            const float gravity = 9.81f;
            const float entryHeight = 4f;
            Assert.That(PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                Vector3.forward * 12f, entryHeight, gravity, out var specificEnergy), Is.True);

            var currentHeight = entryHeight - 8f;
            var constrained = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                specificEnergy,
                currentHeight,
                new Vector3(2f, -1f, 5f),
                gravity);
            var availableKineticEnergy = specificEnergy - gravity * currentHeight;

            Assert.That(constrained.magnitude,
                Is.LessThanOrEqualTo(MarbleRunPhysicsProfile.MarbleMaximumSpeed + 0.0001f));
            Assert.That(0.5f * constrained.sqrMagnitude,
                Is.LessThanOrEqualTo(availableKineticEnergy + 0.0001f));
        }

        [Test]
        public void PassiveEnergyConstraintHandlesInvalidOrInsufficientEnergySafely()
        {
            Assert.That(PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                new Vector3(float.NaN, 0f, 0f), 1f, 9.81f, out var invalidEnergy), Is.False);
            Assert.That(invalidEnergy, Is.EqualTo(0f));

            var invalidVelocity = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                float.NaN, 1f, Vector3.forward, 9.81f);
            Assert.That(invalidVelocity, Is.EqualTo(Vector3.zero));

            Assert.That(PassiveGuidePhysics.TryCalculateEnergyConservingVelocity(
                10f, 1f, Vector3.zero, 9.81f, 14f, out var rejectedVelocity), Is.False);
            Assert.That(rejectedVelocity, Is.EqualTo(Vector3.zero));

            var insufficientVelocity = PassiveGuidePhysics.CalculateEnergyConservingVelocity(
                1f, 2f, Vector3.forward, 9.81f);
            Assert.That(insufficientVelocity, Is.EqualTo(Vector3.zero));
        }

        [Test]
        public void PassiveGuidePerformsNoMechanicalWorkAndRespectsAccelerationCap()
        {
            var cases = new[]
            {
                new
                {
                    Velocity = new Vector3(1.7f, -0.4f, 4.2f),
                    Tangent = new Vector3(0.3f, -0.2f, 1f).normalized,
                    Error = new Vector3(-0.8f, 0.6f, 0.5f)
                },
                new
                {
                    Velocity = new Vector3(-2.4f, 0.8f, -3.1f),
                    Tangent = new Vector3(0.6f, 0.1f, 0.8f).normalized,
                    Error = new Vector3(1.2f, -0.2f, -0.7f)
                },
                new
                {
                    Velocity = new Vector3(3.5f, 0f, 0.2f),
                    Tangent = Vector3.forward,
                    Error = new Vector3(-1.4f, 0.5f, 3f)
                }
            };

            foreach (var sample in cases)
            {
                var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                    sample.Velocity,
                    sample.Tangent,
                    sample.Error,
                    7f,
                    11f,
                    20f);
                Assert.That(Vector3.Dot(acceleration, sample.Velocity), Is.EqualTo(0f).Within(0.00001f),
                    "an ideal passive constraint changes direction without adding or draining kinetic energy");
                Assert.That(acceleration.magnitude, Is.LessThanOrEqualTo(20.0001f));
            }
        }

        [Test]
        public void PassiveGuideCanCenterAStoppedMarbleWithoutPushingItForward()
        {
            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                Vector3.zero,
                Vector3.forward,
                new Vector3(1f, 0.4f, 5f),
                6f,
                10f,
                18f);

            Assert.That(Vector3.Dot(acceleration, Vector3.forward), Is.EqualTo(0f).Within(0.00001f));
            Assert.That(acceleration.x, Is.GreaterThan(0f));
            Assert.That(acceleration.y, Is.GreaterThan(0f));
        }

        [Test]
        public void PassiveGuideRejectsInvalidInputsSafely()
        {
            Assert.That(PassiveGuidePhysics.CalculateConstraintAcceleration(
                    Vector3.one,
                    Vector3.zero,
                    Vector3.one,
                    5f,
                    5f,
                    10f),
                Is.EqualTo(Vector3.zero));
            Assert.That(PassiveGuidePhysics.CalculateConstraintAcceleration(
                    new Vector3(float.NaN, 0f, 0f),
                    Vector3.forward,
                    Vector3.zero,
                    5f,
                    5f,
                    10f),
                Is.EqualTo(Vector3.zero));
        }
    }
}
