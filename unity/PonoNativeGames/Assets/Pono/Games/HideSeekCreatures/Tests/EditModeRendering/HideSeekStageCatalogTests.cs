using System.Collections.Generic;
using NUnit.Framework;
using Pono.HideSeek.Core;
using Pono.HideSeekCreatures.Gameplay;
using UnityEngine;

namespace Pono.HideSeek.Tests.EditModeRendering
{
    public sealed class HideSeekStageCatalogTests
    {
        [Test]
        public void Catalog_DefinesExactlyThreeUniqueCreatures()
        {
            Assert.That(HideSeekStageCatalog.Creatures, Has.Length.EqualTo(3));
            var ids = new HashSet<string>();
            var resourcePaths = new HashSet<string>();

            for (var index = 0; index < HideSeekStageCatalog.Creatures.Length; index++)
            {
                var creature = HideSeekStageCatalog.Creatures[index];
                Assert.That(creature.Id, Is.Not.Empty);
                Assert.That(ids.Add(creature.Id), Is.True, $"Duplicate id: {creature.Id}");
                Assert.That(creature.ResourcePath, Is.Not.Empty);
                Assert.That(
                    resourcePaths.Add(creature.ResourcePath),
                    Is.True,
                    $"Duplicate resource: {creature.ResourcePath}");
            }
        }

        [Test]
        public void Catalog_CreatureGeometryStaysInsideNormalizedStage()
        {
            for (var index = 0; index < HideSeekStageCatalog.Creatures.Length; index++)
            {
                var creature = HideSeekStageCatalog.Creatures[index];
                AssertNormalizedPoint(creature.CenterUv, $"{creature.Id}.CenterUv");
                AssertNormalizedPoint(creature.HintUv, $"{creature.Id}.HintUv");
                Assert.That(creature.SizeUv.x, Is.GreaterThan(0f), $"{creature.Id}.SizeUv.x");
                Assert.That(creature.SizeUv.x, Is.LessThanOrEqualTo(1f), $"{creature.Id}.SizeUv.x");
                Assert.That(creature.SizeUv.y, Is.GreaterThan(0f), $"{creature.Id}.SizeUv.y");
                Assert.That(creature.SizeUv.y, Is.LessThanOrEqualTo(1f), $"{creature.Id}.SizeUv.y");

                var rect = creature.NormalizedRect;
                Assert.That(rect.xMin, Is.GreaterThanOrEqualTo(0f), $"{creature.Id}.xMin");
                Assert.That(rect.yMin, Is.GreaterThanOrEqualTo(0f), $"{creature.Id}.yMin");
                Assert.That(rect.xMax, Is.LessThanOrEqualTo(1f), $"{creature.Id}.xMax");
                Assert.That(rect.yMax, Is.LessThanOrEqualTo(1f), $"{creature.Id}.yMax");
                AssertNormalizedColor(creature.InkColor, $"{creature.Id}.InkColor");
            }
        }

        [Test]
        public void Catalog_ChildFacingNamesContainKanaAndNoKanji()
        {
            Assert.That(
                ChildFacingTextValidator.IsKanaFriendly(HideSeekStageCatalog.StageName),
                Is.True,
                HideSeekStageCatalog.StageName);
            Assert.That(
                ChildFacingTextValidator.ContainsKanji(HideSeekStageCatalog.StageName),
                Is.False);

            for (var index = 0; index < HideSeekStageCatalog.Creatures.Length; index++)
            {
                var displayName = HideSeekStageCatalog.Creatures[index].DisplayName;
                Assert.That(displayName, Is.Not.Empty);
                Assert.That(
                    ChildFacingTextValidator.IsKanaFriendly(displayName),
                    Is.True,
                    displayName);
                Assert.That(ChildFacingTextValidator.ContainsKanji(displayName), Is.False, displayName);
            }
        }

        [Test]
        public void StageDiscoveryFactory_BuildsThreeValidCoreDefinitions()
        {
            var definitions = StageDiscoveryFactory.CreateDefinitions();

            Assert.That(definitions, Has.Length.EqualTo(3));
            for (var index = 0; index < definitions.Length; index++)
            {
                var definition = definitions[index];
                Assert.That(definition.Id, Is.EqualTo(HideSeekStageCatalog.Creatures[index].Id));
                Assert.That(definition.RequiredCells.Count, Is.GreaterThan(0));
                Assert.That(definition.FaceCells.Count, Is.GreaterThan(0));
                Assert.That(definition.BodyCells.Count, Is.GreaterThan(0));
                Assert.That(definition.FeatureCells.Count, Is.GreaterThan(0));
                Assert.That(definition.Rules.RequiredCoverageRatio, Is.InRange(0f, 1f));
                Assert.That(definition.Rules.AnchorCoverageRatio, Is.InRange(0f, 1f));
                Assert.That(definition.Rules.MinimumAnchorRegions, Is.InRange(1, 3));
                Assert.That(definition.Rules.HoldSeconds, Is.GreaterThanOrEqualTo(0f));

                var required = new HashSet<int>(definition.RequiredCells);
                AssertRegionIsValidSubset(definition.FaceCells, required, "face");
                AssertRegionIsValidSubset(definition.BodyCells, required, "body");
                AssertRegionIsValidSubset(definition.FeatureCells, required, "feature");
            }
        }

        private static void AssertNormalizedPoint(Vector2 point, string label)
        {
            Assert.That(point.x, Is.InRange(0f, 1f), $"{label}.x");
            Assert.That(point.y, Is.InRange(0f, 1f), $"{label}.y");
        }

        private static void AssertNormalizedColor(Color color, string label)
        {
            Assert.That(color.r, Is.InRange(0f, 1f), $"{label}.r");
            Assert.That(color.g, Is.InRange(0f, 1f), $"{label}.g");
            Assert.That(color.b, Is.InRange(0f, 1f), $"{label}.b");
            Assert.That(color.a, Is.InRange(0f, 1f), $"{label}.a");
        }

        private static void AssertRegionIsValidSubset(
            IReadOnlyList<int> region,
            HashSet<int> required,
            string label)
        {
            for (var index = 0; index < region.Count; index++)
            {
                var cellIndex = region[index];
                Assert.That(
                    cellIndex,
                    Is.InRange(0, RevealMaskModel.CellCount - 1),
                    $"{label}[{index}]");
                Assert.That(required.Contains(cellIndex), Is.True, $"{label}[{index}] not required");
            }
        }
    }
}
