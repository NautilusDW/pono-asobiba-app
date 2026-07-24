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

        /// <summary>
        /// Midwater niche の前あたりナレーション(既定値)。 海拡張 (実装契約v1.0 §C-1)
        /// の <see cref="KawaGlintNicheCues"/> がこの定数をそのまま参照する
        /// (二重管理禁止 -- リテラルを複製しない)。 internal のまま同一アセンブリ
        /// (Pono.KawaGlint.App) 内でのみ共有する。
        /// </summary>
        internal const string NarrationPreBite = "…きたかも？";
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

        // 海拡張 (実装契約v1.0 §C-1) 追加フィールド ─────────────────────────
        // 現在のロケーション。 Configure で asase に初期化し、TrySetLocation でのみ
        // 差し替える (Cast/Tick 等、他のどの経路からも変更しない)。
        private TsuriLocationData _currentLocation;
        // fishdex 記録窓口。 null 可 (テスト互換 -- Configure に渡さなければ配線されない)。
        private KawaGlintFishdexService _fishdex;
        // サイズロール専用の乱数ストリーム。 メインの _random (種抽選/待ち時間/前あたり
        // プラン)とは完全に分離する -- 既存 PlayMode テストの乱数消費順序への影響を
        // 絶対に避けるため、_random からは一切引かない。
        private System.Random _sizeRandom;

        private bool _configured;
        private float _targetX;
        private float _waitTotalSec;
        private KawaGlintPreBitePlan _preBitePlan;

        // Multi-chance pre-bite (batch:kawaglint-multi-chance-prebite):
        // -1 == no event active; otherwise the index of the currently active
        // Shallow/Deep event from _preBitePlan (see UpdateWaitSteadyState).
        // Replaces the old single-flavor _nibbleActive bool now that a Wait
        // period can contain both Shallow (no-op tap) and Deep (hookable tap)
        // events.
        private int _activeEventIndex = -1;
        private KawaGlintPreBiteEventKind _activeEventKind;

        // QA/test override for IsDeepHookWindowOpen -- see DebugForceDeepWindow.
        // Never mutated by _preBitePlan itself; purely an additional "OR"
        // condition the controller checks alongside the plan's own schedule.
        // Also drives the SAME visual presentation (BiteSink + timing ring)
        // as a real plan-scheduled Deep event in UpdateWaitSteadyState below
        // -- not just the hooking-tap gate -- so a PlayMode test can
        // deterministically observe "the bobber sinks and the ring shows"
        // without depending on the randomized plan actually placing a Deep
        // pull at this exact moment (it may have placed zero this cast).
        private float _debugDeepUntilElapsed;
        private float _debugDeepStartElapsed;

        // Sentinel _activeEventIndex value meaning "a DebugForceDeepWindow
        // override is driving the Deep presentation right now", distinct
        // from -1 (no event) and every real non-negative _preBitePlan index.
        private const int DebugDeepEventIndex = -2;

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

        /// <summary>Current location id (海拡張・実装契約v1.0 §C-1). Null only before Configure runs.</summary>
        public string CurrentLocationId => _currentLocation?.Id;

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

        /// <summary>Seconds elapsed since the current cast's Wait began (0 at Cast, _waitTotalSec at natural expiry). Shared by UpdateWaitSteadyState and IsDeepHookWindowOpen/HookFromDeepWindow so both read the exact same clock.</summary>
        private float WaitElapsedSec => _waitTotalSec - Mathf.Max(0f, _session.WaitRemainingSec);

        /// <summary>
        /// True while a "深い引き" (グイン) pre-bite event's hooking window is
        /// currently open -- or within its trailing grace period -- for the
        /// live Wait session (or while a PlayMode test's <see cref="DebugForceDeepWindow"/>
        /// override is active). Test/inspection surface as well as the
        /// production gate <see cref="HandleTap"/> reads before calling
        /// <see cref="HookFromDeepWindow"/>. TsuriCore itself has no notion
        /// of this -- it is entirely a Gameplay-layer presentation query on
        /// top of the unmodified Wait phase.
        /// </summary>
        public bool IsDeepHookWindowOpen
        {
            get
            {
                if (_session == null || _session.Phase != TsuriPhase.Wait || _actors == null || _actors.Bobber == null)
                {
                    return false;
                }
                var state = _actors.Bobber.VisualState;
                var onWater = state == KawaGlintBobberState.Floating
                    || state == KawaGlintBobberState.Twitch
                    || state == KawaGlintBobberState.BiteSink;
                if (!onWater)
                {
                    return false;
                }
                var elapsed = WaitElapsedSec;
                return (_preBitePlan != null && _preBitePlan.IsDeepWindowOpen(elapsed)) || _debugDeepUntilElapsed > elapsed;
            }
        }

        public void Configure(
            KawaGlintActorsController actors,
            KawaGlintHud hud,
            KawaGlintInputSurface input,
            Camera camera,
            KawaStageInfo stage,
            int randomSeed,
            KawaGlintFishdexService fishdex = null)
        {
            _actors = actors;
            _hud = hud;
            _input = input;
            _camera = camera;
            _stage = stage;
            _fishdex = fishdex;
            _random = new System.Random(randomSeed);
            // メイン _random とは独立したストリーム (0x5F5E1 は任意の固定オフセット --
            // 既存 PlayMode テストの乱数消費順序を絶対に変えないための分離、契約§C-1)。
            _sizeRandom = new System.Random(randomSeed ^ 0x5F5E1);
            _currentLocation = TsuriWorldData.GetLocationById(TsuriWorldData.DefaultLocationId);
            _session = TsuriCore.CreateSession(
                TsuriWorldData.BuildEffectivePool(_currentLocation),
                TsuriMode.Relaxed,
                TsuriWorldData.BuildWeightMulMap(_currentLocation));

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

        /// <summary>
        /// 海拡張 (実装契約v1.0 §C-1) 新設: ロケーション切替。 Phase が
        /// Idle/Landed/Escaped のときのみ有効 (それ以外は no-op、Cast と同じガード形)。
        /// 未知IDは <see cref="TsuriWorldData.GetLocationById"/> が asase へ正規化する。
        /// UnlockCount 不合格 (現状は全ロケ null=常時解放のため実質未到達の防御実装) の
        /// 場合も no-op。 成立時は pity/misses/CaughtLog/SessionSeenIds/Mode を保持した
        /// まま pool/weightMul を差し替え、画面を Idle 状態に戻して true を返す。
        /// </summary>
        public bool TrySetLocation(string locationId)
        {
            if (_session == null
                || (_session.Phase != TsuriPhase.Idle
                    && _session.Phase != TsuriPhase.Landed
                    && _session.Phase != TsuriPhase.Escaped))
            {
                return false;
            }

            var loc = TsuriWorldData.GetLocationById(locationId);
            if (loc == null)
            {
                return false; // 台帳が壊れていない限り到達しない (GetLocationById は asase へ正規化する)
            }

            var zoneCatchCount = _fishdex != null ? _fishdex.ZoneCatchCount(loc.Zone) : 0;
            if (!TsuriWorldData.IsUnlocked(loc, zoneCatchCount))
            {
                return false;
            }

            _session = TsuriCore.WithSpeciesPool(
                _session,
                TsuriWorldData.BuildEffectivePool(loc),
                TsuriWorldData.BuildWeightMulMap(loc));
            _currentLocation = loc;

            // Idle 画面へ戻す: Wait/Bite/Renda/バナー系の演出状態を全て解除する
            // (WithSpeciesPool 自体が session 側の Phase/SpeciesId/Wait/Bite/Gauge/
            // FloorHeld/RendaElapsed を Idle 相当にリセット済み -- ここでは見た目側の
            // 後始末のみ)。
            if (_readyRoutine != null)
            {
                StopCoroutine(_readyRoutine);
                _readyRoutine = null;
            }
            _activeEventIndex = -1;
            _debugDeepUntilElapsed = 0f;

            _hud.HideTimingRing();
            _hud.HideRenda();
            _hud.HideCatchBanner();
            _hud.HideEscapeBanner();
            _actors.Bobber.SetVisualState(KawaGlintBobberState.Hidden);
            _actors.SetRingsVisible(false);
            _actors.SetFishingLineVisible(false);
            _actors.SetFishingLineTension(false);
            _actors.HideTargetFish();
            _hud.SetPhaseWord(PhaseWordIdle);
            _hud.SetNarration(NarrationIdle);
            return true;
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
                    // fishdex 記録 (実装契約v1.0 §C-1): EnterEscapedUi() の直前に記録する
                    // (契約どおりの順序)。 _session.SpeciesId は Bite->Escaped 遷移で
                    // クリアされない (TsuriCore.Tick) ので、逃げた種を正しく指す。
                    _fishdex?.RecordEscape(_session.SpeciesId, _currentLocation, NowMs());
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
            var elapsed = WaitElapsedSec;
            if (_waitTotalSec > 0f && _preBitePlan != null)
            {
                // ApproachDisplayProgress alone is the plain travel curve
                // (0 -> 1, reaching 1 at ArrivalSec and staying there);
                // MotionOffset is the separate, purely local peck/lunge
                // oscillation (Shallow pecks + Deep lunges) that only ever
                // activates at/after ArrivalSec. Composing them here (rather
                // than inside the plan) keeps the "travel" and "event at the
                // hook" concerns visibly distinct all the way out to the actor.
                var progress = _preBitePlan.ApproachDisplayProgress(elapsed) + _preBitePlan.MotionOffset(elapsed);
                _actors.SetTargetFishApproach(progress, _targetX);
            }

            var state = _actors.Bobber.VisualState;
            if (state == KawaGlintBobberState.Floating)
            {
                _actors.SetRingsVisible(true);
            }

            // Floating/Twitch/BiteSink bobber states are all "on the water"
            // and thus eligible for a pre-bite event -- guards against the
            // (normally impossible, since events only start once the fish
            // has arrived at ArrivalSec, well after flight's fixed 0.45s)
            // case of an event window overlapping the cast's Flying arc.
            var onWater = state == KawaGlintBobberState.Floating
                || state == KawaGlintBobberState.Twitch
                || state == KawaGlintBobberState.BiteSink;

            // A DebugForceDeepWindow override takes priority over the plan's
            // own schedule (it is only ever set by a PlayMode test) and maps
            // to the DebugDeepEventIndex sentinel rather than a real plan
            // index, so the change-detection below still fires exactly once
            // on entry/exit even though there is no actual BiteEvent behind it.
            var debugDeepActive = onWater && elapsed < _debugDeepUntilElapsed;
            var planIdx = onWater && !debugDeepActive && _preBitePlan != null ? _preBitePlan.CurrentEventIndex(elapsed) : -1;
            var idx = debugDeepActive ? DebugDeepEventIndex : planIdx;

            if (idx != _activeEventIndex)
            {
                if (idx == DebugDeepEventIndex)
                {
                    _activeEventKind = KawaGlintPreBiteEventKind.Deep;
                    EnterDeepEventVisual();
                }
                else if (idx >= 0)
                {
                    _activeEventKind = _preBitePlan.EventKindAt(idx);
                    if (_activeEventKind == KawaGlintPreBiteEventKind.Deep)
                    {
                        // "グイン" -- a big, distinct pull. Same visual state
                        // and phase word/narration as the terminal Bite phase
                        // (item 4 of the spec: the player should read this
                        // exactly like "the real bite", just possibly one of
                        // several chances this cast).
                        EnterDeepEventVisual();
                    }
                    else
                    {
                        // "ちょんちょん" -- re-shown at the start of every
                        // Shallow burst (not just the first) so a 2nd/3rd
                        // peck in the same cast still reads as "something's
                        // here" rather than leaving stale text up from an
                        // earlier burst. Tapping during this does nothing
                        // (HandleTap's Wait branch below).
                        _actors.Bobber.SetTwitchIntensity(_preBitePlan.EventIntensity01(idx));
                        _actors.Bobber.SetVisualState(KawaGlintBobberState.Twitch);
                        _hud.SetPhaseWord(PhaseWordPreBite);
                        // niche 演出配線 (実装契約v1.0 §C-1): asase は全 Spawns エントリが
                        // Midwater なので KawaGlintNicheCues.PreBiteNarration(Midwater) ==
                        // NarrationPreBite (定数を直接参照) -- 挙動不変。
                        _hud.SetNarration(KawaGlintNicheCues.PreBiteNarration(TsuriWorldData.NicheFor(_currentLocation, _session.SpeciesId)));
                    }
                }
                else
                {
                    // Between events (a Deep window closing -- missed or not,
                    // no penalty either way -- or the gap between two events)
                    // the fish has visibly drifted back -- revert to the
                    // plain "waiting" presentation so nothing lingers on
                    // screen from the event that just ended. misses/pity are
                    // never touched here; only TsuriCore's own Bite->Escaped
                    // path (the terminal bite at Wait's natural expiry) can
                    // affect those.
                    _hud.HideTimingRing();
                    _actors.Bobber.SetVisualState(KawaGlintBobberState.Floating);
                    _hud.SetPhaseWord(PhaseWordWait);
                    _hud.SetNarration(NarrationWait);
                }
                _activeEventIndex = idx;
            }

            if (_activeEventIndex != -1 && _activeEventKind == KawaGlintPreBiteEventKind.Deep)
            {
                var remaining01 = _activeEventIndex == DebugDeepEventIndex
                    ? Mathf.Clamp01(1f - (elapsed - _debugDeepStartElapsed) / Mathf.Max(0.0001f, _debugDeepUntilElapsed - _debugDeepStartElapsed))
                    : _preBitePlan.DeepWindowRemaining01(elapsed);
                _hud.SetTimingRing(ComputeRingViewport(), remaining01);
            }
        }

        private void EnterDeepEventVisual()
        {
            _actors.Bobber.SetVisualState(KawaGlintBobberState.BiteSink);
            _hud.ShowTimingRing();
            _hud.SetPhaseWord(PhaseWordBite);
            _hud.SetNarration(NarrationBite);
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
                    if (IsDeepHookWindowOpen)
                    {
                        HookFromDeepWindow();
                    }
                    else
                    {
                        _hud.SpawnFlyWord(FlyWordWait, false);
                    }
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

            // 海拡張 (実装契約v1.0 §C-1): TsuriKawaTuning.NextWaitSecRange 呼び出しを
            // ロケーション別の TsuriWorldData.NextWaitSecRange に差し替え。 asase では
            // 値が完全一致する (EditMode テストで固定済み) -- TsuriKawaTuning.cs 自体は
            // 1文字も変更しない (既存テスト用に現状維持)。
            TsuriWorldData.NextWaitSecRange(_currentLocation, _session.ConsecutiveMisses, out var waitMin, out var waitMax);
            _session = TsuriCore.Cast(_session, waitMin, waitMax, _random);
            _waitTotalSec = _session.WaitRemainingSec;
            // Random consumption order note: Cast() above already consumed
            // whatever PickSpecies needed, so the plan's own random draws
            // happen strictly after species selection -- the plan can never
            // perturb which fish gets picked.
            _preBitePlan = KawaGlintPreBitePlan.Create(_random, _waitTotalSec);
            _activeEventIndex = -1;
            _debugDeepUntilElapsed = 0f;

            var species = TsuriFishData.GetSpeciesById(_session.SpeciesId);
            _actors.ShowTargetFish(_session.SpeciesId, SpeciesWorldLength(species));
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

        /// <summary>
        /// Hooks the fish from a Deep pre-bite event's window, mid-Wait.
        /// Deliberately does not reimplement any of TsuriCore's Wait->Bite /
        /// Bite->Renda accounting (gauge reset, pity, ConsecutiveMisses,
        /// auto-hook after 3 misses) -- it fast-forwards the *existing*
        /// legal transition by zeroing WaitRemainingSec (the exact same
        /// state-owner mutate pattern <see cref="DebugSkipWait"/> already
        /// uses) and then calling straight through Tick/TapHook, so every
        /// one of those rules runs verbatim from the unmodified Core.
        /// </summary>
        private void HookFromDeepWindow()
        {
            _session.WaitRemainingSec = 0f;
            _session = TsuriCore.Tick(_session, 0f, TsuriGearMods.Neutral, NowMs());
            if (_session.Phase == TsuriPhase.Bite)
            {
                _session = TsuriCore.TapHook(_session);
            }
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
            // Guards against a stale ring/BiteSink presentation state left
            // over from a mid-Wait Deep event -- this is the terminal Bite
            // reached via Wait's own natural expiry (TsuriCore.Tick), a
            // separate path from HookFromDeepWindow.
            _activeEventIndex = -1;
            _debugDeepUntilElapsed = 0f;

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
            // Guards against a stale ring/BiteSink presentation state left
            // over from a mid-Wait Deep event that just hooked (HookFromDeepWindow)
            // or from the 3-consecutive-misses auto-hook (Wait -> Renda direct).
            _activeEventIndex = -1;
            _debugDeepUntilElapsed = 0f;

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
            _activeEventIndex = -1;
            _debugDeepUntilElapsed = 0f;

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

            // fishdex 記録配線 (実装契約v1.0 §C-1): サイズは _sizeRandom (メイン _random
            // から分離した専用ストリーム) でロールし、cm 単位に丸めて渡す。
            // サイズレンジ無し種 (ながぐつ/かいがら等) は null。
            int? sizeCm = species != null && species.HasSizeRange
                ? Mathf.RoundToInt(Mathf.Lerp(species.SizeMinCm, species.SizeMaxCm, (float)_sizeRandom.NextDouble()))
                : (int?)null;
            _fishdex?.RecordCatch(species, _currentLocation, sizeCm, NowMs());

            var edible = species != null && species.Edible;
            var label = edible ? CatchLabelEdible : CatchLabelTreasure;
            var speciesName = species != null ? species.Name : SpeciesUnknownName;
            var dotColor = species != null && species.Rarity == TsuriRarity.Rare ? KawaGlintHud.RarityRareColor : KawaGlintHud.RarityNormalColor;

            _hud.ShowCatchBanner(label, speciesName, dotColor, KawaGlintSpriteCatalog.LoadCatchArt(_session.SpeciesId));
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

        /// <summary>
        /// Test/QA hook: forces this Wait's Deep hooking window to read as
        /// open (<see cref="IsDeepHookWindowOpen"/>) for <paramref name="durationSec"/>
        /// seconds starting now (only while Phase==Wait; no-op otherwise).
        /// Purely a controller-side override -- <see cref="_preBitePlan"/>
        /// itself is never touched -- so PlayMode tests can deterministically
        /// exercise a deep-hook tap without waiting on the plan's randomized
        /// schedule (which may place zero Deep events on a given cast).
        /// </summary>
        public void DebugForceDeepWindow(float durationSec = 2.2f)
        {
            if (_session.Phase == TsuriPhase.Wait)
            {
                var elapsed = WaitElapsedSec;
                _debugDeepStartElapsed = elapsed;
                _debugDeepUntilElapsed = elapsed + durationSec;
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
