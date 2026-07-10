using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Pono.ColorWaterDelivery.Core
{
    public enum GateInputResult
    {
        Applied = 0,
        NoChange = 1,
        UnknownGate = 2,
        InvalidDirection = 3,
        RejectedPaused = 4,
        RejectedComplete = 5
    }

    public enum PauseInputResult
    {
        Applied = 0,
        NoChange = 1,
        RejectedComplete = 2
    }

    /// <summary>
    /// Deterministic game progress for the one-stage colour-water prototype.
    /// Rendering and fluid simulation feed goal samples into this model.
    /// </summary>
    public sealed class ColorWaterDeliveryModel
    {
        public const int MinimumGateCount = 2;
        public const int MaximumGateCount = 3;

        private readonly ColorWaterDeliveryRules _rules;
        private readonly List<LeafGateState> _gates;
        private readonly Dictionary<string, LeafGateState> _gatesById;
        private float _deliveredGreenAmount;
        private int _acceptedDeliveryCount;
        private int _wrongColorDeliveryCount;
        private int _deliveryAttemptCount;
        private DeliveryReaction _lastReaction;
        private bool _paused;
        private bool _complete;
        private long _revision;

        public ColorWaterDeliveryModel(
            ColorWaterDeliveryRules rules,
            IEnumerable<LeafGateDefinition> gateDefinitions)
        {
            rules.ThrowIfUninitialized();
            if (gateDefinitions == null)
            {
                throw new ArgumentNullException(nameof(gateDefinitions));
            }

            _rules = rules;
            _gates = new List<LeafGateState>(MaximumGateCount);
            _gatesById = new Dictionary<string, LeafGateState>(
                MaximumGateCount,
                StringComparer.Ordinal);

            foreach (var definition in gateDefinitions)
            {
                if (definition == null)
                {
                    throw new ArgumentException(
                        "Gate definitions must not contain null.",
                        nameof(gateDefinitions));
                }

                if (_gatesById.ContainsKey(definition.Id))
                {
                    throw new ArgumentException(
                        "Gate ids must be unique.",
                        nameof(gateDefinitions));
                }

                var state = new LeafGateState(definition);
                _gates.Add(state);
                _gatesById.Add(definition.Id, state);
            }

            if (_gates.Count < MinimumGateCount || _gates.Count > MaximumGateCount)
            {
                throw new ArgumentException(
                    $"The prototype requires {MinimumGateCount} or {MaximumGateCount} leaf gates.",
                    nameof(gateDefinitions));
            }
        }

        public event EventHandler<DeliveryProcessedEventArgs> DeliveryProcessed;

        public event EventHandler<DeliveryCompletedEventArgs> DeliveryCompleted;

        public event EventHandler<LeafGateChangedEventArgs> GateChanged;

        public event EventHandler<PauseChangedEventArgs> PauseChanged;

        public event EventHandler<DeliveryResetEventArgs> ResetPerformed;

        public bool IsPaused => _paused;

        public bool IsComplete => _complete;

        public int GateCount => _gates.Count;

        public DeliverySnapshot GetSnapshot()
        {
            var gateSnapshots = new List<LeafGateSnapshot>(_gates.Count);
            for (var index = 0; index < _gates.Count; index++)
            {
                gateSnapshots.Add(CreateGateSnapshot(_gates[index]));
            }

            return new DeliverySnapshot(
                GetStatus(),
                _deliveredGreenAmount,
                _rules.RequiredGreenAmount,
                _acceptedDeliveryCount,
                _wrongColorDeliveryCount,
                _deliveryAttemptCount,
                _lastReaction,
                _revision,
                new ReadOnlyCollection<LeafGateSnapshot>(gateSnapshots));
        }

        public LeafGateSnapshot GetGateSnapshot(string gateId)
        {
            if (gateId == null)
            {
                throw new ArgumentNullException(nameof(gateId));
            }

            if (!_gatesById.TryGetValue(gateId, out var gate))
            {
                throw new KeyNotFoundException($"Unknown leaf gate id: {gateId}");
            }

            return CreateGateSnapshot(gate);
        }

        public bool TryGetGateSnapshot(string gateId, out LeafGateSnapshot snapshot)
        {
            if (gateId != null && _gatesById.TryGetValue(gateId, out var gate))
            {
                snapshot = CreateGateSnapshot(gate);
                return true;
            }

            snapshot = default;
            return false;
        }

        public DeliveryResult ProcessDelivery(WaterMixture mixture)
        {
            if (_complete)
            {
                return PublishDeliveryResult(
                    mixture,
                    DeliveryReaction.IgnoredComplete,
                    0f,
                    completedStage: false);
            }

            if (_paused)
            {
                return PublishDeliveryResult(
                    mixture,
                    DeliveryReaction.IgnoredPaused,
                    0f,
                    completedStage: false);
            }

            var reaction = Classify(mixture);
            var acceptedAmount = 0f;
            var completedStage = false;

            _deliveryAttemptCount++;
            _lastReaction = reaction;
            _revision++;

            if (reaction == DeliveryReaction.GreenAccepted)
            {
                _acceptedDeliveryCount++;
                var remaining = _rules.RequiredGreenAmount - _deliveredGreenAmount;
                acceptedAmount = Math.Min(remaining, mixture.TotalAmount);
                _deliveredGreenAmount += acceptedAmount;

                if (_deliveredGreenAmount >= _rules.RequiredGreenAmount)
                {
                    _deliveredGreenAmount = _rules.RequiredGreenAmount;
                    _complete = true;
                    completedStage = true;
                }
            }
            else if (reaction == DeliveryReaction.NeedsMoreBlue
                || reaction == DeliveryReaction.NeedsMoreYellow)
            {
                _wrongColorDeliveryCount++;
            }

            var result = PublishDeliveryResult(
                mixture,
                reaction,
                acceptedAmount,
                completedStage);

            if (completedStage)
            {
                DeliveryCompleted?.Invoke(
                    this,
                    new DeliveryCompletedEventArgs(result.Snapshot));
            }

            return result;
        }

        public GateInputResult TrySetGateDirection(
            string gateId,
            CardinalDirection direction)
        {
            if (!_gatesById.TryGetValue(gateId ?? string.Empty, out var gate))
            {
                return GateInputResult.UnknownGate;
            }

            var directionIndex = gate.Definition.IndexOf(direction);
            if (directionIndex < 0)
            {
                return GateInputResult.InvalidDirection;
            }

            return TryApplyGateDirection(gate, directionIndex);
        }

        public GateInputResult TryAdvanceGate(string gateId)
        {
            if (!_gatesById.TryGetValue(gateId ?? string.Empty, out var gate))
            {
                return GateInputResult.UnknownGate;
            }

            var nextDirectionIndex = (gate.DirectionIndex + 1) % gate.Definition.Directions.Count;
            return TryApplyGateDirection(gate, nextDirectionIndex);
        }

        public PauseInputResult SetPaused(bool paused)
        {
            if (_complete)
            {
                return PauseInputResult.RejectedComplete;
            }

            if (_paused == paused)
            {
                return PauseInputResult.NoChange;
            }

            _paused = paused;
            _revision++;
            var snapshot = GetSnapshot();
            PauseChanged?.Invoke(this, new PauseChangedEventArgs(_paused, snapshot));
            return PauseInputResult.Applied;
        }

        public void Reset()
        {
            _deliveredGreenAmount = 0f;
            _acceptedDeliveryCount = 0;
            _wrongColorDeliveryCount = 0;
            _deliveryAttemptCount = 0;
            _lastReaction = DeliveryReaction.None;
            _paused = false;
            _complete = false;

            for (var index = 0; index < _gates.Count; index++)
            {
                _gates[index].DirectionIndex = _gates[index].Definition.InitialDirectionIndex;
            }

            _revision++;
            ResetPerformed?.Invoke(this, new DeliveryResetEventArgs(GetSnapshot()));
        }

        private DeliveryReaction Classify(WaterMixture mixture)
        {
            if (mixture.IsEmpty)
            {
                return DeliveryReaction.Empty;
            }

            if (mixture.TotalAmount < _rules.MinimumBatchAmount)
            {
                return DeliveryReaction.TooLittle;
            }

            if (mixture.ImbalanceRatio <= _rules.MaximumImbalanceRatio)
            {
                return DeliveryReaction.GreenAccepted;
            }

            return mixture.BlueAmount > mixture.YellowAmount
                ? DeliveryReaction.NeedsMoreYellow
                : DeliveryReaction.NeedsMoreBlue;
        }

        private DeliveryResult PublishDeliveryResult(
            WaterMixture mixture,
            DeliveryReaction reaction,
            float acceptedGreenAmount,
            bool completedStage)
        {
            var result = new DeliveryResult(
                mixture,
                reaction,
                acceptedGreenAmount,
                completedStage,
                GetSnapshot());
            DeliveryProcessed?.Invoke(this, new DeliveryProcessedEventArgs(result));
            return result;
        }

        private GateInputResult TryApplyGateDirection(LeafGateState gate, int directionIndex)
        {
            if (_complete)
            {
                return GateInputResult.RejectedComplete;
            }

            if (_paused)
            {
                return GateInputResult.RejectedPaused;
            }

            if (gate.DirectionIndex == directionIndex)
            {
                return GateInputResult.NoChange;
            }

            var previous = CreateGateSnapshot(gate);
            gate.DirectionIndex = directionIndex;
            _revision++;
            var current = CreateGateSnapshot(gate);
            GateChanged?.Invoke(
                this,
                new LeafGateChangedEventArgs(previous, current, GetSnapshot()));
            return GateInputResult.Applied;
        }

        private ColorWaterDeliveryStatus GetStatus()
        {
            if (_complete)
            {
                return ColorWaterDeliveryStatus.Complete;
            }

            return _paused
                ? ColorWaterDeliveryStatus.Paused
                : ColorWaterDeliveryStatus.Running;
        }

        private static LeafGateSnapshot CreateGateSnapshot(LeafGateState gate)
        {
            return new LeafGateSnapshot(gate.Definition, gate.DirectionIndex);
        }

        private sealed class LeafGateState
        {
            public LeafGateState(LeafGateDefinition definition)
            {
                Definition = definition;
                DirectionIndex = definition.InitialDirectionIndex;
            }

            public LeafGateDefinition Definition { get; }

            public int DirectionIndex { get; set; }
        }
    }
}
