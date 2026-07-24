using System;
using System.IO;
using UnityEngine;

namespace Pono.TownCraft
{
    public static class TownCraftStore
    {
        public const string FileName = "pono-towncraft-v1.json";
        public static string SavePath => Path.Combine(Application.persistentDataPath, FileName);

        public static void Save(TownCraftState state)
        {
            var json = JsonUtility.ToJson(state, true);
            var temp = SavePath + ".tmp";
            File.WriteAllText(temp, json);
            if (File.Exists(SavePath)) File.Copy(SavePath, SavePath + ".bak", true);
            if (File.Exists(SavePath)) File.Delete(SavePath);
            File.Move(temp, SavePath);
        }

        public static TownCraftState LoadOrDemo()
        {
            try
            {
                if (!File.Exists(SavePath)) return TownCraftState.CreateDemo();
                var state = JsonUtility.FromJson<TownCraftState>(File.ReadAllText(SavePath));
                if (state == null || state.version != TownCraftState.CurrentVersion ||
                    state.width < 8 || state.height < 8 || state.cells == null ||
                    state.cells.Length != state.width * state.height)
                    return TownCraftState.CreateDemo();
                state.placements ??= new();
                state.inventory ??= new TownInventory();
                state.completedRequests ??= new();
                return state;
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"TownCraft save recovery: {exception.Message}");
                return TownCraftState.CreateDemo();
            }
        }
    }
}
