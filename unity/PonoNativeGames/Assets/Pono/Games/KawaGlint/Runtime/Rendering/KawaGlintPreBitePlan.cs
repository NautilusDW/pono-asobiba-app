using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>Which kind of pre-bite event a <see cref="KawaGlintPreBitePlan"/> burst is.</summary>
    public enum KawaGlintPreBiteEventKind
    {
        /// <summary>A small "ちょんちょん" jitter (drives <see cref="KawaGlintBobberState.Twitch"/>). Tapping during this event is a no-op.</summary>
        Shallow,

        /// <summary>A big, sustained pull (drives <see cref="KawaGlintBobberState.BiteSink"/>). Opens a hooking window -- see <see cref="KawaGlintPreBitePlan.IsDeepWindowOpen"/>.</summary>
        Deep
    }

    /// <summary>
    /// A single cast's "前あたり" (pre-bite) plan, split into two strictly
    /// sequential phases:
    /// <list type="number">
    /// <item>
    /// <b>Travel</b> (0 &lt;= elapsed &lt; <see cref="ArrivalSec"/>): the
    /// target fish swims a smooth, monotonic, offset-free line from its
    /// appear point to directly under the bobber
    /// (<see cref="ApproachDisplayProgress"/>). The bobber itself must stay
    /// plain Floating for the whole phase -- nothing here should move it.
    /// </item>
    /// <item>
    /// <b>Events</b> (elapsed &gt;= <see cref="ArrivalSec"/>): a schedule of
    /// <see cref="KawaGlintPreBiteEventKind.Shallow"/> bursts (small
    /// "ちょんちょん" pecks, tapping does nothing) followed -- always, by
    /// construction (see <see cref="Create"/>) -- by
    /// <see cref="KawaGlintPreBiteEventKind.Deep"/> bursts (a strong,
    /// sustained pull that opens a generous hooking window via
    /// <see cref="IsDeepWindowOpen"/>/<see cref="DeepWindowRemaining01"/>).
    /// Tapping during an open Deep window is the caller's (Gameplay layer's)
    /// signal to fast-forward the underlying <c>TsuriSession</c> straight
    /// into the Bite/Renda transition -- this class knows nothing about that
    /// session, it only ever answers "is a deep window open right now" as a
    /// pure function of elapsed time. Missing every Deep window is not a
    /// failure state here either -- by design the plan's last usable
    /// stretch always still leaves room for the existing terminal Bite phase
    /// (the "last, unmissable deep pull") to play out exactly as before.
    /// </item>
    /// </list>
    /// Callers compose the visible target-fish position as
    /// <c>ApproachDisplayProgress(t) + MotionOffset(t)</c> every frame
    /// (see <see cref="KawaGlintActorsController.SetTargetFishApproach"/>).
    /// Because events only start at/after <see cref="ArrivalSec"/> (where
    /// <see cref="ApproachDisplayProgress"/> is already pinned at exactly
    /// 1.0), every peck/pull reads as happening right at the hook, not out
    /// in the middle of the swim-in. Generated once per cast from a
    /// decisional <see cref="System.Random"/> draw so the whole wait period
    /// plays out deterministically once the plan exists.
    ///
    /// Kept free of <see cref="MonoBehaviour"/> (mirrors the sibling
    /// <see cref="KawaGlintSplashMath"/>: plain data + pure functions, only
    /// value types like <see cref="Mathf"/>/<see cref="Vector2"/> from
    /// UnityEngine) so every curve here is directly unit-testable from
    /// EditMode without a scene.
    /// </summary>
    public sealed class KawaGlintPreBitePlan
    {
        /// <summary>Minimum duration of a single Shallow burst (~"ちょんちょん" x2).</summary>
        public const float NibbleDurationMinSec = 0.30f;

        /// <summary>Maximum duration of a single Shallow burst.</summary>
        public const float NibbleDurationMaxSec = 0.55f;

        /// <summary>Minimum silence between any two consecutive events (Shallow-Shallow, Shallow-Deep, or Deep-Deep uses the larger <see cref="DeepGapMinSec"/> instead).</summary>
        public const float NibbleGapMinSec = 0.25f;

        /// <summary>Trailing quiet stretch before the terminal Bite phase -- no events allowed here, so that final "real bite" still reads as distinct.</summary>
        public const float QuietTailSec = 0.45f;

        /// <summary>
        /// Fraction of the total wait at which the target fish's travel
        /// completes and it is considered arrived directly under the
        /// bobber/hook. Events (see <see cref="Create"/>) can only be
        /// scheduled at or after this point -- the fish must actually be at
        /// the hook before it starts pecking/pulling at it. Lowered from the
        /// original 0.55 to 0.35 alongside the wait period itself growing
        /// (<see cref="Pono.KawaGlint.Core.TsuriKawaTuning.WaitSecRange"/>
        /// 2-5s -&gt; 6-10s) so the usable event window still has room for
        /// several Shallow bursts *and* up to two full-length Deep pulls
        /// without shrinking the absolute travel time much.
        /// </summary>
        public const float ArrivalFrac = 0.35f;

        /// <summary>Lower bound (inclusive) on how many Shallow bursts a single cast targets before any width-based degrade (see <see cref="Create"/>).</summary>
        public const int MinShallowEvents = 2;

        /// <summary>Upper bound (inclusive) on how many Shallow bursts a single cast targets.</summary>
        public const int MaxNibbles = 3;

        /// <summary>Upper bound (inclusive) on how many Deep pulls a single cast can generate (weighted 0:20%, 1:50%, 2:30% -- see <see cref="Create"/>).</summary>
        public const int MaxDeepEvents = 2;

        /// <summary>
        /// Duration of a single Deep pull. Long relative to a Shallow burst
        /// (and relative to <see cref="DeepTapGraceSec"/>) on purpose: 3-7yo
        /// players need a generous, unhurried window to notice the "グイン"
        /// and tap during it -- at least as long as the game's existing
        /// "のんびり" pity-assist bite window (2.0s+).
        /// </summary>
        public const float DeepWindowSec = 2.2f;

        /// <summary>Minimum silence between two consecutive Deep pulls.</summary>
        public const float DeepGapMinSec = 0.6f;

        /// <summary>
        /// Grace period after a Deep window closes during which
        /// <see cref="IsDeepWindowOpen"/> still reports true (but
        /// <see cref="DeepWindowRemaining01"/> reports 0) -- forgives a
        /// slightly-late tap without ever counting as a miss/penalty, per
        /// the 3-7yo "no harsh penalties" contract.
        /// </summary>
        public const float DeepTapGraceSec = 0.3f;

        /// <summary>How far (in <see cref="KawaGlintActorsController.SetTargetFishApproach"/> progress units) the target fish lunges in and holds during a Deep pull -- bigger than <see cref="LungeProgressAmp"/> so "just a peck" and "a real strong pull" are visibly different motions, not just different bobber states.</summary>
        public const float DeepLungeProgressAmp = 0.12f;

        /// <summary>How far (in progress units) the target fish lunges in during a Shallow burst.</summary>
        public const float LungeProgressAmp = 0.07f;

        /// <summary>How far the target fish drifts back out immediately after a Shallow burst ends.</summary>
        public const float RetreatProgressAmp = 0.04f;

        /// <summary>Exponential decay time constant for the post-burst/post-pull retreat and release curves.</summary>
        public const float RetreatDecaySec = 0.40f;

        // How long a Deep pull's SmoothStep ramp-in takes before holding flat
        // at full DeepLungeProgressAmp for the remainder of the window.
        // Comfortably shorter than DeepWindowSec so the hold is the dominant
        // sensation (a sustained pull, not just a blip).
        private const float DeepEnvelopeRampSec = 0.25f;

        private const float MinIntensity01 = 0.7f;
        private const float MaxIntensity01 = 1.3f;

        // PickDeepCount weight thresholds: 0 events 20%, 1 event 50%, 2
        // events 30% (cumulative: [0, 0.2) -> 0, [0.2, 0.7) -> 1, [0.7, 1) -> 2).
        private const double DeepCountZeroWeight = 0.2;
        private const double DeepCountZeroPlusOneWeight = 0.7;

        private readonly struct BiteEvent
        {
            public readonly KawaGlintPreBiteEventKind Kind;
            public readonly float Start;
            public readonly float End;
            public readonly float Duration;
            public readonly float Intensity01;

            public BiteEvent(KawaGlintPreBiteEventKind kind, float start, float end, float intensity01)
            {
                Kind = kind;
                Start = start;
                End = end;
                Duration = end - start;
                Intensity01 = intensity01;
            }
        }

        private readonly List<BiteEvent> _events;
        private readonly float _waitTotalSec;

        private KawaGlintPreBitePlan(List<BiteEvent> events, float waitTotalSec)
        {
            _events = events;
            _waitTotalSec = waitTotalSec;
        }

        /// <summary>Number of pre-bite events (Shallow + Deep combined) this plan will play (0 for very short waits -- falls back to the old "no pre-bite" behavior).</summary>
        public int EventCount => _events.Count;

        /// <summary>
        /// Seconds since cast landed at which the target fish's travel
        /// completes (<see cref="ApproachDisplayProgress"/> reaches exactly
        /// 1.0) and it becomes eligible to peck/pull. <see cref="ArrivalFrac"/>
        /// of this plan's wait total.
        /// </summary>
        public float ArrivalSec => ArrivalFrac * _waitTotalSec;

        /// <summary>Shallow or Deep? See <see cref="KawaGlintPreBiteEventKind"/>.</summary>
        public KawaGlintPreBiteEventKind EventKindAt(int index) => _events[index].Kind;

        /// <summary>Start time (seconds since cast landed) of event <paramref name="index"/>.</summary>
        public float EventStartSec(int index) => _events[index].Start;

        /// <summary>End time (seconds since cast landed) of event <paramref name="index"/>.</summary>
        public float EventEndSec(int index) => _events[index].End;

        /// <summary>Randomized twitch-strength multiplier (<see cref="MinIntensity01"/>..<see cref="MaxIntensity01"/>) for event <paramref name="index"/>. Only meaningful for <see cref="KawaGlintPreBiteEventKind.Shallow"/> events -- Deep events always report 1.</summary>
        public float EventIntensity01(int index) => _events[index].Intensity01;

        /// <summary>Index of the event active at <paramref name="elapsedSec"/>, or -1 if none is active (half-open: [start, end)).</summary>
        public int CurrentEventIndex(float elapsedSec)
        {
            for (var i = 0; i < _events.Count; i++)
            {
                var e = _events[i];
                if (elapsedSec >= e.Start && elapsedSec < e.End)
                {
                    return i;
                }
            }
            return -1;
        }

        /// <summary>
        /// True while a Deep pull's hooking window is open at
        /// <paramref name="elapsedSec"/> -- either strictly inside the pull
        /// itself, or within the trailing <see cref="DeepTapGraceSec"/>
        /// forgiveness period right after it closes. The caller (Gameplay
        /// layer) treats a tap anywhere in this range as a successful hook;
        /// this method itself never judges anything, it only reports the
        /// schedule.
        /// </summary>
        public bool IsDeepWindowOpen(float elapsedSec)
        {
            for (var i = 0; i < _events.Count; i++)
            {
                var e = _events[i];
                if (e.Kind != KawaGlintPreBiteEventKind.Deep)
                {
                    continue;
                }
                if (elapsedSec >= e.Start && elapsedSec < e.End + DeepTapGraceSec)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// 1 at the instant an active Deep pull's window opens, sliding down
        /// to 0 as it approaches its own <see cref="DeepWindowSec"/>-later
        /// close -- a pure visualization source for a timing-ring style UI.
        /// Deliberately 0 outside an active window, including during the
        /// <see cref="DeepTapGraceSec"/> grace period (a tap still hooks
        /// there via <see cref="IsDeepWindowOpen"/>, but there is nothing
        /// left to visually count down).
        /// </summary>
        public float DeepWindowRemaining01(float elapsedSec)
        {
            for (var i = 0; i < _events.Count; i++)
            {
                var e = _events[i];
                if (e.Kind != KawaGlintPreBiteEventKind.Deep)
                {
                    continue;
                }
                if (elapsedSec >= e.Start && elapsedSec < e.End)
                {
                    var duration = e.Duration > 0f ? e.Duration : DeepWindowSec;
                    return Mathf.Clamp01(1f - (elapsedSec - e.Start) / duration);
                }
            }
            return 0f;
        }

        /// <summary>
        /// Pure travel curve (0..1) to feed
        /// <see cref="KawaGlintActorsController.SetTargetFishApproach"/>
        /// every frame while waiting: a plain, monotonic, offset-free
        /// cast-to-hook progression that reaches exactly 1.0 at
        /// <see cref="ArrivalSec"/> and stays pinned there for the rest of
        /// the wait (including through the Bite phase's own
        /// <c>SetTargetFishApproach(1f, ...)</c> call, so there is no
        /// discontinuity at the phase boundary). Contains zero lunge/retreat
        /// terms by design -- those live entirely in <see cref="MotionOffset"/>
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
        /// Local oscillation (centered on 0, meant to be added on top of
        /// <see cref="ApproachDisplayProgress"/> once it has reached 1.0)
        /// driven by the same event schedule as <see cref="CurrentEventIndex"/>:
        /// <list type="bullet">
        /// <item>Shallow: a lunge-in bump during the burst and a drift-back
        /// right after (unchanged from the original single-phase "Nibble"
        /// design) -- both exactly 0 at the burst's own boundaries so pieced
        /// curves never visibly jump.</item>
        /// <item>Deep: a SmoothStep ramp-in over the first
        /// <see cref="DeepEnvelopeRampSec"/>, held flat at
        /// <see cref="DeepLungeProgressAmp"/> for the remainder of the
        /// pull, then an exponential release after the pull ends -- the
        /// release starts at exactly the held value (continuous) and decays
        /// toward 0.</item>
        /// </list>
        /// Both terms are faded out during the trailing <see cref="QuietTailSec"/>
        /// so the composed curve still lands exactly on 1.0 at
        /// t == waitTotalSec (continuous with the Bite phase's own
        /// SetTargetFishApproach(1f, ...) call). Since every event (see
        /// <see cref="Create"/>) only ever starts at or after
        /// <see cref="ArrivalSec"/>, this is guaranteed to be exactly 0 for
        /// every elapsedSec before arrival.
        /// </summary>
        public float MotionOffset(float elapsedSec)
        {
            if (_waitTotalSec <= 0f)
            {
                return 0f;
            }

            var t = Mathf.Max(0f, elapsedSec);
            var offset = 0f;
            for (var i = 0; i < _events.Count; i++)
            {
                var e = _events[i];
                if (e.Kind == KawaGlintPreBiteEventKind.Shallow)
                {
                    offset += ShallowMotion(e, t);
                }
                else
                {
                    offset += DeepMotion(e, t);
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

        // Sin(pi*u) bump: exactly 0 at u==0 (burst start) and u==1 (burst
        // end), peaking at LungeProgressAmp mid-burst -- so it never needs
        // to be pieced against the retreat term below, both are already 0 at
        // the shared boundary.
        private static float ShallowMotion(in BiteEvent e, float t)
        {
            if (t >= e.Start && t <= e.End)
            {
                var u = e.Duration > 0f ? (t - e.Start) / e.Duration : 0f;
                return LungeProgressAmp * Mathf.Sin(Mathf.PI * u);
            }
            if (t > e.End)
            {
                // Critically-damped-impulse shape: 0 at x==0 (continuous with
                // the lunge term's own 0 at u==1), rises to exactly 1 at
                // x==1 (sinceEnd == RetreatDecaySec, so the peak drift-back
                // still reaches -RetreatProgressAmp), then decays back toward
                // 0 for x > 1.
                var sinceEnd = t - e.End;
                var x = sinceEnd / RetreatDecaySec;
                return -RetreatProgressAmp * x * Mathf.Exp(1f - x);
            }
            return 0f;
        }

        // SmoothStep ramp-in (0 -> 1 over DeepEnvelopeRampSec) then a flat
        // hold at 1, so the fish visibly lunges in hard and STAYS pulled taut
        // for the bulk of the window -- a distinct "hold, don't just peck"
        // motion versus ShallowMotion's brief bump. After the window closes,
        // an exponential release (1 at x==0, continuous with the held
        // plateau, decaying toward 0) lets the fish ease back rather than
        // snapping.
        private static float DeepMotion(in BiteEvent e, float t)
        {
            if (t >= e.Start && t <= e.End)
            {
                var u = t - e.Start;
                var ramp = u < DeepEnvelopeRampSec ? Mathf.SmoothStep(0f, 1f, u / DeepEnvelopeRampSec) : 1f;
                return DeepLungeProgressAmp * ramp;
            }
            if (t > e.End)
            {
                var sinceEnd = t - e.End;
                var x = sinceEnd / RetreatDecaySec;
                return DeepLungeProgressAmp * Mathf.Exp(-x);
            }
            return 0f;
        }

        /// <summary>
        /// Generates a new plan for a cast whose wait period lasts
        /// <paramref name="waitTotalSec"/> seconds, drawing from
        /// <paramref name="random"/>. Deterministic given the same random
        /// state + waitTotalSec (EditMode reproducibility contract).
        ///
        /// Draws a Shallow-burst target count of <see cref="MinShallowEvents"/>..<see cref="MaxNibbles"/>
        /// and a Deep-pull target count of 0..<see cref="MaxDeepEvents"/>
        /// (weighted 20/50/30), then degrades Deep first (2-&gt;1-&gt;0) and
        /// only then Shallow (3-&gt;2-&gt;1-&gt;0) until the schedule fits
        /// inside the usable window [<see cref="ArrivalFrac"/>*T,
        /// T-<see cref="QuietTailSec"/>] -- so a short post-miss recast wait
        /// still degrades gracefully to the old "zero events" fallback
        /// rather than throwing or overlapping bursts. All Shallow events are
        /// always scheduled strictly before all Deep events (never
        /// interleaved), matching the "a few light nibbles, then the strong
        /// pull(s)" story the feature is specced around.
        /// </summary>
        public static KawaGlintPreBitePlan Create(System.Random random, float waitTotalSec)
        {
            var events = new List<BiteEvent>();
            if (random == null || waitTotalSec <= 0f)
            {
                return new KawaGlintPreBitePlan(events, waitTotalSec);
            }

            var usableStart = ArrivalFrac * waitTotalSec;
            var usableEnd = waitTotalSec - QuietTailSec;
            var usableWidth = usableEnd - usableStart;

            if (usableWidth < NibbleDurationMinSec)
            {
                return new KawaGlintPreBitePlan(events, waitTotalSec);
            }

            var shallowCount = MinShallowEvents + random.Next(0, MaxNibbles - MinShallowEvents + 1); // 2..3
            var deepCount = PickDeepCount(random); // 0..2, weighted

            while (RequiredWidth(shallowCount, deepCount) > usableWidth)
            {
                if (deepCount > 0)
                {
                    deepCount--;
                }
                else if (shallowCount > 0)
                {
                    shallowCount--;
                }
                else
                {
                    break;
                }
            }

            if (shallowCount == 0 && deepCount == 0)
            {
                return new KawaGlintPreBitePlan(events, waitTotalSec);
            }

            // Randomized duration per Shallow burst, then scaled down (never
            // below NibbleDurationMinSec) so the total still leaves room for
            // the Deep block + every mandatory gap within usableWidth.
            var shallowDurations = new float[shallowCount];
            var shallowSum = 0f;
            for (var i = 0; i < shallowCount; i++)
            {
                shallowDurations[i] = NibbleDurationMinSec + (float)random.NextDouble() * (NibbleDurationMaxSec - NibbleDurationMinSec);
                shallowSum += shallowDurations[i];
            }

            var fixedGaps = FixedGapWidth(shallowCount, deepCount);
            var deepFixedWidth = deepCount * DeepWindowSec;
            var shallowMinWidth = shallowCount * NibbleDurationMinSec;

            var allowedShallowExtra = Mathf.Max(0f, usableWidth - fixedGaps - deepFixedWidth - shallowMinWidth);
            var shallowExtra = shallowSum - shallowMinWidth;
            if (shallowExtra > allowedShallowExtra && shallowExtra > 0f)
            {
                var scale = allowedShallowExtra / shallowExtra;
                for (var i = 0; i < shallowCount; i++)
                {
                    shallowDurations[i] = NibbleDurationMinSec + (shallowDurations[i] - NibbleDurationMinSec) * scale;
                }
                shallowSum = shallowMinWidth + allowedShallowExtra;
            }

            var leftover = Mathf.Max(0f, usableWidth - shallowSum - deepFixedWidth - fixedGaps);

            // Distribute leftover slack across a leading offset and every gap
            // slot (Shallow-Shallow gaps, the Shallow->Deep gap if both
            // blocks are present, and Deep-Deep gaps) via random weights, so
            // bursts/pulls don't always sit at the earliest possible tick.
            var gapSlotCount = 1
                + Mathf.Max(0, shallowCount - 1)
                + (shallowCount > 0 && deepCount > 0 ? 1 : 0)
                + Mathf.Max(0, deepCount - 1);
            var weights = new float[gapSlotCount];
            var weightSum = 0f;
            for (var i = 0; i < gapSlotCount; i++)
            {
                weights[i] = (float)random.NextDouble();
                weightSum += weights[i];
            }
            if (weightSum <= 0f)
            {
                weightSum = 1f;
            }

            var weightIndex = 0;
            float NextSlack()
            {
                var slack = leftover * weights[weightIndex] / weightSum;
                weightIndex++;
                return slack;
            }

            var cursor = usableStart + NextSlack();

            for (var i = 0; i < shallowCount; i++)
            {
                var start = cursor;
                var end = start + shallowDurations[i];
                var intensity = MinIntensity01 + (float)random.NextDouble() * (MaxIntensity01 - MinIntensity01);
                events.Add(new BiteEvent(KawaGlintPreBiteEventKind.Shallow, start, end, intensity));

                cursor = end + NibbleGapMinSec;
                if (i < shallowCount - 1)
                {
                    cursor += NextSlack();
                }
            }

            if (shallowCount > 0 && deepCount > 0)
            {
                cursor += NextSlack();
            }

            for (var i = 0; i < deepCount; i++)
            {
                var start = cursor;
                var end = start + DeepWindowSec;
                events.Add(new BiteEvent(KawaGlintPreBiteEventKind.Deep, start, end, 1f));

                cursor = end + DeepGapMinSec;
                if (i < deepCount - 1)
                {
                    cursor += NextSlack();
                }
            }

            return new KawaGlintPreBitePlan(events, waitTotalSec);
        }

        private static int PickDeepCount(System.Random random)
        {
            var r = random.NextDouble();
            if (r < DeepCountZeroWeight)
            {
                return 0;
            }
            if (r < DeepCountZeroPlusOneWeight)
            {
                return 1;
            }
            return 2;
        }

        private static float FixedGapWidth(int shallowCount, int deepCount)
        {
            var shallowInnerGaps = shallowCount > 1 ? (shallowCount - 1) * NibbleGapMinSec : 0f;
            var shallowToDeepGap = shallowCount > 0 && deepCount > 0 ? NibbleGapMinSec : 0f;
            var deepInnerGaps = deepCount > 1 ? (deepCount - 1) * DeepGapMinSec : 0f;
            return shallowInnerGaps + shallowToDeepGap + deepInnerGaps;
        }

        private static float RequiredWidth(int shallowCount, int deepCount)
        {
            return shallowCount * NibbleDurationMinSec + deepCount * DeepWindowSec + FixedGapWidth(shallowCount, deepCount);
        }
    }
}
