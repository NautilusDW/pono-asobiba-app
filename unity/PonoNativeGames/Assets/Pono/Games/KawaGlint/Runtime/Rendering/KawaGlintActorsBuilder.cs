using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Builds every wave-synced actor in the KawaGlint river spike -- fish
    /// shadows, the bobber (ウキ), its ripple rings, and the fishing line --
    /// procedurally under a given parent transform. Every texture is a
    /// code-generated <see cref="Texture2D"/> and every material a plain
    /// <c>new Material(shader)</c> built from a stock URP 2D shader.
    ///
    /// Dependency rule (updated): this class may use static helpers and plain
    /// component types from <i>within its own Rendering assembly</i> (the
    /// sprite catalog, the silhouette/rarity tables, the actor components it
    /// attaches). What it must never depend on is another <i>module</i> --
    /// the refraction and surface passes in particular -- so that it always
    /// succeeds regardless of whether those shaders are available on the
    /// current platform.
    ///
    /// The refraction full-screen pass (a different module) is screen-space
    /// below the waterline, so every underwater sprite built here wobbles
    /// for free once that pass is active -- no extra distortion work is
    /// needed in this class.
    /// </summary>
    public static class KawaGlintActorsBuilder
    {
        private const float PixelsPerUnit = 100f;

        // Fixed seed shared by every KawaGlint module (DESIGN.md: "every
        // module that uses randomness seeds System.Random(20260724)").
        private const int GenerationSeed = 20260724;

        // Sorting-order contract shared with the other KawaGlint rendering
        // modules (refraction/surface own 0-30; the bobber's ripple rings,
        // the fishing line and the bobber itself own the remaining gaps).
        private const int FishSortingOrder = 14;

        // Rare-fish aura brackets the fish silhouette: the halo glows from
        // behind it (13, the gap directly under the fish) and the sparkles
        // drift in front of it (15, the gap directly above, still under the
        // caustics at 16).
        private const int RareHaloSortingOrder = 13;
        private const int RareSparkleSortingOrder = 15;

        private const int RippleRingSortingOrder = 32;
        private const int FishingLineSortingOrder = 33;
        private const int BobberSortingOrder = 34;

        // Splash droplets (module A, one-shot landing effect) render above
        // even the bobber -- water kicked into the air by the splashdown is
        // naturally the frontmost thing on screen for its brief 0.55s life.
        // The splash ring shares the ambient ripple rings' sorting order
        // (they're both surface-level water rings).
        private const int SplashRingSortingOrder = RippleRingSortingOrder;
        private const int SplashDropletSortingOrder = 35;

        private const int FishTextureWidth = 128;
        private const int FishTextureHeight = 64;
        private const int FishCount = 4;

        // Species the four ambient fish start out as: river_asase's own
        // roster, because that is the location the game always opens on. This
        // is only a starting value -- the Gameplay layer calls
        // KawaGlintActorsController.SetAmbientSpecies on every location switch
        // so the background swimmers actually match the water the player is
        // looking at. (Before that call existed, あゆ and ざりがに swam around
        // in the open sea.)
        //
        // Deliberately NOT drawn from `random` -- it's a static assortment
        // decision, not a per-run one -- so the System.Random(20260724) draw
        // order/count below is completely unaffected by which species art
        // loads. `treasure_boot` (ながぐつ) is excluded by design: it's a
        // one-off gag catch, not a background swimmer.
        private static readonly string[] DefaultAmbientFishSpeciesIds =
        {
            "fish_ayu", "fish_nijimasu", "fish_salmon", "zarigani"
        };
        private const float FishMinLengthWorld = 0.8f;
        private const float FishMaxLengthWorld = 1.6f;
        private const float FishMinDepthY = -4.2f;
        private const float FishMaxDepthY = 0.8f;
        private const float FishMinSpeedWorld = 0.4f;
        private const float FishMaxSpeedWorld = 0.9f;
        private const float FishBobAmplitude = 0.15f;

        // Bob frequency isn't a value pinned by the shared DESIGN.md
        // contract (only drift speed and bob amplitude are) -- chosen to
        // read as a slow ambient sway clearly distinct from the water
        // surface's own ~1-3 Hz wave frequencies.
        private const float FishMinBobSpeed = 0.3f;
        private const float FishMaxBobSpeed = 0.6f;

        private static readonly Color FishShadowColor = HexColor(0x0A, 0x2E, 0x44);
        private const float FishShadowAlpha = 0.55f;

        // Ambient fish tint when illustrated shadow art loads. High enough to
        // kill the see-through look over the bright river cross-section art,
        // but slightly under 1.0 so the fully-opaque target fish still reads
        // as the most solid fish in the water.
        private const float IllustratedAmbientFishAlpha = 0.9f;

        // Taller than the old 0.55: the float is the thing the player watches
        // for the entire wait, and at 0.55 the redrawn art's antenna and
        // waistline were too small to read on a phone. QA adjustment range is
        // 0.58-0.76; changing it needs a device check, because it also changes
        // the float's size relative to the 1.2-2.5 unit fish.
        private const float BobberWorldHeight = KawaGlintBobberArt.RecommendedBobberWorldHeight;
        private const float BobberRestX = 1.8f;

        private const int RingTextureSize = 128;

        // Single source shared with the controller, which needs the same
        // count to reason about the rings' combined pulse rate.
        private const int RingCount = KawaGlintActorsController.RingCount;
        private const float RingNormalizedRadius = 0.42f;
        private const float RingNormalizedThickness = 0.09f;

        private const int LineSegments = 12;
        private const int LineSegmentPointCount = LineSegments + 1;
        private const float FishingLineWidth = 0.02f;
        private static readonly Color FishingLineColor = new Color(1f, 1f, 1f, 0.5f);

        // Stock URP 2D shader (ships with the render pipeline, not a project
        // asset) -- using it directly means every sprite/line here renders
        // correctly under the 2D Renderer with zero custom-shader risk,
        // matching the "always succeeds (stock shaders only)" module contract.
        private const string SpriteUnlitShaderName = "Universal Render Pipeline/2D/Sprite-Unlit-Default";

        // Procedural tail-wag shader (batch:1458-kawaglint-fish-art, module
        // D). Used only for the fish-shadow actors (ambient + target); every
        // other actor here (bobber/rings/line/splash) keeps the plain
        // Sprite-Unlit-Default material untouched.
        private const string FishWagShaderResourcePath = "KawaGlint/Rendering/KawaFishWag";

        // Golden-angle phase step (radians): gives each of the FishCount
        // ambient fish a well-distributed, non-repeating wag phase from a
        // single deterministic formula -- consumes zero draws from `random`,
        // so the seeded placement loop above is completely unaffected by
        // this addition.
        private const float FishWagPhaseStep = 2.3999632f;

        private static readonly int WagPhaseId = Shader.PropertyToID("_WagPhase");

        public static KawaGlintActorsController Build(
            Transform parent,
            Rect waterWorldRect,
            float waterlineWorldY,
            Vector3 rodTipWorldPosition)
        {
            var root = new GameObject("KawaGlintActors");
            root.transform.SetParent(parent, false);
            var controller = root.AddComponent<KawaGlintActorsController>();
            controller.SetWrapBounds(waterWorldRect.xMin, waterWorldRect.xMax);

            var random = new System.Random(GenerationSeed);

            var spriteMaterial = CreateSharedMaterial("KawaGlint Actor Sprite (Runtime)");
            controller.RegisterGeneratedAsset(spriteMaterial);

            // Runtime-generated Material (never a project asset), so it is
            // safe to register for OnDestroy cleanup like every other
            // generated asset in this builder. Falls back to the plain
            // sprite material (no wag, static art) when the shader is
            // missing/unsupported -- this class must always succeed
            // regardless of platform shader availability.
            var fishWagShader = Resources.Load<Shader>(FishWagShaderResourcePath);
            Material fishMaterial;
            if (fishWagShader != null && fishWagShader.isSupported)
            {
                fishMaterial = new Material(fishWagShader)
                {
                    name = "KawaGlint Fish Wag (Runtime)",
                    hideFlags = HideFlags.DontSave
                };
                controller.RegisterGeneratedAsset(fishMaterial);
            }
            else
            {
                Debug.LogWarning("KawaGlint: KawaFishWag shader is missing or unsupported on this platform; fish will render as static art (no tail wag).");
                fishMaterial = spriteMaterial;
            }

            BuildFishShadows(controller, root.transform, waterWorldRect, random, fishMaterial, out var fishSprite, out var fishNativeWidthWorld);
            BuildBobber(controller, root.transform, waterlineWorldY, spriteMaterial);
            BuildRippleRings(controller, root.transform, waterlineWorldY, spriteMaterial, out var ringSprite);
            BuildFishingLine(controller, root.transform, rodTipWorldPosition, spriteMaterial);

            // Built last and after every seeded random draw above, so the
            // four ambient fish keep their reproducible placement regardless
            // of this addition (this now also builds the rare-fish aura, which
            // must obey the same rule). Shares the ambient fish silhouette
            // texture/sprite rather than generating a second copy.
            BuildTargetFish(controller, root.transform, fishSprite, fishNativeWidthWorld, fishMaterial, spriteMaterial);

            // Surface foam ridge shown while something is being towed through
            // the water. Also built after every seeded draw, same rule; it
            // owns its own texture/sprite lifetime, so nothing is registered
            // for cleanup here.
            controller.SetBobberWake(KawaGlintBobberWake.Create(
                root.transform,
                spriteMaterial,
                controller.Bobber,
                waterlineWorldY,
                waterWorldRect));

            // Consumes zero randomness (draws no values from `random`), so it
            // is safe to build last without disturbing any of the seeded
            // placements above. Reuses the ripple ring sprite rather than
            // generating a second ring texture.
            BuildSplash(controller, root.transform, waterlineWorldY, spriteMaterial, ringSprite);

            return controller;
        }

        // ---------------------------------------------------------------
        // Fish shadows (order 14)
        // ---------------------------------------------------------------

        private static void BuildFishShadows(
            KawaGlintActorsController controller,
            Transform parent,
            Rect waterWorldRect,
            System.Random random,
            Material material,
            out Sprite fishSprite,
            out float nativeWidthWorld)
        {
            // Procedural teardrop silhouette: kept unconditionally as the
            // per-fish fallback (any species whose art fails to load falls
            // back to this, individually) and as the default target-fish
            // sprite when no cast is in flight yet.
            var texture = CreateFishShadowTexture();
            controller.RegisterGeneratedAsset(texture);
            var proceduralSprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Fish Shadow", PixelsPerUnit);
            controller.RegisterGeneratedAsset(proceduralSprite);
            var proceduralNativeWidth = FishTextureWidth / PixelsPerUnit;

            for (var i = 0; i < FishCount; i++)
            {
                var length = NextFloat(random, FishMinLengthWorld, FishMaxLengthWorld);
                var direction = random.Next(2) == 0 ? -1f : 1f;
                var startX = NextFloat(random, waterWorldRect.xMin, waterWorldRect.xMax);
                var baseY = NextFloat(random, FishMinDepthY, FishMaxDepthY);
                var speed = NextFloat(random, FishMinSpeedWorld, FishMaxSpeedWorld);
                var bobSpeed = NextFloat(random, FishMinBobSpeed, FishMaxBobSpeed);
                var bobPhase = NextFloat(random, 0f, Mathf.PI * 2f);

                // Species/art selection consumes zero randomness (a fixed
                // index lookup), so it can never perturb the draw
                // order/count above regardless of whether the resource
                // actually loads.
                var artSprite = KawaGlintSpriteCatalog.LoadFishShadow(DefaultAmbientFishSpeciesIds[i % DefaultAmbientFishSpeciesIds.Length]);
                var spriteForThisFish = artSprite != null ? artSprite : proceduralSprite;
                var nativeWidthForThisFish = artSprite != null ? artSprite.bounds.size.x : proceduralNativeWidth;

                // Uniform scale on both axes, derived from the chosen
                // sprite's own native width -- preserves whichever texture's
                // real aspect ratio exactly, no stretch.
                var scale = length / nativeWidthForThisFish;

                var go = new GameObject($"FishShadow{i}");
                go.transform.SetParent(parent, false);
                go.transform.position = new Vector3(startX, baseY, 0f);
                go.transform.localScale = new Vector3(scale, scale, 1f);

                var renderer = go.AddComponent<SpriteRenderer>();
                renderer.sprite = spriteForThisFish;
                renderer.sharedMaterial = material;
                renderer.sortingOrder = FishSortingOrder;
                // Source art (both the procedural silhouette and the
                // illustrated shadow PNGs) faces -X by default; flip to face
                // the direction of travel.
                renderer.flipX = direction > 0f;
                if (artSprite != null)
                {
                    // Illustrated shadows are baked fully opaque (the source
                    // PNGs have no built-in translucency). Tint down slightly
                    // from 1.0 so ambient fish read as murky underwater
                    // shapes distinct from the single fully-opaque target
                    // fish, while staying solid enough not to wash out over
                    // the bright river cross-section background art.
                    renderer.color = new Color(1f, 1f, 1f, IllustratedAmbientFishAlpha);
                }

                // Per-fish wag phase only (module D) -- amplitude/speed stay
                // at the shared material's defaults for ambient fish (only
                // the single target fish varies those, per gameplay mode, in
                // KawaGlintActorsController). Harmless no-op if `material`
                // fell back to the plain sprite material (that shader has no
                // _WagPhase property, so the property block is simply
                // unused).
                var mpb = new MaterialPropertyBlock();
                renderer.GetPropertyBlock(mpb);
                mpb.SetFloat(WagPhaseId, i * FishWagPhaseStep);
                renderer.SetPropertyBlock(mpb);

                var halfWidth = length * 0.5f;
                // `length` is passed through so SetAmbientSpecies can rescale
                // this fish to the same drawn length after swapping its sprite
                // for a different species' art (whose native width differs).
                controller.RegisterFish(go.transform, renderer, speed, direction, baseY, bobSpeed, bobPhase, FishBobAmplitude, halfWidth, length);
            }

            // Target-fish default: prefer the ayu shadow art so the very
            // first cast (before any species is known) already shows
            // illustrated art rather than the procedural placeholder;
            // ShowTargetFish(string,float) below swaps this out per-species
            // once a cast actually starts.
            var defaultArt = KawaGlintSpriteCatalog.LoadFishShadow("fish_ayu");
            fishSprite = defaultArt != null ? defaultArt : proceduralSprite;
            nativeWidthWorld = defaultArt != null ? defaultArt.bounds.size.x : proceduralNativeWidth;
        }

        private static Texture2D CreateFishShadowTexture()
        {
            const int width = FishTextureWidth;
            const int height = FishTextureHeight;
            var tint = FishShadowColor;

            var centerX = width * 0.40f;
            var centerY = height * 0.5f;
            var rx = width * 0.26f;
            var ry = height * 0.30f;
            var tailStartX = centerX + rx * 0.55f;
            var tailEndX = width * 0.97f;
            // The tail's base half-height is derived from the ellipse
            // formula at tailStartX itself, so the triangular tail joins the
            // ellipse body with no visible seam at the handoff point.
            var tailRatio = Mathf.Sqrt(Mathf.Max(0f, 1f - Square((tailStartX - centerX) / rx)));
            var tailBaseHalfHeight = ry * tailRatio;

            var texture = CreateTexture(width, height, "KawaGlint Fish Shadow");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var dy = y - centerY;
                for (var x = 0; x < width; x++)
                {
                    float shapeAlpha;
                    if (x <= tailStartX)
                    {
                        var dx = x - centerX;
                        var value = Square(dx / rx) + Square(dy / ry);
                        // Deliberately wide smoothstep band (vs. a hard
                        // cutout): stands in for a baked ~2px blur on the
                        // silhouette edge without a separate blur pass.
                        shapeAlpha = 1f - SmoothStep01(0.85f, 1.25f, value);
                    }
                    else if (x <= tailEndX)
                    {
                        var t = (x - tailStartX) / (tailEndX - tailStartX);
                        var halfHeight = Mathf.Lerp(tailBaseHalfHeight, 0f, t);
                        var value = halfHeight > 0.05f ? Mathf.Abs(dy) / halfHeight : 999f;
                        shapeAlpha = 1f - SmoothStep01(0.75f, 1.15f, value);
                    }
                    else
                    {
                        shapeAlpha = 0f;
                    }

                    var alpha = Mathf.Clamp01(shapeAlpha) * FishShadowAlpha;
                    pixels[y * width + x] = new Color(tint.r, tint.g, tint.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Target fish (order 14, same as ambient shadows -- reuses the
        // ambient silhouette sprite; deliberately excluded from
        // RegisterFish so it never joins the ambient wrap-drift pool)
        // ---------------------------------------------------------------

        private static void BuildTargetFish(
            KawaGlintActorsController controller,
            Transform parent,
            Sprite fishSprite,
            float nativeWidthWorld,
            Material material,
            Material spriteMaterial)
        {
            var go = new GameObject("TargetFishShadow");
            go.transform.SetParent(parent, false);
            go.SetActive(false);

            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = fishSprite;
            renderer.sharedMaterial = material;
            renderer.sortingOrder = FishSortingOrder;

            controller.SetTargetFish(go.transform, renderer, nativeWidthWorld);
            BuildRareAura(controller, go.transform, spriteMaterial);
        }

        // ---------------------------------------------------------------
        // Rare-fish aura (halo order 13, sparkles order 15) -- procedural,
        // no art dependency. Built as a child of the target fish so it
        // follows it for free; KawaGlintRareAura undoes the fish's own
        // non-unit scale so everything below is authored in world units.
        // ---------------------------------------------------------------

        private const int HaloTextureWidth = 192;
        private const int HaloTextureHeight = 96;
        private const int SparkleTextureSize = 32;

        private static void BuildRareAura(
            KawaGlintActorsController controller,
            Transform targetFishTransform,
            Material spriteMaterial)
        {
            var root = new GameObject("RareAura");
            root.transform.SetParent(targetFishTransform, false);
            var aura = root.AddComponent<KawaGlintRareAura>();

            // --- halo ---
            // Baked as an ELLIPSE at 192x96. Deliberately not a circle
            // squashed by a non-uniform localScale: distorting a texture off
            // its authored aspect ratio is banned project-wide, and there is
            // no reason to break it here when baking the right shape costs
            // nothing.
            var haloTexture = CreateSoftEllipseTexture();
            // Runtime-generated and referenced by nothing else, so it is the
            // one asset in this method that must be registered for cleanup.
            // (Never register anything that came out of
            // KawaGlintSpriteCatalog -- those wrap Resources-owned textures.)
            controller.RegisterGeneratedAsset(haloTexture);
            // PPU == texture width gives the halo a native size of exactly
            // 1.0 x 0.5 world units, so KawaGlintRareAura can write
            // "fishLength * 1.30" straight into localScale.
            var haloSprite = CreateSprite(haloTexture, new Vector2(0.5f, 0.5f), "KawaGlint Rare Halo", HaloTextureWidth);
            controller.RegisterGeneratedAsset(haloSprite);

            var haloGo = new GameObject("RareHalo");
            haloGo.transform.SetParent(root.transform, false);
            var haloRenderer = haloGo.AddComponent<SpriteRenderer>();
            haloRenderer.sprite = haloSprite;
            // Shares the plain sprite material -- the halo is a soft glow, not
            // a fish, so it must not inherit the tail-wag shader.
            haloRenderer.sharedMaterial = spriteMaterial;
            haloRenderer.sortingOrder = RareHaloSortingOrder;
            haloRenderer.enabled = false;

            // --- sparkles ---
            var sparkleTexture = CreateSparkleTexture();
            controller.RegisterGeneratedAsset(sparkleTexture);
            var sparkleMaterial = CreateSharedMaterial("KawaGlint Rare Sparkle (Runtime)", sparkleTexture);
            controller.RegisterGeneratedAsset(sparkleMaterial);

            var sparkles = BuildRareSparkles(root.transform, sparkleMaterial);

            aura.Bind(haloGo.transform, haloRenderer, sparkles);
            controller.SetTargetFishAura(aura);
        }

        private static ParticleSystem BuildRareSparkles(Transform parent, Material material)
        {
            var go = new GameObject("RareSparkles");
            go.transform.SetParent(parent, false);

            var system = go.AddComponent<ParticleSystem>();
            // AddComponent<ParticleSystem>() starts the system playing
            // immediately, and several properties below refuse to be set on a
            // playing system. Same stop-then-configure-then-play order as
            // KawaGlintStageBuilder.BuildMotes.
            system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            system.useAutoRandomSeed = false;
            system.randomSeed = (uint)GenerationSeed;

            var main = system.main;
            main.loop = true;
            main.prewarm = false;
            main.playOnAwake = false;
            main.duration = 4f;
            main.startDelay = 0f;
            main.startLifetime = new ParticleSystem.MinMaxCurve(
                KawaGlintRareAura.SparkleMinLifetimeSeconds,
                KawaGlintRareAura.SparkleMaxLifetimeSeconds);
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.035f, 0.08f);
            main.startColor = new ParticleSystem.MinMaxGradient(Color.white);
            // World space, so the motes stay where they were born and the fish
            // swims out from under them -- reads as glitter left hanging in
            // the water rather than as decals stuck to the sprite.
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 24;
            main.gravityModifier = 0f;

            var emission = system.emission;
            // Starts silent. KawaGlintRareAura raises this only once the fish
            // is close enough to be revealed, and only for tier >= 1.
            emission.rateOverTime = 0f;

            var shape = system.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.position = Vector3.zero;
            shape.rotation = Vector3.zero;
            shape.scale = Vector3.one; // re-sized per cast from the fish's length

            var velocityOverLifetime = system.velocityOverLifetime;
            velocityOverLifetime.enabled = true;
            velocityOverLifetime.space = ParticleSystemSimulationSpace.World;
            // MUST zero every curve on this module with the two-constant
            // constructor, not just x/y/z. VelocityOverLifetimeModule shares
            // ONE curve-evaluation mode across all of its curves; setting only
            // x/y/z to TwoConstants leaves orbital*/radial/speedModifier at
            // Constant, and Unity re-validates the mismatch every frame,
            // producing an endless "Particle Velocity curves must all be in
            // the same mode" console spam. This is a re-run of a bug already
            // paid for once in KawaGlintStageBuilder.BuildMotes -- see the
            // long note there. Zeroing them is behaviorally a no-op.
            velocityOverLifetime.x = new ParticleSystem.MinMaxCurve(-0.05f, 0.05f);
            velocityOverLifetime.y = new ParticleSystem.MinMaxCurve(0.10f, 0.22f); // slow rise
            velocityOverLifetime.z = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalX = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalY = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalZ = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetX = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetY = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetZ = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.radial = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.speedModifier = new ParticleSystem.MinMaxCurve(1f, 1f);

            var colorOverLifetime = system.colorOverLifetime;
            colorOverLifetime.enabled = true;
            // Fade in over the first 15% of the particle's life, hold, fade
            // out to nothing. Every particle carries its own phase, so no
            // amount of them ever produces a screen-wide pulse.
            colorOverLifetime.color = new ParticleSystem.MinMaxGradient(BuildFadeInOutGradient());

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = RareSparkleSortingOrder;
            renderer.renderMode = ParticleSystemRenderMode.Billboard;

            return system;
        }

        private static Gradient BuildFadeInOutGradient()
        {
            var gradient = new Gradient();
            gradient.SetKeys(
                new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[]
                {
                    new GradientAlphaKey(0f, 0f),
                    new GradientAlphaKey(1f, 0.15f),
                    new GradientAlphaKey(1f, 0.8f),
                    new GradientAlphaKey(0f, 1f)
                });
            return gradient;
        }

        private static Texture2D CreateSoftEllipseTexture()
        {
            const int width = HaloTextureWidth;
            const int height = HaloTextureHeight;
            var texture = CreateTexture(width, height, "KawaGlint Rare Halo");
            var pixels = new Color32[width * height];
            var centerX = (width - 1) * 0.5f;
            var centerY = (height - 1) * 0.5f;
            var rx = width * 0.5f;
            var ry = height * 0.5f;

            for (var y = 0; y < height; y++)
            {
                var dy = (y - centerY) / ry;
                for (var x = 0; x < width; x++)
                {
                    var dx = (x - centerX) / rx;
                    var d = Mathf.Sqrt(dx * dx + dy * dy); // 1.0 on the ellipse boundary
                    // Squared falloff from a solid core: no visible rim at all,
                    // which is what keeps this reading as light in the water
                    // instead of as a drawn outline around the fish.
                    var alpha = Mathf.Clamp01(1f - d);
                    alpha *= alpha;
                    pixels[y * width + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        private static Texture2D CreateSparkleTexture()
        {
            const int size = SparkleTextureSize;
            var texture = CreateTexture(size, size, "KawaGlint Rare Sparkle");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var maxRadius = size * 0.5f;

            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / maxRadius;
                    var alpha = 1f - SmoothStep01(0.15f, 1f, d);
                    pixels[y * size + x] = new Color(1f, 1f, 1f, Mathf.Clamp01(alpha));
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Bobber (order 34)
        // ---------------------------------------------------------------

        private static void BuildBobber(
            KawaGlintActorsController controller,
            Transform parent,
            float waterlineWorldY,
            Material material)
        {
            var texture = KawaGlintBobberArt.CreateBobberTexture();
            controller.RegisterGeneratedAsset(texture);

            // Pivot at the waistline, not the sprite centre. With a waist
            // pivot, "transform.position.y == the water surface" literally
            // means "the waistline sits on the water", which is what the
            // float's shape says should happen. The old centre pivot only
            // approximated that, and the approximation is what made the float
            // look like it was sitting on a slightly different water level
            // than everything else.
            var sprite = CreateSprite(
                texture,
                new Vector2(0.5f, KawaGlintBobberArt.WaistV),
                "KawaGlint Bobber",
                PixelsPerUnit);
            controller.RegisterGeneratedAsset(sprite);

            var go = new GameObject("Bobber");
            go.transform.SetParent(parent, false);

            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            // Submerge material: tints and softly cuts the part of the float
            // that is under the surface. Falls back to the plain sprite
            // material (fully opaque float, no cut line) if the shader is
            // missing or unsupported -- this builder must always succeed.
            var submergeMaterial = KawaGlintBobber.CreateSubmergeMaterial(material);
            if (submergeMaterial != material)
            {
                controller.RegisterGeneratedAsset(submergeMaterial);
            }
            renderer.sharedMaterial = submergeMaterial;
            renderer.sortingOrder = BobberSortingOrder;

            // Single uniform scalar derived from the sprite's own native
            // height so the authored dome/taper/antenna silhouette is never
            // stretched off its proportions.
            var nativeHeight = sprite.bounds.size.y;
            var scale = nativeHeight > 0.0001f ? BobberWorldHeight / nativeHeight : 1f;
            go.transform.localScale = new Vector3(scale, scale, 1f);

            var bobber = go.AddComponent<KawaGlintBobber>();
            // Distance from the waist pivot up to the antenna bead -- where
            // the fishing line attaches. (This argument used to be
            // "halfHeightWorld", back when the pivot was the sprite centre.)
            bobber.Initialize(BobberRestX, waterlineWorldY, KawaGlintBobberArt.TopOffsetWorld(BobberWorldHeight));

            controller.SetBobber(bobber);
        }

        // ---------------------------------------------------------------
        // Ripple rings (order 32)
        // ---------------------------------------------------------------

        private static void BuildRippleRings(
            KawaGlintActorsController controller,
            Transform parent,
            float waterlineWorldY,
            Material material,
            out Sprite ringSprite)
        {
            var texture = CreateRingTexture();
            controller.RegisterGeneratedAsset(texture);
            // pixelsPerUnit == texture size gives the ring a native diameter
            // of exactly 1 world unit, so the loop's 0.3->1.1 "world units"
            // scale values (DESIGN.md) can be written straight into
            // transform.localScale with no extra conversion factor.
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Ripple Ring", RingTextureSize);
            controller.RegisterGeneratedAsset(sprite);
            ringSprite = sprite;

            for (var i = 0; i < RingCount; i++)
            {
                var go = new GameObject($"RippleRing{i}");
                go.transform.SetParent(parent, false);
                go.transform.position = new Vector3(BobberRestX, waterlineWorldY, 0f);

                var renderer = go.AddComponent<SpriteRenderer>();
                renderer.sprite = sprite;
                renderer.sharedMaterial = material;
                renderer.sortingOrder = RippleRingSortingOrder;
                renderer.color = new Color(1f, 1f, 1f, 0f);

                // Phase as a FRACTION of the loop, not seconds: the rings are
                // evenly spread so they read as a continuous outward pulse
                // rather than pulsing in unison, and expressing that as a
                // fraction keeps it a true even spread when the controller
                // swaps to a shorter loop for the pull/renda ring modes. A
                // phase in seconds would silently stop being half a period the
                // moment the duration changed.
                controller.RegisterRing(go.transform, renderer, i / (float)RingCount);
            }
        }

        private static Texture2D CreateRingTexture()
        {
            const int size = RingTextureSize;
            var texture = CreateTexture(size, size, "KawaGlint Ripple Ring");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var maxRadius = size * 0.5f;

            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / maxRadius; // 0 at center, 1 at texture edge
                    var band = Mathf.Clamp01(1f - Mathf.Abs(d - RingNormalizedRadius) / RingNormalizedThickness);
                    var alpha = band * band * (3f - 2f * band); // smoothstep -> soft ring, no hard edge
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Splash (module A, one-shot landing effect: ring order 32,
        // droplets order 35)
        // ---------------------------------------------------------------

        private const int SplashDropletTextureSize = 32;
        private static readonly Color SplashDropletColor = HexColor(0xE8, 0xF6, 0xFF);

        private static void BuildSplash(
            KawaGlintActorsController controller,
            Transform parent,
            float waterlineWorldY,
            Material material,
            Sprite ringSprite)
        {
            var go = new GameObject("SplashEffect");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(0f, waterlineWorldY, 0f);

            var splash = go.AddComponent<KawaGlintSplashEffect>();

            var ringGo = new GameObject("SplashRing");
            ringGo.transform.SetParent(go.transform, false);
            var ringRenderer = ringGo.AddComponent<SpriteRenderer>();
            ringRenderer.sprite = ringSprite;
            ringRenderer.sharedMaterial = material;
            ringRenderer.sortingOrder = SplashRingSortingOrder;
            ringRenderer.enabled = false;

            var dropletTexture = CreateSplashDropletTexture();
            controller.RegisterGeneratedAsset(dropletTexture);
            // pixelsPerUnit == texture size gives the droplet a native
            // diameter of exactly 1 world unit, mirroring the ripple ring's
            // own convention so KawaGlintSplashEffect can write its 0.06wu
            // (DESIGN.md) diameter straight into transform.localScale.
            var dropletSprite = CreateSprite(dropletTexture, new Vector2(0.5f, 0.5f), "KawaGlint Splash Droplet", SplashDropletTextureSize);
            controller.RegisterGeneratedAsset(dropletSprite);

            var dropletRenderers = new SpriteRenderer[KawaGlintSplashMath.DropletCount];
            for (var i = 0; i < KawaGlintSplashMath.DropletCount; i++)
            {
                var dropletGo = new GameObject($"SplashDroplet{i}");
                dropletGo.transform.SetParent(go.transform, false);
                var dropletRenderer = dropletGo.AddComponent<SpriteRenderer>();
                dropletRenderer.sprite = dropletSprite;
                dropletRenderer.sharedMaterial = material;
                dropletRenderer.sortingOrder = SplashDropletSortingOrder;
                dropletRenderer.enabled = false;
                dropletRenderers[i] = dropletRenderer;
            }

            splash.Configure(ringGo.transform, ringRenderer, dropletRenderers);
            splash.Initialize(controller.Bobber);
        }

        private static Texture2D CreateSplashDropletTexture()
        {
            const int size = SplashDropletTextureSize;
            var texture = CreateTexture(size, size, "KawaGlint Splash Droplet");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var maxRadius = size * 0.5f;

            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / maxRadius; // 0 at center, 1 at texture edge
                    var alpha = 1f - SmoothStep01(0.6f, 1.0f, d);
                    pixels[y * size + x] = new Color(SplashDropletColor.r, SplashDropletColor.g, SplashDropletColor.b, Mathf.Clamp01(alpha));
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Fishing line (order 33)
        // ---------------------------------------------------------------

        private static void BuildFishingLine(
            KawaGlintActorsController controller,
            Transform parent,
            Vector3 rodTipWorldPosition,
            Material material)
        {
            var go = new GameObject("FishingLine");
            go.transform.SetParent(parent, false);

            var line = go.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.sharedMaterial = material;
            line.sortingOrder = FishingLineSortingOrder;
            line.widthMultiplier = FishingLineWidth;
            line.numCapVertices = 2;
            line.numCornerVertices = 0;
            line.startColor = FishingLineColor;
            line.endColor = FishingLineColor;
            line.positionCount = LineSegmentPointCount;

            controller.SetFishingLine(line, rodTipWorldPosition, LineSegmentPointCount);
        }

        // ---------------------------------------------------------------
        // Shared helpers
        // ---------------------------------------------------------------

        private static Texture2D CreateTexture(int width, int height, string name)
        {
            return new Texture2D(width, height, TextureFormat.RGBA32, mipChain: false, linear: false)
            {
                name = name,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
        }

        private static Sprite CreateSprite(Texture2D texture, Vector2 pivot, string name, float pixelsPerUnit)
        {
            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                pivot,
                pixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            sprite.name = name;
            return sprite;
        }

        private static Material CreateSharedMaterial(string name, Texture2D mainTexture = null)
        {
            var shader = Shader.Find(SpriteUnlitShaderName);
            if (shader == null)
            {
                Debug.LogError($"KawaGlint: shader not found, falling back: {SpriteUnlitShaderName}");
                shader = Shader.Find("Sprites/Default");
            }
            var material = new Material(shader)
            {
                name = name,
                hideFlags = HideFlags.DontSave
            };
            if (mainTexture != null)
            {
                // Particle renderers take their texture from the material
                // rather than from a Sprite, unlike every SpriteRenderer here.
                material.mainTexture = mainTexture;
            }
            return material;
        }

        private static Color HexColor(byte r, byte g, byte b, byte a = 255)
        {
            return new Color32(r, g, b, a);
        }

        private static float NextFloat(System.Random random, float min, float max)
        {
            return min + (float)random.NextDouble() * (max - min);
        }

        private static float Square(float value)
        {
            return value * value;
        }

        private static float SmoothStep01(float edge0, float edge1, float value)
        {
            var t = Mathf.Clamp01((value - edge0) / (edge1 - edge0));
            return t * t * (3f - 2f * t);
        }
    }
}
