using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Pono.TownCraft;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Tilemaps;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Tilemaps;

namespace Pono.TownCraft.Editor
{
    public static class TownCraftTilemapSetup
    {
        public const string ScenePath = "Assets/Pono/Games/TownCraft/Scenes/92_TownCraft.unity";
        public const string TileAssetRoot = "Assets/Pono/Games/TownCraft/Content/TileAssets";
        public const string PaletteRoot = "Assets/Pono/Games/TownCraft/Content/Palettes";
        public const string PalettePath = PaletteRoot + "/TownCraft_Master.prefab";
        public const string RoadRulePath = TileAssetRoot + "/Rules/road_rule.asset";
        public const string WaterRulePath = TileAssetRoot + "/Rules/water_rule.asset";
        private const string ResourceRoot = "Assets/Pono/Games/TownCraft/Content/Resources/TownCraft";

        public static readonly string[] LayerNames =
        {
            "Ground", "Elevation", "Road", "Water", "Buildings",
            "Roadside", "Vegetation", "Boundary", "Waterside"
        };

        [MenuItem("Pono/TownCraft/1. Rebuild Tilemap Workspace")]
        public static void RebuildWorkspace()
        {
            EnsureFolder(TileAssetRoot);
            EnsureFolder(PaletteRoot);
            EnsureFolder(Path.GetDirectoryName(ScenePath)?.Replace('\\', '/'));
            ConfigureSprites();

            var tiles = CreateTileAssets();
            CreateMasterPalette(tiles);
            CreateTilemapScene(tiles);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[TownCraft Tilemap] Workspace rebuilt: Grid, 9 Tilemaps, Rule Tiles, and master palette.");
        }

