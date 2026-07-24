using NUnit.Framework;
using Pono.TownCraft.Editor;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Tilemaps;

namespace Pono.TownCraft.Tests.EditMode
{
    public sealed class TownCraftTilemapEditorTests
    {
        [Test]
        public void WorkspaceContainsSeparatePurposeBuiltTilemapLayers()
        {
            TownCraftTilemapSetup.RebuildWorkspace();
            EditorSceneManager.OpenScene(TownCraftTilemapSetup.ScenePath);
            foreach (var layerName in TownCraftTilemapSetup.LayerNames)
                Assert.That(TownCraftTilemapSetup.FindLayer(layerName), Is.Not.Null, layerName);
        }

        [Test]
        public void RoadUsesOneRuleTilePerGridCell()
        {
            TownCraftTilemapSetup.RebuildWorkspace();
            EditorSceneManager.OpenScene(TownCraftTilemapSetup.ScenePath);
            var road = TownCraftTilemapSetup.FindLayer("Road");
            Assert.That(road.GetTile(new Vector3Int(2, 6, 0)), Is.InstanceOf<RuleTile>());
            Assert.That(road.GetTile(new Vector3Int(3, 6, 0)),
                Is.SameAs(road.GetTile(new Vector3Int(2, 6, 0))));
            Assert.That(road.GetCellCenterWorld(new Vector3Int(3, 6, 0)).x -
                road.GetCellCenterWorld(new Vector3Int(2, 6, 0)).x, Is.EqualTo(1f));
        }

        [Test]
        public void MasterPaletteIsGenerated()
        {
            TownCraftTilemapSetup.RebuildWorkspace();
            Assert.That(AssetDatabase.LoadAssetAtPath<GameObject>(TownCraftTilemapSetup.PalettePath), Is.Not.Null);
        }
    }
}
