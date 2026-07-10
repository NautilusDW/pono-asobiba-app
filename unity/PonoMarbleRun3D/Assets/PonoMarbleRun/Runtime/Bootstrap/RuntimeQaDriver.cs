using System;
using System.Collections;
using System.Globalization;
using System.IO;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using UnityEngine;

namespace Pono.MarbleRun3D.Bootstrap
{
    /// <summary>
    /// Opt-in built-player QA helper. It is dormant during normal play and is
    /// activated only by -ponoCapture or -ponoQaOut command-line arguments.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RuntimeQaDriver : MonoBehaviour
    {
        private MarbleRunGameController _controller;
        private string _capturePath;
        private string _qaOutputPath;
        private string _state = "menu";
        private float _delay = 0.65f;
        private bool _quit;
        private bool _passed = true;
        private string _details = "";

        public static void AttachIfRequested(GameObject host, MarbleRunGameController controller)
        {
            var hasCapture = TryReadArgument("-ponoCapture", out var capture);
            var hasQa = TryReadArgument("-ponoQaOut", out var qaOut);
            var hasProbe = TryReadArgument("-ponoProbeOut", out var probeOut);
            if (hasProbe) RuntimeInteractionProbe.Attach(host, controller, Path.GetFullPath(probeOut));
            if (!hasCapture && !hasQa) return;
            Application.runInBackground = true;
            controller.SuppressApplicationPauseForQa = true;
            var driver = host.AddComponent<RuntimeQaDriver>();
            driver._controller = controller;
            driver._capturePath = hasCapture ? Path.GetFullPath(capture) : string.Empty;
            driver._qaOutputPath = hasQa ? Path.GetFullPath(qaOut) : string.Empty;
            driver._quit = HasArgument("-ponoQuitAfterCapture") || hasQa;
            if (TryReadArgument("-ponoQaState", out var state)) driver._state = state.ToLowerInvariant();
            if (TryReadArgument("-ponoCaptureDelay", out var delay)
                && float.TryParse(delay, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
            {
                driver._delay = Mathf.Clamp(value, 0f, 4f);
            }
        }

        private IEnumerator Start()
        {
            yield return null;
            yield return null;
            var scenario = RunSelectedScenario();
            while (true)
            {
                object yielded;
                try
                {
                    if (!scenario.MoveNext()) break;
                    yielded = scenario.Current;
                }
                catch (Exception exception)
                {
                    _passed = false;
                    _details = exception.GetType().Name + ": " + exception.Message;
                    Debug.LogException(exception);
                    break;
                }
                yield return yielded;
            }

            if (_delay > 0f) yield return new WaitForSecondsRealtime(_delay);
            yield return new WaitForEndOfFrame();
            WriteQaReport();
            if (!string.IsNullOrEmpty(_capturePath))
            {
                var directory = Path.GetDirectoryName(_capturePath);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                ScreenCapture.CaptureScreenshot(_capturePath, 1);
                var deadline = Time.realtimeSinceStartup + 6f;
                while (!File.Exists(_capturePath) && Time.realtimeSinceStartup < deadline)
                {
                    yield return null;
                }
            }
            if (_quit) Application.Quit(_passed ? 0 : 2);
        }

        private IEnumerator RunSelectedScenario()
        {
            switch (_state)
            {
                case "menu":
                    _controller.ShowMenu();
                    break;
                case "samples":
                    _controller.ShowMenu();
                    _controller.Ui.ShowSampleMenu();
                    break;
                case "sample-edit":
                    _controller.StartMode("sample2");
                    _controller.SelectForQa("sample2-c1");
                    break;
                case "sample-slope":
                    _controller.StartMode("sample3");
                    _controller.SelectForQa("sample3-up");
                    break;
                case "edit":
                    BuildStraightCourse();
                    break;
                case "showcase":
                    BuildShowcase();
                    break;
                case "invalid":
                    BuildStraightCourse();
                    _controller.ShowInvalidGhostForQa();
                    break;
                case "run":
                    BuildStraightCourse();
                    _controller.StartRun();
                    yield return new WaitForSecondsRealtime(1.0f);
                    break;
                case "pause":
                    BuildStraightCourse();
                    _controller.StartRun();
                    yield return new WaitForSecondsRealtime(0.35f);
                    _controller.SetPaused(true);
                    yield return new WaitForSecondsRealtime(0.35f);
                    break;
                case "goal":
                    BuildStraightCourse();
                    _controller.CelebrateForQa();
                    yield return new WaitForSecondsRealtime(0.55f);
                    break;
                case "physical-goal":
                    yield return WaitForPhysicalGoal();
                    break;
                case "journey":
                    yield return RunJourney();
                    break;
            }
        }

        private IEnumerator WaitForPhysicalGoal()
        {
            BuildStraightCourse();
            _controller.StartRun();
            var startedAt = Time.realtimeSinceStartup;
            var deadline = startedAt + 8f;
            while (_controller.State == MarbleRunState.Running && Time.realtimeSinceStartup < deadline)
                yield return null;
            if (_controller.State != MarbleRunState.Celebrating)
                throw new InvalidOperationException("Connected flat course did not physically reach the goal.");
            _details = "physical_goal_seconds="
                + (Time.realtimeSinceStartup - startedAt).ToString("0.000", CultureInfo.InvariantCulture);
        }

        private void BuildStraightCourse()
        {
            _controller.StartMode("sandbox");
            for (var z = -3; z <= 3; z++)
            {
                if (!_controller.PlaceForQa(MarblePieceKind.Straight, new GridPose(0, z, 0, 0)))
                {
                    throw new InvalidOperationException("QA straight course placement failed at z=" + z);
                }
            }
        }

        private void BuildShowcase()
        {
            _controller.StartMode("sandbox");
            Place(MarblePieceKind.Straight, -4, -2, 0);
            Place(MarblePieceKind.Curve, -2, -2, 0);
            Place(MarblePieceKind.Slope, 0, -2, 0);
            Place(MarblePieceKind.Splitter, 2, -2, 0);
            Place(MarblePieceKind.Tunnel, 4, -2, 0);
            Place(MarblePieceKind.Funnel, -4, 1, 0);
            Place(MarblePieceKind.Seesaw, -2, 1, 0);
            Place(MarblePieceKind.Domino, 2, 1, 0);
        }

        private void Place(MarblePieceKind kind, int x, int z, int turns)
        {
            if (!_controller.PlaceForQa(kind, new GridPose(x, z, 0, turns)))
                throw new InvalidOperationException("QA showcase placement failed: " + kind);
        }

        private IEnumerator RunJourney()
        {
            BuildStraightCourse();
            var originalCount = _controller.PieceCount;
            _controller.SaveCourse();
            _controller.StartRun();
            yield return new WaitForSecondsRealtime(0.45f);
            var beforePause = _controller.MarbleBody.position;
            _controller.SetPaused(true);
            yield return new WaitForSecondsRealtime(0.45f);
            var afterPause = _controller.MarbleBody.position;
            if (Vector3.Distance(beforePause, afterPause) > 0.0001f)
            {
                throw new InvalidOperationException("Marble moved while paused.");
            }
            _controller.SetPaused(false);
            _controller.ResetMarble();
            yield return new WaitForSecondsRealtime(0.25f);
            _controller.CelebrateForQa();
            yield return new WaitForSecondsRealtime(0.25f);
            _details = "pieces=" + originalCount + "; pause_delta="
                + Vector3.Distance(beforePause, afterPause).ToString("0.000000", CultureInfo.InvariantCulture);
        }

        private void WriteQaReport()
        {
            if (string.IsNullOrEmpty(_qaOutputPath)) return;
            var directory = Path.GetDirectoryName(_qaOutputPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            var json = "{\n"
                + "  \"passed\": " + (_passed ? "true" : "false") + ",\n"
                + "  \"state\": \"" + Escape(_state) + "\",\n"
                + "  \"screen\": \"" + Screen.width + "x" + Screen.height + "\",\n"
                + "  \"game_state\": \"" + _controller.State + "\",\n"
                + "  \"piece_count\": " + _controller.PieceCount + ",\n"
                + "  \"details\": \"" + Escape(_details) + "\"\n"
                + "}\n";
            File.WriteAllText(_qaOutputPath, json);
        }

        private static bool HasArgument(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static bool TryReadArgument(string name, out string value)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                {
                    value = args[i + 1];
                    return true;
                }
            }
            value = string.Empty;
            return false;
        }

        private static string Escape(string value)
        {
            return (value ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n");
        }
    }

    /// <summary>
    /// Opt-in telemetry for real OS-pointer smoke tests. It writes only when
    /// -ponoProbeOut is supplied and is absent from normal play behaviour.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RuntimeInteractionProbe : MonoBehaviour
    {
        private MarbleRunGameController _controller;
        private string _path;
        private string _lastPayload;
        private float _nextWrite;

        public static void Attach(GameObject host, MarbleRunGameController controller, string path)
        {
            var probe = host.AddComponent<RuntimeInteractionProbe>();
            probe._controller = controller;
            probe._path = path;
        }

        private void Update()
        {
            if (Time.unscaledTime < _nextWrite) return;
            _nextWrite = Time.unscaledTime + 0.15f;
            var mode = _controller.CurrentMode != null ? _controller.CurrentMode.Id : string.Empty;
            var payload = "{\n"
                + "  \"state\": \"" + _controller.State + "\",\n"
                + "  \"mode\": \"" + mode + "\",\n"
                + "  \"piece_count\": " + _controller.PieceCount + ",\n"
                + "  \"selected\": \"" + _controller.SelectedPieceId + "\",\n"
                + "  \"status\": \"" + Escape(_controller.Ui != null ? _controller.Ui.StatusText : string.Empty) + "\"\n"
                + "}\n";
            if (payload == _lastPayload) return;
            _lastPayload = payload;
            var directory = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(_path, payload);
        }

        private static string Escape(string value)
        {
            return (value ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n");
        }
    }
}
