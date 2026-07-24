// ── Pono.KawaGlint.Core / TsuriWorldData.cs ──
// docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md (v1.1) §3.1/§3.2/§3.4 の海拡張ロケーション台帳の
// 純C#移植。 KawaGlint 海拡張 実装契約 v1.0 (A) データ層。
//
// 回帰保証 (契約§0): river_asase の既定挙動 (プール構成・WeightMul・待ち時間レンジ) は
// この台帳経由でも既存 TsuriFishData.RiverSpecies / TsuriKawaTuning と完全に一致する
// (IncludeZoneBonus=false により asase はボーナス種を一切注入しない = 契約§0-2の
// 意図的逸脱)。 UnlockCount は現時点で全ロケーション null (常時解放、ユーザー最新決定)。
using System;
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
        public bool IsBonusHome;
        public bool IncludeZoneBonus = true;
        public string BackgroundKey;
    }

    /// <summary>
    /// ロケーション台帳 + 解決ヘルパー群。 asase (river_asase) は既存 TsuriFishData /
    /// TsuriKawaTuning とのビット単位互換を保つよう意図的に設計されている
    /// (IncludeZoneBonus=false, Spawns 全 WeightMul=1.0)。
    /// </summary>
    public static class TsuriWorldData
    {
        /// <summary>ボーナス種の非ホームロケーションでの極低 WeightMul (~0.5〜0.7% 目安)。</summary>
        public const float BonusNonHomeWeightMul = 0.1f;

        public const string DefaultLocationId = "river_asase";

        /// <summary>定義順 = UI表示順: asase, kakou, sunahama, iwaba, oki。</summary>
        public static readonly List<TsuriLocationData> Locations;

        static TsuriWorldData()
        {
            Locations = new List<TsuriLocationData>
            {
                new TsuriLocationData
                {
                    Id = "river_asase",
                    Name = "せせらぎの あさせ",
                    Zone = TsuriWaterZone.River,
                    IsZoneDefault = true,
                    WaitSecMin = 6f,
                    WaitSecMax = 10f,
                    UnlockCount = null,
                    IsBonusHome = false,
                    IncludeZoneBonus = false, // 契約§0-2: asase の挙動を一切変更しないため除外
                    BackgroundKey = "bg_river_crosssection",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_ayu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_nijimasu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "zarigani", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "treasure_boot", WeightMul = 1f, Niche = TsuriNiche.Midwater },
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
                    IsBonusHome = true, // unagi ホーム
                    IncludeZoneBonus = true,
                    BackgroundKey = "bg_tsuri_river_kakou",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 2.0f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_ayu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_nijimasu", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "treasure_boot", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
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
                    IsBonusHome = false,
                    IncludeZoneBonus = true,
                    BackgroundKey = "bg_tsuri_sea_sunahama",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_iwashi", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "fish_ebi", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "fish_karei", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "hitode", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
                        new TsuriSpawnEntry { SpeciesId = "treasure_kaigara", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
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
                    IsBonusHome = false,
                    IncludeZoneBonus = true,
                    BackgroundKey = "bg_tsuri_sea_iwaba",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_ebi", WeightMul = 1.3f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_ika", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_tai", WeightMul = 1f, Niche = TsuriNiche.RockCover },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater },
                        new TsuriSpawnEntry { SpeciesId = "hitode", WeightMul = 1f, Niche = TsuriNiche.BottomSand },
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
                    IsBonusHome = true, // maguro ホーム
                    IncludeZoneBonus = true,
                    BackgroundKey = "bg_tsuri_sea_oki",
                    Spawns = new List<TsuriSpawnEntry>
                    {
                        new TsuriSpawnEntry { SpeciesId = "fish_tai", WeightMul = 1.5f, Niche = TsuriNiche.DeepOpen },
                        new TsuriSpawnEntry { SpeciesId = "fish_salmon", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_iwashi", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_ika", WeightMul = 1f, Niche = TsuriNiche.Surface },
                        new TsuriSpawnEntry { SpeciesId = "fish_aji", WeightMul = 1f, Niche = TsuriNiche.Midwater },
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

        /// <summary>zone のボーナス種 id。 River→うなぎ, Sea→まぐろ。</summary>
        public static string BonusSpeciesId(TsuriWaterZone zone)
        {
            return zone == TsuriWaterZone.Sea ? "fish_maguro" : "fish_unagi";
        }

        /// <summary>zone の fishdex source 文字列。 River→"fishing_river", Sea→"fishing_sea"。</summary>
        public static string SourceFor(TsuriWaterZone zone)
        {
            return zone == TsuriWaterZone.Sea ? "fishing_sea" : "fishing_river";
        }

        /// <summary>
        /// Spawns ∪ {zone bonus (IncludeZoneBonus時, 重複せず末尾追加)} をマスター解決したプール。
        /// 未知の speciesId はスキップする (§3.5-9)。
        /// </summary>
        public static List<TsuriSpecies> BuildEffectivePool(TsuriLocationData loc)
        {
            var pool = new List<TsuriSpecies>();
            if (loc == null)
            {
                return pool;
            }

            var addedIds = new HashSet<string>();
            if (loc.Spawns != null)
            {
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
            }

            if (loc.IncludeZoneBonus)
            {
                var bonusSpecies = TsuriFishData.GetSpeciesById(BonusSpeciesId(loc.Zone));
                if (bonusSpecies != null && addedIds.Add(bonusSpecies.Id))
                {
                    pool.Add(bonusSpecies);
                }
            }

            return pool;
        }

        /// <summary>
        /// 全 mul が 1.0 かつボーナス注入なし (=asase) の場合は null を返す (Core 既存パス保証)。
        /// それ以外は SpeciesId→mul (ボーナス種: IsBonusHome ? 1.0 : BonusNonHomeWeightMul)。
        /// </summary>
        public static Dictionary<string, float> BuildWeightMulMap(TsuriLocationData loc)
        {
            if (loc == null)
            {
                return null;
            }

            bool allDefaultMul = true;
            if (loc.Spawns != null)
            {
                for (int i = 0; i < loc.Spawns.Count; i++)
                {
                    if (Math.Abs(loc.Spawns[i].WeightMul - 1f) > 1e-6f)
                    {
                        allDefaultMul = false;
                        break;
                    }
                }
            }

            if (allDefaultMul && !loc.IncludeZoneBonus)
            {
                return null;
            }

            var map = new Dictionary<string, float>();
            if (loc.Spawns != null)
            {
                for (int i = 0; i < loc.Spawns.Count; i++)
                {
                    var entry = loc.Spawns[i];
                    if (entry == null || string.IsNullOrEmpty(entry.SpeciesId))
                    {
                        continue;
                    }

                    map[entry.SpeciesId] = entry.WeightMul;
                }
            }

            if (loc.IncludeZoneBonus)
            {
                map[BonusSpeciesId(loc.Zone)] = loc.IsBonusHome ? 1f : BonusNonHomeWeightMul;
            }

            return map;
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
