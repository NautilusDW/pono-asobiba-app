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
        public static ModeDefinition Sandbox => Modes["sandbox"];

        public static IReadOnlyList<ModeDefinition> Challenges { get; } = new[]
        {
            Modes["challenge1"],
            Modes["challenge2"],
            Modes["challenge3"]
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
                        [MarblePieceKind.Slope] = 2
                    },
                    Initial("challenge1", new GridPose(-3, -2, 0, 0), new GridPose(3, 2, 0, 1))),
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
                        [MarblePieceKind.Seesaw] = 1
                    },
                    Initial("challenge2", new GridPose(0, -4, 0, 0), new GridPose(0, 4, 0, 0))),
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
                        [MarblePieceKind.Domino] = 1
                    },
                    Initial("challenge3", new GridPose(0, -4, 0, 0), new GridPose(0, 4, 0, 0))),
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
    }
}
