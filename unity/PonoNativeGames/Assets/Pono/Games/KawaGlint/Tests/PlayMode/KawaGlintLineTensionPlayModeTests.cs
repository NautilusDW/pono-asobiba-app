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
    /// Proves the renda ("引き寄せ") line-tension look (module B of the
    /// "着水スプラッシュ & 連打テンション" enhancement) actually engages during
    /// gameplay: the fishing line -- normally hidden while the bobber itself
    /// is retracted during renda -- redraws taut to the target fish's mouth,
    /// and cleanly clears back off once the bout resolves. Mirrors
    /// KawaGlintGameplayPlayModeTests's "build the scene by hand" SetUp/TearDown
    /// pattern since 91_KawaGlint.unity is intentionally not registered in
    /// EditorBuildSettings.
    /// </summary>
    public sealed class KawaGlintLineTensionPlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);
        private static readonly Vector2 RendaTapUv = new Vector2(0.5f, 0.5f);

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
        public IEnumerator FishingLine_TenseAndVisibleDuringRenda()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null, "No KawaGlintActorsController was built under the bootstrap.");

            yield return EnterRenda(actors);

            Assert.That(actors.IsFishingLineTense, Is.True, "Entering Renda must engage the line-tension look.");

            var lineRenderer = FindLineRenderer();
            Assert.That(
                lineRenderer.enabled,
                Is.True,
                "The fishing line must stay visible during Renda now that it is tense to the fish's mouth " +
                "(the bobber itself goes Hidden during Renda, which previously disabled the line entirely).");

            var fishTransform = FindObject("TargetFishShadow").transform;
            var endPoint = lineRenderer.GetPosition(lineRenderer.positionCount - 1);

            // The tense endpoint tracks the fish's nose (fishX - worldLength * 0.45),
            // not the bobber -- worldLength is one of {1.2, 1.8, 2.5} depending on the
            // cast species, so the nose offset always falls in [0.3, 1.3] world units.
            var noseOffset = Mathf.Abs(endPoint.x - fishTransform.position.x);
            Assert.That(
                noseOffset,
                Is.InRange(0.3f, 1.3f),
                "The tense line's endpoint X should sit at the target fish's nose offset, not at the bobber.");
            Assert.That(
                endPoint.y,
                Is.EqualTo(fishTransform.position.y).Within(0.1f),
                "The tense line's endpoint Y should follow the target fish, not the retracted bobber.");
        }

        [UnityTest]
        public IEnumerator FishingLine_TensionClearsOnLanded()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            yield return EnterRenda(actors);
            Assert.That(actors.IsFishingLineTense, Is.True);

            var landed = false;
            for (var i = 0; i < 30; i++)
            {
                _controller.HandleTap(RendaTapUv);
                if (_controller.Phase == TsuriPhase.Landed)
                {
                    landed = true;
                    break;
                }
            }
            Assert.That(landed, Is.True, "30 renda taps were not enough to land the fish.");

            Assert.That(actors.IsFishingLineTense, Is.False, "Landing must clear the line-tension look.");

            // One frame so KawaGlintActorsController.Update() re-runs AnimateFishingLine
            // with the freshly-cleared visible/tense flags before reading LineRenderer.enabled
            // back -- SetFishingLineVisible/SetFishingLineTension only flip plain fields
            // synchronously; the LineRenderer itself is only updated from Update().
            yield return null;

            var lineRenderer = FindLineRenderer();
            Assert.That(
                lineRenderer.enabled,
                Is.False,
                "The fishing line must go back to hidden once the catch resolves.");
        }

        /// <summary>Drives cast -> Wait -> Bite -> Renda via the DebugSkipWait test hook, then lets one frame of Update() run.</summary>
        private IEnumerator EnterRenda(KawaGlintActorsController actors)
        {
            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");

            _controller.HandleTap(RendaTapUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Renda));

            // One frame so KawaGlintActorsController.Update() re-runs AnimateFishingLine
            // with the freshly-toggled tension flag before assertions read it back.
            yield return null;
        }

        private LineRenderer FindLineRenderer()
        {
            return FindObject("FishingLine").GetComponent<LineRenderer>();
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
