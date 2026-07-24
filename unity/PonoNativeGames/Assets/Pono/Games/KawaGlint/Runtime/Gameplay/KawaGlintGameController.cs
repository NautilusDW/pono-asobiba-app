using System.Collections;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Input;
using Pono.KawaGlint.Rendering;
using Pono.KawaGlint.UI;
using UnityEngine;

namespace Pono.KawaGlint.Gameplay
{
    /// <summary>
    /// Wires the pure C# <see cref="TsuriCore"/> state machine to KawaGlint's
    /// presentation layer (<see cref="KawaGlintActorsController"/> /
    /// <see cref="KawaGlintHud"/>) and to tap input
    /// (<see cref="KawaGlintInputSurface"/>). This is the only KawaGlint type
    /// that knows about both the Core and Rendering modules at once -- Core
    /// never references UnityEngine, and Rendering never references Core, by
    /// design (mirrors the web version's core.js/game.js split).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintGameController : MonoBehaviour
    {
        private const string PhaseWordIdle = "どこに なげる？";
        private const string NarrationIdle = "みずめんを タップして なげてみよう！";
        private const string NarrationTapWater = "みずめんを タップしてね";
        private const string PhaseWordWait = "まとう…";
        private const string NarrationWait = "ウキを みててね";
        private const string PhaseWordPreBite = "…きたかも！";
        private const string NarrationPreBite = "…きたかも？";
        private const string PhaseWordBite = "いまだ！タップ！";
        private const string NarrationBite = "いまだ！ タップ！";
        private const string NarrationRenda = "ぽんぽん タップで ひっぱろう！";
        private const string RendaBigTextPull = "ひっぱれ！！";
        private const string RendaBigTextTapTap = "タップ タップ！";
        private const string PhaseWordEscaped = "にげちゃった…";
        private const string NarrationEscaped = "およいで いっちゃった。でも また くるよ";
        private const string PhaseWordLanded = "つれた！";
        private const string NarrationHelped = "ポノも てつだうよ！";
        private const string CatchLabelEdible = "つれた！";
        private const string CatchLabelTreasure = "たからものを みつけたよ！ ずかんに のせようね";
        private const string FlyWordWait = "まだまだ〜";
        private const string FlyWordBig = "すごい！";
        private const string SpeciesUnknownName = "なにか";

        private static readonly string[] RendaFlyWords = { "いいぞ！", "そのちょうし！", "もうすこし！" };

        private const float RendaStuckFloorPct = 30.5f;
        // World-space Y offset above the waterline where the timing ring is
        // drawn (module B) -- roughly above the bobber's resting height so it
        // reads as "guiding the bobber" without covering it.
        private const float TimingRingWorldYOffset = 0.9f;
        private const float ShoreTapMarginWorld = 0.8f;
        private const float CastMinMarginWorld = 1.2f;
        private const float CastMaxMarginWorld = 0.8f;
        private const float CastFlightSeconds = 0.45f;
        private const float FloorHeldStuckSec = 2f;
        private const float EscapedReadySec = 1.6f;
        private const float LandedReadySec = 2.4f;
        private const float LandedHelpedReadySec = 3.3f;

        private KawaGlintActorsController _actors;
        private KawaGlintHud _hud;
        private KawaGlintInputSurface _input;
        private Camera _camera;
        private KawaStageInfo _stage;
        private System.Random _random;
        private TsuriSession _session;

        private bool _configured;
        private float _targetX;
        private float _waitTotalSec;
        private KawaGlintPreBitePlan _preBitePlan;
        private bool _nibbleActive;
        private int _rendaCombo;
        private int _flyWordIndex;
        private Coroutine _readyRoutine;

        // Timing-ring UI state (module B, item 2). _biteWindowTotalSec is
        // captured once at Bite entry and never touched again during that
        // bite -- BiteWindowRemaining01 is then a pure function of the live
        // session's BiteWindowRemainingSec against that fixed total, so it
        // stays exactly in sync even when pity/assist stretch the window
        // (2.0s..4.8s+) without any per-mode special-casing here.
        private float _biteWindowTotalSec;
        private Vector2 _lastRingViewport;

        /// <summary>Current session phase (test/inspection surface).</summary>
        public TsuriPhase Phase => _session != null ? _session.Phase : TsuriPhase.Idle;

        /// <summary>Number of fish/treasures landed this session.</summary>
        public int CaughtCount => _session != null ? _session.CaughtLog.Count : 0;

        /// <summary>Taps registered in the current renda (連打) bout.</summary>
        public int RendaComboCount => _rendaCombo;

        /// <summary>Species id of the current bite/renda target, or null outside those phases.</summary>
        public string CurrentSpeciesId => _session != null ? _session.SpeciesId : null;

        public int ConsecutiveMisses => _session != null ? _session.ConsecutiveMisses : 0;

        /// <summary>
        /// 1 = the bite window just opened, 0 = it is about to expire; 0
        /// outside Phase==Bite. Purely a visualization surface for the
        /// timing-ring UI (module B) -- TsuriCore.TapHook's own success/fail
        /// logic never reads this and is unaffected by it.
        /// </summary>
        public float BiteWindowRemaining01 =>
            _session != null && _session.Phase == TsuriPhase.Bite && _biteWindowTotalSec > 0f
                ? Mathf.Clamp01(_session.BiteWindowRemainingSec / _biteWindowTotalSec)
                : 0f;

        public void Configure(
            KawaGlintActorsController actors,
            KawaGlintHud hud,
            KawaGlintInputSurface input,
            Camera camera,
            KawaStageInfo stage,
            int randomSeed)
        {
            _actors = actors;
            _hud = hud;
            _input = input;
            _camera = camera;
            _stage = stage;
            _random = new System.Random(randomSeed);
            _session = TsuriCore.CreateSession(TsuriFishData.RiverSpecies, TsuriMode.Relaxed);

            _input.Tapped += HandleTap;

            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);
            _actors.HideTargetFish();

            _hud.SetPhaseWord(PhaseWordIdle);
            _hud.SetNarration(NarrationIdle);
            _hud.SetBucketCount(0);

            _configured = true;
        }

