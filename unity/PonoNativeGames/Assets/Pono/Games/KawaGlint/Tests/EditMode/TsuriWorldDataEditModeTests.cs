// ── Pono.KawaGlint.Tests.EditMode / TsuriWorldDataEditModeTests.cs ──
// ロケーション台帳 (TsuriWorldData) の構造的な不変条件を固定する。
// 抽選確率そのものの設計値は TsuriDrawModelEditModeTests が正本。
//
// batch:1470 で更新した契約:
//   - asase のプールは「川の既存5種と一致」ではなく**明示リスト9件**で固定する
//   - ボーナス種機構は退役 -> うなぎ/まぐろが在籍外ロケに紛れ込まないことを固定
//   - 待ち時間レンジ (asase 6–10s) は不変 = NextWaitSecRange_Asase_... はグリーンのまま
using System.Collections.Generic;
using NUnit.Framework;
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Tests.EditMode
{
    public sealed class TsuriWorldDataEditModeTests
    {
        private static TsuriLocationData Asase => TsuriWorldData.GetLocationById("river_asase");
        private static TsuriLocationData Kakou => TsuriWorldData.GetLocationById("river_kakou");
        private static TsuriLocationData Sunahama => TsuriWorldData.GetLocationById("sea_sunahama");
        private static TsuriLocationData Iwaba => TsuriWorldData.GetLocationById("sea_iwaba");
        private static TsuriLocationData Oki => TsuriWorldData.GetLocationById("sea_oki");

        // ═══ A15: asase プールは明示的な順序付きリストで固定する ══════════════
        [Test]
        public void BuildEffectivePool_Asase_MatchesExplicitOrderedIdList()
        {
            // batch:1470 §A-4: asase のプールは「川の既存5種」ではなくなり、
            // 新種 (やまめ/どじょう/さわがに/いわな) を含む9件になった。
            // 「RiverSpecies と一致」という間接的な固定をやめ、**明示リスト**にする
            // (種マスターを触ったときにこのテストが必ず落ちるようにするため)。
            var expected = new[]
            {
                "fish_ayu", "fish_nijimasu", "fish_yamame", "fish_dojou",
                "zarigani", "sawagani", "fish_salmon", "fish_iwana", "treasure_boot",
            };

            var pool = TsuriWorldData.BuildEffectivePool(Asase);

            Assert.That(pool.Count, Is.EqualTo(expected.Length));
            for (int i = 0; i < expected.Length; i++)
            {
                Assert.That(pool[i].Id, Is.EqualTo(expected[i]), $"asase pool[{i}]");
            }
        }

        [Test]
        public void BuildEffectivePool_EveryLocation_ContainsNoDuplicateIds()
        {
            foreach (var loc in TsuriWorldData.Locations)
            {
                var seen = new HashSet<string>();
                foreach (var sp in TsuriWorldData.BuildEffectivePool(loc))
                {
                    Assert.That(seen.Add(sp.Id), Is.True, $"{loc.Id} has duplicate {sp.Id}");
                }
            }
        }

        // ═══ E-2: NextWaitSecRange パリティ ══════════════════════════════════
        [Test]
        public void NextWaitSecRange_Asase_MatchesTsuriKawaTuning()
        {
            TsuriKawaTuning.NextWaitSecRange(0, out var kawaMin0, out var kawaMax0);
            TsuriWorldData.NextWaitSecRange(Asase, 0, out var worldMin0, out var worldMax0);
            Assert.That(worldMin0, Is.EqualTo(kawaMin0).Within(1e-6));
            Assert.That(worldMax0, Is.EqualTo(kawaMax0).Within(1e-6));

            TsuriKawaTuning.NextWaitSecRange(1, out var kawaMin1, out var kawaMax1);
            TsuriWorldData.NextWaitSecRange(Asase, 1, out var worldMin1, out var worldMax1);
            Assert.That(worldMin1, Is.EqualTo(kawaMin1).Within(1e-6));
            Assert.That(worldMax1, Is.EqualTo(kawaMax1).Within(1e-6));
        }

        // ═══ E-3: §3.5-1/2 レシピ必須魚の在籍不変条件 ═══════════════════════
        [Test]
        public void RecipeFish_Ayu_AndSalmon_PresentInAsaseAndKakou_WithWeightMulOneInAsase()
        {
            AssertSpawnWeightMul(Asase, "fish_ayu", 1.0f);
            AssertSpawnWeightMul(Asase, "fish_salmon", 1.0f);
            Assert.That(HasSpawn(Kakou, "fish_ayu"), Is.True);
            Assert.That(HasSpawn(Kakou, "fish_salmon"), Is.True);
        }

        [Test]
        public void RecipeFish_Ebi_AndAji_PresentInSunahamaAndSecondSeaLocation_WithWeightMulOneInSunahama()
        {
            AssertSpawnWeightMul(Sunahama, "fish_ebi", 1.0f);
            AssertSpawnWeightMul(Sunahama, "fish_aji", 1.0f);
            Assert.That(HasSpawn(Iwaba, "fish_ebi"), Is.True);
            Assert.That(HasSpawn(Iwaba, "fish_aji") || HasSpawn(Oki, "fish_aji"), Is.True);
        }

        private static bool HasSpawn(TsuriLocationData loc, string speciesId)
        {
            foreach (var entry in loc.Spawns)
            {
                if (entry.SpeciesId == speciesId) return true;
            }
            return false;
        }

        private static void AssertSpawnWeightMul(TsuriLocationData loc, string speciesId, float expectedMul)
        {
            foreach (var entry in loc.Spawns)
            {
                if (entry.SpeciesId == speciesId)
                {
                    Assert.That(entry.WeightMul, Is.EqualTo(expectedMul).Within(1e-6f));
                    return;
                }
            }
            Assert.Fail($"{speciesId} not found in {loc.Id}");
        }

        // ═══ E-4: §3.5-5 新ロケの待ち時間上限 ≤8秒 (asase除く) ══════════════
        [Test]
        public void AllNonAsaseLocations_WaitSecMax_IsAtMostEight()
        {
            foreach (var loc in TsuriWorldData.Locations)
            {
                if (loc.Id == "river_asase") continue;
                Assert.That(loc.WaitSecMax, Is.LessThanOrEqualTo(8f), $"{loc.Id} exceeds 8s wait cap");
            }
        }

        // ═══ E-5: §3.5-8 1ロケ1主役ブースト ═════════════════════════════════
        [Test]
        public void EachLocation_HasAtMostOneBoostedSpawnEntry_AndMatchesExpectedHomeSpecies()
        {
            AssertSingleBoost(Kakou, "fish_salmon", 2.5f);
            AssertSingleBoost(Iwaba, "fish_ebi", 1.3f);
            AssertSingleBoost(Oki, "fish_tai", 1.5f);
            AssertNoBoost(Asase);
            AssertNoBoost(Sunahama);
        }

        private static void AssertSingleBoost(TsuriLocationData loc, string expectedSpeciesId, float expectedMul)
        {
            string boostedId = null;
            int boostedCount = 0;
            foreach (var entry in loc.Spawns)
            {
                if (entry.WeightMul > 1f)
                {
                    boostedCount++;
                    boostedId = entry.SpeciesId;
                }
            }
            Assert.That(boostedCount, Is.EqualTo(1), $"{loc.Id} should have exactly 1 boosted entry");
            Assert.That(boostedId, Is.EqualTo(expectedSpeciesId));

            foreach (var entry in loc.Spawns)
            {
                if (entry.SpeciesId == expectedSpeciesId)
                {
                    Assert.That(entry.WeightMul, Is.EqualTo(expectedMul).Within(1e-6f));
                }
            }
        }

        private static void AssertNoBoost(TsuriLocationData loc)
        {
            foreach (var entry in loc.Spawns)
            {
                Assert.That(entry.WeightMul, Is.LessThanOrEqualTo(1f), $"{loc.Id}.{entry.SpeciesId} unexpectedly boosted");
            }
        }

        // ═══ E-6: §3.5-9 未知 speciesId はスキップ ═══════════════════════════
        [Test]
        public void BuildEffectivePool_UnknownSpeciesId_IsSkipped()
        {
            var synthetic = new TsuriLocationData
            {
                Id = "test_synthetic",
                Name = "テスト用",
                Zone = TsuriWaterZone.River,
                IsZoneDefault = false,
                WaitSecMin = 1f,
                WaitSecMax = 2f,
                UnlockCount = null,
                BackgroundKey = null,
                Spawns = new List<TsuriSpawnEntry>
                {
                    new TsuriSpawnEntry { SpeciesId = "fish_ayu", WeightMul = 1f },
                    new TsuriSpawnEntry { SpeciesId = "totally_unknown_species", WeightMul = 1f },
                }
            };

            var pool = TsuriWorldData.BuildEffectivePool(synthetic);

            Assert.That(pool.Count, Is.EqualTo(1));
            Assert.That(pool[0].Id, Is.EqualTo("fish_ayu"));
        }

        // ═══ E-7: 抽選 (ロケーション WeightMul の反映・確率合計) ═════════════
        [Test]
        public void Kakou_ProbabilityOfSalmon_IncreasesWithLocationWeightMul()
        {
            var pool = TsuriWorldData.BuildEffectivePool(Kakou);

            var withoutSpawns = TsuriCore.ComputeSpeciesProbabilities(pool, null, TsuriDrawContext.Neutral);
            var withSpawns = TsuriCore.ComputeSpeciesProbabilities(pool, Kakou.Spawns, TsuriDrawContext.Neutral);

            // kakou の salmon は WeightMul 2.5 の「主役」。
            Assert.That(withSpawns["fish_salmon"], Is.GreaterThan(withoutSpawns["fish_salmon"]));

            double totalWith = 0;
            foreach (var kv in withSpawns) totalWith += kv.Value;
            Assert.That(totalWith, Is.EqualTo(1.0).Within(1e-9));

            double totalWithout = 0;
            foreach (var kv in withoutSpawns) totalWithout += kv.Value;
            Assert.That(totalWithout, Is.EqualTo(1.0).Within(1e-9));
        }

        /// <summary>
        /// batch:1470 §A-4: ボーナス種機構 (どのロケにも 0.1 倍で紛れ込む仕組み) は
        /// 退役した。 うなぎ/まぐろは**在籍ロケでしか出ない**ことを固定する
        /// (「すなはまでまぐろが釣れる」の再発防止)。
        /// </summary>
        [Test]
        public void BonusSpeciesMechanism_IsRetired_UnagiAndMaguroOnlyInTheirHomeLocations()
        {
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Kakou), "fish_unagi"), Is.True);
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Oki), "fish_maguro"), Is.True);

            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Asase), "fish_unagi"), Is.False);
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Sunahama), "fish_unagi"), Is.False);
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Sunahama), "fish_maguro"), Is.False);
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Iwaba), "fish_maguro"), Is.False);
            Assert.That(Contains(TsuriWorldData.BuildEffectivePool(Kakou), "fish_maguro"), Is.False);
        }

        private static bool Contains(List<TsuriSpecies> pool, string speciesId)
        {
            foreach (var sp in pool)
            {
                if (sp.Id == speciesId) return true;
            }
            return false;
        }

        // ═══ E-8: 解放判定 (unlockCount) ═════════════════════════════════════
        [Test]
        public void IsUnlocked_NullUnlockCount_AlwaysTrue()
        {
            foreach (var loc in TsuriWorldData.Locations)
            {
                Assert.That(loc.UnlockCount, Is.Null, $"{loc.Id} should be unlockCount:null per current rollout decision");
                Assert.That(TsuriWorldData.IsUnlocked(loc, 0), Is.True);
                Assert.That(TsuriWorldData.IsUnlocked(loc, 999), Is.True);
            }
        }

        [Test]
        public void IsUnlocked_SyntheticThreshold_GatesOnZoneCatchCount()
        {
            var synthetic = new TsuriLocationData
            {
                Id = "test_gated",
                Zone = TsuriWaterZone.Sea,
                UnlockCount = 5,
                Spawns = new List<TsuriSpawnEntry>(),
            };

            Assert.That(TsuriWorldData.IsUnlocked(synthetic, 4), Is.False);
            Assert.That(TsuriWorldData.IsUnlocked(synthetic, 5), Is.True);
        }

        // ═══ 追加: GetLocationById / DefaultLocation / NicheFor ══════════════
        [Test]
        public void GetLocationById_UnknownOrNull_FallsBackToAsase()
        {
            Assert.That(TsuriWorldData.GetLocationById("nope").Id, Is.EqualTo("river_asase"));
            Assert.That(TsuriWorldData.GetLocationById(null).Id, Is.EqualTo("river_asase"));
        }

        [Test]
        public void DefaultLocation_ReturnsAsaseAndSunahama()
        {
            Assert.That(TsuriWorldData.DefaultLocation(TsuriWaterZone.River).Id, Is.EqualTo("river_asase"));
            Assert.That(TsuriWorldData.DefaultLocation(TsuriWaterZone.Sea).Id, Is.EqualTo("sea_sunahama"));
        }

        [Test]
        public void NicheFor_UsesSpawnEntryNiche_OrFallsBackToRepresentativeNiche()
        {
            // kakou の salmon は Spawns 上で Surface 指定。
            Assert.That(TsuriWorldData.NicheFor(Kakou, "fish_salmon"), Is.EqualTo(TsuriNiche.Surface));

            // asase に unagi の Spawns エントリは無いので、種の RepresentativeNiche にフォールバック。
            Assert.That(TsuriWorldData.NicheFor(Asase, "fish_unagi"), Is.EqualTo(TsuriNiche.RockCover));
        }
    }
}
