// ── Pono.KawaGlint.Core / TsuriFishData.cs ──
// common/tsuri/fish-data.js の RIVER_SPECIES の純C#移植 (値そのまま)。
// Phase 0 は川5種のみ。 海種・うなぎ・わかさぎ・装備テーブルは Phase 2 以降で別担当が追加する。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>fish-data.js の RIVER_SPECIES / getSpeciesById の純C#移植。</summary>
    public static class TsuriFishData
    {
        public static readonly List<TsuriSpecies> RiverSpecies = new List<TsuriSpecies>
        {
            new TsuriSpecies
            {
                Id = "fish_ayu",
                Name = "あゆ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = "fish_ayu",
                Weight = 22f,
                HasSizeRange = true,
                SizeMinCm = 12f,
                SizeMaxCm = 22f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 8, Runs = 0 }
            },
            new TsuriSpecies
            {
                Id = "fish_nijimasu",
                Name = "にじます",
                Rarity = TsuriRarity.Normal,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_nijimasu",
                Weight = 20f,
                HasSizeRange = true,
                SizeMinCm = 20f,
                SizeMaxCm = 35f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 10, Runs = 0 }
            },
            new TsuriSpecies
            {
                Id = "zarigani",
                Name = "ざりがに",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = false,
                InventoryKey = null,
                Weight = 5f,
                HasSizeRange = true,
                SizeMinCm = 8f,
                SizeMaxCm = 12f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.2f, TapsBase = 6, Runs = 0 }
            },
            new TsuriSpecies
            {
                Id = "fish_salmon",
                Name = "さけ",
                Rarity = TsuriRarity.Rare,
                Size = "l",
                Edible = true,
                InventoryKey = "fish_salmon",
                Weight = 8f,
                HasSizeRange = true,
                SizeMinCm = 50f,
                SizeMaxCm = 75f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.9f, TapsBase = 12, Runs = 0 }
            },
            new TsuriSpecies
            {
                Id = "treasure_boot",
                Name = "ながぐつ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = false,
                InventoryKey = null,
                Weight = 4f,
                HasSizeRange = false,
                SizeMinCm = 0f,
                SizeMaxCm = 0f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.3f, TapsBase = 4, Runs = 0 }
            }
        };

        /// <summary>id → species (未知の id は null)。</summary>
        public static TsuriSpecies GetSpeciesById(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return null;
            }

            for (int i = 0; i < RiverSpecies.Count; i++)
            {
                if (RiverSpecies[i].Id == id)
                {
                    return RiverSpecies[i];
                }
            }

            return null;
        }
    }
}
