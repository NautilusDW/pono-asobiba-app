// ── Pono.KawaGlint.Tests.EditMode / TsuriDrawModelEditModeTests.cs ──
// batch:1470 実装契約 §A (データ層と抽選モデル) の検証。
//
// このファイルが守るユーザー体験:
//   「順番に釣れる感じがする」「レアが全然レアじゃない」「沖の船で鮭が釣れる」
// の3つが**数値レベルで**再発しないようにする。 個々のテストのコメントに、
// それが何を防いでいるのかを必ず書くこと。
using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Tests.EditMode
{
    public sealed class TsuriDrawModelEditModeTests
    {
        private static List<TsuriLocationData> AllLocations => TsuriWorldData.Locations;

        private static TsuriLocationData Loc(string id) => TsuriWorldData.GetLocationById(id);

        private static Dictionary<string, double> Probs(TsuriLocationData loc, TsuriDrawContext ctx = null)
        {
            return TsuriCore.ComputeSpeciesProbabilities(
                TsuriWorldData.BuildEffectivePool(loc), loc.Spawns, ctx ?? TsuriDrawContext.Neutral);
        }

        private static double ShareOf(TsuriLocationData loc, Dictionary<string, double> probs, TsuriRarity rarity)
        {
            double sum = 0;
            foreach (var sp in TsuriWorldData.BuildEffectivePool(loc))
            {
                if (sp.Rarity == rarity && probs.TryGetValue(sp.Id, out var p)) sum += p;
            }
            return sum;
        }

        // ═══ A1. チューニング定数 ═════════════════════════════════════════
        [Test]
        public void A1_TuningConstants_MatchNewDrawModel()
        {
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Normal), Is.EqualTo(100f).Within(1e-4));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Rare), Is.EqualTo(13f).Within(1e-4));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Super), Is.EqualTo(2.0f).Within(1e-4));
            Assert.That(TsuriTuning.RarityBaseWeight(TsuriRarity.Legendary), Is.EqualTo(0.55f).Within(1e-4));

            Assert.That(TsuriTuning.RecentCatchWeightMul, Is.EqualTo(0.80f).Within(1e-4));
            Assert.That(TsuriTuning.RecentCatchMemory, Is.EqualTo(1));

            Assert.That(TsuriTuning.RarityPityStartCasts, Is.EqualTo(8));
            Assert.That(TsuriTuning.RarityPityStepPerCast, Is.EqualTo(0.25f).Within(1e-4));
            Assert.That(TsuriTuning.RarityPityCapMul, Is.EqualTo(6.0f).Within(1e-4));

            Assert.That(TsuriTuning.FirstEncounterWeightMul, Is.EqualTo(1.6f).Within(1e-4));
            Assert.That(TsuriTuning.RecipeMinProbability, Is.EqualTo(0.05f).Within(1e-4));
        }

        // ═══ A2. レアリティ配分 (RC-1 再発防止) ═══════════════════════════
        /// <summary>
        /// **これが「レアが全然レアじゃない」の再発防止ガード。**
        /// 旧モデル (層シェア 70/25/5 を層内で配分) では rare が1種しか居ないロケで
        /// その1種に 25/95 = 26.3% が丸ごと乗り、あさせのさけが 26.3%、かこうでは
        /// 40.0% になっていた。 新モデルの実測は下記のとおり。
        /// </summary>
        [Test]
        public void A2_RarityShare_EveryLocation_WithinDesignRange()
        {
            foreach (var loc in AllLocations)
            {
                var probs = Probs(loc); // pity OFF (DryCastsSinceRarity = 0)
                double normal = ShareOf(loc, probs, TsuriRarity.Normal);
                double rare = ShareOf(loc, probs, TsuriRarity.Rare);
                double super = ShareOf(loc, probs, TsuriRarity.Super);
                double legendary = ShareOf(loc, probs, TsuriRarity.Legendary);

                Assert.That(normal, Is.InRange(0.82, 0.95), $"{loc.Id} normal share");
                Assert.That(rare, Is.InRange(0.05, 0.13), $"{loc.Id} rare share");
                Assert.That(super, Is.InRange(0.0, 0.015), $"{loc.Id} super share");
                Assert.That(legendary, Is.InRange(0.0, 0.002), $"{loc.Id} legendary share");

                Assert.That(normal + rare + super + legendary, Is.EqualTo(1.0).Within(1e-9), $"{loc.Id} total");
            }
        }

        // ═══ A3. レシピ必須魚の下限 ═══════════════════════════════════════
        /// <summary>
        /// あゆ/さけ (畑・ごはんレシピの材料) が既定ロケで枯れないこと。
        /// 種を30件に増やすと、下限が無ければ 1/30 未満まで薄まりうる。
        /// </summary>
        [Test]
        public void A3_RecipeSpecies_MeetMinProbability_AtDefaultLocations()
        {
            var asase = Probs(Loc("river_asase"));
            Assert.That(asase["fish_ayu"], Is.GreaterThanOrEqualTo(0.05), "ayu@asase");
            Assert.That(asase["fish_salmon"], Is.GreaterThanOrEqualTo(0.05), "salmon@asase");

            var sunahama = Probs(Loc("sea_sunahama"));
            Assert.That(sunahama["fish_ebi"], Is.GreaterThanOrEqualTo(0.05), "ebi@sunahama");
            Assert.That(sunahama["fish_aji"], Is.GreaterThanOrEqualTo(0.05), "aji@sunahama");
        }

        // ═══ A4. 非食用の上限 ═════════════════════════════════════════════
        /// <summary>
        /// 「たからもの (ながぐつ/かいがら) と生き物じゃない当たり」が多すぎると
        /// 料理につながらず飽きる。 上限のみ強制 (下限は撤廃 -- 1-B 裁定)。
        /// </summary>
        [Test]
        public void A4_NonEdibleShare_EveryLocation_AtMost18Percent()
        {
            foreach (var loc in AllLocations)
            {
                var probs = Probs(loc);
                double nonEdible = 0;
                foreach (var sp in TsuriWorldData.BuildEffectivePool(loc))
                {
                    if (!sp.Edible && probs.TryGetValue(sp.Id, out var p)) nonEdible += p;
                }
                Assert.That(nonEdible, Is.LessThanOrEqualTo(0.18), $"{loc.Id} non-edible share");
            }
        }

        // ═══ A5. 「順番に釣れる」の構造的な再発防止 ═══════════════════════
        /// <summary>
        /// **これが本バッチの主目的のガード。** 旧 SessionDedupeWeightMul (0.30) は
        /// 釣った種を実質退場させるため、プールが1周するまで同じ魚が二度と出ず、
        /// 抽選が「順番」に見えていた。 新モデルでは連続同種が普通に起きる。
        ///
        /// 固定シードなので値は完全に再現可能。 帯を広めに取っているのは
        /// 「0% でない」「支配的でない」の2点だけを機械的に守るため
        /// (重複回避の将来再導入を構造的に止めるのが目的であって、
        /// 特定の実測値をピン留めするのが目的ではない)。
        /// </summary>
        [Test]
        public void A5_ConsecutiveSameSpecies_RateWithinRange()
        {
            const int draws = 4000;
            foreach (var loc in AllLocations)
            {
                var pool = TsuriWorldData.BuildEffectivePool(loc);
                var random = new Random(20260725);
                // 「毎キャスト必ず釣り上げる」= RecentCatch ペナルティが常に効いている
                // 最悪ケースで測る。 逃した場合はペナルティすら乗らないのでもっと高くなる。
                var recent = new List<string>();
                string previous = null;
                int same = 0;

                for (int i = 0; i < draws; i++)
                {
                    var ctx = new TsuriDrawContext { RecentCatchIds = recent };
                    var picked = TsuriCore.PickSpecies(pool, loc.Spawns, ctx, random);
                    if (picked == previous) same++;
                    previous = picked;
                    recent.Clear();
                    recent.Add(picked);
                }

                double rate = (double)same / draws;
                Assert.That(rate, Is.GreaterThan(0.06),
                    $"{loc.Id}: 連続同種が起きなさすぎる -- 重複回避が再導入されていないか確認 ({rate:P2})");
                Assert.That(rate, Is.LessThan(0.24),
                    $"{loc.Id}: 1種が支配的すぎる ({rate:P2})");
            }
        }

        // ═══ A6. 既定ロケの難度設計 ═══════════════════════════════════════
        [Test]
        public void A6_DefaultLocations_ContainNoSuperOrLegendary()
        {
            foreach (var id in new[] { "river_asase", "sea_sunahama" })
            {
                foreach (var sp in TsuriWorldData.BuildEffectivePool(Loc(id)))
                {
                    Assert.That(sp.Rarity, Is.Not.EqualTo(TsuriRarity.Super), $"{id} contains super {sp.Id}");
                    Assert.That(sp.Rarity, Is.Not.EqualTo(TsuriRarity.Legendary), $"{id} contains legendary {sp.Id}");
                }
            }
        }

        // ═══ A7. 「ドラッグ必須の魚は存在しない」不変条件の機械化 ═══════════
        [Test]
        public void A7_AllSpecies_RunsAreZero()
        {
            foreach (var sp in TsuriFishData.AllSpecies)
            {
                Assert.That(sp.ChallengeProfile, Is.Not.Null, sp.Id);
                Assert.That(sp.ChallengeProfile.Runs, Is.EqualTo(0), $"{sp.Id} requires drag (tug is unimplemented)");
            }
        }

        // ═══ A9. レアリティ pity ══════════════════════════════════════════
        [Test]
        public void A9_RarityPity_IncreasesRarePlusShare_AndCapsAt6x()
        {
            Assert.That(TsuriTuning.RarityPityMul(0), Is.EqualTo(1f).Within(1e-4));
            Assert.That(TsuriTuning.RarityPityMul(8), Is.EqualTo(1f).Within(1e-4), "8キャストまでは無補正");
            Assert.That(TsuriTuning.RarityPityMul(9), Is.EqualTo(1.25f).Within(1e-4));
            Assert.That(TsuriTuning.RarityPityMul(28), Is.EqualTo(6f).Within(1e-4), "cap 到達点");
            Assert.That(TsuriTuning.RarityPityMul(1000), Is.EqualTo(6f).Within(1e-4), "cap を超えない");

            var loc = Loc("river_kakou");
            var dry0 = Probs(loc);
            var dryHi = Probs(loc, new TsuriDrawContext { DryCastsSinceRarity = 100 });

            double rarePlus0 = ShareOf(loc, dry0, TsuriRarity.Rare) + ShareOf(loc, dry0, TsuriRarity.Super);
            double rarePlusHi = ShareOf(loc, dryHi, TsuriRarity.Rare) + ShareOf(loc, dryHi, TsuriRarity.Super);
            Assert.That(rarePlusHi, Is.GreaterThan(rarePlus0 * 2.0), "pity でレア層全体が明確に膨らむ");

            // 層別に別倍率が掛かっていないこと = rare:super の比率が pity で動かない。
            double ratio0 = ShareOf(loc, dry0, TsuriRarity.Rare) / ShareOf(loc, dry0, TsuriRarity.Super);
            double ratioHi = ShareOf(loc, dryHi, TsuriRarity.Rare) / ShareOf(loc, dryHi, TsuriRarity.Super);
            Assert.That(ratioHi, Is.EqualTo(ratio0).Within(1e-9),
                "pity は rare/super に一律で掛かるので層間の相対比は不変でなければならない");
        }

        // ═══ A10. 初遭遇ボーナス ══════════════════════════════════════════
        [Test]
        public void A10_FirstEncounterBonus_AppliesOnlyToUnknownIds()
        {
            var loc = Loc("sea_iwaba");
            var noDex = Probs(loc); // KnownSpeciesIds == null -> ボーナス無効
            var allKnownButTako = Probs(loc, new TsuriDrawContext
            {
                KnownSpeciesIds = KnownExcept(loc, "fish_tako")
            });

            Assert.That(allKnownButTako["fish_tako"], Is.GreaterThan(noDex["fish_tako"]),
                "まだ図鑑に無い種は出やすくなる");
            Assert.That(allKnownButTako["fish_aji"], Is.LessThan(noDex["fish_aji"]),
                "既知種は相対的に下がる");
        }

        private static HashSet<string> KnownExcept(TsuriLocationData loc, string unknownId)
        {
            var known = new HashSet<string>();
            foreach (var sp in TsuriWorldData.BuildEffectivePool(loc))
            {
                if (sp.Id != unknownId) known.Add(sp.Id);
            }
            return known;
        }

        // ═══ A11. floor 適用後も合計1 ═════════════════════════════════════
        [Test]
        public void A11_MinProbabilityFloor_PreservesTotalOne()
        {
            foreach (var loc in AllLocations)
            {
                foreach (var dry in new[] { 0, 12, 100 })
                {
                    var probs = Probs(loc, new TsuriDrawContext { DryCastsSinceRarity = dry });
                    double total = 0;
                    foreach (var kv in probs)
                    {
                        Assert.That(kv.Value, Is.GreaterThanOrEqualTo(0.0), $"{loc.Id}.{kv.Key}");
                        total += kv.Value;
                    }
                    Assert.That(total, Is.EqualTo(1.0).Within(1e-9), $"{loc.Id} dry={dry}");
                }
            }
        }

        // ═══ A12. rarity enum の宣言順は Rendering の tier index 契約 ═══════
        [Test]
        public void A12_TsuriRarityEnumOrder_IsStable()
        {
            Assert.That((int)TsuriRarity.Normal, Is.EqualTo(0));
            Assert.That((int)TsuriRarity.Rare, Is.EqualTo(1));
            Assert.That((int)TsuriRarity.Super, Is.EqualTo(2));
            Assert.That((int)TsuriRarity.Legendary, Is.EqualTo(3));
            Assert.That(Enum.GetValues(typeof(TsuriRarity)).Length, Is.EqualTo(4),
                "段を足すときは必ず末尾へ。 途中挿入は Rendering の tier テーブルを全部ずらす");
        }

        // ═══ A14. 生態整合性のピン留め ════════════════════════════════════
        /// <summary>
        /// ユーザー指摘 (「沖の船で鮭が釣れる」) を含む生態修正 E-1〜E-7 を機械的に固定する。
        /// **ika@oki の Niche == Surface** は E-5「却下」の裁定そのもの --
        /// 沖は岩を1つも描かない設計なので RockCover/Midwater 演出が破綻する。
        /// 生態根拠で書き換えたくなったら、まず演出側を直すこと。
        /// </summary>
        [Test]
        public void A14_EcologyFixes_ArePinned()
        {
            Assert.That(HasSpawn(Loc("river_kakou"), "fish_nijimasu"), Is.False, "E-2: 冷水上流魚は汽水河口に居ない");
            Assert.That(HasSpawn(Loc("sea_oki"), "fish_salmon"), Is.False, "E-3: 沖の船で鮭は釣れない");
            Assert.That(HasSpawn(Loc("sea_sunahama"), "fish_salmon"), Is.True, "E-4: アキアジのサーフ釣り");
            Assert.That(NicheOf(Loc("sea_sunahama"), "fish_salmon"), Is.EqualTo(TsuriNiche.Surface));
            Assert.That(NicheOf(Loc("river_asase"), "fish_salmon"), Is.EqualTo(TsuriNiche.Surface), "E-1: 遡上の背びれ");

            // まぐろは沖のみ / うなぎは河口のみ (E-6/E-7: ボーナス種機構の退役)。
            foreach (var loc in AllLocations)
            {
                if (loc.Id != "sea_oki") Assert.That(HasSpawn(loc, "fish_maguro"), Is.False, $"maguro in {loc.Id}");
                if (loc.Id != "river_kakou") Assert.That(HasSpawn(loc, "fish_unagi"), Is.False, $"unagi in {loc.Id}");
            }

            // E-5 却下: 沖のいかは Surface のまま (演出セレクタとしての意図的選択)。
            Assert.That(NicheOf(Loc("sea_oki"), "fish_ika"), Is.EqualTo(TsuriNiche.Surface),
                "E-5 は却下済み。 沖には岩が1つも描かれないので RockCover 演出は破綻する");

            // ひらめは砂浜専用 (沖は床を作らない設計なので BottomSand ナレが嘘になる)。
            Assert.That(HasSpawn(Loc("sea_sunahama"), "fish_hirame"), Is.True);
            Assert.That(HasSpawn(Loc("sea_oki"), "fish_hirame"), Is.False);
        }

        private static bool HasSpawn(TsuriLocationData loc, string speciesId)
        {
            foreach (var entry in loc.Spawns)
            {
                if (entry.SpeciesId == speciesId) return true;
            }
            return false;
        }

        private static TsuriNiche NicheOf(TsuriLocationData loc, string speciesId)
        {
            return TsuriWorldData.NicheFor(loc, speciesId);
        }

        // ═══ 追加: 種マスターの健全性 ═════════════════════════════════════
        [Test]
        public void SpeciesMaster_HasThirtyEntries_AllUniqueAndFullyPopulated()
        {
            Assert.That(TsuriFishData.AllSpecies.Count, Is.EqualTo(30), "ユーザー要求「倍ぐらい」= 15 -> 30");

            var ids = new HashSet<string>();
            foreach (var sp in TsuriFishData.AllSpecies)
            {
                Assert.That(ids.Add(sp.Id), Is.True, $"duplicate id {sp.Id}");
                Assert.That(string.IsNullOrEmpty(sp.Name), Is.False, sp.Id);

                // Size 未指定は SpeciesWorldLength が 1.5 に落ちて
                // 「さわがに(2cm) となまず(100cm) が同じ大きさで泳ぐ」事故になる。
                Assert.That(sp.Size, Is.EqualTo("s").Or.EqualTo("m").Or.EqualTo("l"),
                    $"{sp.Id} has no usable Size");

                Assert.That(sp.SpeciesWeightMul, Is.InRange(0.20f, 1.50f), $"{sp.Id} SpeciesWeightMul");
                Assert.That(sp.Zones, Is.Not.Null.And.Not.Empty, $"{sp.Id} Zones");
            }
        }

        /// <summary>
        /// 台帳が参照する speciesId は必ずマスターに実在すること。
        /// BuildEffectivePool は未知 id を黙ってスキップするので、
        /// タイプミスが「そのロケに魚が1種少ない」という静かなバグになる。
        /// </summary>
        [Test]
        public void EveryLocationSpawn_ResolvesToAKnownSpecies()
        {
            foreach (var loc in AllLocations)
            {
                foreach (var entry in loc.Spawns)
                {
                    Assert.That(TsuriFishData.GetSpeciesById(entry.SpeciesId), Is.Not.Null,
                        $"{loc.Id} references unknown species '{entry.SpeciesId}'");
                    Assert.That(entry.WeightMul, Is.GreaterThan(0f), $"{loc.Id}.{entry.SpeciesId}");
                }
            }
        }

        /// <summary>
        /// 種が居るのに Zones と矛盾するロケーションに置かれていないこと
        /// (川のロケに海専用種が混ざる等の台帳ミスの検出)。
        /// </summary>
        [Test]
        public void EveryLocationSpawn_MatchesTheSpeciesWaterZone()
        {
            foreach (var loc in AllLocations)
            {
                foreach (var sp in TsuriWorldData.BuildEffectivePool(loc))
                {
                    Assert.That(sp.Zones, Does.Contain(loc.Zone),
                        $"{loc.Id} ({loc.Zone}) spawns {sp.Id} which does not live there");
                }
            }
        }

        /// <summary>
        /// 捕獲でのみ pity がリセットされること (逃走では伸び続ける)。
        /// 「レアを逃したのに次から出にくくなる」という理不尽を作らないための固定。
        /// </summary>
        [Test]
        public void RarityPity_ResetsOnRareCatch_ButNotOnEscape()
        {
            var loc = Loc("river_kakou");
            var pool = TsuriWorldData.BuildEffectivePool(loc);
            var session = TsuriCore.CreateSession(pool, loc.Spawns, TsuriMode.Relaxed);
            var random = new Random(1);

            for (int i = 0; i < 5; i++)
            {
                session = TsuriCore.Cast(session, 3f, 7f, random);
                // 3連続逃しの自動フッキング (Wait -> Renda 直行) に入らないよう、
                // 毎回 misses を 0 に戻す -- ここで測りたいのは pity カウンタだけ。
                session.ConsecutiveMisses = 0;
                // 逃走: Wait -> Bite -> (窓切れ) Escaped
                session.WaitRemainingSec = 0f;
                session = TsuriCore.Tick(session, 0f, TsuriGearMods.Neutral, 0L);
                Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Bite), $"cycle {i}");
                session.BiteWindowRemainingSec = 0f;
                session = TsuriCore.Tick(session, 0f, TsuriGearMods.Neutral, 0L);
                Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Escaped), $"cycle {i}");
            }
            Assert.That(session.DryCastsSinceRarity, Is.EqualTo(5), "逃走では pity カウンタは伸び続ける");

            // rare を捕獲 -> 0 にリセットされる。
            session = TsuriCore.Cast(session, 3f, 7f, random);
            session.SpeciesId = "fish_salmon"; // rare
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 100f;
            session = TsuriCore.TapRenda(session, TsuriFishData.GetSpeciesById("fish_salmon"), TsuriGearMods.Neutral, 0L);

            Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(session.DryCastsSinceRarity, Is.EqualTo(0), "rare 以上の捕獲で pity はリセットされる");
            Assert.That(session.RecentCatchIds, Is.EqualTo(new List<string> { "fish_salmon" }));
        }

        /// <summary>
        /// normal を釣っても pity はリセットされない (レアを待っている時間は保存される)。
        /// </summary>
        [Test]
        public void RarityPity_DoesNotResetOnNormalCatch()
        {
            var loc = Loc("river_asase");
            var session = TsuriCore.CreateSession(TsuriWorldData.BuildEffectivePool(loc), loc.Spawns, TsuriMode.Relaxed);
            session.DryCastsSinceRarity = 12;
            session.SpeciesId = "fish_ayu";
            session.Phase = TsuriPhase.Renda;
            session.GaugePct = 100f;

            session = TsuriCore.TapRenda(session, TsuriFishData.GetSpeciesById("fish_ayu"), TsuriGearMods.Neutral, 0L);

            Assert.That(session.Phase, Is.EqualTo(TsuriPhase.Landed));
            Assert.That(session.DryCastsSinceRarity, Is.EqualTo(12));
        }

        /// <summary>
        /// ロケーション切替が pity / 直近捕獲 / 図鑑既知集合を捨てないこと
        /// (「場所を変えるだけで pity がリセットされる」抜け道を塞ぐ)。
        /// </summary>
        [Test]
        public void WithSpeciesPool_PreservesDrawMemoryAcrossLocations()
        {
            var asase = Loc("river_asase");
            var kakou = Loc("river_kakou");
            var session = TsuriCore.CreateSession(TsuriWorldData.BuildEffectivePool(asase), asase.Spawns, TsuriMode.Relaxed);
            session.DryCastsSinceRarity = 17;
            session.RecentCatchIds.Add("fish_ayu");
            session.KnownSpeciesIds = new HashSet<string> { "fish_ayu" };

            var moved = TsuriCore.WithSpeciesPool(session, TsuriWorldData.BuildEffectivePool(kakou), kakou.Spawns);

            Assert.That(moved.Phase, Is.EqualTo(TsuriPhase.Idle));
            Assert.That(moved.DryCastsSinceRarity, Is.EqualTo(17));
            Assert.That(moved.RecentCatchIds, Does.Contain("fish_ayu"));
            Assert.That(moved.KnownSpeciesIds, Does.Contain("fish_ayu"));
            Assert.That(moved.SpeciesPool.Count, Is.EqualTo(kakou.Spawns.Count));
            Assert.That(moved.SpawnEntries, Is.Not.Null.And.Count.EqualTo(kakou.Spawns.Count),
                "新ロケの Spawns 台帳 (WeightMul と MinProbability の正本) に差し替わっている");
        }

        /// <summary>
        /// 上位3種の占有率。 旧モデルのあさせは上位3種で 84% を占めており、これが
        /// 「いつも同じ魚ばかり」の体感の正体だった。 65% 未満まで下げる。
        /// </summary>
        [Test]
        public void TopThreeSpecies_DoNotDominate_AtDefaultLocations()
        {
            foreach (var id in new[] { "river_asase", "sea_sunahama" })
            {
                var probs = Probs(Loc(id));
                var values = new List<double>(probs.Values);
                values.Sort();
                values.Reverse();

                double top3 = values[0] + values[1] + values[2];
                Assert.That(top3, Is.LessThan(0.65), $"{id} top-3 share {top3:P1} -- 「順番に釣れる」体感の指標");
            }
        }
    }
}