        private void OnDestroy()
        {
            if (_input != null)
            {
                _input.Tapped -= HandleTap;
            }
        }

        private void Update()
        {
            if (!_configured)
            {
                return;
            }

            var dt = Mathf.Min(Time.deltaTime, 0.05f);
            var previousPhase = _session.Phase;
            _session = TsuriCore.Tick(_session, dt, TsuriGearMods.Neutral, NowMs());

            if (_session.Phase != previousPhase)
            {
                HandlePhaseTransition(_session.Phase);
            }
            else
            {
                HandleSteadyState();
            }
        }

        private void HandlePhaseTransition(TsuriPhase newPhase)
        {
            switch (newPhase)
            {
                case TsuriPhase.Bite:
                    EnterBiteUi();
                    break;
                case TsuriPhase.Renda:
                    EnterRendaUi();
                    break;
                case TsuriPhase.Escaped:
                    EnterEscapedUi();
                    break;
                case TsuriPhase.Landed:
                    // Only tick()-driven Renda -> Landed (the "おたすけ" auto-catch)
                    // reaches here; a normal player-completed renda transitions
                    // to Landed directly inside HandleRendaTap below.
                    OnLanded(helped: true);
                    break;
            }
        }

        private void HandleSteadyState()
        {
            switch (_session.Phase)
            {
                case TsuriPhase.Wait:
                    UpdateWaitSteadyState();
                    break;
                case TsuriPhase.Bite:
                    UpdateTimingRing();
                    break;
                case TsuriPhase.Renda:
                    _hud.SetRendaGauge(_session.GaugePct);
                    var stuckAtFloor = _session.FloorHeldSec >= FloorHeldStuckSec && _session.GaugePct <= RendaStuckFloorPct;
                    _hud.SetRendaBigText(stuckAtFloor ? RendaBigTextTapTap : RendaBigTextPull);
                    break;
            }
        }

