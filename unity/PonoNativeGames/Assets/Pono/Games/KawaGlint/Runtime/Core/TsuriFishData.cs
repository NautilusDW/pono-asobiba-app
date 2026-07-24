// ── Pono.KawaGlint.Core / TsuriFishData.cs ──
// 生き物マスターデータ (全30種)。
//
// batch:1470 実装契約 §A-3 で **意図的に破棄した過去の契約文言**:
//   旧: 「common/tsuri/fish-data.js の RIVER_SPECIES の純C#移植 (値そのまま)」
//       「RiverSpecies の既存5エントリの値・順序は不変」
//   新: ユーザーの実プレイフィードバック (「順番に釣れる感じ」「生き物が少ない」
//       「沖の船で鮭が釣れる」) を起点に、Web 版 fish-data.js との値互換を**破棄**する。
//       Web 版 tsuri は既に退役済み (common/tsuri/ / tsuri-kawa/ ともに削除済み) で
//       消費者が現存しないため、互換を維持する理由が無くなった。
//
// 主な変更:
//   1. `Weight` (同レアリティ内の絶対重み 4〜22) を `SpeciesWeightMul`
//      (同レアリティ内の相対倍率 0.20〜1.50) に**改名**。 §A-1 参照。
//   2. `MotionClass` を全種に付与 (非遊泳生物のゲート + Rendering の archetype 既定)。
//   3. 新種15件を追加し 15 → **30 種 (2.0倍)**。 新種の catch/shadow アートは未生成なので
//      KawaGlintProceduralFishArt の手続き型で描かれる (受け口は SpriteCatalog に登録済み)。
//   4. `RiverSpecies` / `SeaSpecies` を **Zones からの派生ビュー**に変更
//      (手書きの2リストではなくなった)。 AllSpecies が唯一の正本。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>生き物マスター (全30種) と id 検索。</summary>
    public static class TsuriFishData
    {
        /// <summary>
        /// 全30種の唯一の正本。 定義順 = 図鑑の表示順
        /// (KawaGlintFishdexPanel がこの順にカードを敷き詰める)。
        /// 川の既存種 → 海の既存種 → 川の新種 → 海の新種 の順に並べる。
        /// </summary>
        public static readonly List<TsuriSpecies> AllSpecies = new List<TsuriSpecies>
        {
            // ── 既存15種 (rarity / Size / ChallengeProfile は不変、重みだけ再設計) ──
            new TsuriSpecies
            {
                Id = "fish_ayu",
                Name = "あゆ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = "fish_ayu",
                SpeciesWeightMul = 1.30f,
                MotionClass = TsuriMotionClass.Standard,
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
                SpeciesWeightMul = 1.15f,
                MotionClass = TsuriMotionClass.Standard,
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
                SpeciesWeightMul = 0.40f,
                MotionClass = TsuriMotionClass.Crawler,
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
                SpeciesWeightMul = 1.40f,
                MotionClass = TsuriMotionClass.Heavy,
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
                SpeciesWeightMul = 0.22f,
                MotionClass = TsuriMotionClass.Shell,
                HasSizeRange = false,
                SizeMinCm = 0f,
                SizeMaxCm = 0f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.3f, TapsBase = 4, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_unagi",
                Name = "うなぎ",
                Rarity = TsuriRarity.Super,
                Size = "m",
                Edible = true,
                InventoryKey = "fish_unagi",
                SpeciesWeightMul = 1.20f,
                MotionClass = TsuriMotionClass.Slim,
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
                SpeciesWeightMul = 1.25f,
                MotionClass = TsuriMotionClass.Standard,
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
                SpeciesWeightMul = 1.10f,
                MotionClass = TsuriMotionClass.Crawler,
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
                SpeciesWeightMul = 1.00f,
                MotionClass = TsuriMotionClass.Flat,
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
                SpeciesWeightMul = 0.45f,
                MotionClass = TsuriMotionClass.Crawler,
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
                SpeciesWeightMul = 0.40f,
                MotionClass = TsuriMotionClass.Shell,
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
                SpeciesWeightMul = 1.35f,
                MotionClass = TsuriMotionClass.Standard,
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
                SpeciesWeightMul = 1.20f,
                MotionClass = TsuriMotionClass.Standard,
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
                SpeciesWeightMul = 1.10f,
                MotionClass = TsuriMotionClass.Drifter,
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
                SpeciesWeightMul = 1.00f,
                MotionClass = TsuriMotionClass.Heavy,
                HasSizeRange = true,
                SizeMinCm = 80f,
                SizeMaxCm = 150f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.8f, TapsBase = 16, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.DeepOpen
            },

            // ── batch:1470 新種15件 ────────────────────────────────────────
            // 全件 InventoryKey = null / Runs = 0。 catch アートは未生成なので
            // KawaGlintProceduralFishArt.GetCatchPlaceholder が描く (受け口は登録済み)。
            new TsuriSpecies
            {
                Id = "fish_yamame",
                Name = "やまめ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.10f,
                MotionClass = TsuriMotionClass.Standard,
                HasSizeRange = true,
                SizeMinCm = 18f,
                SizeMaxCm = 30f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.00f, TapsBase = 10, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.Midwater
            },
            new TsuriSpecies
            {
                Id = "fish_dojou",
                Name = "どじょう",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 0.80f,
                MotionClass = TsuriMotionClass.Slim,
                HasSizeRange = true,
                SizeMinCm = 10f,
                SizeMaxCm = 20f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.20f, TapsBase = 6, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_haze",
                Name = "はぜ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.15f,
                MotionClass = TsuriMotionClass.Standard,
                HasSizeRange = true,
                SizeMinCm = 8f,
                SizeMaxCm = 18f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.15f, TapsBase = 6, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "sawagani",
                Name = "さわがに",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = false,
                InventoryKey = null,
                // 設計書 0.60 → 0.30 に下方修正 (非食用合計 ≤18% の上限を守るため。契約 1-B)。
                SpeciesWeightMul = 0.30f,
                MotionClass = TsuriMotionClass.Crawler,
                HasSizeRange = true,
                SizeMinCm = 2f,
                SizeMaxCm = 4f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.25f, TapsBase = 5, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_shijimi",
                Name = "しじみ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 0.75f,
                MotionClass = TsuriMotionClass.Shell,
                HasSizeRange = true,
                SizeMinCm = 2f,
                SizeMaxCm = 4f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.30f, TapsBase = 4, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_iwana",
                Name = "いわな",
                Rarity = TsuriRarity.Rare,
                Size = "m",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.10f,
                MotionClass = TsuriMotionClass.Standard,
                HasSizeRange = true,
                SizeMinCm = 25f,
                SizeMaxCm = 40f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.95f, TapsBase = 12, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_namazu",
                Name = "なまず",
                Rarity = TsuriRarity.Super,
                Size = "l",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.00f,
                MotionClass = TsuriMotionClass.Heavy,
                HasSizeRange = true,
                SizeMinCm = 50f,
                SizeMaxCm = 100f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.85f, TapsBase = 15, Runs = 0 },
                Zones = new[] { TsuriWaterZone.River },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_kisu",
                Name = "きす",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.20f,
                MotionClass = TsuriMotionClass.Standard,
                HasSizeRange = true,
                SizeMinCm = 15f,
                SizeMaxCm = 25f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.05f, TapsBase = 8, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_asari",
                Name = "あさり",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 0.90f,
                MotionClass = TsuriMotionClass.Shell,
                HasSizeRange = true,
                SizeMinCm = 3f,
                SizeMaxCm = 5f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.30f, TapsBase = 4, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_saba",
                Name = "さば",
                Rarity = TsuriRarity.Normal,
                Size = "m",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.15f,
                MotionClass = TsuriMotionClass.Standard,
                HasSizeRange = true,
                SizeMinCm = 30f,
                SizeMaxCm = 45f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.00f, TapsBase = 10, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.Midwater
            },
            new TsuriSpecies
            {
                Id = "fish_sanma",
                Name = "さんま",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.10f,
                MotionClass = TsuriMotionClass.Slim,
                HasSizeRange = true,
                SizeMinCm = 25f,
                SizeMaxCm = 35f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.05f, TapsBase = 8, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.Surface
            },
            new TsuriSpecies
            {
                Id = "fish_kani",
                Name = "わたりがに",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 0.85f,
                MotionClass = TsuriMotionClass.Crawler,
                HasSizeRange = true,
                SizeMinCm = 10f,
                SizeMaxCm = 25f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.20f, TapsBase = 7, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
            new TsuriSpecies
            {
                Id = "fish_sazae",
                Name = "さざえ",
                Rarity = TsuriRarity.Normal,
                Size = "s",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 0.80f,
                MotionClass = TsuriMotionClass.Shell,
                HasSizeRange = true,
                SizeMinCm = 5f,
                SizeMaxCm = 10f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 1.25f, TapsBase = 5, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_tako",
                Name = "たこ",
                Rarity = TsuriRarity.Rare,
                Size = "m",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.20f,
                MotionClass = TsuriMotionClass.Drifter,
                HasSizeRange = true,
                SizeMinCm = 30f,
                SizeMaxCm = 60f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.90f, TapsBase = 13, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.RockCover
            },
            new TsuriSpecies
            {
                Id = "fish_hirame",
                Name = "ひらめ",
                Rarity = TsuriRarity.Rare,
                Size = "m",
                Edible = true,
                InventoryKey = null,
                SpeciesWeightMul = 1.00f,
                MotionClass = TsuriMotionClass.Flat,
                HasSizeRange = true,
                SizeMinCm = 30f,
                SizeMaxCm = 60f,
                ChallengeProfile = new TsuriChallengeProfile { WindowMul = 0.95f, TapsBase = 12, Runs = 0 },
                Zones = new[] { TsuriWaterZone.Sea },
                RepresentativeNiche = TsuriNiche.BottomSand
            },
        };

        /// <summary>
        /// 川に居る種の派生ビュー (Zones に River を含むもの、AllSpecies の定義順)。
        /// batch:1470 以前は手書きの5件リストだったが、**Zones からの導出**に変えた --
        /// 種を足したときにこの2つのビューを更新し忘れる二重台帳を無くすため。
        /// </summary>
        public static readonly List<TsuriSpecies> RiverSpecies = FilterByZone(TsuriWaterZone.River);

        /// <summary>海に居る種の派生ビュー (Zones に Sea を含むもの、AllSpecies の定義順)。</summary>
        public static readonly List<TsuriSpecies> SeaSpecies = FilterByZone(TsuriWaterZone.Sea);

        private static List<TsuriSpecies> FilterByZone(TsuriWaterZone zone)
        {
            var list = new List<TsuriSpecies>();
            for (int i = 0; i < AllSpecies.Count; i++)
            {
                var zones = AllSpecies[i].Zones;
                if (zones == null)
                {
                    continue;
                }
                for (int z = 0; z < zones.Length; z++)
                {
                    if (zones[z] == zone)
                    {
                        list.Add(AllSpecies[i]);
                        break;
                    }
                }
            }
            return list;
        }

        /// <summary>id → species (未知の id は null)。 AllSpecies (全30種) を検索する。</summary>
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
