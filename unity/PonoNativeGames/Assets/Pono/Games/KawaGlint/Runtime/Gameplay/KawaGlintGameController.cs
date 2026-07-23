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
        private const float ShoreTapMarginWorld = 0.8f;
        private const float CastMinMarginWorld = 1.2f;
        private const float CastMaxMarginWorld = 0.8f;
        private const float CastFlightSeconds = 0.45f;
        private const float FloorHeldStuckSec = 2f;
        private const float EscapedReadySec = 1.6f;
        private const float LandedReadySec = 2.4f;

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
        private bool _preBiteShown;
        private int _rendaCombo;
        private int _flyWordIndex;
        private Coroutine _readyRoutine;

        /// <summary>Current session phase (test/inspection surface).</summary>
        public TsuriPhase Phase => _session != null ? _session.Phase : TsuriPhase.Idle;

        /// <summary>Number of fish/treasures landed this session.</summary>
        public int CaughtCount => _session != null ? _session.CaughtLog.Count : 0;

        /// <summary>Taps registered in the current renda (連打) bout.</summary>
        public int RendaComboCount => _rendaCombo;

        /// <summary>Species id of the current bite/renda target, or null outside those phases.</summary>
        public string CurrentSpeciesId => _session != null ? _session.SpeciesId : null;

        public int ConsecutiveMisses => _session != null ? _session.ConsecutiveMisses : 0;

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
                case TsuriPhase.Renda:
                    _hud.SetRendaGauge(_session.GaugePct);
                    var stuckAtFloor = _session.FloorHeldSec >= FloorHeldStuckSec && _session.GaugePct <= RendaStuckFloorPct;
                    _hud.SetRendaBigText(stuckAtFloor ? RendaBigTextTapTap : RendaBigTextPull);
                    break;
            }
        }

        private void UpdateWaitSteadyState()
        {
            if (_waitTotalSec > 0f)
            {
                var progress = 1f - Mathf.Max(0f, _session.WaitRemainingSec) / _waitTotalSec;
                _actors.SetTargetFishApproach(Mathf.Clamp01(progress), _targetX);
            }

            if (_actors.Bobber.VisualState == KawaGlintBobberState.Floating)
            {
                _actors.SetRingsVisible(true);
            }

            if (!_preBiteShown && _session.WaitRemainingSec <= 1f && _session.WaitRemainingSec > 0f)
            {
                _preBiteShown = true;
                _actors.Bobber.SetVisualState(KawaGlintBobberState.Twitch);
                _hud.SetPhaseWord(PhaseWordPreBite);
                _hud.SetNarration(NarrationPreBite);
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
            _preBiteShown = false;

            var species = TsuriFishData.GetSpeciesById(_session.SpeciesId);
            _actors.ShowTargetFish(SpeciesWorldLength(species));
            _actors.Bobber.BeginCast(_stage.RodTipWorldPosition, _targetX, CastFlightSeconds);
            _actors.SetFishingLineVisible(true);
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
        }

        private void EnterRendaUi()
        {
            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.SetTargetFishThrash(true);
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
            _hud.HideRenda();
            _actors.Bobber.SetVisualState(KawaGlintBobberState.EscapePop);
            _actors.SetTargetFishThrash(false);
            _actors.FleeTargetFish();
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);
            _hud.SetPhaseWord(PhaseWordEscaped);
            _hud.SetNarration(NarrationEscaped);
            _hud.ShowEscapeBanner();
            ScheduleReady(EscapedReadySec);
        }

        private void OnLanded(bool helped)
        {
            _hud.HideRenda();
            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.HideTargetFish();
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);

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
            ScheduleReady(LandedReadySec);
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
