using System.Collections.Generic;

namespace Pono.ColorWaterDelivery.Core
{
    public readonly struct LeafGateSnapshot
    {
        internal LeafGateSnapshot(LeafGateDefinition definition, int directionIndex)
        {
            Id = definition.Id;
            Mode = definition.Mode;
            Directions = definition.Directions;
            DirectionIndex = directionIndex;
            Direction = definition.Directions[directionIndex];
        }

        public string Id { get; }

        public LeafGateMode Mode { get; }

        public IReadOnlyList<CardinalDirection> Directions { get; }

        public CardinalDirection Direction { get; }

        public int DirectionIndex { get; }
    }
}
