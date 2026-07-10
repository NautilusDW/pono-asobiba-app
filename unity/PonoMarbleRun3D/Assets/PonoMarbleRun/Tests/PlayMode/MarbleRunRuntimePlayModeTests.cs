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
            foreach (var sample in ChallengeCatalog.Samples)
            {
                path = CourseStorage.GetSavePath(sample.Id);
                if (File.Exists(path)) File.Delete(path);
            }
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
            Assert.That(_controller.MarbleBodies.Count, Is.EqualTo(8));
            Assert.That(_controller.MarbleBodies.All(body => !body.gameObject.activeSelf), Is.True);
            Assert.That(Object.FindFirstObjectByType<EventSystem>(), Is.Not.Null);
            yield return null;
        }

        [UnityTest]
        public IEnumerator StarterButtonLoadsConnectedRichEditableCourseAndFramesItsHeight()
        {
            var modeButtons = _controller.Ui.transform.Find("Canvas/SafeArea/Menu/ModeButtons");
            Assert.That(modeButtons.GetComponentsInChildren<Button>(true).Length, Is.EqualTo(7));
            var starter = modeButtons.Find("Starter").GetComponent<Button>();
            Assert.That(starter.GetComponentInChildren<Text>().text, Is.EqualTo("すぐ ころがす"));

            starter.onClick.Invoke();
            Canvas.ForceUpdateCanvases();
            yield return null;

            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing));
            Assert.That(_controller.CurrentMode.Id, Is.EqualTo("starter"));
            Assert.That(_controller.Course.modeId, Is.EqualTo("starter"));
            Assert.That(PlacementSolver.HasStartToGoalGraphPath(_controller.Course.pieces), Is.True);
            Assert.That(_controller.Course.pieces.All(piece => !piece.locked), Is.True);
            foreach (var kind in new[]
                     {
                         MarblePieceKind.Tornado,
                         MarblePieceKind.Elevator,
                         MarblePieceKind.ClearTube,
                         MarblePieceKind.ClearCurve,
                         MarblePieceKind.Wave,
                         MarblePieceKind.Spinner
                     })
            {
                Assert.That(_controller.Course.pieces.Any(piece => piece.kind == kind), Is.True, kind.ToString());
            }
            Assert.That(_controller.PieceViews.Count, Is.EqualTo(_controller.Course.pieces.Count));
            Assert.That(_controller.OrbitCamera.Target.y,
                Is.GreaterThan(WoodenPieceFactory.LevelHeight),
                "the initial camera should frame the three-level connector span");
        }

        [UnityTest]
        public IEnumerator FourHeightLevelsCanBeSelectedShownAndUsedAtOneGridCell()
        {
            _controller.StartMode("sandbox");
            while (_controller.ActivePlacementLevel > 0)
                _controller.ChangePlacementLevel(-1);
            Assert.That(_controller.ActivePlacementLevel, Is.Zero);
            Assert.That(_controller.Ui.HeightText, Does.Contain("たかさ"));

            var shownLabels = new HashSet<string> { _controller.Ui.HeightText };
            for (var level = 0; level < 4; level++)
            {
                while (_controller.ActivePlacementLevel < level)
                    _controller.ChangePlacementLevel(1);

                Assert.That(_controller.ActivePlacementLevel, Is.EqualTo(level));
                shownLabels.Add(_controller.Ui.HeightText);
                Assert.That(
                    _controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(2, 0, level)),
                    Is.True,
                    "flat rails at separate levels should not occupy one another: level=" + level);
            }

            Assert.That(shownLabels.Count, Is.EqualTo(4));
            var stacked = _controller.Course.pieces
                .Where(piece => piece.kind == MarblePieceKind.Straight && piece.pose.x == 2 && piece.pose.z == 0)
                .OrderBy(piece => piece.pose.level)
                .ToArray();
            Assert.That(stacked.Select(piece => piece.pose.level), Is.EqualTo(new[] { 0, 1, 2, 3 }));
            for (var index = 1; index < stacked.Length; index++)
            {
                var previousY = _controller.PieceViews[stacked[index - 1].id].transform.position.y;
                var currentY = _controller.PieceViews[stacked[index].id].transform.position.y;
                Assert.That(currentY - previousY, Is.EqualTo(WoodenPieceFactory.LevelHeight).Within(0.001f));
            }
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
        public IEnumerator SampleChooserLoadsEditableCourseAndExplainsClockwiseRotation()
        {
            var menu = _controller.Ui.transform.Find("Canvas/SafeArea/Menu");
            var chooserButton = _controller.Ui.transform.Find("Canvas/SafeArea/Menu/ModeButtons/Samples")
                .GetComponent<Button>();
            chooserButton.onClick.Invoke();
            Canvas.ForceUpdateCanvases();
            yield return null;

            var samples = _controller.Ui.transform.Find("Canvas/SafeArea/Samples");
            Assert.That(menu.gameObject.activeSelf, Is.False);
            Assert.That(samples.gameObject.activeSelf, Is.True);
            var sampleButtons = samples.Find("SampleButtons").GetComponentsInChildren<Button>(true);
            Assert.That(sampleButtons.Length, Is.EqualTo(6));
            Assert.That(samples.Find("SampleButtons/Sample1/Label").GetComponent<Text>().text,
                Is.EqualTo("はじめての みち"));
            Assert.That(samples.Find("SampleButtons/Sample2/Label").GetComponent<Text>().text,
                Is.EqualTo("にじいろ タワー"));
            Assert.That(samples.Find("SampleButtons/Sample3/Label").GetComponent<Text>().text,
                Is.EqualTo("そらの まよいみち"));
            Assert.That(samples.Find("SampleButtons/Sample4/Label").GetComponent<Text>().text,
                Is.EqualTo("のぼって おりて"));
            Assert.That(samples.Find("SampleButtons/Sample5/Label").GetComponent<Text>().text,
                Is.EqualTo("トルネード タワー"));
            Assert.That(samples.Find("SampleButtons/Sample6/Label").GetComponent<Text>().text,
                Is.EqualTo("エレベーター シティ"));
            foreach (var button in sampleButtons)
            {
                var rect = (RectTransform)button.transform;
                Assert.That(rect.rect.width, Is.GreaterThanOrEqualTo(44f), button.name + " width");
                Assert.That(rect.rect.height, Is.GreaterThanOrEqualTo(44f), button.name + " height");
            }

            samples.Find("SampleButtons/Sample2").GetComponent<Button>().onClick.Invoke();
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing));
            Assert.That(_controller.CurrentMode.Id, Is.EqualTo("sample2"));
            Assert.That(_controller.Course.modeId, Is.EqualTo("sample2"));
            Assert.That(_controller.Ui.transform.Find("Canvas/SafeArea/BuilderTop/Mode").GetComponent<Text>().text,
                Is.EqualTo("にじいろ タワー"));

            _controller.RotateSelection();
            Assert.That(_controller.Ui.StatusText, Does.Contain("おしてから くるっ"));
            var editableRail = _controller.Course.pieces.First(piece => piece.kind == MarblePieceKind.Straight);
            var originalTurns = editableRail.pose.quarterTurns;
            Assert.That(_controller.SelectForQa(editableRail.id), Is.True);
            var rotatePulse = _controller.Ui.transform.Find("Canvas/SafeArea/EditActions/Rotate")
                .GetComponent<UiPulse>();
            Assert.That(rotatePulse.Active, Is.True);
            Assert.That(_controller.Ui.StatusText, Does.Contain("くるっで みぎに"));
            _controller.RotateSelection();
            Assert.That(_controller.Course.Find(editableRail.id).pose.quarterTurns,
                Is.EqualTo(GridPose.NormalizeQuarterTurns(originalTurns + 1)));
            Assert.That(_controller.Ui.StatusText, Does.Contain("みぎに まわしたよ"));
            _controller.Undo();
            Assert.That(_controller.Course.Find(editableRail.id).pose.quarterTurns, Is.EqualTo(originalTurns));
            Assert.That(rotatePulse.Active, Is.False);
            Assert.That(_controller.Ui.transform.Find("Canvas/SafeArea/BuilderTop/Selected").GetComponent<Text>().text,
                Is.EqualTo("おいた ぶひんを おしてね"));

            var savedCount = _controller.PieceCount;
            _controller.SaveCourse();
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Domino, new GridPose(-5, 5)), Is.True);
            Assert.That(_controller.PieceCount, Is.EqualTo(savedCount + 1));
            _controller.LoadCourse();
            Assert.That(_controller.PieceCount, Is.EqualTo(savedCount));
            Assert.That(rotatePulse.Active, Is.False);

            _controller.StartMode("sample3");
            var steps = _controller.Course.pieces.First(piece => piece.kind == MarblePieceKind.Steps);
            Assert.That(_controller.SelectForQa(steps.id), Is.True);
            Assert.That(_controller.Ui.StatusText, Does.Contain("２かい"));
            Assert.That(_controller.Ui.StatusText, Does.Contain("のぼりと くだり"));
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
            Assert.That(scroll, Is.Not.Null);
            var paletteItems = _controller.Ui.GetComponentsInChildren<PaletteDragItem>(true);
            Assert.That(PartCatalog.All.Count, Is.EqualTo(19));
            Assert.That(paletteItems.Length, Is.EqualTo(19));
            var firstPaletteItems = scroll.content.GetComponentsInChildren<PaletteDragItem>(true)
                .Take(8)
                .Select(item => item.gameObject.name)
                .ToArray();
            Assert.That(firstPaletteItems, Is.EqualTo(new[]
            {
                "PartStart",
                "PartGoal",
                "PartTornado",
                "PartElevator",
                "PartClearTube",
                "PartClearCurve",
                "PartWave",
                "PartSpinner"
            }));
            Assert.That(LayoutUtility.GetPreferredHeight(scroll.content),
                Is.GreaterThan(scroll.viewport.rect.height));
            var drag = paletteItems
                .First(item => item.GetComponent<Button>().interactable);
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
            var tap = new PointerEventData(EventSystem.current)
            {
                pointerId = 9,
                button = PointerEventData.InputButton.Left,
                eligibleForClick = true
            };
            drag.GetComponent<Button>().OnPointerClick(tap);
            Assert.That(_controller.Ui.StatusText, Does.Contain("ここに おこう"));
        }

        [UnityTest]
        public IEnumerator ColoredMarblePoolLaunchesAndResetsWithoutDuplication()
        {
            var actors = _controller.GetComponentsInChildren<MarbleActor>(true)
                .OrderBy(actor => actor.Index)
                .ToArray();
            Assert.That(actors.Length, Is.EqualTo(8));
            Assert.That(actors.Select(actor => actor.Index), Is.EqualTo(Enumerable.Range(0, 8)));
            Assert.That(actors.Select(actor => actor.StableId).Distinct().Count(), Is.EqualTo(8));
            var colors = actors
                .Select(actor => (Color32)actor.GetComponent<Renderer>().sharedMaterial.color)
                .Select(color => color.r + ":" + color.g + ":" + color.b)
                .Distinct()
                .ToArray();
            Assert.That(colors.Length, Is.GreaterThanOrEqualTo(6));

            BuildStraightCourse();
            _controller.StartRun();
            yield return new WaitForSeconds(2.25f);
            Assert.That(_controller.ActiveMarbleCount, Is.EqualTo(CourseData.DefaultMarbleCount));
            Assert.That(_controller.MarbleBodies.Take(_controller.ActiveMarbleCount)
                .All(body => body.gameObject.activeSelf), Is.True);

            _controller.ResetMarble();
            yield return new WaitForSeconds(2.25f);
            Assert.That(_controller.GetComponentsInChildren<MarbleActor>(true).Length, Is.EqualTo(8));
            Assert.That(_controller.MarbleBodies.Take(_controller.ActiveMarbleCount)
                .All(body => body.gameObject.activeSelf), Is.True);
            Assert.That(_controller.MarblesAtGoal, Is.Zero);
        }

        [UnityTest]
        public IEnumerator PauseFreezesMarbleAndAllDynamicMechanisms()
        {
            BuildStraightCourse();
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Seesaw, new GridPose(3, 0)), Is.True);
            Assert.That(_controller.PlaceForQa(MarblePieceKind.Domino, new GridPose(-3, 0)), Is.True);
            _controller.StartRun();
            yield return new WaitForSeconds(0.82f);
            var bodies = _controller.PieceViews.Values.SelectMany(view => view.DynamicBodies).ToArray();
            Assert.That(bodies.Length, Is.EqualTo(7));
            _controller.SetPaused(true);
            var marblePositions = _controller.MarbleBodies.Select(body => body.position).ToArray();
            var marbleRotations = _controller.MarbleBodies.Select(body => body.rotation).ToArray();
            var marbleActiveStates = _controller.MarbleBodies.Select(body => body.gameObject.activeSelf).ToArray();
            var positions = bodies.Select(body => body.position).ToArray();
            var rotations = bodies.Select(body => body.rotation).ToArray();
            yield return new WaitForSecondsRealtime(0.42f);
            for (var index = 0; index < _controller.MarbleBodies.Count; index++)
            {
                Assert.That(_controller.MarbleBodies[index].position, Is.EqualTo(marblePositions[index]));
                Assert.That(_controller.MarbleBodies[index].rotation, Is.EqualTo(marbleRotations[index]));
                Assert.That(_controller.MarbleBodies[index].gameObject.activeSelf, Is.EqualTo(marbleActiveStates[index]));
            }
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
        public IEnumerator GoalCountsEachActiveMarbleOnceAndCelebratesAfterTheLast()
        {
            BuildStraightCourse();
            _controller.StartRun();
            yield return new WaitForSeconds(2.25f);
            var activeCount = _controller.ActiveMarbleCount;
            Assert.That(activeCount, Is.EqualTo(CourseData.DefaultMarbleCount));

            for (var index = 0; index < activeCount - 1; index++)
            {
                Assert.That(_controller.ReachGoalForQa(index), Is.True, "marble=" + index);
                Assert.That(_controller.MarblesAtGoal, Is.EqualTo(index + 1));
                Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Running));
                Assert.That(_controller.ReachGoalForQa(index), Is.False, "duplicate marble=" + index);
                Assert.That(_controller.MarblesAtGoal, Is.EqualTo(index + 1));
            }

            Assert.That(_controller.ReachGoalForQa(activeCount - 1), Is.True);
            Assert.That(_controller.MarblesAtGoal, Is.EqualTo(activeCount));
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating));
            Assert.That(_controller.ReachGoalForQa(activeCount), Is.False);
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
            Assert.That(_controller.MarbleBodies.All(body => !body.gameObject.activeSelf), Is.True);
            var editActions = _controller.Ui.transform.Find("Canvas/SafeArea/EditActions");
            var runActions = _controller.Ui.transform.Find("Canvas/SafeArea/RunActions");
            Assert.That(editActions, Is.Not.Null);
            Assert.That(runActions, Is.Not.Null);
            Assert.That(editActions.gameObject.activeSelf, Is.True,
                "returning from the goal must restore the builder actions");
            Assert.That(runActions.gameObject.activeSelf, Is.False,
                "returning from the goal must not leave the preview actions visible");
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
        public IEnumerator MechanismsExposeDynamicBodiesAndRestoreWhenEditingResumes()
        {
            BuildMechanismCourse(MarblePieceKind.Seesaw);
            var seesaw = _controller.PieceViews.Values.Single(view => view.Record.kind == MarblePieceKind.Seesaw);
            var seesawBody = seesaw.DynamicBodies.Single();
            var seesawStartPosition = seesawBody.transform.localPosition;
            var seesawStartRotation = seesawBody.transform.localRotation;
            _controller.StartRun();
            Assert.That(seesawBody.isKinematic, Is.False);
            seesawBody.AddTorque(Vector3.forward * 2f, ForceMode.Impulse);
            yield return new WaitForFixedUpdate();
            _controller.ReturnToEditing();
            Assert.That(seesawBody.isKinematic, Is.True);
            Assert.That(seesawBody.transform.localPosition, Is.EqualTo(seesawStartPosition));
            Assert.That(seesawBody.transform.localRotation, Is.EqualTo(seesawStartRotation));

            BuildMechanismCourse(MarblePieceKind.Domino);
            var domino = _controller.PieceViews.Values.Single(view => view.Record.kind == MarblePieceKind.Domino);
            var dominoBodies = domino.DynamicBodies.ToArray();
            Assert.That(dominoBodies.Length, Is.EqualTo(6));
            _controller.StartRun();
            Assert.That(dominoBodies.All(body => !body.isKinematic), Is.True);
            _controller.ReturnToEditing();
            Assert.That(dominoBodies.All(body => body.isKinematic), Is.True);
        }

        [UnityTest]
        public IEnumerator HelixStepsAndLiftCreateTrueMultiLevelCourseViews()
        {
            foreach (var sampleId in new[] { "sample2", "sample3", "sample4" })
            {
                _controller.StartMode(sampleId);
                var course = _controller.Course;
                Assert.That(course.pieces.Max(piece => piece.pose.level), Is.GreaterThanOrEqualTo(2), sampleId);
                Assert.That(PlacementSolver.HasStartToGoalGraphPath(course.pieces), Is.True, sampleId);
                foreach (var piece in course.pieces)
                {
                    var expectedY = WoodenPieceFactory.PieceRootY
                        + piece.pose.level * WoodenPieceFactory.LevelHeight;
                    Assert.That(_controller.PieceViews[piece.id].transform.position.y,
                        Is.EqualTo(expectedY).Within(0.001f), sampleId + "/" + piece.id);
                }
                yield return null;
            }

            _controller.StartMode("sample2");
            Assert.That(_controller.Course.pieces.Any(piece => piece.kind == MarblePieceKind.Helix), Is.True);
            _controller.StartMode("sample3");
            Assert.That(_controller.Course.pieces.Count(piece => piece.kind == MarblePieceKind.Steps),
                Is.GreaterThanOrEqualTo(2));
            _controller.StartMode("sample4");
            Assert.That(_controller.Course.pieces.Any(piece => piece.kind == MarblePieceKind.Lift), Is.True);
        }

        [UnityTest]
        public IEnumerator TornadoAndElevatorSamplesLoadConnectedNewPieceCourses()
        {
            var expectations = new Dictionary<string, MarblePieceKind[]>
            {
                ["sample5"] = new[]
                {
                    MarblePieceKind.Tornado,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Wave,
                    MarblePieceKind.Spinner
                },
                ["sample6"] = new[]
                {
                    MarblePieceKind.Elevator,
                    MarblePieceKind.Tornado,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Wave,
                    MarblePieceKind.Spinner
                }
            };

            foreach (var pair in expectations)
            {
                _controller.StartMode(pair.Key);
                var course = _controller.Course;
                Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing), pair.Key);
                Assert.That(PlacementSolver.HasStartToGoalGraphPath(course.pieces), Is.True, pair.Key);
                Assert.That(course.pieces.All(piece => !piece.locked), Is.True, pair.Key);
                foreach (var kind in pair.Value)
                    Assert.That(course.pieces.Any(piece => piece.kind == kind), Is.True, pair.Key + "/" + kind);
                Assert.That(_controller.OrbitCamera.Target.y,
                    Is.GreaterThan(WoodenPieceFactory.LevelHeight), pair.Key + " camera height");
                yield return null;
            }
        }

        [UnityTest]
        public IEnumerator NewVarietyViewsExposeTallTransparentWavyAndMovingGeometry()
        {
            _controller.StartMode("starter");
            yield return null;

            var tornado = ViewFor(MarblePieceKind.Tornado);
            var tornadoGuide = tornado.GetComponentInChildren<HelixMarbleGuide>();
            Assert.That(tornadoGuide, Is.Not.Null);
            Assert.That(tornadoGuide.GetComponent<BoxCollider>().size.y,
                Is.GreaterThan(WoodenPieceFactory.LevelHeight * 3f));
            Assert.That(RendererHeight(tornado),
                Is.GreaterThan(WoodenPieceFactory.LevelHeight * 2.5f));

            var elevator = ViewFor(MarblePieceKind.Elevator);
            var elevatorGuide = elevator.GetComponentInChildren<ElevatorMarbleGuide>();
            var elevatorAnimator = elevator.GetComponentInChildren<ElevatorVisualAnimator>();
            Assert.That(elevatorGuide, Is.Not.Null);
            Assert.That(elevatorAnimator, Is.Not.Null);
            Assert.That(elevatorGuide.TravelHeight,
                Is.EqualTo(WoodenPieceFactory.LevelHeight * 3f).Within(0.001f));
            Assert.That(elevatorAnimator.TravelHeight,
                Is.EqualTo(elevatorGuide.TravelHeight).Within(0.001f));
            Assert.That(RendererHeight(elevator),
                Is.GreaterThan(WoodenPieceFactory.LevelHeight * 3f));

            var clearTube = ViewFor(MarblePieceKind.ClearTube);
            Assert.That(clearTube.GetComponentInChildren<ClearTubeMarbleGuide>(), Is.Not.Null);
            Assert.That(clearTube.GetComponentsInChildren<Collider>().Length, Is.GreaterThanOrEqualTo(4));
            Assert.That(clearTube.GetComponentsInChildren<Renderer>().Any(IsTransparentRenderer), Is.True);
            var clearCurve = ViewFor(MarblePieceKind.ClearCurve);
            Assert.That(clearCurve.GetComponentInChildren<ClearCurveMarbleGuide>(), Is.Not.Null);
            Assert.That(clearCurve.GetComponentsInChildren<Renderer>().Any(IsTransparentRenderer), Is.True);

            var wave = ViewFor(MarblePieceKind.Wave);
            Assert.That(wave.GetComponentInChildren<WaveMarbleGuide>(), Is.Not.Null);
            Assert.That(RendererHeight(wave), Is.GreaterThan(0.6f));

            var spinner = ViewFor(MarblePieceKind.Spinner);
            Assert.That(spinner.DynamicBodies.Count, Is.EqualTo(1));
            Assert.That(spinner.GetComponentInChildren<SpinnerMarbleGuide>(), Is.Not.Null);
            Assert.That(spinner.DynamicBodies[0].GetComponent<HingeJoint>(), Is.Not.Null);
            Assert.That(spinner.DynamicBodies[0].isKinematic, Is.True,
                "moving mechanisms stay parked while the course is edited");
        }

        [UnityTest]
        public IEnumerator EverySampleCourseIsConnectedEditableAndFramesTheCamera()
        {
            foreach (var sample in ChallengeCatalog.Samples)
            {
                _controller.StartMode(sample.Id);
                Assert.That(PlacementSolver.HasStartToGoalGraphPath(_controller.Course.pieces), Is.True, sample.Id);
                Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing));
                Assert.That(_controller.OrbitCamera.Target.y, Is.GreaterThanOrEqualTo(0f), sample.Id);
                Assert.That(_controller.OrbitCamera.Distance, Is.InRange(17f, 48f), sample.Id);
                yield return null;
            }
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
            _controller.StartMode("sample3");
            Assert.That(_controller.OrbitCamera.Target.y, Is.GreaterThan(0.8f));
            _controller.OrbitCamera.Orbit(new Vector2(2000f, 3000f));
            _controller.OrbitCamera.Zoom(-500f);
            Assert.That(_controller.OrbitCamera.Pitch, Is.InRange(28f, 68f));
            Assert.That(_controller.OrbitCamera.Distance, Is.InRange(17f, 48f));
            _controller.OrbitCamera.Zoom(1000f);
            Assert.That(_controller.OrbitCamera.Distance, Is.EqualTo(58f));
            _controller.ToggleCameraAngle();
            Assert.That(_controller.OrbitCamera.IsTopView, Is.True);
            Assert.That(_controller.OrbitCamera.Pitch, Is.GreaterThanOrEqualTo(78f));
            _controller.ToggleCameraAngle();
            Assert.That(_controller.OrbitCamera.IsTopView, Is.False);
            Assert.That(_controller.OrbitCamera.Pitch, Is.LessThan(78f));
            yield return null;
        }

        [UnityTest]
        public IEnumerator PreviewCameraFollowsMarblesAllowsManualControlAndReturnsToOverview()
        {
            var followChanges = new List<bool>();
            _controller.CameraFollowChanged += followChanges.Add;
            _controller.StartMode("sample5");
            var courseTarget = _controller.OrbitCamera.CourseTarget;
            var courseDistance = _controller.OrbitCamera.CourseDistance;

            _controller.StartRun();
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Running));
            Assert.That(_controller.IsCameraFollowing, Is.True);
            Assert.That(_controller.OrbitCamera.IsFollowing, Is.True);
            Assert.That(_controller.Ui.FollowText, Is.EqualTo("みわたす"));
            Assert.That(_controller.MarbleBody.gameObject.activeSelf, Is.True);
            Assert.That(_controller.OrbitCamera.Target, Is.Not.EqualTo(courseTarget),
                "run should immediately begin looking at the first active marble");

            var runningYaw = _controller.OrbitCamera.Yaw;
            var runningDistance = _controller.OrbitCamera.Distance;
            _controller.OrbitCamera.Orbit(new Vector2(30f, -20f));
            _controller.OrbitCamera.Zoom(-2f);
            Assert.That(_controller.OrbitCamera.Yaw, Is.Not.EqualTo(runningYaw));
            Assert.That(_controller.OrbitCamera.Distance, Is.LessThan(runningDistance));
            Assert.That(_controller.IsCameraFollowing, Is.True,
                "manual orbit and zoom should not turn following off");

            _controller.ToggleCameraFollow();
            Assert.That(_controller.IsCameraFollowing, Is.False);
            Assert.That(_controller.Ui.FollowText, Is.EqualTo("おいかける"));
            Assert.That(_controller.OrbitCamera.Target, Is.EqualTo(courseTarget));
            Assert.That(_controller.OrbitCamera.Distance, Is.EqualTo(courseDistance).Within(0.001f));

            _controller.ToggleCameraFollow();
            Assert.That(_controller.Ui.FollowText, Is.EqualTo("みわたす"));
            _controller.SetPaused(true);
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Paused));
            Assert.That(_controller.IsCameraFollowing, Is.True);
            var pausedYaw = _controller.OrbitCamera.Yaw;
            var pausedDistance = _controller.OrbitCamera.Distance;
            _controller.OrbitCamera.Orbit(new Vector2(-25f, 15f));
            _controller.OrbitCamera.Zoom(1.5f);
            yield return null;
            Assert.That(_controller.OrbitCamera.Yaw, Is.Not.EqualTo(pausedYaw));
            Assert.That(_controller.OrbitCamera.Distance, Is.GreaterThan(pausedDistance));
            Assert.That(Time.timeScale, Is.Zero,
                "unscaled camera motion must not resume gameplay physics while paused");

            _controller.SetPaused(false);
            _controller.CelebrateForQa();
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Celebrating));
            Assert.That(_controller.IsCameraFollowing, Is.False);
            Assert.That(_controller.Ui.FollowText, Is.EqualTo("おいかける"));
            var celebrationYaw = _controller.OrbitCamera.Yaw;
            var celebrationDistance = _controller.OrbitCamera.Distance;
            _controller.OrbitCamera.Orbit(new Vector2(20f, 10f));
            _controller.OrbitCamera.Zoom(1f);
            Assert.That(_controller.OrbitCamera.Yaw, Is.Not.EqualTo(celebrationYaw));
            Assert.That(_controller.OrbitCamera.Distance, Is.GreaterThan(celebrationDistance));

            _controller.ReturnToEditing();
            Assert.That(_controller.State, Is.EqualTo(MarbleRunState.Editing));
            Assert.That(_controller.IsCameraFollowing, Is.False);
            Assert.That(_controller.OrbitCamera.Target, Is.EqualTo(courseTarget));
            Assert.That(followChanges, Does.Contain(true));
            Assert.That(followChanges.Last(), Is.False);
        }

        [UnityTest]
        public IEnumerator CriticalUiTargetsRemainInsideSafeAreaAtSixteenNineFourThreeAndTwentyNine()
        {
            Canvas.ForceUpdateCanvases();
            yield return null;
            var safe = _controller.Ui.SafeRootRect;
            Assert.That(safe, Is.Not.Null);
            var scaler = _controller.Ui.GetComponentInChildren<Canvas>().GetComponent<CanvasScaler>();
            Assert.That(scaler, Is.Not.Null);
            var cases = new[]
            {
                new AspectCase("１６たい９", 1920, 1080, new Rect(0f, 0f, 1920f, 1080f)),
                new AspectCase("４たい３", 1024, 768, new Rect(24f, 20f, 976f, 728f)),
                new AspectCase("２０たい９", 2400, 1080, new Rect(96f, 28f, 2208f, 1024f))
            };

            var menuGrid = _controller.Ui.transform.Find("Canvas/SafeArea/Menu/ModeButtons")
                .GetComponent<GridLayoutGroup>();
            var menuButtons = menuGrid.GetComponentsInChildren<Button>(true);
            Assert.That(menuButtons.Length, Is.EqualTo(7));
            AssertTouchTargets(menuButtons, cases, safe, scaler, 48f, 44f);
            AssertGridFits(menuGrid, menuButtons.Length, cases, safe, scaler);

            _controller.Ui.transform.Find("Canvas/SafeArea/Menu/ModeButtons/Samples")
                .GetComponent<Button>().onClick.Invoke();
            Canvas.ForceUpdateCanvases();
            yield return null;
            var samplePanel = _controller.Ui.transform.Find("Canvas/SafeArea/Samples");
            var sampleTargets = samplePanel.GetComponentsInChildren<Button>(true)
                .Where(button => button.gameObject.activeInHierarchy)
                .ToArray();
            Assert.That(sampleTargets.Length, Is.EqualTo(7));
            AssertTouchTargets(sampleTargets, cases, safe, scaler, 48f, 44f);
            var sampleGrid = samplePanel.Find("SampleButtons").GetComponent<GridLayoutGroup>();
            AssertGridFits(sampleGrid, 6, cases, safe, scaler);

            _controller.StartMode("sandbox");
            Canvas.ForceUpdateCanvases();
            yield return null;
            var criticalButtons = _controller.Ui.GetComponentsInChildren<Button>(true)
                .Where(button => button.gameObject.activeInHierarchy)
                .Where(button => button.GetComponentInParent<ScrollRect>() == null)
                .ToArray();
            Assert.That(criticalButtons.Length, Is.GreaterThanOrEqualTo(10));
            AssertTouchTargets(criticalButtons, cases, safe, scaler, 44f, 44f);
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

        private readonly struct AspectCase
        {
            public readonly string name;
            public readonly int width;
            public readonly int height;
            public readonly Rect safeArea;

            public AspectCase(string name, int width, int height, Rect safeArea)
            {
                this.name = name;
                this.width = width;
                this.height = height;
                this.safeArea = safeArea;
            }
        }

        private static Vector2 VirtualSafeSize(AspectCase aspect, Rect safeArea, CanvasScaler scaler)
        {
            return safeArea.size / CanvasScale(aspect, scaler);
        }

        private static float CanvasScale(AspectCase aspect, CanvasScaler scaler)
        {
            var reference = scaler.referenceResolution;
            var logWidth = Mathf.Log(aspect.width / reference.x, 2f);
            var logHeight = Mathf.Log(aspect.height / reference.y, 2f);
            return Mathf.Max(
                0.0001f,
                Mathf.Pow(2f, Mathf.Lerp(logWidth, logHeight, scaler.matchWidthOrHeight)));
        }

        private static void AssertTouchTargets(
            IReadOnlyList<Button> buttons,
            IReadOnlyList<AspectCase> cases,
            RectTransform safeRoot,
            CanvasScaler scaler,
            float minimumWidth,
            float minimumHeight)
        {
            foreach (var aspect in cases)
            {
                var clamped = SafeAreaPanel.ClampToScreen(aspect.safeArea, aspect.width, aspect.height);
                Assert.That(clamped.xMin, Is.GreaterThanOrEqualTo(0f), aspect.name);
                Assert.That(clamped.yMin, Is.GreaterThanOrEqualTo(0f), aspect.name);
                Assert.That(clamped.xMax, Is.LessThanOrEqualTo(aspect.width), aspect.name);
                Assert.That(clamped.yMax, Is.LessThanOrEqualTo(aspect.height), aspect.name);

                var canvasScale = CanvasScale(aspect, scaler);
                var virtualSafeSize = VirtualSafeSize(aspect, clamped, scaler);
                foreach (var button in buttons)
                {
                    var rect = (RectTransform)button.transform;
                    var simulatedPixels = SimulatedSizeWithinSafeRoot(rect, safeRoot, virtualSafeSize) * canvasScale;
                    Assert.That(simulatedPixels.x, Is.GreaterThanOrEqualTo(minimumWidth),
                        aspect.name + "/" + button.name + " width");
                    Assert.That(simulatedPixels.y, Is.GreaterThanOrEqualTo(minimumHeight),
                        aspect.name + "/" + button.name + " height");
                    Assert.That(IsNormalizedInsideParent(rect), Is.True,
                        aspect.name + "/" + button.name + " anchors");
                }
            }
        }

        private static void AssertGridFits(
            GridLayoutGroup grid,
            int childCount,
            IReadOnlyList<AspectCase> cases,
            RectTransform safeRoot,
            CanvasScaler scaler)
        {
            Assert.That(grid.constraint, Is.EqualTo(GridLayoutGroup.Constraint.FixedColumnCount));
            var columns = Mathf.Max(1, grid.constraintCount);
            var rows = Mathf.CeilToInt(childCount / (float)columns);
            var requiredWidth = grid.padding.horizontal
                + columns * grid.cellSize.x
                + Mathf.Max(0, columns - 1) * grid.spacing.x;
            var requiredHeight = grid.padding.vertical
                + rows * grid.cellSize.y
                + Mathf.Max(0, rows - 1) * grid.spacing.y;

            foreach (var aspect in cases)
            {
                var clamped = SafeAreaPanel.ClampToScreen(aspect.safeArea, aspect.width, aspect.height);
                var virtualSafeSize = VirtualSafeSize(aspect, clamped, scaler);
                var available = SimulatedSizeWithinSafeRoot(
                    (RectTransform)grid.transform,
                    safeRoot,
                    virtualSafeSize);
                Assert.That(available.x, Is.GreaterThanOrEqualTo(requiredWidth),
                    aspect.name + "/" + grid.name + " grid width");
                Assert.That(available.y, Is.GreaterThanOrEqualTo(requiredHeight),
                    aspect.name + "/" + grid.name + " grid height");
            }
        }

        private static Vector2 SimulatedSizeWithinSafeRoot(
            RectTransform rect,
            RectTransform safeRoot,
            Vector2 virtualSafeSize)
        {
            if (rect == safeRoot) return virtualSafeSize;
            var parent = rect.parent as RectTransform;
            Assert.That(parent, Is.Not.Null, rect.name + " parent");
            var parentSize = SimulatedSizeWithinSafeRoot(parent, safeRoot, virtualSafeSize);
            var anchorSpan = rect.anchorMax - rect.anchorMin;
            var size = Vector2.Scale(parentSize, anchorSpan) + rect.sizeDelta;
            return new Vector2(Mathf.Abs(size.x), Mathf.Abs(size.y));
        }

        private static bool IsNormalizedInsideParent(RectTransform rect)
        {
            const float epsilon = 0.0001f;
            return rect.anchorMin.x >= -epsilon
                && rect.anchorMin.y >= -epsilon
                && rect.anchorMax.x <= 1f + epsilon
                && rect.anchorMax.y <= 1f + epsilon
                && rect.anchorMin.x <= rect.anchorMax.x
                && rect.anchorMin.y <= rect.anchorMax.y;
        }

        private PieceView ViewFor(MarblePieceKind kind)
        {
            return _controller.PieceViews.Values.First(view => view.Record.kind == kind);
        }

        private static bool IsTransparentRenderer(Renderer renderer)
        {
            var material = renderer.sharedMaterial;
            return material != null && material.renderQueue >= 3000 && material.color.a < 0.90f;
        }

        private static float RendererHeight(PieceView view)
        {
            var renderers = view.GetComponentsInChildren<Renderer>();
            Assert.That(renderers.Length, Is.GreaterThan(0), view.Record.kind.ToString());
            var minimum = renderers[0].bounds.min.y;
            var maximum = renderers[0].bounds.max.y;
            for (var index = 1; index < renderers.Length; index++)
            {
                minimum = Mathf.Min(minimum, renderers[index].bounds.min.y);
                maximum = Mathf.Max(maximum, renderers[index].bounds.max.y);
            }
            return maximum - minimum;
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
