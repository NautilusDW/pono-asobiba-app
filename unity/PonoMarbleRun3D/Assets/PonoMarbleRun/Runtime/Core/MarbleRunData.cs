using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.MarbleRun3D.Core
{
    public enum MarblePieceKind
    {
        Start = 0,
        Goal = 1,
        Straight = 2,
        Curve = 3,
        Slope = 4,
        Splitter = 5,
        Tunnel = 6,
        Funnel = 7,
        Seesaw = 8,
        Domino = 9
    }

    [Serializable]
    public struct GridPose : IEquatable<GridPose>
    {
        public int x;
        public int z;
        public int level;
        public int quarterTurns;

        public GridPose(int x, int z, int level = 0, int quarterTurns = 0)
        {
            this.x = x;
            this.z = z;
            this.level = level;
            this.quarterTurns = NormalizeQuarterTurns(quarterTurns);
        }

        public GridPose RotatedClockwise()
        {
            return new GridPose(x, z, level, quarterTurns + 1);
        }

        public bool Equals(GridPose other)
        {
            return x == other.x
                && z == other.z
                && level == other.level
                && quarterTurns == other.quarterTurns;
        }

        public override bool Equals(object obj)
        {
            return obj is GridPose other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(x, z, level, quarterTurns);
        }

        public static int NormalizeQuarterTurns(int value)
        {
            value %= 4;
            return value < 0 ? value + 4 : value;
        }
    }

    [Serializable]
    public sealed class PieceRecord
    {
        public string id;
        public MarblePieceKind kind;
        public GridPose pose;
        public bool locked;

        public PieceRecord Clone()
        {
            return new PieceRecord
            {
                id = id,
                kind = kind,
                pose = pose,
                locked = locked
            };
        }
    }

    [Serializable]
    public sealed class CourseData
    {
        public const int CurrentSchemaVersion = 1;

        public int schemaVersion = CurrentSchemaVersion;
        public string modeId = "sandbox";
        public List<PieceRecord> pieces = new List<PieceRecord>();

        public CourseData Clone()
        {
            var clone = new CourseData
            {
                schemaVersion = schemaVersion,
                modeId = modeId,
                pieces = new List<PieceRecord>(pieces.Count)
            };
            for (var i = 0; i < pieces.Count; i++)
            {
                clone.pieces.Add(pieces[i].Clone());
            }
            return clone;
        }

        public PieceRecord Find(string id)
        {
            return pieces.Find(piece => string.Equals(piece.id, id, StringComparison.Ordinal));
        }
    }

    public readonly struct ConnectorSpec
    {
        public readonly Vector2 localCellPosition;
        public readonly Vector2Int localFacing;

        public ConnectorSpec(float x, float z, int facingX, int facingZ)
        {
            localCellPosition = new Vector2(x, z);
            localFacing = new Vector2Int(facingX, facingZ);
        }
    }

    public readonly struct ConnectorPose
    {
        public readonly Vector2 cellPosition;
        public readonly Vector2Int facing;

        public ConnectorPose(Vector2 cellPosition, Vector2Int facing)
        {
            this.cellPosition = cellPosition;
            this.facing = facing;
        }
    }

    public sealed class PartSpec
    {
        public MarblePieceKind Kind { get; }
        public string DisplayName { get; }
        public Color Accent { get; }
        public IReadOnlyList<ConnectorSpec> Connectors { get; }

        public PartSpec(
            MarblePieceKind kind,
            string displayName,
            Color accent,
            params ConnectorSpec[] connectors)
        {
            Kind = kind;
            DisplayName = displayName;
            Accent = accent;
            Connectors = connectors;
        }
    }

    public static class PartCatalog
    {
        private static readonly Dictionary<MarblePieceKind, PartSpec> Specs =
            new Dictionary<MarblePieceKind, PartSpec>
            {
                [MarblePieceKind.Start] = new PartSpec(
                    MarblePieceKind.Start,
                    "スタート",
                    new Color(0.36f, 0.78f, 0.52f),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Goal] = new PartSpec(
                    MarblePieceKind.Goal,
                    "ゴール",
                    new Color(1f, 0.69f, 0.26f),
                    new ConnectorSpec(0f, -0.5f, 0, -1)),
                [MarblePieceKind.Straight] = new PartSpec(
                    MarblePieceKind.Straight,
                    "まっすぐ",
                    new Color(0.35f, 0.72f, 0.92f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Curve] = new PartSpec(
                    MarblePieceKind.Curve,
                    "カーブ",
                    new Color(0.96f, 0.48f, 0.42f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0.5f, 0f, 1, 0)),
                [MarblePieceKind.Slope] = new PartSpec(
                    MarblePieceKind.Slope,
                    "くだりざか",
                    new Color(0.77f, 0.62f, 0.94f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Splitter] = new PartSpec(
                    MarblePieceKind.Splitter,
                    "ぶんき",
                    new Color(0.98f, 0.74f, 0.28f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(-0.5f, 0f, -1, 0),
                    new ConnectorSpec(0.5f, 0f, 1, 0)),
                [MarblePieceKind.Tunnel] = new PartSpec(
                    MarblePieceKind.Tunnel,
                    "トンネル",
                    new Color(0.28f, 0.78f, 0.74f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Funnel] = new PartSpec(
                    MarblePieceKind.Funnel,
                    "じょうご",
                    new Color(0.96f, 0.53f, 0.72f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Seesaw] = new PartSpec(
                    MarblePieceKind.Seesaw,
                    "シーソー",
                    new Color(0.48f, 0.82f, 0.38f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Domino] = new PartSpec(
                    MarblePieceKind.Domino,
                    "ドミノ",
                    new Color(0.95f, 0.40f, 0.33f),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1))
            };

        public static IReadOnlyCollection<PartSpec> All => Specs.Values;

        public static PartSpec Get(MarblePieceKind kind)
        {
            return Specs[kind];
        }

        public static ConnectorPose GetWorldConnector(PieceRecord piece, int connectorIndex)
        {
            var connector = Specs[piece.kind].Connectors[connectorIndex];
            var rotatedPosition = Rotate(connector.localCellPosition, piece.pose.quarterTurns);
            var rotatedFacing = Rotate(connector.localFacing, piece.pose.quarterTurns);
            return new ConnectorPose(
                new Vector2(piece.pose.x, piece.pose.z) + rotatedPosition,
                rotatedFacing);
        }

        public static Vector2 Rotate(Vector2 value, int quarterTurns)
        {
            switch (GridPose.NormalizeQuarterTurns(quarterTurns))
            {
                case 1: return new Vector2(value.y, -value.x);
                case 2: return new Vector2(-value.x, -value.y);
                case 3: return new Vector2(-value.y, value.x);
                default: return value;
            }
        }

        public static Vector2Int Rotate(Vector2Int value, int quarterTurns)
        {
            switch (GridPose.NormalizeQuarterTurns(quarterTurns))
            {
                case 1: return new Vector2Int(value.y, -value.x);
                case 2: return new Vector2Int(-value.x, -value.y);
                case 3: return new Vector2Int(-value.y, value.x);
                default: return value;
            }
        }
    }
}
