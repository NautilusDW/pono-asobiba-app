using System.Collections.Generic;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Broad body-plan family a species belongs to. Only ever used to pick a
    /// <i>fallback</i> silhouette for a species nobody remembered to register
    /// below -- its whole job is to make sure a clam never gets handed a
    /// torpedo-shaped fish shadow.
    /// </summary>
    public enum KawaGlintMotionClass
    {
        /// <summary>Ordinary spindle-bodied fish.</summary>
        Standard,

        /// <summary>Long and thin (small baitfish, eels, loaches).</summary>
        Slim,

        /// <summary>Thick-bodied heavyweight.</summary>
        Heavy,

        /// <summary>Legs and claws -- crayfish, shrimp, crabs.</summary>
        Crawler,

        /// <summary>Bivalve/turban shell. Does not swim.</summary>
        Shell,

        /// <summary>Soft, trailing arms -- squid, octopus.</summary>
        Drifter,

        /// <summary>Flattened disc -- flounder, sole, plaice.</summary>
        Flat,

        /// <summary>Radial (starfish).</summary>
        Star,

        /// <summary>Inanimate junk/treasure.</summary>
        Object
    }

    /// <summary>
    /// Species -&gt; silhouette-archetype table, plus the archetype resource
    /// paths for the shared shadow-art library.
    ///
    /// WHY a shared archetype library instead of per-species shadow art: the
    /// user asked for "魚影は何種類かでよい" -- the point is that a rare fish's
    /// <i>outline</i> is instantly different from a normal one's, not that
    /// every one of 30+ species gets a bespoke drawing. Twelve body plans
    /// cover the whole roster, and a thirteenth (<c>regal_longfin</c>) is
    /// reserved for the legendary step.
    ///
    /// This table is <b>art metadata, not game data</b> -- which body plan a
    /// silhouette drawing depicts, keyed by the same string ids the art
    /// pipeline uses. That is why it lives in Rendering and why this file (and
    /// this assembly) still never references <c>Pono.KawaGlint.Core</c>.
    ///
    /// The explicit table is the contract; <see cref="DefaultArchetypeFor"/>
    /// is a safety net that must never actually fire in shipped content -- an
    /// EditMode test walks every id in <c>TsuriFishData.AllSpecies</c> and
    /// fails loudly if any of them resolves through the fallback. When the
    /// species roster grows, add the rows here in the same change.
    /// </summary>
    public static class KawaGlintFishSilhouettes
    {
        // --- Archetype keys (13). Shared shadow art lands at
        // Content/Resources/KawaGlint/Sprites/Shadows/sil_<key>_shadow.png;
        // until it does, KawaGlintProceduralFishArt draws a stand-in for each.
        public const string SlimSmall = "slim_small";
        public const string StandardMid = "standard_mid";
        public const string FlatDisc = "flat_disc";
        public const string Crawler = "crawler";
        public const string ObjectBoot = "object_boot";
        public const string ObjectShell = "object_shell";
        public const string Star5 = "star5";
        public const string BroadFancy = "broad_fancy";
        public const string SalmonRare = "salmon_rare";
        public const string Tentacle = "tentacle";
        public const string Serpentine = "serpentine";
        public const string TorpedoGiant = "torpedo_giant";
        public const string RegalLongfin = "regal_longfin";

        /// <summary>Every archetype key, in a stable order. Used by tests and by art-order tooling.</summary>
        public static readonly string[] AllArchetypes =
        {
            SlimSmall,
            StandardMid,
            FlatDisc,
            Crawler,
            ObjectBoot,
            ObjectShell,
            Star5,
            BroadFancy,
            SalmonRare,
            Tentacle,
            Serpentine,
            TorpedoGiant,
            RegalLongfin
        };

        private const string ArchetypePathPrefix = "KawaGlint/Sprites/Shadows/sil_";
        private const string ArchetypePathSuffix = "_shadow";

        private readonly struct Entry
        {
            public readonly string Archetype;
            public readonly KawaGlintMotionClass MotionClass;

            public Entry(string archetype, KawaGlintMotionClass motionClass)
            {
                Archetype = archetype;
                MotionClass = motionClass;
            }
        }

        // Covers the shipped roster plus the species the expansion adds, so
        // this table does not become the thing that blocks that work. An id
        // listed here that never ships is harmless (it is only ever looked up
        // by id); an id that ships without a row here fails the EditMode test.
        private static readonly Dictionary<string, Entry> Entries = new Dictionary<string, Entry>
        {
            // --- river (shipped) ---
            { "fish_ayu", new Entry(SlimSmall, KawaGlintMotionClass.Slim) },
            { "fish_nijimasu", new Entry(StandardMid, KawaGlintMotionClass.Standard) },
            { "zarigani", new Entry(Crawler, KawaGlintMotionClass.Crawler) },
            { "fish_salmon", new Entry(SalmonRare, KawaGlintMotionClass.Standard) },
            { "treasure_boot", new Entry(ObjectBoot, KawaGlintMotionClass.Object) },

            // --- sea (shipped) ---
            { "fish_unagi", new Entry(Serpentine, KawaGlintMotionClass.Slim) },
            { "fish_aji", new Entry(SlimSmall, KawaGlintMotionClass.Standard) },
            { "fish_ebi", new Entry(Crawler, KawaGlintMotionClass.Crawler) },
            { "fish_karei", new Entry(FlatDisc, KawaGlintMotionClass.Flat) },
            { "hitode", new Entry(Star5, KawaGlintMotionClass.Star) },
            { "treasure_kaigara", new Entry(ObjectShell, KawaGlintMotionClass.Shell) },
            { "fish_iwashi", new Entry(SlimSmall, KawaGlintMotionClass.Slim) },
            { "fish_tai", new Entry(BroadFancy, KawaGlintMotionClass.Standard) },
            { "fish_ika", new Entry(Tentacle, KawaGlintMotionClass.Drifter) },
            { "fish_maguro", new Entry(TorpedoGiant, KawaGlintMotionClass.Heavy) },

            // --- expansion roster (registered ahead of the data landing) ---
            { "fish_yamame", new Entry(StandardMid, KawaGlintMotionClass.Standard) },
            { "fish_dojou", new Entry(Serpentine, KawaGlintMotionClass.Slim) },
            { "fish_haze", new Entry(StandardMid, KawaGlintMotionClass.Standard) },
            { "sawagani", new Entry(Crawler, KawaGlintMotionClass.Crawler) },
            { "fish_shijimi", new Entry(ObjectShell, KawaGlintMotionClass.Shell) },
            { "fish_iwana", new Entry(StandardMid, KawaGlintMotionClass.Standard) },
            { "fish_namazu", new Entry(TorpedoGiant, KawaGlintMotionClass.Heavy) },
            { "fish_itou", new Entry(TorpedoGiant, KawaGlintMotionClass.Heavy) },
            { "fish_kisu", new Entry(SlimSmall, KawaGlintMotionClass.Slim) },
            { "fish_asari", new Entry(ObjectShell, KawaGlintMotionClass.Shell) },
            { "fish_saba", new Entry(StandardMid, KawaGlintMotionClass.Standard) },
            { "fish_sanma", new Entry(SlimSmall, KawaGlintMotionClass.Slim) },
            { "fish_kani", new Entry(Crawler, KawaGlintMotionClass.Crawler) },
            { "fish_sazae", new Entry(ObjectShell, KawaGlintMotionClass.Shell) },
            { "fish_tako", new Entry(Tentacle, KawaGlintMotionClass.Drifter) },
            { "fish_hirame", new Entry(FlatDisc, KawaGlintMotionClass.Flat) },
            { "fish_ryuuguunotsukai", new Entry(RegalLongfin, KawaGlintMotionClass.Slim) }
        };

        /// <summary>True when <paramref name="speciesId"/> has an explicit row above (i.e. does not need the fallback).</summary>
        public static bool HasExplicitEntry(string speciesId)
        {
            return !string.IsNullOrEmpty(speciesId) && Entries.ContainsKey(speciesId);
        }

        /// <summary>Body-plan family for <paramref name="speciesId"/>; <see cref="KawaGlintMotionClass.Standard"/> for unknown ids.</summary>
        public static KawaGlintMotionClass MotionClassOf(string speciesId)
        {
            return !string.IsNullOrEmpty(speciesId) && Entries.TryGetValue(speciesId, out var entry)
                ? entry.MotionClass
                : KawaGlintMotionClass.Standard;
        }

        /// <summary>
        /// Archetype key for <paramref name="speciesId"/>. Explicit row wins;
        /// otherwise falls back to <see cref="DefaultArchetypeFor"/> using the
        /// species' motion class and <paramref name="rarityTier"/>, so an
        /// unregistered rare still gets a suitably impressive outline.
        /// </summary>
        public static string ResolveArchetype(string speciesId, int rarityTier)
        {
            if (!string.IsNullOrEmpty(speciesId) && Entries.TryGetValue(speciesId, out var entry))
            {
                return entry.Archetype;
            }
            return DefaultArchetypeFor(MotionClassOf(speciesId), rarityTier);
        }

        /// <summary>
        /// Fallback archetype for a body plan. Only <see cref="KawaGlintMotionClass.Standard"/>
        /// escalates with rarity -- everything else keeps its own shape,
        /// because a "rare clam" is still clam-shaped and swapping it for a
        /// fish outline would be a worse bug than showing a plain one.
        /// </summary>
        public static string DefaultArchetypeFor(KawaGlintMotionClass motionClass, int rarityTier)
        {
            switch (motionClass)
            {
                case KawaGlintMotionClass.Shell:
                    return ObjectShell;
                case KawaGlintMotionClass.Star:
                    return Star5;
                case KawaGlintMotionClass.Object:
                    return ObjectBoot;
                case KawaGlintMotionClass.Crawler:
                    return Crawler;
                case KawaGlintMotionClass.Flat:
                    return FlatDisc;
                case KawaGlintMotionClass.Drifter:
                    return Tentacle;
                case KawaGlintMotionClass.Slim:
                    return rarityTier >= 3 ? RegalLongfin : SlimSmall;
                case KawaGlintMotionClass.Heavy:
                    return TorpedoGiant;
                default:
                    if (rarityTier >= 3) return RegalLongfin;
                    if (rarityTier >= 2) return TorpedoGiant;
                    if (rarityTier >= 1) return BroadFancy;
                    return StandardMid;
            }
        }

        /// <summary>Resources path of the shared shadow drawing for an archetype key (may not exist yet -- callers fall back).</summary>
        public static string ArchetypeResourcePath(string archetypeKey)
        {
            return string.IsNullOrEmpty(archetypeKey) ? null : ArchetypePathPrefix + archetypeKey + ArchetypePathSuffix;
        }

        /// <summary>
        /// Whether a species may be used as one of the four ambient
        /// background swimmers. Shells, starfish and junk do not swim across
        /// open water -- letting them into the ambient pool is exactly the
        /// "貝が横に泳いでいる" bug.
        /// </summary>
        public static bool IsAmbientEligible(string speciesId)
        {
            switch (MotionClassOf(speciesId))
            {
                case KawaGlintMotionClass.Shell:
                case KawaGlintMotionClass.Star:
                case KawaGlintMotionClass.Object:
                    return false;
                default:
                    return HasExplicitEntry(speciesId);
            }
        }

        /// <summary>
        /// Picks the four ambient background swimmers for a location from its
        /// spawn list, preserving the caller's order (the Gameplay layer
        /// passes the location's spawn entries highest-weight first) and
        /// skipping anything that cannot swim. Repeats earlier picks when a
        /// location has fewer than four eligible species rather than returning
        /// a short array, so the four ambient actors are always all populated.
        /// Returns null when nothing at all is eligible, which callers treat
        /// as "keep the sprites you already have".
        /// </summary>
        public static string[] SelectAmbientSpecies(IList<string> candidateSpeciesIds, int count = 4)
        {
            if (candidateSpeciesIds == null || candidateSpeciesIds.Count == 0 || count <= 0)
            {
                return null;
            }

            var eligible = new List<string>(candidateSpeciesIds.Count);
            for (var i = 0; i < candidateSpeciesIds.Count; i++)
            {
                var id = candidateSpeciesIds[i];
                if (IsAmbientEligible(id) && !eligible.Contains(id))
                {
                    eligible.Add(id);
                }
            }

            if (eligible.Count == 0)
            {
                return null;
            }

            var result = new string[count];
            for (var i = 0; i < count; i++)
            {
                result[i] = eligible[i % eligible.Count];
            }
            return result;
        }
    }
}
