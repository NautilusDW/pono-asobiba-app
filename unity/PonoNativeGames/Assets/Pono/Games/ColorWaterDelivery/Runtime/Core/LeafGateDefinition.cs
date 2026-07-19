using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Pono.ColorWaterDelivery.Core
{
    public enum CardinalDirection
    {
        North = 0,
        East = 1,
        South = 2,
        West = 3
    }

    public enum LeafGateMode
    {
        TwoWay = 2,
        FourWay = 4
    }

    /// <summary>
    /// Immutable route choices for one leaf gate. Ordering defines its switch cycle.
    /// </summary>
    public sealed class LeafGateDefinition
    {
        private readonly ReadOnlyCollection<CardinalDirection> _directions;

        public LeafGateDefinition(
            string id,
            IEnumerable<CardinalDirection> directions,
            CardinalDirection initialDirection)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                throw new ArgumentException("A gate id is required.", nameof(id));
            }

            if (directions == null)
            {
                throw new ArgumentNullException(nameof(directions));
            }

            var copiedDirections = new List<CardinalDirection>(4);
            var uniqueDirections = new HashSet<CardinalDirection>();
            foreach (var direction in directions)
            {
                ValidateDirection(direction, nameof(directions));
                if (!uniqueDirections.Add(direction))
                {
                    throw new ArgumentException("Gate directions must be unique.", nameof(directions));
                }

                copiedDirections.Add(direction);
            }

            if (copiedDirections.Count != (int)LeafGateMode.TwoWay
                && copiedDirections.Count != (int)LeafGateMode.FourWay)
            {
                throw new ArgumentException(
                    "A leaf gate must expose exactly two or four directions.",
                    nameof(directions));
            }

            ValidateDirection(initialDirection, nameof(initialDirection));
            var initialIndex = copiedDirections.IndexOf(initialDirection);
            if (initialIndex < 0)
            {
                throw new ArgumentException(
                    "The initial direction must be one of the gate directions.",
                    nameof(initialDirection));
            }

            Id = id;
            Mode = (LeafGateMode)copiedDirections.Count;
            InitialDirection = initialDirection;
            InitialDirectionIndex = initialIndex;
            _directions = new ReadOnlyCollection<CardinalDirection>(copiedDirections);
        }

        public string Id { get; }

        public LeafGateMode Mode { get; }

        public CardinalDirection InitialDirection { get; }

        public int InitialDirectionIndex { get; }

        public IReadOnlyList<CardinalDirection> Directions => _directions;

        internal int IndexOf(CardinalDirection direction)
        {
            return _directions.IndexOf(direction);
        }

        private static void ValidateDirection(CardinalDirection direction, string parameterName)
        {
            if (!Enum.IsDefined(typeof(CardinalDirection), direction))
            {
                throw new ArgumentOutOfRangeException(parameterName);
            }
        }
    }
}
