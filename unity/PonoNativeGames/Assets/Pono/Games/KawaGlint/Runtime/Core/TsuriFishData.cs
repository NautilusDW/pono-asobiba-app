// ── Pono.KawaGlint.Core / TsuriFishData.cs ──
// common/tsuri/fish-data.js の RIVER_SPECIES の純C#移植 (値そのまま)。
// 海拡張 (KawaGlint 海拡張 実装契約 v1.0 §A-3) で NewSpecies (海種10種) を追加し、
// AllSpecies = RiverSpecies + NewSpecies を公開する。 RiverSpecies の既存5エントリの
// 値・順序は不変 (Zones/RepresentativeNiche のみ純加算)。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>fish-data.js の RIVER_SPECIES / getSpeciesById の純C#移植 + 海拡張新種。</summary>
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
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 8, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.Midwater
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
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 10, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.Midwater
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
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.2f, TapsBase = 6, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
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
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.9f, TapsBase = 12, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River, TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.Surface
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
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.3f, TapsBase = 4, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
            }
        };

        /// <summary>
        /// 海拡張 (v1.1) で新採用した10種。 §3.2 の Spawns テーブルが物理的に要求するため
        /// (v1.1 新採用の karei/kaigara/iwashi/ika だけでなく) 10種すべてを登録する
        /// (さもなくば sunahama 等が正規化でほぼ空になるため)。
        /// </summary>
        public static readonly List<TsuriSpecies> NewSpecies = new List<TsuriSpecies>
        {
            new TsuriSpecies
            {
                Id = "fish_unagi",
                Name = "うなぎ",
                Rarity = TsuriRarity.Super,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_unagi",
                Weight = 8f,
                HasSizeRange = true,
                SizeMinCm = 45f,
                SizeMaxCm = 80f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.85f, TapsBase = 14, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_aji",
                Name = "あじ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = "fish_aji",
                Weight = 20f,
                HasSizeRange = true,
                SizeMinCm = 15f,
                SizeMaxCm = 30f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 9, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.Midwater
            },
            new TsuriSpecies
            {
                Id = "fish_ebi",
                Name = "えび",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = "fish_ebi",
                Weight = 18f,
                HasSizeRange = true,
                SizeMinCm = 8f,
                SizeMaxCm = 15f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.1f, TapsBase = 7, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_karei",
                Name = "かれい",
                Rarity = TsuriRarity.Normal,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_karei",
                Weight = 16f,
                HasSizeRange = true,
                SizeMinCm = 20f,
                SizeMaxCm = 40f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.0f, TapsBase = 10, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "hitode",
                Name = "ひとで",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = false,
                InventoryKey = null,
                Weight = 6f,
                HasSizeRange = true,
                SizeMinCm = 6f,
                SizeMaxCm = 15f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.2f, TapsBase = 5, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "treasure_kaigara",
                Name = "きらきらの かいがら",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = false,
                InventoryKey = null,
                Weight = 7f,
                HasSizeRange = false,
                SizeMinCm = 0f,
                SizeMaxCm = 0f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.3f, TapsBase = 4, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_iwashi",
                Name = "いわし",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = "fish_iwashi",
                Weight = 22f,
                HasSizeRange = true,
                SizeMinCm = 10f,
                SizeMaxCm = 20f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.1f, TapsBase = 6, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.Surface
            },
            new TsuriSpecies
            {
                Id = "fish_tai",
                Name = "たい",
                Rarity = TsuriRarity.Rare,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_tai",
                Weight = 12f,
                HasSizeRange = true,
                SizeMinCm = 30f,
                SizeMaxCm = 60f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.9f, TapsBase = 12, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.DeepOpen
            },
            new TsuriSpecies
            {
                Id = "fish_ika",
                Name = "いか",
                Rarity = TsuriRarity.Rare,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_ika",
                Weight = 10f,
                HasSizeRange = true,
                SizeMinCm = 20f,
                SizeMaxCm = 40f,
                // tug未実装裁定: Runs は全種0 (「ドラッグ必須の魚は存在しない」不変条件)。
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.9f, TapsBase = 11, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_maguro",
                Name = "まぐろ",
                Rarity = TsuriRarity.Super,
                Size = "l",
                Edible = true,
                // §6.1 ゲート7確定: 食用/在庫インポータの規則とは独立に、まぐろは
                // InventoryKey を意図的に null にする (食材在庫連携は対象外)。
                InventoryKey = null,
                Weight = 8f,
                HasSizeRange = true,
                SizeMinCm = 80f,
                SizeMaxCm = 150f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.8f, TapsBase = 16, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.DeepOpen
            }
        };

        /// <summary>RiverSpecies (既存5種、不変) + NewSpecies (海拡張10種) の全種マスター。</summary>
        public static readonly List<TsuriSpecies> AllSpecies = BuildAllSpecies();

        private static List<TsuriSpecies> BuildAllSpecies()
        {
            var all = new List<TsuriSpecies>(RiverSpecies.Count + NewSpecies.Count);
            all.AddRange(RiverSpecies);
            all.AddRange(NewSpecies);
            return all;
        }

        /// <summary>id → species (未知の id は null)。 AllSpecies (川5種+海10種) を検索する。</summary>
        public static TsuriSpecies GetSpeciesById(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return null;
            }

            for (int i = 0; i < AllSpecies.Count; i++)
            {
                if (AllSpecies[i].Id == id)
                {
                    return AllSpecies[i];
                }
            }

            return null;
        }
    }
}
