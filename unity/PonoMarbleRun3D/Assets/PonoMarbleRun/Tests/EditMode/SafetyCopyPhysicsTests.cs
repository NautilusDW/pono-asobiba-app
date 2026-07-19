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
            var runningPosition = new Vector3(0f, 1.47f, 0f);
            Assert.That(model.Tick(runningPosition, Vector3.one, Vector3.zero, 0.8f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(runningPosition, Vector3.zero, Vector3.zero, 0.6f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(runningPosition, Vector3.zero, Vector3.zero, 0.5f), Is.EqualTo(MarbleSafetyEvent.Stalled));
            Assert.That(model.Tick(runningPosition, Vector3.zero, Vector3.zero, 1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(runningPosition, Vector3.one, Vector3.zero, 0.1f), Is.EqualTo(MarbleSafetyEvent.None));
            Assert.That(model.Tick(runningPosition, Vector3.zero, Vector3.zero, 1.1f), Is.EqualTo(MarbleSafetyEvent.Stalled));
        }

        [Test]
        public void OutOfBoundsWinsImmediately()
        {
            var model = new MarbleSafetyModel();
            Assert.That(model.Tick(new Vector3(0f, -3f, 0f), Vector3.zero, Vector3.zero, 0.01f),
                Is.EqualTo(MarbleSafetyEvent.OutOfBounds));
            Assert.That(model.Tick(new Vector3(0f, 1.24f, 0f), Vector3.zero, Vector3.zero, 0.01f),
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
        public void HelixGuideUsesFiniteConnectorsInBothTravelDirections()
        {
            const float radius = 0.82f;
            const float turns = 1.5f;
            var height = WoodenPieceFactory.LevelHeight * 2f;
            var marbleHeight = WoodenPieceFactory.MarbleRadius + 0.18f;
            var root = new GameObject("helix-test-root");
            var guideObject = new GameObject("helix-test-guide");
            guideObject.transform.SetParent(root.transform, false);
            var guide = guideObject.AddComponent<HelixMarbleGuide>();
            guide.Configure(root.transform, radius, height, turns);
            var marble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            marble.AddComponent<MarbleActor>().Configure(0);
            var body = marble.AddComponent<Rigidbody>();
            body.useGravity = false;
            body.linearDamping = 0f;
            var collider = marble.GetComponent<SphereCollider>();

            try
            {
                // Reverse traversal: low connector (-Z) -> upward spiral -> high
                // connector (-Z). Nine metres per second contains enough real kinetic
                // energy to climb this 2.8 m passive helix.
                body.position = new Vector3(0f, marbleHeight, radius + 0.40f);
                body.linearVelocity = Vector3.back * 9f;
                InvokeHelixTrigger(guide, "OnTriggerEnter", collider);
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.z, Is.LessThan(-8.9f));

                body.position = new Vector3(0f, marbleHeight, radius - 0.02f);
                Physics.SyncTransforms();
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.y, Is.GreaterThan(0.5f),
                    "the low reverse connector must hand off to an upward spiral tangent");

                const float reverseTopProgress = 0.01f;
                body.position = HelixPointForTest(reverseTopProgress, radius, height, turns)
                    + Vector3.up * marbleHeight;
                Physics.SyncTransforms();
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.x, Is.EqualTo(0f).Within(0.001f));
                Assert.That(body.linearVelocity.y, Is.EqualTo(0f).Within(0.001f));
                Assert.That(body.linearVelocity.z, Is.LessThan(-0.1f),
                    "the top reverse turn must leave through the finite -Z connector");
                InvokeHelixTrigger(guide, "OnTriggerExit", collider);

                // Normal traversal must retain its high connector, descending spiral,
                // and low +Z connector behaviour.
                body.position = new Vector3(0f, height + marbleHeight, -radius - 0.40f);
                body.linearVelocity = Vector3.forward * 9f;
                InvokeHelixTrigger(guide, "OnTriggerEnter", collider);
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.z, Is.GreaterThan(8.9f));

                const float middleProgress = 0.50f;
                body.position = HelixPointForTest(middleProgress, radius, height, turns)
                    + Vector3.up * marbleHeight;
                Physics.SyncTransforms();
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.y, Is.LessThan(-0.1f));

                const float forwardExitProgress = 0.99f;
                body.position = HelixPointForTest(forwardExitProgress, radius, height, turns)
                    + Vector3.up * marbleHeight;
                Physics.SyncTransforms();
                InvokeHelixTrigger(guide, "OnTriggerStay", collider);
                Assert.That(body.linearVelocity.x, Is.EqualTo(0f).Within(0.001f));
                Assert.That(body.linearVelocity.y, Is.EqualTo(0f).Within(0.001f));
                Assert.That(body.linearVelocity.z, Is.GreaterThan(0.1f));
            }
            finally
            {
                Object.DestroyImmediate(marble);
                Object.DestroyImmediate(root);
            }
        }

        [Test]
        public void ZeroWorkConstraintUsesTheEnergyCorrectedVelocity()
        {
            const float gravity = 9.81f;
            var entryVelocity = new Vector3(1.5f, -0.2f, 5.2f);
            Assert.That(PassiveGuidePhysics.TryCalculateSpecificMechanicalEnergy(
                entryVelocity, 3.2f, gravity, out var energy), Is.True);

            var tangent = new Vector3(0.72f, -0.28f, 0.64f).normalized;
            Assert.That(PassiveGuidePhysics.TryCalculateEnergyConservingVelocity(
                energy, 2.4f, tangent, gravity, MarbleRunPhysicsProfile.MarbleMaximumSpeed,
                out var correctedVelocity), Is.True);
            Assert.That(correctedVelocity, Is.Not.EqualTo(entryVelocity));

            var acceleration = PassiveGuidePhysics.CalculateConstraintAcceleration(
                correctedVelocity,
                tangent,
                new Vector3(-0.9f, 0.7f, 0.35f),
                8f,
                14f,
                80f,
                new Vector3(-32f, 0f, 8f));

            Assert.That(Vector3.Dot(acceleration, correctedVelocity),
                Is.EqualTo(0f).Within(0.00002f),
                "the accumulated guide force must be zero-work for the latest corrected velocity");
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
        public void CentripetalConstraintIsInwardFiniteAndCappedWithoutDoingWork()
        {
            var velocity = Vector3.forward * 12f;
            var inwardCentripetal = Vector3.left * (12f * 12f / 1.5f);
            const float maximumAcceleration = 30f;

            var acceleration = PassiveGuidePhysics.CombineZeroWorkConstraintAcceleration(
                velocity,
                Vector3.zero,
                inwardCentripetal,
                maximumAcceleration);

            Assert.That(float.IsNaN(acceleration.x) || float.IsInfinity(acceleration.x), Is.False);
            Assert.That(float.IsNaN(acceleration.y) || float.IsInfinity(acceleration.y), Is.False);
            Assert.That(float.IsNaN(acceleration.z) || float.IsInfinity(acceleration.z), Is.False);
            Assert.That(acceleration.x, Is.LessThan(0f), "curve force must point toward its centre");
            Assert.That(acceleration.magnitude, Is.LessThanOrEqualTo(maximumAcceleration + 0.0001f));
            Assert.That(Vector3.Dot(acceleration, velocity), Is.EqualTo(0f).Within(0.00001f));
        }

        [Test]
        public void CombinedCurveCorrectionRemainsPerpendicularToDriftingVelocity()
        {
            var velocity = new Vector3(2.4f, -0.6f, 8.2f);
            var candidate = new Vector3(-9f, 3f, -1.5f);
            var centripetal = new Vector3(-42f, 0f, 0f);

            var acceleration = PassiveGuidePhysics.CombineZeroWorkConstraintAcceleration(
                velocity,
                candidate,
                centripetal,
                36f);

            Assert.That(acceleration.x, Is.LessThan(0f));
            Assert.That(acceleration.magnitude, Is.LessThanOrEqualTo(36.0001f));
            Assert.That(Vector3.Dot(acceleration, velocity), Is.EqualTo(0f).Within(0.00002f));
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

        private static void InvokeHelixTrigger(
            HelixMarbleGuide guide,
            string methodName,
            Collider collider)
        {
            var method = typeof(HelixMarbleGuide).GetMethod(
                methodName,
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            Assert.That(method, Is.Not.Null, methodName);
            method.Invoke(guide, new object[] { collider });
        }

        private static Vector3 HelixPointForTest(float t, float radius, float height, float turns)
        {
            var progress = Mathf.Clamp01(t);
            var angle = -Mathf.PI * 0.5f + Mathf.PI * 2f * turns * progress;
            return new Vector3(
                Mathf.Cos(angle) * radius,
                Mathf.Lerp(height, 0f, progress),
                Mathf.Sin(angle) * radius);
        }
    }
}
