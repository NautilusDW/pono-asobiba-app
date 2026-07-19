namespace Pono.HideSeek.Core
{
    public enum CreatureDiscoveryStatus
    {
        Searching = 0,
        Holding = 1,
        Found = 2
    }

    public readonly struct CreatureDiscoverySnapshot
    {
        internal CreatureDiscoverySnapshot(
            string id,
            CreatureDiscoveryStatus status,
            int requiredRevealed,
            int requiredTotal,
            int faceRevealed,
            int faceTotal,
            int bodyRevealed,
            int bodyTotal,
            int featureRevealed,
            int featureTotal,
            int satisfiedAnchorRegions,
            float holdElapsedSeconds,
            float holdRequiredSeconds,
            bool isEligible)
        {
            Id = id;
            Status = status;
            RequiredRevealed = requiredRevealed;
            RequiredTotal = requiredTotal;
            FaceRevealed = faceRevealed;
            FaceTotal = faceTotal;
            BodyRevealed = bodyRevealed;
            BodyTotal = bodyTotal;
            FeatureRevealed = featureRevealed;
            FeatureTotal = featureTotal;
            SatisfiedAnchorRegions = satisfiedAnchorRegions;
            HoldElapsedSeconds = holdElapsedSeconds;
            HoldRequiredSeconds = holdRequiredSeconds;
            IsEligible = isEligible;
        }

        public string Id { get; }

        public CreatureDiscoveryStatus Status { get; }

        public int RequiredRevealed { get; }

        public int RequiredTotal { get; }

        public int FaceRevealed { get; }

        public int FaceTotal { get; }

        public int BodyRevealed { get; }

        public int BodyTotal { get; }

        public int FeatureRevealed { get; }

        public int FeatureTotal { get; }

        public int SatisfiedAnchorRegions { get; }

        public float HoldElapsedSeconds { get; }

        public float HoldRequiredSeconds { get; }

        public bool IsEligible { get; }

        public bool IsFound => Status == CreatureDiscoveryStatus.Found;

        public float RequiredCoverage => Ratio(RequiredRevealed, RequiredTotal);

        public float FaceCoverage => Ratio(FaceRevealed, FaceTotal);

        public float BodyCoverage => Ratio(BodyRevealed, BodyTotal);

        public float FeatureCoverage => Ratio(FeatureRevealed, FeatureTotal);

        public float HoldProgress => HoldRequiredSeconds <= 0f
            ? (IsEligible ? 1f : 0f)
            : HoldElapsedSeconds / HoldRequiredSeconds;

        private static float Ratio(int numerator, int denominator)
        {
            return denominator == 0 ? 0f : numerator / (float)denominator;
        }
    }
}
