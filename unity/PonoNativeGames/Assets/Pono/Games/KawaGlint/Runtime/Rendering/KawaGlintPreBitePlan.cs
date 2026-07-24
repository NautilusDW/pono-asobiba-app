using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// A single cast's "前あたり" (pre-bite nibble) plan, split into two
    /// strictly sequential phases:
    /// <list type="number">
    /// <item>
    /// <b>Travel</b> (0 &lt;= elapsed &lt; <see cref="ArrivalSec"/>): the
    /// target fish swims a smooth, monotonic, offset-free line from its
    /// appear point to directly under the bobber
    /// (<see cref="ApproachDisplayProgress"/>). The bobber itself must stay
    /// plain Floating for the whole phase -- nothing here should move it.
    /// </item>
    /// <item>
    /// <b>Nibble</b> (elapsed &gt;= <see cref="ArrivalSec"/>): 1-3 short
    /// windows, randomly placed and sized inside the remainder of the wait
    /// period, during which the (now arrived) target fish pecks at the hook
    /// -- a small lunge-in/drift-back oscillation centered on the arrival
    /// point (<see cref="NibbleOffset"/>) -- while the bobber twitches
    /// (driven by the caller via <see cref="IsNibbling"/> /
    /// <see cref="CurrentNibbleIndex"/>).
    /// </item>
    /// </list>
    /// Callers compose the visible position as
    /// <c>ApproachDisplayProgress(t) + NibbleOffset(t)</c> every frame
    /// (see <see cref="KawaGlintActorsController.SetTargetFishApproach"/>).
    /// Because nibbles only start at/after <see cref="ArrivalSec"/> (where
    /// <see cref="ApproachDisplayProgress"/> is already pinned at exactly
    /// 1.0), the peck reads as happening right at the hook, not out in the
    /// middle of the swim-in -- fixes the reported bug where the fish
    /// appeared to hitch and reverse direction while still far from the
    /// bobber. Generated once per cast from a decisional
    /// <see cref="System.Random"/> draw so the whole wait period plays out
    /// deterministically once the plan exists.
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

        /// <summary>
        /// Fraction of the total wait at which the target fish's travel
        /// completes and it is considered arrived directly under the
        /// bobber/hook. Nibbles (see <see cref="Create"/>) can only be
        /// scheduled at or after this point -- the fish must actually be at
        /// the hook before it starts pecking at it. Picked mid-range of the
        /// "50-60%" the feature was specced at, leaving comfortable slack
        /// before the trailing <see cref="QuietTailSec"/>.
        /// </summary>
        public const float ArrivalFrac = 0.55f;

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

        /// <summary>
        /// Seconds since cast landed at which the target fish's travel
        /// completes (<see cref="ApproachDisplayProgress"/> reaches exactly
        /// 1.0) and it becomes eligible to nibble. <see cref="ArrivalFrac"/>
        /// of this plan's wait total.
        /// </summary>
        public float ArrivalSec => ArrivalFrac * _waitTotalSec;

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
        /// Pure travel curve (0..1) to feed
        /// <see cref="KawaGlintActorsController.SetTargetFishApproach"/>
        /// every frame while waiting: a plain, monotonic, offset-free
        /// cast-to-hook progression that reaches exactly 1.0 at
        /// <see cref="ArrivalSec"/> and stays pinned there for the rest of
        /// the wait (including through the Bite phase's own
        /// <c>SetTargetFishApproach(1f, ...)</c> call, so there is no
        /// discontinuity at the phase boundary). Contains zero lunge/retreat
        /// terms by design -- those live entirely in <see cref="NibbleOffset"/>
        /// so the swim-in never hitches or reverses direction while the fish
        /// is still travelling.
        /// </summary>
        public float ApproachDisplayProgress(float elapsedSec)
        {
            if (_waitTotalSec <= 0f)
            {
                return 1f;
            }

            var arrivalSec = ArrivalSec;
            if (arrivalSec <= 0f)
            {
                return 1f;
            }

            var t = Mathf.Max(0f, elapsedSec);
            if (t >= arrivalSec)
            {
                return 1f;
            }

            return t / arrivalSec;
        }

        /// <summary>
        /// Local "ちょんちょん" oscillation (centered on 0, meant to be added
        /// on top of <see cref="ApproachDisplayProgress"/> once it has
        /// reached 1.0) driven by the same nibble-burst schedule as
        /// <see cref="CurrentNibbleIndex"/>: a lunge-in bump during each
        /// burst and a drift-back right after, both faded out during the
        /// trailing <see cref="QuietTailSec"/> so the composed curve still
        /// lands exactly on 1.0 at t == waitTotalSec (continuous with the
        /// Bite phase's SetTargetFishApproach(1f, ...) call). The lunge term
        /// is exactly 0 at u == 1 (nibble.End) and the retreat term below is
        /// deliberately shaped to also start at exactly 0 at sinceEnd == 0
        /// -- otherwise the two pieced-together curves would jump by
        /// ~RetreatProgressAmp in a single frame right at the burst
        /// boundary, reading as the target fish teleporting. Since every
        /// nibble burst (see <see cref="Create"/>) only ever starts at or
        /// after <see cref="ArrivalSec"/>, this is guaranteed to be exactly
        /// 0 for every elapsedSec before arrival.
        /// </summary>
        public float NibbleOffset(float elapsedSec)
        {
            if (_waitTotalSec <= 0f)
            {
                return 0f;
            }

            var t = Mathf.Max(0f, elapsedSec);
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

            return offset;
        }

        /// <summary>
        /// Generates a new plan for a cast whose wait period lasts
        /// <paramref name="waitTotalSec"/> seconds, drawing from
        /// <paramref name="random"/>. Deterministic given the same random
        /// state + waitTotalSec (EditMode reproducibility contract). Nibble
        /// count is 1-3, randomly chosen and then capped so every burst
        /// (>= <see cref="NibbleDurationMinSec"/>) plus every required gap
        /// (>= <see cref="NibbleGapMinSec"/>) still fits inside the usable
        /// window [<see cref="ArrivalFrac"/>*T, T-<see cref="QuietTailSec"/>].
        /// Anchoring the window start at arrival (rather than some earlier
        /// fraction of the whole wait) is what guarantees a nibble can never
        /// fire while the fish is still travelling. Very short waits (usable
        /// window narrower than one minimum burst, or arrival landing at/after
        /// the quiet tail) fall back to zero nibbles -- the old "no pre-bite"
        /// behavior.
        /// </summary>
        public static KawaGlintPreBitePlan Create(System.Random random, float waitTotalSec)
        {
            var nibbles = new List<Nibble>();
            if (random == null || waitTotalSec <= 0f)
            {
                return new KawaGlintPreBitePlan(nibbles, waitTotalSec);
            }

            var usableStart = ArrivalFrac * waitTotalSec;
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
