// ── Pono.KawaGlint.Gameplay / KawaGlintFishdexService.cs ──
// fishdex ローカルストア (TsuriDexStore) を KawaGlintGameController に配線するための App 層
// アダプタ。 KawaGlint 海拡張 実装契約 v1.0 (B) 図鑑ローカルストア §B-3。
//
// outbox スコープ外の明記 (契約条項): §4.3 の catch-outbox/ack/carryover は今回実装しない
// (Unity↔Web 橋渡し基盤が未着手で消費者が存在しないため)。 将来の接続点は RecordCatch が
// TsuriCatchOp (=outbox イベントと同形・opId 発行済み) を既に組み立てている箇所 -- Phase E では
// ApplyCatch 呼び出しの直前に「同一 op を catch-outbox.json へ append」する1行を挿すだけで
// §4.2-6 の順序が成立する。
using System;
using Pono.KawaGlint.Core;
using UnityEngine;

namespace Pono.KawaGlint.Gameplay
{
    /// <summary>
    /// 1プレイセッションぶんの fishdex 記録窓口。 IO 例外はここで握りつぶし (Debug.LogError)、
    /// ゲームを絶対に落とさない。 Core 層の <see cref="TsuriDexStore"/> はこの逆に例外を外へ
    /// 漏らさない契約なので、実際に例外が飛ぶのは Save() の書込 IO 周りのみを想定する。
    /// </summary>
    public sealed class KawaGlintFishdexService
    {
        private readonly TsuriDexStore _store;

        public KawaGlintFishdexService(string baseDirectory)
        {
            _store = new TsuriDexStore(baseDirectory);
            Document = _store.Load();
            RunId = "run:" + Guid.NewGuid().ToString("N");
        }

        public TsuriDexDocument Document { get; }

        public string RunId { get; }

        /// <summary>
        /// 捕獲を記録する。 species/location が null の場合は何もしない (呼び出し側の防御漏れの
        /// 保険)。 IO 例外は Debug.LogError で握りつぶす。
        /// </summary>
        public void RecordCatch(TsuriSpecies species, TsuriLocationData location, int? sizeCm, long nowMs)
        {
            if (species == null || location == null)
            {
                return;
            }

            try
            {
                var op = new TsuriCatchOp
                {
                    opId = "fishcatch:" + Guid.NewGuid().ToString("N"),
                    runId = RunId,
                    source = TsuriWorldData.SourceFor(location.Zone),
                    locationId = location.Id,
                    speciesId = species.Id,
                    inventoryKey = species.InventoryKey,
                    edible = species.Edible,
                    name = species.Name,
                    rarity = RarityToWeb(species.Rarity),
                    sizeCm = sizeCm,
                    caughtAt = nowMs
                };

                _store.ApplyCatch(Document, op);
                _store.Save(Document);
            }
            catch (Exception ex)
            {
                Debug.LogError("[KawaGlintFishdexService] RecordCatch failed: " + ex);
            }
        }

        /// <summary>逃走を記録する。 source/locationCounts は加算しない (TsuriDexStore.ApplyEscape 契約)。</summary>
        public void RecordEscape(string speciesId, TsuriLocationData location, long nowMs)
        {
            if (string.IsNullOrEmpty(speciesId) || location == null)
            {
                return;
            }

            try
            {
                var opId = "fishescape:" + Guid.NewGuid().ToString("N");
                _store.ApplyEscape(Document, opId, speciesId, nowMs);
                _store.Save(Document);
            }
            catch (Exception ex)
            {
                Debug.LogError("[KawaGlintFishdexService] RecordEscape failed: " + ex);
            }
        }

        /// <summary>zone の累計釣果 (解放判定入力・§2.3)。</summary>
        public int ZoneCatchCount(TsuriWaterZone zone)
        {
            return Document.TotalCountForSource(TsuriWorldData.SourceFor(zone));
        }

        /// <summary>
        /// TsuriCatchOp.rarity の語彙。 batch:1470 §A-9 で "legendary" を追加した
        /// (段だけ先に用意する -- 在籍種は今回ゼロなので実際には出力されない)。
        /// dex スキーマ version は 1 のまま (counters 永続化は legendary 種と同時、§X-7)。
        /// </summary>
        private static string RarityToWeb(TsuriRarity rarity)
        {
            switch (rarity)
            {
                case TsuriRarity.Rare:
                    return "rare";
                case TsuriRarity.Super:
                    return "super";
                case TsuriRarity.Legendary:
                    return "legendary";
                default:
                    return "normal";
            }
        }
    }
}
