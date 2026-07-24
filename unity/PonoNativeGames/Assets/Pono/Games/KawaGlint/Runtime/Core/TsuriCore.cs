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
    /// <summary>
    /// batch:1470 実装契約 §A-5 新設: 1回の抽選に効く「セッションの記憶」だけを
    /// まとめた入力オブジェクト。 純データなので EditMode テストから任意の状態を
    /// 直接組み立てられる (セッション全体を作らなくてよい)。
    /// </summary>
    public sealed class TsuriDrawContext
    {
        /// <summary>直近に捕獲した speciesId (新しい順)。 null/空 = ペナルティ無し。</summary>
        public IReadOnlyList<string> RecentCatchIds;

        /// <summary>最後に rare 以上を捕獲してからのキャスト数 (レアリティ pity の入力)。</summary>
        public int DryCastsSinceRarity;

        /// <summary>図鑑既登録の speciesId。 **null = はじめて出会うボーナス無効**。</summary>
        public IReadOnlyCollection<string> KnownSpeciesIds;

        /// <summary>何の記憶も無い素の文脈 (テスト・既定値用)。</summary>
        public static readonly TsuriDrawContext Neutral = new TsuriDrawContext();
    }

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
                CaughtLog = new List<TsuriCaughtEntry>(),
                RecentCatchIds = new List<string>(),
                DryCastsSinceRarity = 0,
                KnownSpeciesIds = null
            };
            return session;
        }

        /// <summary>
        /// batch:1470 実装契約 §A-5: ロケーションの Spawns 台帳付きセッション。
        /// spawns に null を渡した場合は2引数版と完全に同じ (全種 WeightMul 1.0 / floor 無し)。
        /// </summary>
        public static TsuriSession CreateSession(
            IReadOnlyList<TsuriSpecies> pool, IReadOnlyList<TsuriSpawnEntry> spawns, TsuriMode mode)
        {
            var session = CreateSession(pool, mode);
            session.SpawnEntries = spawns != null ? new List<TsuriSpawnEntry>(spawns) : null;
            return session;
        }

        // ═══ 抽選 (1段絶対重みモデル・実装契約 §A-5) ══════════════════════
        /// <summary>
        /// 種ごとの選択確率 (0〜1、合計1) を解析的に計算する純関数。
        ///
        /// <code>
        /// W(i) = RarityBaseWeight(rarity_i)      // 100 / 13 / 2.0 / 0.55
        ///      × SpeciesWeightMul_i              // 同レアリティ内の相対倍率 (0.20〜1.50)
        ///      × LocationWeightMul_i             // TsuriSpawnEntry.WeightMul
        ///      × RecentPenalty(i)                // 直近捕獲なら ×0.80
        ///      × RarityPity()                    // rarity != Normal に一律 ×min(6.0, 1+0.25*max(0,Dry-8))
        ///      × FirstEncounterBonus(i)          // 図鑑未登録なら ×1.6
        /// P(i) = W(i) / ΣW
        /// </code>
        /// その後 <see cref="TsuriSpawnEntry.MinProbability"/> の floor を適用し、
        /// floor を受けなかった種で残りを再正規化する (合計は必ず 1)。
        ///
        /// ★旧モデルとの決定的な違い★ 「レアリティ層シェアを先に決めてから層内で配分」
        /// という2段正規化を**やめた**。 旧式は rare が1種しか居ないロケーションで
        /// その1種に層シェア全部 (25/95 = 26.3%) が乗るため、さけ/たいが常連になっていた。
        /// </summary>
        public static Dictionary<string, double> ComputeSpeciesProbabilities(
            IReadOnlyList<TsuriSpecies> speciesPool,
            IReadOnlyList<TsuriSpawnEntry> spawns,
            TsuriDrawContext ctx)
        {
            var probs = new Dictionary<string, double>();
            var pool = speciesPool;
            if (pool == null || pool.Count == 0)
            {
                return probs;
            }

            var context = ctx ?? TsuriDrawContext.Neutral;
            float pityMul = TsuriTuning.RarityPityMul(context.DryCastsSinceRarity);

            var weights = new double[pool.Count];
            double total = 0;
            for (int i = 0; i < pool.Count; i++)
            {
                var sp = pool[i];
                double w = TsuriTuning.RarityBaseWeight(sp.Rarity);
                w *= sp.SpeciesWeightMul > 0f ? sp.SpeciesWeightMul : 1.0;
                w *= LocationWeightMul(spawns, sp.Id);

                if (context.RecentCatchIds != null && Contains(context.RecentCatchIds, sp.Id))
                {
                    w *= TsuriTuning.RecentCatchWeightMul;
                }

                // レアリティ pity は rare/super/legendary に**一律**で掛ける
                // (層別に別倍率を掛けてはならない -- 契約 §A-5 適用ルール 1)。
                if (sp.Rarity != TsuriRarity.Normal)
                {
                    w *= pityMul;
                }

                // KnownSpeciesIds が null のときは「図鑑情報が無い」= ボーナス無効。
                if (context.KnownSpeciesIds != null && !ContainsId(context.KnownSpeciesIds, sp.Id))
                {
                    w *= TsuriTuning.FirstEncounterWeightMul;
                }

                weights[i] = w;
                total += w;
            }

            if (total <= 0)
            {
                // 全滅防止 (通常到達しない)。 均等割で返す。
                for (int i = 0; i < pool.Count; i++)
                {
                    probs[pool[i].Id] = 1.0 / pool.Count;
                }
                return probs;
            }

            for (int i = 0; i < pool.Count; i++)
            {
                probs[pool[i].Id] = weights[i] / total;
            }

            ApplyMinProbabilityFloor(probs, pool, spawns);
            return probs;
        }

        /// <summary>
        /// MinProbability の floor 適用 + 残りの再正規化 (合計1を保つ)。
        /// F = { i | MinProbability_i &gt; 0 かつ P(i) &lt; MinProbability_i } とし、
        /// F は floor 値に固定、F 以外は (1 - ΣMinProbability_F) の比例配分にする。
        /// </summary>
        private static void ApplyMinProbabilityFloor(
            Dictionary<string, double> probs,
            IReadOnlyList<TsuriSpecies> pool,
            IReadOnlyList<TsuriSpawnEntry> spawns)
        {
            if (spawns == null || spawns.Count == 0)
            {
                return;
            }

            List<string> floored = null;
            double flooredSum = 0;
            for (int i = 0; i < spawns.Count; i++)
            {
                var entry = spawns[i];
                if (entry == null || entry.MinProbability <= 0f || string.IsNullOrEmpty(entry.SpeciesId))
                {
                    continue;
                }
                if (!probs.TryGetValue(entry.SpeciesId, out var p) || p >= entry.MinProbability)
                {
                    continue;
                }

                (floored ?? (floored = new List<string>())).Add(entry.SpeciesId);
                flooredSum += entry.MinProbability;
                probs[entry.SpeciesId] = entry.MinProbability;
            }

            if (floored == null)
            {
                return;
            }

            double remaining = 1.0 - flooredSum;
            if (remaining <= 0)
            {
                // floor の合計が 1 を超える病的な台帳 (設計上あり得ない)。
                // 全体を正規化して合計1だけは死守する。
                double sum = 0;
                foreach (var kv in probs) sum += kv.Value;
                if (sum > 0)
                {
                    foreach (var id in new List<string>(probs.Keys)) probs[id] /= sum;
                }
                return;
            }

            double restTotal = 0;
            for (int i = 0; i < pool.Count; i++)
            {
                var id = pool[i].Id;
                if (!floored.Contains(id) && probs.TryGetValue(id, out var p)) restTotal += p;
            }

            if (restTotal <= 0)
            {
                return;
            }

            double scale = remaining / restTotal;
            for (int i = 0; i < pool.Count; i++)
            {
                var id = pool[i].Id;
                if (!floored.Contains(id) && probs.TryGetValue(id, out var p))
                {
                    probs[id] = p * scale;
                }
            }
        }

        /// <summary>Spawns 台帳からロケーション別 WeightMul を引く (未登録は 1.0)。</summary>
        private static double LocationWeightMul(IReadOnlyList<TsuriSpawnEntry> spawns, string speciesId)
        {
            if (spawns == null)
            {
                return 1.0;
            }
            for (int i = 0; i < spawns.Count; i++)
            {
                var entry = spawns[i];
                if (entry != null && entry.SpeciesId == speciesId)
                {
                    return entry.WeightMul > 0f ? entry.WeightMul : 1.0;
                }
            }
            return 1.0;
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
        /// <see cref="IReadOnlyCollection{T}"/> には Contains が無い (ICollection 側の
        /// メンバなので) ため、LINQ を持ち込まずに線形探索する。 呼び出し側が
        /// HashSet を渡していても要素数は高々30なのでコストは無視できる。
        /// </summary>
        private static bool ContainsId(IReadOnlyCollection<string> ids, string value)
        {
            if (ids is HashSet<string> set)
            {
                return set.Contains(value);
            }
            foreach (var id in ids)
            {
                if (id == value)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// 加重抽選で1種を選ぶ (実装契約 §A-5)。 <see cref="ComputeSpeciesProbabilities"/> と
        /// 同一の確率表を使うので、テスト側は解析値と実抽選のどちらでも検証できる。
        /// **同じ種が連続で出ることを一切禁止していない** (独立抽選)。
        /// </summary>
        public static string PickSpecies(
            IReadOnlyList<TsuriSpecies> speciesPool,
            IReadOnlyList<TsuriSpawnEntry> spawns,
            TsuriDrawContext ctx,
            Random random)
        {
            var pool = speciesPool;
            if (pool == null || pool.Count == 0)
            {
                return null;
            }

            var probs = ComputeSpeciesProbabilities(pool, spawns, ctx);
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

        /// <summary>セッションの記憶 (RecentCatchIds / DryCasts / KnownSpeciesIds) から抽選文脈を作る。</summary>
        public static TsuriDrawContext DrawContextOf(TsuriSession session)
        {
            if (session == null)
            {
                return TsuriDrawContext.Neutral;
            }
            return new TsuriDrawContext
            {
                RecentCatchIds = session.RecentCatchIds,
                DryCastsSinceRarity = session.DryCastsSinceRarity,
                KnownSpeciesIds = session.KnownSpeciesIds
            };
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

            // レアリティ pity の空キャストカウンタは**抽選の前に**進める
            // (契約 §A-5 適用ルール 3: DryCastsSinceRarity は Cast() のたびに +1)。
            // これで RarityPityStartCasts=8 が「8キャスト目から効き始める」と読める。
            next.DryCastsSinceRarity += 1;

            next.SpeciesId = PickSpecies(next.SpeciesPool, next.SpawnEntries, DrawContextOf(next), random);
            next.WaitRemainingSec = min + (float)(random.NextDouble() * (max - min));
            next.BiteWindowRemainingSec = 0f;
            next.GaugePct = 0f;
            next.FloorHeldSec = 0f;
            next.RendaElapsedSec = 0f;
            next.Phase = TsuriPhase.Wait;
            return next;
        }

        /// <summary>
        /// ロケーション切替 (実装契約 §A-5 適用ルール 4)。 pity/misses/CaughtLog/
        /// SessionSeenIds/Mode/**RecentCatchIds/DryCastsSinceRarity/KnownSpeciesIds** を
        /// 保持したまま pool と Spawns 台帳を差し替える。
        /// Phase が Idle/Landed/Escaped 以外なら複製をそのまま返す no-op (Cast と同じ
        /// ガード形)。 成立時は Phase=Idle, SpeciesId=null, Wait/Bite/Gauge/FloorHeld/
        /// RendaElapsed = 0 にリセットする (=Idle 画面へ戻す)。
        /// </summary>
        public static TsuriSession WithSpeciesPool(
            TsuriSession session,
            IReadOnlyList<TsuriSpecies> pool,
            IReadOnlyList<TsuriSpawnEntry> spawns)
        {
            var next = session.Clone();
            if (next.Phase != TsuriPhase.Idle && next.Phase != TsuriPhase.Landed && next.Phase != TsuriPhase.Escaped)
            {
                return next;
            }

            next.SpeciesPool = pool != null ? new List<TsuriSpecies>(pool) : new List<TsuriSpecies>();
            next.SpawnEntries = spawns != null ? new List<TsuriSpawnEntry>(spawns) : null;

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

        /// <summary>
        /// Landed 確定時の共通後処理。 next を mutate する。
        /// SessionSeenIds は**抽選からは参照しなくなった**が記録は継続する
        /// (契約 1-B 裁定: 将来の treasure_* prefix ルールの足場、コスト0)。
        /// batch:1470 で RecentCatchIds / DryCastsSinceRarity / KnownSpeciesIds の
        /// 更新もここに集約した (捕獲=landed が唯一の更新点、遭遇では動かない)。
        /// </summary>
        private static void MarkLanded(TsuriSession next, long nowMs)
        {
            if (!Contains(next.SessionSeenIds, next.SpeciesId))
            {
                next.SessionSeenIds.Add(next.SpeciesId);
            }
            next.CaughtLog.Add(new TsuriCaughtEntry { SpeciesId = next.SpeciesId, AtMs = nowMs });

            // 直近捕獲メモリ (新しいものが先頭、RecentCatchMemory 件でトリム)。
            if (next.RecentCatchIds == null)
            {
                next.RecentCatchIds = new List<string>();
            }
            next.RecentCatchIds.Remove(next.SpeciesId);
            next.RecentCatchIds.Insert(0, next.SpeciesId);
            while (next.RecentCatchIds.Count > TsuriTuning.RecentCatchMemory)
            {
                next.RecentCatchIds.RemoveAt(next.RecentCatchIds.Count - 1);
            }

            // レアリティ pity のリセットは「捕獲」でのみ起きる (逃したら伸び続ける)。
            var landedSpecies = FindInPool(next.SpeciesPool, next.SpeciesId);
            if (landedSpecies != null && landedSpecies.Rarity != TsuriRarity.Normal)
            {
                next.DryCastsSinceRarity = 0;
            }

            // 図鑑既登録集合 (非 null のときのみ) -- 2匹目からは初遭遇ボーナスが消える。
            next.KnownSpeciesIds?.Add(next.SpeciesId);
        }

        private static TsuriSpecies FindInPool(IReadOnlyList<TsuriSpecies> pool, string speciesId)
        {
            if (pool == null || string.IsNullOrEmpty(speciesId))
            {
                return null;
            }
            for (int i = 0; i < pool.Count; i++)
            {
                if (pool[i] != null && pool[i].Id == speciesId)
                {
                    return pool[i];
                }
            }
            return null;
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
