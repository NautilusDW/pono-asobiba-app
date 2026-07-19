using System.Collections.Generic;

namespace Pono.ColorWaterDelivery.Core
{
    public enum ColorWaterDeliveryStatus
    {
        Running = 0,
        Paused = 1,
        Complete = 2
    }

    public enum DeliveryReaction
    {
        None = 0,
        GreenAccepted = 1,
        NeedsMoreBlue = 2,
        NeedsMoreYellow = 3,
        TooLittle = 4,
        Empty = 5,
        IgnoredPaused = 6,
        IgnoredComplete = 7
    }

    /// <summary>
    /// Immutable view of all state needed by gameplay UI and persistence adapters.
    /// </summary>
    public readonly struct DeliverySnapshot
    {
        internal DeliverySnapshot(
            ColorWaterDeliveryStatus status,
            float deliveredGreenAmount,
            float requiredGreenAmount,
            int acceptedDeliveryCount,
            int wrongColorDeliveryCount,
            int deliveryAttemptCount,
            DeliveryReaction lastReaction,
            long revision,
            IReadOnlyList<LeafGateSnapshot> gates)
        {
            Status = status;
            DeliveredGreenAmount = deliveredGreenAmount;
            RequiredGreenAmount = requiredGreenAmount;
            AcceptedDeliveryCount = acceptedDeliveryCount;
            WrongColorDeliveryCount = wrongColorDeliveryCount;
            DeliveryAttemptCount = deliveryAttemptCount;
            LastReaction = lastReaction;
            Revision = revision;
            Gates = gates;
        }

        public ColorWaterDeliveryStatus Status { get; }

        public float DeliveredGreenAmount { get; }

        public float RequiredGreenAmount { get; }

        public int AcceptedDeliveryCount { get; }

        public int WrongColorDeliveryCount { get; }

        public int DeliveryAttemptCount { get; }

        public DeliveryReaction LastReaction { get; }

        public long Revision { get; }

        public IReadOnlyList<LeafGateSnapshot> Gates { get; }

        public bool IsPaused => Status == ColorWaterDeliveryStatus.Paused;

        public bool IsComplete => Status == ColorWaterDeliveryStatus.Complete;

        public float Progress => RequiredGreenAmount <= 0f
            ? 0f
            : DeliveredGreenAmount / RequiredGreenAmount;
    }
}
