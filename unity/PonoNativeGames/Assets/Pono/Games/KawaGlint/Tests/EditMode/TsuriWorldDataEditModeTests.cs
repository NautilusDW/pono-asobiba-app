// ── Pono.KawaGlint.Tests.EditMode / TsuriWorldDataEditModeTests.cs ──
// KawaGlint 海拡張 実装契約 v1.0 (A) データ層の検証。 §E-1〜E-8 に対応する
// (E-9〜E-11 は TsuriDex/Store/コントローラ配線側の担当なので対象外)。
// river_asase の既存挙動 (TsuriFishData.RiverSpecies / TsuriKawaTuning) との
// ビット単位互換性を最優先で固定する。
using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Tests.EditMode
{
    public sealed class TsuriWorldDataEditModeTests
    {
        private const double Tolerance = 1e-9;

        private static TsuriLocationData Asase => TsuriWorldData.GetLocationById("river_asase");
        private static TsuriLocationData Kakou => TsuriWorldData.GetLocationById("river_kakou");
        private static TsuriLocationData Sunahama => TsuriWorldData.GetLocationById("sea_sunahama");
        private static TsuriLocationData Iwaba => TsuriWorldData.GetLocationById("sea_iwaba");
        private static TsuriLocationData Oki => TsuriWorldData.GetLocationById("sea_oki");

        // ═══ E-1: asase パリティ ═══════════════════════════════════════════
        [Test]
        public void BuildEffectivePool_Asase_MatchesRiverSpeciesIdsInOrder()
        {
            var pool = TsuriWorldData.BuildEffectivePool(Asase);

            Assert.That(pool.Count, Is.EqualTo(TsuriFishData.RiverSpecies.Count));
            for (int i = 0; i < pool.Count; i++)
            {
                Assert.That(pool[i].Id, Is.EqualTo(TsuriFishData.RiverSpecies[i].Id));
            }
        }

        [Test]
        public void BuildWeightMulMap_Asase_IsNull()
        {
            Assert.That(TsuriWorldData.BuildWeightMulMap(Asase), Is.Null);
        }

        [Test]
        public void ComputeSpeciesProbabilities_Asase_WithNullMap_MatchesTwoArgVersionExactly()
        {
            var pool = new List<TsuriSpecies>(TsuriFishData.RiverSpecies);
            var seen = new List<string> { "fish_ayu" };

            var twoArg = TsuriCore.ComputeSpeciesProbabilities(pool, seen);
            var threeArgWithNullMap = TsuriCore.ComputeSpeciesProbabilities(pool, seen, TsuriWorldData.BuildWeightMulMap(Asase));

            Assert.That(threeArgWithNullMap.Count, Is.EqualTo(twoArg.Count));
            foreach (var kv in twoArg)
            {
                Assert.That(threeArgWithNullMap[kv.Key], Is.EqualTo(kv.Value).Within(Tolerance));
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
            AssertSingleBoost(Kakou, "fish_salmon", 2.0f);
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
                IsBonusHome = false,
                IncludeZoneBonus = false,
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

        // ═══ E-7: 抽選 (WeightMul反映・ボーナス種混入・確率合計) ═══════════════
        [Test]
        public void Kakou_ProbabilityOfSalmon_IncreasesWithWeightMulMap()
        {
            var pool = TsuriWorldData.BuildEffectivePool(Kakou);
            var map = TsuriWorldData.BuildWeightMulMap(Kakou);
            var seen = new List<string>();

            var withoutMap = TsuriCore.ComputeSpeciesProbabilities(pool, seen);
            var withMap = TsuriCore.ComputeSpeciesProbabilities(pool, seen, map);

            Assert.That(withMap["fish_salmon"], Is.GreaterThan(withoutMap["fish_salmon"]));

            double totalWithMap = 0;
            foreach (var kv in withMap) totalWithMap += kv.Value;
            Assert.That(totalWithMap, Is.EqualTo(1.0).Within(1e-9));

            double totalWithoutMap = 0;
            foreach (var kv in withoutMap) totalWithoutMap += kv.Value;
            Assert.That(totalWithoutMap, Is.EqualTo(1.0).Within(1e-9));
        }

        [Test]
        public void BonusSpecies_AppearsInEffectivePool_WithExpectedHomeAndNonHomeMul()
        {
            // kakou: unagi はホーム (mul 1.0)。
            var kakouPool = TsuriWorldData.BuildEffectivePool(Kakou);
            Assert.That(Contains(kakouPool, "fish_unagi"), Is.True);
            var kakouMap = TsuriWorldData.BuildWeightMulMap(Kakou);
            Assert.That(kakouMap["fish_unagi"], Is.EqualTo(1.0f).Within(1e-6f));

            // sunahama / iwaba: maguro は非ホーム (mul 0.1)。
            var sunahamaPool = TsuriWorldData.BuildEffectivePool(Sunahama);
            Assert.That(Contains(sunahamaPool, "fish_maguro"), Is.True);
            var sunahamaMap = TsuriWorldData.BuildWeightMulMap(Sunahama);
            Assert.That(sunahamaMap["fish_maguro"], Is.EqualTo(TsuriWorldData.BonusNonHomeWeightMul).Within(1e-6f));

            var iwabaPool = TsuriWorldData.BuildEffectivePool(Iwaba);
            Assert.That(Contains(iwabaPool, "fish_maguro"), Is.True);
            var iwabaMap = TsuriWorldData.BuildWeightMulMap(Iwaba);
            Assert.That(iwabaMap["fish_maguro"], Is.EqualTo(TsuriWorldData.BonusNonHomeWeightMul).Within(1e-6f));

            // oki: maguro はホーム (mul 1.0)。
            var okiPool = TsuriWorldData.BuildEffectivePool(Oki);
            Assert.That(Contains(okiPool, "fish_maguro"), Is.True);
            var okiMap = TsuriWorldData.BuildWeightMulMap(Oki);
            Assert.That(okiMap["fish_maguro"], Is.EqualTo(1.0f).Within(1e-6f));

            // asase: ボーナス種を一切含まない (契約§0-2の意図的逸脱)。
            var asasePool = TsuriWorldData.BuildEffectivePool(Asase);
            Assert.That(Contains(asasePool, "fish_unagi"), Is.False);
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
                Spawns = new List<TsuriSpawnEntry>()
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

            // asase にはボーナス種(unagi)エントリが無いので、種の RepresentativeNiche にフォールバック。
            Assert.That(TsuriWorldData.NicheFor(Asase, "fish_unagi"), Is.EqualTo(TsuriNiche.RockCover));
        }
    }
}
