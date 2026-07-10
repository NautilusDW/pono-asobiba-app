using System;
using System.Collections.Generic;

namespace Pono.MarbleRun3D.Core
{
    public sealed class ModeDefinition
    {
        public string Id { get; }
        public string DisplayName { get; }
        public string GuideText { get; }
        public bool IsTutorial { get; }
        public bool IsChallenge { get; }
        public IReadOnlyDictionary<MarblePieceKind, int> Inventory { get; }
        public IReadOnlyList<PieceRecord> InitialPieces { get; }

        public ModeDefinition(
            string id,
            string displayName,
            string guideText,
            bool isTutorial,
            bool isChallenge,
            Dictionary<MarblePieceKind, int> inventory,
            List<PieceRecord> initialPieces)
        {
            Id = id;
            DisplayName = displayName;
            GuideText = guideText;
            IsTutorial = isTutorial;
            IsChallenge = isChallenge;
            Inventory = inventory;
            InitialPieces = initialPieces;
        }

        public int LimitFor(MarblePieceKind kind)
        {
            return Inventory.TryGetValue(kind, out var limit) ? limit : 0;
        }

        public int Remaining(MarblePieceKind kind, IReadOnlyList<PieceRecord> pieces, string ignoreId = null)
        {
            var limit = LimitFor(kind);
            if (limit < 0) return -1;
            var used = 0;
            for (var i = 0; i < pieces.Count; i++)
            {
                if (pieces[i].kind == kind
                    && !string.Equals(pieces[i].id, ignoreId, StringComparison.Ordinal))
                {
                    used++;
                }
            }
            return Math.Max(0, limit - used);
        }

        public bool CanAdd(MarblePieceKind kind, IReadOnlyList<PieceRecord> pieces, string ignoreId = null)
        {
            var remaining = Remaining(kind, pieces, ignoreId);
            return remaining < 0 || remaining > 0;
        }

        public CourseData CreateInitialCourse()
        {
            var data = new CourseData { modeId = Id };
            for (var i = 0; i < InitialPieces.Count; i++)
            {
                data.pieces.Add(InitialPieces[i].Clone());
            }
            return data;
        }

        public bool IsCourseGoalReady(CourseData course)
        {
            if (course == null || course.pieces == null) return false;
            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
            {
                var limit = LimitFor(kind);
                if (limit < 0) continue;
                var used = 0;
                for (var i = 0; i < course.pieces.Count; i++)
                {
                    if (course.pieces[i].kind == kind) used++;
                }
                if (used > limit) return false;
            }
            return PlacementSolver.HasStartToGoalGraphPath(course.pieces);
        }
    }

    public static class ChallengeCatalog
    {
        private static readonly Dictionary<string, ModeDefinition> Modes = BuildModes();

        public static ModeDefinition Tutorial => Modes["tutorial"];
        public static ModeDefinition Starter => Modes["starter"];
        public static ModeDefinition Sandbox => Modes["sandbox"];

        public static IReadOnlyList<ModeDefinition> Challenges { get; } = new[]
        {
            Modes["challenge1"],
            Modes["challenge2"],
            Modes["challenge3"]
        };

        public static IReadOnlyList<ModeDefinition> Samples { get; } = new[]
        {
            Modes["sample1"],
            Modes["sample2"],
            Modes["sample3"],
            Modes["sample4"],
            Modes["sample5"],
            Modes["sample6"]
        };

        public static ModeDefinition Get(string id)
        {
            return Modes.TryGetValue(id, out var mode) ? mode : Sandbox;
        }

