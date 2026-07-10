using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.MarbleRun3D.Core
{
    public readonly struct PlacementResult
    {
        public bool IsValid { get; }
        public GridPose Pose { get; }
        public bool SnappedToConnector { get; }
        public string Reason { get; }
        public string ConnectedPieceId { get; }

        public PlacementResult(
            bool isValid,
            GridPose pose,
            bool snappedToConnector,
            string reason,
            string connectedPieceId = null)
        {
            IsValid = isValid;
            Pose = pose;
            SnappedToConnector = snappedToConnector;
            Reason = reason ?? string.Empty;
            ConnectedPieceId = connectedPieceId ?? string.Empty;
        }
    }

    public static class PlacementSolver
    {
        public const int MinX = -6;
        public const int MaxX = 6;
        public const int MinZ = -5;
        public const int MaxZ = 5;
        public const int MinLevel = 0;
        public const int MaxLevel = 4;
        public const float ConnectorSnapToleranceCells = 0.68f;

        public static PlacementResult Solve(
            MarblePieceKind kind,
            int quarterTurns,
            Vector2 approximateCellPosition,
            int level,
            IReadOnlyList<PieceRecord> pieces,
            ModeDefinition mode,
            string ignorePieceId = null)
        {
            var pose = new GridPose(
                Mathf.RoundToInt(approximateCellPosition.x),
                Mathf.RoundToInt(approximateCellPosition.y),
                level,
                quarterTurns);
            var snapped = false;
            var connectedId = string.Empty;
            var bestScore = float.PositiveInfinity;
            var spec = PartCatalog.Get(kind);

            for (var pieceIndex = 0; pieceIndex < pieces.Count; pieceIndex++)
            {
                var existing = pieces[pieceIndex];
                if (string.Equals(existing.id, ignorePieceId, StringComparison.Ordinal))
                {
                    continue;
                }

                var existingSpec = PartCatalog.Get(existing.kind);
                for (var existingConnectorIndex = 0;
                     existingConnectorIndex < existingSpec.Connectors.Count;
                     existingConnectorIndex++)
                {
                    var existingConnector = PartCatalog.GetWorldConnector(existing, existingConnectorIndex);
                    for (var candidateConnectorIndex = 0;
                         candidateConnectorIndex < spec.Connectors.Count;
                         candidateConnectorIndex++)
                    {
                        var candidateSpec = spec.Connectors[candidateConnectorIndex];
                        var candidateFacing = PartCatalog.Rotate(candidateSpec.localFacing, quarterTurns);
                        if (candidateFacing + existingConnector.facing != Vector2Int.zero)
                        {
                            continue;
                        }

                        var candidateOffset = PartCatalog.Rotate(
                            candidateSpec.localCellPosition,
                            quarterTurns);
                        var candidateLevel = existingConnector.level - candidateSpec.localLevelOffset;
                        if (candidateLevel < MinLevel || candidateLevel > MaxLevel)
                        {
                            continue;
                        }
                        var targetCentre = existingConnector.cellPosition - candidateOffset;
                        if (Mathf.Abs(targetCentre.x - Mathf.Round(targetCentre.x)) > 0.001f
                            || Mathf.Abs(targetCentre.y - Mathf.Round(targetCentre.y)) > 0.001f)
                        {
                            continue;
                        }

                        var distance = Vector2.Distance(approximateCellPosition, targetCentre);
                        if (distance >= ConnectorSnapToleranceCells)
                        {
                            continue;
                        }
                        var score = distance + Mathf.Abs(candidateLevel - level) * 0.25f;
                        if (score >= bestScore) continue;

                        bestScore = score;
                        pose = new GridPose(
                            Mathf.RoundToInt(targetCentre.x),
                            Mathf.RoundToInt(targetCentre.y),
                            candidateLevel,
                            quarterTurns);
                        snapped = true;
                        connectedId = existing.id;
                    }
                }
            }

            var validation = Validate(kind, pose, pieces, mode, ignorePieceId);
            return new PlacementResult(
                validation.IsValid,
                pose,
                snapped,
                validation.Reason,
                connectedId);
        }

        public static PlacementResult Validate(
            MarblePieceKind kind,
            GridPose pose,
            IReadOnlyList<PieceRecord> pieces,
            ModeDefinition mode,
            string ignorePieceId = null)
        {
            if (!Enum.IsDefined(typeof(MarblePieceKind), kind))
            {
                return Invalid(pose, "しらない ぶひんだよ");
            }
            if (pose.x < MinX || pose.x > MaxX || pose.z < MinZ || pose.z > MaxZ
                || pose.level < MinLevel || pose.level > MaxLevel)
            {
                return Invalid(pose, "ここには おけないよ");
            }
            var spec = PartCatalog.Get(kind);
            for (var connectorIndex = 0; connectorIndex < spec.Connectors.Count; connectorIndex++)
            {
                var connectorLevel = pose.level + spec.Connectors[connectorIndex].localLevelOffset;
                if (connectorLevel < MinLevel || connectorLevel > MaxLevel)
                {
                    return Invalid(pose, "ここには おけないよ");
                }
            }
            var candidate = new PieceRecord
            {
                id = ignorePieceId ?? string.Empty,
                kind = kind,
                pose = pose
            };
            var candidateOccupancy = PartCatalog.GetWorldOccupancy(candidate);
            for (var occupancyIndex = 0; occupancyIndex < candidateOccupancy.Count; occupancyIndex++)
            {
                var occupied = candidateOccupancy[occupancyIndex];
                if (occupied.x < MinX || occupied.x > MaxX
                    || occupied.z < MinZ || occupied.z > MaxZ
                    || occupied.level < MinLevel)
                {
                    return Invalid(pose, "ここには おけないよ");
                }
            }

            for (var i = 0; i < pieces.Count; i++)
            {
                var existing = pieces[i];
                if (existing == null)
                {
                    return Invalid(pose, "ここには おけないよ");
                }
                if (string.Equals(existing.id, ignorePieceId, StringComparison.Ordinal))
                {
                    continue;
                }
                var existingOccupancy = PartCatalog.GetWorldOccupancy(existing);
                if (OccupancyOverlaps(candidateOccupancy, existingOccupancy))
                {
                    return Invalid(pose, "ぶひんが かさなるよ");
                }
            }

            if (kind == MarblePieceKind.Start || kind == MarblePieceKind.Goal)
            {
                for (var i = 0; i < pieces.Count; i++)
                {
                    if (pieces[i].kind == kind
                        && !string.Equals(pieces[i].id, ignorePieceId, StringComparison.Ordinal))
                    {
                        return Invalid(pose, "ひとつだけ おけるよ");
                    }
                }
            }

            if (mode != null && !mode.CanAdd(kind, pieces, ignorePieceId))
            {
                return Invalid(pose, "ぶひんを つかいきったよ");
            }
            return new PlacementResult(true, pose, false, string.Empty);
        }

        public static bool AreConnected(PieceRecord first, PieceRecord second)
        {
            var firstSpec = PartCatalog.Get(first.kind);
            var secondSpec = PartCatalog.Get(second.kind);
            for (var firstIndex = 0; firstIndex < firstSpec.Connectors.Count; firstIndex++)
            {
                var firstConnector = PartCatalog.GetWorldConnector(first, firstIndex);
                for (var secondIndex = 0; secondIndex < secondSpec.Connectors.Count; secondIndex++)
                {
                    var secondConnector = PartCatalog.GetWorldConnector(second, secondIndex);
                    if (Vector2.SqrMagnitude(firstConnector.cellPosition - secondConnector.cellPosition) > 0.0001f)
                    {
                        continue;
                    }
                    if (firstConnector.level == secondConnector.level
                        && firstConnector.facing + secondConnector.facing == Vector2Int.zero)
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        public static bool HasStartToGoalGraphPath(IReadOnlyList<PieceRecord> pieces)
        {
            var startIndex = -1;
            var goalIndex = -1;
            for (var i = 0; i < pieces.Count; i++)
            {
                if (pieces[i].kind == MarblePieceKind.Start) startIndex = i;
                if (pieces[i].kind == MarblePieceKind.Goal) goalIndex = i;
            }
            if (startIndex < 0 || goalIndex < 0)
            {
                return false;
            }

            var queue = new Queue<int>();
            var visited = new HashSet<int>();
            queue.Enqueue(startIndex);
            visited.Add(startIndex);
            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (current == goalIndex)
                {
                    return true;
                }
                for (var candidate = 0; candidate < pieces.Count; candidate++)
                {
                    if (!visited.Contains(candidate)
                        && AreConnected(pieces[current], pieces[candidate]))
                    {
                        visited.Add(candidate);
                        queue.Enqueue(candidate);
                    }
                }
            }
            return false;
        }

        private static bool OccupancyOverlaps(
            IReadOnlyList<OccupancyPose> first,
            IReadOnlyList<OccupancyPose> second)
        {
            for (var firstIndex = 0; firstIndex < first.Count; firstIndex++)
            {
                for (var secondIndex = 0; secondIndex < second.Count; secondIndex++)
                {
                    if (first[firstIndex].Equals(second[secondIndex])) return true;
                }
            }
            return false;
        }

        private static PlacementResult Invalid(GridPose pose, string reason)
        {
            return new PlacementResult(false, pose, false, reason);
        }
    }
}
