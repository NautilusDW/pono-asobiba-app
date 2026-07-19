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
                        P("sample5-start", MarblePieceKind.Start, -4, -5, 3),
                        P("sample5-tube-high", MarblePieceKind.ClearTube, -4, -4, 3),
                        P("sample5-clear-curve-high", MarblePieceKind.ClearCurve, -4, -3, 3),
                        P("sample5-high-east-a", MarblePieceKind.Straight, -3, -3, 3, 1),
                        P("sample5-high-east-b", MarblePieceKind.Straight, -2, -3, 3, 1),
                        P("sample5-high-turn", MarblePieceKind.Curve, -1, -3, 3, 1),
                        P("sample5-tornado", MarblePieceKind.Tornado, -1, -4, 0, 2),
                        P("sample5-low-turn-east", MarblePieceKind.Curve, -1, -5, 0, 3),
                        P("sample5-low-east-a", MarblePieceKind.Straight, 0, -5, 0, 1),
                        P("sample5-low-east-b", MarblePieceKind.Straight, 1, -5, 0, 1),
                        P("sample5-low-turn-north", MarblePieceKind.Curve, 2, -5, 0, 2),
                        P("sample5-wave", MarblePieceKind.Wave, 2, -4),
                        P("sample5-tube-low", MarblePieceKind.ClearTube, 2, -3),
                        P("sample5-north", MarblePieceKind.Straight, 2, -2),
                        P("sample5-turn-west", MarblePieceKind.Curve, 2, -1, 0, 1),
                        P("sample5-spinner", MarblePieceKind.Spinner, 1, -1, 0, 3),
                        P("sample5-west", MarblePieceKind.Straight, 0, -1, 0, 3),
                        P("sample5-turn-goal", MarblePieceKind.Curve, -1, -1, 0, 3),
                        P("sample5-goal-a", MarblePieceKind.Straight, -1, 0),
                        P("sample5-goal-b", MarblePieceKind.Straight, -1, 1),
                        P("sample5-goal", MarblePieceKind.Goal, -1, 2))),
                ["sample6"] = new ModeDefinition(
                    "sample6",
                    "エレベーター シティ",
                    "のぼって おりて まちを めぐろう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("sample6-start", MarblePieceKind.Start, -4, -4),
                        P("sample6-tube-low", MarblePieceKind.ClearTube, -4, -3),
                        P("sample6-low-turn", MarblePieceKind.Curve, -4, -2),
                        P("sample6-elevator", MarblePieceKind.Elevator, -3, -2, 0, 1),
                        P("sample6-high-east", MarblePieceKind.Straight, -2, -2, 3, 1),
                        P("sample6-high-turn", MarblePieceKind.Curve, -1, -2, 3, 2),
                        P("sample6-wave-high", MarblePieceKind.Wave, -1, -1, 3),
                        P("sample6-high-north-a", MarblePieceKind.Straight, -1, 0, 3),
                        P("sample6-high-north-b", MarblePieceKind.Straight, -1, 1, 3),
                        P("sample6-high-turn-east", MarblePieceKind.Curve, -1, 2, 3),
                        P("sample6-high-east-a", MarblePieceKind.Straight, 0, 2, 3, 1),
                        P("sample6-high-east-b", MarblePieceKind.Straight, 1, 2, 3, 1),
                        P("sample6-tornado", MarblePieceKind.Tornado, 2, 2, 0, 1),
                        P("sample6-low-turn-south", MarblePieceKind.Curve, 3, 2, 0, 1),
                        P("sample6-low-south", MarblePieceKind.Straight, 3, 1, 0, 2),
                        P("sample6-wave-low", MarblePieceKind.Wave, 3, 0, 0, 2),
                        P("sample6-low-south-end", MarblePieceKind.Straight, 3, -1, 0, 2),
                        P("sample6-low-turn-west", MarblePieceKind.Curve, 3, -2, 0, 2),
                        P("sample6-spinner", MarblePieceKind.Spinner, 2, -2, 0, 3),
                        P("sample6-tube-end", MarblePieceKind.ClearTube, 1, -2, 0, 3),
                        P("sample6-low-west", MarblePieceKind.Straight, 0, -2, 0, 3),
                        P("sample6-goal", MarblePieceKind.Goal, -1, -2, 0, 3))),
                ["starter"] = new ModeDefinition(
                    "starter",
                    "すぐ ころがす",
                    "いろいろな うごきを みてみよう",
                    false,
                    false,
                    allUnlimited,
                    Sample(
                        P("starter-start", MarblePieceKind.Start, -4, -4, 3),
                        P("starter-slope", MarblePieceKind.Slope, -4, -3, 2),
                        P("starter-clear-curve-high", MarblePieceKind.ClearCurve, -4, -2, 2),
                        P("starter-high-east-a", MarblePieceKind.Straight, -3, -2, 2, 1),
                        P("starter-high-east-b", MarblePieceKind.Straight, -2, -2, 2, 1),
                        P("starter-high-east-c", MarblePieceKind.Straight, -1, -2, 2, 1),
                        P("starter-overpass-high", MarblePieceKind.Straight, 0, -2, 2, 1),
                        P("starter-high-east-d", MarblePieceKind.Straight, 1, -2, 2, 1),
                        P("starter-high-turn", MarblePieceKind.ClearCurve, 2, -2, 2, 1),
                        P("starter-steps", MarblePieceKind.Steps, 2, -3, 1, 2),
                        P("starter-low-turn-east", MarblePieceKind.ClearCurve, 2, -4, 1, 3),
                        P("starter-elevator", MarblePieceKind.Elevator, 3, -4, 1, 1),
                        P("starter-sky-turn", MarblePieceKind.ClearCurve, 4, -4, 4, 2),
                        P("starter-tornado", MarblePieceKind.Tornado, 4, -3, 1),
                        P("starter-low-turn-west", MarblePieceKind.ClearCurve, 4, -2, 1, 1),
                        P("starter-low-west-wave", MarblePieceKind.Wave, 3, -2, 1, 3),
                        P("starter-underpass-slope", MarblePieceKind.Slope, 2, -2, 0, 3),
                        P("starter-underpass-mid", MarblePieceKind.Straight, 1, -2, 0, 3),
                        P("starter-underpass-turn", MarblePieceKind.ClearCurve, 0, -2, 0, 3),
                        P("starter-powered-lift", MarblePieceKind.Lift, 0, -1),
                        P("starter-low-north", MarblePieceKind.Straight, 0, 0, 1),
                        P("starter-slope-low", MarblePieceKind.Slope, 0, 1),
                        P("starter-ground-straight", MarblePieceKind.Straight, 0, 2),
                        P("starter-ground-turn", MarblePieceKind.ClearCurve, 0, 3),
                        P("starter-spinner", MarblePieceKind.Spinner, 1, 3, 0, 1),
                        P("starter-ground-east", MarblePieceKind.Straight, 2, 3, 0, 1),
                        P("starter-tube-goal", MarblePieceKind.ClearTube, 3, 3, 0, 1),
                        P("starter-goal", MarblePieceKind.Goal, 4, 3, 0, 1))),
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
