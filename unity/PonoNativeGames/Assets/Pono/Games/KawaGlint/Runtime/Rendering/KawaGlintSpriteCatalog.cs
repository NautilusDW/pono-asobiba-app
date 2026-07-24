using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Loads KawaGlint's illustrated (non-procedural) fish/angler/background
    /// art PNGs -- processed by the batch:1458-kawaglint-fish-art asset
    /// pipeline into <c>Content/Resources/KawaGlint/Sprites/</c> -- as
    /// Sprites. Mirrors <c>Pono.AquaLumina.Rendering.AquaLuminaSpriteLoader</c>'s
    /// established Resources.Load&lt;Texture2D&gt; + Sprite.Create(FullRect,
    /// PPU=100) + static-cache recipe exactly.
    ///
    /// WHY (do not violate): sprites returned by this catalog wrap
    /// Resources-owned textures and live in the static cache below for reuse
    /// across stage rebuilds. Callers must NEVER pass them (or their
    /// textures) to <see cref="KawaGlintActorsController.RegisterGeneratedAsset"/>,
    /// whose OnDestroy destroys every registered object -- destroying a
    /// Resources-backed texture would break every later Resources.Load of it
    /// for the lifetime of the application (Resources-loaded assets are not
    /// reloaded once destroyed).
    ///
    /// Species IDs are exactly <see cref="Pono.KawaGlint.Core.TsuriFishData"/>'s
    /// <c>Id</c> values, but this class only ever takes/returns plain
    /// strings -- it does not reference <c>Pono.KawaGlint.Core</c>, keeping
    /// the Core/Rendering module split intact (see
    /// <c>Pono.KawaGlint.Gameplay.KawaGlintGameController</c>'s class doc).
    /// Two species IDs deliberately do not match their art file's base name:
    /// <c>fish_salmon</c> -&gt; <c>fish_sake_*</c> (さけ) and
    /// <c>treasure_boot</c> -&gt; <c>fish_nagagutsu_*</c> (ながぐつ).
    ///
    /// The 10 sea-expansion species (KawaGlint 海拡張 実装契約 v1.0 §D)
    /// are registered in <see cref="ShadowPaths"/>/<see cref="CatchPaths"/>
    /// with their eventual art paths, but no art has been generated for them
    /// yet -- <see cref="LoadFishShadow"/>/<see cref="LoadCatchArt"/>
    /// transparently fall back to <see cref="KawaGlintProceduralFishArt"/>'s
    /// per-species procedural silhouette when the Resources lookup for a
    /// *known* id comes back empty (an *unknown* id is still a hard error,
    /// unchanged). Once real art lands for a given species, dropping its PNG
    /// into <c>Content/Resources/KawaGlint/Sprites/</c> makes the fallback
    /// stop firing for that id with zero code changes here.
    /// </summary>
    public static class KawaGlintSpriteCatalog
    {
        private const float PixelsPerUnit = 100f;
        private static readonly Vector2 CenterPivot = new Vector2(0.5f, 0.5f);
        private static readonly Vector2 BottomCenterPivot = new Vector2(0.5f, 0f);

        private const string AnglerPath = "KawaGlint/Sprites/pono_angler_side";
        private const string BackgroundPath = "KawaGlint/Sprites/bg_river_crosssection";

        private static readonly Dictionary<string, string> ShadowPaths = new Dictionary<string, string>
        {
            { "fish_ayu", "KawaGlint/Sprites/fish_ayu_shadow" },
            { "fish_nijimasu", "KawaGlint/Sprites/fish_nijimasu_shadow" },
            { "zarigani", "KawaGlint/Sprites/fish_zarigani_shadow" },
            { "fish_salmon", "KawaGlint/Sprites/fish_sake_shadow" }, // file name is "sake", not "salmon"
            { "treasure_boot", "KawaGlint/Sprites/fish_nagagutsu_shadow" }, // file name is "nagagutsu", not "boot"
            // Sea-expansion species (§D-2): art not generated yet, so these
            // paths currently always miss and fall back to
            // KawaGlintProceduralFishArt below. Kept registered (rather than
            // omitted) so a future art drop-in needs no code change.
            { "fish_unagi", "KawaGlint/Sprites/fish_unagi_shadow" },
            { "fish_aji", "KawaGlint/Sprites/fish_aji_shadow" },
            { "fish_ebi", "KawaGlint/Sprites/fish_ebi_shadow" },
            { "fish_karei", "KawaGlint/Sprites/fish_karei_shadow" },
            { "hitode", "KawaGlint/Sprites/fish_hitode_shadow" },
            { "treasure_kaigara", "KawaGlint/Sprites/fish_kaigara_shadow" }, // file base is "kaigara", not "treasure_kaigara"
            { "fish_iwashi", "KawaGlint/Sprites/fish_iwashi_shadow" },
            { "fish_tai", "KawaGlint/Sprites/fish_tai_shadow" },
            { "fish_ika", "KawaGlint/Sprites/fish_ika_shadow" },
            { "fish_maguro", "KawaGlint/Sprites/fish_maguro_shadow" },
        };

        private static readonly Dictionary<string, string> CatchPaths = new Dictionary<string, string>
        {
            { "fish_ayu", "KawaGlint/Sprites/fish_ayu_catch" },
            { "fish_nijimasu", "KawaGlint/Sprites/fish_nijimasu_catch" },
            { "zarigani", "KawaGlint/Sprites/fish_zarigani_catch" },
            { "fish_salmon", "KawaGlint/Sprites/fish_sake_catch" }, // file name is "sake", not "salmon"
            { "treasure_boot", "KawaGlint/Sprites/fish_nagagutsu_catch" }, // file name is "nagagutsu", not "boot"
            // Sea-expansion species (§D-2): see ShadowPaths comment above.
            { "fish_unagi", "KawaGlint/Sprites/fish_unagi_catch" },
            { "fish_aji", "KawaGlint/Sprites/fish_aji_catch" },
            { "fish_ebi", "KawaGlint/Sprites/fish_ebi_catch" },
            { "fish_karei", "KawaGlint/Sprites/fish_karei_catch" },
            { "hitode", "KawaGlint/Sprites/fish_hitode_catch" },
            { "treasure_kaigara", "KawaGlint/Sprites/fish_kaigara_catch" }, // file base is "kaigara", not "treasure_kaigara"
            { "fish_iwashi", "KawaGlint/Sprites/fish_iwashi_catch" },
            { "fish_tai", "KawaGlint/Sprites/fish_tai_catch" },
            { "fish_ika", "KawaGlint/Sprites/fish_ika_catch" },
            { "fish_maguro", "KawaGlint/Sprites/fish_maguro_catch" },
        };

        // Sea-expansion location background art (§D-2). No caller passes a
        // non-null key yet -- KawaGlintStageBuilder still always calls the
        // parameterless LoadBackground() -- this exists only as the receiving
        // end for a future per-location art integration task.
        private static readonly Dictionary<string, string> BackgroundPaths = new Dictionary<string, string>
        {
            { "bg_tsuri_river_kakou", "KawaGlint/Sprites/bg_tsuri_river_kakou" },
            { "bg_tsuri_sea_sunahama", "KawaGlint/Sprites/bg_tsuri_sea_sunahama" },
            { "bg_tsuri_sea_iwaba", "KawaGlint/Sprites/bg_tsuri_sea_iwaba" },
            { "bg_tsuri_sea_oki", "KawaGlint/Sprites/bg_tsuri_sea_oki" },
        };

        private static readonly Dictionary<string, Sprite> Sprites = new Dictionary<string, Sprite>();

        // Tracks which species ids have already logged their one-time
        // "using procedural fallback" info message, so repeated casts/catches
        // for the same still-art-less species don't spam the console.
        private static readonly HashSet<string> LoggedShadowFallbackIds = new HashSet<string>();
        private static readonly HashSet<string> LoggedCatchFallbackIds = new HashSet<string>();

        /// <summary>Swimming-silhouette art for the given species Id (see <c>TsuriFishData.RiverSpecies</c>/<c>NewSpecies</c>). Null if the Id is unknown entirely; falls back to a procedural silhouette (never null) for a known id whose art resource isn't generated yet.</summary>
        public static Sprite LoadFishShadow(string speciesId)
        {
            if (string.IsNullOrEmpty(speciesId) || !ShadowPaths.TryGetValue(speciesId, out var path))
            {
                Debug.LogError($"KawaGlint: no fish-shadow art mapped for species id '{speciesId}'");
                return null;
            }

            var sprite = LoadSprite(path, CenterPivot, logMissing: false);
            if (sprite != null)
            {
                return sprite;
            }

            if (LoggedShadowFallbackIds.Add(speciesId))
            {
                Debug.Log($"KawaGlint: no shadow art resource yet for species '{speciesId}' ({path}); using procedural fallback silhouette.");
            }
            return KawaGlintProceduralFishArt.GetSilhouette(speciesId);
        }

        /// <summary>Full-color catch illustration for the given species Id. Null if the Id is unknown entirely; falls back to a procedural silhouette (never null) for a known id whose art resource isn't generated yet.</summary>
        public static Sprite LoadCatchArt(string speciesId)
        {
            if (string.IsNullOrEmpty(speciesId) || !CatchPaths.TryGetValue(speciesId, out var path))
            {
                Debug.LogError($"KawaGlint: no catch art mapped for species id '{speciesId}'");
                return null;
            }

            var sprite = LoadSprite(path, CenterPivot, logMissing: false);
            if (sprite != null)
            {
                return sprite;
            }

            if (LoggedCatchFallbackIds.Add(speciesId))
            {
                Debug.Log($"KawaGlint: no catch art resource yet for species '{speciesId}' ({path}); using procedural fallback silhouette.");
            }
            return KawaGlintProceduralFishArt.GetSilhouette(speciesId);
        }

        /// <summary>The angler (ポノ) side-view illustration, pivoted bottom-center so callers can root it on the riverbank at world Y directly.</summary>
        public static Sprite LoadAngler()
        {
            return LoadSprite(AnglerPath, BottomCenterPivot);
        }

        /// <summary>The river cross-section background illustration (~16:9, exact AR measured by the asset pipeline -- never assume a round 16:9).</summary>
        public static Sprite LoadBackground()
        {
            return LoadSprite(BackgroundPath, CenterPivot);
        }

        /// <summary>
        /// Location-keyed background art (§D-2). Falls back to the shared
        /// river cross-section (<see cref="LoadBackground()"/>) when
        /// <paramref name="backgroundKey"/> is null/unmapped/unresolved --
        /// every location renders that same background today, so this
        /// overload currently has no caller; it exists purely as the receiving
        /// end for a future per-location art integration task.
        /// </summary>
        public static Sprite LoadBackground(string backgroundKey)
        {
            if (!string.IsNullOrEmpty(backgroundKey) && BackgroundPaths.TryGetValue(backgroundKey, out var path))
            {
                var sprite = LoadSprite(path, CenterPivot, logMissing: false);
                if (sprite != null)
                {
                    return sprite;
                }
            }
            return LoadBackground();
        }

        private static Sprite LoadSprite(string path, Vector2 pivot, bool logMissing = true)
        {
            var cacheKey = $"{path}:{pivot}";
            if (Sprites.TryGetValue(cacheKey, out var cached) && cached != null)
            {
                return cached;
            }

            var texture = Resources.Load<Texture2D>(path);
            if (texture == null)
            {
                if (logMissing)
                {
                    Debug.LogError($"KawaGlint texture resource not found: {path}");
                }
                return null;
            }

            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                pivot,
                PixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            sprite.name = texture.name;
            Sprites[cacheKey] = sprite;
            return sprite;
        }
    }
}
