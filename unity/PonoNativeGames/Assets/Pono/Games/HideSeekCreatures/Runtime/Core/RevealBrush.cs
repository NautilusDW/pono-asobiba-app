using System;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// A solid circular brush. RevealValue is a target value, not an additive delta.
    /// </summary>
    public readonly struct RevealBrush
    {
        public RevealBrush(int radiusCells, byte revealValue)
        {
            if (radiusCells < 0 || radiusCells > RevealMaskModel.MaxBrushRadius)
            {
                throw new ArgumentOutOfRangeException(nameof(radiusCells));
            }

            if (revealValue == 0)
            {
                throw new ArgumentOutOfRangeException(nameof(revealValue), "Reveal value must be greater than zero.");
            }

            RadiusCells = radiusCells;
            RevealValue = revealValue;
        }

        public int RadiusCells { get; }

        public byte RevealValue { get; }
    }
}
