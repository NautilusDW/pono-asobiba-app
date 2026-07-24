// ── Pono.KawaGlint.Core / TsuriDex.cs ──
// 図鑑ローカルストア (fishdex) のデータスキーマ。 KawaGlint 海拡張 実装契約 v1.0 (B) 図鑑ローカルストア §4.1。
//
// JSON スキーマは §4.1 で凍結済み (camelCase・epoch ms UTC・変換層禁止)。 そのため、このファイルの
// public フィールドは C# の PascalCase 慣例ではなく JSON と同一の camelCase 名を使う
// (Newtonsoft.Json.JsonConvert は既定でフィールド名をそのまま出力するため、変換層を挟まずに
// 直接シリアライズできる)。 TsuriCatchOp も将来の catch-outbox イベント (§4.3) と同形になる
// ことを見込んで同じ camelCase 規約に揃えている。 UnityEngine には一切依存しない。
using System;
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    /// <summary>fishdex の source 定数 (TsuriWorldData.SourceFor と同じ語彙)。</summary>
    public static class TsuriDexSources
    {
        public const string FishingRiver = "fishing_river";
        public const string FishingSea = "fishing_sea";
    }

    /// <summary>
    /// 1魚種ぶんの図鑑レコード。 count==0 かつ seen==true はシルエット表示 (将来UI) を意味する。
    /// </summary>
    public sealed class TsuriDexRecord
    {
        public bool seen;
        public int count;
        public int escapedCount;
        public int? maxSizeCm;
        public long firstAt;
        public long lastAt;
        public Dictionary<string, int> sourceCounts = new Dictionary<string, int>();
        public Dictionary<string, int> locationCounts = new Dictionary<string, int>();

        /// <summary>
        /// マージ則 (§4.1 凍結): seen=OR / count・escapedCount・sourceCounts・locationCounts=加算 /
        /// maxSizeCm=max (null は他方採用) / firstAt=両方&gt;0なら min・片方0なら非0側 / lastAt=max。
        /// 可換 (Merge(a,b) == Merge(b,a))。 引数 null は空レコード扱い。
        /// </summary>
        public static TsuriDexRecord Merge(TsuriDexRecord a, TsuriDexRecord b)
        {
            a = a ?? new TsuriDexRecord();
            b = b ?? new TsuriDexRecord();

            return new TsuriDexRecord
            {
                seen = a.seen || b.seen,
                count = a.count + b.count,
                escapedCount = a.escapedCount + b.escapedCount,
                maxSizeCm = MergeMaxSizeCm(a.maxSizeCm, b.maxSizeCm),
                firstAt = MergeFirstAt(a.firstAt, b.firstAt),
                lastAt = Math.Max(a.lastAt, b.lastAt),
                sourceCounts = MergeCounts(a.sourceCounts, b.sourceCounts),
                locationCounts = MergeCounts(a.locationCounts, b.locationCounts)
            };
        }

        private static int? MergeMaxSizeCm(int? a, int? b)
        {
            if (a == null)
            {
                return b;
            }

            if (b == null)
            {
                return a;
            }

            return Math.Max(a.Value, b.Value);
        }

        private static long MergeFirstAt(long a, long b)
        {
            if (a > 0 && b > 0)
            {
                return Math.Min(a, b);
            }

            if (a > 0)
            {
                return a;
            }

            if (b > 0)
            {
                return b;
            }

            // 両方とも「未記録」(<=0) の場合は引数の値に依らず 0 に丸める。
            // (旧実装は `a > 0 ? a : b` で、a<=0,b<=0 かつ a!=b のとき非可換だった。)
            return 0;
        }

        private static Dictionary<string, int> MergeCounts(Dictionary<string, int> a, Dictionary<string, int> b)
        {
            var result = new Dictionary<string, int>();
            AddCounts(result, a);
            AddCounts(result, b);
            return result;
        }

        private static void AddCounts(Dictionary<string, int> target, Dictionary<string, int> source)
        {
            if (source == null)
            {
                return;
            }

            foreach (var kv in source)
            {
                target[kv.Key] = (target.TryGetValue(kv.Key, out var existing) ? existing : 0) + kv.Value;
            }
        }

        /// <summary>
        /// 破損/欠損データの正規化 (§4.2): null 辞書→空辞書、負値→0 (maxSizeCm は負なら null 扱い)。
        /// </summary>
        internal void Normalize()
        {
            if (count < 0)
            {
                count = 0;
            }

            if (escapedCount < 0)
            {
                escapedCount = 0;
            }

            if (firstAt < 0)
            {
                firstAt = 0;
            }

            if (lastAt < 0)
            {
                lastAt = 0;
            }

            if (maxSizeCm.HasValue && maxSizeCm.Value < 0)
            {
                maxSizeCm = null;
            }

            sourceCounts = NormalizeCounts(sourceCounts);
            locationCounts = NormalizeCounts(locationCounts);
        }

        private static Dictionary<string, int> NormalizeCounts(Dictionary<string, int> counts)
        {
            var result = new Dictionary<string, int>();
            if (counts == null)
            {
                return result;
            }

            foreach (var kv in counts)
            {
                if (string.IsNullOrEmpty(kv.Key))
                {
                    continue;
                }

                result[kv.Key] = kv.Value < 0 ? 0 : kv.Value;
            }

            return result;
        }
    }

    /// <summary>fishdex.json のドキュメント全体。 version は将来のスキーマ変更用。</summary>
    public sealed class TsuriDexDocument
    {
        public int version = 1;
        public Dictionary<string, TsuriDexRecord> species = new Dictionary<string, TsuriDexRecord>();

        /// <summary>opId → 適用時刻 (ms)。 ApplyCatch/ApplyEscape の冪等性チェックに使う。</summary>
        public Dictionary<string, long> appliedOps = new Dictionary<string, long>();

        /// <summary>species キー和集合 + Record.Merge / appliedOps 和集合 (重複キーは ts の min)。</summary>
        public static TsuriDexDocument Merge(TsuriDexDocument a, TsuriDexDocument b)
        {
            a = a ?? new TsuriDexDocument();
            b = b ?? new TsuriDexDocument();

            var merged = new TsuriDexDocument
            {
                version = Math.Max(a.version < 1 ? 1 : a.version, b.version < 1 ? 1 : b.version),
                species = new Dictionary<string, TsuriDexRecord>(),
                appliedOps = new Dictionary<string, long>()
            };

            var speciesKeys = new HashSet<string>();
            if (a.species != null)
            {
                speciesKeys.UnionWith(a.species.Keys);
            }

            if (b.species != null)
            {
                speciesKeys.UnionWith(b.species.Keys);
            }

            foreach (var key in speciesKeys)
            {
                TsuriDexRecord recordA = null;
                TsuriDexRecord recordB = null;
                a.species?.TryGetValue(key, out recordA);
                b.species?.TryGetValue(key, out recordB);
                merged.species[key] = TsuriDexRecord.Merge(recordA, recordB);
            }

            var opKeys = new HashSet<string>();
            if (a.appliedOps != null)
            {
                opKeys.UnionWith(a.appliedOps.Keys);
            }

            if (b.appliedOps != null)
            {
                opKeys.UnionWith(b.appliedOps.Keys);
            }

            foreach (var key in opKeys)
            {
                long tsA = 0;
                long tsB = 0;
                bool hasA = a.appliedOps != null && a.appliedOps.TryGetValue(key, out tsA);
                bool hasB = b.appliedOps != null && b.appliedOps.TryGetValue(key, out tsB);
                if (hasA && hasB)
                {
                    merged.appliedOps[key] = Math.Min(tsA, tsB);
                }
                else if (hasA)
                {
                    merged.appliedOps[key] = tsA;
                }
                else if (hasB)
                {
                    merged.appliedOps[key] = tsB;
                }
            }

            return merged;
        }

        /// <summary>全種の sourceCounts[source] 合算 = zone 累計釣果 (解放判定入力・§2.3/調停#11)。</summary>
        public int TotalCountForSource(string source)
        {
            int total = 0;
            if (species == null || string.IsNullOrEmpty(source))
            {
                return total;
            }

            foreach (var record in species.Values)
            {
                if (record?.sourceCounts != null && record.sourceCounts.TryGetValue(source, out var count))
                {
                    total += count;
                }
            }

            return total;
        }

        /// <summary>null辞書→空辞書, 負値→0, version&lt;1→1, null キー/レコード除去。</summary>
        public void Normalize()
        {
            if (version < 1)
            {
                version = 1;
            }

            if (species == null)
            {
                species = new Dictionary<string, TsuriDexRecord>();
            }
            else
            {
                var badKeys = new List<string>();
                foreach (var kv in species)
                {
                    if (string.IsNullOrEmpty(kv.Key) || kv.Value == null)
                    {
                        badKeys.Add(kv.Key);
                    }
                }

                foreach (var key in badKeys)
                {
                    species.Remove(key);
                }

                foreach (var record in species.Values)
                {
                    record.Normalize();
                }
            }

            if (appliedOps == null)
            {
                appliedOps = new Dictionary<string, long>();
            }
            else
            {
                var badOpKeys = new List<string>();
                foreach (var kv in appliedOps)
                {
                    if (string.IsNullOrEmpty(kv.Key))
                    {
                        badOpKeys.Add(kv.Key);
                    }
                }

                foreach (var key in badOpKeys)
                {
                    appliedOps.Remove(key);
                }
            }
        }
    }

    /// <summary>
    /// 将来の catch-outbox イベント (§4.3) と同形の入力DTO。 冷凍フィールド (inventoryKey/edible/
    /// name/rarity) は捕獲時点の TsuriSpecies から解決して渡す契約 (呼び出し側の責務)。
    /// フィールド名は fishdex.json / 将来の outbox JSON と同一の camelCase。
    /// </summary>
    public sealed class TsuriCatchOp
    {
        public string opId; // "fishcatch:" + Guid ("N")
        public string runId; // "run:" + Guid (サービス生成時に1個)
        public string source; // TsuriDexSources 定数
        public string locationId;
        public string speciesId;
        public string inventoryKey; // 冷凍。非食用/maguro は null
        public bool edible; // 冷凍
        public string name; // 冷凍 (表示用)
        public string rarity; // "normal"|"rare"|"super" (小文字Web語彙。TsuriRarity から変換)
        public int? sizeCm;
        public long caughtAt;
    }
}
