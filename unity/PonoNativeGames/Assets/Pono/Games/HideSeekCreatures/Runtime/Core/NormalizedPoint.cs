using System;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// A finite point clamped to the normalized [0, 1] game surface.
    /// </summary>
    public readonly struct NormalizedPoint : IEquatable<NormalizedPoint>
    {
        public NormalizedPoint(float x, float y)
        {
            if (float.IsNaN(x) || float.IsInfinity(x))
            {
                throw new ArgumentOutOfRangeException(nameof(x), "The coordinate must be finite.");
            }

            if (float.IsNaN(y) || float.IsInfinity(y))
            {
                throw new ArgumentOutOfRangeException(nameof(y), "The coordinate must be finite.");
            }

            X = Clamp01(x);
            Y = Clamp01(y);
        }

        public float X { get; }

        public float Y { get; }

        public bool Equals(NormalizedPoint other)
        {
            return X.Equals(other.X) && Y.Equals(other.Y);
        }

        public override bool Equals(object obj)
        {
            return obj is NormalizedPoint other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                return (X.GetHashCode() * 397) ^ Y.GetHashCode();
            }
        }

        public static bool operator ==(NormalizedPoint left, NormalizedPoint right)
        {
            return left.Equals(right);
        }

        public static bool operator !=(NormalizedPoint left, NormalizedPoint right)
        {
            return !left.Equals(right);
        }

        private static float Clamp01(float value)
        {
            if (value < 0f)
            {
                return 0f;
            }

            return value > 1f ? 1f : value;
        }
    }
}
