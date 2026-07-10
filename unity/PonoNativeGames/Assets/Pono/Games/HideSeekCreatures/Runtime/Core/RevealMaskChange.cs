namespace Pono.HideSeek.Core
{
    public readonly struct RevealMaskChange
    {
        internal RevealMaskChange(
            long version,
            int changedCellCount,
            int thresholdCrossedCellCount,
            GridBounds bounds)
        {
            Version = version;
            ChangedCellCount = changedCellCount;
            ThresholdCrossedCellCount = thresholdCrossedCellCount;
            Bounds = bounds;
        }

        public long Version { get; }

        public int ChangedCellCount { get; }

        public int ThresholdCrossedCellCount { get; }

        public GridBounds Bounds { get; }

        public bool HasChanges => ChangedCellCount > 0;
    }
}
