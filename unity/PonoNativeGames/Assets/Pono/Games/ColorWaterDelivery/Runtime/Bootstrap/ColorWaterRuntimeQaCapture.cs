using System;
using System.Collections;
using System.Globalization;
using System.IO;
using Pono.ColorWaterDelivery.Gameplay;
using UnityEngine;

namespace Pono.ColorWaterDelivery.Bootstrap
{
    /// <summary>
    /// Opt-in standalone-player harness for repeatable visual QA. It is dormant
    /// during normal play and never awards progress without real fluid metrics.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ColorWaterRuntimeQaCapture : MonoBehaviour
    {
        private string _outputPath;
        private string _mode;
        private bool _quitAfterCapture;
        private float _captureDelay = 1.2f;
        private float _completeTimeout = 48f;

        public static void AttachIfRequested(GameObject host)
        {
            if (!TryReadArgument("-ponoColorWaterCapture", out var path)
                || string.IsNullOrWhiteSpace(path))
            {
                return;
            }

            var capture = host.AddComponent<ColorWaterRuntimeQaCapture>();
            Application.runInBackground = true;
            capture._outputPath = Path.GetFullPath(path);
            capture._mode = TryReadArgument("-ponoColorWaterCaptureMode", out var mode)
                ? mode.ToLowerInvariant()
                : "start";
            capture._quitAfterCapture = HasArgument("-ponoQuitAfterCapture");
            if (TryReadArgument("-ponoColorWaterCaptureDelay", out var delay)
                && float.TryParse(
                    delay,
                    NumberStyles.Float,
                    CultureInfo.InvariantCulture,
                    out var parsedDelay))
            {
                capture._captureDelay = Mathf.Clamp(parsedDelay, 0f, 8f);
            }
            if (TryReadArgument("-ponoColorWaterCompleteTimeout", out var timeout)
                && float.TryParse(
                    timeout,
                    NumberStyles.Float,
                    CultureInfo.InvariantCulture,
                    out var parsedTimeout))
            {
                capture._completeTimeout = Mathf.Clamp(parsedTimeout, 4f, 90f);
            }
        }

        private IEnumerator Start()
        {
            yield return null;
            var controller = GetComponent<ColorWaterDeliveryController>();
            if (controller == null)
            {
                yield break;
            }

            var readyDeadline = Time.realtimeSinceStartup + 8f;
            while ((controller.Model == null || controller.Fluid == null)
                   && Time.realtimeSinceStartup < readyDeadline)
            {
                yield return null;
            }

            EnsureRunning(controller);

            if (_mode == "mix" || _mode == "complete")
            {
                controller.OnGateTapped("blue_gate");
                yield return WaitKeepingQaActive(controller, 0.18f);
                controller.OnGateTapped("yellow_gate");
                yield return WaitKeepingQaActive(controller, 5f);
            }

            if (_mode == "complete")
            {
                controller.OnGateTapped("goal_gate");
                var deadline = Time.realtimeSinceStartup + _completeTimeout;
                while (controller.Model != null
                       && !controller.Model.IsComplete
                       && Time.realtimeSinceStartup < deadline)
                {
                    EnsureRunning(controller);
                    yield return null;
                }
                yield return WaitKeepingQaActive(controller, 1.6f);
            }
            else if (_mode == "start")
            {
                yield return WaitKeepingQaActive(controller, 3.2f);
            }

            yield return WaitKeepingQaActive(controller, _captureDelay);
            yield return new WaitForEndOfFrame();

            var directory = Path.GetDirectoryName(_outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }
            ScreenCapture.CaptureScreenshot(_outputPath, 1);

            var snapshot = controller.Model?.GetSnapshot();
            var goalMetrics = controller.LastValidGoalMetrics;
            File.WriteAllText(
                Path.ChangeExtension(_outputPath, ".txt"),
                $"backend={controller.Fluid?.BackendLabel ?? "なし"}\n"
                + $"mode={_mode}\n"
                + $"complete={snapshot?.IsComplete ?? false}\n"
                + $"delivered={snapshot?.DeliveredGreenAmount.ToString("0.000", CultureInfo.InvariantCulture) ?? "0"}\n"
                + $"required={snapshot?.RequiredGreenAmount.ToString("0.000", CultureInfo.InvariantCulture) ?? "0"}\n"
                + $"attempts={snapshot?.DeliveryAttemptCount ?? 0}\n"
                + $"wrong={snapshot?.WrongColorDeliveryCount ?? 0}\n"
                + $"metric_blue={goalMetrics.Blue.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"metric_yellow={goalMetrics.Yellow.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"metric_green={goalMetrics.Green.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"metric_coverage={goalMetrics.GreenCoverage.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"max_green={controller.MaximumObservedGreen.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"max_coverage={controller.MaximumObservedGreenCoverage.ToString("0.000", CultureInfo.InvariantCulture)}\n"
                + $"metric_count={controller.ValidGoalMetricCount}\n");

            var fileDeadline = Time.realtimeSinceStartup + 5f;
            while (!File.Exists(_outputPath)
                   && Time.realtimeSinceStartup < fileDeadline)
            {
                yield return null;
            }
            if (_quitAfterCapture)
            {
                Application.Quit();
            }
        }

        private static bool HasArgument(string name)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length; index++)
            {
                if (string.Equals(
                    arguments[index],
                    name,
                    StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private static IEnumerator WaitKeepingQaActive(
            ColorWaterDeliveryController controller,
            float seconds)
        {
            var deadline = Time.realtimeSinceStartup + Mathf.Max(0f, seconds);
            while (Time.realtimeSinceStartup < deadline)
            {
                EnsureRunning(controller);
                yield return null;
            }
        }

        private static void EnsureRunning(ColorWaterDeliveryController controller)
        {
            if (controller != null && controller.IsPaused)
            {
                controller.TogglePause();
            }
        }

        private static bool TryReadArgument(string name, out string value)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length - 1; index++)
            {
                if (string.Equals(
                    arguments[index],
                    name,
                    StringComparison.OrdinalIgnoreCase))
                {
                    value = arguments[index + 1];
                    return true;
                }
            }
            value = string.Empty;
            return false;
        }
    }
}
