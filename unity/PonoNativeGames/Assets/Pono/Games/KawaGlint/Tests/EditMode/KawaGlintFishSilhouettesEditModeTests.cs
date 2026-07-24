using System.Collections.Generic;
using NUnit.Framework;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Rendering;
using UnityEngine;

namespace Pono.KawaGlint.Tests.EditMode
{
    /// <summary>
    /// Guards the silhouette side of the rare-fish readability work: that every
    /// species has a deliberate body plan, that the fallback can never hand a
    /// clam a fish-shaped shadow, that every archetype actually renders, and
    /// that the rarity accent colours in Rendering still match the copy the UI
    /// assembly holds.
    /// </summary>
    public sealed class KawaGlintFishSilhouettesEditModeTests
    {
        [Test]
        public void EverySpecies_HasAnExplicitSilhouetteEntry()
        {
            // Fail loud, on purpose. KawaGlintFishSilhouettes.DefaultArchetypeFor
            // exists so an unregistered species still renders *something*, but
            // relying on it in shipped content means a species whose outline
            // nobody chose. When the roster grows, add the rows in the same
            // change -- that is what this test is here to force.
            var missing = new List<string>();
            for (var i = 0; i < TsuriFishData.AllSpecies.Count; i++)
            {
                var id = TsuriFishData.AllSpecies[i].Id;
                if (!KawaGlintFishSilhouettes.HasExplicitEntry(id))
                {
                    missing.Add(id);
                }
            }

            Assert.That(missing, Is.Empty,
                "These species have no row in KawaGlintFishSilhouettes and would fall back to a guessed body plan: "
                + string.Join(", ", missing));
        }

        [Test]
        public void EverySpecies_ResolvesToAKnownArchetype()
        {
            var known = new HashSet<string>(KawaGlintFishSilhouettes.AllArchetypes);

            for (var i = 0; i < TsuriFishData.AllSpecies.Count; i++)
            {
                var id = TsuriFishData.AllSpecies[i].Id;
                for (var tier = 0; tier <= 3; tier++)
                {
                    var archetype = KawaGlintFishSilhouettes.ResolveArchetype(id, tier);
                    Assert.That(known.Contains(archetype), Is.True,
                        $"'{id}' at tier {tier} resolved to unknown archetype '{archetype}'.");
                }
            }
        }

        [Test]
        public void MotionClassFallback_NeverGivesAShellOrCrawlerAFishShape()
        {
            // The whole reason the fallback keys on body plan rather than on
            // rarity alone: a "rare" clam is still clam-shaped, and swapping it
            // for a spindle would be a worse bug than showing a plain one.
            var fishShapes = new HashSet<string>
            {
                KawaGlintFishSilhouettes.SlimSmall,
                KawaGlintFishSilhouettes.StandardMid,
                KawaGlintFishSilhouettes.BroadFancy,
                KawaGlintFishSilhouettes.SalmonRare,
                KawaGlintFishSilhouettes.TorpedoGiant,
                KawaGlintFishSilhouettes.Serpentine,
                KawaGlintFishSilhouettes.RegalLongfin
            };

            for (var tier = 0; tier <= 4; tier++)
            {
                Assert.That(fishShapes.Contains(KawaGlintFishSilhouettes.DefaultArchetypeFor(KawaGlintMotionClass.Shell, tier)), Is.False,
                    $"A shell got a fish silhouette at tier {tier}.");
                Assert.That(fishShapes.Contains(KawaGlintFishSilhouettes.DefaultArchetypeFor(KawaGlintMotionClass.Crawler, tier)), Is.False,
                    $"A crawler got a fish silhouette at tier {tier}.");
                Assert.That(fishShapes.Contains(KawaGlintFishSilhouettes.DefaultArchetypeFor(KawaGlintMotionClass.Star, tier)), Is.False,
                    $"A starfish got a fish silhouette at tier {tier}.");
                Assert.That(fishShapes.Contains(KawaGlintFishSilhouettes.DefaultArchetypeFor(KawaGlintMotionClass.Object, tier)), Is.False,
                    $"A piece of junk got a fish silhouette at tier {tier}.");
            }
        }

