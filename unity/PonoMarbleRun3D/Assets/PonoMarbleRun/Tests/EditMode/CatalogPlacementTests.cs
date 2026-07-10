using System;
using System.Collections.Generic;
using NUnit.Framework;
using Pono.MarbleRun3D.Core;
using UnityEngine;

namespace Pono.MarbleRun3D.Tests.EditMode
{
    public sealed class CatalogPlacementTests
    {
        [Test]
        public void CatalogContainsEveryRequiredPieceExactlyOnce()
        {
            var seen = new HashSet<MarblePieceKind>();
            foreach (var spec in PartCatalog.All)
            {
                Assert.That(seen.Add(spec.Kind), Is.True, "duplicate kind " + spec.Kind);
                Assert.That(spec.Connectors.Count, Is.GreaterThan(0), spec.Kind.ToString());
                Assert.That(spec.DisplayName, Is.Not.Empty);
            }
            Assert.That(seen.Count, Is.EqualTo(10));
            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
                Assert.That(seen, Does.Contain(kind));
        }

        [Test]
        public void EveryConnectorIsFiniteCardinalAndOnPieceEdge()
        {
            foreach (var spec in PartCatalog.All)
            {
                for (var index = 0; index < spec.Connectors.Count; index++)
                {
                    var connector = spec.Connectors[index];
                    Assert.That(float.IsNaN(connector.localCellPosition.x) || float.IsInfinity(connector.localCellPosition.x), Is.False);
                    Assert.That(float.IsNaN(connector.localCellPosition.y) || float.IsInfinity(connector.localCellPosition.y), Is.False);
                    Assert.That(Mathf.Abs(connector.localFacing.x) + Mathf.Abs(connector.localFacing.y), Is.EqualTo(1));
                    Assert.That(connector.localLevelOffset, Is.InRange(0, 1));
                    Assert.That(
                        Mathf.Approximately(Mathf.Abs(connector.localCellPosition.x), 0.5f)
                        || Mathf.Approximately(Mathf.Abs(connector.localCellPosition.y), 0.5f),
                        Is.True,
                        spec.Kind + " connector " + index);
                }
            }
        }

        [Test]
        public void FourQuarterTurnsReturnToOriginalConnector()
        {
            var vector = new Vector2(0.25f, 0.5f);
            var facing = Vector2Int.up;
            for (var turns = 0; turns < 4; turns++)
            {
                vector = PartCatalog.Rotate(vector, 1);
                facing = PartCatalog.Rotate(facing, 1);
            }
            Assert.That(vector, Is.EqualTo(new Vector2(0.25f, 0.5f)));
            Assert.That(facing, Is.EqualTo(Vector2Int.up));
            Assert.That(new GridPose(1, 2, 0, 3).RotatedClockwise().quarterTurns, Is.Zero);
        }

        [Test]
        public void SnapChoosesCompatibleAdjacentConnector()
        {
            var pieces = new List<PieceRecord>
            {
                Piece("existing", MarblePieceKind.Straight, 0, 0, 0)
            };
            var result = PlacementSolver.Solve(
                MarblePieceKind.Straight,
                0,
                new Vector2(0.18f, 1.24f),
                0,
                pieces,
                ChallengeCatalog.Sandbox);
            Assert.That(result.IsValid, Is.True);
            Assert.That(result.SnappedToConnector, Is.True);
            Assert.That(result.Pose.x, Is.Zero);
            Assert.That(result.Pose.z, Is.EqualTo(1));
            Assert.That(result.ConnectedPieceId, Is.EqualTo("existing"));
        }

        [Test]
        public void SnapDoesNotRotateCandidateOrJumpBeyondTolerance()
        {
            var pieces = new List<PieceRecord> { Piece("existing", MarblePieceKind.Straight, 0, 0, 0) };
            var result = PlacementSolver.Solve(
                MarblePieceKind.Curve,
                2,
                new Vector2(4.2f, 4.2f),
                0,
                pieces,
                ChallengeCatalog.Sandbox);
            Assert.That(result.SnappedToConnector, Is.False);
            Assert.That(result.Pose.quarterTurns, Is.EqualTo(2));
            Assert.That(result.Pose.x, Is.EqualTo(4));
            Assert.That(result.Pose.z, Is.EqualTo(4));
        }

