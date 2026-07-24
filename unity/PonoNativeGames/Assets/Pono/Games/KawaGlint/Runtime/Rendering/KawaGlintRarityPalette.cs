using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// The rarity accent colours, for everything in the Rendering assembly
    /// that has to say "this one is special": the rare-fish halo, the sparkle
    /// motes and the ripple-ring tint.
    ///
    /// <b>Why this is duplicated in the UI assembly.</b>
    /// <c>Pono.KawaGlint.Rendering</c>'s asmdef references only the two URP
    /// packages -- it deliberately cannot see <c>KawaGlintHud</c>, which owns
    /// the same table for the catch banner and fishdex dots. Rather than
    /// weaken the assembly split for four colours, the table is written twice
    /// and pinned by <c>KawaGlintRarityPaletteEditModeTests</c>: both copies
    /// are asserted against the literal hex values below, so changing one side
    /// without the other fails the build rather than quietly shipping a rare
    /// fish whose halo and whose HUD dot are different colours.
    ///
    /// If you edit a colour here, edit <c>KawaGlintHud.Rarity*Color</c> and
    /// the expected values in that test in the same change.
    ///
    /// Palette constraints (3-7 year olds): warm, light, friendly. No red, no
    /// black, and specifically no dark saturated purple -- the tier-3 accent
    /// is a pale periwinkle for exactly that reason.
    /// </summary>
    public static class KawaGlintRarityPalette
    {
        /// <summary>Normal (tier 0) -- water blue.</summary>
        public static readonly Color Normal = new Color32(0x7F, 0xD0, 0xE8, 0xFF);

        /// <summary>Rare (tier 1) -- gold.</summary>
        public static readonly Color Rare = new Color32(0xFF, 0xD9, 0x3D, 0xFF);

        /// <summary>Super (tier 2) -- pink.</summary>
        public static readonly Color Super = new Color32(0xFF, 0x7F, 0xD1, 0xFF);

        /// <summary>Legendary (tier 3) -- soft periwinkle.</summary>
        public static readonly Color Legendary = new Color32(0xB9, 0xA0, 0xFF, 0xFF);

        private static readonly Color[] ByTier = { Normal, Rare, Super, Legendary };

        /// <summary>Number of tiers with a distinct accent colour.</summary>
        public static int TierCount => ByTier.Length;

        /// <summary>
        /// Accent colour for a rarity tier. Always clamped, so a rarity step
        /// added later degrades to "the most impressive colour we have"
        /// instead of throwing.
        /// </summary>
        public static Color For(int tier)
        {
            return ByTier[Mathf.Clamp(tier, 0, ByTier.Length - 1)];
        }
    }
}
