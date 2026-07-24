// ── Pono.KawaGlint.Tests.EditMode / TsuriDexEditModeTests.cs ──
// KawaGlint 海拡張 実装契約 v1.0 (B) 図鑑ローカルストアの検証。 §E-9〜E-10 に対応する。
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using NUnit.Framework;
using Pono.KawaGlint.Core;

namespace Pono.KawaGlint.Tests.EditMode
{
    public sealed class TsuriDexEditModeTests
    {
        private readonly List<string> _tempDirs = new List<string>();

        [TearDown]
        public void TearDown()
        {
            foreach (var dir in _tempDirs)
            {
                try
                {
                    if (Directory.Exists(dir))
                    {
                        Directory.Delete(dir, true);
                    }
                }
                catch
                {
                    // best-effort cleanup only
                }
            }

            _tempDirs.Clear();
        }

        private string NewTempDir()
        {
            var dir = Path.Combine(Path.GetTempPath(), "kawaglint-fishdex-tests-" + Guid.NewGuid().ToString("N"));
            _tempDirs.Add(dir);
            return dir;
        }

        // ═══ E-9: TsuriDexRecord.Merge 可換性 ════════════════════════════════
        [Test]
        public void Merge_IsCommutative_WithMixedNullAndZeroValues()
        {
            var a = new TsuriDexRecord
            {
                seen = true,
                count = 3,
                escapedCount = 1,
                maxSizeCm = 20,
                firstAt = 1000,
                lastAt = 5000,
                sourceCounts = new Dictionary<string, int> { { "fishing_river", 2 } },
                locationCounts = new Dictionary<string, int> { { "river_asase", 2 } }
            };
            var b = new TsuriDexRecord
            {
                seen = false,
                count = 0,
                escapedCount = 2,
                maxSizeCm = null,
                firstAt = 0,
                lastAt = 200,
                sourceCounts = new Dictionary<string, int> { { "fishing_sea", 1 } },
                locationCounts = new Dictionary<string, int>()
            };

            var mergedAb = TsuriDexRecord.Merge(a, b);
            var mergedBa = TsuriDexRecord.Merge(b, a);

            Assert.That(mergedAb.seen, Is.EqualTo(mergedBa.seen));
            Assert.That(mergedAb.count, Is.EqualTo(mergedBa.count));
            Assert.That(mergedAb.escapedCount, Is.EqualTo(mergedBa.escapedCount));
            Assert.That(mergedAb.maxSizeCm, Is.EqualTo(mergedBa.maxSizeCm));
            Assert.That(mergedAb.firstAt, Is.EqualTo(mergedBa.firstAt));
            Assert.That(mergedAb.lastAt, Is.EqualTo(mergedBa.lastAt));

            // 具体値も確認 (a.firstAt=1000 は非0、b.firstAt=0 → 非0側の1000を採用)。
            Assert.That(mergedAb.count, Is.EqualTo(3));
            Assert.That(mergedAb.escapedCount, Is.EqualTo(3));
            Assert.That(mergedAb.maxSizeCm, Is.EqualTo(20));
            Assert.That(mergedAb.firstAt, Is.EqualTo(1000));
            Assert.That(mergedAb.lastAt, Is.EqualTo(5000));
            Assert.That(mergedAb.seen, Is.True);

            CollectionAssert.AreEquivalent(mergedAb.sourceCounts, mergedBa.sourceCounts);
            CollectionAssert.AreEquivalent(mergedAb.locationCounts, mergedBa.locationCounts);
            Assert.That(mergedAb.sourceCounts["fishing_river"], Is.EqualTo(2));
            Assert.That(mergedAb.sourceCounts["fishing_sea"], Is.EqualTo(1));
        }

        [Test]
        public void Merge_FirstAt_BothPositive_TakesMinRegardlessOfOrder()
        {
            var a = new TsuriDexRecord { firstAt = 300 };
            var b = new TsuriDexRecord { firstAt = 100 };

            Assert.That(TsuriDexRecord.Merge(a, b).firstAt, Is.EqualTo(100));
            Assert.That(TsuriDexRecord.Merge(b, a).firstAt, Is.EqualTo(100));
        }

