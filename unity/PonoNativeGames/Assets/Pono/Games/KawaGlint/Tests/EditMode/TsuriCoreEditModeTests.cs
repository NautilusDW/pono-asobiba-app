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
            Assert.That(TsuriTuning.GaugeDecayPerSec, Is.EqualTo(4f).Within(Tolerance));
            Assert.That(TsuriTuning.AssistDoubleWindowAfterMisses, Is.EqualTo(2));
            Assert.That(TsuriTuning.AutoHookAfterMisses, Is.EqualTo(3));
            Assert.That(TsuriTuning.HelpAfterFloorSec, Is.EqualTo(10f).Within(Tolerance));
            Assert.That(TsuriTuning.PityWindowBonusPctPerEscape, Is.EqualTo(20f).Within(Tolerance));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Normal), Is.EqualTo(70f).Within(Tolerance));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Rare), Is.EqualTo(25f).Within(Tolerance));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Super), Is.EqualTo(5f).Within(Tolerance));
            Assert.That(TsuriTuning.SessionDedupeWeightMul, Is.EqualTo(0.3f).Within(Tolerance));
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
            Assert.That(session.PityBySpecies, Is.Empty);
            Assert.That(session.SessionSeenIds, Is.Empty);
            Assert.That(session.CaughtLog, Is.Empty);
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
        public void TapRenda_Ayu_EightTaps_LandsWithGauge100AndMisses0()
        {
            var ayu = TsuriFishData.GetSpeciesById("fish_ayu");
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Relaxed);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.ConsecutiveMisses = 5; // 着地でリセットされることを確認するため非0で開始
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 7; i++)
            {
                current = TsuriCore.TapRenda(current, ayu, TsuriGearMods.Neutral, 5000L);
            }

            Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(current.GaugePct, Is.EqualTo(87.5f).Within(Tolerance));

            var landed = TsuriCore.TapRenda(current, ayu, TsuriGearMods.Neutral, 6000L);

            Assert.That(landed.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(landed.GaugePct, Is.EqualTo(100f).Within(Tolerance));
            Assert.That(landed.ConsecutiveMisses, Is.EqualTo(0));
            Assert.That(landed.SessionSeenIds, Does.Contain("fish_ayu"));
            Assert.That(landed.CaughtLog, Has.Count.EqualTo(1));
            Assert.That(landed.CaughtLog[0].SpeciesId, Is.EqualTo("fish_ayu"));
            Assert.That(landed.CaughtLog[0].AtMs, Is.EqualTo(6000L));
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
            var session = TsuriCore.CreateSession(FullPool(), TsuriMode.Expert);
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 0f;
            session.SpeciesId = "fish_ayu";

            var current = session;
            for (int i = 0; i < 15; i++)
            {
                current = TsuriCore.Tick(current, 1f, TsuriGearMods.Neutral, 0L);
            }

            Assert.That(current.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(current.FloorHeldSec, Is.GreaterThanOrEqualTo(10f));
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

        // ═══ 9. ComputeSpeciesProbabilities ══════════════════════════════
        [Test]
        public void ComputeSpeciesProbabilities_FullPool_MatchesAnalyticRarityAndWeightShares()
        {
            var probs = TsuriCore.ComputeSpeciesProbabilities(FullPool(), new List<string>());

            double normalGroupTotal = probs["fish_ayu"] + probs["fish_nijimasu"] + probs["zarigani"] + probs["treasure_boot"];
            double rareGroupTotal = probs["fish_salmon"];

            Assert.That(normalGroupTotal, Is.EqualTo(70.0 / 95.0).Within(Tolerance));
            Assert.That(rareGroupTotal, Is.EqualTo(25.0 / 95.0).Within(Tolerance));

            // 同一レアリティ内は weight 比 (あゆ22 / (22+20+5+4)=51)。
            double expectedAyu = (70.0 / 95.0) * (22.0 / 51.0);
            Assert.That(probs["fish_ayu"], Is.EqualTo(expectedAyu).Within(Tolerance));

            double expectedSalmon = 25.0 / 95.0; // rare群に1種のみなので群内シェアは1
            Assert.That(probs["fish_salmon"], Is.EqualTo(expectedSalmon).Within(Tolerance));
        }

        [Test]
        public void ComputeSpeciesProbabilities_SeenSpecies_WeightDecaysBySessionDedupeMul()
        {
            var seen = new List<string> { "fish_ayu" };
            var probs = TsuriCore.ComputeSpeciesProbabilities(FullPool(), seen);

            // あゆの重みは 22*0.3=6.6 に減衰、同レアリティ内合計は 6.6+20+5+4=35.6
            double expectedAyu = (70.0 / 95.0) * (6.6 / 35.6);
            Assert.That(probs["fish_ayu"], Is.EqualTo(expectedAyu).Within(Tolerance));
        }

        // ═══ 10. PickSpecies ═════════════════════════════════════════════
        [Test]
        public void PickSpecies_SameSeed_IsDeterministic()
        {
            var pool = FullPool();
            var pity = new Dictionary<string, float>();
            var seen = new List<string>();

            var first = TsuriCore.PickSpecies(pool, pity, seen, new Random(123));
            var second = TsuriCore.PickSpecies(pool, pity, seen, new Random(123));

            Assert.That(first, Is.EqualTo(second));
            Assert.That(pool.Exists(sp => sp.Id == first), Is.True);
        }

        [Test]
        public void PickSpecies_EmptyPool_ReturnsNull()
        {
            var result = TsuriCore.PickSpecies(new List<TsuriSpecies>(), new Dictionary<string, float>(), new List<string>(), new Random(1));

            Assert.That(result, Is.Null);
        }

        // ═══ 11. TsuriKawaTuning / IsTugEnabled ══════════════════════════
        [Test]
        public void NextWaitSecRange_NoMisses_UsesBaseRange()
        {
            TsuriKawaTuning.NextWaitSecRange(0, out var min, out var max);

            Assert.That(min, Is.EqualTo(2f).Within(Tolerance));
            Assert.That(max, Is.EqualTo(5f).Within(Tolerance));
        }

        [Test]
        public void NextWaitSecRange_WithMisses_UsesShortenedRange()
        {
            TsuriKawaTuning.NextWaitSecRange(1, out var min, out var max);

            Assert.That(min, Is.EqualTo(1f).Within(Tolerance));
            Assert.That(max, Is.EqualTo(2.5f).Within(Tolerance));
        }

        [Test]
        public void IsTugEnabled_Neutral_IsFalse()
        {
            Assert.That(TsuriCore.IsTugEnabled(TsuriGearMods.Neutral), Is.False);
        }
    }
}
