using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Pono.HideSeek.Core
{
    public sealed class RevealThresholdCrossedEventArgs : EventArgs
    {
        internal RevealThresholdCrossedEventArgs(long version, byte threshold, int[] cellIndices)
        {
            Version = version;
            Threshold = threshold;
            CellIndices = new ReadOnlyCollection<int>(cellIndices);
        }

        public long Version { get; }

        public byte Threshold { get; }

        public IReadOnlyList<int> CellIndices { get; }
    }
}
