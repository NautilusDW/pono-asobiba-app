using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Pono.MarbleRun3D.Core
{
    public sealed class CourseHistory
    {
        private readonly int _capacity;
        private readonly List<CourseData> _snapshots = new List<CourseData>();

        public CourseHistory(int capacity = 50)
        {
            _capacity = Mathf.Max(1, capacity);
        }

        public int Count => _snapshots.Count;

        public void Capture(CourseData course)
        {
            if (course == null) throw new ArgumentNullException(nameof(course));
            _snapshots.Add(course.Clone());
            if (_snapshots.Count > _capacity)
            {
                _snapshots.RemoveAt(0);
            }
        }

        public bool TryUndo(out CourseData restored)
        {
            if (_snapshots.Count == 0)
            {
                restored = null;
                return false;
            }
            var index = _snapshots.Count - 1;
            restored = _snapshots[index].Clone();
            _snapshots.RemoveAt(index);
            return true;
        }

        public void Clear()
        {
            _snapshots.Clear();
        }
    }

    public static class CourseStorage
    {
        public static string Encode(CourseData course, bool pretty = false)
        {
            if (course == null) throw new ArgumentNullException(nameof(course));
            return JsonUtility.ToJson(course, pretty);
        }

        public static bool TryDecode(string json, out CourseData course, out string error)
        {
            course = null;
            error = string.Empty;
            if (string.IsNullOrWhiteSpace(json))
            {
                error = "からっぽだよ";
                return false;
            }
            try
            {
                course = JsonUtility.FromJson<CourseData>(json);
            }
            catch (Exception)
            {
                error = "よみこめなかったよ";
                return false;
            }
            if (course == null
                || course.schemaVersion != CourseData.CurrentSchemaVersion
                || course.pieces == null
                || string.IsNullOrWhiteSpace(course.modeId))
            {
                course = null;
                error = "よみこめなかったよ";
                return false;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            for (var i = course.pieces.Count - 1; i >= 0; i--)
            {
                var piece = course.pieces[i];
                if (piece == null
                    || string.IsNullOrWhiteSpace(piece.id)
                    || !Enum.IsDefined(typeof(MarblePieceKind), piece.kind)
                    || !ids.Add(piece.id)
                    || piece.pose.x < PlacementSolver.MinX
                    || piece.pose.x > PlacementSolver.MaxX
                    || piece.pose.z < PlacementSolver.MinZ
                    || piece.pose.z > PlacementSolver.MaxZ
                    || piece.pose.level < PlacementSolver.MinLevel
                    || piece.pose.level > PlacementSolver.MaxLevel
                    || !PlacementSolver.Validate(
                        piece.kind,
                        piece.pose,
                        course.pieces,
                        null,
                        piece.id).IsValid)
                {
                    course = null;
                    error = "よみこめなかったよ";
                    return false;
                }
                piece.pose.quarterTurns = GridPose.NormalizeQuarterTurns(piece.pose.quarterTurns);
            }
            return true;
        }

        public static bool TryDecodeForMode(
            string json,
            string expectedModeId,
            out CourseData course,
            out string error)
        {
            if (!TryDecode(json, out course, out error)) return false;
            if (string.Equals(course.modeId, expectedModeId, StringComparison.Ordinal)) return true;
            course = null;
            error = "よみこめなかったよ";
            return false;
        }

        public static string GetSavePath(string modeId)
        {
            var safeName = string.IsNullOrWhiteSpace(modeId) ? "sandbox" : modeId;
            foreach (var invalid in Path.GetInvalidFileNameChars())
            {
                safeName = safeName.Replace(invalid, '_');
            }
            return Path.Combine(Application.persistentDataPath, "MarbleRunCourses", safeName + ".json");
        }

        public static bool Save(CourseData course, out string error)
        {
            error = string.Empty;
            try
            {
                var path = GetSavePath(course.modeId);
                var directory = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                var temporaryPath = path + ".tmp";
                File.WriteAllText(temporaryPath, Encode(course, true));
                if (File.Exists(path)) File.Delete(path);
                File.Move(temporaryPath, path);
                return true;
            }
            catch (Exception)
            {
                error = "ほぞん できなかったよ";
                return false;
            }
        }

        public static bool Load(string modeId, out CourseData course, out string error)
        {
            var path = GetSavePath(modeId);
            if (!File.Exists(path))
            {
                course = null;
                error = "ほぞんが ないよ";
                return false;
            }
            try
            {
                return TryDecodeForMode(File.ReadAllText(path), modeId, out course, out error);
            }
            catch (Exception)
            {
                course = null;
                error = "よみこめなかったよ";
                return false;
            }
        }
    }
}