        private void UpdateWaitSteadyState()
        {
            var elapsed = _waitTotalSec - Mathf.Max(0f, _session.WaitRemainingSec);
            if (_waitTotalSec > 0f && _preBitePlan != null)
            {
                _actors.SetTargetFishApproach(_preBitePlan.ApproachDisplayProgress(elapsed), _targetX);
            }

            var state = _actors.Bobber.VisualState;
            if (state == KawaGlintBobberState.Floating)
            {
                _actors.SetRingsVisible(true);
            }

            // Only Floating/Twitch bobber states are "on the water" and thus
            // eligible to nibble -- guards against the (normally impossible,
            // since bursts only start at 35% of the wait while flight is a
            // fixed 0.45s) case of a burst window overlapping the cast's
            // Flying arc.
            var onWater = state == KawaGlintBobberState.Floating || state == KawaGlintBobberState.Twitch;
            var idx = onWater && _preBitePlan != null ? _preBitePlan.CurrentNibbleIndex(elapsed) : -1;
            var nibbling = idx >= 0;
            if (nibbling != _nibbleActive)
            {
                if (nibbling)
                {
                    // Re-shown at the start of every burst (not just the
                    // first) so a 2nd/3rd nibble in the same cast still reads
                    // as "something's here" rather than leaving stale text
                    // up from burst 1.
                    _actors.Bobber.SetTwitchIntensity(_preBitePlan.NibbleIntensity01(idx));
                    _actors.Bobber.SetVisualState(KawaGlintBobberState.Twitch);
                    _hud.SetPhaseWord(PhaseWordPreBite);
                    _hud.SetNarration(NarrationPreBite);
                }
                else
                {
                    // Between bursts (and after the last one, before the
                    // quiet tail) the fish has visibly drifted back --
                    // revert the phase word/narration to the plain "waiting"
                    // text so it doesn't linger through a quiet gap where
                    // nothing is happening on screen.
                    _actors.Bobber.SetVisualState(KawaGlintBobberState.Floating);
                    _hud.SetPhaseWord(PhaseWordWait);
                    _hud.SetNarration(NarrationWait);
                }
                _nibbleActive = nibbling;
            }
        }

        /// <summary>Entry point for <see cref="KawaGlintInputSurface.Tapped"/> -- also the PlayMode test operation port.</summary>
        public void HandleTap(Vector2 uv)
        {
            if (!_configured)
            {
                return;
            }

            switch (_session.Phase)
            {
                case TsuriPhase.Idle:
                case TsuriPhase.Landed:
                case TsuriPhase.Escaped:
                    HandleCastTap(uv);
                    break;
                case TsuriPhase.Wait:
                    _hud.SpawnFlyWord(FlyWordWait, false);
                    break;
                case TsuriPhase.Bite:
                    HandleBiteTap();
                    break;
                case TsuriPhase.Renda:
                    HandleRendaTap();
                    break;
            }
        }

        private void HandleCastTap(Vector2 uv)
        {
            var depth = -_camera.transform.position.z;
            var world = _camera.ViewportToWorldPoint(new Vector3(uv.x, uv.y, depth));

            if (world.y >= _stage.WaterlineWorldY || world.x <= _stage.ShoreRightEdgeWorldX + ShoreTapMarginWorld)
            {
                _hud.SetNarration(NarrationTapWater);
                return;
            }

            if (_readyRoutine != null)
            {
                StopCoroutine(_readyRoutine);
                _readyRoutine = null;
            }
            _hud.HideCatchBanner();
            _hud.HideEscapeBanner();

            _targetX = Mathf.Clamp(world.x, _stage.ShoreRightEdgeWorldX + CastMinMarginWorld, _stage.WaterWorldRect.xMax - CastMaxMarginWorld);

            TsuriKawaTuning.NextWaitSecRange(_session.ConsecutiveMisses, out var waitMin, out var waitMax);
            _session = TsuriCore.Cast(_session, waitMin, waitMax, _random);
            _waitTotalSec = _session.WaitRemainingSec;
            // Random consumption order note: Cast() above already consumed
            // whatever PickSpecies needed, so the plan's own random draws
            // happen strictly after species selection -- the plan can never
            // perturb which fish gets picked.
            _preBitePlan = KawaGlintPreBitePlan.Create(_random, _waitTotalSec);
            _nibbleActive = false;

            var species = TsuriFishData.GetSpeciesById(_session.SpeciesId);
            _actors.ShowTargetFish(SpeciesWorldLength(species));
            _actors.Bobber.BeginCast(_stage.RodTipWorldPosition, _targetX, CastFlightSeconds);
            _actors.SetFishingLineVisible(true);
            _actors.SetFishingLineTension(false);
            _actors.SetRingsVisible(false);

            _hud.SetPhaseWord(PhaseWordWait);
            _hud.SetNarration(NarrationWait);
        }

