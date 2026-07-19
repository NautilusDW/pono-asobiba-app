using System;
using System.Collections;
using System.Globalization;
using System.IO;
using Pono.HideSeek.Core;
using Pono.HideSeekCreatures.Gameplay;
using Pono.HideSeekCreatures.Rendering;
using UnityEngine;

namespace Pono.HideSeekCreatures.Bootstrap
{
    /// <summary>
    /// Opt-in player screenshot harness used by command-line visual QA. It is
    /// dormant unless -ponoCapture is provided and does not alter normal play.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RuntimeQaCapture : MonoBehaviour
    {
        private string _outputPath;
        private string _mode;
        private bool _quitAfterCapture;
        private float _captureDelay = 0.45f;

        public static void AttachIfRequested(GameObject host)
        {
            if (!TryReadArgument("-ponoCapture", out var path) || string.IsNullOrWhiteSpace(path))
            {
                return;
            }

            var capture = host.AddComponent<RuntimeQaCapture>();
            capture._outputPath = Path.GetFullPath(path);
            capture._mode = TryReadArgument("-ponoCaptureMode", out var mode)
                ? mode.ToLowerInvariant()
                : "start";
            capture._quitAfterCapture = HasArgument("-ponoQuitAfterCapture");
            if (TryReadArgument("-ponoCaptureDelay", out var delay)
                && float.TryParse(delay, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedDelay))
            {
                capture._captureDelay = Mathf.Clamp(parsedDelay, 0f, 3f);
            }
        }

        private IEnumerator Start()
        {
            yield return null;
            var controller = GetComponent<HideSeekGameController>();
            if (controller == null)
            {
                yield break;
            }

            if (_mode == "mid")
            {
                yield return WaitForState(controller, HideSeekStageState.Exploring, 5f);
                yield return PaintQaStroke(controller);
                yield return new WaitForSecondsRealtime(_captureDelay);
            }
            else if (_mode == "complete")
            {
                yield return WaitForState(controller, HideSeekStageState.Exploring, 5f);
                RevealEverything(controller.RevealMask);
                yield return WaitForState(controller, HideSeekStageState.Complete, 12f);
                yield return new WaitForSecondsRealtime(0.25f);
            }
            else
            {
                yield return new WaitForSecondsRealtime(3.2f);
            }

            yield return new WaitForEndOfFrame();
            var directory = Path.GetDirectoryName(_outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }
            ScreenCapture.CaptureScreenshot(_outputPath, 1);

            var ink = controller.GetComponentInChildren<FluidInkPresenter>(true);
            File.WriteAllText(
                Path.ChangeExtension(_outputPath, ".txt"),
                $"backend={ink?.BackendLabel ?? "なし"}\nmode={_mode}\ndelay={_captureDelay.ToString("0.00", CultureInfo.InvariantCulture)}\n");

            var deadline = Time.realtimeSinceStartup + 4f;
            while (!File.Exists(_outputPath) && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
            if (_quitAfterCapture)
            {
                Application.Quit();
            }
        }

        private static IEnumerator PaintQaStroke(HideSeekGameController controller)
        {
            var ink = controller.GetComponentInChildren<FluidInkPresenter>(true);
            var previous = new Vector2(0.10f, 0.68f);
            for (var index = 0; index < 34; index++)
            {
                var t = index / 33f;
                var current = new Vector2(
                    Mathf.Lerp(0.10f, 0.40f, t),
                    0.68f + Mathf.Sin(t * Mathf.PI * 1.4f) * 0.055f);
                ink?.Inject(
                    current,
                    (current - previous) * 35f,
                    Color.HSVToRGB(Mathf.Lerp(0.42f, 0.10f, t), 0.48f, 0.94f),
                    0.048f);
                previous = current;
                yield return null;
            }

            yield return new WaitForSecondsRealtime(0.40f);
            var centre = new Vector2(0.67f, 0.43f);
            previous = centre + new Vector2(0.11f, 0f);
            for (var index = 1; index <= 30; index++)
            {
                var angle = Mathf.PI * index / 30f;
                var current = centre + new Vector2(Mathf.Cos(angle) * 0.11f, Mathf.Sin(angle) * 0.15f);
                ink?.Inject(
                    current,
                    (current - previous) * 32f,
                    Color.HSVToRGB(Mathf.Lerp(0.56f, 0.86f, index / 30f), 0.48f, 0.94f),
                    0.052f);
                previous = current;
                yield return null;
            }
        }

        private static void RevealEverything(RevealMaskModel mask)
        {
            var brush = new RevealBrush(64, 255);
            for (var y = 0; y < 3; y++)
            {
                for (var x = 0; x < 4; x++)
                {
                    mask.ApplyStamp(
                        new NormalizedPoint((x + 0.5f) / 4f, (y + 0.5f) / 3f),
                        brush);
                }
            }
        }

        private static IEnumerator WaitForState(
            HideSeekGameController controller,
            HideSeekStageState expected,
            float timeoutSeconds)
        {
            var deadline = Time.realtimeSinceStartup + timeoutSeconds;
            while (controller.State != expected && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
        }

        private static bool HasArgument(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
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
    }
}
