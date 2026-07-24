using NUnit.Framework;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Pure-function tests for <see cref="KawaGlintPullMath"/> and
    /// <see cref="KawaGlintBobberArt"/> -- the curves and the procedural art
    /// behind the "食いつき牽引" (bite-pull) presentation. No MonoBehaviour and
    /// no scene, matching the existing
    /// <see cref="KawaGlintSplashMathEditModeTests"/> convention.
    ///
    /// Three of these are load-bearing safety guards rather than ordinary
    /// unit tests:
    /// <list type="bullet">
    /// <item>the tilt clamp (a 3-7 year old must never see the float
    /// spin);</item>
    /// <item>the sub-3 Hz check on every new oscillator;</item>
    /// <item>the one-sided sink jitter, which is what keeps
    /// <c>KawaGlintPreBitePlayModeTests</c>'s pinned "a Deep bite sinks the
    /// float by at least 0.35 wu" assertion from going flaky.</item>
    /// </list>
    /// </summary>
    public sealed class KawaGlintPullMathEditModeTests
    {
        // ---------------------------------------------------------------
        // D1: ramp endpoints
        // ---------------------------------------------------------------

        [Test]
        public void PullMath_LateralEase_And_TiltRamp_Endpoints()
        {
            Assert.That(KawaGlintPullMath.LateralEase01(0f), Is.EqualTo(0f).Within(1e-6f));
            Assert.That(KawaGlintPullMath.LateralEase01(-1f), Is.EqualTo(0f).Within(1e-6f));
            Assert.That(
                KawaGlintPullMath.LateralEase01(KawaGlintPullMath.BitePullLateralRampSeconds),
                Is.EqualTo(1f).Within(1e-6f));
            Assert.That(KawaGlintPullMath.LateralEase01(10f), Is.EqualTo(1f).Within(1e-6f));

            Assert.That(KawaGlintPullMath.LateralRelease01(0f), Is.EqualTo(0f).Within(1e-6f));
            Assert.That(
                KawaGlintPullMath.LateralRelease01(KawaGlintPullMath.BitePullLateralReleaseRampSeconds),
                Is.EqualTo(1f).Within(1e-6f));

            Assert.That(KawaGlintPullMath.TiltRamp01(0f), Is.EqualTo(0f).Within(1e-6f));
            Assert.That(
                KawaGlintPullMath.TiltRamp01(KawaGlintPullMath.BitePullTiltRampSeconds),
                Is.EqualTo(1f).Within(1e-6f));
            Assert.That(KawaGlintPullMath.TiltRamp01(10f), Is.EqualTo(1f).Within(1e-6f));
        }

        [Test]
        public void PullMath_Ramps_AreMonotonicAndNeverSnap()
        {
            // "No instant snap" is a child-safety contract, not a nicety:
            // every step of the ramp must be a small increment, never a jump
            // from 0 straight to 1.
            var previous = 0f;
            for (var i = 0; i <= 40; i++)
            {
                var t = KawaGlintPullMath.BitePullTiltRampSeconds * i / 40f;
                var value = KawaGlintPullMath.TiltRamp01(t);
                Assert.That(value, Is.GreaterThanOrEqualTo(previous - 1e-6f), $"TiltRamp01 must be monotonic (t={t}).");
                Assert.That(value - previous, Is.LessThan(0.12f), $"TiltRamp01 must not step more than a smooth increment (t={t}).");
                previous = value;
            }
        }

        [Test]
        public void PullMath_LateralEngage_IsFasterThanRelease()
        {
            // The grab is sudden, the letting-go is gentle -- reversing these
            // would read as the fish yanking the float back.
            Assert.That(
                KawaGlintPullMath.BitePullLateralRampSeconds,
                Is.LessThan(KawaGlintPullMath.BitePullLateralReleaseRampSeconds));
        }

        // ---------------------------------------------------------------
        // D2: tilt clamp
        // ---------------------------------------------------------------

        [Test]
        public void PullMath_BobberTilt_NeverExceeds32Degrees()
        {
            foreach (var pullDirX in new[] { -1f, 0f, 1f })
            {
                for (var w = 0; w <= 10; w++)
                {
                    var weight = w / 10f;
                    for (var s = -8; s <= 8; s++)
                    {
                        for (var j = -1; j <= 1; j++)
                        {
                            var tilt = KawaGlintPullMath.BobberPullTiltDegrees(weight, pullDirX, s, j);
                            Assert.That(
                                Mathf.Abs(tilt),
                                Is.LessThanOrEqualTo(KawaGlintPullMath.MaxPullTiltDegrees + 1e-4f),
                                $"Pull tilt escaped its clamp (weight={weight}, dir={pullDirX}, slope={s}, jitter={j}).");
                        }
                    }
                }
            }
        }

        [Test]
        public void PullMath_BobberTilt_LeansTowardThePullDirection()
        {
            // A negative Z rotation leans the float's top (its antenna)
            // toward +X, so a fish pulling toward +X must produce a negative
            // angle -- if this sign ever flips, the float visibly leans away
            // from the fish that is dragging it.
            var towardPlusX = KawaGlintPullMath.BobberPullTiltDegrees(1f, 1f, 0f, 0f);
            var towardMinusX = KawaGlintPullMath.BobberPullTiltDegrees(1f, -1f, 0f, 0f);

            Assert.That(towardPlusX, Is.LessThan(0f));
            Assert.That(towardMinusX, Is.GreaterThan(0f));
            Assert.That(towardPlusX, Is.EqualTo(-towardMinusX).Within(1e-4f));
        }

        [Test]
        public void PullMath_BobberTilt_AtZeroWeight_IsExactlyTheAmbientWaveTilt()
        {
            // Continuity guard. KawaGlintBobber renders the plain (undamped)
            // wave tilt whenever the pull weight is zero and switches to this
            // function the moment it is not, so the two MUST agree at weight
            // 0. If the wave-slope damping were applied flat at 0.30 instead
            // of ramped in, the handover frame would snap the float by up to
            // 0.7 * 5.43 = 3.8 degrees -- about 19x the wave's own peak
            // per-frame rate -- which is exactly the "no instantaneous snap"
            // rule this feature is built around.
            var tilt = KawaGlintPullMath.BobberPullTiltDegrees(0f, 1f, 8f, 1f);
            Assert.That(
                tilt,
                Is.EqualTo(8f).Within(1e-4f),
                "With no drag weight the result must equal the ambient wave tilt exactly -- no residual drag tilt, " +
                "no jitter, and no sudden change in how much of the wave slope is applied.");

            // ...and the damping does still arrive, just continuously.
            Assert.That(
                KawaGlintPullMath.BobberPullTiltDegrees(1f, 1f, 8f, 0f),
                Is.EqualTo(KawaGlintPullMath.BitePullTiltDegrees
                           + 8f * KawaGlintPullMath.PullWaveSlopeContribution).Within(1e-4f),
                "At full drag weight the wave slope must be damped to PullWaveSlopeContribution.");

            // No step larger than the wave's own per-frame motion anywhere
            // along the ramp (0.23 deg/frame at 60fps is the wave's peak).
            var previous = KawaGlintPullMath.BobberPullTiltDegrees(0f, 1f, 8f, 0f);
            for (var i = 1; i <= 200; i++)
            {
                var current = KawaGlintPullMath.BobberPullTiltDegrees(
                    KawaGlintPullMath.TiltRamp01(i / 200f * KawaGlintPullMath.BitePullTiltRampSeconds), 1f, 8f, 0f);
                Assert.That(
                    Mathf.Abs(current - previous),
                    Is.LessThan(1f),
                    $"The engage ramp stepped {Mathf.Abs(current - previous):F3} degrees in one sample at i={i}.");
                previous = current;
            }
        }

        // ---------------------------------------------------------------
        // The one-sided sink jitter (protects the pinned 0.35 wu guard)
        // ---------------------------------------------------------------

        [Test]
        public void PullMath_SinkJitter_IsOneSidedDownward_AndWithinAmplitude()
        {
            var sawSomethingBelowZero = false;
            for (var i = 0; i <= 2000; i++)
            {
                var t = i * 0.005f;
                var jitter = KawaGlintPullMath.BobberPullJitterWorldY(t);

                Assert.That(
                    jitter,
                    Is.LessThanOrEqualTo(1e-6f),
                    "The bite jitter must never lift the float: KawaGlintPreBitePlayModeTests only has ~0.036 wu of " +
                    "headroom on its 'a Deep bite sinks at least 0.35 wu' assertion at the worst-case wave phase.");
                Assert.That(jitter, Is.GreaterThanOrEqualTo(-KawaGlintPullMath.BitePullJitterWorldY - 1e-6f));

                if (jitter < -1e-3f)
                {
                    sawSomethingBelowZero = true;
                }
            }

            Assert.That(sawSomethingBelowZero, Is.True, "The bite jitter must actually move -- a frozen float was the original bug report.");
        }

        // ---------------------------------------------------------------
        // Tug decay
        // ---------------------------------------------------------------

        [Test]
        public void PullMath_TugDecay_StartsAtOne_AndDecaysMonotonically()
        {
            Assert.That(KawaGlintPullMath.TugDecay(0f), Is.EqualTo(1f).Within(1e-6f));
            Assert.That(KawaGlintPullMath.TugDecay(-1f), Is.EqualTo(1f).Within(1e-6f));

            var previous = 1f;
            for (var i = 1; i <= 60; i++)
            {
                var value = KawaGlintPullMath.TugDecay(i * 0.02f);
                Assert.That(value, Is.LessThan(previous));
                previous = value;
            }

            // Practically gone within ~4 time constants, so rapid tapping
            // accumulates as a rhythm rather than as one permanent offset.
            Assert.That(KawaGlintPullMath.TugDecay(KawaGlintPullMath.TugDecaySeconds * 4f), Is.LessThan(0.02f));
        }

        // ---------------------------------------------------------------
        // Line modes
        // ---------------------------------------------------------------

        [Test]
        public void PullMath_ModeCodes_MatchTheControllerEnumOrder()
        {
            // These ints are the whole reason the pure-math layer can build
            // without the actors controller. They are pinned to the declared
            // order of KawaGlintLineMode { Slack, PullTaut, Renda } and
            // KawaGlintRingMode { Ambient, Pull, Renda }; inserting a value
            // in the middle of either enum without updating these is a silent
            // visual break, exactly like the pinned TsuriRarity order.
            Assert.That(KawaGlintPullMath.LineModeSlack, Is.EqualTo(0));
            Assert.That(KawaGlintPullMath.LineModePullTaut, Is.EqualTo(1));
            Assert.That(KawaGlintPullMath.LineModeRenda, Is.EqualTo(2));

            Assert.That(KawaGlintPullMath.RingModeAmbient, Is.EqualTo(0));
            Assert.That(KawaGlintPullMath.RingModePull, Is.EqualTo(1));
            Assert.That(KawaGlintPullMath.RingModeRenda, Is.EqualTo(2));

            // And they really do line up with the enums the rest of the game
            // speaks, so `(int)mode` is always a safe bridge.
            Assert.That((int)KawaGlintLineMode.Slack, Is.EqualTo(KawaGlintPullMath.LineModeSlack));
            Assert.That((int)KawaGlintLineMode.PullTaut, Is.EqualTo(KawaGlintPullMath.LineModePullTaut));
            Assert.That((int)KawaGlintLineMode.Renda, Is.EqualTo(KawaGlintPullMath.LineModeRenda));

            Assert.That((int)KawaGlintRingMode.Ambient, Is.EqualTo(KawaGlintPullMath.RingModeAmbient));
            Assert.That((int)KawaGlintRingMode.Pull, Is.EqualTo(KawaGlintPullMath.RingModePull));
            Assert.That((int)KawaGlintRingMode.Renda, Is.EqualTo(KawaGlintPullMath.RingModeRenda));
        }

        [Test]
        public void PullMath_ReleasePop_StartsAtZero_PeaksThenDecays()
        {
            // Zero at the instant of release: the pop must grow in, never
            // teleport the float upward on the first frame.
            Assert.That(KawaGlintPullMath.BiteReleasePopWorldY(0f), Is.EqualTo(0f).Within(1e-6f));
            Assert.That(KawaGlintPullMath.BiteReleasePopWorldY(-1f), Is.EqualTo(0f).Within(1e-6f));

            Assert.That(
                KawaGlintPullMath.BiteReleasePopWorldY(KawaGlintPullMath.BiteReleasePopTauSeconds),
                Is.EqualTo(KawaGlintPullMath.BiteReleasePopWorld).Within(1e-5f));

            // Big enough to read past the wave's own +/-0.082 wu sway (which
            // is the whole point -- a pop hidden inside the ambient bob is
            // not a signal), and gone within a second.
            Assert.That(KawaGlintPullMath.BiteReleasePopWorld, Is.GreaterThan(0.12f));
            Assert.That(
                KawaGlintPullMath.BiteReleasePopWorldY(KawaGlintPullMath.BiteReleasePopTauSeconds * KawaGlintPullMath.BiteReleasePopTauCount),
                Is.LessThan(0.005f));

            // Single-peaked: rises to tau, falls thereafter.
            var previous = 0f;
            for (var i = 1; i <= 18; i++)
            {
                var value = KawaGlintPullMath.BiteReleasePopWorldY(KawaGlintPullMath.BiteReleasePopTauSeconds * i / 18f);
                Assert.That(value, Is.GreaterThan(previous));
                previous = value;
            }
            for (var i = 1; i <= 18; i++)
            {
                var value = KawaGlintPullMath.BiteReleasePopWorldY(
                    KawaGlintPullMath.BiteReleasePopTauSeconds * (1f + i / 6f));
                Assert.That(value, Is.LessThan(previous));
                previous = value;
            }
        }

        [Test]
        public void PullMath_LineSag_SlackIsUnchanged_AndPullTautDrawsTightOverTheRamp()
        {
            // The slack value is the shipped behaviour and must stay put --
            // it is what every non-biting frame of the game draws.
            Assert.That(
                KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModeSlack, 0f),
                Is.EqualTo(0.35f).Within(1e-5f));
            Assert.That(
                KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModeSlack, 5f),
                Is.EqualTo(0.35f).Within(1e-5f),
                "Slack sag must not be time-dependent.");

            Assert.That(
                KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModeRenda, 0f),
                Is.EqualTo(0.06f).Within(1e-5f));

            // PullTaut starts exactly where Slack was -- the line visibly
            // *draws* tight instead of appearing already tight.
            Assert.That(
                KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModePullTaut, 0f),
                Is.EqualTo(0.35f).Within(1e-5f));
            Assert.That(
                KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModePullTaut, KawaGlintPullMath.LinePullTautRampSeconds),
                Is.EqualTo(0.12f).Within(1e-5f));

            var previous = float.MaxValue;
            for (var i = 0; i <= 20; i++)
            {
                var t = KawaGlintPullMath.LinePullTautRampSeconds * i / 20f;
                var sag = KawaGlintPullMath.LineSagFor(KawaGlintPullMath.LineModePullTaut, t);
                Assert.That(sag, Is.LessThanOrEqualTo(previous + 1e-6f), "PullTaut sag must only ever tighten.");
                previous = sag;
            }
        }

        [Test]
        public void PullMath_LineWidthAndTremble_IncreaseWithLoad()
        {
            Assert.That(KawaGlintPullMath.LineWidthMultiplierFor(KawaGlintPullMath.LineModeSlack), Is.EqualTo(1f).Within(1e-5f));
            Assert.That(
                KawaGlintPullMath.LineWidthMultiplierFor(KawaGlintPullMath.LineModePullTaut),
                Is.GreaterThan(KawaGlintPullMath.LineWidthMultiplierFor(KawaGlintPullMath.LineModeSlack)));
            Assert.That(
                KawaGlintPullMath.LineWidthMultiplierFor(KawaGlintPullMath.LineModeRenda),
                Is.GreaterThan(KawaGlintPullMath.LineWidthMultiplierFor(KawaGlintPullMath.LineModePullTaut)));

            Assert.That(KawaGlintPullMath.LineTrembleFrequencyFor(KawaGlintPullMath.LineModeSlack), Is.EqualTo(0f));
            Assert.That(KawaGlintPullMath.LineTrembleAmplitudeFor(KawaGlintPullMath.LineModeSlack), Is.EqualTo(0f));

            // Renda must stay exactly on the shipped tense values so the
            // existing look does not shift under the new mode split.
            Assert.That(KawaGlintPullMath.LineTrembleFrequencyFor(KawaGlintPullMath.LineModeRenda), Is.EqualTo(46f).Within(1e-5f));
            Assert.That(KawaGlintPullMath.LineTrembleAmplitudeFor(KawaGlintPullMath.LineModeRenda), Is.EqualTo(0.015f).Within(1e-6f));
        }

        [Test]
        public void PullMath_WaterCrossing_IsFoundOnADescendingLine()
        {
            // A stand-in for the sampled fishing line: starts high at the rod
            // tip and dips below the surface.
            var points = new[]
            {
                new Vector3(-7f, 3f, 0f),
                new Vector3(-4f, 2f, 0f),
                new Vector3(-1f, 1f, 0f),
                new Vector3(2f, 0f, 0f)
            };

            Assert.That(KawaGlintPullMath.TryFindWaterCrossingX(points, points.Length, 1.5f, out var x), Is.True);
            Assert.That(x, Is.EqualTo(-2.5f).Within(1e-4f));

            Assert.That(
                KawaGlintPullMath.TryFindWaterCrossingX(points, points.Length, 10f, out _),
                Is.False,
                "A line entirely below the surface has no crossing to report.");
            Assert.That(KawaGlintPullMath.TryFindWaterCrossingX(null, 4, 1.5f, out _), Is.False);
            Assert.That(KawaGlintPullMath.TryFindWaterCrossingX(points, 1, 1.5f, out _), Is.False);
        }

        [Test]
        public void PullMath_ClampInsideRect_KeepsTheWakeFullyOnScreen()
        {
            // The real failure this guards: the rightmost cast (x = 8.089)
            // plus the pull offset plus the wake's own half width lands past
            // the right edge of the visible water.
            const float minX = -8.889f;
            const float maxX = 8.889f;
            var halfWidth = KawaGlintPullMath.WakeWorldWidth * 0.5f;

            var clamped = KawaGlintPullMath.ClampInsideRect(8.089f + 0.28f + 0.10f, halfWidth, minX, maxX);
            Assert.That(clamped + halfWidth, Is.LessThanOrEqualTo(maxX + 1e-4f));
            Assert.That(clamped - halfWidth, Is.GreaterThanOrEqualTo(minX - 1e-4f));

            // A rect narrower than the sprite degrades to "centre it" rather
            // than producing an inverted clamp.
            Assert.That(KawaGlintPullMath.ClampInsideRect(99f, 5f, -1f, 1f), Is.EqualTo(0f).Within(1e-5f));
        }

        // ---------------------------------------------------------------
        // D4: ring phase
        // ---------------------------------------------------------------

        [Test]
        public void RingPhase_NormalizedOffsets_GiveTrueHalfPeriod_AtEveryLoopDuration()
        {
            // The bug this pins: phase offsets expressed in *seconds* were
            // derived from the ambient 2.2s loop, so the moment the loop
            // shortens to 0.9s or 0.8s the two rings stop being half a period
            // apart and collapse toward pulsing in unison.
            var loopDurations = new[]
            {
                KawaGlintPullMath.RingLoopAmbientSeconds,
                KawaGlintPullMath.RingLoopPullSeconds,
                KawaGlintPullMath.RingLoopRendaSeconds
            };

            foreach (var loop in loopDurations)
            {
                for (var i = 0; i < 200; i++)
                {
                    var time = i * 0.037f;
                    var a = KawaGlintPullMath.RingLoopT(time, loop, 0f);
                    var b = KawaGlintPullMath.RingLoopT(time, loop, 0.5f);
                    var separation = Mathf.Repeat(b - a, 1f);

                    Assert.That(
                        separation,
                        Is.EqualTo(0.5f).Within(1e-4f),
                        $"Rings drifted out of half-period opposition at loop={loop}s, t={time}s.");
                }
            }
        }

        [Test]
        public void RingParams_PerMode_MatchTheDesignTable_AndAlwaysFadeToZero()
        {
            var ambientStart = KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModeAmbient, 0f, 1f);
            var ambientEnd = KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModeAmbient, 1f, 1f);
            Assert.That(ambientStart.Scale, Is.EqualTo(0.3f).Within(1e-5f));
            Assert.That(ambientEnd.Scale, Is.EqualTo(1.1f).Within(1e-5f));
            Assert.That(ambientStart.Alpha, Is.EqualTo(0.35f).Within(1e-5f));
            Assert.That(ambientStart.CenterOffsetX, Is.EqualTo(0f).Within(1e-6f));

            var pullStart = KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModePull, 0f, 1f);
            var pullEnd = KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModePull, 1f, 1f);
            Assert.That(pullStart.Alpha, Is.GreaterThan(ambientStart.Alpha), "A dragged surface must ripple more strongly than an idle one.");
            Assert.That(pullEnd.Scale, Is.GreaterThan(ambientEnd.Scale));
            Assert.That(
                pullEnd.CenterOffsetX,
                Is.EqualTo(KawaGlintPullMath.RingPullCenterDriftWorld).Within(1e-5f),
                "Pull rings must drift toward the fish -- the asymmetry is what reads as 'something is moving the water'.");
            Assert.That(
                KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModePull, 1f, -1f).CenterOffsetX,
                Is.EqualTo(-KawaGlintPullMath.RingPullCenterDriftWorld).Within(1e-5f));

            var rendaEnd = KawaGlintPullMath.RingParamsFor(KawaGlintPullMath.RingModeRenda, 1f, 1f);
            Assert.That(rendaEnd.Scale, Is.GreaterThan(pullEnd.Scale));

            foreach (var mode in new[] { KawaGlintPullMath.RingModeAmbient, KawaGlintPullMath.RingModePull, KawaGlintPullMath.RingModeRenda })
            {
                Assert.That(
                    KawaGlintPullMath.RingParamsFor(mode, 1f, 1f).Alpha,
                    Is.EqualTo(0f).Within(1e-6f),
                    $"Ring mode {mode} must fade completely out by the end of its loop.");
            }
        }

        // ---------------------------------------------------------------
        // D5: child-safety frequency ceiling
        // ---------------------------------------------------------------

        [Test]
        public void NewOscillators_AllBelow3Hz()
        {
            // Every visual oscillator this feature introduces, in one place.
            // The line tremble is deliberately absent: it is a sub-pixel
            // positional vibration, not a luminance flicker, which is what
            // the 3 Hz photosensitivity rule is about.
            var oscillators = new (string Name, float Hertz)[]
            {
                ("bobber wake breathing", KawaGlintPullMath.WakeBreathHertz),
                ("bobber bite jitter", KawaGlintPullMath.RadiansPerSecondToHertz(KawaGlintPullMath.BitePullJitterRadiansPerSecond)),
                ("ripple rings (ambient)", KawaGlintPullMath.RingPerceivedHertz(KawaGlintPullMath.RingLoopAmbientSeconds)),
                ("ripple rings (pull)", KawaGlintPullMath.RingPerceivedHertz(KawaGlintPullMath.RingLoopPullSeconds)),
                ("ripple rings (renda)", KawaGlintPullMath.RingPerceivedHertz(KawaGlintPullMath.RingLoopRendaSeconds)),
                ("rod judder", KawaGlintPullMath.RodJudderHertz),
                ("bobber submerge wobble", KawaGlintPullMath.RadiansPerSecondToHertz(KawaGlintPullMath.SubmergeWobbleRadiansPerSecond))
            };

            foreach (var oscillator in oscillators)
            {
                Assert.That(
                    oscillator.Hertz,
                    Is.LessThan(KawaGlintPullMath.ChildSafeMaxHertz),
                    $"'{oscillator.Name}' runs at {oscillator.Hertz:0.###} Hz, at or above the 3 Hz child-safety ceiling.");
                Assert.That(oscillator.Hertz, Is.GreaterThan(0f), $"'{oscillator.Name}' must actually oscillate.");
            }
        }

        [Test]
        public void RodLoad_StaysInRange_AndRisesWithRendaProgress()
        {
            for (var i = 0; i <= 20; i++)
            {
                var time = i * 0.13f;
                var load = KawaGlintPullMath.RodLoadCurve(
                    KawaGlintPullMath.RodLoadBiteSink01,
                    KawaGlintPullMath.RodLoadBiteSinkWobble01,
                    0.4f,
                    time);
                Assert.That(load, Is.InRange(0f, 1f));
            }

            Assert.That(KawaGlintPullMath.RendaRodLoad01(0f), Is.EqualTo(0.6f).Within(1e-5f));
            Assert.That(KawaGlintPullMath.RendaRodLoad01(1f), Is.EqualTo(0.85f).Within(1e-5f));
            Assert.That(KawaGlintPullMath.RendaRodLoad01(2f), Is.EqualTo(0.85f).Within(1e-5f), "Progress must be clamped, not extrapolated.");

            // The rod bows toward the water while loaded and hauls back on a
            // tap -- opposite signs are what makes the tug of war readable.
            Assert.That(KawaGlintPullMath.RodBendMaxDegrees, Is.LessThan(0f));
            Assert.That(KawaGlintPullMath.RodHaulDegrees, Is.GreaterThan(0f));
        }

        [Test]
        public void RendaThrashAmplitude_ShrinksAsTheFishTires()
        {
            Assert.That(KawaGlintPullMath.RendaThrashAmplitudeMultiplier(0f), Is.EqualTo(1f).Within(1e-5f));
            Assert.That(KawaGlintPullMath.RendaThrashAmplitudeMultiplier(1f), Is.EqualTo(0.6f).Within(1e-5f));
            Assert.That(
                KawaGlintPullMath.RendaThrashAmplitudeMultiplier(0.5f),
                Is.LessThan(KawaGlintPullMath.RendaThrashAmplitudeMultiplier(0.2f)),
                "The fish must visibly tire -- this is the progress read for a child who cannot read the gauge.");
        }

        // ---------------------------------------------------------------
        // D3: the splash curves must not have moved under the new scale arg
        // ---------------------------------------------------------------

        [Test]
        public void SplashMath_CurveConstants_AreUnchanged()
        {
            // KawaGlintSplashEffect.Play now takes a scale multiplier. That
            // multiplier lives entirely on the presentation side; if it ever
            // leaks into these curves, every existing splash silently
            // changes size.
            Assert.That(KawaGlintSplashMath.DropletCount, Is.EqualTo(5));
            Assert.That(KawaGlintSplashMath.DropletLifeSeconds, Is.EqualTo(0.55f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.RingDurationSeconds, Is.EqualTo(0.5f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.RingScale(0f), Is.EqualTo(0.25f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.RingScale(1f), Is.EqualTo(1.5f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.RingAlpha(0f), Is.EqualTo(0.55f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.DropletAlpha01(0f), Is.EqualTo(0.9f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.DropletScale01(1f), Is.EqualTo(0.55f).Within(1e-6f));
            Assert.That(KawaGlintSplashMath.DropletPosition(2, 0.2f).y, Is.EqualTo(1.6f * 0.2f - 0.5f * 7.5f * 0.04f).Within(1e-4f));
        }

        // ---------------------------------------------------------------
        // Procedural float / wake art
        // ---------------------------------------------------------------

        [Test]
        public void BobberArt_WaistV_IsBelowCentre_AndDrivesTheTopOffset()
        {
            // A real float sits low: most of its body is under the waist.
            // The pivot's V is what makes "position.y = waterlineY" mean
            // "the waist is on the water", so it must not drift back to 0.5.
            Assert.That(KawaGlintBobberArt.WaistV, Is.InRange(0.30f, 0.48f));

            var height = KawaGlintBobberArt.RecommendedBobberWorldHeight;
            Assert.That(
                KawaGlintBobberArt.TopOffsetWorld(height),
                Is.EqualTo((1f - KawaGlintBobberArt.WaistV) * height).Within(1e-5f));
            Assert.That(
                KawaGlintBobberArt.TopOffsetWorld(height),
                Is.GreaterThan(height * 0.5f),
                "The line attaches above the waist, so the top offset must exceed half the sprite height.");
        }

        [Test]
        public void BobberArt_Texture_HasTheExpectedSilhouetteAndIsFullyDeterministic()
        {
            var first = KawaGlintBobberArt.CreateBobberTexture();
            var second = KawaGlintBobberArt.CreateBobberTexture();
            try
            {
                Assert.That(first.width, Is.EqualTo(KawaGlintBobberArt.BobberTextureWidth));
                Assert.That(first.height, Is.EqualTo(KawaGlintBobberArt.BobberTextureHeight));

                var pixels = first.GetPixels();
                var width = first.width;
                var height = first.height;

                // Opaque at the waist (the widest point of the body).
                var waistRow = Mathf.RoundToInt(KawaGlintBobberArt.WaistV * (height - 1));
                Assert.That(pixels[waistRow * width + width / 2].a, Is.GreaterThan(0.9f));

                // Transparent in every corner: the silhouette never touches
                // the texture border, so bilinear filtering has room to fade.
                Assert.That(pixels[0].a, Is.LessThan(0.01f));
                Assert.That(pixels[width - 1].a, Is.LessThan(0.01f));
                Assert.That(pixels[(height - 1) * width].a, Is.LessThan(0.01f));
                Assert.That(pixels[height * width - 1].a, Is.LessThan(0.01f));

                // The antenna bead reaches the top of the texture -- it is
                // the single most legible part of the float at 1080p, so a
                // silhouette that stops well short of the top row means the
                // bead was clipped or never drawn. (The very top row is the
                // bead's anti-aliased edge, hence "solid within a few px of
                // the top" rather than "solid at the top".)
                var highestSolidRow = -1;
                for (var y = height - 1; y >= 0; y--)
                {
                    if (pixels[y * width + width / 2].a > 0.5f)
                    {
                        highestSolidRow = y;
                        break;
                    }
                }
                Assert.That(
                    highestSolidRow,
                    Is.GreaterThanOrEqualTo(height - 6),
                    "The antenna bead must reach the top of the texture.");

                // The dome is shaded, not flat: the shipped float's total
                // lack of shading is the reason it read as 'cheap'.
                var domeRow = Mathf.RoundToInt(0.60f * (height - 1));
                var left = pixels[domeRow * width + width / 2 - 20];
                var right = pixels[domeRow * width + width / 2 + 20];
                Assert.That(left.a, Is.GreaterThan(0.5f));
                Assert.That(right.a, Is.GreaterThan(0.5f));
                Assert.That(
                    left.r + left.g + left.b,
                    Is.GreaterThan(right.r + right.g + right.b),
                    "The dome must be lit from the upper left, so its left side must be brighter than its right.");

                // Byte-identical across calls: no System.Random, so dropping
                // this into the seeded actors builder cannot shift its draw
                // order.
                var secondPixels = second.GetPixels();
                for (var i = 0; i < pixels.Length; i += 97)
                {
                    Assert.That(secondPixels[i], Is.EqualTo(pixels[i]), $"Bobber texture is not deterministic at pixel {i}.");
                }
            }
            finally
            {
                Object.DestroyImmediate(first);
                Object.DestroyImmediate(second);
            }
        }

        [Test]
        public void WakeFoamArt_IsBrightAtTheLeftEnd_AndFadesOutToTheRight()
        {
            var texture = KawaGlintBobberArt.CreateWakeFoamTexture();
            try
            {
                Assert.That(texture.width, Is.EqualTo(KawaGlintBobberArt.WakeFoamTextureWidth));
                Assert.That(texture.height, Is.EqualTo(KawaGlintBobberArt.WakeFoamTextureHeight));

                var pixels = texture.GetPixels();
                var width = texture.width;
                var height = texture.height;
                var ridgeRow = Mathf.RoundToInt(KawaGlintBobberArt.WakeFoamRidgeV * (height - 1));

                var leftAlpha = pixels[ridgeRow * width + Mathf.RoundToInt(width * 0.06f)].a;
                var midAlpha = pixels[ridgeRow * width + Mathf.RoundToInt(width * 0.50f)].a;
                var rightAlpha = pixels[ridgeRow * width + width - 2].a;

                Assert.That(leftAlpha, Is.GreaterThan(0.5f), "The crescent must be solid at its left (leading) end.");
                Assert.That(midAlpha, Is.LessThan(leftAlpha));
                Assert.That(rightAlpha, Is.LessThan(0.05f), "The crescent must fade to nothing at its trailing end -- the flipX mirror depends on it.");
            }
            finally
            {
                Object.DestroyImmediate(texture);
            }
        }
    }
}
