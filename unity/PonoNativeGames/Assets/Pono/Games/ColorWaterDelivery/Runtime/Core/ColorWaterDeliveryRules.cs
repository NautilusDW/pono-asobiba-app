using System;

namespace Pono.ColorWaterDelivery.Core
{
    /// <summary>
    /// Tunable stage rules. The prototype target is a balanced blue/yellow mixture.
    /// </summary>
    public readonly struct ColorWaterDeliveryRules
    {
        public ColorWaterDeliveryRules(
            float requiredGreenAmount,
            float maximumImbalanceRatio,
            float minimumBatchAmount)
        {
            ValidateFinite(requiredGreenAmount, nameof(requiredGreenAmount));
            ValidateFinite(maximumImbalanceRatio, nameof(maximumImbalanceRatio));
            ValidateFinite(minimumBatchAmount, nameof(minimumBatchAmount));

            if (requiredGreenAmount <= 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(requiredGreenAmount));
            }

            if (maximumImbalanceRatio < 0f || maximumImbalanceRatio >= 1f)
            {
                throw new ArgumentOutOfRangeException(nameof(maximumImbalanceRatio));
            }

            if (minimumBatchAmount < 0f || minimumBatchAmount > requiredGreenAmount)
            {
                throw new ArgumentOutOfRangeException(nameof(minimumBatchAmount));
            }

            RequiredGreenAmount = requiredGreenAmount;
            MaximumImbalanceRatio = maximumImbalanceRatio;
            MinimumBatchAmount = minimumBatchAmount;
        }

        public float RequiredGreenAmount { get; }

        public float MaximumImbalanceRatio { get; }

        public float MinimumBatchAmount { get; }

        public static ColorWaterDeliveryRules Prototype => new ColorWaterDeliveryRules(
            requiredGreenAmount: 12f,
            maximumImbalanceRatio: 0.2f,
            minimumBatchAmount: 0.1f);

        internal void ThrowIfUninitialized()
        {
            if (RequiredGreenAmount <= 0f)
            {
                throw new ArgumentException("Delivery rules must be initialized.");
            }
        }

        private static void ValidateFinite(float value, string parameterName)
        {
            if (float.IsNaN(value) || float.IsInfinity(value))
            {
                throw new ArgumentOutOfRangeException(parameterName);
            }
        }
    }
}