        [Test]
        public void EveryArchetype_ProducesACachedProceduralSprite()
        {
            // The shared sil_<key>_shadow.png library is not drawn yet, so
            // every archetype has to render from code today. Also asserts the
            // cache actually caches -- these sprites wrap runtime textures that
            // would otherwise leak one copy per call.
            foreach (var archetype in KawaGlintFishSilhouettes.AllArchetypes)
            {
                var first = KawaGlintProceduralFishArt.GetArchetypeSilhouette(archetype);
                Assert.That(first, Is.Not.Null, $"archetype '{archetype}' produced no sprite");
                Assert.That(first.texture, Is.Not.Null, $"archetype '{archetype}' produced a sprite with no texture");

                var second = KawaGlintProceduralFishArt.GetArchetypeSilhouette(archetype);
                Assert.That(second, Is.SameAs(first), $"archetype '{archetype}' is not cached");
            }
        }

        [Test]
        public void EverySpecies_ProducesAProceduralSilhouette()
        {
            for (var i = 0; i < TsuriFishData.AllSpecies.Count; i++)
            {
                var id = TsuriFishData.AllSpecies[i].Id;
                Assert.That(KawaGlintProceduralFishArt.GetSilhouette(id), Is.Not.Null,
                    $"'{id}' has no procedural silhouette to fall back to.");
            }
        }

        [Test]
        public void ArchetypeResourcePath_FollowsTheSharedLibraryConvention()
        {
            Assert.That(
                KawaGlintFishSilhouettes.ArchetypeResourcePath(KawaGlintFishSilhouettes.TorpedoGiant),
                Is.EqualTo("KawaGlint/Sprites/Shadows/sil_torpedo_giant_shadow"));
            Assert.That(KawaGlintFishSilhouettes.ArchetypeResourcePath(null), Is.Null);
        }

        [Test]
        public void AmbientSelection_EveryLocation_YieldsFourSwimmers()
        {
            for (var i = 0; i < TsuriWorldData.Locations.Count; i++)
            {
                var location = TsuriWorldData.Locations[i];
                var candidates = new List<string>();
                for (var s = 0; s < location.Spawns.Count; s++)
                {
                    candidates.Add(location.Spawns[s].SpeciesId);
                }

                var ambient = KawaGlintFishSilhouettes.SelectAmbientSpecies(candidates);
                Assert.That(ambient, Is.Not.Null, $"{location.Id} produced no ambient swimmers at all");
                Assert.That(ambient.Length, Is.EqualTo(4), $"{location.Id} must fill all four ambient slots");

                foreach (var id in ambient)
                {
                    // Shells, starfish and boots do not swim across open water.
                    // Letting them into the ambient pool is the "貝が横に泳いで
                    // いる" bug.
                    var motionClass = KawaGlintFishSilhouettes.MotionClassOf(id);
                    Assert.That(motionClass, Is.Not.EqualTo(KawaGlintMotionClass.Shell), $"{location.Id}: {id}");
                    Assert.That(motionClass, Is.Not.EqualTo(KawaGlintMotionClass.Star), $"{location.Id}: {id}");
                    Assert.That(motionClass, Is.Not.EqualTo(KawaGlintMotionClass.Object), $"{location.Id}: {id}");
                }
            }
        }

        [Test]
        public void AmbientSelection_PreservesCallerOrder_AndRepeatsWhenShort()
        {
            var picked = KawaGlintFishSilhouettes.SelectAmbientSpecies(
                new List<string> { "fish_ayu", "treasure_kaigara", "fish_maguro" });

            Assert.That(picked, Is.Not.Null);
            // Caller order preserved, the shell dropped, and the two survivors
            // repeated to fill four slots.
            Assert.That(picked, Is.EqualTo(new[] { "fish_ayu", "fish_maguro", "fish_ayu", "fish_maguro" }));

            Assert.That(KawaGlintFishSilhouettes.SelectAmbientSpecies(new List<string> { "hitode" }), Is.Null,
                "a pool with nothing that swims must return null so the caller keeps the sprites it has");
            Assert.That(KawaGlintFishSilhouettes.SelectAmbientSpecies(null), Is.Null);
        }

