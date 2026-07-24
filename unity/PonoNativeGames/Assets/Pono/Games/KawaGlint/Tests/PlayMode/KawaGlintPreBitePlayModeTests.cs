using System;
using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using Pono.KawaGlint.Bootstrap;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Rendering;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;

namespace Pono.KawaGlint.Tests.PlayMode
{
    /// <summary>
    /// Proves the "前あたり" (pre-bite) multi-chance redesign
    /// (batch:kawaglint-multi-chance-prebite) actually plays out during a
    /// real, un-skipped Wait phase, AND that the new Deep ("グイン") hooking
    /// window fast-forwards straight into Renda exactly like a normal
    /// terminal-Bite hook -- while a missed Deep window or a Shallow
    /// ("ちょんちょん") tap never counts as a penalty. Mirrors
    /// KawaGlintGameplayPlayModeTests's "build the scene by hand"
    /// SetUp/TearDown pattern since 91_KawaGlint.unity is intentionally not
    /// registered in EditorBuildSettings. Deliberately does NOT use
    /// DebugSkipWait for the natural-wait test below -- that hook jumps
    /// straight to elapsed==waitTotal, which by design produces zero events
    /// (see KawaGlintPreBitePlan's quiet-tail contract), so it would never
    /// exercise this feature.
    /// </summary>
    public sealed class KawaGlintPreBitePlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);

        // A fresh cast's first wait is TsuriKawaTuning.WaitSecRange
        // ([6,10]s, ConsecutiveMisses==0). 14s real time comfortably covers
        // the worst case: a 10s wait plus the terminal Bite window that
        // follows it (relaxed mode, no pity/assist stretch on a fresh cast,
        // so at most WindowSec+WindowGraceSec == 2.0s) plus margin.
        private const float WaitPhaseTimeoutSeconds = 14f;

        private GameObject _cameraGo;
        private GameObject _root;
        private KawaGlintGameController _controller;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            _cameraGo = new GameObject("MainCamera", typeof(Camera));
            _cameraGo.tag = "MainCamera";
            var camera = _cameraGo.GetComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            _root = new GameObject("KawaGlint Test Root", typeof(KawaGlintBootstrap));
            yield return null;
            yield return null;

            var bootstrap = _root.GetComponent<KawaGlintBootstrap>();
            _controller = bootstrap.GameController;
            if (_controller == null)
            {
                var controllers = UnityEngine.Object.FindObjectsByType<KawaGlintGameController>(
                    FindObjectsSortMode.None);
                Assert.That(
                    controllers,
                    Has.Length.EqualTo(1),
                    "KawaGlintBootstrap did not create exactly one KawaGlintGameController.");
                _controller = controllers[0];
            }
            Assert.That(_controller, Is.Not.Null, "KawaGlintGameController was not created by the bootstrap.");
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_root != null)
            {
                UnityEngine.Object.Destroy(_root);
            }
            if (_cameraGo != null)
            {
                UnityEngine.Object.Destroy(_cameraGo);
            }
            var eventSystem = UnityEngine.Object.FindFirstObjectByType<EventSystem>();
            if (eventSystem != null)
            {
                UnityEngine.Object.Destroy(eventSystem.gameObject);
            }
            yield return null;

            _controller = null;
            _root = null;
            _cameraGo = null;
        }

        [UnityTest]
        public IEnumerator NaturalWait_BobberTwitchesFromNibblePlan_ThenSettlesOrReachesBite()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null, "No KawaGlintActorsController was built under the bootstrap.");
            Assert.That(actors.Bobber, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            var sawTwitch = false;
            var settledAfterTwitch = false;
            var deadline = Time.realtimeSinceStartup + WaitPhaseTimeoutSeconds;
            while (_controller.Phase == TsuriPhase.Wait && Time.realtimeSinceStartup < deadline)
            {
                if (actors.Bobber.VisualState == KawaGlintBobberState.Twitch)
                {
                    sawTwitch = true;
                }
                else if (sawTwitch && actors.Bobber.VisualState == KawaGlintBobberState.Floating)
                {
                    settledAfterTwitch = true;
                }
                yield return null;
            }

            var reachedBite = _controller.Phase == TsuriPhase.Bite;
            Assert.That(_controller.Phase, Is.Not.EqualTo(TsuriPhase.Wait),
                "Wait phase never resolved within the timeout -- session appears stuck.");
            Assert.That(sawTwitch, Is.True,
                "The bobber never entered Twitch during a natural (un-skipped) wait -- the pre-bite Shallow event never fired.");
            Assert.That(reachedBite || settledAfterTwitch, Is.True,
                "After a Shallow twitch, the bobber must either settle back to Floating between events, or the session must have gone on to reach Bite.");

            if (reachedBite)
            {
                Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.BiteSink),
                    "On reaching Bite, the bobber must sink (BiteSink), not stay stuck mid-twitch.");
            }
        }

        [UnityTest]
        public IEnumerator DeepWindowTap_DuringWait_EntersRendaImmediately()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Floating,
                3f,
                "The bobber never settled into Floating after casting.");

            _controller.DebugForceDeepWindow();
            yield return null; // let UpdateWaitSteadyState observe the override at least once

            // HandleTap's Wait branch ignores the uv value entirely while a
            // Deep hooking window is open -- only IsDeepHookWindowOpen is
            // consulted -- so any on-screen tap position works here.
            _controller.HandleTap(WaterCastUv);

            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Renda),
                "A tap during a forced Deep window must hook straight into Renda, mid-Wait.");
            Assert.That(FindObject("RendaWrap").activeSelf, Is.True);
            Assert.That(FindObject("HookHitFx").activeSelf, Is.True,
                "The hit-confirm FX must play on a successful Deep-window hook, same as a terminal-Bite hook.");
            Assert.That(_controller.ConsecutiveMisses, Is.Zero,
                "Hooking via a Deep window must not count as a miss -- TsuriCore.TapHook's own accounting is untouched.");

            yield return CapturePrebiteQaScreenshot("05_deep_tap_success_renda");
        }

        [UnityTest]
        public IEnumerator DeepWindowMissed_NoPenalty_WaitContinues()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Floating,
                3f,
                "The bobber never settled into Floating after casting.");

            _controller.DebugForceDeepWindow(0.5f);
            yield return null;

            // Let the forced window (0.5s) plus its DeepTapGraceSec (0.3s)
            // grace period fully elapse without ever tapping.
            yield return new WaitForSeconds(1f);

            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait),
                "Missing a Deep window must not resolve the cast one way or the other -- Wait must continue.");
            Assert.That(_controller.ConsecutiveMisses, Is.Zero,
                "Missing a Deep window is not a miss/escape -- no penalty per the 3-7yo no-harsh-penalties contract.");
            Assert.That(FindObject("EscapeBanner").activeSelf, Is.False);
            Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.Floating),
                "The bobber must revert to Floating after a missed Deep window, with no lingering BiteSink.");

            yield return CapturePrebiteQaScreenshot("04_deep_missed_floating_restored");
        }

        [UnityTest]
        public IEnumerator DeepWindow_BobberSinksVisiblyAndTimingRingShows()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Floating,
                3f,
                "The bobber never settled into Floating after casting.");

            // Sampled right before the window opens -- used as the sink
            // baseline instead of the theoretical waterline Y, so the
            // ambient KawaWave sway (already present while Floating) can't
            // itself be mistaken for the Deep pull's sink.
            var baselineY = actors.Bobber.transform.position.y;
            yield return CapturePrebiteQaScreenshot("01_floating_baseline");

            _controller.DebugForceDeepWindow();
            // BiteSinkSmoothTime is 0.04s, so 0.6s is comfortably enough for
            // the sink to have converged near its full BiteSinkOffsetWorld
            // (0.55) regardless of ambient wave jitter.
            yield return new WaitForSeconds(0.6f);

            Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.BiteSink),
                "A forced Deep window must visually drive the SAME BiteSink state as a real Deep event/terminal Bite.");
            Assert.That(baselineY - actors.Bobber.transform.position.y, Is.GreaterThanOrEqualTo(0.35f),
                "The bobber must visibly sink at least 0.35 world units during a forced Deep window -- this is the " +
                "regression guard for the original 'ウキが全然動いてない' bug report.");
            Assert.That(FindObject("TimingRing").activeSelf, Is.True,
                "The timing ring must show during a Deep window, driven by the same stateless HUD API as the terminal Bite window.");

            yield return CapturePrebiteQaScreenshot("03_deep_bitesink_and_ring");
        }

        [UnityTest]
        public IEnumerator ShallowTwitchTap_IsNoOp()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Twitch,
                WaitPhaseTimeoutSeconds,
                "A natural (unskipped) wait never produced a Shallow twitch to sample.");

            yield return CapturePrebiteQaScreenshot("02_shallow_twitch");

            _controller.HandleTap(WaterCastUv);

            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait),
                "Tapping during a Shallow twitch must be a no-op -- only an open Deep window can hook.");
            Assert.That(_controller.CaughtCount, Is.Zero);
        }

        // One-off QA capture helper for the "浮きが全然動いてない" bugfix +
        // multi-chance pre-bite redesign (batch:kawaglint-multi-chance-prebite)
        // -- writes a decisive, state-forced PNG per named visual so a human
        // (or a later review pass) can eyeball "ちょっと" vs "グイン" side by
        // side without depending on the randomized plan actually placing an
        // event at the right instant. Purely additive to the existing
        // assertions above; never itself asserts anything.
        private static IEnumerator CapturePrebiteQaScreenshot(string state)
        {
            var dir = Path.Combine(Application.dataPath, "..", "Logs", "qa");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "prebite_" + state + ".png");
            // Deliberately no WaitForEndOfFrame here -- it hangs indefinitely
            // under -runTests batchmode (no compositor to end a frame
            // against), unlike a real Play/standalone session. A couple of
            // yield return null ticks is enough for CaptureScreenshot to
            // pick up the already-rendered frame from the Camera above.
            ScreenCapture.CaptureScreenshot(path);
            yield return null;
            yield return null;
            yield return null;
        }

        private GameObject FindObject(string objectName)
        {
            return _root.GetComponentsInChildren<Transform>(true)
                .Single(transform => transform.name == objectName)
                .gameObject;
        }

        private static IEnumerator WaitUntilOrFail(Func<bool> condition, float timeoutSeconds, string failureMessage)
        {
            var deadline = Time.realtimeSinceStartup + timeoutSeconds;
            while (!condition() && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
            Assert.That(condition(), Is.True, failureMessage);
        }
    }
}
