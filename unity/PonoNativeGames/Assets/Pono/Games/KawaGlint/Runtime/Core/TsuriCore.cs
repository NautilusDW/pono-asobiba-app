// ── Pono.KawaGlint.Core / TsuriCore.cs ──
// common/tsuri/core.js の状態機械 (cast → wait → bite(窓) → renda(連打ゲージ) →
// tug(オプショナル) → landed / escaped) の純C#移植。 UnityEngine は一切使わない
// (MonoBehaviour禁止、System.Math / System.Random のみ)。
//
// 全操作関数 (Cast/Tick/TapHook/TapRenda) は引数の session を mutate せず、
// TsuriSession.Clone() した新しい session を返す (core.js の純関数契約に忠実)。
// 乱数 (System.Random) と現在時刻 (nowMs) は引数として注入し、決定論的な
// EditMode テストを可能にする。
using System;
using System.Collections.Generic;

namespace Pono.KawaGlint.Core
{
    public static class TsuriCore
    {
        // ═══ セッション生成 ══════════════════════════════════════════════
        /// <summary>
        /// 新規セッション。 speciesPool/mode はここで固定し、以後 Cast() が
        /// 内部で参照する (Cast() 自体は speciesPool を引数に取らない契約のため)。
        /// </summary>
        public static TsuriSession CreateSession(IReadOnlyList<TsuriSpecies> pool, TsuriMode mode)
        {
            var session = new TsuriSession
            {
                SpeciesPool = pool != null ? new List<TsuriSpecies>(pool) : new List<TsuriSpecies>(),
                Mode = mode,
                Phase = TsuriPhase.Idle,
                SpeciesId = null,
                WaitRemainingSec = 0f,
                BiteWindowRemainingSec = 0f,
                GaugePct = 0f,
                ConsecutiveMisses = 0,
                PityBySpecies = new Dictionary<string, float>(),
                SessionSeenIds = new List<string>(),
                FloorHeldSec = 0f,
                CaughtLog = new List<TsuriCaughtEntry>()
            };
            return session;
        }

        /// <summary>
        /// 海拡張 (実装契約v1.0 §A-4) 新設オーバーロード。 weightMulBySpeciesId (通常
        /// TsuriWorldData.BuildWeightMulMap の結果) をセッションに紐づける。
        /// null を渡した場合は既存2引数版と完全に同じ結果になる (Core 既存パス保証)。
        /// </summary>
        public static TsuriSession CreateSession(
            IReadOnlyList<TsuriSpecies> pool, TsuriMode mode,
            IReadOnlyDictionary<string, float> weightMulBySpeciesId)
        {
            var session = CreateSession(pool, mode);
            session.SpeciesWeightMulById = CloneWeightMulMap(weightMulBySpeciesId);
            return session;
        }

        /// <summary>weightMulBySpeciesId の防御的コピー。 null 入力は null を返す (現行パス維持)。</summary>
        private static Dictionary<string, float> CloneWeightMulMap(IReadOnlyDictionary<string, float> weightMulBySpeciesId)
        {
            if (weightMulBySpeciesId == null)
            {
                return null;
            }

            var map = new Dictionary<string, float>();
            foreach (var kv in weightMulBySpeciesId)
            {
                map[kv.Key] = kv.Value;
            }
            return map;
        }

