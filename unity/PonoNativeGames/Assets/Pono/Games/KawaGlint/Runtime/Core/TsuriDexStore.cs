// ── Pono.KawaGlint.Core / TsuriDexStore.cs ──
// fishdex.json のローカル永続化。 KawaGlint 海拡張 実装契約 v1.0 (B) 図鑑ローカルストア §4.2。
// UnityEngine 非依存 (パス・乱数・時刻は呼び出し側が注入する契約を維持)。
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;

namespace Pono.KawaGlint.Core
{
    /// <summary>
    /// fishdex.json / fishdex.json.bak のアトミック読み書き。 Load() は例外を絶対に外へ
    /// 漏らさない (パース失敗→.bak→空ドキュメントの順にフォールバックする)。
    /// </summary>
    public sealed class TsuriDexStore
    {
        private static readonly UTF8Encoding Utf8NoBom = new UTF8Encoding(false);

        private readonly string _baseDirectory;

        public TsuriDexStore(string baseDirectory)
        {
            _baseDirectory = baseDirectory;
            FishdexPath = Path.Combine(baseDirectory, "fishdex.json");
            BackupPath = FishdexPath + ".bak";
        }

        public string FishdexPath { get; }

        public string BackupPath { get; }

        /// <summary>
        /// 本体パース失敗 → .bak を試行 → それも失敗なら空ドキュメント。 必ず Normalize()
        /// 済みを返す。 例外を外に漏らさない。
        /// </summary>
        public TsuriDexDocument Load()
        {
            try
            {
                var doc = TryLoadFrom(FishdexPath) ?? TryLoadFrom(BackupPath) ?? new TsuriDexDocument();
                doc.Normalize();
                return doc;
            }
            catch
            {
                var fallback = new TsuriDexDocument();
                fallback.Normalize();
                return fallback;
            }
        }

        private static TsuriDexDocument TryLoadFrom(string path)
        {
            try
            {
                if (string.IsNullOrEmpty(path) || !File.Exists(path))
                {
                    return null;
                }

                var json = File.ReadAllText(path, Encoding.UTF8);
                return JsonConvert.DeserializeObject<TsuriDexDocument>(json);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// アトミック書込 (§4.2-5): (1) Directory.CreateDirectory (2) {path}.tmp へ書込 +
        /// Flush(flushToDisk:true) (3) 本体が存在すれば File.Replace(tmp, path, bak) / 無ければ
        /// File.Move。 File.Replace が IOException/PlatformNotSupported の場合は
        /// Copy(path→bak)→Delete(path)→Move(tmp→path) へフォールバックする。
        /// </summary>
        public void Save(TsuriDexDocument doc)
        {
            Directory.CreateDirectory(_baseDirectory);

            var tmpPath = FishdexPath + ".tmp";
            var json = JsonConvert.SerializeObject(doc, Formatting.None);
            var bytes = Utf8NoBom.GetBytes(json);

            using (var stream = new FileStream(tmpPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush(true);
            }

            if (File.Exists(FishdexPath))
            {
                try
                {
                    File.Replace(tmpPath, FishdexPath, BackupPath);
                }
                catch (Exception ex) when (ex is IOException || ex is PlatformNotSupportedException)
                {
                    File.Copy(FishdexPath, BackupPath, true);
                    File.Delete(FishdexPath);
                    File.Move(tmpPath, FishdexPath);
                }
            }
            else
            {
                File.Move(tmpPath, FishdexPath);
            }
        }

        /// <summary>
        /// appliedOps に opId があれば false (何もしない)。 無ければカウンタ類を加算して true を
        /// 返す (Save は呼び出し側の責務)。
        /// </summary>
        public bool ApplyCatch(TsuriDexDocument doc, TsuriCatchOp op)
        {
            if (doc == null || op == null || string.IsNullOrEmpty(op.opId) || string.IsNullOrEmpty(op.speciesId))
            {
                return false;
            }

            if (doc.appliedOps == null)
            {
                doc.appliedOps = new Dictionary<string, long>();
            }

            if (doc.appliedOps.ContainsKey(op.opId))
            {
                return false;
            }

            doc.appliedOps[op.opId] = op.caughtAt;

            var record = GetOrCreateRecord(doc, op.speciesId);
            record.seen = true;
            record.count++;
            IncrementCount(record.sourceCounts, op.source);
            IncrementCount(record.locationCounts, op.locationId);

            if (op.sizeCm.HasValue)
            {
                record.maxSizeCm = record.maxSizeCm.HasValue
                    ? Math.Max(record.maxSizeCm.Value, op.sizeCm.Value)
                    : op.sizeCm.Value;
            }

            record.firstAt = record.firstAt > 0 ? Math.Min(record.firstAt, op.caughtAt) : op.caughtAt;
            record.lastAt = Math.Max(record.lastAt, op.caughtAt);

            return true;
        }

        /// <summary>
        /// opId 規約 "fishescape:" + Guid (呼び出し側が発行)。 dedupe は ApplyCatch と同じ。
        /// source/locationCounts は加算しない (§4.1 の逃走レコード例と整合)。
        /// </summary>
        public bool ApplyEscape(TsuriDexDocument doc, string opId, string speciesId, long atMs)
        {
            if (doc == null || string.IsNullOrEmpty(opId) || string.IsNullOrEmpty(speciesId))
            {
                return false;
            }

            if (doc.appliedOps == null)
            {
                doc.appliedOps = new Dictionary<string, long>();
            }

            if (doc.appliedOps.ContainsKey(opId))
            {
                return false;
            }

            doc.appliedOps[opId] = atMs;

            var record = GetOrCreateRecord(doc, speciesId);
            record.seen = true;
            record.escapedCount++;
            record.firstAt = record.firstAt > 0 ? Math.Min(record.firstAt, atMs) : atMs;
            record.lastAt = Math.Max(record.lastAt, atMs);

            return true;
        }

        private static TsuriDexRecord GetOrCreateRecord(TsuriDexDocument doc, string speciesId)
        {
            if (doc.species == null)
            {
                doc.species = new Dictionary<string, TsuriDexRecord>();
            }

            if (!doc.species.TryGetValue(speciesId, out var record) || record == null)
            {
                record = new TsuriDexRecord();
                doc.species[speciesId] = record;
            }

            return record;
        }

        private static void IncrementCount(Dictionary<string, int> counts, string key)
        {
            if (counts == null || string.IsNullOrEmpty(key))
            {
                return;
            }

            counts[key] = counts.TryGetValue(key, out var existing) ? existing + 1 : 1;
        }
    }
}