        [Test]
        public void RarityPalette_MatchesTheCopyHeldByTheHud()
        {
            // Pono.KawaGlint.Rendering cannot see KawaGlintHud (its asmdef
            // references only the URP packages), so the palette is written in
            // both assemblies. Both copies are pinned to these literals: change
            // one without the other and this fails, instead of a rare fish
            // shipping with a gold halo and a cyan HUD dot.
            // Compared as Color, not Color32: the byte -> float -> byte round
            // trip truncates and can come back one off, which would make this
            // guard fail for a reason that has nothing to do with the palette.
            Assert.That(KawaGlintRarityPalette.For(0), Is.EqualTo((Color)new Color32(0x7F, 0xD0, 0xE8, 0xFF)), "normal");
            Assert.That(KawaGlintRarityPalette.For(1), Is.EqualTo((Color)new Color32(0xFF, 0xD9, 0x3D, 0xFF)), "rare");
            Assert.That(KawaGlintRarityPalette.For(2), Is.EqualTo((Color)new Color32(0xFF, 0x7F, 0xD1, 0xFF)), "super");
            Assert.That(KawaGlintRarityPalette.For(3), Is.EqualTo((Color)new Color32(0xB9, 0xA0, 0xFF, 0xFF)), "legendary");

            // Clamped, never thrown -- the species work is free to add a step.
            Assert.That(KawaGlintRarityPalette.For(99), Is.EqualTo(KawaGlintRarityPalette.For(3)));
            Assert.That(KawaGlintRarityPalette.For(-1), Is.EqualTo(KawaGlintRarityPalette.For(0)));

            // The halo is the same accent, so it can never drift from the dot.
            for (var tier = 0; tier <= 3; tier++)
            {
                Assert.That(KawaGlintRareAura.HaloColorForTier(tier), Is.EqualTo(KawaGlintRarityPalette.For(tier)));
            }
        }

        [Test]
        public void RareAura_OnlyArmsForRareOrBetter_AndRevealsLate()
        {
            Assert.That(KawaGlintRareAura.HaloPeakAlphaForTier(0), Is.EqualTo(0f),
                "a normal fish must have no halo at all");
            Assert.That(KawaGlintRareAura.SparkleRateForTier(0), Is.EqualTo(0f),
                "a normal fish must emit no sparkles");

            for (var tier = KawaGlintRareAura.MinimumAuraTier; tier <= 3; tier++)
            {
                Assert.That(KawaGlintRareAura.HaloPeakAlphaForTier(tier), Is.GreaterThan(0f));
                Assert.That(KawaGlintRareAura.SparkleRateForTier(tier), Is.GreaterThan(0f));
            }

            // Nothing may light up at the moment of the cast: if it did, nine
            // casts in ten would announce "not this time" before the wait even
            // started.
            Assert.That(KawaGlintRareAura.RevealFromApproach01(0f), Is.EqualTo(0f));
            Assert.That(KawaGlintRareAura.RevealFromApproach01(0.44f), Is.EqualTo(0f));
            Assert.That(KawaGlintRareAura.RevealFromApproach01(KawaGlintRareAura.RevealStartProgress), Is.EqualTo(0f));
            Assert.That(KawaGlintRareAura.RevealFromApproach01(KawaGlintRareAura.RevealFullProgress), Is.EqualTo(1f));
            Assert.That(KawaGlintRareAura.RevealFromApproach01(1f), Is.EqualTo(1f));

            // Peak alpha stays gentle -- this sits behind a dark silhouette
            // over painted art and must read as glowing water, not a sticker.
            for (var tier = 0; tier <= 3; tier++)
            {
                Assert.That(KawaGlintRareAura.HaloPeakAlphaForTier(tier), Is.LessThanOrEqualTo(0.40f));
            }
        }
    }
}
