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
        Domino = 9,
        Helix = 10,
        Steps = 11,
        Lift = 12,
        Tornado = 13,
        Elevator = 14,
        ClearTube = 15,
        ClearCurve = 16,
        Wave = 17,
        Spinner = 18
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
        public const int CurrentSchemaVersion = 2;
        public const int DefaultMarbleCount = 6;
        public const int MinimumMarbleCount = 1;
        public const int MaximumMarbleCount = 8;

        public int schemaVersion = CurrentSchemaVersion;
        public string modeId = "sandbox";
        public int marbleCount = DefaultMarbleCount;
        public List<PieceRecord> pieces = new List<PieceRecord>();

        public CourseData Clone()
        {
            var clone = new CourseData
            {
                schemaVersion = schemaVersion,
                modeId = modeId,
                marbleCount = marbleCount,
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
        public readonly int localLevelOffset;

        public ConnectorSpec(float x, float z, int facingX, int facingZ, int levelOffset = 0)
        {
            localCellPosition = new Vector2(x, z);
            localFacing = new Vector2Int(facingX, facingZ);
            localLevelOffset = levelOffset;
        }
    }

    public readonly struct ConnectorPose
    {
        public readonly Vector2 cellPosition;
        public readonly Vector2Int facing;
        public readonly int level;

        public ConnectorPose(Vector2 cellPosition, Vector2Int facing, int level)
        {
            this.cellPosition = cellPosition;
            this.facing = facing;
            this.level = level;
        }
    }

    public readonly struct OccupancySpec
    {
        public readonly int localX;
        public readonly int localZ;
        public readonly int localLevelOffset;

        public OccupancySpec(int localX, int localZ, int localLevelOffset = 0)
        {
            this.localX = localX;
            this.localZ = localZ;
            this.localLevelOffset = localLevelOffset;
        }
    }

    public readonly struct OccupancyPose : IEquatable<OccupancyPose>
    {
        public readonly int x;
        public readonly int z;
        public readonly int level;

        public OccupancyPose(int x, int z, int level)
        {
            this.x = x;
            this.z = z;
            this.level = level;
        }

        public bool Equals(OccupancyPose other)
        {
            return x == other.x && z == other.z && level == other.level;
        }

        public override bool Equals(object obj)
        {
            return obj is OccupancyPose other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(x, z, level);
        }
    }

    public sealed class PartSpec
    {
        public MarblePieceKind Kind { get; }
        public string DisplayName { get; }
        public Color Accent { get; }
        public IReadOnlyList<ConnectorSpec> Connectors { get; }
        public IReadOnlyList<OccupancySpec> Occupancy { get; }

        public PartSpec(
            MarblePieceKind kind,
            string displayName,
            Color accent,
            params ConnectorSpec[] connectors)
            : this(
                kind,
                displayName,
                accent,
                new[] { new OccupancySpec(0, 0) },
                connectors)
        {
        }

        public PartSpec(
            MarblePieceKind kind,
            string displayName,
            Color accent,
            OccupancySpec[] occupancy,
            params ConnectorSpec[] connectors)
        {
            Kind = kind;
            DisplayName = displayName;
            Accent = accent;
            Connectors = connectors ?? Array.Empty<ConnectorSpec>();
            Occupancy = occupancy == null || occupancy.Length == 0
                ? new[] { new OccupancySpec(0, 0) }
                : occupancy;
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
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Goal] = new PartSpec(
                    MarblePieceKind.Goal,
                    "ゴール",
                    new Color(1f, 0.69f, 0.26f),
                    OccupiesLevels(0, 1),
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
                    "さかみち",
                    new Color(0.77f, 0.62f, 0.94f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1, 1),
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
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Funnel] = new PartSpec(
                    MarblePieceKind.Funnel,
                    "じょうご",
                    new Color(0.96f, 0.53f, 0.72f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Seesaw] = new PartSpec(
                    MarblePieceKind.Seesaw,
                    "シーソー",
                    new Color(0.48f, 0.82f, 0.38f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Domino] = new PartSpec(
                    MarblePieceKind.Domino,
                    "ドミノ",
                    new Color(0.95f, 0.40f, 0.33f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Helix] = new PartSpec(
                    MarblePieceKind.Helix,
                    "ぐるぐる",
                    new Color(0.97f, 0.57f, 0.22f),
                    OccupiesLevels(0, 1, 2),
                    new ConnectorSpec(0f, -0.5f, 0, -1, 2),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Steps] = new PartSpec(
                    MarblePieceKind.Steps,
                    "かいだん",
                    new Color(0.40f, 0.75f, 0.93f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1, 1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Lift] = new PartSpec(
                    MarblePieceKind.Lift,
                    "のぼる みち",
                    new Color(0.50f, 0.82f, 0.43f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1, 1)),
                [MarblePieceKind.Tornado] = new PartSpec(
                    MarblePieceKind.Tornado,
                    "トルネード",
                    new Color(0.98f, 0.34f, 0.62f),
                    OccupiesLevels(0, 1, 2, 3),
                    new ConnectorSpec(0f, -0.5f, 0, -1, 3),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Elevator] = new PartSpec(
                    MarblePieceKind.Elevator,
                    "エレベーター",
                    new Color(0.38f, 0.76f, 0.96f),
                    OccupiesLevels(0, 1, 2, 3),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1, 3)),
                [MarblePieceKind.ClearTube] = new PartSpec(
                    MarblePieceKind.ClearTube,
                    "すけすけ つつ",
                    new Color(0.48f, 0.92f, 0.94f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.ClearCurve] = new PartSpec(
                    MarblePieceKind.ClearCurve,
                    "すけすけ カーブ",
                    new Color(0.58f, 0.84f, 1f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0.5f, 0f, 1, 0)),
                [MarblePieceKind.Wave] = new PartSpec(
                    MarblePieceKind.Wave,
                    "なみなみ",
                    new Color(0.74f, 0.48f, 0.96f),
                    OccupiesLevels(0, 1),
                    new ConnectorSpec(0f, -0.5f, 0, -1),
                    new ConnectorSpec(0f, 0.5f, 0, 1)),
                [MarblePieceKind.Spinner] = new PartSpec(
                    MarblePieceKind.Spinner,
                    "くるくる はね",
                    new Color(1f, 0.76f, 0.22f),
                    OccupiesLevels(0, 1),
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
                rotatedFacing,
                piece.pose.level + connector.localLevelOffset);
        }

        public static IReadOnlyList<OccupancyPose> GetWorldOccupancy(PieceRecord piece)
        {
            if (piece == null) throw new ArgumentNullException(nameof(piece));
            var occupancy = Specs[piece.kind].Occupancy;
            var world = new OccupancyPose[occupancy.Count];
            for (var i = 0; i < occupancy.Count; i++)
            {
                world[i] = GetWorldOccupancy(piece.pose, occupancy[i]);
            }
            return world;
        }

        public static OccupancyPose GetWorldOccupancy(GridPose pose, OccupancySpec local)
        {
            var rotated = Rotate(new Vector2Int(local.localX, local.localZ), pose.quarterTurns);
            return new OccupancyPose(
                pose.x + rotated.x,
                pose.z + rotated.y,
                pose.level + local.localLevelOffset);
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

        private static OccupancySpec[] OccupiesLevels(params int[] levels)
        {
            var result = new OccupancySpec[levels.Length];
            for (var i = 0; i < levels.Length; i++)
            {
                result[i] = new OccupancySpec(0, 0, levels[i]);
            }
            return result;
        }
    }
}
