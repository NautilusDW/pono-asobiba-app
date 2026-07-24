using System;
using System.Collections;
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
    /// Proves module B's bite-window timing ring (<see cref="Pono.KawaGlint.UI.KawaGlintHud.ShowTimingRing"/>/
    /// <see cref="Pono.KawaGlint.UI.KawaGlintHud.SetTimingRing"/>/<see cref="Pono.KawaGlint.UI.KawaGlintHud.HideTimingRing"/>)
    /// and hit-confirm effect (<see cref="Pono.KawaGlint.UI.KawaGlintHud.PlayHookHitFx"/>) actually track
    /// the live TsuriCore session instead of being decorative-only wallpaper.
    /// Deliberately does NOT assert anything about tap timing/precision --
    /// <see cref="TsuriCore.TapHook"/>'s "bite中ならいつタップしても成功" contract is
    /// untouched by this feature, so these tests only exercise the *visual*
    /// guide. Mirrors KawaGlintGameplayPlayModeTests's SetUp/TearDown/
    /// WaitUntilOrFail pattern (91_KawaGlint.unity is intentionally not
    /// registered in EditorBuildSettings, so this suite builds the scene by
    /// hand).
    /// </summary>
    public sealed class KawaGlintTimingRingPlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);
        private static readonly Vector2 RendaTapUv = new Vector2(0.5f, 0.5f);
        // Deliberately a different water position than WaterCastUv (viewport-x
        // delta of 0.2) so a test can prove the hit-confirm FX tracks the
        // *current* cast rather than lingering at an older one.
        private static readonly Vector2 SecondCastUv = new Vector2(0.5f, 0.3f);

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

            _root = new GameObject("KawaGlint TimingRing Test Root", typeof(KawaGlintBootstrap));
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
        public IEnumerator BitePhase_TimingRingShrinksTowardZero()
        {
            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");
            yield return null; // let the steady-state UpdateTimingRing tick at least once more

            Assert.That(FindObject("TimingRing").activeSelf, Is.True, "TimingRing must be shown while the bite window is open.");
            var outer = FindObject("TimingRingOuter").GetComponent<RectTransform>();
            Assert.That(outer.localScale.x, Is.GreaterThan(1.5f), "The outer ring must start large just after entering Bite.");
            Assert.That(
                _controller.BiteWindowRemaining01,
                Is.GreaterThan(0.5f),
                "BiteWindowRemaining01 must start near 1 right after entering Bite.");

            var firstScale = outer.localScale.x;
            var firstRemaining = _controller.BiteWindowRemaining01;

            // Relaxed-mode bite windows are always >= 2s, so a handful of
            // frames without tapping must not expire it, and must visibly
            // shrink the outer ring toward the fixed inner target ring.
            for (var i = 0; i < 10; i++)
            {
                yield return null;
            }

            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Bite), "The bite window should not have expired yet during this short wait.");
            Assert.That(outer.localScale.x, Is.LessThan(firstScale), "The outer ring must shrink over time toward the inner target ring.");
            Assert.That(
                _controller.BiteWindowRemaining01,
                Is.LessThan(firstRemaining),
                "BiteWindowRemaining01 must decrease over time while Phase==Bite.");
        }

        [UnityTest]
        public IEnumerator BiteTap_HidesRingAndPlaysHookHitFx()
        {
            _controller.HandleTap(WaterCastUv);
            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");
            yield return null;

            Assert.That(FindObject("TimingRing").activeSelf, Is.True);

            _controller.HandleTap(RendaTapUv);
            Assert.That(
                _controller.Phase,
                Is.EqualTo(TsuriPhase.Renda),
                "A bite tap must hook the fish regardless of ring position (TapHook contract unchanged).");

            Assert.That(FindObject("TimingRing").activeSelf, Is.False, "The timing ring must hide the instant the fish is hooked.");
            Assert.That(FindObject("HookHitFx").activeSelf, Is.True, "The hit-confirm effect must start right when the hook succeeds.");

            yield return WaitUntilOrFail(
                () => !FindObject("HookHitFx").activeSelf,
                1.2f,
                "The hit-confirm effect must stop on its own (one-shot, ~0.7s) within 1.2s.");
        }

        [UnityTest]
        public IEnumerator BiteWindowExpires_TimingRingHides()
        {
            _controller.HandleTap(WaterCastUv);
            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");
            yield return null;

            Assert.That(FindObject("TimingRing").activeSelf, Is.True);

            _controller.DebugExpireBiteWindow();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Escaped,
                2f,
                "DebugExpireBiteWindow did not drive the session into Escaped.");

            Assert.That(FindObject("TimingRing").activeSelf, Is.False, "The timing ring must not linger after the fish escapes.");
        }

        /// <summary>
        /// Regression test for the auto-hook path (3 consecutive misses ->
        /// the 4th cast's Wait phase transitions straight to Renda, per
        /// TsuriCore.Tick / TsuriTuning.AutoHookAfterMisses, WITHOUT ever
        /// passing through Bite/EnterBiteUi/UpdateTimingRing). Because that
        /// path never calls UpdateTimingRing, _lastRingViewport can only be
        /// correct in EnterRendaUi if it is recomputed from the *live* bobber
        /// position there -- if it instead reused whatever UpdateTimingRing
        /// last wrote (from an earlier cast's Bite phase), the hit-confirm FX
        /// would render at a stale, unrelated screen position.
        /// </summary>
        [UnityTest]
        public IEnumerator AutoHookAfterThreeMisses_HookHitFxUsesCurrentBobberPositionNotStaleCast()
        {
            var bobber = _root.GetComponentInChildren<KawaGlintBobber>(true);
            Assert.That(bobber, Is.Not.Null, "Test setup must have a KawaGlintBobber under the bootstrap root.");

            // Escape 3 times in a row at the SAME cast position to build
            // ConsecutiveMisses up to the auto-hook threshold without ever
            // reaching Renda.
            for (var i = 0; i < 3; i++)
            {
                _controller.HandleTap(WaterCastUv);
                Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait), $"escape #{i + 1}: cast did not start Wait.");

                // In real play the Wait-phase timer (>= 1s, see
                // TsuriKawaTuning.WaitSecRange/WaitSecRangeAfterMiss) always
                // outlasts the bobber's cast-flight animation (0.45s), so the
                // bobber has always physically landed on its target by the
                // time Bite starts. DebugSkipWait only fast-forwards the
                // session-level timer, not real wall-clock time, so this test
                // must explicitly wait for the (real-time-driven) flight to
                // finish itself -- otherwise the anchor below would be
                // captured mid-flight, near the shared rod-tip origin,
                // regardless of which water position was tapped.
                yield return WaitUntilOrFail(
                    () => bobber.VisualState != KawaGlintBobberState.Flying,
                    2f,
                    $"escape #{i + 1}: cast-flight animation never finished.");

                _controller.DebugSkipWait();
                yield return null;
                yield return WaitUntilOrFail(
                    () => _controller.Phase == TsuriPhase.Bite,
                    2f,
                    $"escape #{i + 1}: DebugSkipWait did not drive the session into Bite.");
                yield return null; // let UpdateTimingRing tick at least once at this cast's position

                _controller.DebugExpireBiteWindow();
                yield return null;
                yield return WaitUntilOrFail(
                    () => _controller.Phase == TsuriPhase.Escaped,
                    2f,
                    $"escape #{i + 1}: DebugExpireBiteWindow did not drive the session into Escaped.");
            }
            Assert.That(
                _controller.ConsecutiveMisses,
                Is.EqualTo(3),
                "Three escapes in a row must build ConsecutiveMisses to the auto-hook threshold.");

            // The 3rd Bite phase above was the last time UpdateTimingRing ran,
            // so TimingRing's anchor is still sitting at cast #3's bobber
            // position -- exactly the value that would leak stale into the
            // hit-confirm FX if EnterRendaUi didn't recompute it itself.
            var staleAnchorX = FindObject("TimingRing").GetComponent<RectTransform>().anchorMin.x;

            // Cast #4 at a clearly different water position. ConsecutiveMisses
            // is already at the auto-hook threshold, so this cast's Wait
            // phase must go straight to Renda on expiry, bypassing
            // Bite/EnterBiteUi/UpdateTimingRing entirely.
            _controller.HandleTap(SecondCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait), "The 4th cast did not start Wait.");

            // Same real-time invariant as above: let cast #4's flight actually
            // land before forcing the auto-hook, so the "fresh" position read
            // below reflects the settled target rather than a mid-flight
            // position near the shared rod-tip origin.
            yield return WaitUntilOrFail(
                () => bobber.VisualState != KawaGlintBobberState.Flying,
                2f,
                "cast #4: cast-flight animation never finished.");

            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Renda,
                2f,
                "The 4th cast after 3 consecutive misses must auto-hook straight into Renda, bypassing Bite.");

            var camera = _cameraGo.GetComponent<Camera>();
            // Orthographic, unrotated camera: viewport-x depends only on
            // world-x, so world-y can be anything for this comparison.
            var expectedFreshX = camera.WorldToViewportPoint(new Vector3(bobber.CenterWorldX, 0f, 0f)).x;

            Assert.That(
                Mathf.Abs(expectedFreshX - staleAnchorX),
                Is.GreaterThan(0.05f),
                "Test setup sanity check: cast #3 and cast #4 must land at meaningfully different water " +
                "positions for this regression test to be able to detect stale-viewport leakage.");

            var hookHitFxAnchorX = FindObject("HookHitFx").GetComponent<RectTransform>().anchorMin.x;
            Assert.That(
                hookHitFxAnchorX,
                Is.EqualTo(expectedFreshX).Within(0.01f),
                "The auto-hook hit-confirm FX must appear at the CURRENT bobber position (cast #4), not a " +
                "stale position left over from an earlier cast -- EnterRendaUi must recompute the ring " +
                "viewport itself instead of relying on UpdateTimingRing having run first.");
            Assert.That(
                hookHitFxAnchorX,
                Is.Not.EqualTo(staleAnchorX).Within(0.01f),
                "The auto-hook hit-confirm FX must NOT reuse cast #3's stale ring position.");
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
