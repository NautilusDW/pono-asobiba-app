using System.Linq;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class HistoryStorageChallengeTests
    {
        [Test]
        public void HistoryRestoresPlaceRotateDeleteAndClearSnapshots()
        {
            var course = new CourseData { modeId = "sandbox" };
            course.pieces.Add(CatalogPlacementTests.Piece("a", MarblePieceKind.Straight, 0, 0, 0));
            var history = new CourseHistory();

            history.Capture(course);
            course.pieces[0].pose = course.pieces[0].pose.RotatedClockwise();
            history.Capture(course);
            course.pieces.RemoveAt(0);
            course.pieces.Add(CatalogPlacementTests.Piece("b", MarblePieceKind.Curve, 2, 2, 0));
            history.Capture(course);
            course.pieces.Clear();

            Assert.That(history.TryUndo(out var beforeClear), Is.True);
            Assert.That(beforeClear.pieces.Select(piece => piece.id), Is.EquivalentTo(new[] { "b" }));
            Assert.That(history.TryUndo(out var beforeDelete), Is.True);
            Assert.That(beforeDelete.pieces.Single().pose.quarterTurns, Is.EqualTo(1));
            Assert.That(history.TryUndo(out var beforeRotate), Is.True);
            Assert.That(beforeRotate.pieces.Single().pose.quarterTurns, Is.Zero);
        }

        [Test]
        public void HistoryCapacityIsBounded()
        {
            var history = new CourseHistory(3);
            var course = new CourseData();
            for (var i = 0; i < 8; i++)
            {
                course.modeId = "m" + i;
                history.Capture(course);
            }
            Assert.That(history.Count, Is.EqualTo(3));
        }

        [Test]
        public void SaveRoundTripPreservesStableDataOnly()
        {
            var original = new CourseData { modeId = "challenge2" };
            original.pieces.Add(new PieceRecord
            {
                id = "stable-piece",
                kind = MarblePieceKind.Tunnel,
                pose = new GridPose(2, -3, 1, 7),
                locked = false
            });
            var json = CourseStorage.Encode(original, true);
            Assert.That(CourseStorage.TryDecode(json, out var restored, out var error), Is.True, error);
            Assert.That(restored.schemaVersion, Is.EqualTo(CourseData.CurrentSchemaVersion));
            Assert.That(restored.modeId, Is.EqualTo("challenge2"));
            Assert.That(restored.pieces.Single().id, Is.EqualTo("stable-piece"));
            Assert.That(restored.pieces.Single().kind, Is.EqualTo(MarblePieceKind.Tunnel));
            Assert.That(restored.pieces.Single().pose.quarterTurns, Is.EqualTo(3));
            Assert.That(json, Does.Not.Contain("velocity"));
            Assert.That(json, Does.Not.Contain("selection"));
        }

        [TestCase("")]
        [TestCase("{")]
        [TestCase("{\"schemaVersion\":99,\"modeId\":\"sandbox\",\"pieces\":[]}")]
        [TestCase("{\"schemaVersion\":1,\"modeId\":\"sandbox\",\"pieces\":[{\"id\":\"x\",\"kind\":999,\"pose\":{\"x\":0,\"z\":0,\"level\":0,\"quarterTurns\":0}}]}")]
        public void MalformedOrUnsupportedSaveFailsSafely(string json)
        {
            Assert.That(CourseStorage.TryDecode(json, out var course, out var error), Is.False);
            Assert.That(course, Is.Null);
            Assert.That(error, Is.Not.Empty);
        }

        [Test]
        public void CatalogHasExactlyThreeOpenEndedChallenges()
        {
            Assert.That(ChallengeCatalog.Challenges.Count, Is.EqualTo(3));
            foreach (var challenge in ChallengeCatalog.Challenges)
            {
                Assert.That(challenge.IsChallenge, Is.True);
                Assert.That(challenge.Inventory.Values.Any(value => value > 0), Is.True);
                Assert.That(System.Enum.GetValues(typeof(MarblePieceKind)).Cast<MarblePieceKind>()
                        .Any(kind => challenge.LimitFor(kind) == 0), Is.True,
                    "each challenge must hide some parts");

                var straight = new CourseData { modeId = challenge.Id, pieces = CatalogPlacementTests.StraightSolution() };
                var detour = new CourseData { modeId = challenge.Id, pieces = CatalogPlacementTests.DetourSolution() };
                Assert.That(challenge.IsCourseGoalReady(straight), Is.True, challenge.Id + " straight");
                Assert.That(challenge.IsCourseGoalReady(detour), Is.True, challenge.Id + " detour");
                detour.pieces.RemoveAt(4);
                Assert.That(challenge.IsCourseGoalReady(detour), Is.False, challenge.Id + " gap");
            }
        }
    }
}
