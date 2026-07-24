using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// A single cast's "前あたり" (pre-bite nibble) plan: 1-3 short windows,
    /// randomly placed and sized inside the wait period, during which the
    /// target fish visibly lunges toward the bobber and drifts back a little
    /// (<see cref="ApproachDisplayProgress"/>) while the bobber itself should
    /// twitch (driven by the caller via <see cref="IsNibbling"/> /
    /// <see cref="CurrentNibbleIndex"/>). Generated once per cast from a
    /// decisional <see cref="System.Random"/> draw so the whole wait period plays
    /// out deterministically once the plan exists.
    ///
    /// Kept free of <see cref="MonoBehaviour"/> (mirrors the sibling
    /// <see cref="KawaGlintSplashMath"/>: plain data + pure functions, only
    /// value types like <see cref="Mathf"/>/<see cref="Vector2"/> from
    /// UnityEngine) so every curve here is directly unit-testable from
    /// EditMode without a scene.
    /// </summary>
    public sealed class KawaGlintPreBitePlan
    {
        /// <summary>Minimum duration of a single nibble burst (~"ちょんちょん" x2).</summary>
        public const float NibbleDurationMinSec = 0.30f;

        /// <summary>Maximum duration of a single nibble burst.</summary>
        public const float NibbleDurationMaxSec = 0.55f;

        /// <summary>Minimum silence between two consecutive nibble bursts.</summary>
        public const float NibbleGapMinSec = 0.25f;

        /// <summary>Trailing quiet stretch before the real bite -- no nibbles allowed here, so the real bite reads as distinct.</summary>
        public const float QuietTailSec = 0.45f;

        /// <summary>Fraction of the total wait after which nibbles may start (the cast/landing itself should stay quiet).</summary>
        public const float WindowStartFrac = 0.35f;

        /// <summary>Upper bound (inclusive) on how many nibble bursts a single cast can generate.</summary>
        public const int MaxNibbles = 3;

        /// <summary>How far (in <see cref="KawaGlintActorsController.SetTargetFishApproach"/> progress units) the target fish lunges in during a nibble burst.</summary>
        public const float LungeProgressAmp = 0.07f;

        /// <summary>How far the target fish drifts back out immediately after a nibble burst ends.</summary>
        public const float RetreatProgressAmp = 0.04f;

        /// <summary>Exponential decay time constant for the post-nibble retreat.</summary>
        public const float RetreatDecaySec = 0.40f;

        private const float MinIntensity01 = 0.7f;
        private const float MaxIntensity01 = 1.3f;

        private readonly struct Nibble
        {
            public readonly float Start;
            public readonly float End;
            public readonly float Duration;
            public readonly float Intensity01;

            public Nibble(float start, float end, float intensity01)
            {
                Start = start;
                End = end;
                Duration = end - start;
                Intensity01 = intensity01;
            }
        }

        private readonly List<Nibble> _nibbles;
        private readonly float _waitTotalSec;

        private KawaGlintPreBitePlan(List<Nibble> nibbles, float waitTotalSec)
        {
            _nibbles = nibbles;
            _waitTotalSec = waitTotalSec;
        }

        /// <summary>Number of nibble bursts this plan will play (0 for very short waits -- falls back to the old "no pre-bite" behavior).</summary>
        public int NibbleCount => _nibbles.Count;

        /// <summary>Start time (seconds since cast landed) of nibble burst <paramref name="index"/>.</summary>
        public float NibbleStartSec(int index) => _nibbles[index].Start;

        /// <summary>End time (seconds since cast landed) of nibble burst <paramref name="index"/>.</summary>
        public float NibbleEndSec(int index) => _nibbles[index].End;

        /// <summary>Randomized twitch-strength multiplier (<see cref="MinIntensity01"/>..<see cref="MaxIntensity01"/>) for nibble burst <paramref name="index"/>.</summary>
        public float NibbleIntensity01(int index) => _nibbles[index].Intensity01;

        /// <summary>Index of the nibble burst active at <paramref name="elapsedSec"/>, or -1 if none is active (half-open: [start, end)).</summary>
        public int CurrentNibbleIndex(float elapsedSec)
        {
            for (var i = 0; i < _nibbles.Count; i++)
            {
                var nibble = _nibbles[i];
                if (elapsedSec >= nibble.Start && elapsedSec < nibble.End)
                {
                    return i;
                }
            }
            return -1;
        }

        /// <summary>True while a nibble burst is active at <paramref name="elapsedSec"/>.</summary>
        public bool IsNibbling(float elapsedSec) => CurrentNibbleIndex(elapsedSec) >= 0;

        /// <summary>
        /// Display progress (0..1) to feed <see cref="KawaGlintActorsController.SetTargetFishApproach"/>
        /// every frame while waiting: the linear cast-to-bite progress
        /// (t/waitTotal) plus a lunge-in bump during each nibble burst and a
        /// drift-back right after, both faded out during the trailing
        /// <see cref="QuietTailSec"/> so the curve lands exactly on 1.0 at
        /// t == waitTotalSec (continuous with the Bite phase's
        /// SetTargetFishApproach(1f, ...) call). The lunge term is exactly 0
        /// at u == 1 (nibble.End) and the retreat term below is deliberately
        /// shaped to also start at exactly 0 at sinceEnd == 0 -- otherwise the
        /// two pieced-together curves would jump by ~RetreatProgressAmp in a
        /// single frame right at the burst boundary, reading as the target
        /// fish teleporting.
        /// </summary>
        public float ApproachDisplayProgress(float elapsedSec)
        {
            if (_waitTotalSec <= 0f)
            {
                return 1f;
            }

            var t = Mathf.Max(0f, elapsedSec);
            if (t >= _waitTotalSec)
            {
                return 1f;
            }

            var baseProgress = t / _waitTotalSec;
            var offset = 0f;
            for (var i = 0; i < _nibbles.Count; i++)
            {
                var nibble = _nibbles[i];
                if (t >= nibble.Start && t <= nibble.End)
                {
                    var u = nibble.Duration > 0f ? (t - nibble.Start) / nibble.Duration : 0f;
                    offset += LungeProgressAmp * Mathf.Sin(Mathf.PI * u);
                }
                else if (t > nibble.End)
                {
                    // Critically-damped-impulse shape: (x * e^(1-x)) is 0 at
                    // x == 0 (continuous with the lunge term's own 0 at
                    // u == 1), rises to exactly 1 at x == 1 (sinceEnd ==
                    // RetreatDecaySec, so the peak drift-back still reaches
                    // -RetreatProgressAmp), then decays back toward 0 for
                    // x > 1. No new tunable constant needed -- reuses
                    // RetreatDecaySec as both the rise and decay time scale.
                    var sinceEnd = t - nibble.End;
                    var x = sinceEnd / RetreatDecaySec;
                    offset -= RetreatProgressAmp * x * Mathf.Exp(1f - x);
                }
            }

            var quietTailStart = _waitTotalSec - QuietTailSec;
            if (t >= quietTailStart)
            {
                var span = Mathf.Max(0.0001f, _waitTotalSec - quietTailStart);
                var tailU = Mathf.Clamp01((t - quietTailStart) / span);
                var fade = 1f - Mathf.SmoothStep(0f, 1f, tailU);
                offset *= fade;
            }

            return Mathf.Clamp01(baseProgress + offset);
        }

        /// <summary>
        /// Generates a new plan for a cast whose wait period lasts
        /// <paramref name="waitTotalSec"/> seconds, drawing from
        /// <paramref name="random"/>. Deterministic given the same random
        /// state + waitTotalSec (EditMode reproducibility contract). Nibble
        /// count is 1-3, randomly chosen and then capped so every burst
        /// (>= <see cref="NibbleDurationMinSec"/>) plus every required gap
        /// (>= <see cref="NibbleGapMinSec"/>) still fits inside the usable
        /// window [<see cref="WindowStartFrac"/>*T, T-<see cref="QuietTailSec"/>].
        /// Very short waits (usable window narrower than one minimum burst)
        /// fall back to zero nibbles -- the old "no pre-bite" behavior.
        /// </summary>
        public static KawaGlintPreBitePlan Create(System.Random random, float waitTotalSec)
        {
            var nibbles = new List<Nibble>();
            if (random == null || waitTotalSec <= 0f)
            {
                return new KawaGlintPreBitePlan(nibbles, waitTotalSec);
            }

            var usableStart = WindowStartFrac * waitTotalSec;
            var usableEnd = waitTotalSec - QuietTailSec;
            var usableWidth = usableEnd - usableStart;

            if (usableWidth < NibbleDurationMinSec)
            {
                return new KawaGlintPreBitePlan(nibbles, waitTotalSec);
            }

            var n = 1 + random.Next(0, MaxNibbles); // 1..3
            while (n > 1 && n * NibbleDurationMinSec + (n - 1) * NibbleGapMinSec > usableWidth)
            {
                n--;
            }

            // Randomized duration per burst, then scaled down (never below
            // NibbleDurationMinSec) so the sum still leaves room for the
            // mandatory inter-burst gaps within usableWidth.
            var durations = new float[n];
            var sumDur = 0f;
            for (var i = 0; i < n; i++)
            {
                durations[i] = NibbleDurationMinSec + (float)random.NextDouble() * (NibbleDurationMaxSec - NibbleDurationMinSec);
                sumDur += durations[i];
            }

            var gapTotal = (n - 1) * NibbleGapMinSec;
            var allowedExtra = Mathf.Max(0f, usableWidth - n * NibbleDurationMinSec - gapTotal);
            var totalExtra = sumDur - n * NibbleDurationMinSec;
            if (totalExtra > allowedExtra && totalExtra > 0f)
            {
                var scale = allowedExtra / totalExtra;
                for (var i = 0; i < n; i++)
                {
                    durations[i] = NibbleDurationMinSec + (durations[i] - NibbleDurationMinSec) * scale;
                }
                sumDur = n * NibbleDurationMinSec + allowedExtra;
            }

            var leftover = Mathf.Max(0f, usableWidth - sumDur - gapTotal);

            // Distribute the leftover slack across a leading offset (before
            // the first burst) and the (n-1) inter-burst gaps beyond their
            // guaranteed minimum, so bursts don't always sit at the exact
            // earliest-possible tick and gaps don't always sit at exactly
            // NibbleGapMinSec. One extra random weight slot is deliberately
            // left unused (trailing slack) so the sum of consumed weights is
            // always <= leftover.
            var weightCount = n + 1;
            var weights = new float[weightCount];
            var weightSum = 0f;
            for (var i = 0; i < weightCount; i++)
            {
                weights[i] = (float)random.NextDouble();
                weightSum += weights[i];
            }
            if (weightSum <= 0f)
            {
                weightSum = 1f;
            }

            var leadingOffset = leftover * weights[0] / weightSum;
            var cursor = usableStart + leadingOffset;
            for (var i = 0; i < n; i++)
            {
                var start = cursor;
                var end = start + durations[i];
                var intensity = MinIntensity01 + (float)random.NextDouble() * (MaxIntensity01 - MinIntensity01);
                nibbles.Add(new Nibble(start, end, intensity));

                cursor = end + NibbleGapMinSec;
                if (i < n - 1)
                {
                    cursor += leftover * weights[i + 1] / weightSum;
                }
            }

            return new KawaGlintPreBitePlan(nibbles, waitTotalSec);
        }
    }
}
