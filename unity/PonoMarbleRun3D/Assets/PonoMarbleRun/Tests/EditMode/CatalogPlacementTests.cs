using System;
using System.Collections.Generic;
using System.Linq;
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
            Assert.That(seen.Count, Is.EqualTo(13));
            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
                Assert.That(seen, Does.Contain(kind));
            Assert.That((int)MarblePieceKind.Domino, Is.EqualTo(9));
            Assert.That((int)MarblePieceKind.Helix, Is.EqualTo(10));
            Assert.That((int)MarblePieceKind.Steps, Is.EqualTo(11));
            Assert.That((int)MarblePieceKind.Lift, Is.EqualTo(12));
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
                    Assert.That(connector.localLevelOffset, Is.InRange(0, 2));
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
        public void SnapPrefersConnectorOnRequestedLayerWhenXZMatches()
        {
            var pieces = new List<PieceRecord>
            {
                Piece("lower", MarblePieceKind.Straight, 0, 0, 0, 0),
                Piece("upper", MarblePieceKind.Straight, 0, 0, 0, 2)
            };
            var result = PlacementSolver.Solve(
                MarblePieceKind.Straight,
                0,
                new Vector2(0.05f, 1.08f),
                2,
                pieces,
                ChallengeCatalog.Sandbox);
            Assert.That(result.IsValid, Is.True, result.Reason);
            Assert.That(result.SnappedToConnector, Is.True);
            Assert.That(result.Pose.level, Is.EqualTo(2));
            Assert.That(result.ConnectedPieceId, Is.EqualTo("upper"));
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
                new GridPose(2, 2, PlacementSolver.MaxLevel, 0),
                pieces,
                ChallengeCatalog.Sandbox).IsValid, Is.False);
        }

        [Test]
        public void NewVerticalPartsExposeExpectedLevelConnections()
        {
            var helix = PartCatalog.Get(MarblePieceKind.Helix);
            var steps = PartCatalog.Get(MarblePieceKind.Steps);
            var lift = PartCatalog.Get(MarblePieceKind.Lift);

            Assert.That(helix.DisplayName, Is.EqualTo("ぐるぐる"));
            Assert.That(helix.Connectors.Select(connector => connector.localLevelOffset),
                Is.EquivalentTo(new[] { 0, 2 }));
            Assert.That(steps.DisplayName, Is.EqualTo("かいだん"));
            Assert.That(steps.Connectors.Select(connector => connector.localLevelOffset),
                Is.EquivalentTo(new[] { 0, 1 }));
            Assert.That(lift.DisplayName, Is.EqualTo("のぼる みち"));
            Assert.That(lift.Connectors[0].localLevelOffset, Is.Zero);
            Assert.That(lift.Connectors[1].localLevelOffset, Is.EqualTo(1));
            Assert.That(PlacementSolver.MaxLevel, Is.EqualTo(4));

            var helixPiece = Piece("helix", MarblePieceKind.Helix, 0, 0, 0);
            Assert.That(PlacementSolver.AreConnected(
                Piece("helix-high", MarblePieceKind.Straight, 0, -1, 0, 2), helixPiece), Is.True);
            Assert.That(PlacementSolver.AreConnected(
                helixPiece, Piece("helix-low", MarblePieceKind.Straight, 0, 1, 0, 0)), Is.True);

            var stepsPiece = Piece("steps", MarblePieceKind.Steps, 2, 0, 0);
            Assert.That(PlacementSolver.AreConnected(
                Piece("steps-high", MarblePieceKind.Straight, 2, -1, 0, 1), stepsPiece), Is.True);
            Assert.That(PlacementSolver.AreConnected(
                stepsPiece, Piece("steps-low", MarblePieceKind.Straight, 2, 1, 0, 0)), Is.True);

            var liftPiece = Piece("lift", MarblePieceKind.Lift, -2, 0, 0);
            Assert.That(PlacementSolver.AreConnected(
                Piece("lift-low", MarblePieceKind.Straight, -2, -1, 0, 0), liftPiece), Is.True);
            Assert.That(PlacementSolver.AreConnected(
                liftPiece, Piece("lift-high", MarblePieceKind.Straight, -2, 1, 0, 1)), Is.True);
        }

        [Test]
        public void FlatTracksCanCrossOnSeparateLevelsButTallPartsReserveHeadroom()
        {
            var lowerStraight = Piece("lower", MarblePieceKind.Straight, 0, 0, 0, 0);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Straight,
                new GridPose(0, 0, 1),
                new[] { lowerStraight },
                ChallengeCatalog.Sandbox).IsValid, Is.True);

            foreach (var tallKind in new[]
                     {
                         MarblePieceKind.Tunnel,
                         MarblePieceKind.Goal,
                         MarblePieceKind.Slope,
                         MarblePieceKind.Steps,
                         MarblePieceKind.Lift
                     })
            {
                var tall = Piece("tall-" + tallKind, tallKind, 0, 0, 0, 0);
                Assert.That(PlacementSolver.Validate(
                        MarblePieceKind.Straight,
                        new GridPose(0, 0, 1),
                        new[] { tall },
                        ChallengeCatalog.Sandbox).IsValid,
                    Is.False,
                    tallKind.ToString());
            }

            var helix = Piece("helix", MarblePieceKind.Helix, 2, 2, 0, 0);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Straight,
                new GridPose(2, 2, 2),
                new[] { helix },
                ChallengeCatalog.Sandbox).IsValid, Is.False);
            Assert.That(PlacementSolver.Validate(
                MarblePieceKind.Straight,
                new GridPose(2, 2, 3),
                new[] { helix },
                ChallengeCatalog.Sandbox).IsValid, Is.True);
        }

        [Test]
        public void RelativeOccupancyRotatesWithPiecePose()
        {
            var local = new OccupancySpec(1, 0, 2);
            var world = PartCatalog.GetWorldOccupancy(new GridPose(3, 4, 1, 1), local);
            Assert.That(world, Is.EqualTo(new OccupancyPose(3, 3, 3)));
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
