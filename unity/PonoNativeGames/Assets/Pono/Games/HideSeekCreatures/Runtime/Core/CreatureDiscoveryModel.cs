using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// Order-independent discovery state for exactly three creatures.
    /// </summary>
    public sealed class CreatureDiscoveryModel : IDisposable
    {
        public const int CreatureCount = 3;

        private readonly RevealMaskModel _revealMask;
        private readonly List<CreatureRuntimeState> _creatures;
        private readonly Dictionary<string, CreatureRuntimeState> _creaturesById;
        private readonly List<string> _foundOrder = new List<string>(CreatureCount);
        private readonly ReadOnlyCollection<string> _readOnlyFoundOrder;
        private bool _disposed;
        private bool _allFoundEventRaised;

        public CreatureDiscoveryModel(
            RevealMaskModel revealMask,
            IEnumerable<CreatureDiscoveryDefinition> definitions)
        {
            _revealMask = revealMask ?? throw new ArgumentNullException(nameof(revealMask));
            if (definitions == null)
            {
                throw new ArgumentNullException(nameof(definitions));
            }

            _creatures = new List<CreatureRuntimeState>(CreatureCount);
            _creaturesById = new Dictionary<string, CreatureRuntimeState>(
                CreatureCount,
                StringComparer.Ordinal);

            foreach (var definition in definitions)
            {
                if (definition == null)
                {
                    throw new ArgumentException("Definitions must not contain null.", nameof(definitions));
                }

                if (_creaturesById.ContainsKey(definition.Id))
                {
                    throw new ArgumentException("Creature ids must be unique.", nameof(definitions));
                }

                var creature = new CreatureRuntimeState(definition);
                _creatures.Add(creature);
                _creaturesById.Add(definition.Id, creature);
            }

            if (_creatures.Count != CreatureCount)
            {
                throw new ArgumentException(
                    $"Exactly {CreatureCount} creature definitions are required.",
                    nameof(definitions));
            }

            _readOnlyFoundOrder = new ReadOnlyCollection<string>(_foundOrder);
            InitializeFromMask();
            _revealMask.ThresholdCrossed += OnThresholdCrossed;
        }

        public event EventHandler<CreatureFoundEventArgs> CreatureFound;

        public event EventHandler AllCreaturesFound;

        public int FoundCount => _foundOrder.Count;

        public bool AllFound => FoundCount == CreatureCount;

        public IReadOnlyList<string> FoundOrder => _readOnlyFoundOrder;

        public CreatureDiscoverySnapshot GetSnapshot(string creatureId)
        {
            if (creatureId == null)
            {
                throw new ArgumentNullException(nameof(creatureId));
            }

            if (!_creaturesById.TryGetValue(creatureId, out var creature))
            {
                throw new KeyNotFoundException($"Unknown creature id: {creatureId}");
            }

            return CreateSnapshot(creature);
        }

        public bool TryGetSnapshot(string creatureId, out CreatureDiscoverySnapshot snapshot)
        {
            if (creatureId != null && _creaturesById.TryGetValue(creatureId, out var creature))
            {
                snapshot = CreateSnapshot(creature);
                return true;
            }

            snapshot = default;
            return false;
        }

        /// <summary>
        /// Advances hold timers. Found is terminal and can never return to Holding.
        /// </summary>
        public void Advance(float deltaSeconds)
        {
            ThrowIfDisposed();

            if (float.IsNaN(deltaSeconds)
                || float.IsInfinity(deltaSeconds)
                || deltaSeconds < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(deltaSeconds));
            }

            for (var index = 0; index < _creatures.Count; index++)
            {
                var creature = _creatures[index];
                if (creature.Status == CreatureDiscoveryStatus.Found)
                {
                    continue;
                }

                EvaluateEligibility(creature);
                if (creature.Status != CreatureDiscoveryStatus.Holding)
                {
                    continue;
                }

                creature.HoldElapsedSeconds = Math.Min(
                    creature.Definition.Rules.HoldSeconds,
                    creature.HoldElapsedSeconds + deltaSeconds);

                if (creature.HoldElapsedSeconds >= creature.Definition.Rules.HoldSeconds)
                {
                    MarkFound(creature);
                }
            }
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _revealMask.ThresholdCrossed -= OnThresholdCrossed;
            _disposed = true;
        }

        private void InitializeFromMask()
        {
            for (var creatureIndex = 0; creatureIndex < _creatures.Count; creatureIndex++)
            {
                var creature = _creatures[creatureIndex];
                creature.RequiredRevealed = CountRevealed(creature.RequiredCells);
                creature.FaceRevealed = CountRevealed(creature.FaceCells);
                creature.BodyRevealed = CountRevealed(creature.BodyCells);
                creature.FeatureRevealed = CountRevealed(creature.FeatureCells);
                EvaluateEligibility(creature);
            }
        }

        private int CountRevealed(HashSet<int> cells)
        {
            var count = 0;
            foreach (var cellIndex in cells)
            {
                if (_revealMask.IsThresholdReached(cellIndex))
                {
                    count++;
                }
            }

            return count;
        }

        private void OnThresholdCrossed(object sender, RevealThresholdCrossedEventArgs eventArgs)
        {
            if (_disposed)
            {
                return;
            }

            for (var cellOffset = 0; cellOffset < eventArgs.CellIndices.Count; cellOffset++)
            {
                var cellIndex = eventArgs.CellIndices[cellOffset];
                for (var creatureIndex = 0; creatureIndex < _creatures.Count; creatureIndex++)
                {
                    var creature = _creatures[creatureIndex];
                    if (creature.Status == CreatureDiscoveryStatus.Found)
                    {
                        continue;
                    }

                    var changed = false;
                    if (creature.RequiredCells.Contains(cellIndex))
                    {
                        creature.RequiredRevealed++;
                        changed = true;
                    }

                    if (creature.FaceCells.Contains(cellIndex))
                    {
                        creature.FaceRevealed++;
                        changed = true;
                    }

                    if (creature.BodyCells.Contains(cellIndex))
                    {
                        creature.BodyRevealed++;
                        changed = true;
                    }

                    if (creature.FeatureCells.Contains(cellIndex))
                    {
                        creature.FeatureRevealed++;
                        changed = true;
                    }

                    if (changed)
                    {
                        EvaluateEligibility(creature);
                    }
                }
            }
        }

        private static void EvaluateEligibility(CreatureRuntimeState creature)
        {
            if (creature.Status != CreatureDiscoveryStatus.Searching)
            {
                return;
            }

            if (IsEligible(creature))
            {
                creature.Status = CreatureDiscoveryStatus.Holding;
                creature.HoldElapsedSeconds = 0f;
            }
        }

        private static bool IsEligible(CreatureRuntimeState creature)
        {
            var rules = creature.Definition.Rules;
            var requiredRatio = Ratio(creature.RequiredRevealed, creature.RequiredCells.Count);
            if (requiredRatio < rules.RequiredCoverageRatio)
            {
                return false;
            }

            var satisfiedAnchors = CountSatisfiedAnchors(creature);
            return satisfiedAnchors >= rules.MinimumAnchorRegions;
        }

        private static int CountSatisfiedAnchors(CreatureRuntimeState creature)
        {
            var threshold = creature.Definition.Rules.AnchorCoverageRatio;
            var count = 0;

            if (Ratio(creature.FaceRevealed, creature.FaceCells.Count) >= threshold)
            {
                count++;
            }

            if (Ratio(creature.BodyRevealed, creature.BodyCells.Count) >= threshold)
            {
                count++;
            }

            if (Ratio(creature.FeatureRevealed, creature.FeatureCells.Count) >= threshold)
            {
                count++;
            }

            return count;
        }

        private void MarkFound(CreatureRuntimeState creature)
        {
            if (creature.Status == CreatureDiscoveryStatus.Found)
            {
                return;
            }

            creature.Status = CreatureDiscoveryStatus.Found;
            creature.HoldElapsedSeconds = creature.Definition.Rules.HoldSeconds;
            _foundOrder.Add(creature.Definition.Id);

            var snapshot = CreateSnapshot(creature);
            CreatureFound?.Invoke(
                this,
                new CreatureFoundEventArgs(snapshot, FoundCount, CreatureCount));

            if (AllFound && !_allFoundEventRaised)
            {
                _allFoundEventRaised = true;
                AllCreaturesFound?.Invoke(this, EventArgs.Empty);
            }
        }

        private static CreatureDiscoverySnapshot CreateSnapshot(CreatureRuntimeState creature)
        {
            return new CreatureDiscoverySnapshot(
                creature.Definition.Id,
                creature.Status,
                creature.RequiredRevealed,
                creature.RequiredCells.Count,
                creature.FaceRevealed,
                creature.FaceCells.Count,
                creature.BodyRevealed,
                creature.BodyCells.Count,
                creature.FeatureRevealed,
                creature.FeatureCells.Count,
                CountSatisfiedAnchors(creature),
                creature.HoldElapsedSeconds,
                creature.Definition.Rules.HoldSeconds,
                IsEligible(creature));
        }

        private static float Ratio(int numerator, int denominator)
        {
            return numerator / (float)denominator;
        }

        private void ThrowIfDisposed()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException(nameof(CreatureDiscoveryModel));
            }
        }

        private sealed class CreatureRuntimeState
        {
            public CreatureRuntimeState(CreatureDiscoveryDefinition definition)
            {
                Definition = definition;
                RequiredCells = new HashSet<int>(definition.RequiredCells);
                FaceCells = new HashSet<int>(definition.FaceCells);
                BodyCells = new HashSet<int>(definition.BodyCells);
                FeatureCells = new HashSet<int>(definition.FeatureCells);
                Status = CreatureDiscoveryStatus.Searching;
            }

            public CreatureDiscoveryDefinition Definition { get; }

            public HashSet<int> RequiredCells { get; }

            public HashSet<int> FaceCells { get; }

            public HashSet<int> BodyCells { get; }

            public HashSet<int> FeatureCells { get; }

            public CreatureDiscoveryStatus Status { get; set; }

            public int RequiredRevealed { get; set; }

            public int FaceRevealed { get; set; }

            public int BodyRevealed { get; set; }

            public int FeatureRevealed { get; set; }

            public float HoldElapsedSeconds { get; set; }
        }
    }
}
