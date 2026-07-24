using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Pono.KawaGlint.Bootstrap;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Input;
using Pono.KawaGlint.Rendering;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Pono.KawaGlint.Tests.PlayMode
{
    /// <summary>
    /// Proves the "ポノのつりゲーム 川づり" gameplay loop (cast -> wait -> bite -> hook ->
    /// renda -> catch/escape) is actually playable, not just an ambient wallpaper. 91_KawaGlint.unity
    /// is intentionally NOT registered in EditorBuildSettings (VerifySpike enforces this), so - unlike
    /// HideSeekCreatures's scene-load tests - this suite builds the scene by hand in-place, mirroring
    /// ColorWaterDeliveryRuntimeTests's "GameObject + Bootstrap component" pattern.
    /// </summary>
    public sealed class KawaGlintGameplayPlayModeTests
    {
        private static readonly Vector2 EmptySkyUv = new Vector2(0.5f, 0.9f);
        private static readonly Vector2 WaterCastUv = new Vector2(0.7f, 0.3f);
        private static readonly Vector2 WaterRecastUv = new Vector2(0.6f, 0.35f);
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
        public IEnumerator FullCatchFlow_CastToLanded()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null, "No KawaGlintActorsController was built under the bootstrap.");
            Assert.That(actors.Bobber, Is.Not.Null);

            // (1) Fresh boot: idle, bobber not yet cast, HUD inviting a cast.
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Idle));
            Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.Hidden));
            Assert.That(FindText("PhaseWord").text, Is.EqualTo("どこに なげる？"));

            // (2) Tapping the empty sky must not start anything.
            _controller.HandleTap(EmptySkyUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Idle), "A sky tap must not cast the line.");

            // (3) Tapping the water casts: phase -> Wait, a species is chosen, the bobber flies out
            // then settles, and the target fish becomes visible for its approach.
            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));
            CollectionAssert.Contains(
                TsuriFishData.RiverSpecies.Select(species => species.Id).ToArray(),
                _controller.CurrentSpeciesId,
                "CurrentSpeciesId must be one of the river pool's species.");

            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.Floating,
                3f,
                "The bobber never settled into Floating after casting.");
            Assert.That(actors.IsTargetFishVisible, Is.True, "The target fish never appeared for its approach.");

            // (4) Skip the wait so the bite window opens deterministically.
            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");
            Assert.That(FindText("PhaseWord").text, Is.EqualTo("いまだ！タップ！"));

            // (5) Hooking tap: Bite -> Renda.
            _controller.HandleTap(RendaTapUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Renda));
            Assert.That(FindObject("RendaWrap").activeSelf, Is.True);

            // (6) Three renda taps build a combo of exactly three.
            for (var i = 0; i < 3; i++)
            {
                _controller.HandleTap(RendaTapUv);
            }
            Assert.That(_controller.RendaComboCount, Is.EqualTo(3));
            Assert.That(FindText("RendaComboNum").text, Is.EqualTo("3"));

            // (7) Keep reeling in (no yields needed - HandleTap alone advances the gauge) until Landed.
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
            Assert.That(_controller.CaughtCount, Is.EqualTo(1));
            Assert.That(_controller.ConsecutiveMisses, Is.Zero);

            // (8) Landed presentation: catch banner, bucket count, bobber retracted.
            yield return WaitUntilOrFail(
                () => FindObject("CatchBanner").activeSelf,
                3f,
                "The catch banner never appeared after landing.");
            Assert.That(FindText("BucketCount").text, Is.EqualTo("つれた かず 1"));
            Assert.That(actors.Bobber.VisualState, Is.EqualTo(KawaGlintBobberState.Hidden));

            // (9) The banner auto-closes back to an idle, castable state.
            yield return WaitUntilOrFail(
                () => !FindObject("CatchBanner").activeSelf
                    && FindText("PhaseWord").text == "どこに なげる？",
                5f,
                "The catch banner never closed back to the idle cast prompt.");
        }

        /// <summary>
        /// Regression gate for batch:kawaglint-multi-chance-prebite: this
        /// exercises the DebugSkipWait path straight to the terminal Bite
        /// window (bypassing any Wait-phase Deep event entirely) and proves
        /// that missing it still falls through to the existing escape/pity/
        /// re-cast flow completely unchanged. If a future change to the
        /// multi-chance Deep-window logic in KawaGlintGameController ever
        /// breaks this test, the bug is almost certainly in that new code,
        /// not here -- this test's own assertions are untouched by the redesign.
        /// </summary>
        [UnityTest]
        public IEnumerator EscapeFlow_MissedBiteWindow_ThenRecast()
        {
            var actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(actors, Is.Not.Null);

            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            _controller.DebugSkipWait();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Bite,
                2f,
                "DebugSkipWait did not drive the session into Bite.");

            // Let the bite window run out without tapping - the fish must get away.
            _controller.DebugExpireBiteWindow();
            yield return null;
            yield return WaitUntilOrFail(
                () => _controller.Phase == TsuriPhase.Escaped,
                2f,
                "DebugExpireBiteWindow did not drive the session into Escaped.");

            Assert.That(_controller.ConsecutiveMisses, Is.EqualTo(1));
            Assert.That(FindObject("EscapeBanner").activeSelf, Is.True);
            Assert.That(_controller.CaughtCount, Is.Zero);

            yield return WaitUntilOrFail(
                () => actors.Bobber.VisualState == KawaGlintBobberState.EscapePop
                    || actors.Bobber.VisualState == KawaGlintBobberState.Hidden,
                2f,
                "The bobber never played its escape pop (or retracted) after escaping.");
            yield return WaitUntilOrFail(
                () => !actors.IsTargetFishVisible,
                3f,
                "The target fish never fled off-screen after escaping.");

            // Even from a terminal Escaped state, a fresh cast must be accepted immediately.
            _controller.HandleTap(WaterRecastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait), "Recasting from Escaped must work.");
        }

        [UnityTest]
        public IEnumerator InputSurface_PointerDown_DrivesCast()
        {
            var surface = _root.GetComponentInChildren<KawaGlintInputSurface>(true);
            Assert.That(surface, Is.Not.Null, "No KawaGlintInputSurface was found under the bootstrap.");
            Assert.That(EventSystem.current, Is.Not.Null, "No EventSystem was created for the HUD.");

            var pointerData = new PointerEventData(EventSystem.current)
            {
                position = new Vector2(Screen.width * 0.7f, Screen.height * 0.3f),
                pointerId = 0
            };
            ExecuteEvents.Execute(surface.gameObject, pointerData, ExecuteEvents.pointerDownHandler);
            yield return null;

            Assert.That(
                _controller.Phase,
                Is.EqualTo(TsuriPhase.Wait),
                "A pointerDown routed through the EventSystem did not reach HandleTap and cast the line.");
        }

        [UnityTest]
        public IEnumerator WaitTap_IsNoOp()
        {
            _controller.HandleTap(WaterCastUv);
            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait));

            _controller.HandleTap(RendaTapUv);
            _controller.HandleTap(RendaTapUv);

            Assert.That(_controller.Phase, Is.EqualTo(TsuriPhase.Wait), "Tapping during Wait must be a no-op.");
            Assert.That(_controller.CaughtCount, Is.Zero);

            yield return null;
        }

        // ── diagnostic (batch:1462-kawaglint-silhouette-opacity-hud-legibility): proves whether
        // Outline/Shadow's ModifyMesh actually contributes navy/black vertices to the generated
        // mesh, independent of any screenshot/pixel-scan ambiguity (resolution, anti-aliasing,
        // OS-level screencap scaling). VertexColorProbe is appended as the LAST IMeshModifier on
        // the GameObject, so by the time its own ModifyMesh runs, Unity has already run every
        // earlier modifier (Outline, then Shadow) and appended their vertices into the shared
        // VertexHelper stream -- if either effect is truly wired up, this probe must see them.
        [UnityTest]
        public IEnumerator PhaseWordAndBucketCount_HaveOutlineAndShadowVertexColors()
        {
            yield return null;
            Canvas.ForceUpdateCanvases();

            foreach (var name in new[] { "PhaseWord", "BucketCount" })
            {
                var text = FindText(name);
                Assert.That(text.GetComponent<Outline>(), Is.Not.Null, $"{name} is missing its Outline component.");
                Assert.That(text.GetComponent<Shadow>(), Is.Not.Null, $"{name} is missing its Shadow component.");

                var probe = text.gameObject.AddComponent<VertexColorProbe>();
                yield return null;
                Canvas.ForceUpdateCanvases();

                Assert.That(probe.CapturedVertexCount, Is.GreaterThan(0), $"{name}: probe captured zero vertices (Text mesh is empty).");
                Assert.That(
                    probe.SawOutlineColoredVertex,
                    Is.True,
                    $"{name}: no navy (#0D2938-ish) vertex found in the generated mesh -- Outline's ModifyMesh never contributed its offset copies.");
                Assert.That(
                    probe.SawShadowColoredVertex,
                    Is.True,
                    $"{name}: no black/near-black vertex found in the generated mesh -- Shadow's ModifyMesh never contributed its offset copy.");
                Assert.That(
                    probe.VertexCountMultiple,
                    Is.EqualTo(10),
                    $"{name}: expected exactly 10x the base glyph vertex count (Outline's 5x, then Shadow doubling that to 10x) -- got {probe.VertexCountMultiple}x. " +
                    "A value of 1 means neither effect ran; 5 means only Outline (not Shadow, or vice versa) ran.");
            }
        }

        /// <summary>Appended as the final IMeshModifier on a Graphic to inspect the fully-composed vertex stream (see the test above for why this proves the effect chain ran, not just that the components exist).</summary>
        private sealed class VertexColorProbe : BaseMeshEffect
        {
            public int CapturedVertexCount { get; private set; }
            public bool SawOutlineColoredVertex { get; private set; }
            public bool SawShadowColoredVertex { get; private set; }
            public int VertexCountMultiple { get; private set; }

            private static readonly Color32 ExpectedOutlineColor = new Color32(13, 41, 61, 255); // #0D2938
            private static readonly Color32 ExpectedShadowColor = new Color32(0, 0, 0, 204); // 0.8 alpha black

            public override void ModifyMesh(VertexHelper vh)
            {
                if (!IsActive())
                {
                    return;
                }

                var verts = new List<UIVertex>();
                vh.GetUIVertexStream(verts);
                CapturedVertexCount = verts.Count;

                var baseGlyphVertexCount = 0;
                foreach (var v in verts)
                {
                    if (IsColorClose(v.color, Color.white))
                    {
                        baseGlyphVertexCount++;
                    }
                    else if (IsColorClose(v.color, ExpectedOutlineColor))
                    {
                        SawOutlineColoredVertex = true;
                    }
                    else if (IsColorClose(v.color, ExpectedShadowColor))
                    {
                        SawShadowColoredVertex = true;
                    }
                }

                VertexCountMultiple = baseGlyphVertexCount > 0 ? verts.Count / baseGlyphVertexCount : 0;
            }

            private static bool IsColorClose(Color32 a, Color32 b)
            {
                const int tolerance = 12;
                return Mathf.Abs(a.r - b.r) <= tolerance
                    && Mathf.Abs(a.g - b.g) <= tolerance
                    && Mathf.Abs(a.b - b.b) <= tolerance
                    && Mathf.Abs(a.a - b.a) <= tolerance;
            }
        }

        private Text FindText(string objectName)
        {
            return _root.GetComponentsInChildren<Text>(true)
                .Single(text => text.name == objectName);
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
