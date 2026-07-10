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
    }
}
