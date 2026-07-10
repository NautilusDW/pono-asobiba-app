using System;
using System.Collections.Generic;

namespace Pono.MarbleRun3D.Core
{
    public sealed class SampleCourseDefinition
    {
        private readonly CourseData _course;

        public string Id { get; }
        public string DisplayName { get; }
        public string GuideText { get; }

        public SampleCourseDefinition(string id, string displayName, string guideText, CourseData course)
        {
            Id = id;
            DisplayName = displayName;
            GuideText = guideText;
            _course = course ?? throw new ArgumentNullException(nameof(course));
        }

        public CourseData CreateCourse()
        {
            return _course.Clone();
        }
    }

    public static class SampleCourseCatalog
    {
        private static readonly Dictionary<string, SampleCourseDefinition> ById = Build();

        public static IReadOnlyList<SampleCourseDefinition> All { get; } = new[]
        {
            ById["first"],
            ById["turns"],
            ById["bridge"],
            ById["funnel"]
        };

        public static SampleCourseDefinition Get(string id)
        {
            return !string.IsNullOrEmpty(id) && ById.TryGetValue(id, out var sample)
                ? sample
                : ById["first"];
        }

        private static Dictionary<string, SampleCourseDefinition> Build()
        {
            return new Dictionary<string, SampleCourseDefinition>(StringComparer.Ordinal)
            {
                ["first"] = Make(
                    "first",
                    "はじめての みち",
                    "そのまま ためしてから かえてみよう",
                    P("first-start", MarblePieceKind.Start, 0, -4),
                    P("first-s1", MarblePieceKind.Straight, 0, -3),
                    P("first-s2", MarblePieceKind.Straight, 0, -2),
                    P("first-s3", MarblePieceKind.Straight, 0, -1),
                    P("first-s4", MarblePieceKind.Straight, 0, 0),
                    P("first-s5", MarblePieceKind.Straight, 0, 1),
                    P("first-s6", MarblePieceKind.Straight, 0, 2),
                    P("first-s7", MarblePieceKind.Straight, 0, 3),
                    P("first-goal", MarblePieceKind.Goal, 0, 4)),
                ["turns"] = Make(
                    "turns",
                    "くねくね みち",
                    "カーブを おして みぎに まわしてみよう",
                    P("turns-start", MarblePieceKind.Start, -3, -2),
                    P("turns-c1", MarblePieceKind.Curve, -3, -1),
                    P("turns-s1", MarblePieceKind.Straight, -2, -1, 0, 1),
                    P("turns-s2", MarblePieceKind.Straight, -1, -1, 0, 1),
                    P("turns-s3", MarblePieceKind.Straight, 0, -1, 0, 1),
                    P("turns-s4", MarblePieceKind.Straight, 1, -1, 0, 1),
                    P("turns-c2", MarblePieceKind.Curve, 2, -1, 0, 2),
                    P("turns-s5", MarblePieceKind.Straight, 2, 0),
                    P("turns-s6", MarblePieceKind.Straight, 2, 1),
                    P("turns-c3", MarblePieceKind.Curve, 2, 2),
                    P("turns-goal", MarblePieceKind.Goal, 3, 2, 0, 1)),
                ["bridge"] = Make(
                    "bridge",
                    "そらの はし",
                    "さかを のぼって おりてみよう",
                    P("bridge-start", MarblePieceKind.Start, 0, -4),
                    P("bridge-s1", MarblePieceKind.Straight, 0, -3),
                    P("bridge-up", MarblePieceKind.Slope, 0, -2, 0, 2),
                    P("bridge-s2", MarblePieceKind.Straight, 0, -1, 1),
                    P("bridge-s3", MarblePieceKind.Straight, 0, 0, 1),
                    P("bridge-s4", MarblePieceKind.Straight, 0, 1, 1),
                    P("bridge-down", MarblePieceKind.Slope, 0, 2),
                    P("bridge-s5", MarblePieceKind.Straight, 0, 3),
                    P("bridge-goal", MarblePieceKind.Goal, 0, 4)),
                ["funnel"] = Make(
                    "funnel",
                    "くるくる じょうご",
                    "じょうごを とおる たまを みてみよう",
                    P("funnel-start", MarblePieceKind.Start, 0, -4),
                    P("funnel-s1", MarblePieceKind.Straight, 0, -3),
                    P("funnel-s2", MarblePieceKind.Straight, 0, -2),
                    P("funnel-toy", MarblePieceKind.Funnel, 0, -1),
                    P("funnel-s3", MarblePieceKind.Straight, 0, 0),
                    P("funnel-s4", MarblePieceKind.Straight, 0, 1),
                    P("funnel-s5", MarblePieceKind.Straight, 0, 2),
                    P("funnel-s6", MarblePieceKind.Straight, 0, 3),
                    P("funnel-goal", MarblePieceKind.Goal, 0, 4))
            };
        }

        private static SampleCourseDefinition Make(
            string id,
            string displayName,
            string guideText,
            params PieceRecord[] pieces)
        {
            var course = new CourseData { modeId = "sandbox" };
            course.pieces.AddRange(pieces);
            return new SampleCourseDefinition(id, displayName, guideText, course);
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
