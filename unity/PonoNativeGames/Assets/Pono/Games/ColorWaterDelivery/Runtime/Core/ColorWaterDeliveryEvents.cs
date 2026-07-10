using System;

namespace Pono.ColorWaterDelivery.Core
{
    public sealed class DeliveryProcessedEventArgs : EventArgs
    {
        internal DeliveryProcessedEventArgs(DeliveryResult result)
        {
            Result = result;
        }

        public DeliveryResult Result { get; }
    }

    public sealed class DeliveryCompletedEventArgs : EventArgs
    {
        internal DeliveryCompletedEventArgs(DeliverySnapshot snapshot)
        {
            Snapshot = snapshot;
        }

        public DeliverySnapshot Snapshot { get; }
    }

    public sealed class LeafGateChangedEventArgs : EventArgs
    {
        internal LeafGateChangedEventArgs(
            LeafGateSnapshot previous,
            LeafGateSnapshot current,
            DeliverySnapshot snapshot)
        {
            Previous = previous;
            Current = current;
            Snapshot = snapshot;
        }

        public LeafGateSnapshot Previous { get; }

        public LeafGateSnapshot Current { get; }

        public DeliverySnapshot Snapshot { get; }
    }

    public sealed class PauseChangedEventArgs : EventArgs
    {
        internal PauseChangedEventArgs(bool isPaused, DeliverySnapshot snapshot)
        {
            IsPaused = isPaused;
            Snapshot = snapshot;
        }

        public bool IsPaused { get; }

        public DeliverySnapshot Snapshot { get; }
    }

    public sealed class DeliveryResetEventArgs : EventArgs
    {
        internal DeliveryResetEventArgs(DeliverySnapshot snapshot)
        {
            Snapshot = snapshot;
        }

        public DeliverySnapshot Snapshot { get; }
    }
}
