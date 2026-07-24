using System.Collections;
using System.Linq;
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
    /// Proves the "食いつき牽引" (bite-pull) presentation actually happens on a
    /// live bobber: the float is dragged sideways and tipped over toward the
    /// fish, it still sinks by the pinned minimum depth, it visibly pops when
    /// the fish lets go, the drag wake fades in and stays on screen, and the
    /// splash effect honours its new scale argument.
    ///
    /// Builds the scene through <see cref="KawaGlintBootstrap"/> like the rest
    /// of this suite (91_KawaGlint.unity is intentionally not registered in
    /// EditorBuildSettings), then <b>disables the game controller</b> so these
    /// tests drive the presentation layer directly instead of racing a live
    /// fishing session for control of the bobber's visual state.
    /// </summary>
    public sealed class KawaGlintPullPlayModeTests
    {
        // Generous relative to the 0.10s lateral ramp and the 0.04s sink
        // smoothing, so neither has any chance of still being mid-flight.
        private const float SettleSeconds = 0.6f;

        private GameObject _cameraGo;
        private GameObject _root;
        private KawaGlintActorsController _actors;
        private KawaGlintBobber _bobber;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            _cameraGo = new GameObject("MainCamera", typeof(Camera));
            _cameraGo.tag = "MainCamera";
            var camera = _cameraGo.GetComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            _root = new GameObject("KawaGlint Pull Test Root", typeof(KawaGlintBootstrap));
            yield return null;
            yield return null;

            // These tests own the bobber's visual state for their duration --
            // a live session would otherwise drive it out from under them on
            // its own schedule.
            var controller = _root.GetComponent<KawaGlintBootstrap>().GameController;
            if (controller == null)
            {
                controller = UnityEngine.Object.FindFirstObjectByType<KawaGlintGameController>();
            }
            if (controller != null)
            {
                controller.enabled = false;
            }

            _actors = _root.GetComponentInChildren<KawaGlintActorsController>(true);
            Assert.That(_actors, Is.Not.Null, "No KawaGlintActorsController was built under the bootstrap.");
            _bobber = _actors.Bobber;
            Assert.That(_bobber, Is.Not.Null, "The actors builder produced no bobber.");

            _bobber.SetVisualState(KawaGlintBobberState.Floating);
            yield return null;
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

            _actors = null;
            _bobber = null;
            _root = null;
            _cameraGo = null;
        }

        [UnityTest]
        public IEnumerator Bobber_BiteSink_StillSinksAtLeastPointThreeFive_WorldUnits()
        {
            // The pinned regression guard for the original "ウキが全然動いてない"
            // report, re-asserted here because the bite now also adds a
            // vertical nibble jitter and a waist-anchored pivot -- either of
            // which could silently eat into the sink depth.
            var baselineY = _bobber.transform.position.y;

            _bobber.SetPullDirection(1f);
            _bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            yield return new WaitForSeconds(SettleSeconds);

            Assert.That(_bobber.VisualState, Is.EqualTo(KawaGlintBobberState.BiteSink));
            Assert.That(
                baselineY - _bobber.transform.position.y,
                Is.GreaterThanOrEqualTo(0.35f),
                "A bite must still sink the float by at least 0.35 world units.");
        }

        [UnityTest]
        public IEnumerator Bobber_BiteSink_DragsTowardTheFish_AndTipsItsAntennaOver()
        {
            var restX = _bobber.RestWorldX;

            _bobber.SetPullDirection(1f);
            _bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            yield return new WaitForSeconds(SettleSeconds);

            Assert.That(
                _bobber.CenterWorldX - restX,
                Is.EqualTo(KawaGlintPullMath.BitePullLateralWorld).Within(0.02f),
                "The float must be dragged toward the fish by the full lateral offset.");

            var tilt = SignedTiltDegrees(_bobber.transform);
            Assert.That(
                tilt,
                Is.LessThan(-15f),
                "The float's antenna must be tipped well over toward the fish -- this is the primary 'it is being pulled' cue.");
            Assert.That(
                Mathf.Abs(tilt),
                Is.LessThanOrEqualTo(KawaGlintPullMath.MaxPullTiltDegrees + 0.01f),
                "The pull tilt must stay inside its child-safe clamp.");

            // The other direction mirrors, and CenterWorldX is what the
            // ripple rings / fishing line / HUD timing ring all read, so they
            // follow the drag with no extra wiring.
            _bobber.SetVisualState(KawaGlintBobberState.Floating);
            yield return new WaitForSeconds(0.4f);
            _bobber.SetPullDirection(-1f);
            _bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            yield return new WaitForSeconds(SettleSeconds);

            Assert.That(
                _bobber.CenterWorldX - restX,
                Is.EqualTo(-KawaGlintPullMath.BitePullLateralWorld).Within(0.02f));
            Assert.That(SignedTiltDegrees(_bobber.transform), Is.GreaterThan(15f));
        }

        [UnityTest]
        public IEnumerator Bobber_BiteSink_NeverExceedsTheChildSafeTilt_OnAnyFrame()
        {
            _bobber.SetPullDirection(1f);
            _bobber.SetVisualState(KawaGlintBobberState.BiteSink);

            // Sampled every frame across the whole ramp-in plus a full nibble
            // cycle, so a transient spike cannot hide between assertions.
            var deadline = Time.realtimeSinceStartup + 1.2f;
            while (Time.realtimeSinceStartup < deadline)
            {
                Assert.That(
                    Mathf.Abs(SignedTiltDegrees(_bobber.transform)),
                    Is.LessThanOrEqualTo(KawaGlintPullMath.MaxPullTiltDegrees + 0.01f));
                yield return null;
            }
        }

        [UnityTest]
        public IEnumerator Bobber_ReleasingABite_PopsAboveTheWaterline_AndSettlesBackToRest()
        {
            var waterlineY = _bobber.WaterlineWorldY;

            _bobber.SetPullDirection(1f);
            _bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            yield return new WaitForSeconds(SettleSeconds);

            _bobber.SetVisualState(KawaGlintBobberState.Floating);

            var peakY = float.NegativeInfinity;
            var deadline = Time.realtimeSinceStartup + 0.9f;
            while (Time.realtimeSinceStartup < deadline)
            {
                peakY = Mathf.Max(peakY, _bobber.transform.position.y);
                yield return null;
            }

            // The ambient wave alone only reaches +0.082 wu, so clearing
            // +0.10 proves the pop is a real, separate beat and not the swell.
            Assert.That(
                peakY - waterlineY,
                Is.GreaterThan(0.10f),
                "Releasing a bite must visibly pop the float above the waterline -- this is how a child reads 'it got away'.");

            // ...and it must come back down and re-centre, not park high or
            // stay dragged aside.
            yield return new WaitForSeconds(1.2f);
            Assert.That(_bobber.transform.position.y - waterlineY, Is.LessThan(0.15f));
            Assert.That(
                _bobber.CenterWorldX,
                Is.EqualTo(_bobber.RestWorldX).Within(0.01f),
                "The lateral drag must fully release.");
        }

        [UnityTest]
        public IEnumerator Bobber_SurfaceWorldY_TracksTheSharedWaterlineContract()
        {
            // The submerge shader cuts the sprite at exactly this value, so
            // if it ever drifts off the waterline + wave contract the player
            // sees a second water surface drawn across the float.
            for (var i = 0; i < 20; i++)
            {
                var expected = _bobber.WaterlineWorldY + KawaWave.Height(_bobber.CenterWorldX, Time.time);
                Assert.That(_bobber.SurfaceWorldY, Is.EqualTo(expected).Within(0.02f));
                Assert.That(_bobber.SurfaceWorldPosition.x, Is.EqualTo(_bobber.CenterWorldX).Within(1e-4f));
                yield return null;
            }
        }

        [UnityTest]
        public IEnumerator Wake_FadesInWhilePulling_FadesOutWhenHidden_AndStaysInsideTheWater()
        {
            var waterRect = new Rect(-8.889f, -5f, 17.778f, 6.6f);
            var wake = KawaGlintBobberWake.Create(
                _root.transform,
                null,
                _bobber,
                KawaGlintStageBuilder.WaterlineWorldY,
                waterRect);

            Assert.That(wake.Mode, Is.EqualTo(KawaGlintBobberWakeMode.Hidden));
            yield return null;
            Assert.That(wake.IsVisible, Is.False, "The wake must start hidden -- it only exists while something is towing the surface.");

            wake.SetPullDirection(1f);
            wake.SetMode(KawaGlintBobberWakeMode.Pull);
            yield return new WaitForSeconds(0.3f);

            Assert.That(wake.IsVisible, Is.True);
            Assert.That(wake.Alpha, Is.GreaterThan(0.5f), "The foam must have faded fully in within its 0.15s fade.");
            Assert.That(
                wake.AnchorWorldX - _bobber.CenterWorldX,
                Is.EqualTo(KawaGlintPullMath.WakeOffsetWorldX).Within(0.02f),
                "The foam must sit just ahead of the float, in the tow direction.");
            Assert.That(
                wake.AnchorWorldY - KawaGlintStageBuilder.WaterlineWorldY,
                Is.InRange(-0.1f, 0.1f),
                "The foam must ride the same waterline everything else does -- never its own.");

            // Uniform scale only: an x-only stretch would violate the
            // project's absolute aspect-ratio rule.
            var scale = wake.transform.localScale;
            Assert.That(scale.x, Is.EqualTo(scale.y).Within(1e-4f), "The wake must never be scaled non-uniformly.");

            // A renda anchor far off the right edge must be clamped back so
            // the foam never hangs off screen (the real case: the rightmost
            // cast plus the drag offset plus the foam's half width).
            wake.SetMode(KawaGlintBobberWakeMode.Renda);
            wake.SetRendaAnchorX(9999f);
            yield return null;
            yield return null;
            Assert.That(
                wake.AnchorWorldX + KawaGlintPullMath.WakeWorldWidth * 0.5f,
                Is.LessThanOrEqualTo(waterRect.xMax + 0.05f),
                "The wake must stay fully inside the visible water.");

            wake.SetMode(KawaGlintBobberWakeMode.Hidden);
            yield return new WaitForSeconds(0.45f);
            Assert.That(wake.IsVisible, Is.False, "The wake must fade out, not pop out.");
        }

        [UnityTest]
        public IEnumerator Splash_ScaledPlay_IsSmallerThanAFullLandingSplash()
        {
            var splash = _actors.GetComponentInChildren<KawaGlintSplashEffect>(true);
            Assert.That(splash, Is.Not.Null, "No KawaGlintSplashEffect was built under the actors root.");

            var origin = new Vector3(_bobber.CenterWorldX, KawaGlintStageBuilder.WaterlineWorldY, 0f);
            var ring = FindDescendant(splash.transform, "SplashRing");
            var droplet = FindDescendant(splash.transform, "SplashDroplet0");
            Assert.That(ring, Is.Not.Null);
            Assert.That(droplet, Is.Not.Null);

            // Both runs are sampled at the same age (well inside the ring's
            // 0.5s life), so the only thing that differs between them is the
            // multiplier -- a couple of raw frames would have left the
            // comparison at the mercy of editor frame-time jitter.
            const float SampleAgeSeconds = 0.15f;

            splash.Play(origin);
            yield return new WaitForSeconds(SampleAgeSeconds);
            var fullRing = ring.localScale.x;
            var fullDroplet = Vector3.Distance(droplet.position, origin);

            splash.Play(origin, 0.55f);
            yield return new WaitForSeconds(SampleAgeSeconds);
            var smallRing = ring.localScale.x;
            var smallDroplet = Vector3.Distance(droplet.position, origin);

            Assert.That(fullRing, Is.GreaterThan(0f));
            Assert.That(
                smallRing,
                Is.LessThan(fullRing * 0.8f),
                "Play(origin, 0.55f) must produce a visibly smaller ring than the full landing splash.");
            Assert.That(
                smallDroplet,
                Is.LessThan(fullDroplet * 0.8f),
                "The scale multiplier must shorten the droplet arcs too, not just the ring.");
        }

        // The bobber writes its rotation in world space, so read it back the
        // same way and fold 0..360 into -180..180.
        private static float SignedTiltDegrees(Transform transform)
        {
            var z = transform.eulerAngles.z;
            return z > 180f ? z - 360f : z;
        }

        private static Transform FindDescendant(Transform root, string childName)
        {
            return root.GetComponentsInChildren<Transform>(true)
                .FirstOrDefault(transform => transform.name == childName);
        }
    }
}
