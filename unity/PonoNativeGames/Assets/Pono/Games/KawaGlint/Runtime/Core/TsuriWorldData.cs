// ── Pono.KawaGlint.Core / TsuriWorldData.cs ──
// docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md (v1.1) §3.1/§3.2/§3.4 の海拡張ロケーション台帳の
// 純C#移植。 KawaGlint 海拡張 実装契約 v1.0 (A) データ層。
//
// batch:1470 実装契約 §A-4 で Spawns 台帳を全面差し替えした。
//  - ボーナス種機構 (IsBonusHome / IncludeZoneBonus / BonusSpeciesId /
//    BonusNonHomeWeightMul / BuildWeightMulMap) を**丸ごと退役**
//  - 生態整合性の修正 (E-1〜E-7): 沖の salmon 削除、河口の nijimasu 削除、
//    砂浜に salmon 追加、unagi/maguro を在籍ロケの通常 Spawns に降格 ほか
//  - TsuriSpawnEntry.MinProbability (レシピ必須魚の下限保証) を新設
// 待ち時間レンジ (asase 6–10s) は**変更しない** -- 確率変更の体感 A/B を汚さないため
// (契約 1-B: 4–7s への短縮はユーザー承認付きの別バッチ)。
// UnlockCount は現時点で全ロケーション null (常時解放、ユーザー最新決定)。
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>釣り場の水域区分。 §3.1。</summary>
    public enum TsuriWaterZone
    {
        River,
        Sea
    }

    /// <summary>
    /// 演出専用の生息帯 (§3.3)。 省略時 Midwater。 tuning (窓・連打・待ち時間・WeightMul) には
    /// 一切接続しない契約 (不変条件、静的検査レベルで禁止)。
    /// </summary>
    public enum TsuriNiche
    {
        Surface,
        Midwater,
        BottomSand,
        RockCover,
        DeepOpen
    }

    /// <summary>ロケーション内の1魚種エントリ。 (ロケ×種) 単位で Niche を持つのが正本 (§3.3)。</summary>
    public sealed class TsuriSpawnEntry
    {
        public string SpeciesId;
        public float WeightMul = 1f;
        public TsuriNiche Niche = TsuriNiche.Midwater;

        /// <summary>
        /// batch:1470 実装契約 §A-4 新設: 正規化後の最終確率がこの値を下回ったら
        /// 引き上げて残りを再正規化する (レシピ必須魚の下限保証)。 0 = 下限なし。
        /// **「主役枠」ではない** -- WeightMul &gt; 1.0 のブースト枠とは別概念で、
        /// 1ロケ1主役ブーストの不変条件には数えない。
        /// </summary>
        public float MinProbability = 0f;
    }

    /// <summary>釣り場ロケーション1件の静的データ。</summary>
    public sealed class TsuriLocationData
    {
        public string Id;
        public string Name;
        public TsuriWaterZone Zone;
        public bool IsZoneDefault;
        public List<TsuriSpawnEntry> Spawns;
        public float WaitSecMin;
        public float WaitSecMax;
        public int? UnlockCount;
        public string BackgroundKey;
    }

    /// <summary>
    /// ロケーション台帳 + 解決ヘルパー群。
    ///
    /// **ロケーションのプール = Spawns の宣言そのもの** (暗黙の注入は一切無い)。
    /// asase は WeightMul 全1.0 の「主役なし」ロケで、待ち時間レンジも
    /// TsuriKawaTuning と一致したまま (= 回帰基準として据え置く)。
    /// </summary>
    public static class TsuriWorldData
    {
        public const string DefaultLocationId = "river_asase";

        /// <summary>レシピ必須魚の下限確率 (TsuriTuning.RecipeMinProbability の別名、台帳の可読性用)。</summary>
        private const float RecipeMin = TsuriTuning.RecipeMinProbability;

        /// <summary>定義順 = UI表示順: asase, kakou, sunahama, iwaba, oki。</summary>
        public static readonly List<TsuriLocationData> Locations;

        static TsuriWorldData()
        {
            Locations = new List<TsuriLocationData>
            {
                // ロケーション設計原則 (契約 §A-4): 既定ロケ (asase / sunahama) は
                // normal + rare のみ。 super / legendary は非既定ロケの報酬にする。
                new TsuriLocationData
                {
                    Id = "river_asase",
                    Name = "せせらぎの あさせ",
                    Zone = TsuriWaterZone.River,
                    IsZoneDefault = true,
                    WaitSecMin = 6f,   // 契約 1-B: 4–7s への短縮は今回スコープ外 (別バッチ)
                    WaitSecMax = 10f,
                    UnlockCount = null,
                    BackgroundKey = "bg_river_crosssection",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_ayu", WeightMul = 1f, Niche = TsuriNiche.Midwater, MinProbability = RecipeMin },
                        new TsuriSpawnEntry { SpeciesId = "fish_nijimasu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_yamame", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_dojou", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "zarigani", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "sawagani", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        // E-1: 遡上の背びれ。 Midwater → Surface (前あたりナレが変わるのは意図どおり)
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 1f, Niche = TsuriNiche.Surface, MinProbability = RecipeMin },
                        new TsuriSpawnEntry { SpeciesId = "fish_iwana", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "treasure_boot", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                    }
                },
                new TsuriLocationData
                {
                    Id = "river_kakou",
                    Name = "ゆうやけの かこう",
                    Zone = TsuriWaterZone.River,
                    IsZoneDefault = false,
                    WaitSecMin = 3f,
                    WaitSecMax = 7f,
                    UnlockCount = null,
                    BackgroundKey = "bg_tsuri_river_kakou",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 2.5f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_ayu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_haze", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_dojou", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_shijimi", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // E-7: ボーナス種機構を退役し、通常 Spawns に降格
                        new TsuriSpawnEntry { SpeciesId = "fish_unagi", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_namazu", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "treasure_boot", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // E-2: 冷水上流魚の nijimasu は汽水河口から削除
                    }
                },
                new TsuriLocationData
                {
                    Id = "sea_sunahama",
                    Name = "すなはまの さんばし",
                    Zone = TsuriWaterZone.Sea,
                    IsZoneDefault = true,
                    WaitSecMin = 3f,
                    WaitSecMax = 6f,
                    UnlockCount = null,
                    BackgroundKey = "bg_tsuri_sea_sunahama",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_iwashi", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater, MinProbability = RecipeMin },
                        new TsuriSpawnEntry { SpeciesId = "fish_kisu", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_saba", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_ebi", WeightMul = 1f, Niche = TsuriNiche.BottomSand, MinProbability = RecipeMin },
                        new TsuriSpawnEntry { SpeciesId = "fish_karei", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_asari", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_kani", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // hirame は sunahama 専用 (oki は床を作らない設計なので BottomSand ナレが破綻する)
                        new TsuriSpawnEntry { SpeciesId = "fish_hirame", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // E-4: アキアジのサーフ釣り。 砂浜は「河口のとなり」として絵で理解できる
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 0.6f, Niche = TsuriNiche.Surface, MinProbability = RecipeMin },
                        new TsuriSpawnEntry { SpeciesId = "hitode", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "treasure_kaigara", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // E-6: まぐろ (super) はボーナス種退役に伴い消滅 (oki 専用へ)
                    }
                },
                new TsuriLocationData
                {
                    Id = "sea_iwaba",
                    Name = "いわばの つりば",
                    Zone = TsuriWaterZone.Sea,
                    IsZoneDefault = false,
                    WaitSecMin = 4f,
                    WaitSecMax = 7f,
                    UnlockCount = null,
                    BackgroundKey = "bg_tsuri_sea_iwaba",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_ebi", WeightMul = 1.3f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_kani", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_sazae", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_tai", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_tako", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_ika", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "hitode", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "treasure_kaigara", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        // E-6: まぐろ (super) 消滅
                    }
                },
                new TsuriLocationData
                {
                    Id = "sea_oki",
                    Name = "おきの ふね",
                    Zone = TsuriWaterZone.Sea,
                    IsZoneDefault = false,
                    WaitSecMin = 5f,
                    WaitSecMax = 8f,
                    UnlockCount = null,
                    BackgroundKey = "bg_tsuri_sea_oki",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_tai", WeightMul = 1.5f, Niche = TsuriNiche.DeepOpen },
                        new TsuriSpawnEntry { SpeciesId = "fish_iwashi", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_saba", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_sanma", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        // E-5 却下 (現行維持): oki の surface は「岩のない沖で RockCover 演出が
                        // 破綻するのを避ける演出セレクタとしての意図的選択」。 生態根拠での
                        // 取り消しは「niche は演出専用」不変条件と自己矛盾する。 加えて
                        // イカ釣り船は実際に表層を狙う。 EditMode テストで再適用を機械的に禁止。
                        new TsuriSpawnEntry { SpeciesId = "fish_ika", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        // E-6: ボーナス種退役に伴い maguro を通常 Spawns に降格 (oki のみ)
                        new TsuriSpawnEntry { SpeciesId = "fish_maguro", WeightMul = 1f, Niche = TsuriNiche.DeepOpen },
                        // E-3: ユーザー指摘「沖の船で鮭が釣れる」 -> salmon を削除
                    }
                },
            };
        }

        /// <summary>id → ロケーション。 null/未知の id は asase へ正規化する (normalizeWalkState 思想)。</summary>
        public static TsuriLocationData GetLocationById(string id)
        {
            if (!string.IsNullOrEmpty(id))
            {
                for (int i = 0; i < Locations.Count; i++)
                {
                    if (Locations[i].Id == id)
                    {
                        return Locations[i];
                    }
                }
            }

            for (int i = 0; i < Locations.Count; i++)
            {
                if (Locations[i].Id == DefaultLocationId)
                {
                    return Locations[i];
                }
            }

            return null; // 台帳が壊れていない限り到達しない
        }

        /// <summary>zone の既定ロケーション (asase / sunahama)。</summary>
        public static TsuriLocationData DefaultLocation(TsuriWaterZone zone)
        {
            for (int i = 0; i < Locations.Count; i++)
            {
                if (Locations[i].Zone == zone && Locations[i].IsZoneDefault)
                {
                    return Locations[i];
                }
            }

            return null;
        }

        /// <summary>zone の fishdex source 文字列。 River→"fishing_river", Sea→"fishing_sea"。</summary>
        public static string SourceFor(TsuriWaterZone zone)
        {
            return zone == TsuriWaterZone.Sea ? "fishing_sea" : "fishing_river";
        }

        /// <summary>
        /// Spawns をマスター解決したプール (定義順、重複除去)。 未知の speciesId は
        /// スキップする (§3.5-9)。
        ///
        /// batch:1470 でボーナス種機構 (IncludeZoneBonus / BonusSpeciesId /
        /// BonusNonHomeWeightMul) を**丸ごと退役**させた。 うなぎ/まぐろが「どのロケでも
        /// 0.5〜0.7% で紛れ込む」仕組みは、生態整合性 (E-6/E-7) と「レアは本当に稀」の
        /// 両方に反していたため、両種を在籍ロケの通常 Spawns に降格した。
        /// **これによりロケーションのプール = Spawns の宣言そのもの**になり、
        /// 台帳を読めば出る生き物が全部分かる (暗黙の注入が無い)。
        /// </summary>
        public static List<TsuriSpecies> BuildEffectivePool(TsuriLocationData loc)
        {
            var pool = new List<TsuriSpecies>();
            if (loc == null || loc.Spawns == null)
            {
                return pool;
            }

            var addedIds = new HashSet<string>();
            for (int i = 0; i < loc.Spawns.Count; i++)
            {
                var entry = loc.Spawns[i];
                var species = entry != null ? TsuriFishData.GetSpeciesById(entry.SpeciesId) : null;
                if (species == null)
                {
                    continue; // 未知 speciesId は正規化でスキップ
                }

                if (addedIds.Add(species.Id))
                {
                    pool.Add(species);
                }
            }

            return pool;
        }

        /// <summary>UnlockCount==null → 常に true。 値あり → zoneCatchCount &gt;= UnlockCount。</summary>
        public static bool IsUnlocked(TsuriLocationData loc, int zoneCatchCount)
        {
            if (loc == null || loc.UnlockCount == null)
            {
                return true;
            }

            return zoneCatchCount >= loc.UnlockCount.Value;
        }

        /// <summary>
        /// Spawns エントリの Niche。 エントリ外 (ボーナス種等) は species.RepresentativeNiche、
        /// それも無ければ Midwater。
        /// </summary>
        public static TsuriNiche NicheFor(TsuriLocationData loc, string speciesId)
        {
            if (loc != null && loc.Spawns != null)
            {
                for (int i = 0; i < loc.Spawns.Count; i++)
                {
                    var entry = loc.Spawns[i];
                    if (entry != null && entry.SpeciesId == speciesId)
                    {
                        return entry.Niche;
                    }
                }
            }

            var species = TsuriFishData.GetSpeciesById(speciesId);
            return species != null ? species.RepresentativeNiche : TsuriNiche.Midwater;
        }

        /// <summary>
        /// misses&gt;0 → (WaitSecMin*0.5, WaitSecMax*0.5)。 asase(6/10→3/5) で
        /// TsuriKawaTuning と完全一致する (EditMode テストで固定)。
        /// </summary>
        public static void NextWaitSecRange(TsuriLocationData loc, int misses, out float min, out float max)
        {
            float baseMin = loc != null ? loc.WaitSecMin : 0f;
            float baseMax = loc != null ? loc.WaitSecMax : 0f;
            if (misses > 0)
            {
                min = baseMin * 0.5f;
                max = baseMax * 0.5f;
            }
            else
            {
                min = baseMin;
                max = baseMax;
            }
        }
    }
}
