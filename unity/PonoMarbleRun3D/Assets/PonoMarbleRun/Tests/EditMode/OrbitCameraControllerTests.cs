using NUnit.Framework;
using Pono.MarbleRun3D.Gameplay;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class OrbitCameraControllerTests
    {
        [Test]
        public void FollowGroupUsesMainPackAndRejectsOneWildMarble()
        {
            var positions = new[]
            {
                new Vector3(-0.30f, 2.0f, -0.30f),
                new Vector3(0.10f, 2.1f, 0.10f),
                new Vector3(0.25f, 2.0f, 0.45f),
                new Vector3(-0.10f, 2.2f, 0.75f),
                new Vector3(0.15f, 2.1f, 1.00f),
                new Vector3(80f, -20f, 80f)
            };
            var velocities = new[]
            {
                new Vector3(0.1f, 0f, 4.0f),
                new Vector3(0f, -0.1f, 4.2f),
                new Vector3(0.1f, 0f, 3.9f),
                new Vector3(-0.1f, 0.1f, 4.1f),
                new Vector3(0f, 0f, 4.0f),
                new Vector3(-80f, 30f, -80f)
            };

            var group = OrbitCameraController.CalculateFollowGroup(
                positions,
                velocities,
                positions.Length);

            Assert.That(group.IsValid, Is.True);
            Assert.That(new Vector2(group.Center.x, group.Center.z).magnitude, Is.LessThan(2f));
            Assert.That(group.Center.y, Is.InRange(0.8f, 2.3f));
            Assert.That(group.AverageVelocity.z, Is.GreaterThan(3f));
            Assert.That(group.Spread, Is.LessThan(1.8f),
                "one fallen marble must not zoom the camera away from the moving pack");
        }

        [Test]
        public void FollowPlanUsesCloseShoulderViewWithBoundedPitch()
        {
            var group = new FollowGroupSample(
                new Vector3(2f, 3f, 4f),
                new Vector3(0f, -1.5f, 5f),
                2f);
            var plan = OrbitCameraController.CalculateFollowViewPlan(
                group,
                new Vector3(0.35f, 0f, 1f),
                Vector3.forward,
                34f);

            Assert.That(plan.Target.z, Is.GreaterThan(group.Center.z));
            Assert.That(plan.Target.y, Is.GreaterThan(group.Center.y));
            Assert.That(plan.Distance, Is.InRange(
                OrbitCameraController.FollowMinimumDistance,
                OrbitCameraController.FollowMaximumDistance));
            Assert.That(plan.Distance, Is.LessThan(14.5f));
            Assert.That(plan.Pitch, Is.InRange(36f, 40f));
            var headingYaw = Mathf.Atan2(plan.Heading.x, plan.Heading.z) * Mathf.Rad2Deg;
            Assert.That(Mathf.DeltaAngle(headingYaw, plan.Yaw), Is.EqualTo(28f).Within(0.01f));
        }

        [Test]
        public void StationaryMarbleKeepsLastYawInsteadOfSearchingForAHeading()
        {
            var group = new FollowGroupSample(
                new Vector3(0f, 3f, 0f),
                new Vector3(0.08f, 0f, 0.10f),
                0.4f);
            var plan = OrbitCameraController.CalculateFollowViewPlan(
                group,
                Vector3.right,
                Vector3.forward,
                63f);

            Assert.That(plan.Yaw, Is.EqualTo(63f));
            Assert.That(plan.Heading, Is.EqualTo(Vector3.forward));
        }

        [Test]
        public void VerticalLiftRequestsOnlyASmallOrbitFromTheCurrentSide()
        {
            var group = new FollowGroupSample(
                new Vector3(0f, 4f, 0f),
                Vector3.up * 2f,
                0.5f);
            var plan = OrbitCameraController.CalculateFollowViewPlan(
                group,
                Vector3.right,
                Vector3.forward,
                42f);

            Assert.That(plan.Yaw, Is.EqualTo(52f).Within(0.001f));
            Assert.That(plan.Heading, Is.EqualTo(Vector3.forward));
            Assert.That(plan.Pitch, Is.InRange(36f, 40f));
        }

        [Test]
        public void CourseLookAheadSelectsForwardRailAndIgnoresRearCrossing()
        {
            var course = new[]
            {
                new Vector3(0f, 1f, -5f),
                new Vector3(-5f, 1f, 0f),
                new Vector3(2f, 1.4f, 5f),
                new Vector3(0f, 1f, 10f)
            };

            var direction = OrbitCameraController.SelectCourseLookDirection(
                Vector3.zero,
                Vector3.forward * 4f,
                course,
                course.Length,
                Vector3.right);

            Assert.That(Vector3.Dot(direction, Vector3.forward), Is.GreaterThan(0.90f));
            Assert.That(direction.x, Is.GreaterThan(0f),
                "the nearby forward curve should influence the view before the marble reaches it");
        }

        [Test]
        public void CourseLookAheadReturnsTheNextReadableRailAsPredictiveTarget()
        {
            var course = new[]
            {
                new Vector3(0f, 1f, -4f),
                new Vector3(1.5f, 1.4f, 4.4f),
                new Vector3(0f, 1f, 9f)
            };

            var look = OrbitCameraController.SelectCourseLookAhead(
                Vector3.zero,
                Vector3.forward * 3f,
                course,
                course.Length,
                Vector3.forward);

            Assert.That(look.HasCourseTarget, Is.True);
            Assert.That(look.Target, Is.EqualTo(course[1]));
            Assert.That(Vector3.Dot(look.Direction, Vector3.forward), Is.GreaterThan(0.90f));
        }

        [Test]
        public void RapidAlternatingTornadoDirectionsAreHeavilyDamped()
        {
            var smoothed = Vector3.forward;
            for (var i = 0; i < 60; i++)
            {
                var desired = i % 2 == 0 ? Vector3.right : Vector3.left;
                smoothed = OrbitCameraController.SmoothFollowDirection(
                    smoothed,
                    desired,
                    1f / 60f);
            }

            Assert.That(Mathf.Abs(smoothed.x), Is.LessThan(0.03f),
                "alternating spiral tangents must not make the camera hunt left and right");
            Assert.That(smoothed.z, Is.GreaterThan(0.99f));
        }

        [Test]
        public void FollowPlanPrefersCourseAheadOverInstantaneousSpiralTangent()
        {
            var group = new FollowGroupSample(
                new Vector3(0f, 3f, 0f),
                Vector3.right * 4f,
                0.8f);

            var plan = OrbitCameraController.CalculateFollowViewPlan(
                group,
                Vector3.forward,
                Vector3.forward,
                34f);

            Assert.That(Vector3.Dot(plan.Heading, Vector3.forward), Is.GreaterThan(0.94f));
            Assert.That(plan.Target.z, Is.GreaterThan(group.Center.z));
        }

        [Test]
        public void AutoOrbitRateNeverExceedsComfortCap()
        {
            Assert.That(OrbitCameraController.CalculateFollowYawSpeed(0f, 10f),
                Is.EqualTo(10f).Within(0.001f));
            Assert.That(OrbitCameraController.CalculateFollowYawSpeed(0f, 90f),
                Is.InRange(10f, OrbitCameraController.FollowMaximumYawSpeed));
            Assert.That(OrbitCameraController.CalculateFollowYawSpeed(0f, 170f),
                Is.EqualTo(OrbitCameraController.FollowMaximumYawSpeed).Within(0.001f));
        }

        [Test]
        public void OcclusionCandidateChoosesVisibleSideThenHysteresisPreventsFlip()
        {
            var offsets = new[] { 0f, 35f, -35f, 70f, -70f };
            var firstScores = new[] { 0.25f, 0.92f, 0.58f, 1f, 0.70f };
            var selected = OrbitCameraController.SelectOcclusionYawOffset(
                offsets,
                firstScores,
                0f,
                false);

            Assert.That(selected, Is.EqualTo(70f),
                "the camera should orbit to the clearest visible candidate");

            var noisyScores = new[] { 0.30f, 0.94f, 0.60f, 0.88f, 0.98f };
            var held = OrbitCameraController.SelectOcclusionYawOffset(
                offsets,
                noisyScores,
                selected,
                true);

            Assert.That(held, Is.GreaterThan(0f),
                "a slightly clearer opposite side must not cause left-right flipping");
        }

        [Test]
        public void OcclusionHysteresisAllowsEmergencySideChangeAndIgnoresTargetRail()
        {
            var offsets = new[] { 0f, 35f, -35f, 70f, -70f };
            var scores = new[] { 0.18f, 0.22f, 0.95f, 0.30f, 1f };
            var selected = OrbitCameraController.SelectOcclusionYawOffset(
                offsets,
                scores,
                35f,
                true);

            Assert.That(selected, Is.EqualTo(-70f),
                "a badly blocked held side may switch to the genuinely visible side");
            Assert.That(OrbitCameraController.IsOcclusionDistanceBlocking(12f, 5f), Is.True);
            Assert.That(OrbitCameraController.IsOcclusionDistanceBlocking(12f, 10.2f), Is.False,
                "the rail immediately surrounding the followed marbles is not a wall");
        }

        [Test]
        public void ManualOrbitAndZoomHoldAutomationThenOverviewRestoresExactly()
        {
            var cameraObject = new GameObject("camera-follow-test", typeof(Camera));
            var orbit = cameraObject.AddComponent<OrbitCameraController>();
            try
            {
                orbit.ConfigureDefault(34f, 48f, 44f);
                orbit.SetFollowEnabled(true, false);
                Assert.That(orbit.Distance, Is.InRange(
                    OrbitCameraController.FollowMinimumDistance,
                    13.25f));
                Assert.That(orbit.Pitch, Is.InRange(36f, 40f));

                var group = new FollowGroupSample(
                    new Vector3(1f, 2f, 3f),
                    Vector3.forward * 4f,
                    1f);
                orbit.SetFollowFrame(group, Vector3.forward);
                orbit.Orbit(new Vector2(40f, -10f));
                var manualYaw = orbit.Yaw;
                orbit.SetFollowFrame(group, Vector3.left);

                Assert.That(orbit.IsAutomaticOrbitHeld, Is.True);
                Assert.That(orbit.Yaw, Is.EqualTo(manualYaw),
                    "new follow samples must not immediately overwrite a child's drag");
                orbit.Zoom(-2f);
                Assert.That(orbit.Distance, Is.InRange(
                    OrbitCameraController.FollowMinimumDistance - 1.5f,
                    OrbitCameraController.FollowMaximumDistance + 4f));

                orbit.RestoreCourseOverview();
                Assert.That(orbit.IsFollowing, Is.False);
                Assert.That(orbit.Distance, Is.EqualTo(44f));
                Assert.That(orbit.Target, Is.EqualTo(orbit.CourseTarget));
            }
            finally
            {
                Object.DestroyImmediate(cameraObject);
            }
        }
    }
}
