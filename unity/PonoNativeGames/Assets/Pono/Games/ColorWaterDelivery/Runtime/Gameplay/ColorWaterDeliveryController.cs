using System.Collections;
using System.Collections.Generic;
using Pono.ColorWaterDelivery.Core;
using Pono.ColorWaterDelivery.Rendering;
using Pono.ColorWaterDelivery.UI;
using Pono.NativeShell;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.Gameplay
{
    [DisallowMultipleComponent]
    public sealed class ColorWaterDeliveryController : MonoBehaviour
    {
        public static readonly Vector2 BlueSourceUv = new Vector2(0.11f, 0.70f);
        public static readonly Vector2 YellowSourceUv = new Vector2(0.11f, 0.30f);
        public static readonly Vector2 MixingPoolUv = new Vector2(0.53f, 0.50f);
        public static readonly Vector2 GoalUv = new Vector2(0.83f, 0.50f);

        private const float SourceInterval = 1f / 15f;
        private const float MetricsInterval = 0.25f;
        private const float MinimumGoalCoverage = 0.18f;
        private const float MetricAmountScale = 0.22f;

        private readonly Dictionary<string, LeafGateView> _gateViews = new Dictionary<string, LeafGateView>();
        private readonly List<FluidObstacle> _obstacles = new List<FluidObstacle>();
        private ColorWaterFluidPresenter _fluid;
        private ColorWaterDeliveryModel _model;
        private Text _instruction;
        private Text _status;
        private Image[] _progressLeaves;
        private Image _rabbit;
        private GameObject _pausePanel;
        private GameObject _completePanel;
        private AudioSource _audio;
        private AudioClip _touchSound;
        private AudioClip _hintSound;
        private AudioClip _acceptedSound;
        private AudioClip _completeSound;
        private float _sourceClock;
        private float _metricsClock;
        private float _idleClock;
        private float _progressIdleClock;
        private int _tutorialStep;
        private bool _initialized;
        private bool _completionStarted;

        public ColorWaterDeliveryModel Model => _model;

        public ColorWaterFluidPresenter Fluid => _fluid;

        public bool IsPaused => _model?.IsPaused == true;

        public GoalFluidMetrics LastValidGoalMetrics { get; private set; }

        public float MaximumObservedGreen { get; private set; }

        public float MaximumObservedGreenCoverage { get; private set; }

        public int ValidGoalMetricCount { get; private set; }

        public void Initialize(
            ColorWaterFluidPresenter fluid,
            IReadOnlyList<LeafGateView> gateViews,
            Text instruction,
            Text status,
            Image[] progressLeaves,
            Image rabbit,
            GameObject pausePanel,
            GameObject completePanel)
        {
            _fluid = fluid;
            _instruction = instruction;
            _status = status;
            _progressLeaves = progressLeaves;
            _rabbit = rabbit;
            _pausePanel = pausePanel;
            _completePanel = completePanel;
            _gateViews.Clear();
            for (var index = 0; index < gateViews.Count; index++)
            {
                _gateViews.Add(gateViews[index].GateId, gateViews[index]);
            }

            _model = new ColorWaterDeliveryModel(
                ColorWaterDeliveryRules.Prototype,
                new[]
                {
                    new LeafGateDefinition(
                        "blue_gate",
                        new[] { CardinalDirection.East, CardinalDirection.South },
                        CardinalDirection.East),
                    new LeafGateDefinition(
                        "yellow_gate",
                        new[] { CardinalDirection.East, CardinalDirection.North },
                        CardinalDirection.East),
                    new LeafGateDefinition(
                        "goal_gate",
                        new[] { CardinalDirection.South, CardinalDirection.East },
                        CardinalDirection.South)
                });
            _model.DeliveryProcessed += OnDeliveryProcessed;
            _model.DeliveryCompleted += OnDeliveryCompleted;

            _audio = gameObject.AddComponent<AudioSource>();
            _audio.playOnAwake = false;
            _audio.spatialBlend = 0f;
            _touchSound = Resources.Load<AudioClip>("HideSeekCreatures/Audio/touch");
            _hintSound = Resources.Load<AudioClip>("HideSeekCreatures/Audio/hint");
            _acceptedSound = Resources.Load<AudioClip>("HideSeekCreatures/Audio/fog_clear");
            _completeSound = Resources.Load<AudioClip>("HideSeekCreatures/Audio/all_found");

            _fluid.SetGoal(FluidGoalRegion.Circle(GoalUv, 0.065f));
            StartSession();
            _initialized = true;
        }

        public void OnGateTapped(string gateId)
        {
            if (!_initialized || _model.IsPaused || _model.IsComplete)
            {
                return;
            }

            if (_model.TryAdvanceGate(gateId) != GateInputResult.Applied)
            {
                return;
            }

            var snapshot = _model.GetGateSnapshot(gateId);
            var view = _gateViews[gateId];
            view.SetDirection(snapshot.Direction);
            view.SetHint(false);
            ApplyObstacles();
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                view.CenterUv,
                DirectionVector(snapshot.Direction) * 0.36f,
                0.052f,
                0f);
            PlaySound(_touchSound, 0.50f);
            _idleClock = 0f;
            AdvanceTutorial(gateId);
        }

        public void TogglePause()
        {
            if (!_initialized || _model.IsComplete)
            {
                return;
            }

            var paused = !_model.IsPaused;
            _model.SetPaused(paused);
            _fluid.Paused = paused;
            _pausePanel.SetActive(paused);
            if (!paused)
            {
                _idleClock = 0f;
            }
        }

        public void ResetWater()
        {
            _fluid.ResetFluid();
            _sourceClock = 0f;
            _metricsClock = 0f;
            _status.text = "おみずを もどしたよ";
            PlaySound(_touchSound, 0.42f);
        }

        public void Restart()
        {
            StopAllCoroutines();
            _model.Reset();
            StartSession();
        }

        public void RequestExit()
        {
            NativeGameBridge.RequestExit();
        }

        private void Update()
        {
            if (!_initialized)
            {
                return;
            }

            if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            {
                TogglePause();
            }

            if (_model.IsPaused || _model.IsComplete)
            {
                return;
            }

            var deltaTime = Mathf.Min(Time.unscaledDeltaTime, 0.05f);
            _sourceClock += deltaTime;
            _metricsClock += deltaTime;
            _idleClock += deltaTime;
            _progressIdleClock += deltaTime;

            while (_sourceClock >= SourceInterval)
            {
                _sourceClock -= SourceInterval;
                EmitSources();
            }

            _fluid.Tick(deltaTime);
            if (_metricsClock >= MetricsInterval)
            {
                _metricsClock -= MetricsInterval;
                _fluid.RequestGoalMetrics(HandleGoalMetrics);
            }

            UpdateHints();
        }

        private void OnDestroy()
        {
            if (_model == null)
            {
                return;
            }
            _model.DeliveryProcessed -= OnDeliveryProcessed;
            _model.DeliveryCompleted -= OnDeliveryCompleted;
        }

        private void OnApplicationPause(bool paused)
        {
            if (_initialized && paused && !_model.IsPaused && !_model.IsComplete)
            {
                TogglePause();
            }
        }

        private void StartSession()
        {
            _completionStarted = false;
            _tutorialStep = 0;
            _sourceClock = 0f;
            _metricsClock = 0f;
            _idleClock = 0f;
            _progressIdleClock = 0f;
            LastValidGoalMetrics = GoalFluidMetrics.Invalid();
            MaximumObservedGreen = 0f;
            MaximumObservedGreenCoverage = 0f;
            ValidGoalMetricCount = 0;
            _fluid.Paused = false;
            _fluid.ResetFluid();
            _pausePanel.SetActive(false);
            _completePanel.SetActive(false);
            _instruction.text = "はっぱを さわって みずを まげよう";
            _status.text = "ふたつの みずは どこへ いくかな";
            _rabbit.color = Color.white;

            foreach (var pair in _gateViews)
            {
                var snapshot = _model.GetGateSnapshot(pair.Key);
                pair.Value.SetDirection(snapshot.Direction, instant: true);
                pair.Value.SetHint(pair.Key == "blue_gate");
            }

            for (var index = 0; index < _progressLeaves.Length; index++)
            {
                _progressLeaves[index].color = new Color(0.58f, 0.57f, 0.45f, 0.42f);
            }
            ApplyObstacles();
        }

        private void EmitSources()
        {
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                BlueSourceUv,
                new Vector2(0.92f, -0.01f),
                0.034f,
                0.14f);
            _fluid.InjectSource(
                ColorWaterSource.Yellow,
                YellowSourceUv,
                new Vector2(0.92f, 0.01f),
                0.034f,
                0.14f);

            // The leaf is a solid obstacle. This velocity-only impulse models
            // the small chute beneath it, so its selected direction visibly
            // steers the same simulated water instead of playing an animation.
            foreach (var pair in _gateViews)
            {
                var gate = _model.GetGateSnapshot(pair.Key);
                var strength = pair.Key == "goal_gate" ? 1.18f : 1.42f;
                _fluid.InjectSource(
                    ColorWaterSource.Blue,
                    pair.Value.CenterUv,
                    GateSteeringVector(pair.Key, gate.Direction) * strength,
                    pair.Key == "goal_gate" ? 0.060f : 0.068f,
                    0f);
            }

            var blueGate = _model.GetGateSnapshot("blue_gate");
            var yellowGate = _model.GetGateSnapshot("yellow_gate");
            if (blueGate.Direction == CardinalDirection.South
                && yellowGate.Direction == CardinalDirection.North)
            {
                EmitMixingVortex();
            }

            _fluid.InjectSource(
                ColorWaterSource.Blue,
                new Vector2(0.765f, 0.50f),
                new Vector2(0.24f, 0f),
                0.055f,
                0f);
        }

        private void HandleGoalMetrics(GoalFluidMetrics metrics)
        {
            if (!_initialized || _model.IsPaused || _model.IsComplete || !metrics.IsValid)
            {
                return;
            }

            LastValidGoalMetrics = metrics;
            MaximumObservedGreen = Mathf.Max(MaximumObservedGreen, metrics.Green);
            MaximumObservedGreenCoverage = Mathf.Max(
                MaximumObservedGreenCoverage,
                metrics.GreenCoverage);
            ValidGoalMetricCount++;

            if (metrics.GreenCoverage < MinimumGoalCoverage
                && metrics.Blue + metrics.Yellow < 0.12f)
            {
                return;
            }

            var mixture = new WaterMixture(
                metrics.Blue * MetricAmountScale,
                metrics.Yellow * MetricAmountScale);
            if (mixture.TotalAmount < 0.1f)
            {
                return;
            }

            _model.ProcessDelivery(mixture);
        }

        private void EmitMixingVortex()
        {
            const float offset = 0.048f;
            const float radius = 0.055f;
            const float swirl = 0.72f;
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                MixingPoolUv + Vector2.left * offset,
                Vector2.up * swirl,
                radius,
                0f);
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                MixingPoolUv + Vector2.up * offset,
                Vector2.right * swirl,
                radius,
                0f);
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                MixingPoolUv + Vector2.right * offset,
                Vector2.down * swirl,
                radius,
                0f);
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                MixingPoolUv + Vector2.down * offset,
                Vector2.left * swirl,
                radius,
                0f);
            _fluid.InjectSource(
                ColorWaterSource.Blue,
                MixingPoolUv,
                Vector2.right * 0.54f,
                0.064f,
                0f);
        }

        private void OnDeliveryProcessed(object sender, DeliveryProcessedEventArgs eventArgs)
        {
            var result = eventArgs.Result;
            if (result.IsAccepted)
            {
                _progressIdleClock = 0f;
                _status.text = "みどりの おみずが とどいてる！";
                UpdateProgressLeaves(result.Snapshot.Progress);
                PlaySound(_acceptedSound, 0.20f);
                return;
            }

            _status.text = result.Reaction switch
            {
                DeliveryReaction.NeedsMoreBlue => "あおも まぜてみよう",
                DeliveryReaction.NeedsMoreYellow => "きいろも まぜてみよう",
                _ => _status.text
            };
        }

        private void OnDeliveryCompleted(object sender, DeliveryCompletedEventArgs eventArgs)
        {
            if (_completionStarted)
            {
                return;
            }
            _completionStarted = true;
            StartCoroutine(CompleteRoutine());
        }

        private IEnumerator CompleteRoutine()
        {
            _instruction.text = "みどりの おみず とどいた！";
            _status.text = "ウサギさん うれしそう！";
            UpdateProgressLeaves(1f);
            PlaySound(_completeSound, 0.62f);
            var elapsed = 0f;
            while (elapsed < 1.2f)
            {
                elapsed += Time.unscaledDeltaTime;
                _fluid.Tick(Time.unscaledDeltaTime);
                var pulse = Mathf.Sin(elapsed * Mathf.PI * 3f) * 0.06f;
                _rabbit.rectTransform.localScale = Vector3.one * (1f + pulse);
                yield return null;
            }
            _rabbit.rectTransform.localScale = Vector3.one;
            _completePanel.SetActive(true);
        }

        private void AdvanceTutorial(string gateId)
        {
            if (_tutorialStep == 0 && gateId == "blue_gate")
            {
                _tutorialStep = 1;
                _gateViews["yellow_gate"].SetHint(true);
                _instruction.text = "もういちまいの はっぱも さわってみよう";
            }
            else if (_tutorialStep <= 1 && gateId == "yellow_gate")
            {
                _tutorialStep = 2;
                _gateViews["goal_gate"].SetHint(true);
                _instruction.text = "みどりの みずを おうちへ とどけよう";
            }
            else if (gateId == "goal_gate")
            {
                _tutorialStep = 3;
                _instruction.text = "みずの ながれを みてみよう";
            }
        }

        private void UpdateHints()
        {
            if (_idleClock < 10f && _progressIdleClock < 22f)
            {
                return;
            }

            var targetId = _tutorialStep switch
            {
                0 => "blue_gate",
                1 => "yellow_gate",
                _ => "goal_gate"
            };
            _gateViews[targetId].SetHint(true);
            if (_idleClock >= 10f)
            {
                _instruction.text = "ひかっている はっぱを さわってみよう";
                _idleClock = 0f;
                PlaySound(_hintSound, 0.24f);
            }
            _progressIdleClock = 0f;
        }

        private void ApplyObstacles()
        {
            _obstacles.Clear();
            _obstacles.Add(FluidObstacle.Circle(new Vector2(0.49f, 0.78f), 0.042f));
            _obstacles.Add(FluidObstacle.Circle(new Vector2(0.49f, 0.22f), 0.042f));
            foreach (var pair in _gateViews)
            {
                _obstacles.Add(FluidObstacle.LeafGate(
                    pair.Value.CenterUv,
                    length: pair.Key == "goal_gate" ? 0.16f : 0.18f,
                    radius: 0.018f,
                    angleDegrees: pair.Value.PhysicalAngleDegrees));
            }
            _fluid.SetObstacles(_obstacles);
        }

        private void UpdateProgressLeaves(float progress)
        {
            for (var index = 0; index < _progressLeaves.Length; index++)
            {
                var threshold = (index + 1f) / _progressLeaves.Length;
                _progressLeaves[index].color = progress + 0.001f >= threshold
                    ? new Color(0.24f, 0.78f, 0.34f, 1f)
                    : new Color(0.58f, 0.57f, 0.45f, 0.42f);
            }
        }

        private void PlaySound(AudioClip clip, float volume)
        {
            if (clip != null && _audio != null)
            {
                _audio.PlayOneShot(clip, volume);
            }
        }

        private static Vector2 DirectionVector(CardinalDirection direction)
        {
            return direction switch
            {
                CardinalDirection.North => Vector2.up,
                CardinalDirection.South => Vector2.down,
                CardinalDirection.West => Vector2.left,
                _ => Vector2.right
            };
        }

        private static Vector2 GateSteeringVector(
            string gateId,
            CardinalDirection direction)
        {
            if (gateId == "blue_gate" && direction == CardinalDirection.South)
            {
                return new Vector2(0.78f, -0.63f).normalized;
            }
            if (gateId == "yellow_gate" && direction == CardinalDirection.North)
            {
                return new Vector2(0.78f, 0.63f).normalized;
            }
            return DirectionVector(direction);
        }
    }
}
