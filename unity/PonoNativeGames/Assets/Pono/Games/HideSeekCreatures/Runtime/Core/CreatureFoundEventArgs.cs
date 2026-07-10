using System;

namespace Pono.HideSeek.Core
{
    public sealed class CreatureFoundEventArgs : EventArgs
    {
        internal CreatureFoundEventArgs(
            CreatureDiscoverySnapshot creature,
            int foundCount,
            int totalCount)
        {
            Creature = creature;
            FoundCount = foundCount;
            TotalCount = totalCount;
        }

        public CreatureDiscoverySnapshot Creature { get; }

        public int FoundCount { get; }

        public int TotalCount { get; }
    }
}