        [MenuItem("Pono/TownCraft/2. Open Builder Workspace")]
        public static void OpenWorkspace()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null ||
                AssetDatabase.LoadAssetAtPath<GameObject>(PalettePath) == null)
                RebuildWorkspace();

            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            SelectLayer("Road");
            EditorApplication.ExecuteMenuItem("Window/2D/Tile Palette");
            SceneView.lastActiveSceneView?.FrameSelected();
            Debug.Log("[TownCraft Tilemap] Paint one white grid cell at a time. Select the target layer in Hierarchy, then choose a tile in Tile Palette.");
        }

        [MenuItem("Pono/TownCraft/Select Layer/Ground")]
        public static void SelectGround() => SelectLayer("Ground");
        [MenuItem("Pono/TownCraft/Select Layer/Road")]
        public static void SelectRoad() => SelectLayer("Road");
        [MenuItem("Pono/TownCraft/Select Layer/Water")]
        public static void SelectWater() => SelectLayer("Water");
        [MenuItem("Pono/TownCraft/Select Layer/Buildings")]
        public static void SelectBuildings() => SelectLayer("Buildings");
        [MenuItem("Pono/TownCraft/Select Layer/Roadside")]
        public static void SelectRoadside() => SelectLayer("Roadside");
        [MenuItem("Pono/TownCraft/Select Layer/Vegetation")]
        public static void SelectVegetation() => SelectLayer("Vegetation");
        [MenuItem("Pono/TownCraft/Select Layer/Boundary")]
        public static void SelectBoundary() => SelectLayer("Boundary");
        [MenuItem("Pono/TownCraft/Select Layer/Waterside")]
        public static void SelectWaterside() => SelectLayer("Waterside");

        public static Tilemap FindLayer(string name)
        {
            var grid = GameObject.Find("TownCraft Grid");
            return grid == null ? null : grid.transform.Find(name)?.GetComponent<Tilemap>();
        }

        public static void SelectLayer(string name)
        {
            var layer = FindLayer(name);
            if (layer == null) return;
            Selection.activeGameObject = layer.gameObject;
            EditorGUIUtility.PingObject(layer.gameObject);
        }

        private static Dictionary<string, TileBase> CreateTileAssets()
        {
            var tiles = new Dictionary<string, TileBase>();
            tiles["grass"] = CreateTile("Terrain/grass.asset", LoadSprite("Tiles/ground_grass"), "くさ");
            tiles["dirt"] = CreateTile("Terrain/dirt.asset", LoadSprite("Tiles/ground_dirt"), "つち");
            tiles["stone"] = CreateTile("Terrain/stone.asset", LoadSprite("Tiles/ground_stone"), "いし");
            tiles["road"] = CreateRuleTile("Rules/road_rule.asset", LoadSprite("Tiles/ground_dirt"), "みち");
            tiles["water"] = CreateRuleTile("Rules/water_rule.asset", LoadSprite("Tiles/ground_water"), "かわ");
            tiles["cliff"] = CreateTile("Terrain/cliff.asset", LoadSprite("Tiles/cliff_edge_s"), "だんさ");

            foreach (var id in TownCraftCatalog.Vegetation)
                tiles[id] = CreateTile($"Vegetation/{id}.asset", LoadSprite($"Props/{id}"), id);
            foreach (var id in TownCraftCatalog.Roadside)
                tiles[id] = CreateTile($"Roadside/{id}.asset", LoadSprite($"Props/{id}"), id);
            foreach (var id in TownCraftCatalog.Boundaries)
                tiles[id] = CreateTile($"Boundary/{id}.asset", LoadSprite($"Props/{id}"), id);
            foreach (var id in TownCraftCatalog.Waterside)
                tiles[id] = CreateTile($"Waterside/{id}.asset", LoadSprite($"Props/{id}"), id);
            foreach (var house in TownCraftCatalog.Houses)
                tiles[house.ResourceName] = CreateTile($"Buildings/{house.ResourceName}.asset",
                    LoadSprite($"Houses/{house.ResourceName}"), house.DisplayName);
            return tiles;
        }

        private static Tile CreateTile(string relativePath, Sprite sprite, string displayName)
        {
            var path = $"{TileAssetRoot}/{relativePath}";
            EnsureFolder(Path.GetDirectoryName(path)?.Replace('\\', '/'));
            var tile = AssetDatabase.LoadAssetAtPath<Tile>(path);
            if (tile == null)
            {
                tile = ScriptableObject.CreateInstance<Tile>();
                AssetDatabase.CreateAsset(tile, path);
            }
            tile.name = displayName;
            tile.sprite = sprite;
            tile.colliderType = Tile.ColliderType.None;
            tile.flags = TileFlags.LockColor | TileFlags.LockTransform;
            EditorUtility.SetDirty(tile);
            return tile;
        }

        private static RuleTile CreateRuleTile(string relativePath, Sprite sprite, string displayName)
        {
            var path = $"{TileAssetRoot}/{relativePath}";
            EnsureFolder(Path.GetDirectoryName(path)?.Replace('\\', '/'));
            var tile = AssetDatabase.LoadAssetAtPath<RuleTile>(path);
            if (tile == null)
            {
                tile = ScriptableObject.CreateInstance<RuleTile>();
                AssetDatabase.CreateAsset(tile, path);
            }
            tile.name = displayName;
            tile.m_DefaultSprite = sprite;
            tile.m_DefaultColliderType = Tile.ColliderType.None;
            tile.m_TilingRules.Clear();
            EditorUtility.SetDirty(tile);
            return tile;
        }

        private static void CreateMasterPalette(IReadOnlyDictionary<string, TileBase> tiles)
        {
            if (AssetDatabase.LoadAssetAtPath<GameObject>(PalettePath) == null)
                GridPaletteUtility.CreateNewPalette(PaletteRoot, "TownCraft_Master",
                    GridLayout.CellLayout.Rectangle, GridPalette.CellSizing.Manual,
                    Vector3.one, GridLayout.CellSwizzle.XYZ);

            var root = PrefabUtility.LoadPrefabContents(PalettePath);
            try
            {
                var palette = root.GetComponentInChildren<Tilemap>();
                palette.ClearAllTiles();
                var rows = new List<IReadOnlyList<string>>
                {
                    new[] { "grass", "dirt", "stone", "cliff", "road", "water" },
                    TownCraftCatalog.Vegetation,
                    TownCraftCatalog.Roadside,
                    TownCraftCatalog.Boundaries.Concat(TownCraftCatalog.Waterside).ToArray(),
                    TownCraftCatalog.Houses.Select(h => h.ResourceName).ToArray()
                };
                for (var row = 0; row < rows.Count; row++)
                for (var column = 0; column < rows[row].Count; column++)
                    if (tiles.TryGetValue(rows[row][column], out var tile))
                        palette.SetTile(new Vector3Int(column, -row, 0), tile);
                palette.CompressBounds();
                PrefabUtility.SaveAsPrefabAsset(root, PalettePath);
            }
            finally
            {
                PrefabUtility.UnloadPrefabContents(root);
            }
        }

        private static void CreateTilemapScene(IReadOnlyDictionary<string, TileBase> tiles)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 6.8f;
            camera.backgroundColor = new Color(0.64f, 0.83f, 0.94f);
            cameraObject.transform.position = new Vector3(8.5f, 5.5f, -10f);

            var gridObject = new GameObject("TownCraft Grid");
            var grid = gridObject.AddComponent<Grid>();
            grid.cellSize = Vector3.one;
            grid.cellLayout = GridLayout.CellLayout.Rectangle;

            var layers = new Dictionary<string, Tilemap>();
            for (var index = 0; index < LayerNames.Length; index++)
                layers[LayerNames[index]] = CreateLayer(gridObject.transform, LayerNames[index], index);

            for (var y = 0; y < 12; y++)
            for (var x = 0; x < 18; x++)
                layers["Ground"].SetTile(new Vector3Int(x, y, 0), tiles["grass"]);

            for (var x = 2; x <= 11; x++)
                layers["Road"].SetTile(new Vector3Int(x, 6, 0), tiles["road"]);
            for (var y = 2; y <= 9; y++)
                layers["Road"].SetTile(new Vector3Int(7, y, 0), tiles["road"]);
            for (var y = 1; y <= 10; y++)
                layers["Water"].SetTile(new Vector3Int(14, y, 0), tiles["water"]);

            layers["Buildings"].SetTile(new Vector3Int(9, 7, 0), tiles["house_flower_cottage"]);
            layers["Vegetation"].SetTile(new Vector3Int(3, 9, 0), tiles["tree_round"]);
            layers["Roadside"].SetTile(new Vector3Int(5, 7, 0), tiles["streetlamp_green_spritecook"]);
            layers["Boundary"].SetTile(new Vector3Int(10, 5, 0), tiles["fence_straight"]);
            layers["Waterside"].SetTile(new Vector3Int(13, 5, 0), tiles["pond_deck"]);

            var guide = new GameObject("README - Window > 2D > Tile Palette");
            guide.transform.SetParent(gridObject.transform);
            EditorSceneManager.SaveScene(scene, ScenePath);
        }

        private static Tilemap CreateLayer(Transform parent, string name, int order)
        {
            var layer = new GameObject(name);
            layer.transform.SetParent(parent, false);
            var tilemap = layer.AddComponent<Tilemap>();
            tilemap.tileAnchor = new Vector3(0.5f, 0.5f, 0f);
            var renderer = layer.AddComponent<TilemapRenderer>();
            renderer.sortingOrder = order * 10;
            return tilemap;
        }

        private static Sprite LoadSprite(string relativePath) =>
            AssetDatabase.LoadAssetAtPath<Sprite>($"{ResourceRoot}/{relativePath}.png");

        private static void ConfigureSprites()
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { ResourceRoot }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (AssetImporter.GetAtPath(path) is not TextureImporter importer) continue;
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.spritePixelsPerUnit = path.Contains("/Houses/") ? 192f : 256f;
                importer.filterMode = FilterMode.Bilinear;
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.mipmapEnabled = false;
                importer.wrapMode = TextureWrapMode.Clamp;
                importer.alphaIsTransparency = path.Contains("/Props/") || path.Contains("/Houses/");
                importer.SaveAndReimport();
            }
        }

        private static void EnsureFolder(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return;
            var parts = path.Split('/');
            var current = parts[0];
            for (var index = 1; index < parts.Length; index++)
            {
                var next = $"{current}/{parts[index]}";
                if (!AssetDatabase.IsValidFolder(next)) AssetDatabase.CreateFolder(current, parts[index]);
                current = next;
            }
        }
    }
}
