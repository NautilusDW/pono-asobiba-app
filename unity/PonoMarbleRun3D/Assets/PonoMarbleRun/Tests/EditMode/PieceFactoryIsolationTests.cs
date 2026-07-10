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
