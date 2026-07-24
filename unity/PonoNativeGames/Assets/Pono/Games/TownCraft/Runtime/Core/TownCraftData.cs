using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.TownCraft
{
    public enum GroundKind { Grass, Dirt, Stone }
    public enum EditTool { Ground, Road, Water, Raise, Lower, Erase, Plant, Roadside, Fence, Building }
    public enum PlacementCategory { Building, Roadside, Vegetation, Boundary, Waterside }
    public enum TownTheme { Countryside, Modern, Future }
    public enum TerrainArtVariant { Legacy, SpriteCookRich, SpriteCookRestrained }

    [Serializable]
    public sealed class TownCell
    {
        public GroundKind ground = GroundKind.Grass;
        public bool road;
        public bool water;
        public int height;
    }

    [Serializable]
    public sealed class TownPlacement
    {
        public string id;
        public string assetId;
        public PlacementCategory category;
        public int x;
        public int y;
        public int rotation;
    }

    [Serializable]
    public sealed class TownInventory
    {
        public int townSeeds = 4;
        public int materials = 8;
        public int ideas = 3;
    }

    [Serializable]
    public sealed class TownCraftState
    {
        public const int CurrentVersion = 2;
        public int version = CurrentVersion;
        public int width = 18;
        public int height = 12;
        public TownTheme theme = TownTheme.Countryside;
        public TerrainArtVariant terrainArt = TerrainArtVariant.SpriteCookRestrained;
        public TownCell[] cells;
        public List<TownPlacement> placements = new();
        public string playerName = "わたし";
        public string selectedHouseId = "flower_cottage";
        public Color houseRoofColor = new(0.94f, 0.49f, 0.62f);
        public Color houseWallColor = new(1f, 0.94f, 0.82f);
        public Color houseDoorColor = new(0.52f, 0.30f, 0.14f);
        public TownInventory inventory = new();
        public List<string> completedRequests = new();

        public TownCell Cell(int x, int y) => cells[y * width + x];
        public bool Contains(int x, int y) => x >= 0 && y >= 0 && x < width && y < height;

        public static TownCraftState CreateDemo()
        {
            var state = new TownCraftState();
            state.cells = new TownCell[state.width * state.height];
            for (var i = 0; i < state.cells.Length; i++) state.cells[i] = new TownCell();

            for (var y = 0; y < state.height; y++)
            {
                state.Cell(12, y).water = true;
                if (y is 3 or 4) state.Cell(13, y).water = true;
            }
            for (var x = 1; x < state.width - 1; x++) state.Cell(x, 6).road = true;
            for (var y = 2; y <= 9; y++) state.Cell(7, y).road = true;
            for (var x = 3; x <= 6; x++)
            for (var y = 2; y <= 4; y++) state.Cell(x, y).height = 1;

            state.placements.Add(new TownPlacement
            {
                id = "home", assetId = "house_flower_cottage",
                category = PlacementCategory.Building, x = 8, y = 7
            });
            state.placements.Add(new TownPlacement
            {
                id = "lamp-a", assetId = "streetlamp_green_spritecook",
                category = PlacementCategory.Roadside, x = 5, y = 5
            });
            state.placements.Add(new TownPlacement
            {
                id = "tree-a", assetId = "tree_round",
                category = PlacementCategory.Vegetation, x = 2, y = 9
            });
            state.placements.Add(new TownPlacement
            {
                id = "stand-a", assetId = "vegetable_share_stand",
                category = PlacementCategory.Roadside, x = 9, y = 5
            });
            return state;
        }
    }

    public sealed class HouseDefinition
    {
        public HouseDefinition(string id, string resourceName, string displayName, string style)
        {
            Id = id;
            ResourceName = resourceName;
            DisplayName = displayName;
            Style = style;
        }

        public string Id { get; }
        public string ResourceName { get; }
        public string DisplayName { get; }
        public string Style { get; }
    }

    public static class TownCraftCatalog
    {
        public static readonly HouseDefinition[] Houses =
        {
            new("flower_cottage", "house_flower_cottage", "はなの コテージ", "かわいい"),
            new("tree", "house_tree", "きのうえハウス", "もり"),
            new("cookie", "house_cookie", "おかしの おうち", "おもしろい"),
            new("log_lodge", "house_log_lodge", "まるたの ロッジ", "ふるい"),
            new("red_brick", "house_red_brick", "あかレンガの いえ", "レトロ"),
            new("japanese_white", "house_japanese_white", "しろい まちや", "わふう"),
            new("ancient_stone", "house_ancient_stone", "こだいの いしや", "こだい"),
            new("desert_earth", "house_desert_earth", "さばくの どろハウス", "せかい"),
            new("tiny_castle", "house_tiny_castle", "ちいさな おしろ", "かっこいい"),
            new("boat", "house_boat", "ふねの おうち", "おもしろい"),
            new("mushroom", "house_mushroom", "きのこハウス", "ふしぎ"),
            new("modern_glass", "house_modern_glass", "ガラスの モダンハウス", "モダン"),
            new("future_dome", "house_future_dome", "そらいろ ドーム", "みらい"),
            new("rocket", "house_rocket", "ロケットハウス", "みらい"),
            new("hover_future", "house_hover_future", "ういてる みらいの いえ", "みらい"),
        };

        public static readonly string[] Vegetation = { "tree_round", "tree_young", "bush_round", "flowers_mixed", "rock_low" };
        public static readonly string[] Roadside = { "streetlamp_green_spritecook", "bench_wood", "mailbox_red", "notice_board_blank", "bicycle_rack", "vegetable_share_stand" };
        public static readonly string[] Boundaries = { "fence_straight", "fence_corner" };
        public static readonly string[] Waterside = { "pond_deck", "footbridge" };

        public static HouseDefinition House(string id)
        {
            foreach (var house in Houses) if (house.Id == id) return house;
            return Houses[0];
        }
    }
}
