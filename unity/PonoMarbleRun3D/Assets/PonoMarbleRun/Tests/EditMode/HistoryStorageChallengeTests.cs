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
        public void SaveFromAnotherModeIsRejected()
        {
            var json = CourseStorage.Encode(new CourseData { modeId = "challenge1" });
            Assert.That(CourseStorage.TryDecodeForMode(
                json,
                "sandbox",
                out var course,
                out var error), Is.False);
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

                var solutions = ActualChallengeSolutions(challenge);
                Assert.That(challenge.IsCourseGoalReady(solutions.first), Is.True, challenge.Id + " first");
                Assert.That(challenge.IsCourseGoalReady(solutions.second), Is.True, challenge.Id + " second");
                solutions.second.pieces.RemoveAt(2);
                Assert.That(challenge.IsCourseGoalReady(solutions.second), Is.False, challenge.Id + " gap");
            }
        }

        private static (CourseData first, CourseData second) ActualChallengeSolutions(ModeDefinition challenge)
        {
            switch (challenge.Id)
            {
                case "challenge1":
                    return (
                        WithRoute(challenge,
                            P("a-c1", MarblePieceKind.Curve, -3, -1, 0),
                            P("a-x1", MarblePieceKind.Straight, -2, -1, 1),
                            P("a-x2", MarblePieceKind.Straight, -1, -1, 1),
                            P("a-x3", MarblePieceKind.Straight, 0, -1, 1),
                            P("a-x4", MarblePieceKind.Straight, 1, -1, 1),
                            P("a-c2", MarblePieceKind.Curve, 2, -1, 2),
                            P("a-z1", MarblePieceKind.Straight, 2, 0, 0),
                            P("a-z2", MarblePieceKind.Straight, 2, 1, 0),
                            P("a-c3", MarblePieceKind.Curve, 2, 2, 0)),
                        WithRoute(challenge,
                            P("b-z1", MarblePieceKind.Straight, -3, -1, 0),
                            P("b-c1", MarblePieceKind.Curve, -3, 0, 0),
                            P("b-x1", MarblePieceKind.Straight, -2, 0, 1),
                            P("b-x2", MarblePieceKind.Straight, -1, 0, 1),
                            P("b-x3", MarblePieceKind.Straight, 0, 0, 1),
                            P("b-x4", MarblePieceKind.Straight, 1, 0, 1),
                            P("b-c2", MarblePieceKind.Curve, 2, 0, 2),
                            P("b-z2", MarblePieceKind.Straight, 2, 1, 0),
                            P("b-c3", MarblePieceKind.Curve, 2, 2, 0)));
                case "challenge2":
                    return (
                        VerticalRoute(challenge),
                        VerticalRoute(challenge,
                            (-2, MarblePieceKind.Tunnel),
                            (1, MarblePieceKind.Seesaw)));
                default:
                    return (
                        VerticalRoute(challenge),
                        VerticalRoute(challenge,
                            (-1, MarblePieceKind.Funnel),
                            (1, MarblePieceKind.Domino)));
            }
        }

        private static CourseData VerticalRoute(
            ModeDefinition challenge,
            params (int z, MarblePieceKind kind)[] replacements)
        {
            var course = challenge.CreateInitialCourse();
            for (var z = -3; z <= 3; z++)
            {
                var kind = MarblePieceKind.Straight;
                for (var i = 0; i < replacements.Length; i++)
                {
                    if (replacements[i].z == z) kind = replacements[i].kind;
                }
                course.pieces.Add(P(challenge.Id + "-" + z, kind, 0, z, 0));
            }
            return course;
        }

        private static CourseData WithRoute(ModeDefinition challenge, params PieceRecord[] route)
        {
            var course = challenge.CreateInitialCourse();
            course.pieces.AddRange(route);
            return course;
        }

        private static PieceRecord P(string id, MarblePieceKind kind, int x, int z, int turns)
        {
            return CatalogPlacementTests.Piece(id, kind, x, z, turns);
        }
    }
}
