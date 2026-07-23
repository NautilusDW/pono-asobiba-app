using System;
using System.Collections;
using System.Globalization;
using System.IO;
using UnityEngine;

namespace Pono.AquaLumina.Bootstrap
{
    /// <summary>
    /// Opt-in device-free visual QA harness for the AquaLumina spike, mirroring
    /// HideSeekCreatures/Runtime/Bootstrap/RuntimeQaCapture.cs: dormant unless -ponoSpikeCapture
    /// is passed on the command line, so it never affects normal play/Editor use of the scene.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class AquaLuminaQaCapture : MonoBehaviour
    {
        private const float MinDelaySeconds = 0f;
        private const float MaxDelaySeconds = 10f;
        private const float DefaultDelaySeconds = 1.5f;

        // 60 frames gives a short but stable sample of steady-state frame time once the capture
        // delay has already let the scene/effects settle - long enough to smooth out a stray GC
        // spike, short enough not to meaningfully delay the CLI QA pass.
        private const int FrameSampleCount = 60;

        private AquaLuminaBootstrap _bootstrap;
        private string _outputPath;
        private string _mode;
        private float _delaySeconds = DefaultDelaySeconds;
        private bool _quitAfterCapture;

        private bool _godRaysEnabled;
        private bool _causticsEnabled;
        private bool _distortionEnabled;
        private bool _bloomEnabled;

        public static void AttachIfRequested(GameObject host, AquaLuminaBootstrap bootstrap)
        {
            if (!TryReadArgument("-ponoSpikeCapture", out var path) || string.IsNullOrWhiteSpace(path))
            {
                return;
            }

            var capture = host.AddComponent<AquaLuminaQaCapture>();
            capture._bootstrap = bootstrap;
            capture._outputPath = Path.GetFullPath(path);
            capture._mode = TryReadArgument("-ponoSpikeCaptureMode", out var mode)
                ? mode.ToLowerInvariant()
                : "full";
            capture._quitAfterCapture = HasArgument("-ponoQuitAfterCapture");
            if (TryReadArgument("-ponoSpikeCaptureDelay", out var delay)
                && float.TryParse(delay, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedDelay))
            {
                capture._delaySeconds = Mathf.Clamp(parsedDelay, MinDelaySeconds, MaxDelaySeconds);
            }
        }

        private IEnumerator Start()
        {
            // Let Awake() on every other object in the scene finish first (mirrors
            // RuntimeQaCapture's own "yield return null" before touching game state).
            yield return null;

            ApplyMode(_mode);

            yield return new WaitForSecondsRealtime(_delaySeconds);

            var frameStart = Time.realtimeSinceStartup;
            for (var i = 0; i < FrameSampleCount; i++)
            {
                yield return null;
            }
            var elapsedSeconds = Time.realtimeSinceStartup - frameStart;
            var averageFrameMs = FrameSampleCount > 0 ? (elapsedSeconds / FrameSampleCount) * 1000f : 0f;

            yield return new WaitForEndOfFrame();

            var directory = Path.GetDirectoryName(_outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }
            ScreenCapture.CaptureScreenshot(_outputPath, 1);

            WriteSidecar(averageFrameMs);

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

        private void ApplyMode(string mode)
        {
            switch (mode)
            {
                case "baseline":
                    _godRaysEnabled = false;
                    _causticsEnabled = false;
                    _distortionEnabled = false;
                    _bloomEnabled = false;
                    break;
                case "godrays":
                    _godRaysEnabled = true;
                    _bloomEnabled = true;
                    _causticsEnabled = false;
                    _distortionEnabled = false;
                    break;
                case "caustics":
                    _causticsEnabled = true;
                    _godRaysEnabled = false;
                    _distortionEnabled = false;
                    _bloomEnabled = false;
                    break;
                case "distortion":
                    _distortionEnabled = true;
                    _godRaysEnabled = false;
                    _causticsEnabled = false;
                    _bloomEnabled = false;
                    break;
                case "full":
                default:
                    _godRaysEnabled = true;
                    _causticsEnabled = true;
                    _distortionEnabled = true;
                    _bloomEnabled = true;
                    break;
            }

            if (_bootstrap == null)
            {
                return;
            }

            _bootstrap.SetEffectEnabled(AquaLuminaBootstrap.AquaEffect.GodRays, _godRaysEnabled);
            _bootstrap.SetEffectEnabled(AquaLuminaBootstrap.AquaEffect.Caustics, _causticsEnabled);
            _bootstrap.SetEffectEnabled(AquaLuminaBootstrap.AquaEffect.Distortion, _distortionEnabled);
            _bootstrap.SetEffectEnabled(AquaLuminaBootstrap.AquaEffect.Bloom, _bloomEnabled);
        }

        private void WriteSidecar(float averageFrameMs)
        {
            var sidecarPath = Path.ChangeExtension(_outputPath, ".txt");
            var lines = new[]
            {
                $"mode={_mode}",
                $"delay={_delaySeconds.ToString("0.00", CultureInfo.InvariantCulture)}",
                $"renderer={(_bootstrap != null ? _bootstrap.RendererLabel : "no-bootstrap")}",
                $"godRays={EffectStateLabel(AquaLuminaBootstrap.AquaEffect.GodRays, _godRaysEnabled)}",
                $"caustics={EffectStateLabel(AquaLuminaBootstrap.AquaEffect.Caustics, _causticsEnabled)}",
                $"distortion={EffectStateLabel(AquaLuminaBootstrap.AquaEffect.Distortion, _distortionEnabled)}",
                $"bloom={EffectStateLabel(AquaLuminaBootstrap.AquaEffect.Bloom, _bloomEnabled)}",
                $"avgFrameMs={averageFrameMs.ToString("0.000", CultureInfo.InvariantCulture)}"
            };
            File.WriteAllLines(sidecarPath, lines);
        }

        private string EffectStateLabel(AquaLuminaBootstrap.AquaEffect effect, bool modeEnabled)
        {
            if (_bootstrap == null || !_bootstrap.IsEffectAvailable(effect))
            {
                return "unavailable";
            }
            return modeEnabled ? "on" : "off";
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