        private void HandleBiteTap()
        {
            _session = TsuriCore.TapHook(_session);
            if (_session.Phase == TsuriPhase.Renda)
            {
                EnterRendaUi();
            }
        }

        private void HandleRendaTap()
        {
            var species = TsuriFishData.GetSpeciesById(_session.SpeciesId);
            _session = TsuriCore.TapRenda(_session, species, TsuriGearMods.Neutral, NowMs());

            if (_session.Phase == TsuriPhase.Renda)
            {
                _rendaCombo++;
                _hud.SetRendaCombo(_rendaCombo);
                _hud.SetRendaGauge(_session.GaugePct);

                var big = _rendaCombo % 5 == 0;
                if (big)
                {
                    _hud.SpawnFlyWord(FlyWordBig, true);
                }
                else
                {
                    _hud.SpawnFlyWord(RendaFlyWords[_flyWordIndex % RendaFlyWords.Length], false);
                    _flyWordIndex++;
                }
            }
            else if (_session.Phase == TsuriPhase.Landed)
            {
                OnLanded(helped: false);
            }
        }

        private void EnterBiteUi()
        {
            _actors.Bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            _actors.SetTargetFishApproach(1f, _targetX);
            _hud.SetPhaseWord(PhaseWordBite);
            _hud.SetNarration(NarrationBite);

            // Captured once here and held fixed for the whole bite window
            // (see BiteWindowRemaining01) -- guarded against a stray 0
            // BiteWindowRemainingSec so the ring math never divides by zero.
            _biteWindowTotalSec = Mathf.Max(_session.BiteWindowRemainingSec, 0.01f);
            _hud.ShowTimingRing();
            UpdateTimingRing();
        }

        /// <summary>
        /// Computes the current viewport position of the bobber for the
        /// timing ring / hit-confirm FX. Stateless -- callers decide whether
        /// to cache the result in _lastRingViewport. Falls back to the last
        /// cached value if the camera/actors/bobber aren't ready.
        /// </summary>
        private Vector2 ComputeRingViewport()
        {
            if (_camera == null || _actors == null || _actors.Bobber == null)
            {
                return _lastRingViewport;
            }
            var worldPos = new Vector3(_actors.Bobber.CenterWorldX, _stage.WaterlineWorldY + TimingRingWorldYOffset, 0f);
            var viewport = _camera.WorldToViewportPoint(worldPos);
            return new Vector2(viewport.x, viewport.y);
        }

        /// <summary>
        /// Drives the timing-ring UI purely from the live session + the
        /// fixed total captured in EnterBiteUi -- a stateless per-frame
        /// redraw, safe to call every Bite-phase tick.
        /// </summary>
        private void UpdateTimingRing()
        {
            if (_camera == null || _actors == null || _actors.Bobber == null)
            {
                return;
            }
            _lastRingViewport = ComputeRingViewport();
            _hud.SetTimingRing(_lastRingViewport, BiteWindowRemaining01);
        }

        private void EnterRendaUi()
        {
            // Runs on both paths into Renda: a player's successful hooking
            // tap (HandleBiteTap) and the tick()-driven auto-hook after 3
            // consecutive misses (HandlePhaseTransition, Wait -> Renda direct)
            // -- so the hit-confirm effect plays either way, per design.
            //
            // The auto-hook path never goes through EnterBiteUi/UpdateTimingRing,
            // so _lastRingViewport can be stale from a previous cast (a
            // different world-X the player tapped for cast N-1). Recompute it
            // here from the *current* bobber position every time, so the
            // hit-confirm FX always lands on the live bobber regardless of
            // which path led into Renda.
            _hud.HideTimingRing();
            _lastRingViewport = ComputeRingViewport();
            _hud.PlayHookHitFx(_lastRingViewport);
            _actors.GetComponentInChildren<KawaGlintSplashEffect>(true)?.Play(
                new Vector3(_actors.Bobber.CenterWorldX, _stage.WaterlineWorldY, 0f));

            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.SetTargetFishThrash(true);
            _actors.SetFishingLineTension(true);
            _actors.SetRingsVisible(true);
            _rendaCombo = 0;
            _hud.ShowRenda();
            _hud.SetRendaBigText(RendaBigTextPull);
            _hud.SetRendaCombo(0);
            _hud.SetRendaGauge(_session.GaugePct);
            _hud.SetPhaseWord(string.Empty);
            _hud.SetNarration(NarrationRenda);
        }

