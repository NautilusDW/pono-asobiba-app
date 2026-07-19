namespace Pono.ColorWaterDelivery.Core
{
    public readonly struct DeliveryResult
    {
        internal DeliveryResult(
            WaterMixture mixture,
            DeliveryReaction reaction,
            float acceptedGreenAmount,
            bool completedStage,
            DeliverySnapshot snapshot)
        {
            Mixture = mixture;
            Reaction = reaction;
            AcceptedGreenAmount = acceptedGreenAmount;
            CompletedStage = completedStage;
            Snapshot = snapshot;
        }

        public WaterMixture Mixture { get; }

        public DeliveryReaction Reaction { get; }

        /// <summary>
        /// The part of this batch added to progress. It is clamped at the stage target.
        /// </summary>
        public float AcceptedGreenAmount { get; }

        public bool CompletedStage { get; }

        public DeliverySnapshot Snapshot { get; }

        public bool IsAccepted => Reaction == DeliveryReaction.GreenAccepted;

        public bool IsWrongColor => Reaction == DeliveryReaction.NeedsMoreBlue
            || Reaction == DeliveryReaction.NeedsMoreYellow;
    }
}