        [Test]
        public void Merge_FirstAt_BothNonPositiveAndUnequal_IsStillCommutative()
        {
            // レビュー指摘: 旧実装の `a > 0 ? a : b` は a<=0 かつ b<=0 かつ a!=b のとき非対称
            // だった (壊れた/未正規化データを直接 Merge した場合にのみ顕在化しうる)。
            var a = new TsuriDexRecord { firstAt = 0 };
            var b = new TsuriDexRecord { firstAt = -3 };

            Assert.That(TsuriDexRecord.Merge(a, b).firstAt, Is.EqualTo(TsuriDexRecord.Merge(b, a).firstAt));
            Assert.That(TsuriDexRecord.Merge(a, b).firstAt, Is.EqualTo(0));
        }

        [Test]
        public void Merge_NullArguments_TreatedAsEmptyRecord()
        {
            var a = new TsuriDexRecord { seen = true, count = 2 };

            var mergedWithNull = TsuriDexRecord.Merge(a, null);
            var mergedNullFirst = TsuriDexRecord.Merge(null, a);

            Assert.That(mergedWithNull.count, Is.EqualTo(2));
            Assert.That(mergedNullFirst.count, Is.EqualTo(2));
            Assert.That(TsuriDexRecord.Merge(null, null).count, Is.EqualTo(0));
        }

        // ═══ E-9: ApplyCatch / ApplyEscape 冪等性・加算則 ═══════════════════════
        [Test]
        public void ApplyCatch_SameOpIdTwice_IsIdempotent()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());
            var op = new TsuriCatchOp
            {
                opId = "fishcatch:abc123",
                runId = "run:test",
                source = TsuriDexSources.FishingRiver,
                locationId = "river_asase",
                speciesId = "fish_ayu",
                inventoryKey = "fish_ayu",
                edible = true,
                name = "あゆ",
                rarity = "normal",
                sizeCm = 18,
                caughtAt = 1000
            };

            var firstApply = store.ApplyCatch(doc, op);
            var secondApply = store.ApplyCatch(doc, op);

