// ── Pono.KawaGlint.Tests.EditMode / TsuriCoreEditModeTests.cs ──
// common/tsuri/core.js の状態機械 C# 移植 (Pono.KawaGlint.Core) を検証する
// NUnit テスト。 乱数は必ず固定シードの System.Random を新規生成し、時刻は
// nowMs 引数に固定値を渡す (実行環境非依存の決定論的テスト)。
using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Tests.EditMode
{
    public sealed class TsuriCoreEditModeTests
    {
        private const double Tolerance = 1e-3;

        private static List<TsuriSpecies> FullPool()
        {
            return new List<TsuriSpecies>(TsuriFishData.RiverSpecies);
        }

        // ═══ 1. チューニング定数 ════════════════════════════════════════
        [Test]
        public void TuningConstants_MatchSpec()
        {
            Assert.That(TsuriTuning.WindowSec(TsuriMode.Relaxed), Is.EqualTo(1.5f).Within(Tolerance));
            Assert.That(TsuriTuning.WindowSec(TsuriMode.Expert), Is.EqualTo(0.8f).Within(Tolerance));
            Assert.That(TsuriTuning.WindowGraceSec(TsuriMode.Relaxed), Is.EqualTo(0.5f).Within(Tolerance));
            Assert.That(TsuriTuning.WindowGraceSec(TsuriMode.Expert), Is.EqualTo(0f).Within(Tolerance));
            Assert.That(TsuriTuning.GaugeFloorPct, Is.EqualTo(30f).Within(Tolerance));
            Assert.That(TsuriTuning.GaugeDecayPerSec, Is.EqualTo(9f).Within(Tolerance));
            Assert.That(TsuriTuning.RendaGainMul, Is.EqualTo(0.7f).Within(Tolerance));
            Assert.That(TsuriTuning.RendaHelpAfterSec, Is.EqualTo(18f).Within(Tolerance));
            Assert.That(TsuriTuning.AssistDoubleWindowAfterMisses, Is.EqualTo(2));
            Assert.That(TsuriTuning.AutoHookAfterMisses, Is.EqualTo(3));
            Assert.That(TsuriTuning.HelpAfterFloorSec, Is.EqualTo(10f).Within(Tolerance));
            Assert.That(TsuriTuning.PityWindowBonusPctPerEscape, Is.EqualTo(20f).Within(Tolerance));
            // batch:1470: レアリティ基準重みは 70/25/5 の「層シェア」から
            // 100/13/2.0/0.55 の「1段絶対重み」へ作り直した (詳細は
            // TsuriDrawModelEditModeTests が正本。ここは重複を避けて存在確認のみ)。
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Normal), Is.EqualTo(100f).Within(Tolerance));
            Assert.That(TsuriTuning.TugEnabledDefault, Is.False);
        }

        // ═══ 2. CreateSession 初期形状 ═══════════════════════════════════
        [Test]
        public void CreateSession_InitialShape_IsIdleAndEmpty()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);

            Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Idle));
            Assert.That(session.SpeciesId, Is.Null);
            Assert.That(session.GaugePct, Is.EqualTo(0f));
            Assert.That(session.ConsecutiveMisses, Is.EqualTo(0));
            Assert.That(session.WaitRemainingSec, Is.EqualTo(0f));
            Assert.That(session.BiteWindowRemainingSec, Is.EqualTo(0f));
            Assert.That(session.FloorHeldSec, Is.EqualTo(0f));
            Assert.That(session.RendaElapsedSec, Is.EqualTo(0f));
            Assert.That(session.PityBySpecies, Is.Empty);
            Assert.That(session.SessionSeenIds, Is.Empty);
            Assert.That(session.CaughtLog, Is.Empty);
            // batch:1470 新設フィールド。
            Assert.That(session.RecentCatchIds, Is.Empty);
            Assert.That(session.DryCastsSinceRarity, Is.EqualTo(0));
            Assert.That(session.KnownSpeciesIds, Is.Null, "既定は null = 初遭遇ボーナス無効");
        }

        // ═══ 3. Cast ═════════════════════════════════════════════════════
        [Test]
        public void Cast_FromIdle_TransitionsToWaitWithinRange()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            var random = new Random(42);

            var next = TsuriCore.Cast(session, 2f, 5f, random);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Wait));
            Assert.That(next.WaitRemainingSec, Is.GreaterThanOrEqualTo(2f));
            Assert.That(next.WaitRemainingSec, Is.LessThanOrEqualTo(5f));
            Assert.That(next.SpeciesId, Is.Not.Null);
            // 入力 session は mutate されない(純関数契約)。
            Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Idle));
        }

        [Test]
        public void Cast_DuringWait_IsNoOp()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            var random = new Random(1);
            var waiting = TsuriCore.Cast(session, 2f, 5f, random);
            float waitBefore = waiting.WaitRemainingSec;
            string speciesBefore = waiting.SpeciesId;

            var next = TsuriCore.Cast(waiting, 2f, 5f, random);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Wait));
            Assert.That(next.WaitRemainingSec, Is.EqualTo(waitBefore));
            Assert.That(next.SpeciesId, Is.EqualTo(speciesBefore));
        }

        [Test]
        public void Cast_SwapsMinMaxWhenMaxLessThanMin()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            var random = new Random(7);

            var next = TsuriCore.Cast(session, 5f, 2f, random);

            Assert.That(next.WaitRemainingSec, Is.GreaterThanOrEqualTo(2f));
            Assert.That(next.WaitRemainingSec, Is.LessThanOrEqualTo(5f));
        }

        // ═══ 4. Wait → Bite 遷移と窓計算 ════════════════════════════════
        [Test]
        public void Tick_Wait_Completes_TransitionsToBite_WithNeutralWindow()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Wait;
            session.WaitRemainingSec = 0.5f;
            session.SpeciesId = "fish_ayu";

            var next = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 1000L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Bite));
            Assert.That(next.BiteWindowRemainingSec, Is.EqualTo(2.0f).Within(Tolerance));
        }

        [Test]
        public void Tick_Wait_Completes_WithPity20Pct_WindowIs2Point4()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Wait;
            session.WaitRemainingSec = 0.5f;
            session.SpeciesId = "fish_ayu";
            session.PityBySpecies["fish_ayu"] = 20f;

            var next = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 1000L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Bite));
            Assert.That(next.BiteWindowRemainingSec, Is.EqualTo(2.4f).Within(Tolerance));
        }

        [Test]
        public void Tick_Wait_Completes_WithExactlyTwoMisses_WindowIsDoubled()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Wait;
            session.WaitRemainingSec = 0.5f;
            session.SpeciesId = "fish_ayu";
            session.ConsecutiveMisses = 2;

            var next = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 1000L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Bite));
            Assert.That(next.BiteWindowRemainingSec, Is.EqualTo(4.0f).Within(Tolerance));
        }

        [Test]
        public void Tick_Wait_Completes_WithThreeMisses_AutoHooksToRendaWithoutWindowDouble()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Wait;
            session.WaitRemainingSec = 0.5f;
            session.SpeciesId = "fish_ayu";
            session.ConsecutiveMisses = 3;

            var next = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 1000L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(next.GaugePct, Is.EqualTo(0f));
            Assert.That(next.FloorHeldSec, Is.EqualTo(0f));
            Assert.That(next.BiteWindowRemainingSec, Is.EqualTo(0f));
        }

        // ═══ 5. Bite タイムアウト → Escaped ═════════════════════════════
        [Test]
        public void Tick_Bite_Timeout_TransitionsEscaped_WithMissesAndPity()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Bite;
            session.BiteWindowRemainingSec = 0.5f;
            session.SpeciesId = "fish_salmon";
            session.ConsecutiveMisses = 0;

            var escapedOnce = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 2000L);

            Assert.That(escapedOnce.Phase, Is.EqualTo(TsuriPhase.Escaped));
            Assert.That(escapedOnce.ConsecutiveMisses, Is.EqualTo(1));
            Assert.That(escapedOnce.PityBySpecies["fish_salmon"], Is.EqualTo(20f).Within(Tolerance));

            // 同一 species を再度逃すと pity が累積する。
            var biteAgain = escapedOnce.Clone();
            biteAgain.Phase = TsuriPhase.Bite;
            biteAgain.BiteWindowRemainingSec = 0.5f;

            var escapedTwice = TsuriCore.Tick(biteAgain, 1f, TsuriGearMods.Neutral, 3000L);

            Assert.That(escapedTwice.ConsecutiveMisses, Is.EqualTo(2));
            Assert.That(escapedTwice.PityBySpecies["fish_salmon"], Is.EqualTo(40f).Within(Tolerance));
        }

        // ═══ 6. TapHook ══════════════════════════════════════════════════
        [Test]
        public void TapHook_OnlyTransitionsFromBite()
        {
            var idleSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            var idleResult = TsuriCore.TapHook(idleSession);
            Assert.That(idleResult.Phase, Is.EqualTo(TsuriPhase.Idle));

            var waitSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            waitSession.Phase = TsuriPhase.Wait;
            var waitResult = TsuriCore.TapHook(waitSession);
            Assert.That(waitResult.Phase, Is.EqualTo(TsuriPhase.Wait));

            var biteSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            biteSession.Phase = TsuriPhase.Bite;
            biteSession.BiteWindowRemainingSec = 1f;
            var biteResult = TsuriCore.TapHook(biteSession);
            Assert.That(biteResult.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(biteResult.GaugePct, Is.EqualTo(0f));
            Assert.That(biteResult.BiteWindowRemainingSec, Is.EqualTo(0f));
        }

        // ═══ 7. TapRenda ═════════════════════════════════════════════════
        [Test]
        public void TapRenda_Ayu_TwelveTaps_LandsWithGauge100AndMisses0()
        {
            // v2 (2026-07-24): RendaGainMul(0.7)適用によりayu(TapsBase=8)のper-tap gainは
            // 8.75%に低下(旧12.5%)、キャッチに必要なタップ数が8→12に増える。
            var ayu = TsuriFishData.GetSpeciesById("fish_ayu");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.ConsecutiveMisses = 5; // 着地でリセットされることを確認するため非0で開始
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 11; i++)
            {
                current = TsuriCore.TapRenda(current, ayu, TsuriGearMods.Neutral, 5000L);
            }

            Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(current.GaugePct, Is.EqualTo(96.25f).Within(Tolerance));

            var landed = TsuriCore.TapRenda(current, ayu, TsuriGearMods.Neutral, 6000L);

            Assert.That(landed.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(landed.GaugePct, Is.EqualTo(100f).Within(Tolerance));
            Assert.That(landed.ConsecutiveMisses, Is.EqualTo(0));
            Assert.That(landed.RendaElapsedSec, Is.EqualTo(0f).Within(Tolerance));
            Assert.That(landed.SessionSeenIds, Does.Contain("fish_ayu"));
            Assert.That(landed.CaughtLog, Has.Count.EqualTo(1));
            Assert.That(landed.CaughtLog[0].SpeciesId, Is.EqualTo("fish_ayu"));
            Assert.That(landed.CaughtLog[0].AtMs, Is.EqualTo(6000L));
        }

        [Test]
        public void TapRenda_GainAppliesRendaGainMul()
        {
            // treasure_boot(TapsBase=4)は旧gainなら1タップで25%だが、RendaGainMul(0.7)適用で17.5%になる。
            var boot = TsuriFishData.GetSpeciesById("treasure_boot");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.SpeciesId = "treasure_boot";

            var next = TsuriCore.TapRenda(session, boot, TsuriGearMods.Neutral, 0L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(next.GaugePct, Is.EqualTo(17.5f).Within(Tolerance));
        }

        [Test]
        public void TapRenda_OnlyValidDuringRenda()
        {
            var ayu = TsuriFishData.GetSpeciesById("fish_ayu");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Bite;

            var next = TsuriCore.TapRenda(session, ayu, TsuriGearMods.Neutral, 0L);

            Assert.That(next.Phase, Is.EqualTo(TsuriPhase.Bite));
            Assert.That(next.GaugePct, Is.EqualTo(0f));
        }

        // ═══ 8. Renda ゲージ床・おたすけ ══════════════════════════════════
        [Test]
        public void Tick_Renda_GaugeNeverDropsBelowFloor_AndAccumulatesFloorHeldSec()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;

            var afterFirstTick = TsuriCore.Tick(session, 1f, TsuriGearMods.Neutral, 0L);

            Assert.That(afterFirstTick.GaugePct, Is.EqualTo(30f).Within(Tolerance));
            Assert.That(afterFirstTick.FloorHeldSec, Is.EqualTo(1f).Within(Tolerance));
        }

        [Test]
        public void Tick_Renda_Relaxed_HelpAfterFloor10Sec_LandsAutomatically()
        {
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 9; i++)
            {
                current = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 0L);
                Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda), "9秒までは Renda のまま");
            }

            var landed = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 9000L);

            Assert.That(landed.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(landed.GaugePct, Is.EqualTo(100f).Within(Tolerance));
            Assert.That(landed.FloorHeldSec, Is.EqualTo(0f));
            Assert.That(landed.CaughtLog, Has.Count.EqualTo(1));
        }

        [Test]
        public void Tick_Renda_Expert_NeverAutoLandsFromFloorHelp()
        {
            // 25tick(=25秒)に拡張: 床おたすけ(10s)だけでなく新設の時間おたすけ(18s)を
            // 越えてもExpertは自動着地しないことを同時に証明する。
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Expert);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 25; i++)
            {
                current = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 0L);
            }

            Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(current.FloorHeldSec, Is.GreaterThanOrEqualTo(10f));
            Assert.That(current.RendaElapsedSec, Is.GreaterThanOrEqualTo(TsuriTuning.RendaHelpAfterSec));
        }

        [Test]
        public void TapRenda_ResetsFloorHeldSec()
        {
            var ayu = TsuriFishData.GetSpeciesById("fish_ayu");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.FloorHeldSec = 5f;

            var next = TsuriCore.TapRenda(session, ayu, TsuriGearMods.Neutral, 0L);

            Assert.That(next.FloorHeldSec, Is.EqualTo(0f));
        }

        [Test]
        public void Tick_Renda_Relaxed_TimeBasedHelp_RescuesSlowTapper()
        {
            // v2 (2026-07-24): GaugeDecayPerSec(9)がper-tap gain(ayu 8.75%)を上回るため、
            // 1tap/sの遅いタップの子はTick→タップの度にゲージが床(30%)へ押し戻され、
            // FloorHeldSecはタップの度に0リセットされ続けて既存の床おたすけ(10s)が
            // 永久に発動しない。 RendaElapsedSec(タップ有無に関わらず累積)ベースの
            // 第2おたすけ(18s)が代わりに救済することを検証する。
            var ayu = TsuriFishData.GetSpeciesById("fish_ayu");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 17; i++)
            {
                current = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 0L);
                Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda), $"cycle {i}: 18秒未満はRendaのまま");
                Assert.That(current.FloorHeldSec, Is.LessThan(TsuriTuning.HelpAfterFloorSec),
                    "タップでFloorHeldSecがリセットされ続けるため床おたすけ(10s)は発動しない");

                current = TsuriCore.TapRenda(current, ayu, TsuriGearMods.Neutral, 0L);
                Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda));
                Assert.That(current.FloorHeldSec, Is.EqualTo(0f).Within(Tolerance));
                Assert.That(current.GaugePct, Is.LessThan(100f), "拮抗バランスによりタップだけでは100%に届かない想定");
            }

            var landed = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 18000L);

            Assert.That(landed.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(landed.GaugePct, Is.EqualTo(100f).Within(Tolerance));
            Assert.That(landed.RendaElapsedSec, Is.EqualTo(0f).Within(Tolerance));
            Assert.That(landed.FloorHeldSec, Is.EqualTo(0f));
            Assert.That(landed.CaughtLog, Has.Count.EqualTo(1));
        }

        [Test]
        public void TapHook_And_AutoHook_ResetRendaElapsedSec()
        {
            // TapHook(Bite→Renda)は前回セッションの残骸(非0のRendaElapsedSec)があっても0にリセットする。
            var biteSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            biteSession.Phase = TsuriPhase.Bite;
            biteSession.BiteWindowRemainingSec = 1f;
            biteSession.RendaElapsedSec = 12f;
            var hookResult = TsuriCore.TapHook(biteSession);
            Assert.That(hookResult.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(hookResult.RendaElapsedSec, Is.EqualTo(0f).Within(Tolerance));

            // 自動フッキング(3連続逃し→Wait終了で直接Renda)でも同様にリセットされる。
            var waitSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            waitSession.Phase = TsuriPhase.Wait;
            waitSession.WaitRemainingSec = 0.5f;
            waitSession.SpeciesId = "fish_ayu";
            waitSession.ConsecutiveMisses = 3;
            waitSession.RendaElapsedSec = 7f;
            var autoHookResult = TsuriCore.Tick(waitSession, 1f, TsuriGearMods.Neutral, 1000L);
            Assert.That(autoHookResult.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(autoHookResult.RendaElapsedSec, Is.EqualTo(0f).Within(Tolerance));

            // Cast(新規キャスト)も防御的に0リセットする。
            var landedSession = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            landedSession.Phase = TsuriPhase.Landed;
            landedSession.RendaElapsedSec = 9f;
            var castResult = TsuriCore.Cast(landedSession, 2f, 5f, new Random(5));
            Assert.That(castResult.Phase, Is.EqualTo(TsuriPhase.Wait));
            Assert.That(castResult.RendaElapsedSec, Is.EqualTo(0f).Within(Tolerance));
        }

        // ═══ 9. ComputeSpeciesProbabilities (batch:1470 1段絶対重みモデル) ═══
        [Test]
        public void ComputeSpeciesProbabilities_FullPool_MatchesSingleStageAbsoluteWeightFormula()
        {
            var pool = FullPool();
            var probs = TsuriCore.ComputeSpeciesProbabilities(pool, null, TsuriDrawContext.Neutral);

            // W(i) = RarityBaseWeight × SpeciesWeightMul (spawns=null なので
            // ロケーション倍率も floor も無し)。 解析値と一致することを直接確かめる。
            // 実装は double で積むので、期待値も double へ昇格してから掛ける
            // (float 同士で掛けると 5e-9 ほどずれて偽の失敗になる)。
            double total = 0;
            foreach (var sp in pool)
            {
                total += (double)TsuriTuning.RarityBaseWeight(sp.Rarity) * (double)sp.SpeciesWeightMul;
            }
            foreach (var sp in pool)
            {
                double expected = (double)TsuriTuning.RarityBaseWeight(sp.Rarity) * (double)sp.SpeciesWeightMul / total;
                Assert.That(probs[sp.Id], Is.EqualTo(expected).Within(1e-12), sp.Id);
            }

            double sum = 0;
            foreach (var kv in probs) sum += kv.Value;
            Assert.That(sum, Is.EqualTo(1.0).Within(1e-9));
        }

        [Test]
        public void ComputeSpeciesProbabilities_RecentCatch_DecaysOnlyThatSpecies_Mildly()
        {
            var pool = FullPool();
            var neutral = TsuriCore.ComputeSpeciesProbabilities(pool, null, TsuriDrawContext.Neutral);
            var afterAyu = TsuriCore.ComputeSpeciesProbabilities(
                pool, null, new TsuriDrawContext { RecentCatchIds = new List<string> { "fish_ayu" } });

            // 0.80 倍の弱いペナルティなので、直後でも「あゆがまた出る」余地は十分に残る。
            Assert.That(afterAyu["fish_ayu"], Is.LessThan(neutral["fish_ayu"]));
            Assert.That(afterAyu["fish_ayu"], Is.GreaterThan(neutral["fish_ayu"] * 0.7),
                "旧 SessionDedupe(0.30) のような実質退場に戻してはならない");
            Assert.That(afterAyu["fish_nijimasu"], Is.GreaterThan(neutral["fish_nijimasu"]),
                "減った分は他種へ再配分される");
        }

        // ═══ 10. PickSpecies ═════════════════════════════════════════════
        [Test]
        public void PickSpecies_SameSeed_IsDeterministic()
        {
            var pool = FullPool();

            var first = TsuriCore.PickSpecies(pool, null, TsuriDrawContext.Neutral, new Random(123));
            var second = TsuriCore.PickSpecies(pool, null, TsuriDrawContext.Neutral, new Random(123));

            Assert.That(first, Is.EqualTo(second));
            Assert.That(pool.Exists(sp => sp.Id == first), Is.True);
        }

        [Test]
        public void PickSpecies_EmptyPool_ReturnsNull()
        {
            var result = TsuriCore.PickSpecies(new List<TsuriSpecies>(), null, TsuriDrawContext.Neutral, new Random(1));

            Assert.That(result, Is.Null);
        }

        // ═══ 11. TsuriKawaTuning / IsTugEnabled ══════════════════════════
        [Test]
        public void NextWaitSecRange_NoMisses_UsesBaseRange()
        {
            TsuriKawaTuning.NextWaitSecRange(0, out var min, out var max);

            // v2 (2026-07-24, batch:kawaglint-multi-chance-prebite): 6f/10f への延長
            // (複数回チャンス前あたりの尺を確保するため)。 このテストの意図
            // (misses==0ならbase rangeを使う)自体は不変。
            Assert.That(min, Is.EqualTo(6f).Within(Tolerance));
            Assert.That(max, Is.EqualTo(10f).Within(Tolerance));
        }

        [Test]
        public void NextWaitSecRange_WithMisses_UsesShortenedRange()
        {
            TsuriKawaTuning.NextWaitSecRange(1, out var min, out var max);

            // v2 (2026-07-24, batch:kawaglint-multi-chance-prebite): 3f/5f へ
            // (base rangeの50%という比率関係は維持)。
            Assert.That(min, Is.EqualTo(3f).Within(Tolerance));
            Assert.That(max, Is.EqualTo(5f).Within(Tolerance));
        }

        [Test]
        public void IsTugEnabled_Neutral_IsFalse()
        {
            Assert.That(TsuriCore.IsTugEnabled(TsuriGearMods.Neutral), Is.False);
        }
    }
}