        // ═══ 抽選 ════════════════════════════════════════════════════════
        /// <summary>
        /// speciesPool + sessionSeenIds から、種ごとの選択確率 (0〜1、合計1) を
        /// 解析的に計算する純関数。 PickSpecies() の内部でも使うが、テスト側が
        /// System.Random に依存せず抽選ロジックを検証できるよう公開もしている。
        ///
        /// アルゴリズム: (1) プールに存在するレアリティだけで RarityBaseWeight を
        /// 相対比較 (2) 同一レアリティ内では species.Weight の比率で配分
        /// (3) sessionSeenIds に含まれる種は SessionDedupeWeightMul を掛けて重み減衰。
        /// </summary>
        public static Dictionary<string, double> ComputeSpeciesProbabilities(
            IReadOnlyList<TsuriSpecies> speciesPool, IReadOnlyList<string> sessionSeenIds)
        {
            var probs = new Dictionary<string, double>();
            var pool = speciesPool;
            var seen = sessionSeenIds ?? Array.Empty<string>();
            if (pool == null || pool.Count == 0)
            {
                return probs;
            }

            var rarityOrder = new List<TsuriRarity>();
            var byRarity = new Dictionary<TsuriRarity, List<TsuriSpecies>>();
            for (int i = 0; i < pool.Count; i++)
            {
                var sp = pool[i];
                if (!byRarity.ContainsKey(sp.Rarity))
                {
                    byRarity[sp.Rarity] = new List<TsuriSpecies>();
                    rarityOrder.Add(sp.Rarity);
                }
                byRarity[sp.Rarity].Add(sp);
            }

            var rarityWeights = new double[rarityOrder.Count];
            double rarityTotal = 0;
            for (int i = 0; i < rarityOrder.Count; i++)
            {
                rarityWeights[i] = TsuriTuning.RarityBaseWeight(rarityOrder[i]);
                rarityTotal += rarityWeights[i];
            }

            for (int idx = 0; idx < rarityOrder.Count; idx++)
            {
                double rarityShare = rarityTotal > 0 ? rarityWeights[idx] / rarityTotal : 0;
                var speciesInRarity = byRarity[rarityOrder[idx]];
                var speciesWeights = new double[speciesInRarity.Count];
                double speciesTotal = 0;
                for (int i = 0; i < speciesInRarity.Count; i++)
                {
                    var sp = speciesInRarity[i];
                    double w = sp.Weight > 0 ? sp.Weight : 1;
                    if (Contains(seen, sp.Id))
                    {
                        w *= TsuriTuning.SessionDedupeWeightMul;
                    }
                    speciesWeights[i] = w;
                    speciesTotal += w;
                }

                for (int i = 0; i < speciesInRarity.Count; i++)
                {
                    double share = speciesTotal > 0 ? speciesWeights[i] / speciesTotal : 0;
                    probs[speciesInRarity[i].Id] = rarityShare * share;
                }
            }

            return probs;
        }

        /// <summary>
        /// 海拡張 (実装契約v1.0 §A-4) 新設オーバーロード。 map が null/空の場合は既存2引数版の
        /// 結果をそのまま返す (ビット同一)。 それ以外は既存計算の結果 probs に対し
        /// probs[id] *= mul (未指定は既定1.0) した後、合計1に再正規化する
        /// (rarity階層構造そのものには手を入れない)。
        /// </summary>
        public static Dictionary<string, double> ComputeSpeciesProbabilities(
            IReadOnlyList<TsuriSpecies> speciesPool, IReadOnlyList<string> sessionSeenIds,
            IReadOnlyDictionary<string, float> weightMulBySpeciesId)
        {
            var baseProbs = ComputeSpeciesProbabilities(speciesPool, sessionSeenIds);
            if (weightMulBySpeciesId == null || weightMulBySpeciesId.Count == 0)
            {
                return baseProbs;
            }

            var weighted = new Dictionary<string, double>();
            double total = 0;
            foreach (var kv in baseProbs)
            {
                float mul = weightMulBySpeciesId.TryGetValue(kv.Key, out var m) ? m : 1f;
                double w = kv.Value * mul;
                weighted[kv.Key] = w;
                total += w;
            }

            if (total <= 0)
            {
                // 全滅防止の防御的フォールバック(通常到達しない)。
                return baseProbs;
            }

            var result = new Dictionary<string, double>();
            foreach (var kv in weighted)
            {
                result[kv.Key] = kv.Value / total;
            }
            return result;
        }

