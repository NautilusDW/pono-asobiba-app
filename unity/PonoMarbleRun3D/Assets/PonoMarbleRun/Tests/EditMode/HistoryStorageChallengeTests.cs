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
            var original = new CourseData { modeId = "challenge2", marbleCount = 8 };
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
            Assert.That(restored.marbleCount, Is.EqualTo(8));
            Assert.That(restored.pieces.Single().id, Is.EqualTo("stable-piece"));
            Assert.That(restored.pieces.Single().kind, Is.EqualTo(MarblePieceKind.Tunnel));
            Assert.That(restored.pieces.Single().pose.quarterTurns, Is.EqualTo(3));
            Assert.That(json, Does.Not.Contain("velocity"));
            Assert.That(json, Does.Not.Contain("selection"));
        }

        [Test]
        public void SchemaTwoRoundTripPreservesEveryNewPieceKind()
        {
            var original = new CourseData { modeId = "starter", marbleCount = 7 };
            var kinds = new[]
            {
                MarblePieceKind.Tornado,
                MarblePieceKind.Elevator,
                MarblePieceKind.ClearTube,
                MarblePieceKind.ClearCurve,
                MarblePieceKind.Wave,
                MarblePieceKind.Spinner
            };
            for (var index = 0; index < kinds.Length; index++)
            {
                original.pieces.Add(CatalogPlacementTests.Piece(
                    "new-" + index,
                    kinds[index],
                    index - 3,
                    2,
                    index,
                    0));
            }

            var json = CourseStorage.Encode(original);
            Assert.That(CourseStorage.TryDecode(json, out var restored, out var error), Is.True, error);
            Assert.That(restored.schemaVersion, Is.EqualTo(2));
            Assert.That(restored.modeId, Is.EqualTo("starter"));
            Assert.That(restored.marbleCount, Is.EqualTo(7));
            Assert.That(restored.pieces.Select(piece => piece.kind), Is.EqualTo(kinds));
            Assert.That(restored.pieces.Select(piece => piece.pose.quarterTurns),
                Is.EqualTo(new[] { 0, 1, 2, 3, 0, 1 }));
        }

        [Test]
        public void SchemaOneSaveMigratesToSixMarblesWithoutLosingPieces()
        {
            const string json = "{\"schemaVersion\":1,\"modeId\":\"sandbox\",\"pieces\":[{\"id\":\"old\",\"kind\":2,\"pose\":{\"x\":1,\"z\":2,\"level\":0,\"quarterTurns\":5},\"locked\":false}]}";
            Assert.That(CourseStorage.TryDecode(json, out var course, out var error), Is.True, error);
            Assert.That(course.schemaVersion, Is.EqualTo(CourseData.CurrentSchemaVersion));
            Assert.That(course.marbleCount, Is.EqualTo(CourseData.DefaultMarbleCount));
            Assert.That(course.pieces.Single().id, Is.EqualTo("old"));
            Assert.That(course.pieces.Single().pose.quarterTurns, Is.EqualTo(1));
        }

        [Test]
        public void SchemaTwoRejectsUnsafeMarbleCounts()
        {
            const string json = "{\"schemaVersion\":2,\"modeId\":\"sandbox\",\"marbleCount\":0,\"pieces\":[]}";
            Assert.That(CourseStorage.TryDecode(json, out var course, out var error), Is.False);
            Assert.That(course, Is.Null);
            Assert.That(error, Is.Not.Empty);
        }

        [Test]
        public void SaveValidationRejectsTallOccupancyCollisionButAllowsLayeredFlatTracks()
        {
            var layered = new CourseData { modeId = "sandbox" };
            layered.pieces.Add(CatalogPlacementTests.Piece(
                "lower", MarblePieceKind.Straight, 0, 0, 0, 0));
            layered.pieces.Add(CatalogPlacementTests.Piece(
                "upper", MarblePieceKind.Straight, 0, 0, 0, 1));
            Assert.That(CourseStorage.TryDecode(
                CourseStorage.Encode(layered), out _, out var layeredError), Is.True, layeredError);

            layered.pieces[0].kind = MarblePieceKind.Tunnel;
            Assert.That(CourseStorage.TryDecode(
                CourseStorage.Encode(layered), out var rejected, out var collisionError), Is.False);
            Assert.That(rejected, Is.Null);
            Assert.That(collisionError, Is.Not.Empty);
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
                foreach (var newKind in new[]
                         {
                             MarblePieceKind.Tornado,
                             MarblePieceKind.Elevator,
                             MarblePieceKind.ClearTube,
                             MarblePieceKind.ClearCurve,
                             MarblePieceKind.Wave,
                             MarblePieceKind.Spinner
                         })
                {
                    Assert.That(challenge.LimitFor(newKind), Is.GreaterThan(0),
                        challenge.Id + " " + newKind);
                }

                var solutions = ActualChallengeSolutions(challenge);
                Assert.That(challenge.IsCourseGoalReady(solutions.first), Is.True, challenge.Id + " first");
                Assert.That(challenge.IsCourseGoalReady(solutions.second), Is.True, challenge.Id + " second");
                solutions.second.pieces.RemoveAt(2);
                Assert.That(challenge.IsCourseGoalReady(solutions.second), Is.False, challenge.Id + " gap");
            }
        }

        [Test]
        public void CatalogHasSixEditableConnectedSampleCoursesWithSeparateSaves()
        {
            Assert.That(ChallengeCatalog.Samples.Count, Is.EqualTo(6));
            Assert.That(ChallengeCatalog.Samples.Select(sample => sample.DisplayName), Is.EqualTo(new[]
            {
                "はじめての みち",
                "にじいろ タワー",
                "そらの まよいみち",
                "のぼって おりて",
                "トルネード タワー",
                "エレベーター シティ"
            }));
            Assert.That(ChallengeCatalog.Samples.Select(sample => sample.Id).Distinct().Count(), Is.EqualTo(6));
            var savePaths = ChallengeCatalog.Samples
                .Select(sample => CourseStorage.GetSavePath(sample.Id))
                .ToArray();
            Assert.That(savePaths.Distinct().Count(), Is.EqualTo(6));
            Assert.That(savePaths, Has.None.EqualTo(CourseStorage.GetSavePath("sandbox")));

            foreach (var sample in ChallengeCatalog.Samples)
            {
                Assert.That(sample.IsChallenge, Is.False, sample.Id);
                Assert.That(sample.IsTutorial, Is.False, sample.Id);
                Assert.That(ChildFacingTextValidator.IsKanaSafe(sample.DisplayName, out var invalidName),
                    Is.True, sample.Id + " name=" + invalidName);
                Assert.That(ChildFacingTextValidator.IsKanaSafe(sample.GuideText, out var invalidGuide),
                    Is.True, sample.Id + " guide=" + invalidGuide);

                var course = sample.CreateInitialCourse();
                Assert.That(course.modeId, Is.EqualTo(sample.Id));
                Assert.That(course.marbleCount, Is.EqualTo(CourseData.DefaultMarbleCount));
                Assert.That(course.pieces.Count, Is.InRange(3, 48));
                Assert.That(course.pieces.Count(piece => piece.kind == MarblePieceKind.Start), Is.EqualTo(1));
                Assert.That(course.pieces.Count(piece => piece.kind == MarblePieceKind.Goal), Is.EqualTo(1));
                Assert.That(course.pieces.All(piece => !piece.locked), Is.True, sample.Id + " editable");
                Assert.That(course.pieces.Select(piece => piece.id).Distinct().Count(), Is.EqualTo(course.pieces.Count));
                foreach (var piece in course.pieces)
                {
                    var validation = PlacementSolver.Validate(
                        piece.kind,
                        piece.pose,
                        course.pieces,
                        sample,
                        piece.id);
                    Assert.That(validation.IsValid, Is.True, sample.Id + " " + piece.id + " " + validation.Reason);
                }
                Assert.That(PlacementSolver.HasStartToGoalGraphPath(course.pieces), Is.True, sample.Id);

                var second = sample.CreateInitialCourse();
                course.pieces[0].pose = course.pieces[0].pose.RotatedClockwise();
                Assert.That(second.pieces[0].pose, Is.Not.EqualTo(course.pieces[0].pose), sample.Id + " clone");
            }

            Assert.That(ChallengeCatalog.Get("sample1").InitialPieces.All(piece => piece.pose.level == 0), Is.True);
            foreach (var sample in ChallengeCatalog.Samples.Skip(1).Where(sample => sample.Id != "sample6"))
            {
                var start = sample.InitialPieces.Single(piece => piece.kind == MarblePieceKind.Start);
                var goal = sample.InitialPieces.Single(piece => piece.kind == MarblePieceKind.Goal);
                Assert.That(start.pose.level, Is.GreaterThan(goal.pose.level), sample.Id);
            }
            var sample6 = ChallengeCatalog.Get("sample6");
            Assert.That(sample6.InitialPieces.Single(piece => piece.kind == MarblePieceKind.Start).pose.level,
                Is.EqualTo(sample6.InitialPieces.Single(piece => piece.kind == MarblePieceKind.Goal).pose.level));
            Assert.That(sample6.InitialPieces.Max(piece => piece.pose.level), Is.EqualTo(3));
            var sampleKinds = ChallengeCatalog.Samples.SelectMany(sample => sample.InitialPieces)
                .Select(piece => piece.kind)
                .ToArray();
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Curve));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Helix));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Steps));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Lift));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Tornado));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Elevator));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.ClearTube));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Wave));
            Assert.That(sampleKinds, Does.Contain(MarblePieceKind.Spinner));
            Assert.That(ChallengeCatalog.Get("sample5").InitialPieces.Select(piece => piece.kind),
                Is.EqualTo(new[]
                {
                    MarblePieceKind.Start,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Tornado,
                    MarblePieceKind.Wave,
                    MarblePieceKind.Spinner,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Goal
                }));
            Assert.That(ChallengeCatalog.Get("sample6").InitialPieces.Select(piece => piece.kind),
                Is.EqualTo(new[]
                {
                    MarblePieceKind.Start,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Elevator,
                    MarblePieceKind.Straight,
                    MarblePieceKind.Wave,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Tornado,
                    MarblePieceKind.Spinner,
                    MarblePieceKind.ClearTube,
                    MarblePieceKind.Goal
                }));
            Assert.That(PartCatalog.Get(MarblePieceKind.Slope).DisplayName, Is.EqualTo("さかみち"));
            Assert.That(PartCatalog.Get(MarblePieceKind.Helix).DisplayName, Is.EqualTo("ぐるぐる"));
            Assert.That(PartCatalog.Get(MarblePieceKind.Steps).DisplayName, Is.EqualTo("かいだん"));
            Assert.That(PartCatalog.Get(MarblePieceKind.Lift).DisplayName, Is.EqualTo("のぼる みち"));
        }

        [Test]
        public void StarterModeIsUnlimitedRichConnectedAndIndependentlyEditable()
        {
            var starter = ChallengeCatalog.Starter;
            Assert.That(starter, Is.SameAs(ChallengeCatalog.Get("starter")));
            Assert.That(starter.Id, Is.EqualTo("starter"));
            Assert.That(starter.DisplayName, Is.EqualTo("すぐ ころがす"));
            Assert.That(starter.GuideText, Is.EqualTo("いろいろな うごきを みてみよう"));
            Assert.That(starter.IsTutorial, Is.False);
            Assert.That(starter.IsChallenge, Is.False);
            foreach (MarblePieceKind kind in System.Enum.GetValues(typeof(MarblePieceKind)))
            {
                var expected = kind == MarblePieceKind.Start || kind == MarblePieceKind.Goal ? 1 : -1;
                Assert.That(starter.LimitFor(kind), Is.EqualTo(expected), kind.ToString());
            }

            var course = starter.CreateInitialCourse();
            Assert.That(course.modeId, Is.EqualTo("starter"));
            Assert.That(course.pieces.All(piece => !piece.locked), Is.True);
            Assert.That(course.pieces.Count(piece => piece.kind == MarblePieceKind.Start), Is.EqualTo(1));
            Assert.That(course.pieces.Count(piece => piece.kind == MarblePieceKind.Goal), Is.EqualTo(1));
            Assert.That(course.pieces.Select(piece => piece.id).Distinct().Count(), Is.EqualTo(course.pieces.Count));
            Assert.That(PlacementSolver.HasStartToGoalGraphPath(course.pieces), Is.True);
            foreach (var newKind in new[]
                     {
                         MarblePieceKind.Tornado,
                         MarblePieceKind.Elevator,
                         MarblePieceKind.ClearTube,
                         MarblePieceKind.ClearCurve,
                         MarblePieceKind.Wave,
                         MarblePieceKind.Spinner
                     })
            {
                Assert.That(course.pieces.Any(piece => piece.kind == newKind), Is.True, newKind.ToString());
            }

            foreach (var piece in course.pieces)
            {
                var validation = PlacementSolver.Validate(
                    piece.kind,
                    piece.pose,
                    course.pieces,
                    starter,
                    piece.id);
                Assert.That(validation.IsValid, Is.True, piece.id + " " + validation.Reason);
            }

            var fresh = starter.CreateInitialCourse();
            course.pieces[0].pose = course.pieces[0].pose.RotatedClockwise();
            Assert.That(fresh.pieces[0].pose, Is.Not.EqualTo(course.pieces[0].pose));
            Assert.That(CourseStorage.GetSavePath("starter"),
                Is.Not.EqualTo(CourseStorage.GetSavePath("sandbox")));
        }

        private static (CourseData first, CourseData second) ActualChallengeSolutions(ModeDefinition challenge)
        {
            switch (challenge.Id)
            {
                case "challenge1":
                    return (
                        WithRoute(challenge,
                            P("a-high", MarblePieceKind.Straight, 0, -3, 1),
                            P("a-step", MarblePieceKind.Steps, 0, -2),
                            P("a-low1", MarblePieceKind.Straight, 0, -1),
                            P("a-low2", MarblePieceKind.Straight, 0, 0),
                            P("a-low3", MarblePieceKind.Straight, 0, 1),
                            P("a-low4", MarblePieceKind.Straight, 0, 2),
                            P("a-low5", MarblePieceKind.Straight, 0, 3)),
                        WithRoute(challenge,
                            P("b-high", MarblePieceKind.Straight, 0, -3, 1),
                            P("b-slope", MarblePieceKind.Slope, 0, -2),
                            P("b-low1", MarblePieceKind.Straight, 0, -1),
                            P("b-low2", MarblePieceKind.Straight, 0, 0),
                            P("b-low3", MarblePieceKind.Straight, 0, 1),
                            P("b-low4", MarblePieceKind.Straight, 0, 2),
                            P("b-low5", MarblePieceKind.Straight, 0, 3)));
                case "challenge2":
                    return (
                        WithRoute(challenge,
                            P("a-high", MarblePieceKind.Straight, 0, -3, 2),
                            P("a-helix", MarblePieceKind.Helix, 0, -2),
                            P("a-low1", MarblePieceKind.Straight, 0, -1),
                            P("a-low2", MarblePieceKind.Straight, 0, 0),
                            P("a-low3", MarblePieceKind.Straight, 0, 1),
                            P("a-low4", MarblePieceKind.Straight, 0, 2),
                            P("a-low5", MarblePieceKind.Straight, 0, 3)),
                        WithRoute(challenge,
                            P("b-high", MarblePieceKind.Straight, 0, -3, 2),
                            P("b-step1", MarblePieceKind.Steps, 0, -2, 1),
                            P("b-middle", MarblePieceKind.Straight, 0, -1, 1),
                            P("b-step2", MarblePieceKind.Steps, 0, 0),
                            P("b-low1", MarblePieceKind.Straight, 0, 1),
                            P("b-low2", MarblePieceKind.Straight, 0, 2),
                            P("b-low3", MarblePieceKind.Straight, 0, 3)));
                default:
                    return (
                        WithRoute(challenge,
                            P("a-high", MarblePieceKind.Straight, 0, -3, 3),
                            P("a-helix", MarblePieceKind.Helix, 0, -2, 1),
                            P("a-middle", MarblePieceKind.Straight, 0, -1, 1),
                            P("a-step", MarblePieceKind.Steps, 0, 0),
                            P("a-low1", MarblePieceKind.Straight, 0, 1),
                            P("a-low2", MarblePieceKind.Straight, 0, 2),
                            P("a-low3", MarblePieceKind.Straight, 0, 3)),
                        WithRoute(challenge,
                            P("b-high", MarblePieceKind.Straight, 0, -3, 3),
                            P("b-step1", MarblePieceKind.Steps, 0, -2, 2),
                            P("b-level2", MarblePieceKind.Straight, 0, -1, 2),
                            P("b-step2", MarblePieceKind.Steps, 0, 0, 1),
                            P("b-level1", MarblePieceKind.Straight, 0, 1, 1),
                            P("b-slope", MarblePieceKind.Slope, 0, 2),
                            P("b-low", MarblePieceKind.Straight, 0, 3)));
            }
        }

        private static CourseData WithRoute(ModeDefinition challenge, params PieceRecord[] route)
        {
            var course = challenge.CreateInitialCourse();
            course.pieces.AddRange(route);
            return course;
        }

        private static PieceRecord P(
            string id,
            MarblePieceKind kind,
            int x,
            int z,
            int level = 0,
            int turns = 0)
        {
            return CatalogPlacementTests.Piece(id, kind, x, z, turns, level);
        }
    }
}
