using System.Linq;
using NUnit.Framework;

namespace Pono.TownCraft.Tests.EditMode
{
    public sealed class TownCraftRulesTests
    {
        [Test]
        public void HouseCatalogContainsFifteenDistinctStyles()
        {
            Assert.That(TownCraftCatalog.Houses, Has.Length.EqualTo(15));
            Assert.That(TownCraftCatalog.Houses.Select(h => h.Id).Distinct().Count(), Is.EqualTo(15));
            Assert.That(TownCraftCatalog.Houses.Any(h => h.Id == "ancient_stone"), Is.True);
            Assert.That(TownCraftCatalog.Houses.Any(h => h.Id == "modern_glass"), Is.True);
            Assert.That(TownCraftCatalog.Houses.Any(h => h.Id == "hover_future"), Is.True);
        }

        [Test]
        public void RoadsidePlacementRequiresRoadNeighbour()
        {
            var state = TownCraftState.CreateDemo();
            Assert.That(TownCraftRules.CanPlace(state, PlacementCategory.Roadside, 6, 5, out _), Is.True);
            Assert.That(TownCraftRules.CanPlace(state, PlacementCategory.Roadside, 1, 1, out var reason), Is.False);
            Assert.That(reason, Does.Contain("みち"));
        }

        [Test]
        public void BuildingCannotOccupyRoadOrRemoteGround()
        {
            var state = TownCraftState.CreateDemo();
            Assert.That(TownCraftRules.CanPlace(state, PlacementCategory.Building, 2, 6, out _), Is.False);
            Assert.That(TownCraftRules.CanPlace(state, PlacementCategory.Building, 1, 1, out _), Is.False);
            Assert.That(TownCraftRules.CanPlace(state, PlacementCategory.Building, 6, 5, out _), Is.True);
        }

        [Test]
        public void RiverMaskTracksFourNeighbours()
        {
            var state = TownCraftState.CreateDemo();
            var mask = TownCraftRules.ConnectionMask(state, 12, 5, cell => cell.water);
            Assert.That(mask & TownCraftRules.North, Is.Not.Zero);
            Assert.That(mask & TownCraftRules.South, Is.Not.Zero);
        }

        [Test]
        public void NameplateSanitizesEmptyAndLongNames()
        {
            Assert.That(TownCraftWorldRenderer.SanitizeName(""), Is.EqualTo("わたし"));
            Assert.That(TownCraftWorldRenderer.SanitizeName("あいうえおかきくけこ"), Is.EqualTo("あいうえおかきく"));
            Assert.That(TownCraftWorldRenderer.SanitizeName(" ゆい\n"), Is.EqualTo("ゆい"));
        }

        [Test]
        public void TownRequestRewardsOnlyOnce()
        {
            var state = TownCraftState.CreateDemo();
            var request = TownRequestCatalog.Requests[0];
            var before = state.inventory.materials;
            TownRequestCatalog.Complete(state, request);
            TownRequestCatalog.Complete(state, request);
            Assert.That(state.inventory.materials, Is.EqualTo(before + request.materialReward));
            Assert.That(state.completedRequests.Count(id => id == request.id), Is.EqualTo(1));
        }

        [Test]
        public void ThemeIsPresentationDataNotMapTopology()
        {
            var state = TownCraftState.CreateDemo();
            var before = state.cells.Select(c => (c.ground, c.road, c.water, c.height)).ToArray();
            state.theme = TownTheme.Future;
            var after = state.cells.Select(c => (c.ground, c.road, c.water, c.height)).ToArray();
            Assert.That(after, Is.EqualTo(before));
        }
    }
}
