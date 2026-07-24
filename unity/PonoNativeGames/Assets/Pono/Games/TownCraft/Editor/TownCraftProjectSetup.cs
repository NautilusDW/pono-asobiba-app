using System;
using System.IO;
using Pono.TownCraft;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Pono.TownCraft.Editor
{
    public static class TownCraftProjectSetup
    {
        public const string ScenePath = "Assets/Pono/Games/TownCraft/Scenes/92_TownCraft.unity";
        private const string ResourceRoot = "Assets/Pono/Games/TownCraft/Content/Resources/TownCraft";

        [MenuItem("Pono/TownCraft/Rebuild Scene")]
        public static void RebuildScene()
        {
            TownCraftTilemapSetup.RebuildWorkspace();
        }

        [MenuItem("Pono/TownCraft/Verify")]
        public static void Verify()
        {
            var errors = 0;
            errors += RequireAsset<SceneAsset>(ScenePath);
            foreach (var house in TownCraftCatalog.Houses)
                errors += RequireAsset<Sprite>($"{ResourceRoot}/Houses/{house.ResourceName}.png");
            foreach (var tile in new[] { "ground_grass", "ground_dirt", "ground_water", "river_edge_s", "cliff_edge_s", "cliff_stairs", "bridge_water_vertical" })
                errors += RequireAsset<Sprite>($"{ResourceRoot}/Tiles/{tile}.png");
            foreach (var prop in new[] { "tree_round", "streetlamp_green", "fence_straight", "vegetable_share_stand" })
                errors += RequireAsset<Sprite>($"{ResourceRoot}/Props/{prop}.png");
            errors += RequireAsset<UnityEngine.Tilemaps.TileBase>(TownCraftTilemapSetup.RoadRulePath);
            errors += RequireAsset<UnityEngine.Tilemaps.TileBase>(TownCraftTilemapSetup.WaterRulePath);
            errors += RequireAsset<GameObject>(TownCraftTilemapSetup.PalettePath);
            if (TownCraftCatalog.Houses.Length != 15)
            {
                Debug.LogError($"Expected 15 houses, got {TownCraftCatalog.Houses.Length}.");
                errors++;
            }
            if (errors > 0) throw new InvalidOperationException($"TownCraft verification failed with {errors} error(s).");
            Debug.Log("[TownCraft] Verification passed.");
        }

        public static void SetupFromCommandLine()
        {
            RebuildScene();
            Verify();
        }

        public static void BuildMacFromCommandLine()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null) RebuildScene();
            Verify();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/PonoTownCraft.app");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/macOS");
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.StandaloneOSX,
                options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException($"TownCraft build failed: {report.summary.result}, {report.summary.totalErrors} errors.");
            Debug.Log($"[TownCraft] macOS build succeeded: {output} ({report.summary.totalSize} bytes)");
        }

        private static void ConfigureSprites()
        {
            foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { ResourceRoot }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (AssetImporter.GetAtPath(path) is not TextureImporter importer) continue;
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.spritePixelsPerUnit = path.Contains("/Houses/") ? 192f :
                    path.Contains("/DualGrid/") ? 128f : 256f;
                importer.filterMode = path.Contains("/DualGrid/") ? FilterMode.Point : FilterMode.Bilinear;
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.mipmapEnabled = false;
                importer.isReadable = path.Contains("/DualGrid/");
                importer.wrapMode = TextureWrapMode.Clamp;
                importer.alphaIsTransparency = path.Contains("/Props/") || path.Contains("/Houses/");
                importer.SaveAndReimport();
            }
        }

        private static int RequireAsset<T>(string path) where T : UnityEngine.Object
        {
            if (AssetDatabase.LoadAssetAtPath<T>(path) != null) return 0;
            Debug.LogError($"Missing required asset: {path}");
            return 1;
        }

        private static void EnsureFolder(string path)
        {
            var parts = path.Split('/');
            var current = parts[0];
            for (var i = 1; i < parts.Length; i++)
            {
                var next = $"{current}/{parts[i]}";
                if (!AssetDatabase.IsValidFolder(next)) AssetDatabase.CreateFolder(current, parts[i]);
                current = next;
            }
        }

        private static string ReadCommandLineValue(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++)
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
            return null;
        }
    }
}
