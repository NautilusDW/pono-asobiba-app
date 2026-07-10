using System;

namespace Pono.HideSeek.Core
{
    public readonly struct CreatureDiscoveryRules
    {
        public CreatureDiscoveryRules(
            float requiredCoverageRatio,
            float anchorCoverageRatio,
            int minimumAnchorRegions,
            float holdSeconds)
        {
            ValidateRatio(requiredCoverageRatio, nameof(requiredCoverageRatio));
            ValidateRatio(anchorCoverageRatio, nameof(anchorCoverageRatio));

            if (minimumAnchorRegions < 1 || minimumAnchorRegions > 3)
            {
                throw new ArgumentOutOfRangeException(nameof(minimumAnchorRegions));
            }

            if (float.IsNaN(holdSeconds) || float.IsInfinity(holdSeconds) || holdSeconds < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(holdSeconds));
            }

            RequiredCoverageRatio = requiredCoverageRatio;
            AnchorCoverageRatio = anchorCoverageRatio;
            MinimumAnchorRegions = minimumAnchorRegions;
            HoldSeconds = holdSeconds;
        }

        public static CreatureDiscoveryRules Default => new CreatureDiscoveryRules(
            requiredCoverageRatio: 0.55f,
            anchorCoverageRatio: 0.5f,
            minimumAnchorRegions: 2,
            holdSeconds: 0.35f);

        public float RequiredCoverageRatio { get; }

        public float AnchorCoverageRatio { get; }

        public int MinimumAnchorRegions { get; }

        public float HoldSeconds { get; }

        private static void ValidateRatio(float value, string parameterName)
        {
            if (float.IsNaN(value) || float.IsInfinity(value) || value < 0f || value > 1f)
            {
                throw new ArgumentOutOfRangeException(parameterName);
            }
        }
    }
}
