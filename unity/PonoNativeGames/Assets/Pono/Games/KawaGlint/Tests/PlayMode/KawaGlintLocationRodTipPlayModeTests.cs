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
    /// End-to-end regression for KawaGlint 海拡張 §D-3: proves a real
    /// <see cref="KawaGlintGameController.TrySetLocation"/> switch (through
    /// the full Bootstrap wiring -- RodTipResolver ->
    /// KawaGlintStageBuilder.SetAnglerPosition ->
    /// KawaGlintActorsController.SetRodTipWorldPosition -> this
    /// controller's own <c>_stage.RodTipWorldPosition</c> copy) actually
    /// moves where the next cast's bobber flies from, not just where the
    /// Angler sprite itself sits (see
    /// KawaGlintAnglerPlacementEditModeTests for that half in isolation).
    /// Mirrors KawaGlintGameplayPlayModeTests's "GameObject + Bootstrap
    /// component" scene-construction pattern.
    /// </summary>
    public sealed class KawaGlintLocationRodTipPlayModeTests
    {
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);

        // Same regression-baseline rod tip asserted by
        // KawaGlintAnglerPlacementEditModeTests (river_asase, this
        // project's pre-§D-3 behavior, unchanged).
        private const float AsaseRodTipX = -6.0329f;

        // sea_iwaba's own anchor (2.59, 1.89) plus the same fixed
        // rod-tip-from-anchor offset the asase case uses (its rod tip
        // -6.0329 minus its anchor -7.2 = 1.1671) -- see
        // KawaGlintStageBuilder.BuildAnglerArt/SetAnglerPosition.
        private const float SeaIwabaRodTipX = 2.59f + 1.1671f;

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
            Assert.That(_controller, Is.Not.Null, "KawaGlintGameController was not created by the bootstrap.");
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_root != null)
            {
                Object.Destroy(_root);
            }
            if (_cameraGo != null)
            {
                Object.Destroy(_cameraGo);
            }
            var eventSystem = Object.FindFirstObjectByType<EventSystem>();
            if (eventSystem != null)
            {
                Object.Destroy(eventSystem.gameObject);
            }
            yield return null;

            _controller = null;
            _root = null;
            _cameraGo = null;
        }

        [UnityTest]
        public IEnumerator Cast_AtBoot_StartsFromTheAsaseRodTip()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);

            // BeginCast sets _x = fromWorld.x synchronously (no Update tick
            // needed) -- see KawaGlintBobber.BeginCast -- so this reads the
            // exact cast-start position, not an interpolated mid-flight one.
            Assert.That(actors.Bobber.CenterWorldX, Is.EqualTo(AsaseRodTipX).Within(0.05f),
                "A cast right after boot (no location switch) should still fly from the asase rod tip.");
            yield break;
        }

        [UnityTest]
        public IEnumerator Cast_AfterSwitchingToSeaIwaba_StartsFromSeaIwabasOwnRodTip()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            var switched = _controller.TrySetLocation("sea_iwaba");
            Assert.That(switched, Is.True, "TrySetLocation(\"sea_iwaba\") should succeed from the Idle phase.");
            Assert.That(_controller.CurrentLocationId, Is.EqualTo("sea_iwaba"));

            _controller.HandleTap(WaterCastUv);

            Assert.That(actors.Bobber.CenterWorldX, Is.EqualTo(SeaIwabaRodTipX).Within(0.05f),
                "A cast after switching to sea_iwaba should fly from ITS OWN rod tip, not the asase one left over from Configure.");
            yield break;
        }
    }
}
