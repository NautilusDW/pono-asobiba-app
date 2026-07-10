using System;
using System.Linq;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Editor;
using Pono.MarbleRun3D.Gameplay;
using UnityEditor;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class PieceFactoryIsolationTests
    {
        [Test]
        public void EveryPieceBuildsWithSeparatePlacementAndRunColliders()
        {
            var parent = new GameObject("test-root").transform;
            var materials = new ToyMaterialLibrary();
            try
            {
                foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
                {
                    var view = WoodenPieceFactory.Create(
                        new PieceRecord { id = kind.ToString(), kind = kind, pose = new GridPose(0, 0) },
                        materials,
                        parent,
                        false,
                        6,
                        7);
                    Assert.That(view.PlacementVolume, Is.Not.Null, kind.ToString());
                    Assert.That(view.PlacementVolume.isTrigger, Is.True, kind.ToString());
                    Assert.That(view.PlacementVolume.gameObject.layer, Is.EqualTo(6), kind.ToString());
                    var runColliders = view.GetComponentsInChildren<Collider>(true)
                        .Where(collider => collider != view.PlacementVolume && !collider.isTrigger && collider.enabled)
                        .ToArray();
                    Assert.That(runColliders.Length, Is.GreaterThan(0), kind.ToString());
                    Assert.That(runColliders.All(collider => collider.gameObject.layer == 7), Is.True, kind.ToString());
                    Assert.That(runColliders.All(collider => collider.sharedMaterial == materials.TrackPhysics), Is.True, kind.ToString());
                    UnityEngine.Object.DestroyImmediate(view.gameObject);
                }
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(parent.gameObject);
            }
        }

        [Test]
        public void StartGoalSeesawAndDominoExposeRequiredRuntimeParts()
        {
            var root = new GameObject("test-root").transform;
            var materials = new ToyMaterialLibrary();
            try
            {
                var start = Make(MarblePieceKind.Start, root, materials);
                var goal = Make(MarblePieceKind.Goal, root, materials);
                var seesaw = Make(MarblePieceKind.Seesaw, root, materials);
                var domino = Make(MarblePieceKind.Domino, root, materials);
                Assert.That(start.MarbleSpawn, Is.Not.Null);
                Assert.That(goal.GoalSensor, Is.Not.Null);
                var goalTrigger = goal.GoalSensor.GetComponent<BoxCollider>();
                Assert.That(goalTrigger.isTrigger, Is.True);
                Assert.That(goalTrigger.size.x, Is.GreaterThanOrEqualTo(2.7f));
                Assert.That(goalTrigger.size.y, Is.GreaterThanOrEqualTo(2f));
                Assert.That(seesaw.DynamicBodies.Count, Is.EqualTo(1));
                Assert.That(domino.DynamicBodies.Count, Is.EqualTo(6));
                var rails = seesaw.GetComponentsInChildren<Transform>(true)
                    .Where(child => child.name == "シーソー ひだり" || child.name == "シーソー みぎ")
                    .ToArray();
                Assert.That(rails.Length, Is.EqualTo(2));
                Assert.That(Vector3.Distance(rails[0].position, rails[1].position), Is.EqualTo(1.70f).Within(0.03f));
                Assert.That(rails.All(rail => rail.GetComponent<Renderer>().bounds.size.magnitude < 4f), Is.True);

                var funnel = Make(MarblePieceKind.Funnel, root, materials);
                var bowlColliders = funnel.GetComponentsInChildren<Collider>(true)
                    .Where(collider => collider.name == "じょうご さか" && collider.enabled)
                    .ToArray();
                Assert.That(bowlColliders.Length, Is.GreaterThanOrEqualTo(6));
                Assert.That(bowlColliders.Any(collider =>
                    Vector3.Angle(collider.transform.up, Vector3.up) > 8f), Is.True);
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(root.gameObject);
            }
        }

        [Test]
        public void TowerHelixStepsLiftAndElevatedSupportsExposeStableGeometry()
        {
            var root = new GameObject("test-root").transform;
            var materials = new ToyMaterialLibrary();
            try
            {
                Assert.That(WoodenPieceFactory.LevelHeight, Is.EqualTo(1.40f).Within(0.001f));

                var start = Make(MarblePieceKind.Start, root, materials);
                Assert.That(start.MarbleSpawn.localPosition.y, Is.GreaterThan(1.4f));
                Assert.That(start.GetComponentsInChildren<Transform>(true)
                    .Count(child => child.name == "たま いれ ふち"), Is.GreaterThanOrEqualTo(7));

                var helix = Make(MarblePieceKind.Helix, root, materials);
                Assert.That(helix.GetComponentInChildren<HelixMarbleGuide>(true), Is.Not.Null);
                var helixFloors = helix.GetComponentsInChildren<Collider>(true)
                    .Where(collider => collider.name == "ぐるぐる みち" && collider.enabled)
                    .ToArray();
                Assert.That(helixFloors.Length, Is.GreaterThanOrEqualTo(18));
                var helixBounds = helix.GetComponentsInChildren<Renderer>(true)
                    .Where(renderer => renderer.name.StartsWith("ぐるぐる"))
                    .Select(renderer => renderer.bounds)
                    .ToArray();
                Assert.That(helixBounds.Max(bounds => bounds.max.y) - helixBounds.Min(bounds => bounds.min.y),
                    Is.GreaterThan(WoodenPieceFactory.LevelHeight * 1.8f));

                var steps = Make(MarblePieceKind.Steps, root, materials);
                var stepDecorations = steps.GetComponentsInChildren<Transform>(true)
                    .Where(child => child.name == "だんだん かざり")
                    .ToArray();
                Assert.That(stepDecorations.Length, Is.EqualTo(6));
                Assert.That(stepDecorations.All(child => !child.GetComponent<Collider>().enabled), Is.True);

                var lift = Make(MarblePieceKind.Lift, root, materials);
                Assert.That(lift.GetComponentInChildren<LiftMarbleGuide>(true), Is.Not.Null);
                Assert.That(lift.GetComponentsInChildren<Transform>(true)
                    .Count(child => child.name == "のぼる ローラー"), Is.EqualTo(7));

                var elevated = WoodenPieceFactory.Create(
                    new PieceRecord
                    {
                        id = "elevated",
                        kind = MarblePieceKind.Straight,
                        pose = new GridPose(0, 0, 3)
                    },
                    materials,
                    root,
                    false,
                    6,
                    7);
                var supports = elevated.GetComponentsInChildren<Transform>(true)
                    .Where(child => child.name == "たかい みちの あし")
                    .ToArray();
                Assert.That(supports.Length, Is.EqualTo(4));
                Assert.That(supports.All(child => !child.GetComponent<Collider>().enabled), Is.True);
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(root.gameObject);
            }
        }

        [Test]
        public void VarietyPiecesExposeDistinctiveGeometryGuidesAndTransparentMaterials()
        {
            var root = new GameObject("test-root").transform;
            var materials = new ToyMaterialLibrary();
            try
            {
                var tornado = Make(MarblePieceKind.Tornado, root, materials);
                Assert.That(tornado.GetComponentInChildren<HelixMarbleGuide>(true), Is.Not.Null);
                var tornadoSegments = tornado.GetComponentsInChildren<Collider>(true)
                    .Where(collider => collider.name == "トルネード みち" && collider.enabled)
                    .ToArray();
                Assert.That(tornadoSegments.Length, Is.GreaterThanOrEqualTo(36));
                var tornadoBounds = tornado.GetComponentsInChildren<Renderer>(true)
                    .Where(renderer => renderer.name.StartsWith("トルネード"))
                    .Select(renderer => renderer.bounds)
                    .ToArray();
                Assert.That(tornadoBounds.Max(bounds => bounds.max.y) - tornadoBounds.Min(bounds => bounds.min.y),
                    Is.GreaterThan(WoodenPieceFactory.LevelHeight * 2.8f));

                var elevator = Make(MarblePieceKind.Elevator, root, materials);
                var elevatorGuide = elevator.GetComponentInChildren<ElevatorMarbleGuide>(true);
                var elevatorAnimator = elevator.GetComponentInChildren<ElevatorVisualAnimator>(true);
                Assert.That(elevatorGuide, Is.Not.Null);
                Assert.That(elevatorGuide.TravelHeight,
                    Is.EqualTo(WoodenPieceFactory.LevelHeight * 3f).Within(0.001f));
                Assert.That(elevatorAnimator, Is.Not.Null);
                Assert.That(elevatorAnimator.TravelHeight,
                    Is.EqualTo(WoodenPieceFactory.LevelHeight * 3f).Within(0.001f));
                Assert.That(elevator.GetComponentsInChildren<Transform>(true)
                    .Count(child => child.name.StartsWith("エレベーター とうめい")), Is.GreaterThanOrEqualTo(3));
                Assert.That(elevator.GetComponentsInChildren<Transform>(true)
                    .Any(child => child.name == "エレベーター うごく だい"), Is.True);

                var clearTube = Make(MarblePieceKind.ClearTube, root, materials);
                Assert.That(clearTube.GetComponentInChildren<ClearTubeMarbleGuide>(true), Is.Not.Null);
                Assert.That(clearTube.GetComponentsInChildren<Transform>(true)
                    .Any(child => child.name == "とうめい つつ やね"), Is.True);
                Assert.That(clearTube.GetComponentsInChildren<Collider>(true)
                    .Count(collider => collider.name.StartsWith("とうめい つつ") && collider.enabled),
                    Is.GreaterThanOrEqualTo(4));

                var clearCurve = Make(MarblePieceKind.ClearCurve, root, materials);
                Assert.That(clearCurve.GetComponentInChildren<ClearCurveMarbleGuide>(true), Is.Not.Null);
                Assert.That(clearCurve.GetComponentsInChildren<Transform>(true)
                    .Count(child => child.name == "とうめい カーブ そこ"), Is.EqualTo(14));

                var wave = Make(MarblePieceKind.Wave, root, materials);
                Assert.That(wave.GetComponentInChildren<WaveMarbleGuide>(true), Is.Not.Null);
                var waveFloors = wave.GetComponentsInChildren<Renderer>(true)
                    .Where(renderer => renderer.name == "なみなみ みち")
                    .Select(renderer => renderer.bounds)
                    .ToArray();
                Assert.That(waveFloors.Length, Is.EqualTo(16));
                Assert.That(waveFloors.Max(bounds => bounds.center.y) - waveFloors.Min(bounds => bounds.center.y),
                    Is.GreaterThan(0.60f));

                var spinner = Make(MarblePieceKind.Spinner, root, materials);
                Assert.That(spinner.DynamicBodies.Count, Is.EqualTo(1));
                Assert.That(spinner.GetComponentInChildren<SpinnerMarbleGuide>(true), Is.Not.Null);
                Assert.That(spinner.GetComponentsInChildren<Transform>(true)
                    .Count(child => child.name == "くるくる カラフル はね"), Is.EqualTo(6));
                Assert.That(spinner.GetComponentsInChildren<Collider>(true)
                    .Where(collider => collider.name == "くるくる カラフル はね")
                    .All(collider => !collider.enabled), Is.True,
                    "the ball-actuated guide turns the visible paddles without trapping marbles");
                Assert.That(spinner.DynamicBodies[0].GetComponent<HingeJoint>(), Is.Not.Null);

                Assert.That(materials.ClearShell.color.a, Is.InRange(0.05f, 0.35f));
                Assert.That(materials.ClearEdge.color.a, Is.InRange(0.35f, 0.75f));
                Assert.That(materials.ClearShell.renderQueue, Is.EqualTo(3000));
                Assert.That(materials.ClearShell.GetTag("RenderType", false), Is.EqualTo("Transparent"));
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(root.gameObject);
            }
        }

        [Test]
        public void ToyMaterialsUseBrightSoftPastelsAndAReadableWarmWoodBase()
        {
            var materials = new ToyMaterialLibrary();
            try
            {
                AssertSoftColor(materials.Maple.color, 0.90f, 0.42f, "cream maple");
                AssertSoftColor(materials.Board.color, 0.88f, 0.42f, "peach play board");

                Color.RGBToHSV(materials.MapleDark.color, out _, out var cocoaSaturation, out var cocoaValue);
                Assert.That(cocoaValue, Is.InRange(0.60f, 0.74f), "cocoa trim must stay readable without looking black");
                Assert.That(cocoaSaturation, Is.LessThanOrEqualTo(0.55f));
                Color.RGBToHSV(materials.BoardEdge.color, out _, out _, out var edgeValue);
                Assert.That(edgeValue, Is.GreaterThanOrEqualTo(0.58f));

                var accents = Enum.GetValues(typeof(MarblePieceKind))
                    .Cast<MarblePieceKind>()
                    .Select(materials.Accent)
                    .ToArray();
                Assert.That(accents.Distinct().Count(), Is.EqualTo(6),
                    "parts should reuse the six shared pastel materials");
                foreach (var accent in accents.Distinct())
                    AssertSoftColor(accent.color, 0.84f, 0.56f, accent.name);

                Assert.That(materials.MarbleColorCount, Is.EqualTo(6));
                for (var index = 0; index < materials.MarbleColorCount; index++)
                    AssertSoftColor(materials.MarbleAt(index).color, 0.84f, 0.56f, "marble " + index);

                Assert.That(materials.ClearShell.color.b, Is.GreaterThan(materials.ClearShell.color.r));
                Assert.That(materials.ClearShell.color.a, Is.InRange(0.12f, 0.24f));
                Assert.That(materials.ClearEdge.color.a, Is.InRange(0.42f, 0.58f));
                Assert.That(Vector3.Distance(
                    new Vector3(materials.Connector.color.r, materials.Connector.color.g, materials.Connector.color.b),
                    new Vector3(materials.Maple.color.r, materials.Maple.color.g, materials.Maple.color.b)),
                    Is.GreaterThan(0.20f), "connection points must remain distinct from the cream wood");
            }
            finally
            {
                materials.Dispose();
            }
        }

        [Test]
        public void LargePiecesStartAndGoalUseSmallSharedNonCollidingDecorations()
        {
            var root = new GameObject("test-root").transform;
            var materials = new ToyMaterialLibrary();
            var decoratedKinds = new[]
            {
                MarblePieceKind.Start,
                MarblePieceKind.Goal,
                MarblePieceKind.Tunnel,
                MarblePieceKind.Funnel,
                MarblePieceKind.Helix,
                MarblePieceKind.Steps,
                MarblePieceKind.Lift,
                MarblePieceKind.Tornado,
                MarblePieceKind.Elevator,
                MarblePieceKind.ClearTube,
                MarblePieceKind.ClearCurve,
                MarblePieceKind.Wave,
                MarblePieceKind.Spinner
            };
            try
            {
                foreach (var kind in decoratedKinds)
                {
                    var view = Make(kind, root, materials);
                    var decorations = view.GetComponentsInChildren<Transform>(true)
                        .Where(child => child.name.StartsWith("パステル かざり", StringComparison.Ordinal))
                        .ToArray();
                    Assert.That(decorations.Length, Is.InRange(3, 8), kind + " decoration budget");
                    Assert.That(decorations.All(child => child.gameObject.layer == 2), Is.True, kind.ToString());
                    Assert.That(decorations
                        .Select(child => child.GetComponent<Collider>())
                        .Where(collider => collider != null)
                        .All(collider => !collider.enabled), Is.True, kind + " decorations must never affect a marble");
                    Assert.That(decorations
                        .Select(child => child.GetComponent<Renderer>())
                        .Where(renderer => renderer != null)
                        .All(renderer => renderer.sharedMaterial != null), Is.True, kind.ToString());
                    UnityEngine.Object.DestroyImmediate(view.gameObject);
                }
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(root.gameObject);
            }
        }

        [Test]
        public void MarbleColorsActorsAndGoalSensorSupportMultipleStableMarbles()
        {
            var materials = new ToyMaterialLibrary();
            var sensorObject = new GameObject("goal-sensor");
            var firstObject = new GameObject("first-marble");
            var secondObject = new GameObject("second-marble");
            try
            {
                Assert.That(materials.MarbleColorCount, Is.GreaterThanOrEqualTo(6));
                Assert.That(materials.MarbleAt(0), Is.SameAs(materials.Marble));
                Assert.That(materials.MarbleAt(materials.MarbleColorCount), Is.SameAs(materials.MarbleAt(0)));
                Assert.That(materials.MarbleAt(-1), Is.SameAs(materials.MarbleAt(materials.MarbleColorCount - 1)));
                Assert.That(Enumerable.Range(0, materials.MarbleColorCount)
                    .Select(index => materials.MarbleAt(index).color)
                    .Distinct()
                    .Count(), Is.EqualTo(materials.MarbleColorCount));

                var first = firstObject.AddComponent<MarbleActor>();
                var second = secondObject.AddComponent<MarbleActor>();
                first.Configure(5);
                second.Configure(6);
                Assert.That(first.Index, Is.EqualTo(5));
                Assert.That(first.StableId, Is.EqualTo("marble-05"));

                var sensor = sensorObject.AddComponent<GoalSensor>();
                var entered = 0;
                sensor.MarbleEntered += _ => entered++;
                Assert.That(sensor.NotifyMarble(first), Is.True);
                Assert.That(sensor.NotifyMarble(first), Is.False);
                Assert.That(sensor.NotifyMarble(second), Is.True);
                Assert.That(entered, Is.EqualTo(2), "each marble should notify once per run");
                sensor.ResetSensor();
                Assert.That(sensor.NotifyMarble(first), Is.True);
                Assert.That(entered, Is.EqualTo(3));
            }
            finally
            {
                materials.Dispose();
                UnityEngine.Object.DestroyImmediate(sensorObject);
                UnityEngine.Object.DestroyImmediate(firstObject);
                UnityEngine.Object.DestroyImmediate(secondObject);
            }
        }

        [Test]
        public void CameraFramesCourseHeightAndTogglesTopView()
        {
            var cameraObject = new GameObject("camera", typeof(Camera), typeof(OrbitCameraController));
            try
            {
                var orbit = cameraObject.GetComponent<OrbitCameraController>();
                orbit.ConfigureDefault();
                orbit.FrameCourse(new[]
                {
                    new Vector3(-12f, WoodenPieceFactory.PieceRootY, -9f),
                    new Vector3(12f, WoodenPieceFactory.PieceRootY + WoodenPieceFactory.LevelHeight * 4f, 9f)
                });
                Assert.That(orbit.Target.x, Is.EqualTo(0f).Within(0.001f));
                Assert.That(orbit.Target.y, Is.GreaterThan(WoodenPieceFactory.LevelHeight * 2f));
                Assert.That(orbit.Distance, Is.GreaterThan(20f));
                Assert.That(orbit.IsTopView, Is.False);
                orbit.ToggleTopView();
                Assert.That(orbit.IsTopView, Is.True);
                Assert.That(orbit.Pitch, Is.EqualTo(78f).Within(0.001f));
                orbit.ToggleTopView();
                Assert.That(orbit.IsTopView, Is.False);
                Assert.That(orbit.Pitch, Is.EqualTo(48f).Within(0.001f));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(cameraObject);
            }
        }

        [Test]
        public void ProjectIsIndependentAndBuildSceneIsExplicit()
        {
            Assert.That(AssetDatabase.LoadAssetAtPath<SceneAsset>(MarbleRunProjectSetup.ScenePath), Is.Not.Null);
            Assert.That(EditorBuildSettings.scenes.Length, Is.EqualTo(1));
            Assert.That(EditorBuildSettings.scenes[0].path, Is.EqualTo(MarbleRunProjectSetup.ScenePath));
            Assert.That(ChildFacingTextValidator.IsKanaSafe(PlayerSettings.productName, out var invalid), Is.True,
                "launcher label invalid=" + invalid);
            var scripts = AssetDatabase.FindAssets("t:MonoScript", new[] { "Assets/PonoMarbleRun" });
            foreach (var guid in scripts)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                Assert.That(path, Does.Not.Contain("FluidInk"));
                Assert.That(path, Does.Not.Contain("HideSeek"));
            }
        }

        [Test]
        public void AndroidDefaultQualityUsesMobileTunedValues()
        {
            var original = QualitySettings.GetQualityLevel();
            try
            {
                Assert.That(QualitySettings.names[2], Is.EqualTo("Medium"));
                QualitySettings.SetQualityLevel(2, false);
                Assert.That(QualitySettings.antiAliasing, Is.EqualTo(2));
                Assert.That(QualitySettings.shadowDistance, Is.EqualTo(24f).Within(0.001f));
            }
            finally
            {
                QualitySettings.SetQualityLevel(original, false);
            }
        }

        private static PieceView Make(MarblePieceKind kind, Transform root, ToyMaterialLibrary materials)
        {
            return WoodenPieceFactory.Create(
                new PieceRecord { id = kind.ToString(), kind = kind, pose = new GridPose(0, 0) },
                materials,
                root,
                false,
                6,
                7);
        }

        private static void AssertSoftColor(Color color, float minimumValue, float maximumSaturation, string label)
        {
            Color.RGBToHSV(color, out _, out var saturation, out var value);
            Assert.That(value, Is.GreaterThanOrEqualTo(minimumValue), label + " should stay bright");
            Assert.That(saturation, Is.LessThanOrEqualTo(maximumSaturation), label + " should stay softly saturated");
            Assert.That(saturation, Is.GreaterThanOrEqualTo(0.18f), label + " should still be distinguishable");
        }
    }
}
