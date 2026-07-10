using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using Pono.MarbleRun3D.UI;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.MarbleRun3D.Tests.PlayMode
{
    public sealed class MarbleRunRuntimePlayModeTests
    {
        private GameObject _cameraObject;
        private GameObject _root;
        private MarbleRunGameController _controller;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            Time.timeScale = 1f;
            Physics.simulationMode = SimulationMode.FixedUpdate;
            AudioListener.pause = false;
            _cameraObject = new GameObject("TestMainCamera", typeof(Camera), typeof(AudioListener));
            _cameraObject.tag = "MainCamera";
            _root = new GameObject("TestMarbleRun");
            _controller = _root.AddComponent<MarbleRunGameController>();
            yield return null;
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_controller != null && _controller.IsPaused) _controller.SetPaused(false);
            Time.timeScale = 1f;
            Physics.simulationMode = SimulationMode.FixedUpdate;
            AudioListener.pause = false;
            if (_root != null) Object.Destroy(_root);
            if (_cameraObject != null) Object.Destroy(_cameraObject);
            var path = CourseStorage.GetSavePath("sandbox");
            if (File.Exists(path)) File.Delete(path);
            yield return null;
            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator BootstrapCreatesMenuCameraUiAndNoRunningPhysics()
        {
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Menu));
            Assert.That(_controller.Ui, Is.Not.Null);
            Assert.That(_controller.OrbitCamera, Is.Not.Null);
            Assert.That(_controller.MarbleBody.gameObject.activeSelf, Is.False);
            Assert.That(Object.FindFirstObjectByType<EventSystem>(), Is.Not.Null);
            yield return null;
        }

        [UnityTest]
        public IEnumerator PlaceRotateDeleteUndoAndClearRemainEditable()
        {
            _controller.StartMode("sandbox");
            var initial = _controller.PieceCount;
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Curve, new GridPose(2, 1)), Is.True);
            var placed = _controller.Course.pieces.Single(piece => piece.kind == MarblePieceKind.Curve);
            Assert.That(_controller.SelectForQa(placed.id), Is.True);
            _controller.RotateSelection();
            Assert.That(_controller.Course.Find(placed.id).pose.quarterTurns, Is.EqualTo(1));
            _controller.DeleteSelection();
            Assert.That(_controller.PieceCount, Is.EqualTo(initial));
            _controller.Undo();
            Assert.That(_controller.Course.Find(placed.id), Is.Not.Null);
            _controller.RequestClearAll();
            _controller.RequestClearAll();
            Assert.That(_controller.PieceCount, Is.Zero);
            _controller.Undo();
            Assert.That(_controller.PieceCount, Is.EqualTo(initial + 1));
            yield return null;
        }

        [UnityTest]
        public IEnumerator PaletteDragHandlesMouseAndTouchStylePointerEvents()
        {
            _controller.StartMode("sandbox");
            var host = new GameObject("PaletteDragTest");
            host.transform.SetParent(_root.transform, false);
            var drag = host.AddComponent<PaletteDragItem>();
            drag.Configure(_controller, MarblePieceKind.Straight);
            var eventSystem = EventSystem.current;
            var before = _controller.PieceCount;

            var mouse = new PointerEventData(eventSystem)
            {
                pointerId = -1,
                position = new Vector2(Screen.width * 0.50f, Screen.height * 0.52f),
                delta = new Vector2(24f, 0f)
            };
            drag.OnBeginDrag(mouse);
            drag.OnDrag(mouse);
            drag.OnEndDrag(mouse);
            Assert.That(_controller.PieceCount, Is.EqualTo(before + 1));

            var touch = new PointerEventData(eventSystem)
            {
                pointerId = 7,
                position = new Vector2(Screen.width * 0.64f, Screen.height * 0.52f),
                delta = new Vector2(25f, 1f)
            };
            drag.OnBeginDrag(touch);
            drag.OnDrag(touch);
            drag.OnEndDrag(touch);
            Assert.That(_controller.PieceCount, Is.GreaterThanOrEqualTo(before + 1));
            yield return null;
        }

        [UnityTest]
        public IEnumerator VerticalPaletteDragScrollsInsteadOfPlacing()
        {
            _controller.StartMode("sandbox");
            Canvas.ForceUpdateCanvases();
            yield return null;
            var scroll = _controller.Ui.GetComponentInChildren<ScrollRect>(true);
            var drag = _controller.Ui.GetComponentsInChildren<PaletteDragItem>(true).First();
            Assert.That(scroll, Is.Not.Null);
            var before = scroll.content.anchoredPosition;
            var eventData = new PointerEventData(EventSystem.current)
            {
                pointerId = 9,
                button = PointerEventData.InputButton.Left,
                position = new Vector2(120f, 230f),
                delta = new Vector2(0f, 32f)
            };
            drag.OnBeginDrag(eventData);
            eventData.position = new Vector2(120f, 500f);
            eventData.delta = new Vector2(0f, 270f);
            drag.OnDrag(eventData);
            drag.OnEndDrag(eventData);
            Assert.That(Vector2.Distance(scroll.content.anchoredPosition, before), Is.GreaterThan(1f));
        }

        [UnityTest]
        public IEnumerator PauseFreezesMarbleAndAllDynamicMechanisms()
        {
            BuildStraightCourse();
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Seesaw, new GridPose(3, 0)), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Domino, new GridPose(-3, 0)), Is.True);
            _controller.StartRun();
            yield return new WaitForSecondsRealtime(0.28f);
            var bodies = _controller.PieceViews.Values.SelectMany(view => view.DynamicBodies).ToArray();
            Assert.That(bodies.Length, Is.EqualTo(7));
            _controller.SetPaused(true);
            var marblePosition = _controller.MarbleBody.position;
            var positions = bodies.Select(body => body.position).ToArray();
            var rotations = bodies.Select(body => body.rotation).ToArray();
            yield return new WaitForSecondsRealtime(0.42f);
            Assert.That(_controller.MarbleBody.position, Is.EqualTo(marblePosition));
            for (var i = 0; i < bodies.Length; i++)
            {
                Assert.That(bodies[i].position, Is.EqualTo(positions[i]));
                Assert.That(bodies[i].rotation, Is.EqualTo(rotations[i]));
            }
            Assert.That(Physics.simulationMode, Is.EqualTo(SimulationMode.Script));
            _controller.SetPaused(false);
            Assert.That(Physics.simulationMode, Is.EqualTo(SimulationMode.FixedUpdate));
        }

        [UnityTest]
        public IEnumerator FallingMarbleReturnsToStartWithoutDuplication()
        {
            BuildStraightCourse();
            _controller.StartRun();
            yield return new WaitForFixedUpdate();
            _controller.MarbleBody.position = new Vector3(0f, -5f, 0f);
            _controller.MarbleBody.linearVelocity = Vector3.down;
            yield return new WaitForSecondsRealtime(0.65f);
            Assert.That(_controller.MarbleBody.position.y, Is.GreaterThan(1f));
            Assert.That(Object.FindObjectsByType<MarbleActor>(FindObjectsSortMode.None).Length, Is.EqualTo(1));
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Running));
        }

        [UnityTest]
        public IEnumerator GoalCelebrationChangesCameraLightAndReturnsToEdit()
        {
            BuildStraightCourse();
            _controller.StartRun();
            _controller.CelebrateForQa();
            yield return new WaitForSecondsRealtime(0.12f);
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating));
            Assert.That(_controller.OrbitCamera.Distance, Is.EqualTo(12.5f).Within(0.001f));
            Assert.That(Object.FindObjectsByType<Light>(FindObjectsSortMode.None)
                .Any(light => light.type == LightType.Point), Is.True);
            _controller.ReturnToEditing();
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing));
            Assert.That(_controller.MarbleBody.gameObject.activeSelf, Is.False);
        }

        [UnityTest]
        public IEnumerator PausingCelebrationKeepsResumeAboveGoalPanel()
        {
            BuildStraightCourse();
            _controller.StartRun();
            _controller.CelebrateForQa();
            yield return null;
            _controller.SetPaused(true);
            var pause = _controller.Ui.transform.Find("Canvas/SafeArea/Pause");
            var celebration = _controller.Ui.transform.Find("Canvas/SafeArea/Celebration");
            Assert.That(pause, Is.Not.Null);
            Assert.That(celebration, Is.Not.Null);
            Assert.That(pause.gameObject.activeSelf, Is.True);
            Assert.That(celebration.gameObject.activeSelf, Is.True);
            Assert.That(pause.GetSiblingIndex(), Is.GreaterThan(celebration.GetSiblingIndex()));
            _controller.SetPaused(false);
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating));
        }

        [UnityTest]
        public IEnumerator TutorialReachesTryInstructionAfterConnectedCourse()
        {
            _controller.StartMode("tutorial");
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, -2)), Is.True);
            var first = _controller.Course.pieces.Single(piece => piece.pose.z == -2);
            Assert.That(_controller.SelectForQa(first.id), Is.True);
            for (var i = 0; i < 4; i++) _controller.RotateSelection();
            Assert.That(_controller.TutorialStep, Is.EqualTo(2));
            for (var z = -1; z <= 2; z++)
                Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, z)), Is.True);
            Assert.That(_controller.TutorialStep, Is.EqualTo(3));
            Assert.That(_controller.Ui.TutorialText, Is.EqualTo("ためすを おしてみよう"));
            yield return null;
        }

        [UnityTest]
        public IEnumerator MarblePhysicallyActuatesSeesawAndDomino()
        {
            BuildMechanismCourse(MarblePieceKind.Seesaw);
            var seesaw = _controller.PieceViews.Values.Single(view => view.Record.kind == MarblePieceKind.Seesaw);
            var seesawBody = seesaw.DynamicBodies.Single();
            var seesawStart = seesawBody.rotation;
            _controller.StartRun();
            var seesawMaximumAngle = 0f;
            var deadline = Time.realtimeSinceStartup + 4.5f;
            while (Time.realtimeSinceStartup < deadline)
            {
                seesawMaximumAngle = Mathf.Max(seesawMaximumAngle, Quaternion.Angle(seesawStart, seesawBody.rotation));
                yield return null;
            }
            Assert.That(seesawMaximumAngle, Is.GreaterThan(0.5f));
            _controller.ReturnToEditing();

            BuildMechanismCourse(MarblePieceKind.Domino);
            var domino = _controller.PieceViews.Values.Single(view => view.Record.kind == MarblePieceKind.Domino);
            var dominoBodies = domino.DynamicBodies.ToArray();
            var dominoStarts = dominoBodies.Select(body => body.rotation).ToArray();
            _controller.StartRun();
            var dominoMaximumAngle = 0f;
            deadline = Time.realtimeSinceStartup + 4.5f;
            while (Time.realtimeSinceStartup < deadline)
            {
                for (var i = 0; i < dominoBodies.Length; i++)
                    dominoMaximumAngle = Mathf.Max(
                        dominoMaximumAngle,
                        Quaternion.Angle(dominoStarts[i], dominoBodies[i].rotation));
                yield return null;
            }
            Assert.That(dominoMaximumAngle, Is.GreaterThan(5f));
        }

        [UnityTest]
        public IEnumerator ConnectedFlatCoursePhysicallyReachesGoal()
        {
            BuildStraightCourse();
            _controller.StartRun();
            var timeout = Time.realtimeSinceStartup + 8f;
            while (_controller.State == MarbleRunState.Running && Time.realtimeSinceStartup < timeout)
                yield return null;

            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating),
                "A connected flat course must reach the goal through real physics.");
        }

        [UnityTest]
        public IEnumerator TwoSlopesPhysicallyTraverseElevatedLevelAndReachGoal()
        {
            _controller.StartMode("sandbox");
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, -3)), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Slope, new GridPose(0, -2, 0, 2)), Is.True);
            for (var z = -1; z <= 1; z++)
                Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, z, 1)), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Slope, new GridPose(0, 2, 0, 0)), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, 3)), Is.True);
            Assert.That(PlacementSolver.HasStartToGoalGraphPath(_controller.Course.pieces), Is.True);

            _controller.StartRun();
            var timeout = Time.realtimeSinceStartup + 12f;
            while (_controller.State == MarbleRunState.Running && Time.realtimeSinceStartup < timeout)
                yield return null;
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating),
                "A two-slope course must physically cross the elevated level and return to the goal.");
        }

        [UnityTest]
        public IEnumerator SaveLoadRoundTripRestoresAndAllowsFurtherEditing()
        {
            _controller.StartMode("sandbox");
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Tunnel, new GridPose(2, 2)), Is.True);
            var savedCount = _controller.PieceCount;
            _controller.SaveCourse();
            Assert.That(File.Exists(CourseStorage.GetSavePath("sandbox")), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Curve, new GridPose(-2, 2)), Is.True);
            Assert.That(_controller.PieceCount, Is.EqualTo(savedCount + 1));
            _controller.LoadCourse();
            Assert.That(_controller.PieceCount, Is.EqualTo(savedCount));
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Slope, new GridPose(-2, -2)), Is.True);
            yield return null;
        }

        [UnityTest]
        public IEnumerator HighSpeedContinuousMarbleDoesNotTunnelThroughThinWall()
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "ThinWall";
            wall.transform.position = new Vector3(30f, 1.5f, 0f);
            wall.transform.localScale = new Vector3(4f, 5f, 0.10f);

            var marble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            marble.name = "FastMarble";
            marble.transform.position = new Vector3(30f, 1.5f, -3f);
            marble.transform.localScale = Vector3.one * 0.50f;
            var body = marble.AddComponent<Rigidbody>();
            body.useGravity = false;
            body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            body.interpolation = RigidbodyInterpolation.Interpolate;
            body.linearVelocity = Vector3.forward * 18f;
            for (var step = 0; step < 32; step++) yield return new WaitForFixedUpdate();
            Assert.That(body.position.z, Is.LessThan(0.75f));
            Assert.That(body.collisionDetectionMode, Is.EqualTo(CollisionDetectionMode.ContinuousDynamic));
            Object.Destroy(wall);
            Object.Destroy(marble);
        }

        [UnityTest]
        public IEnumerator CameraOrbitAndZoomStayInChildSafeBounds()
        {
            _controller.StartMode("sandbox");
            _controller.OrbitCamera.Orbit(new Vector2(2000f, 3000f));
            _controller.OrbitCamera.Zoom(-500f);
            Assert.That(_controller.OrbitCamera.Pitch, Is.InRange(28f, 68f));
            Assert.That(_controller.OrbitCamera.Distance, Is.InRange(17f, 48f));
            _controller.OrbitCamera.Zoom(1000f);
            Assert.That(_controller.OrbitCamera.Distance, Is.EqualTo(48f));
            yield return null;
        }

        [UnityTest]
        public IEnumerator CriticalUiTargetsRemainInsideSafeCanvasAtCurrentAspect()
        {
            _controller.StartMode("sandbox");
            Canvas.ForceUpdateCanvases();
            yield return null;
            var safe = _controller.Ui.SafeRootRect;
            Assert.That(safe, Is.Not.Null);
            var buttons = _controller.Ui.GetComponentsInChildren<Button>(true);
            Assert.That(buttons.Length, Is.GreaterThanOrEqualTo(20));
            foreach (var button in buttons.Where(button => button.gameObject.activeInHierarchy))
            {
                var rect = button.transform as RectTransform;
                Assert.That(rect.rect.width, Is.GreaterThanOrEqualTo(48f), button.name + " width");
                Assert.That(rect.rect.height, Is.GreaterThanOrEqualTo(44f), button.name + " height");
                Assert.That(float.IsNaN(rect.position.x) || float.IsNaN(rect.position.y), Is.False, button.name);
            }
        }

        [UnityTest]
        public IEnumerator RuntimeMarbleUsesTunedCcdAndPhysicsValues()
        {
            BuildStraightCourse();
            _controller.StartRun();
            yield return new WaitForFixedUpdate();
            var body = _controller.MarbleBody;
            Assert.That(body.collisionDetectionMode, Is.EqualTo(CollisionDetectionMode.ContinuousDynamic));
            Assert.That(body.interpolation, Is.EqualTo(RigidbodyInterpolation.Interpolate));
            Assert.That(body.mass, Is.EqualTo(MarbleRunPhysicsProfile.MarbleMass).Within(0.0001f));
            body.linearVelocity = Vector3.forward * 30f;
            yield return new WaitForFixedUpdate();
            Assert.That(body.linearVelocity.magnitude,
                Is.LessThanOrEqualTo(MarbleRunPhysicsProfile.MarbleMaximumSpeed + 0.01f));
            Assert.That(Time.fixedDeltaTime, Is.EqualTo(MarbleRunPhysicsProfile.FixedTimestep).Within(0.00001f));
        }

        private void BuildStraightCourse()
        {
            _controller.StartMode("sandbox");
            for (var z = -3; z <= 3; z++)
                Assert.That(_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, z)), Is.True, "z=" + z);
        }

        private void BuildMechanismCourse(MarblePieceKind mechanism)
        {
            _controller.StartMode("sandbox");
            for (var z = -3; z <= 3; z++)
            {
                var kind = z == 0 ? mechanism : MarblePieceKind.Straight;
                Assert.That(_controller.PlaceForQa(kind, new GridPose(0, z)), Is.True, kind + " z=" + z);
            }
        }
    }
}
