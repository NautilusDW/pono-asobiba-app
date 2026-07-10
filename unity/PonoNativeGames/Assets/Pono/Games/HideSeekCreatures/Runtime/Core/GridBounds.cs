using System;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// Inclusive integer bounds over the reveal grid.
    /// </summary>
    public readonly struct GridBounds : IEquatable<GridBounds>
    {
        private GridBounds(bool isEmpty, int minX, int minY, int maxX, int maxY)
        {
            IsEmpty = isEmpty;
            MinX = minX;
            MinY = minY;
            MaxX = maxX;
            MaxY = maxY;
        }

        public GridBounds(int minX, int minY, int maxX, int maxY)
        {
            if (minX > maxX)
            {
                throw new ArgumentException("minX must not exceed maxX.", nameof(minX));
            }

            if (minY > maxY)
            {
                throw new ArgumentException("minY must not exceed maxY.", nameof(minY));
            }

            IsEmpty = false;
            MinX = minX;
            MinY = minY;
            MaxX = maxX;
            MaxY = maxY;
        }

        public static GridBounds Empty => new GridBounds(true, 0, 0, -1, -1);

        public bool IsEmpty { get; }

        public int MinX { get; }

        public int MinY { get; }

        public int MaxX { get; }

        public int MaxY { get; }

        public int Width => IsEmpty ? 0 : MaxX - MinX + 1;

        public int Height => IsEmpty ? 0 : MaxY - MinY + 1;

        public GridBounds Encapsulate(int x, int y)
        {
            if (IsEmpty)
            {
                return new GridBounds(x, y, x, y);
            }

            return new GridBounds(
                Math.Min(MinX, x),
                Math.Min(MinY, y),
                Math.Max(MaxX, x),
                Math.Max(MaxY, y));
        }

        public GridBounds Encapsulate(GridBounds other)
        {
            if (other.IsEmpty)
            {
                return this;
            }

            if (IsEmpty)
            {
                return other;
            }

            return new GridBounds(
                Math.Min(MinX, other.MinX),
                Math.Min(MinY, other.MinY),
                Math.Max(MaxX, other.MaxX),
                Math.Max(MaxY, other.MaxY));
        }

        public bool Contains(int x, int y)
        {
            return !IsEmpty && x >= MinX && x <= MaxX && y >= MinY && y <= MaxY;
        }

        public bool Equals(GridBounds other)
        {
            if (IsEmpty && other.IsEmpty)
            {
                return true;
            }

            return IsEmpty == other.IsEmpty
                && MinX == other.MinX
                && MinY == other.MinY
                && MaxX == other.MaxX
                && MaxY == other.MaxY;
        }

        public override bool Equals(object obj)
        {
            return obj is GridBounds other && Equals(other);
        }

        public override int GetHashCode()
        {
            if (IsEmpty)
            {
                return 0;
            }

            unchecked
            {
                var hashCode = MinX;
                hashCode = (hashCode * 397) ^ MinY;
                hashCode = (hashCode * 397) ^ MaxX;
                hashCode = (hashCode * 397) ^ MaxY;
                return hashCode;
            }
        }

        public static bool operator ==(GridBounds left, GridBounds right)
        {
            return left.Equals(right);
        }

        public static bool operator !=(GridBounds left, GridBounds right)
        {
            return !left.Equals(right);
        }
    }
}