        private void EnterEscapedUi()
        {
            _hud.HideTimingRing();
            _hud.HideRenda();
            _actors.Bobber.SetVisualState(KawaGlintBobberState.EscapePop);
            _actors.SetTargetFishThrash(false);
            _actors.FleeTargetFish();
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);
            _actors.SetFishingLineTension(false);
            _hud.SetPhaseWord(PhaseWordEscaped);
            _hud.SetNarration(NarrationEscaped);
            _hud.ShowEscapeBanner();
            ScheduleReady(EscapedReadySec);
        }

        private void OnLanded(bool helped)
        {
            _hud.HideTimingRing();
            _hud.HideRenda();
            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.HideTargetFish();
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);
            _actors.SetFishingLineTension(false);

            var species = TsuriFishData.GetSpeciesById(_session.SpeciesId);
            var edible = species != null && species.Edible;
            var label = edible ? CatchLabelEdible : CatchLabelTreasure;
            var speciesName = species != null ? species.Name : SpeciesUnknownName;
            var dotColor = species != null && species.Rarity == TsuriRarity.Rare ? KawaGlintHud.RarityRareColor : KawaGlintHud.RarityNormalColor;

            _hud.ShowCatchBanner(label, speciesName, dotColor);
            _hud.SetPhaseWord(PhaseWordLanded);

            string narration;
            if (helped)
            {
                narration = NarrationHelped;
            }
            else if (edible)
            {
                narration = speciesName + "が つれた！";
            }
            else
            {
                narration = label;
            }
            _hud.SetNarration(narration);

            _hud.SetBucketCount(CaughtCount);
            ScheduleReady(helped ? LandedHelpedReadySec : LandedReadySec);
        }

        private void ScheduleReady(float seconds)
        {
            if (_readyRoutine != null)
            {
                StopCoroutine(_readyRoutine);
            }
            _readyRoutine = StartCoroutine(ReadyRoutine(seconds));
        }

        private IEnumerator ReadyRoutine(float seconds)
        {
            yield return new WaitForSeconds(seconds);
            _readyRoutine = null;
            _hud.HideCatchBanner();
            _hud.HideEscapeBanner();
            _hud.SetPhaseWord(PhaseWordIdle);
            _hud.SetNarration(NarrationIdle);
        }

        /// <summary>Test/QA hook: forces Wait to expire on the next Tick (only while Phase==Wait).</summary>
        public void DebugSkipWait()
        {
            if (_session.Phase == TsuriPhase.Wait)
            {
                _session.WaitRemainingSec = 0f;
            }
        }

        /// <summary>Test/QA hook: forces the bite window to expire (Escaped) on the next Tick (only while Phase==Bite).</summary>
        public void DebugExpireBiteWindow()
        {
            if (_session.Phase == TsuriPhase.Bite)
            {
                _session.BiteWindowRemainingSec = 0f;
            }
        }

        /// <summary>Test/QA hook: force-sets the renda gauge (only while Phase==Renda).</summary>
        public void DebugSetGauge(float pct)
        {
            if (_session.Phase == TsuriPhase.Renda)
            {
                _session.GaugePct = pct;
            }
        }

        private static float SpeciesWorldLength(TsuriSpecies species)
        {
            if (species == null)
            {
                return 1.5f;
            }
            switch (species.Size)
            {
                case "s": return 1.2f;
                case "m": return 1.8f;
                case "l": return 2.5f;
                default: return 1.5f;
            }
        }

        private static long NowMs()
        {
            return System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
    }
}
