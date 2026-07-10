using System.Collections;
using System.Collections.Generic;
using Pono.HideSeek.Core;
using Pono.HideSeekCreatures.Input;
using Pono.HideSeekCreatures.Rendering;
using Pono.HideSeekCreatures.UI;
using Pono.NativeShell;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.Gameplay
{
    public enum HideSeekStageState
    {
        Intro,
        Tutorial,
        Exploring,
        FoundReveal,
        CompleteCelebration,
        Complete,
        Paused
    }

    [DisallowMultipleComponent]
    public sealed class HideSeekGameController : MonoBehaviour
    {
        private const string ReduceMotionPref = "pono_hide_seek_reduce_motion";
        private readonly Dictionary<int, PointerState> _pointers = new Dictionary<int, PointerState>(2);
        private readonly Queue<string> _foundQueue = new Queue<string>(3);

        private FluidInkPresenter _ink;
        private InkInputSurface _input;
        private RevealTexturePresenter _revealPresenter;
        private TutorialGuide _tutorial;
        private HideSeekAudio _audio;
        private CreatureView[] _creatures;
        private Image[] _progressTokens;
        private Text _stageTitle;
        private Text _foundBanner;
        private GameObject _completePanel;
        private Text _completeTitle;
        private GameObject _exitPanel;
        private GameObject _settingsPanel;
        private Text _soundLabel;
        private Text _motionLabel;
        private CelebrationOverlay _celebration;

        private RevealMaskModel _revealMask;
        private CreatureDiscoveryModel _discovery;
        private HintScheduler _hints;
        private Coroutine _foundRoutine;
        private bool _initialized;
        private bool _firstDragPending;
        private bool _reduceMotion;
        private int _colorIndex;
        private HideSeekStageState _stateBeforePause;

        public HideSeekStageState State { get; private set; } = HideSeekStageState.Intro;
        public int FoundCount => _discovery?.FoundCount ?? 0;
        public RevealMaskModel RevealMask => _revealMask;
        public string InkBackendLabel => _ink?.BackendLabel ?? string.Empty;

        public void Configure(
            FluidInkPresenter ink,
            InkInputSurface input,
            RevealTexturePresenter revealPresenter,
            TutorialGuide tutorial,
            HideSeekAudio audio,
            CreatureView[] creatures,
            Image[] progressTokens,
            Text stageTitle,
            Text foundBanner,
            GameObject completePanel,
            Text completeTitle,
            GameObject exitPanel,
            GameObject settingsPanel,
            Text soundLabel,
            Text motionLabel,
            CelebrationOverlay celebration)
        {
            _ink = ink;
            _input = input;
            _revealPresenter = revealPresenter;
            _tutorial = tutorial;
            _audio = audio;
            _creatures = creatures;
            _progressTokens = progressTokens;
            _stageTitle = stageTitle;
            _foundBanner = foundBanner;
            _completePanel = completePanel;
            _completeTitle = completeTitle;
            _exitPanel = exitPanel;
            _settingsPanel = settingsPanel;
            _soundLabel = soundLabel;
            _motionLabel = motionLabel;
            _celebration = celebration;

            _audio.Initialize();
            _reduceMotion = PlayerPrefs.GetInt(ReduceMotionPref, 0) != 0;
            _celebration.SetReduceMotion(_reduceMotion);

            _input.Pressed += OnPressed;
            _input.Dragged += OnDragged;
            _input.Released += OnReleased;
            _tutorial.GuideMoved += OnTutorialGuideMoved;
            _hints = new HintScheduler(new[] { 6f, 6f, 6f }, repeatLastHint: true);
            _hints.HintDue += OnHintDue;

            _initialized = true;
            StartSession(showIntro: true);
        }

        private void Update()
        {
            if (!_initialized)
            {
                return;
            }
            if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            {
                HandleBackNavigation();
            }
            if (State == HideSeekStageState.Paused)
            {
                return;
            }

            var deltaTime = Mathf.Min(Time.unscaledDeltaTime, 0.05f);
            _discovery?.Advance(deltaTime);
            if (State == HideSeekStageState.Exploring || State == HideSeekStageState.Tutorial || State == HideSeekStageState.FoundReveal)
            {
                _hints.Advance(deltaTime);
            }

            var maxSpeed = 0f;
            foreach (var pair in _pointers)
            {
                var pointer = pair.Value;
                maxSpeed = Mathf.Max(maxSpeed, pointer.Speed);
                pointer.Speed = Mathf.MoveTowards(pointer.Speed, 0f, deltaTime * 2.5f);
                pointer.HoldElapsed += deltaTime;
                pointer.HoldInjectElapsed += deltaTime;
                if (pointer.HoldInjectElapsed >= 0.10f && pointer.HoldElapsed >= 0.32f)
                {
                    pointer.HoldInjectElapsed = 0f;
                    var radius = Mathf.RoundToInt(Mathf.Lerp(7f, 11f, Mathf.Clamp01(pointer.HoldElapsed / 1.5f)));
                    var change = _revealMask.ApplyStamp(new NormalizedPoint(pointer.LastUv.x, pointer.LastUv.y), new RevealBrush(radius, 255));
                    if (change.ChangedCellCount >= 5)
                    {
                        _hints.NotifyActivity();
                    }
                    var phase = Time.unscaledTime * 2.1f + pair.Key;
                    var drift = new Vector2(Mathf.Cos(phase), Mathf.Sin(phase)) * 0.13f;
                    _ink.Inject(pointer.LastUv, drift, pointer.Color, 0.052f);
                }
            }
            _audio.SetInkActivity(_pointers.Count > 0, maxSpeed);
        }

        private void OnDestroy()
        {
            if (_input != null)
            {
                _input.Pressed -= OnPressed;
                _input.Dragged -= OnDragged;
                _input.Released -= OnReleased;
            }
            if (_tutorial != null)
            {
                _tutorial.GuideMoved -= OnTutorialGuideMoved;
            }
            if (_hints != null)
            {
                _hints.HintDue -= OnHintDue;
            }
            DisposeDiscovery();
        }

        private void OnApplicationPause(bool paused)
        {
            if (!_initialized)
            {
                return;
            }
            if (paused)
            {
                PauseForOverlay(null);
            }
            else if (State == HideSeekStageState.Paused && _exitPanel != null && !_exitPanel.activeSelf
                     && _settingsPanel != null && !_settingsPanel.activeSelf)
            {
                ResumeFromOverlay();
            }
        }

        public void RestartGame()
        {
            StartSession(showIntro: false);
        }

        public void ShowExitDialog()
        {
            _audio.PlayBack();
            PauseForOverlay(_exitPanel);
        }

        public void CancelExit()
        {
            if (_exitPanel != null)
            {
                _exitPanel.SetActive(false);
            }
            ResumeFromOverlay();
        }

        public void ConfirmExit()
        {
            _audio.PlayBack();
            NativeGameBridge.RequestExit();
        }

        public void ShowSettings()
        {
            PauseForOverlay(_settingsPanel);
            RefreshSettingsLabels();
        }

        public void CloseSettings()
        {
            if (_settingsPanel != null)
            {
                _settingsPanel.SetActive(false);
            }
            ResumeFromOverlay();
        }

        public void ToggleSound()
        {
            _audio.ToggleSound();
            RefreshSettingsLabels();
        }

        public void ToggleReduceMotion()
        {
            _reduceMotion = !_reduceMotion;
            PlayerPrefs.SetInt(ReduceMotionPref, _reduceMotion ? 1 : 0);
            PlayerPrefs.Save();
            _ink.SetReduceMotion(_reduceMotion);
            _celebration.SetReduceMotion(_reduceMotion);
            RefreshSettingsLabels();
        }

        private void HandleBackNavigation()
        {
            if (_settingsPanel != null && _settingsPanel.activeSelf)
            {
                CloseSettings();
                return;
            }
            if (_exitPanel != null && _exitPanel.activeSelf)
            {
                CancelExit();
                return;
            }
            ShowExitDialog();
        }

        private void StartSession(bool showIntro)
        {
            StopAllCoroutines();
            _foundRoutine = null;
            _pointers.Clear();
            _foundQueue.Clear();
            _input.CancelAll();
            DisposeDiscovery();
            SetPresentationPaused(false);

            _revealMask = new RevealMaskModel();
            if (_revealPresenter.Texture == null)
            {
                _revealPresenter.Initialize(_revealMask);
                _ink.Initialize(_revealPresenter.Texture);
            }
            else
            {
                _revealPresenter.Bind(_revealMask);
                _ink.SetRevealTexture(_revealPresenter.Texture);
            }
            _ink.SetReduceMotion(_reduceMotion);
            _ink.ResetInk();
            SeedInitialClues();
            _revealPresenter.UploadNow();

            _discovery = new CreatureDiscoveryModel(_revealMask, StageDiscoveryFactory.CreateDefinitions());
            _discovery.CreatureFound += OnCreatureFound;
            _hints.Reset();
            _firstDragPending = true;
            _colorIndex = 0;

            for (var i = 0; i < _creatures.Length; i++)
            {
                _creatures[i].ResetView();
                _progressTokens[i].sprite = RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/leaf_token");
                _progressTokens[i].color = new Color(0.52f, 0.47f, 0.34f, 0.48f);
                _progressTokens[i].preserveAspect = true;
            }

            _tutorial.Hide();
            _celebration.StopAndHide();
            _stageTitle.gameObject.SetActive(false);
            _foundBanner.gameObject.SetActive(false);
            _completePanel.SetActive(false);
            _exitPanel.SetActive(false);
            _settingsPanel.SetActive(false);

            if (showIntro)
            {
                StartCoroutine(IntroRoutine());
            }
            else
            {
                State = HideSeekStageState.Exploring;
                _input.InputEnabled = true;
            }
        }

        private IEnumerator IntroRoutine()
        {
            State = HideSeekStageState.Intro;
            _input.InputEnabled = false;
            _stageTitle.text = HideSeekStageCatalog.StageName;
            _stageTitle.gameObject.SetActive(true);
            yield return WaitForUnpausedSeconds(1.65f);
            _stageTitle.gameObject.SetActive(false);
            State = HideSeekStageState.Tutorial;
            _input.InputEnabled = true;
            _tutorial.BeginIfNeeded();
            yield return WaitForUnpausedSeconds(0.05f);
            if (State == HideSeekStageState.Tutorial)
            {
                State = HideSeekStageState.Exploring;
            }
        }

        private void OnPressed(int pointerId, Vector2 uv)
        {
            if (!CanPlay() || _pointers.ContainsKey(pointerId) || _pointers.Count >= 2)
            {
                return;
            }

            _tutorial.NotifyUserInput();
            var color = HideSeekStageCatalog.Creatures[_colorIndex++ % HideSeekStageCatalog.Creatures.Length].InkColor;
            var pointer = new PointerState(uv, color);
            _pointers.Add(pointerId, pointer);
            _revealMask.ApplyStamp(new NormalizedPoint(uv.x, uv.y), new RevealBrush(7, 255));
            _ink.Inject(uv, Vector2.zero, color, 0.045f);
            _audio.PlayTouch();
            _hints.NotifyActivity();
        }

        private void OnDragged(int pointerId, Vector2 uv)
        {
            if (!CanPlay() || !_pointers.TryGetValue(pointerId, out var pointer))
            {
                return;
            }

            var now = Time.unscaledTime;
            var delta = uv - pointer.LastUv;
            var elapsed = Mathf.Max(1f / 120f, now - pointer.LastTime);
            if (delta.sqrMagnitude < 0.000001f)
            {
                return;
            }

            var velocity = Vector2.ClampMagnitude(delta / elapsed, 3f);
            if (_firstDragPending)
            {
                velocity *= 1.4f;
                _firstDragPending = false;
            }

            var change = _revealMask.ApplyStroke(
                new NormalizedPoint(pointer.LastUv.x, pointer.LastUv.y),
                new NormalizedPoint(uv.x, uv.y),
                new RevealBrush(10, 255));
            if (change.ChangedCellCount >= 5)
            {
                _hints.NotifyActivity();
            }

            var distance = delta.magnitude;
            var visualSteps = Mathf.Clamp(Mathf.CeilToInt(distance / 0.028f), 1, 4);
            for (var step = 1; step <= visualSteps; step++)
            {
                var amount = step / (float)visualSteps;
                _ink.Inject(Vector2.Lerp(pointer.LastUv, uv, amount), velocity, pointer.Color, 0.052f);
            }

            pointer.LastUv = uv;
            pointer.LastTime = now;
            pointer.Moved = true;
            pointer.Speed = velocity.magnitude;
            pointer.HoldElapsed = 0f;
            pointer.HoldInjectElapsed = 0f;
        }

        private void OnReleased(int pointerId, Vector2 uv)
        {
            if (!_pointers.Remove(pointerId, out var pointer))
            {
                return;
            }
            if (!pointer.Moved)
            {
                var view = FindCreatureAt(uv, foundOnly: true);
                view?.PlayTap();
            }
            if (_pointers.Count == 0)
            {
                _audio.SetInkActivity(false, 0f);
            }
        }

        private void OnTutorialGuideMoved(Vector2 uv, Vector2 delta)
        {
            _ink.Inject(uv, delta * 15f, new Color(0.55f, 0.82f, 0.92f), 0.042f);
        }

        private void OnCreatureFound(object sender, CreatureFoundEventArgs eventArgs)
        {
            _foundQueue.Enqueue(eventArgs.Creature.Id);
            if (_foundRoutine == null)
            {
                _foundRoutine = StartCoroutine(ProcessFoundQueue());
            }
        }

        private IEnumerator ProcessFoundQueue()
        {
            while (_foundQueue.Count > 0)
            {
                State = HideSeekStageState.FoundReveal;
                var id = _foundQueue.Dequeue();
                var view = FindCreature(id);
                RevealCreature(view);
                _revealPresenter.UploadNow();
                _audio.PlayFogClear();
                _audio.PlayFound();
                UpdateProgress(view);
                _foundBanner.text = $"{view.DisplayName}が みつかったよ";
                _foundBanner.gameObject.SetActive(true);
                yield return view.PlayFound();
                yield return WaitForUnpausedSeconds(0.25f);
                _foundBanner.gameObject.SetActive(false);
            }

            _foundRoutine = null;
            if (_discovery.AllFound)
            {
                yield return CompleteRoutine();
            }
            else
            {
                State = HideSeekStageState.Exploring;
            }
        }

        private IEnumerator CompleteRoutine()
        {
            State = HideSeekStageState.CompleteCelebration;
            _hints.Complete();
            RevealAll();
            _revealPresenter.UploadNow();
            _tutorial.Hide();
            _foundBanner.text = "みんな みつけた！";
            _foundBanner.gameObject.SetActive(true);
            _celebration.Play();
            _audio.PlayAllFound();
            PlayerPrefs.SetInt("pono_hide_seek_km01_complete", 1);
            PlayerPrefs.Save();
            yield return WaitForUnpausedSeconds(2.25f);
            _foundBanner.gameObject.SetActive(false);
            _completeTitle.text = "みんな みつけた！";
            _completePanel.SetActive(true);
            State = HideSeekStageState.Complete;
            _input.InputEnabled = true;
        }

        private void OnHintDue(object sender, HintDueEventArgs eventArgs)
        {
            if (!CanPlay())
            {
                return;
            }
            var view = SelectHintTarget();
            if (view == null)
            {
                return;
            }
            var level = Mathf.Clamp(eventArgs.Cue.ScheduleIndex + 1, 1, 3);
            view.PlayHint(level);
            _audio.PlayHint();
            var angle = Time.unscaledTime * 1.7f + level;
            var velocity = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * (0.12f + level * 0.04f);
            _ink.Inject(view.HintUv, velocity, view.InkColor, 0.04f + level * 0.008f);
            if (level >= 3)
            {
                _revealMask.ApplyStamp(new NormalizedPoint(view.HintUv.x, view.HintUv.y), new RevealBrush(8, 154));
            }
        }

        private CreatureView SelectHintTarget()
        {
            CreatureView best = null;
            var bestCoverage = -1f;
            for (var i = 0; i < _creatures.Length; i++)
            {
                var view = _creatures[i];
                if (view.IsFound || !_discovery.TryGetSnapshot(view.Id, out var snapshot))
                {
                    continue;
                }
                if (snapshot.RequiredCoverage > bestCoverage)
                {
                    bestCoverage = snapshot.RequiredCoverage;
                    best = view;
                }
            }
            return best;
        }

        private void SeedInitialClues()
        {
            for (var i = 0; i < HideSeekStageCatalog.Creatures.Length; i++)
            {
                var hint = HideSeekStageCatalog.Creatures[i].HintUv;
                _revealMask.ApplyStamp(new NormalizedPoint(hint.x, hint.y), new RevealBrush(6, 104));
            }
        }

        private void RevealCreature(CreatureView view)
        {
            var rect = view.NormalizedRect;
            var radius = Mathf.Clamp(Mathf.RoundToInt(rect.width * RevealMaskModel.Width * 0.28f), 10, 22);
            for (var y = 0; y < 4; y++)
            {
                for (var x = 0; x < 3; x++)
                {
                    var uv = new Vector2(
                        Mathf.Lerp(rect.xMin + rect.width * 0.16f, rect.xMax - rect.width * 0.16f, x / 2f),
                        Mathf.Lerp(rect.yMin + rect.height * 0.12f, rect.yMax - rect.height * 0.12f, y / 3f));
                    _revealMask.ApplyStamp(new NormalizedPoint(uv.x, uv.y), new RevealBrush(radius, 255));
                }
            }
        }

        private void RevealAll()
        {
            var brush = new RevealBrush(64, 255);
            for (var y = 0; y < 3; y++)
            {
                for (var x = 0; x < 4; x++)
                {
                    var uv = new Vector2((x + 0.5f) / 4f, (y + 0.5f) / 3f);
                    _revealMask.ApplyStamp(new NormalizedPoint(uv.x, uv.y), brush);
                }
            }
        }

        private void UpdateProgress(CreatureView view)
        {
            var index = System.Array.IndexOf(_creatures, view);
            if (index < 0 || index >= _progressTokens.Length)
            {
                return;
            }
            _progressTokens[index].sprite = RuntimeAssetLoader.LoadSprite(
                HideSeekStageCatalog.Creatures[index].ResourcePath);
            _progressTokens[index].color = Color.white;
            _progressTokens[index].preserveAspect = true;
        }

        private CreatureView FindCreature(string id)
        {
            for (var i = 0; i < _creatures.Length; i++)
            {
                if (_creatures[i].Id == id)
                {
                    return _creatures[i];
                }
            }
            throw new KeyNotFoundException($"Unknown creature view: {id}");
        }

        private CreatureView FindCreatureAt(Vector2 uv, bool foundOnly)
        {
            for (var i = _creatures.Length - 1; i >= 0; i--)
            {
                if ((!foundOnly || _creatures[i].IsFound) && _creatures[i].ContainsUv(uv, 0.015f))
                {
                    return _creatures[i];
                }
            }
            return null;
        }

        private bool CanPlay()
        {
            return State == HideSeekStageState.Tutorial
                || State == HideSeekStageState.Exploring
                || State == HideSeekStageState.FoundReveal
                || State == HideSeekStageState.Complete;
        }

        private void PauseForOverlay(GameObject overlay)
        {
            if (State != HideSeekStageState.Paused)
            {
                _stateBeforePause = State;
            }
            State = HideSeekStageState.Paused;
            _input.InputEnabled = false;
            _input.CancelAll();
            _pointers.Clear();
            _hints.Pause();
            _audio.SetInkActivity(false, 0f);
            SetPresentationPaused(true);
            overlay?.SetActive(true);
        }

        private void ResumeFromOverlay()
        {
            State = _stateBeforePause == HideSeekStageState.Paused
                ? HideSeekStageState.Exploring
                : _stateBeforePause;
            _input.InputEnabled = true;
            _hints.Resume(resetIdle: true);
            SetPresentationPaused(false);
        }

        private IEnumerator WaitForUnpausedSeconds(float seconds)
        {
            var elapsed = 0f;
            while (elapsed < seconds)
            {
                if (State != HideSeekStageState.Paused)
                {
                    elapsed += Time.unscaledDeltaTime;
                }
                yield return null;
            }
        }

        private void SetPresentationPaused(bool paused)
        {
            if (_ink != null)
            {
                _ink.Paused = paused;
            }
            if (_tutorial != null)
            {
                _tutorial.Paused = paused;
            }
            if (_celebration != null)
            {
                _celebration.Paused = paused;
            }
            if (_creatures == null)
            {
                return;
            }
            for (var i = 0; i < _creatures.Length; i++)
            {
                _creatures[i].AnimationsPaused = paused;
            }
        }

        private void RefreshSettingsLabels()
        {
            _soundLabel.text = _audio.SoundEnabled ? "おと あり" : "おと なし";
            _motionLabel.text = _reduceMotion ? "うごき すくなめ" : "うごき そのまま";
        }

        private void DisposeDiscovery()
        {
            if (_discovery == null)
            {
                return;
            }
            _discovery.CreatureFound -= OnCreatureFound;
            _discovery.Dispose();
            _discovery = null;
        }

        private sealed class PointerState
        {
            public PointerState(Vector2 uv, Color color)
            {
                LastUv = uv;
                LastTime = Time.unscaledTime;
                Color = color;
            }

            public Vector2 LastUv;
            public float LastTime;
            public readonly Color Color;
            public float Speed;
            public float HoldElapsed;
            public float HoldInjectElapsed;
            public bool Moved;
        }
    }
}
