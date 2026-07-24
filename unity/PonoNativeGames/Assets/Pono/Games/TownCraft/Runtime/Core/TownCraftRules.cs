using System;
using UnityEngine;

namespace Pono.TownCraft
{
    public static class TownCraftRules
    {
        public const int North = 1;
        public const int East = 2;
        public const int South = 4;
        public const int West = 8;

        public static int ConnectionMask(TownCraftState state, int x, int y, Func<TownCell, bool> matches)
        {
            var mask = 0;
            if (state.Contains(x, y + 1) && matches(state.Cell(x, y + 1))) mask |= North;
            if (state.Contains(x + 1, y) && matches(state.Cell(x + 1, y))) mask |= East;
            if (state.Contains(x, y - 1) && matches(state.Cell(x, y - 1))) mask |= South;
            if (state.Contains(x - 1, y) && matches(state.Cell(x - 1, y))) mask |= West;
            return mask;
        }

        public static bool IsRoadside(TownCraftState state, int x, int y)
        {
            if (!state.Contains(x, y) || state.Cell(x, y).road || state.Cell(x, y).water) return false;
            return ConnectionMask(state, x, y, c => c.road) != 0;
        }

        public static bool IsWaterside(TownCraftState state, int x, int y)
        {
            if (!state.Contains(x, y) || state.Cell(x, y).water) return false;
            return ConnectionMask(state, x, y, c => c.water) != 0;
        }

        public static bool IsOccupied(TownCraftState state, int x, int y)
        {
            foreach (var placement in state.placements)
                if (placement.x == x && placement.y == y) return true;
            return false;
        }

        public static bool CanPlace(TownCraftState state, PlacementCategory category, int x, int y, out string reason)
        {
            reason = "";
            if (!state.Contains(x, y)) { reason = "ここには おけないよ"; return false; }
            var cell = state.Cell(x, y);
            if (cell.water && category != PlacementCategory.Waterside) { reason = "みずの うえには おけないよ"; return false; }
            if (IsOccupied(state, x, y)) { reason = "ここには もう あるよ"; return false; }

            switch (category)
            {
                case PlacementCategory.Building:
                    if (cell.road || cell.water) { reason = "たいらな じめんに おこう"; return false; }
                    if (!IsRoadside(state, x, y)) { reason = "おうちは みちの そばに おこう"; return false; }
                    return true;
                case PlacementCategory.Roadside:
                    if (!IsRoadside(state, x, y)) { reason = "みちの そばに おこう"; return false; }
                    return true;
                case PlacementCategory.Vegetation:
                    if (cell.road || cell.water) { reason = "くさの ところに おこう"; return false; }
                    return true;
                case PlacementCategory.Boundary:
                    if (cell.road || cell.water) { reason = "じめんの はしに おこう"; return false; }
                    return true;
                case PlacementCategory.Waterside:
                    if (!IsWaterside(state, x, y)) { reason = "みずの そばに おこう"; return false; }
                    return true;
                default:
                    return false;
            }
        }

        public static void ApplyTool(TownCraftState state, EditTool tool, int x, int y)
        {
            if (!state.Contains(x, y)) return;
            var cell = state.Cell(x, y);
            switch (tool)
            {
                case EditTool.Ground:
                    cell.ground = cell.ground == GroundKind.Grass ? GroundKind.Dirt : GroundKind.Grass;
                    cell.road = false; cell.water = false; break;
                case EditTool.Road:
                    cell.road = true; cell.water = false; break;
                case EditTool.Water:
                    cell.water = true; cell.road = false; cell.height = 0; break;
                case EditTool.Raise:
                    if (!cell.water) cell.height = Mathf.Min(2, cell.height + 1); break;
                case EditTool.Lower:
                    cell.height = Mathf.Max(0, cell.height - 1); break;
                case EditTool.Erase:
                    cell.road = false; cell.water = false; cell.height = 0; cell.ground = GroundKind.Grass;
                    state.placements.RemoveAll(p => p.x == x && p.y == y);
                    break;
            }
        }
    }

    [Serializable]
    public sealed class TownRequest
    {
        public string id;
        public string title;
        public string cropId;
        public int cropCount;
        public int materialReward;
        public int ideaReward;
    }

    public static class TownRequestCatalog
    {
        public static readonly TownRequest[] Requests =
        {
            new() { id = "salad_day", title = "サラダの おすそわけ", cropId = "tomato", cropCount = 2, materialReward = 2, ideaReward = 1 },
            new() { id = "warm_soup", title = "あったか スープ", cropId = "onion", cropCount = 2, materialReward = 3, ideaReward = 0 },
            new() { id = "park_picnic", title = "こうえんの ピクニック", cropId = "potato", cropCount = 2, materialReward = 2, ideaReward = 1 },
        };

        public static void Complete(TownCraftState state, TownRequest request)
        {
            if (state.completedRequests.Contains(request.id)) return;
            state.completedRequests.Add(request.id);
            state.inventory.materials += request.materialReward;
            state.inventory.ideas += request.ideaReward;
        }
    }
}