            Assert.That(firstApply, Is.True);
            Assert.That(secondApply, Is.False);
            Assert.That(doc.species["fish_ayu"].count, Is.EqualTo(1));
            Assert.That(doc.species["fish_ayu"].sourceCounts[TsuriDexSources.FishingRiver], Is.EqualTo(1));
            Assert.That(doc.species["fish_ayu"].locationCounts["river_asase"], Is.EqualTo(1));
        }

        [Test]
        public void ApplyEscape_DoesNotIncrementSourceOrLocationCounts()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());

            var applied = store.ApplyEscape(doc, "fishescape:xyz789", "fish_salmon", 2000);

            Assert.That(applied, Is.True);
            var record = doc.species["fish_salmon"];
            Assert.That(record.seen, Is.True);
            Assert.That(record.escapedCount, Is.EqualTo(1));
            Assert.That(record.count, Is.EqualTo(0));
            Assert.That(record.sourceCounts.Count, Is.EqualTo(0));
            Assert.That(record.locationCounts.Count, Is.EqualTo(0));
        }

        [Test]
        public void ApplyEscape_SameOpIdTwice_IsIdempotent()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());

            var first = store.ApplyEscape(doc, "fishescape:dupe", "fish_salmon", 2000);
            var second = store.ApplyEscape(doc, "fishescape:dupe", "fish_salmon", 3000);

            Assert.That(first, Is.True);
            Assert.That(second, Is.False);
            Assert.That(doc.species["fish_salmon"].escapedCount, Is.EqualTo(1));
        }

        [Test]
        public void ApplyCatch_Maguro_EdibleTrueWithNullInventoryKey_StillIncrementsCount()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());
            var maguro = TsuriFishData.GetSpeciesById("fish_maguro");
            Assert.That(maguro, Is.Not.Null);
            Assert.That(maguro.Edible, Is.True);
            Assert.That(maguro.InventoryKey, Is.Null);

            var op = new TsuriCatchOp
            {
                opId = "fishcatch:maguro1",
                runId = "run:test",
                source = TsuriDexSources.FishingSea,
                locationId = "sea_oki",
                speciesId = maguro.Id,
                inventoryKey = maguro.InventoryKey,
                edible = maguro.Edible,
                name = maguro.Name,
                rarity = "super",
                sizeCm = 100,
                caughtAt = 4000
            };

            var applied = store.ApplyCatch(doc, op);

            Assert.That(applied, Is.True);
            Assert.That(doc.species[maguro.Id].count, Is.EqualTo(1));
            Assert.That(doc.species[maguro.Id].maxSizeCm, Is.EqualTo(100));
        }

        [Test]
        public void ApplyCatch_UnknownOpIdOrSpeciesId_ReturnsFalse()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());

            Assert.That(store.ApplyCatch(doc, null), Is.False);
            Assert.That(store.ApplyCatch(null, new TsuriCatchOp { opId = "x", speciesId = "fish_ayu" }), Is.False);
            Assert.That(store.ApplyCatch(doc, new TsuriCatchOp { opId = "", speciesId = "fish_ayu" }), Is.False);
            Assert.That(store.ApplyCatch(doc, new TsuriCatchOp { opId = "fishcatch:z", speciesId = "" }), Is.False);
        }

        // ═══ E-10: Store 永続化 ═══════════════════════════════════════════════
        [Test]
        public void SaveThenLoad_RoundTrips_ToEquivalentDocument()
        {
            var dir = NewTempDir();
            var store = new TsuriDexStore(dir);

            var doc = store.Load();
            Assert.That(doc.species.Count, Is.EqualTo(0));

            var op = new TsuriCatchOp
            {
                opId = "fishcatch:roundtrip1",
                runId = "run:roundtrip",
                source = TsuriDexSources.FishingRiver,
                locationId = "river_kakou",
                speciesId = "fish_unagi",
                inventoryKey = "fish_unagi",
                edible = true,
                name = "うなぎ",
                rarity = "super",
                sizeCm = 60,
                caughtAt = 123456
            };
            store.ApplyCatch(doc, op);
            store.Save(doc);

            var reloaded = store.Load();

            Assert.That(reloaded.species.ContainsKey("fish_unagi"), Is.True);
            var record = reloaded.species["fish_unagi"];
            Assert.That(record.seen, Is.True);
            Assert.That(record.count, Is.EqualTo(1));
            Assert.That(record.maxSizeCm, Is.EqualTo(60));
            Assert.That(record.firstAt, Is.EqualTo(123456));
            Assert.That(record.lastAt, Is.EqualTo(123456));
            Assert.That(record.sourceCounts[TsuriDexSources.FishingRiver], Is.EqualTo(1));
            Assert.That(record.locationCounts["river_kakou"], Is.EqualTo(1));
            Assert.That(reloaded.appliedOps.ContainsKey("fishcatch:roundtrip1"), Is.True);
        }

        [Test]
        public void Load_MainFileCorrupted_BackupValid_RecoversFromBackup()
        {
            var dir = NewTempDir();
            Directory.CreateDirectory(dir);
            var store = new TsuriDexStore(dir);

            // 正常な .bak を用意する (一度 Save して発生した本体を .bak として複製する)。
            var goodDoc = new TsuriDexDocument();
            store.ApplyEscape(goodDoc, "fishescape:backup1", "fish_ebi", 999);
            store.Save(goodDoc);
            File.Copy(store.FishdexPath, store.BackupPath, true);

            // 本体だけを壊れた JSON で上書きする。
            File.WriteAllText(store.FishdexPath, "{ not valid json ", Encoding.GetEncoding("UTF-8"));

            var recovered = store.Load();

            Assert.That(recovered.species.ContainsKey("fish_ebi"), Is.True);
            Assert.That(recovered.species["fish_ebi"].escapedCount, Is.EqualTo(1));
        }

        [Test]
        public void Load_BothFilesCorrupted_ReturnsEmptyNormalizedDocument()
        {
            var dir = NewTempDir();
            Directory.CreateDirectory(dir);
            var store = new TsuriDexStore(dir);

            File.WriteAllText(store.FishdexPath, "{ broken", Encoding.GetEncoding("UTF-8"));
            File.WriteAllText(store.BackupPath, "also not json }}}", Encoding.GetEncoding("UTF-8"));

            var doc = store.Load();

            Assert.That(doc, Is.Not.Null);
            Assert.That(doc.species.Count, Is.EqualTo(0));
            Assert.That(doc.appliedOps.Count, Is.EqualTo(0));
            Assert.That(doc.version, Is.EqualTo(1));
        }

        [Test]
        public void Load_NoFilesExist_ReturnsEmptyNormalizedDocument()
        {
            var dir = NewTempDir();
            var store = new TsuriDexStore(dir);

            var doc = store.Load();

            Assert.That(doc.species.Count, Is.EqualTo(0));
            Assert.That(doc.appliedOps.Count, Is.EqualTo(0));
            Assert.That(doc.version, Is.EqualTo(1));
        }

        // ═══ TsuriDexDocument 補助 API ═══════════════════════════════════════
        [Test]
        public void TotalCountForSource_SumsAcrossAllSpecies()
        {
            var doc = new TsuriDexDocument();
            var store = new TsuriDexStore(NewTempDir());
            store.ApplyCatch(doc, new TsuriCatchOp
            {
                opId = "fishcatch:1", speciesId = "fish_ayu", source = TsuriDexSources.FishingRiver,
                locationId = "river_asase", caughtAt = 1
            });
            store.ApplyCatch(doc, new TsuriCatchOp
            {
                opId = "fishcatch:2", speciesId = "fish_salmon", source = TsuriDexSources.FishingRiver,
                locationId = "river_kakou", caughtAt = 2
            });
            store.ApplyCatch(doc, new TsuriCatchOp
            {
                opId = "fishcatch:3", speciesId = "fish_aji", source = TsuriDexSources.FishingSea,
                locationId = "sea_sunahama", caughtAt = 3
            });

            Assert.That(doc.TotalCountForSource(TsuriDexSources.FishingRiver), Is.EqualTo(2));
            Assert.That(doc.TotalCountForSource(TsuriDexSources.FishingSea), Is.EqualTo(1));
        }

        [Test]
        public void Document_Merge_UnionsSpeciesAndAppliedOps()
        {
            var docA = new TsuriDexDocument();
            var storeA = new TsuriDexStore(NewTempDir());
            storeA.ApplyCatch(docA, new TsuriCatchOp
            {
                opId = "fishcatch:a1", speciesId = "fish_ayu", source = TsuriDexSources.FishingRiver,
                locationId = "river_asase", caughtAt = 10
            });

            var docB = new TsuriDexDocument();
            var storeB = new TsuriDexStore(NewTempDir());
            storeB.ApplyCatch(docB, new TsuriCatchOp
            {
                opId = "fishcatch:b1", speciesId = "fish_ebi", source = TsuriDexSources.FishingSea,
                locationId = "sea_sunahama", caughtAt = 20
            });

            var merged = TsuriDexDocument.Merge(docA, docB);

            Assert.That(merged.species.ContainsKey("fish_ayu"), Is.True);
            Assert.That(merged.species.ContainsKey("fish_ebi"), Is.True);
            Assert.That(merged.appliedOps.ContainsKey("fishcatch:a1"), Is.True);
            Assert.That(merged.appliedOps.ContainsKey("fishcatch:b1"), Is.True);
        }

        [Test]
        public void Normalize_RemovesNullOrEmptyKeysAndClampsNegativeValues()
        {
            var doc = new TsuriDexDocument
            {
                version = 0,
                species = new Dictionary<string, TsuriDexRecord>
                {
                    { "fish_ayu", new TsuriDexRecord { count = -5, escapedCount = -1, firstAt = -10, lastAt = -20 } },
                    { "", new TsuriDexRecord() },
                    { "fish_nullrecord", null }
                },
                appliedOps = null
            };

            doc.Normalize();

            Assert.That(doc.version, Is.EqualTo(1));
            Assert.That(doc.species.ContainsKey(""), Is.False);
            Assert.That(doc.species.ContainsKey("fish_nullrecord"), Is.False);
            Assert.That(doc.species["fish_ayu"].count, Is.EqualTo(0));
            Assert.That(doc.species["fish_ayu"].escapedCount, Is.EqualTo(0));
            Assert.That(doc.species["fish_ayu"].firstAt, Is.EqualTo(0));
            Assert.That(doc.species["fish_ayu"].lastAt, Is.EqualTo(0));
            Assert.That(doc.appliedOps, Is.Not.Null);
            Assert.That(doc.appliedOps.Count, Is.EqualTo(0));
        }
    }
}
