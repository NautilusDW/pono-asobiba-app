using System;
using System.Collections.Generic;

namespace Pono.HideSeek.Core
{
    /// <summary>
    /// CPU-side reveal state for the 256x144 ink mask. Cell values can only increase.
    /// </summary>
    public sealed class RevealMaskModel
    {
        public const int Width = 256;
        public const int Height = 144;
        public const int CellCount = Width * Height;
        public const int MaxBrushRadius = 64;
        public const byte DefaultRevealThreshold = 160;

        private readonly byte[] _values = new byte[CellCount];
        private readonly List<int> _thresholdCrossings = new List<int>(256);
        private GridBounds _dirtyBounds = GridBounds.Empty;

        public RevealMaskModel(byte revealThreshold = DefaultRevealThreshold)
        {
            if (revealThreshold == 0)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(revealThreshold),
                    "The reveal threshold must be greater than zero.");
            }

            RevealThreshold = revealThreshold;
        }

        public event EventHandler<RevealThresholdCrossedEventArgs> ThresholdCrossed;

        public byte RevealThreshold { get; }

        /// <summary>
        /// Increments once for each public stroke or stamp that changes at least one cell.
        /// </summary>
        public long Version { get; private set; }

        public bool IsDirty => !_dirtyBounds.IsEmpty;

        /// <summary>
        /// Bounds accumulated since the most recent MarkClean call.
        /// </summary>
        public GridBounds DirtyBounds => _dirtyBounds;

        public byte GetValue(int x, int y)
        {
            return _values[GetCellIndex(x, y)];
        }

        public byte GetValue(int cellIndex)
        {
            ValidateCellIndex(cellIndex);
            return _values[cellIndex];
        }

        public bool IsThresholdReached(int cellIndex)
        {
            return GetValue(cellIndex) >= RevealThreshold;
        }

        public void CopyValuesTo(byte[] destination)
        {
            if (destination == null)
            {
                throw new ArgumentNullException(nameof(destination));
            }

            if (destination.Length < CellCount)
            {
                throw new ArgumentException(
                    $"Destination must hold at least {CellCount} cells.",
                    nameof(destination));
            }

            Array.Copy(_values, destination, CellCount);
        }

        public RevealMaskChange ApplyStamp(NormalizedPoint center, RevealBrush brush)
        {
            BeginMutation();

            var centerX = ToCellX(center.X);
            var centerY = ToCellY(center.Y);
            var changedCellCount = 0;
            var changedBounds = GridBounds.Empty;

            ApplyDisk(
                centerX,
                centerY,
                brush,
                ref changedCellCount,
                ref changedBounds);

            return CompleteMutation(changedCellCount, changedBounds);
        }

        /// <summary>
        /// Applies a connected stroke. Sampling is performed in grid space, so a fast
        /// pointer move cannot leave holes between the two input points.
        /// </summary>
        public RevealMaskChange ApplyStroke(
            NormalizedPoint start,
            NormalizedPoint end,
            RevealBrush brush)
        {
            BeginMutation();

            var startX = start.X * (Width - 1);
            var startY = start.Y * (Height - 1);
            var endX = end.X * (Width - 1);
            var endY = end.Y * (Height - 1);
            var deltaX = endX - startX;
            var deltaY = endY - startY;
            var distance = Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
            var sampleSpacing = Math.Max(1d, brush.RadiusCells * 0.5d);
            var stepCount = Math.Max(1, (int)Math.Ceiling(distance / sampleSpacing));
            var changedCellCount = 0;
            var changedBounds = GridBounds.Empty;

            for (var step = 0; step <= stepCount; step++)
            {
                var amount = step / (double)stepCount;
                var x = RoundToCell(startX + (deltaX * amount));
                var y = RoundToCell(startY + (deltaY * amount));
                ApplyDisk(x, y, brush, ref changedCellCount, ref changedBounds);
            }

            return CompleteMutation(changedCellCount, changedBounds);
        }

        /// <summary>
        /// Clears render-upload dirtiness without changing reveal state or Version.
        /// </summary>
        public void MarkClean()
        {
            _dirtyBounds = GridBounds.Empty;
        }

        public static int GetCellIndex(int x, int y)
        {
            if (x < 0 || x >= Width)
            {
                throw new ArgumentOutOfRangeException(nameof(x));
            }

            if (y < 0 || y >= Height)
            {
                throw new ArgumentOutOfRangeException(nameof(y));
            }

            return (y * Width) + x;
        }

        public static int GetCellX(int cellIndex)
        {
            ValidateCellIndex(cellIndex);
            return cellIndex % Width;
        }

        public static int GetCellY(int cellIndex)
        {
            ValidateCellIndex(cellIndex);
            return cellIndex / Width;
        }

        private static void ValidateCellIndex(int cellIndex)
        {
            if (cellIndex < 0 || cellIndex >= CellCount)
            {
                throw new ArgumentOutOfRangeException(nameof(cellIndex));
            }
        }

        private static int ToCellX(float normalizedX)
        {
            return RoundToCell(normalizedX * (Width - 1));
        }

        private static int ToCellY(float normalizedY)
        {
            return RoundToCell(normalizedY * (Height - 1));
        }

        private static int RoundToCell(double value)
        {
            return (int)Math.Round(value, MidpointRounding.AwayFromZero);
        }

        private void BeginMutation()
        {
            _thresholdCrossings.Clear();
        }

        private void ApplyDisk(
            int centerX,
            int centerY,
            RevealBrush brush,
            ref int changedCellCount,
            ref GridBounds changedBounds)
        {
            var radius = brush.RadiusCells;
            var radiusSquared = radius * radius;
            var minX = Math.Max(0, centerX - radius);
            var maxX = Math.Min(Width - 1, centerX + radius);
            var minY = Math.Max(0, centerY - radius);
            var maxY = Math.Min(Height - 1, centerY + radius);

            for (var y = minY; y <= maxY; y++)
            {
                var offsetY = y - centerY;

                for (var x = minX; x <= maxX; x++)
                {
                    var offsetX = x - centerX;
                    if ((offsetX * offsetX) + (offsetY * offsetY) > radiusSquared)
                    {
                        continue;
                    }

                    TryIncreaseCell(
                        x,
                        y,
                        brush.RevealValue,
                        ref changedCellCount,
                        ref changedBounds);
                }
            }
        }

        private void TryIncreaseCell(
            int x,
            int y,
            byte targetValue,
            ref int changedCellCount,
            ref GridBounds changedBounds)
        {
            var cellIndex = (y * Width) + x;
            var previousValue = _values[cellIndex];
            if (targetValue <= previousValue)
            {
                return;
            }

            _values[cellIndex] = targetValue;
            changedCellCount++;
            changedBounds = changedBounds.Encapsulate(x, y);

            if (previousValue < RevealThreshold && targetValue >= RevealThreshold)
            {
                _thresholdCrossings.Add(cellIndex);
            }
        }

        private RevealMaskChange CompleteMutation(int changedCellCount, GridBounds changedBounds)
        {
            if (changedCellCount == 0)
            {
                _thresholdCrossings.Clear();
                return new RevealMaskChange(Version, 0, 0, GridBounds.Empty);
            }

            Version++;
            _dirtyBounds = _dirtyBounds.Encapsulate(changedBounds);
            var crossedCellCount = _thresholdCrossings.Count;
            var change = new RevealMaskChange(
                Version,
                changedCellCount,
                crossedCellCount,
                changedBounds);

            if (crossedCellCount == 0)
            {
                _thresholdCrossings.Clear();
                return change;
            }

            var crossedCells = _thresholdCrossings.ToArray();
            _thresholdCrossings.Clear();
            ThresholdCrossed?.Invoke(
                this,
                new RevealThresholdCrossedEventArgs(Version, RevealThreshold, crossedCells));
            return change;
        }
    }
}
