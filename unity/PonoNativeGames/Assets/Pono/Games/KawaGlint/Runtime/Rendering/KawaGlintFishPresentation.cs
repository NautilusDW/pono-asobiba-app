namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Plain hand-off struct the Gameplay layer fills in to tell the Rendering
    /// layer everything it needs to know about the fish it is about to show --
    /// without the Rendering assembly ever referencing
    /// <c>Pono.KawaGlint.Core</c> (see <see cref="KawaGlintSpriteCatalog"/>'s
    /// class doc for that split's rationale).
    ///
    /// <see cref="RarityTier"/> is a plain int rather than an enum on purpose:
    /// the species/probability work is free to add rarity steps above "super"
    /// at any time, and every table this tier indexes into clamps
    /// (<see cref="KawaGlintRarityMotion.For"/>), so a newly-introduced tier
    /// degrades to "the most impressive profile we have" instead of throwing.
    /// </summary>
    public readonly struct KawaGlintFishPresentation
    {
        /// <summary>Species id, exactly as in <c>TsuriFishData</c> (e.g. "fish_maguro"). May be null/empty to keep whatever sprite is already assigned.</summary>
        public readonly string SpeciesId;

        /// <summary>0 = Normal, 1 = Rare, 2 = Super, 3+ = any future step. Always clamped by the consumer, never validated here.</summary>
        public readonly int RarityTier;

        /// <summary>Final on-screen nose-to-tail length in world units, i.e. the rarity length multiplier is already applied by the caller.</summary>
        public readonly float WorldLength;

        public KawaGlintFishPresentation(string speciesId, int rarityTier, float worldLength)
        {
            SpeciesId = speciesId;
            RarityTier = rarityTier;
            WorldLength = worldLength;
        }
    }
}
