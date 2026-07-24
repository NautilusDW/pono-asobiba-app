using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Proves KawaGlint 海拡張 §D-3's per-location Pono placement: the
    /// illustrated Pono sprite ("Angler") sits at a different world anchor
    /// per <c>TsuriLocationData.BackgroundKey</c>, both at initial
    /// <see cref="KawaGlintStageBuilder.Build"/> time and via a later
    /// <see cref="KawaGlintStageBuilder.SetAnglerPosition"/> live switch --
    /// while river_asase (null/unmapped key) keeps this project's exact
    /// pre-§D-3 regression baseline. No MonoBehaviour lifecycle/Play mode is
    /// needed: Build/SetAnglerPosition are synchronous GameObject
    /// construction, exercised here exactly like
    /// KawaGlintGameplayPlayModeTests exercises the rest of the stage, just
    /// without the coroutine wait.
    /// </summary>
    public sealed class KawaGlintAnglerPlacementEditModeTests
    {
        // river_asase's own regression baseline (KawaGlintStageBuilder's
        // private AnglerArtBottomCenter/PonoRodTipU/V constants, unchanged
        // by §D-3): pono_angler_side.png is 1497x1536px at PPU 100, height
        // pinned to world 2.6, bottom-center anchor (-7.2, 1.95).
        private static readonly Vector3 AsaseAnchor = new Vector3(-7.2f, 1.95f, 0f);
        private static readonly Vector3 AsaseRodTip = new Vector3(-6.0329f, 3.8255f, 0f);

        private GameObject _cameraGo;
        private GameObject _parentGo;

        [SetUp]
        public void SetUp()
        {
            _cameraGo = new GameObject("EditModeTestCamera", typeof(Camera));
            var camera = _cameraGo.GetComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            _parentGo = new GameObject("StageParent");
        }

        [TearDown]
        public void TearDown()
        {
            if (_parentGo != null)
            {
                Object.DestroyImmediate(_parentGo);
            }
            if (_cameraGo != null)
            {
                Object.DestroyImmediate(_cameraGo);
            }
        }

        private Camera Camera => _cameraGo.GetComponent<Camera>();

        [Test]
        public void Build_NullBackgroundKey_PlacesAnglerAtRegressionBaseline()
        {
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, null);

            var angler = _parentGo.transform.Find("KawaStage/Angler");
            Assert.That(angler, Is.Not.Null, "Build should create an Angler child under the stage root.");
            AssertVector3(angler.position, AsaseAnchor, 0.01f, "river_asase (null key) anchor must stay pixel-identical to the pre-§D-3 constant.");
            AssertVector3(stage.RodTipWorldPosition, AsaseRodTip, 0.02f, "river_asase (null key) rod tip must stay pixel-identical to the pre-§D-3 value.");
        }

        [Test]
        public void Build_RiverKakouBackgroundKey_FallsBackToTheSameAnchorAsAsase()
        {
            // river_kakou is deliberately absent from AnglerAnchorByBackgroundKey
            // (its own left-side dune shoreline already lines up with the
            // fallback anchor -- see KawaGlintStageBuilder's class doc).
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, "bg_tsuri_river_kakou");

            var angler = _parentGo.transform.Find("KawaStage/Angler");
            AssertVector3(angler.position, AsaseAnchor, 0.01f, "river_kakou has no dictionary entry and must fall back to the same anchor as asase.");
            AssertVector3(stage.RodTipWorldPosition, AsaseRodTip, 0.02f, "river_kakou's rod tip must match the same fallback anchor's rod tip.");
        }

        [TestCase("bg_tsuri_sea_sunahama", 0.90f, 2.20f)]
        [TestCase("bg_tsuri_sea_iwaba", 2.59f, 1.89f)]
        [TestCase("bg_tsuri_sea_oki", 4.20f, 2.03f)]
        public void Build_SeaExpansionBackgroundKey_PlacesAnglerAtItsOwnAnchor(string backgroundKey, float expectedX, float expectedY)
        {
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, backgroundKey);

            var angler = _parentGo.transform.Find("KawaStage/Angler");
            var expectedAnchor = new Vector3(expectedX, expectedY, 0f);
            AssertVector3(angler.position, expectedAnchor, 0.01f, $"{backgroundKey}'s Angler should sit at its own per-location anchor, not the asase/kakou fallback.");

            // Same fixed UV offset as the regression case (intrinsic to the
            // art, not the background) -- just added to a different anchor.
            var expectedRodTip = expectedAnchor + (AsaseRodTip - AsaseAnchor);
            AssertVector3(stage.RodTipWorldPosition, expectedRodTip, 0.02f, $"{backgroundKey}'s rod tip should be the same fixed offset from ITS OWN anchor.");
        }

        [Test]
        public void SetAnglerPosition_LiveSwitchToSeaLocation_MovesTheSameAnglerAndRecomputesRodTip()
        {
            // Start on the regression baseline (as every real boot does),
            // then switch live -- mirrors KawaGlintGameController.TrySetLocation
            // -> KawaGlintBootstrap.ResolveRodTipForLocation's real call path.
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, null);
            var angler = _parentGo.transform.Find("KawaStage/Angler");
            AssertVector3(angler.position, AsaseAnchor, 0.01f, "sanity: stage should start at the asase anchor before switching.");

            var newRodTip = KawaGlintStageBuilder.SetAnglerPosition(stage, "bg_tsuri_sea_iwaba", stage.RodTipWorldPosition);

            var expectedAnchor = new Vector3(2.59f, 1.89f, 0f);
            AssertVector3(angler.position, expectedAnchor, 0.01f, "SetAnglerPosition should move the SAME Angler GameObject built by Build (no rebuild), to sea_iwaba's own anchor.");
            var expectedRodTip = expectedAnchor + (AsaseRodTip - AsaseAnchor);
            AssertVector3(newRodTip, expectedRodTip, 0.02f, "SetAnglerPosition's returned rod tip should reflect the new anchor.");
        }

        [Test]
        public void SetAnglerPosition_BackToNullKey_ReturnsToTheRegressionBaseline()
        {
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, "bg_tsuri_sea_oki");
            var angler = _parentGo.transform.Find("KawaStage/Angler");

            var newRodTip = KawaGlintStageBuilder.SetAnglerPosition(stage, null, stage.RodTipWorldPosition);

            AssertVector3(angler.position, AsaseAnchor, 0.01f, "Switching back to a null/unmapped key should return Pono to the asase anchor.");
            AssertVector3(newRodTip, AsaseRodTip, 0.02f, "...and its rod tip should return to the asase value too.");
        }

        // Mirrors KawaGlintStageBuilder's own private AnglerArtWorldHeight
        // const (Pono's illustrated world height, never assigned
        // independently -- see BuildAnglerArt) -- duplicated here for the
        // same reason AsaseAnchor/AsaseRodTip above are: this test file has
        // no internals-visibility into Pono.KawaGlint.Rendering, so every
        // fixed art constant it needs is copied, not referenced.
        private const float AnglerArtWorldHeight = 2.6f;

        // Regression coverage for a code-review finding (2026-07-25):
        // bg_tsuri_sea_sunahama's original anchor, (4.14, 2.85), was picked
        // against the first post's decorative rope-wrapped knob rather than
        // the walkway surface itself, so its sprite top (anchor.y +
        // AnglerArtWorldHeight = 5.45) overshot this camera's visible top
        // edge (orthographicSize=5, position.y=0 -> world y=+5) by ~0.45 --
        // roughly 17% of Pono's own drawn height poking off the top of the
        // frame. Every *_PlacesAnglerAtItsOwnAnchor test above only asserts
        // an anchor matches its own dictionary entry, so a wrong-but-
        // internally-consistent anchor value would still pass all of them
        // by construction; none of the existing coverage could have caught
        // this off-screen regression. This test instead asserts the actual
        // on-screen invariant -- against river_asase/river_kakou's shared
        // fallback anchor plus every sea-expansion location's own anchor --
        // so a future per-location anchor tweak can't silently push Pono
        // off the top of the camera again.
        [TestCase(null)]
        [TestCase("bg_tsuri_river_kakou")]
        [TestCase("bg_tsuri_sea_sunahama")]
        [TestCase("bg_tsuri_sea_iwaba")]
        [TestCase("bg_tsuri_sea_oki")]
        public void Build_AnyLocation_AnglerSpriteTopStaysWithinCameraVisibleBounds(string backgroundKey)
        {
            var stage = KawaGlintStageBuilder.Build(_parentGo.transform, Camera, backgroundKey);

            var angler = _parentGo.transform.Find("KawaStage/Angler");
            Assert.That(angler, Is.Not.Null, "Build should create an Angler child under the stage root.");

            var spriteTopWorldY = angler.position.y + AnglerArtWorldHeight;
            var cameraTopWorldY = Camera.transform.position.y + Camera.orthographicSize;

            Assert.That(
                spriteTopWorldY,
                Is.LessThanOrEqualTo(cameraTopWorldY),
                $"{(backgroundKey ?? "(null -> river_asase)")}'s Angler sprite top ({spriteTopWorldY:F2}) "
                + $"must not exceed the camera's visible top edge ({cameraTopWorldY:F2}); anchor.y={angler.position.y:F2}.");
        }

        private static void AssertVector3(Vector3 actual, Vector3 expected, float tolerance, string message)
        {
            Assert.That(actual.x, Is.EqualTo(expected.x).Within(tolerance), $"{message} (x)");
            Assert.That(actual.y, Is.EqualTo(expected.y).Within(tolerance), $"{message} (y)");
        }
    }
}
