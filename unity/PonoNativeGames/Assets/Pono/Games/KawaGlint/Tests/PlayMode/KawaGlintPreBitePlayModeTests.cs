using System.Collections;
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
    /// Proves the "前あたり" (pre-bite nibble) enhancement actually plays out
    /// during a real, un-skipped Wait phase: the bobber twitches at least
    /// once as the <see cref="KawaGlintPreBitePlan"/> fires its burst(s),
    /// and either settles back to Floating between bursts or the session
    /// goes on to reach Bite (sinking the bobber). Mirrors
    /// KawaGlintGameplayPlayModeTests's "build the scene by hand"
    /// SetUp/TearDown pattern since 91_KawaGlint.unity is intentionally not
    /// registered in EditorBuildSettings. Deliberately does NOT use
    /// DebugSkipWait -- that hook jumps straight to elapsed==waitTotal,
    /// which by design produces zero nibbles (see KawaGlintPreBitePlan's
    /// quiet-tail contract), so it would never exercise this feature.
    /// </summary>
    public sealed class KawaGlintPreBitePlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);

        // A fresh cast's first wait is always TsuriKawaTuning.WaitSecRange
        // ([2,5]s, ConsecutiveMisses==0), so 8s real time comfortably covers
        // the whole Wait phase even in the worst case.
        private const float WaitPhaseTimeoutSeconds = 8f;

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
                "The bobber never entered Twitch during a natural (un-skipped) wait -- the pre-bite nibble plan never fired.");
            Assert.That(reachedBite || settledAfterTwitch, Is.True,
                "After a nibble twitch, the bobber must either settle back to Floating between bursts, or the session must have gone on to reach Bite.");

            if (reachedBite)
            {
                Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.BiteSink),
                    "On reaching Bite, the bobber must sink (BiteSink), not stay stuck mid-twitch.");
            }
        }
    }
}
