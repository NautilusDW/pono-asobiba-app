using System;

namespace Pono.ColorWaterDelivery.Core
{
    /// <summary>
    /// A renderer-independent sample of the blue and yellow liquid reaching the goal.
    /// Amounts may use any unit as long as the caller and stage rules use the same unit.
    /// </summary>
    public readonly struct WaterMixture
    {
        public WaterMixture(float blueAmount, float yellowAmount)
        {
            ValidateAmount(blueAmount, nameof(blueAmount));
            ValidateAmount(yellowAmount, nameof(yellowAmount));

            if (float.IsInfinity(blueAmount + yellowAmount))
            {
                throw new ArgumentOutOfRangeException(
                    nameof(blueAmount),
                    "The combined mixture amount must be finite.");
            }

            BlueAmount = blueAmount;
            YellowAmount = yellowAmount;
        }

        public float BlueAmount { get; }

        public float YellowAmount { get; }

        public float TotalAmount => BlueAmount + YellowAmount;

        public bool IsEmpty => TotalAmount <= 0f;

        public float BlueFraction => IsEmpty ? 0f : BlueAmount / TotalAmount;

        public float YellowFraction => IsEmpty ? 0f : YellowAmount / TotalAmount;

        /// <summary>
        /// Zero is a perfect one-to-one mix. One is a single-colour sample.
        /// </summary>
        public float ImbalanceRatio => IsEmpty
            ? 0f
            : Math.Abs(BlueAmount - YellowAmount) / TotalAmount;

        private static void ValidateAmount(float amount, string parameterName)
        {
            if (float.IsNaN(amount) || float.IsInfinity(amount) || amount < 0f)
            {
                throw new ArgumentOutOfRangeException(parameterName);
            }
        }
    }
}