        private static Dictionary<string, ModeDefinition> BuildModes()
        {
            var allUnlimited = new Dictionary<MarblePieceKind, int>();
            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
            {
                allUnlimited[kind] = kind == MarblePieceKind.Start || kind == MarblePieceKind.Goal ? 1 : -1;
            }

            return new Dictionary<string, ModeDefinition>(StringComparer.Ordinal)
            {
                ["tutorial"] = new ModeDefinition(
                    "tutorial",
                    "あそびかた",
                    "ぶひんを ひっぱって つなげよう",
                    true,
                    false,
                    new Dictionary<MarblePieceKind, int>
                    {
                        [MarblePieceKind.Start] = 1,
                        [MarblePieceKind.Goal] = 1,
                        [MarblePieceKind.Straight] = 6,
                        [MarblePieceKind.Curve] = 3,
                        [MarblePieceKind.Slope] = 2
                    },
                    Initial("tutorial", new GridPose(0, -3, 0, 0), new GridPose(0, 3, 0, 0))),
                ["challenge1"] = new ModeDefinition(
                    "challenge1",
                    "チャレンジ １",
                    "すきな みちで ゴールへ つなごう",
                    false,
                    true,
                    new Dictionary<MarblePieceKind, int>
                    {
                        [MarblePieceKind.Start] = 1,
                        [MarblePieceKind.Goal] = 1,
                        [MarblePieceKind.Straight] = 8,
                        [MarblePieceKind.Curve] = 5,
                        [MarblePieceKind.Slope] = 2,
                        [MarblePieceKind.Steps] = 2,
                        [MarblePieceKind.Lift] = 1,
                        [MarblePieceKind.Tornado] = 1,
                        [MarblePieceKind.Elevator] = 1,
                        [MarblePieceKind.ClearTube] = 3,
                        [MarblePieceKind.ClearCurve] = 2,
                        [MarblePieceKind.Wave] = 2,
                        [MarblePieceKind.Spinner] = 1
                    },
                    Initial("challenge1", new GridPose(0, -4, 1, 0), new GridPose(0, 4, 0, 0))),
                ["challenge2"] = new ModeDefinition(
                    "challenge2",
                    "チャレンジ ２",
                    "トンネルや シーソーを つかってみよう",
                    false,
                    true,
                    new Dictionary<MarblePieceKind, int>
                    {
                        [MarblePieceKind.Start] = 1,
                        [MarblePieceKind.Goal] = 1,
                        [MarblePieceKind.Straight] = 7,
                        [MarblePieceKind.Curve] = 5,
                        [MarblePieceKind.Slope] = 2,
                        [MarblePieceKind.Tunnel] = 2,
                        [MarblePieceKind.Seesaw] = 1,
                        [MarblePieceKind.Helix] = 1,
                        [MarblePieceKind.Steps] = 2,
                        [MarblePieceKind.Lift] = 1,
                        [MarblePieceKind.Tornado] = 1,
                        [MarblePieceKind.Elevator] = 1,
                        [MarblePieceKind.ClearTube] = 3,
                        [MarblePieceKind.ClearCurve] = 2,
                        [MarblePieceKind.Wave] = 2,
                        [MarblePieceKind.Spinner] = 2
                    },
                    Initial("challenge2", new GridPose(0, -4, 2, 0), new GridPose(0, 4, 0, 0))),
                ["challenge3"] = new ModeDefinition(
                    "challenge3",
                    "チャレンジ ３",
                    "ふたつの みちを ためしてみよう",
                    false,
                    true,
                    new Dictionary<MarblePieceKind, int>
                    {
                        [MarblePieceKind.Start] = 1,
                        [MarblePieceKind.Goal] = 1,
                        [MarblePieceKind.Straight] = 8,
                        [MarblePieceKind.Curve] = 6,
                        [MarblePieceKind.Slope] = 2,
                        [MarblePieceKind.Splitter] = 2,
                        [MarblePieceKind.Funnel] = 1,
                        [MarblePieceKind.Domino] = 1,
                        [MarblePieceKind.Helix] = 1,
                        [MarblePieceKind.Steps] = 2,
                        [MarblePieceKind.Lift] = 2,
                        [MarblePieceKind.Tornado] = 1,
                        [MarblePieceKind.Elevator] = 2,
                        [MarblePieceKind.ClearTube] = 4,
                        [MarblePieceKind.ClearCurve] = 3,
                        [MarblePieceKind.Wave] = 2,
                        [MarblePieceKind.Spinner] = 2
                    },
                    Initial("challenge3", new GridPose(0, -4, 3, 0), new GridPose(0, 4, 0, 0))),
                ["sample1"] = new ModeDefinition(
                    "sample1",
                    "はじめての みち",
                    "そのまま ためしてから かえてみよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample1-start", MarblePieceKind.Start, 0, -4),
                        P("sample1-s1", MarblePieceKind.Straight, 0, -3),
                        P("sample1-s2", MarblePieceKind.Straight, 0, -2),
                        P("sample1-s3", MarblePieceKind.Straight, 0, -1),
                        P("sample1-s4", MarblePieceKind.Straight, 0, 0),
                        P("sample1-s5", MarblePieceKind.Straight, 0, 1),
                        P("sample1-s6", MarblePieceKind.Straight, 0, 2),
                        P("sample1-s7", MarblePieceKind.Straight, 0, 3),
                        P("sample1-goal", MarblePieceKind.Goal, 0, 4))),
                ["sample2"] = new ModeDefinition(
                    "sample2",
                    "にじいろ タワー",
                    "たかい ところから ぐるぐる おりよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample2-start", MarblePieceKind.Start, 0, -3, 2),
                        P("sample2-high", MarblePieceKind.Straight, 0, -2, 2),
                        P("sample2-helix", MarblePieceKind.Helix, 0, -1),
                        P("sample2-low1", MarblePieceKind.Straight, 0, 0),
                        P("sample2-low2", MarblePieceKind.Straight, 0, 1),
                        P("sample2-goal", MarblePieceKind.Goal, 0, 2))),
                ["sample3"] = new ModeDefinition(
                    "sample3",
                    "そらの まよいみち",
                    "くねくね まがって かいだんを おりよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample3-start", MarblePieceKind.Start, -3, -3, 2),
                        P("sample3-high", MarblePieceKind.Straight, -3, -2, 2),
                        P("sample3-step1", MarblePieceKind.Steps, -3, -1, 1),
                        P("sample3-c1", MarblePieceKind.Curve, -3, 0, 1),
                        P("sample3-x1", MarblePieceKind.Straight, -2, 0, 1, 1),
                        P("sample3-x2", MarblePieceKind.Straight, -1, 0, 1, 1),
                        P("sample3-c2", MarblePieceKind.Curve, 0, 0, 1, 2),
                        P("sample3-z1", MarblePieceKind.Straight, 0, 1, 1),
                        P("sample3-step2", MarblePieceKind.Steps, 0, 2),
                        P("sample3-low", MarblePieceKind.Straight, 0, 3),
                        P("sample3-goal", MarblePieceKind.Goal, 0, 4))),
                ["sample4"] = new ModeDefinition(
                    "sample4",
                    "のぼって おりて",
                    "ぐるぐる おりて もういちど のぼろう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample4-start", MarblePieceKind.Start, 0, -5, 2),
                        P("sample4-high", MarblePieceKind.Straight, 0, -4, 2),
                        P("sample4-helix", MarblePieceKind.Helix, 0, -3),
                        P("sample4-low1", MarblePieceKind.Straight, 0, -2),
                        P("sample4-lift", MarblePieceKind.Lift, 0, -1),
                        P("sample4-high2", MarblePieceKind.Straight, 0, 0, 1),
                        P("sample4-step", MarblePieceKind.Steps, 0, 1),
                        P("sample4-low2", MarblePieceKind.Straight, 0, 2),
                        P("sample4-goal", MarblePieceKind.Goal, 0, 3))),
                ["sample5"] = new ModeDefinition(
                    "sample5",
                    "トルネード タワー",
                    "たかい ところから トルネードを おりよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample5-start", MarblePieceKind.Start, 0, -5, 3),
                        P("sample5-tube-high", MarblePieceKind.ClearTube, 0, -4, 3),
                        P("sample5-tornado", MarblePieceKind.Tornado, 0, -3),
                        P("sample5-wave", MarblePieceKind.Wave, 0, -2),
                        P("sample5-spinner", MarblePieceKind.Spinner, 0, -1),
                        P("sample5-tube-low", MarblePieceKind.ClearTube, 0, 0),
                        P("sample5-goal", MarblePieceKind.Goal, 0, 1))),
                ["sample6"] = new ModeDefinition(
                    "sample6",
                    "エレベーター シティ",
                    "のぼって おりて まちを めぐろう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample6-start", MarblePieceKind.Start, 0, -5),
                        P("sample6-tube-low", MarblePieceKind.ClearTube, 0, -4),
                        P("sample6-elevator", MarblePieceKind.Elevator, 0, -3),
                        P("sample6-high", MarblePieceKind.Straight, 0, -2, 3),
                        P("sample6-wave", MarblePieceKind.Wave, 0, -1, 3),
                        P("sample6-tube-high", MarblePieceKind.ClearTube, 0, 0, 3),
                        P("sample6-tornado", MarblePieceKind.Tornado, 0, 1),
                        P("sample6-spinner", MarblePieceKind.Spinner, 0, 2),
                        P("sample6-tube-end", MarblePieceKind.ClearTube, 0, 3),
                        P("sample6-goal", MarblePieceKind.Goal, 0, 4))),
                ["starter"] = new ModeDefinition(
                    "starter",
                    "すぐ ころがす",
                    "いろいろな うごきを みてみよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("starter-start", MarblePieceKind.Start, 0, -5),
                        P("starter-tube-low", MarblePieceKind.ClearTube, 0, -4),
                        P("starter-elevator", MarblePieceKind.Elevator, 0, -3),
                        P("starter-wave-high", MarblePieceKind.Wave, 0, -2, 3),
                        P("starter-curve-high", MarblePieceKind.ClearCurve, 0, -1, 3),
                        P("starter-tube-high", MarblePieceKind.ClearTube, 1, -1, 3, 1),
                        P("starter-tornado", MarblePieceKind.Tornado, 2, -1, 0, 1),
                        P("starter-spinner", MarblePieceKind.Spinner, 3, -1, 0, 1),
                        P("starter-curve-low", MarblePieceKind.ClearCurve, 4, -1, 0, 1),
                        P("starter-wave-low", MarblePieceKind.Wave, 4, -2, 0, 0),
                        P("starter-goal", MarblePieceKind.Goal, 4, -3, 0, 2))),
                ["sandbox"] = new ModeDefinition(
                    "sandbox",
                    "じゆうに つくる",
                    "すきな ぶひんで つくってみよう",
                    false,
                    false,
                    allUnlimited,
                    Initial("sandbox", new GridPose(0, -4, 0, 0), new GridPose(0, 4, 0, 0)))
            };
        }

        private static List<PieceRecord> Initial(string prefix, GridPose start, GridPose goal)
        {
            return new List<PieceRecord>
            {
                new PieceRecord
                {
                    id = prefix + "-start",
                    kind = MarblePieceKind.Start,
                    pose = start,
                    locked = prefix != "sandbox"
                },
                new PieceRecord
                {
                    id = prefix + "-goal",
                    kind = MarblePieceKind.Goal,
                    pose = goal,
                    locked = prefix != "sandbox"
                }
            };
        }

        private static List<PieceRecord> Sample(params PieceRecord[] pieces)
        {
            return new List<PieceRecord>(pieces);
        }

        private static PieceRecord P(
            string id,
            MarblePieceKind kind,
            int x,
            int z,
            int level = 0,
            int turns = 0)
        {
            return new PieceRecord
            {
                id = id,
                kind = kind,
                pose = new GridPose(x, z, level, turns),
                locked = false
            };
        }
    }
}