        [Test]
        public void SlopeSnapsFlatTracksAtBothPhysicalLevels()
        {
            var slope = Piece("slope", MarblePieceKind.Slope, 0, 0, 0);
            var pieces = new List<PieceRecord> { slope };

            var high = PlacementSolver.Solve(
                MarblePieceKind.Straight,
                0,
                new Vector2(0.08f, -1.12f),
                0,
                pieces,
                ChallengeCatalog.Sandbox);
            Assert.That(high.IsValid, Is.True);
            Assert.That(high.SnappedToConnector, Is.True);
            Assert.That(high.Pose, Is.EqualTo(new GridPose(0, -1, 1, 0)));
            var highTrack = Piece("high", MarblePieceKind.Straight, 0, -1, 0, 1);
            Assert.That(PlacementSolver.AreConnected(slope, highTrack), Is.True);

            var low = PlacementSolver.Solve(
                MarblePieceKind.Straight,
                0,
                new Vector2(-0.08f, 1.12f),
                0,
                pieces,
                ChallengeCatalog.Sandbox);
            Assert.That(low.Pose, Is.EqualTo(new GridPose(0, 1, 0, 0)));
            Assert.That(PlacementSolver.AreConnected(slope,
                Piece("low", MarblePieceKind.Straight, 0, 1, 0)), Is.True);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Slope,
                new GridPose(2, 2, 1, 0),
                pieces,
                ChallengeCatalog.Sandbox).IsValid, Is.False);
        }

        [Test]
        public void PlacementRejectsOverlapBoundsAndDuplicateEndpoints()
        {
            var pieces = new List<PieceRecord>
            {
                Piece("start", MarblePieceKind.Start, 0, 0, 0),
                Piece("straight", MarblePieceKind.Straight, 1, 0, 0)
            };
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Curve, new GridPose(1, 0), pieces, ChallengeCatalog.Sandbox).IsValid, Is.False);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Curve, new GridPose(99, 0), pieces, ChallengeCatalog.Sandbox).IsValid, Is.False);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Start, new GridPose(2, 0), pieces, ChallengeCatalog.Sandbox).IsValid, Is.False);
            Assert.That(pieces.Count, Is.EqualTo(2), "validation must not mutate the course");
        }

        [Test]
        public void GraphFindsConnectedPathAndRejectsGap()
        {
            var connected = StraightSolution();
            Assert.That(PlacementSolver.HasStartToGoalGraphPath(connected), Is.True);
            connected.RemoveAt(2);
            Assert.That(PlacementSolver.HasStartToGoalGraphPath(connected), Is.False);
        }

        public static List<PieceRecord> StraightSolution()
        {
            return new List<PieceRecord>
            {
                Piece("s", MarblePieceKind.Start, 0, -2, 0),
                Piece("a", MarblePieceKind.Straight, 0, -1, 0),
                Piece("b", MarblePieceKind.Straight, 0, 0, 0),
                Piece("c", MarblePieceKind.Straight, 0, 1, 0),
                Piece("g", MarblePieceKind.Goal, 0, 2, 0)
            };
        }

        public static List<PieceRecord> DetourSolution()
        {
            return new List<PieceRecord>
            {
                Piece("s", MarblePieceKind.Start, 0, -2, 0),
                Piece("c1", MarblePieceKind.Curve, 0, -1, 0),
                Piece("x1", MarblePieceKind.Straight, 1, -1, 1),
                Piece("c2", MarblePieceKind.Curve, 2, -1, 2),
                Piece("z1", MarblePieceKind.Straight, 2, 0, 0),
                Piece("z2", MarblePieceKind.Straight, 2, 1, 0),
                Piece("c3", MarblePieceKind.Curve, 2, 2, 1),
                Piece("x2", MarblePieceKind.Straight, 1, 2, 1),
                Piece("g", MarblePieceKind.Goal, 0, 2, 3)
            };
        }

        public static PieceRecord Piece(
            string id,
            MarblePieceKind kind,
            int x,
            int z,
            int turns,
            int level = 0)
        {
            return new PieceRecord { id = id, kind = kind, pose = new GridPose(x, z, level, turns) };
        }
    }
}