        private static bool Contains(IReadOnlyList<string> list, string value)
        {
            for (int i = 0; i < list.Count; i++)
            {
                if (list[i] == value)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// 加重抽選で1種を選ぶ。 pityBySpecies は今回 (Phase0) は抽選そのものには
        /// 使わず、Tick() 側の bite 窓計算にのみ使う契約 (pity=窓を広げる、出現率には
        /// 介入しない)。 引数に残してあるのは契約どおり + 将来の拡張余地のため。
        /// </summary>
        public static string PickSpecies(
            IReadOnlyList<TsuriSpecies> speciesPool,
            IReadOnlyDictionary<string, float> pityBySpecies,
            IReadOnlyList<string> sessionSeenIds,
            Random random)
        {
            // 4引数版は5引数版へ null 委譲する (ComputeSpeciesProbabilities の3引数版が
            // map==null 時に2引数版の結果をそのまま返すため、挙動はビット同一)。
            return PickSpecies(speciesPool, pityBySpecies, sessionSeenIds, random, null);
        }

        /// <summary>
        /// 海拡張 (実装契約v1.0 §A-4) 新設オーバーロード。 weightMulBySpeciesId が null の
        /// 場合は既存4引数版と完全に同じ抽選結果になる (Core 既存パス保証)。
        /// </summary>
        public static string PickSpecies(
            IReadOnlyList<TsuriSpecies> speciesPool,
            IReadOnlyDictionary<string, float> pityBySpecies,
            IReadOnlyList<string> sessionSeenIds,
            Random random,
            IReadOnlyDictionary<string, float> weightMulBySpeciesId)
        {
            var pool = speciesPool;
            if (pool == null || pool.Count == 0)
            {
                return null;
            }

            var probs = ComputeSpeciesProbabilities(pool, sessionSeenIds ?? Array.Empty<string>(), weightMulBySpeciesId);
            double total = 0;
            for (int i = 0; i < pool.Count; i++)
            {
                total += probs.TryGetValue(pool[i].Id, out var p) ? p : 0;
            }

            if (total <= 0)
            {
                return pool[0].Id;
            }

            double r = random.NextDouble() * total;
            double acc = 0;
            for (int j = 0; j < pool.Count; j++)
            {
                acc += probs.TryGetValue(pool[j].Id, out var p) ? p : 0;
                if (r < acc)
                {
                    return pool[j].Id;
                }
            }

            return pool[pool.Count - 1].Id;
        }

        // ═══ セッション進行 (Cast / Tick / TapHook / TapRenda) ════════════

        /// <summary>
        /// Idle/Landed/Escaped から Wait へ。 それ以外のフェーズ中の呼び出しは
        /// 複製をそのまま返す no-op (キャスト中の演出やめいろ的な多重発火を防ぐ)。
        /// </summary>
        public static TsuriSession Cast(TsuriSession session, float waitSecMin, float waitSecMax, Random random)
        {
            var next = session.Clone();
            if (next.Phase != TsuriPhase.Idle && next.Phase != TsuriPhase.Landed && next.Phase != TsuriPhase.Escaped)
            {
                return next;
            }

            float min = waitSecMin;
            float max = waitSecMax;
            if (max < min)
            {
                float tmp = min;
                min = max;
                max = tmp;
            }

            next.SpeciesId = PickSpecies(next.SpeciesPool, next.PityBySpecies, next.SessionSeenIds, random, next.SpeciesWeightMulById);
            next.WaitRemainingSec = min + (float)(random.NextDouble() * (max - min));
            next.BiteWindowRemainingSec = 0f;
            next.GaugePct = 0f;
            next.FloorHeldSec = 0f;
            next.RendaElapsedSec = 0f;
            next.Phase = TsuriPhase.Wait;
            return next;
        }

        /// <summary>
        /// 海拡張 (実装契約v1.0 §A-4) 新設: ロケーション切替。 pity/misses/CaughtLog/
        /// SessionSeenIds/Mode を保持したまま pool と weightMul を差し替える。
        /// Phase が Idle/Landed/Escaped 以外なら複製をそのまま返す no-op (Cast と同じ
        /// ガード形)。 成立時は Phase=Idle, SpeciesId=null, Wait/Bite/Gauge/FloorHeld/
        /// RendaElapsed = 0 にリセットする (=Idle 画面へ戻す)。
        /// </summary>
        public static TsuriSession WithSpeciesPool(
            TsuriSession session,
            IReadOnlyList<TsuriSpecies> pool,
            IReadOnlyDictionary<string, float> weightMulBySpeciesId)
        {
            var next = session.Clone();
            if (next.Phase != TsuriPhase.Idle && next.Phase != TsuriPhase.Landed && next.Phase != TsuriPhase.Escaped)
            {
                return next;
            }

            next.SpeciesPool = pool != null ? new List<TsuriSpecies>(pool) : new List<TsuriSpecies>();
            next.SpeciesWeightMulById = CloneWeightMulMap(weightMulBySpeciesId);

            next.Phase = TsuriPhase.Idle;
            next.SpeciesId = null;
            next.WaitRemainingSec = 0f;
            next.BiteWindowRemainingSec = 0f;
            next.GaugePct = 0f;
            next.FloorHeldSec = 0f;
            next.RendaElapsedSec = 0f;
            return next;
        }

        /// <summary>Wait 終了時のフッキング猶予(秒)を計算する。 pity/assist/gearMods を全て反映済み。</summary>
        public static float ComputeBiteWindowSec(TsuriMode mode, TsuriGearMods mods, float pityPct, int consecutiveMisses)
        {
            float baseSec = TsuriTuning.WindowSec(mode) + TsuriTuning.WindowGraceSec(mode);
            float assistMul = consecutiveMisses == TsuriTuning.AssistDoubleWindowAfterMisses ? 2f : 1f;
            float pityMul = 1f + (pityPct / 100f);
            float windowMul = mods != null ? mods.WindowMul : 1f;
            return baseSec * windowMul * assistMul * pityMul;
        }

        /// <summary>
        /// 経過時間 dtSec を1フェーズぶんだけ進める純関数。 mods 省略時は
        /// TsuriGearMods.Neutral を使う。 Idle/Landed/Escaped では何もしない
        /// (次に進めるには呼び出し側が Cast() を呼ぶ)。 nowMs は caughtLog の
        /// AtMs に使う (Web版 Date.now() 相当を引数注入)。
        /// </summary>
        public static TsuriSession Tick(TsuriSession session, float dtSec, TsuriGearMods mods, long nowMs)
        {
            var next = session.Clone();
            var m = mods ?? TsuriGearMods.Neutral;
            float dt = dtSec < 0f ? 0f : dtSec;

            if (next.Phase == TsuriPhase.Wait)
            {
                next.WaitRemainingSec -= dt;
                if (next.WaitRemainingSec <= 0f)
                {
                    next.WaitRemainingSec = 0f;
                    if (next.ConsecutiveMisses >= TsuriTuning.AutoHookAfterMisses)
                    {
                        // 3連続逃し→4回目は自動フッキング(連打から開始)。 モード設定に関係なく発動。
                        next.Phase = TsuriPhase.Renda;
                        next.GaugePct = 0f;
                        next.FloorHeldSec = 0f;
                        next.RendaElapsedSec = 0f;
                    }
                    else
                    {
                        float pityPct = next.PityBySpecies.TryGetValue(next.SpeciesId ?? string.Empty, out var pv) ? pv : 0f;
                        next.BiteWindowRemainingSec = ComputeBiteWindowSec(next.Mode, m, pityPct, next.ConsecutiveMisses);
                        next.Phase = TsuriPhase.Bite;
                    }
                }
                return next;
            }

            if (next.Phase == TsuriPhase.Bite)
            {
                next.BiteWindowRemainingSec -= dt;
                if (next.BiteWindowRemainingSec <= 0f)
                {
                    next.BiteWindowRemainingSec = 0f;
                    next.Phase = TsuriPhase.Escaped;
                    next.ConsecutiveMisses += 1;
                    string speciesId = next.SpeciesId ?? string.Empty;
                    float prevPity = next.PityBySpecies.TryGetValue(speciesId, out var pv) ? pv : 0f;
                    next.PityBySpecies[speciesId] = prevPity + TsuriTuning.PityWindowBonusPctPerEscape;
                }
                return next;
            }

            if (next.Phase == TsuriPhase.Renda)
            {
                // v2 (2026-07-24) 新設: Renda 滞在合計時間(タップの有無に関わらず加算)。
                // 時間ベースの第2おたすけ判定に使う(下記参照)。
                next.RendaElapsedSec += dt;

                float decay = TsuriTuning.GaugeDecayPerSec * m.DecayMul * dt;
                // 床(GaugeFloorPct)より下には絶対に落とさない(初期値0からの最初のtickでも
                // 床まで即座に持ち上がる=「連打ゲージが0まで落ちない」契約どおりの挙動)。
                next.GaugePct = Math.Max(next.GaugePct - decay, TsuriTuning.GaugeFloorPct);
                if (next.GaugePct <= TsuriTuning.GaugeFloorPct)
                {
                    next.FloorHeldSec += dt;
                }
                else
                {
                    next.FloorHeldSec = 0f;
                }

                // v2 (2026-07-24): GaugeDecayPerSec を 9 に引き上げたことで、
                // 1tap/s 程度の遅いタップの子はタップの度にゲージが床の上へ
                // 浮き FloorHeldSec が毎回リセットされ続け、既存の床おたすけが
                // 永久に発動しない詰みが生まれ得る。 Renda 滞在合計時間
                // (RendaElapsedSec >= RendaHelpAfterSec) を第2の安全網として追加。
                bool floorHelp = next.FloorHeldSec >= TsuriTuning.HelpAfterFloorSec;
                bool timeHelp = next.RendaElapsedSec >= TsuriTuning.RendaHelpAfterSec;
                if (next.Mode == TsuriMode.Relaxed && (floorHelp || timeHelp))
                {
                    // NOTE(tugスタブ骨組み・Phase 2で中身実装予定): IsTugEnabled() が
                    // true を返すようになったら、ここで Landed に直行せず Tug へ一旦
                    // 遷移させる(企画書§3.7: renda → tug(オプショナル) → landed/escaped)。
                    // Phase 0 は IsTugEnabled() が常に false を返すため、この分岐は
                    // 素通りし以下のおたすけ→Landed直行フローは一切変わらない。
                    if (IsTugEnabled(m))
                    {
                        // Phase 2 で実装: next.Phase = TsuriPhase.Tug; のような遷移を
                        // ここに追加する。 Phase 0 では到達しない
                        // (TsuriTuning.TugEnabledDefault === false)。
                    }

                    // おたすけ: ポノが一緒に引いて自動で釣り上がる(のんびりのみ)。
                    next.GaugePct = 100f;
                    next.Phase = TsuriPhase.Landed;
                    next.ConsecutiveMisses = 0;
                    next.FloorHeldSec = 0f;
                    next.RendaElapsedSec = 0f;
                    MarkLanded(next, nowMs);
                }
                return next;
            }

            return next; // Idle/Landed/Escaped: 何もしない
        }

        /// <summary>Landed 確定時の共通後処理 (SessionSeenIds 追記 + CaughtLog 追記)。 next を mutate する。</summary>
        private static void MarkLanded(TsuriSession next, long nowMs)
        {
            if (!Contains(next.SessionSeenIds, next.SpeciesId))
            {
                next.SessionSeenIds.Add(next.SpeciesId);
            }
            next.CaughtLog.Add(new TsuriCaughtEntry { SpeciesId = next.SpeciesId, AtMs = nowMs });
        }

        /// <summary>
        /// Phase==Bite の時だけ有効。 早い/遅いを問わず窓が開いていれば即 Renda へ。
        /// それ以外のフェーズでは no-op (早すぎタップを失敗にしない、の実装)。
        /// </summary>
        public static TsuriSession TapHook(TsuriSession session)
        {
            var next = session.Clone();
            if (next.Phase != TsuriPhase.Bite)
            {
                return next;
            }
            next.Phase = TsuriPhase.Renda;
            next.GaugePct = 0f;
            next.FloorHeldSec = 0f;
            next.RendaElapsedSec = 0f;
            next.BiteWindowRemainingSec = 0f;
            return next;
        }

        /// <summary>
        /// Phase==Renda の時だけ有効。 GaugePct を species.ChallengeProfile.TapsBase
        /// ベースで加算し、100超えで Landed へ。 ConsecutiveMisses は Landed で0にリセット。
        /// </summary>
        public static TsuriSession TapRenda(TsuriSession session, TsuriSpecies species, TsuriGearMods mods, long nowMs)
        {
            var next = session.Clone();
            if (next.Phase != TsuriPhase.Renda)
            {
                return next;
            }

            var m = mods ?? TsuriGearMods.Neutral;
            int tapsBase = (species != null && species.ChallengeProfile != null && species.ChallengeProfile.TapsBase > 0)
                ? species.ChallengeProfile.TapsBase
                : 1;
            // v2 (2026-07-24): 全種一律で RendaGainMul(0.7) を掛け、キャッチまでの
            // 必要タップ数を増やす(種間の相対難度は不変、web core.jsは不変)。
            float gain = (100f / tapsBase) * TsuriTuning.RendaGainMul * m.GainMul;
            next.GaugePct += gain;
            next.FloorHeldSec = 0f; // タップがあった=床に留まっていない
            if (next.GaugePct >= 100f)
            {
                next.GaugePct = 100f;
                next.Phase = TsuriPhase.Landed;
                next.ConsecutiveMisses = 0;
                next.FloorHeldSec = 0f;
                next.RendaElapsedSec = 0f;
                MarkLanded(next, nowMs);
            }
            return next;
        }

        /// <summary>Phase が Landed または Escaped なら true。</summary>
        public static bool IsTerminal(TsuriSession session)
        {
            return session != null && (session.Phase == TsuriPhase.Landed || session.Phase == TsuriPhase.Escaped);
        }

        /// <summary>
        /// renda → tug 遷移を許可するかどうかを判定する骨組み。 Phase 0 は
        /// TsuriTuning.TugEnabledDefault も mods.TugEnabled も真にならないため
        /// 常に false を返す (=既存フロー不変)。
        /// </summary>
        public static bool IsTugEnabled(TsuriGearMods mods)
        {
            var m = mods ?? TsuriGearMods.Neutral;
            return TsuriTuning.TugEnabledDefault || m.TugEnabled;
        }
    }
}
