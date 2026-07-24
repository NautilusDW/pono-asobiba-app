using System;
using System.Collections;
using NUnit.Framework;
using Pono.KawaGlint.Bootstrap;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Rendering;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;

namespace Pono.KawaGlint.Tests.PlayMode
{
    /// <summary>
    /// Proves module A's landing splash (<see cref="KawaGlintSplashEffect"/>)
    /// actually fires off <see cref="KawaGlintBobber.OnLanded"/> and plays as
    /// a genuine one-shot, on both landing paths: the normal cast-and-fly
    /// arrival (<see cref="KawaGlintBobber.UpdateFlying"/>) and the
    /// immediate-landing path of <see cref="KawaGlintBobber.BeginCast"/>.
    /// Mirrors KawaGlintGameplayPlayModeTests's SetUp/TearDown/WaitUntilOrFail
    /// pattern (91_KawaGlint.unity is intentionally not registered in
    /// EditorBuildSettings, so this suite builds the scene by hand).
    /// </summary>
    public sealed class KawaGlintSplashPlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);

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

            _root = new GameObject("KawaGlint Splash Test Root", typeof(KawaGlintBootstrap));
            yield return null;
            yield return null;

            var bootstrap = _root.GetComponent<KawaGlintBootstrap>();
            _controller = bootstrap.GameController;
            if (_controller == null)
            {
                var controllers = UnityEngine.Object.FindObjectsByType<KawaGlintGameController>(
                    FindObjectsSortMode.None);
                Assert.That(controllers, Has.Length.EqualTo(1), "KawaGlintBootstrap did not create exactly one KawaGlintGameController.");
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
        public IEnumerator Splash_FiresOnceOnLanding()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null, "No KawaGlintActorsController was built under the bootstrap.");
            Assert.That(actors.Bobber, Is.Not.Null);

            var splash = actors.GetComponentInChildren<KawaGlintSplashEffect>(true);
            Assert.That(splash, Is.Not.Null, "No KawaGlintSplashEffect was built under the actors root.");
            Assert.That(splash.IsPlaying, Is.False, "The splash effect must be idle before any cast has landed.");

            var landedCount = 0;
            actors.Bobber.OnLanded += _ => landedCount++;

            _controller.HandleTap(WaterCastUv);
            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Floating,
                3f,
                "The bobber never settled into Floating after casting.");

            Assert.That(landedCount, Is.EqualTo(1), "OnLanded should fire exactly once for a single cast.");
            Assert.That(splash.IsPlaying, Is.True, "The splash effect should start playing right after landing.");

            // One-shot: it must stop on its own well within its ~0.55s
            // design duration, without any further gameplay input.
            yield return WaitUntilOrFail(
                () => !splash.IsPlaying,
                1.5f,
                "The splash effect should stop playing on its own (one-shot) within 1.5s.");
        }

        [UnityTest]
        public IEnumerator Splash_ImmediateLandingPath_AlsoFires()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);
            var bobber = actors.Bobber;
            Assert.That(bobber, Is.Not.Null);

            var splash = actors.GetComponentInChildren<KawaGlintSplashEffect>(true);
            Assert.That(splash, Is.Not.Null);

            var landedCount = 0;
            bobber.OnLanded += _ => landedCount++;

            // flightSeconds <= 0 takes BeginCast's immediate-landing branch
            // rather than the per-frame Flying arc.
            bobber.BeginCast(new Vector3(0f, 3f, 0f), 1.5f, 0f);

            Assert.That(landedCount, Is.EqualTo(1), "The immediate-landing path (flightSeconds <= 0) should also raise OnLanded exactly once.");
            Assert.That(bobber.VisualState, Is.EqualTo(KawaGlintBobberState.Floating));
            Assert.That(splash.IsPlaying, Is.True, "The splash effect should also react to the immediate-landing path.");

            yield return null;
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
