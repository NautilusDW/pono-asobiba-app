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
        };

        private static readonly Dictionary<string, string> CatchPaths = new Dictionary<string, string>
        {
            { "fish_ayu", "KawaGlint/Sprites/fish_ayu_catch" },
            { "fish_nijimasu", "KawaGlint/Sprites/fish_nijimasu_catch" },
            { "zarigani", "KawaGlint/Sprites/fish_zarigani_catch" },
            { "fish_salmon", "KawaGlint/Sprites/fish_sake_catch" }, // file name is "sake", not "salmon"
            { "treasure_boot", "KawaGlint/Sprites/fish_nagagutsu_catch" }, // file name is "nagagutsu", not "boot"
        };

        private static readonly Dictionary<string, Sprite> Sprites = new Dictionary<string, Sprite>();

        /// <summary>Swimming-silhouette art for the given species Id (see <c>TsuriFishData.RiverSpecies</c>). Null if the Id is unknown or the resource is missing.</summary>
        public static Sprite LoadFishShadow(string speciesId)
        {
            if (string.IsNullOrEmpty(speciesId) || !ShadowPaths.TryGetValue(speciesId, out var path))
            {
                Debug.LogError($"KawaGlint: no fish-shadow art mapped for species id '{speciesId}'");
                return null;
            }
            return LoadSprite(path, CenterPivot);
        }

        /// <summary>Full-color catch illustration for the given species Id. Null if the Id is unknown or the resource is missing.</summary>
        public static Sprite LoadCatchArt(string speciesId)
        {
            if (string.IsNullOrEmpty(speciesId) || !CatchPaths.TryGetValue(speciesId, out var path))
            {
                Debug.LogError($"KawaGlint: no catch art mapped for species id '{speciesId}'");
                return null;
            }
            return LoadSprite(path, CenterPivot);
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

        private static Sprite LoadSprite(string path, Vector2 pivot)
        {
            var cacheKey = $"{path}:{pivot}";
            if (Sprites.TryGetValue(cacheKey, out var cached) && cached != null)
            {
                return cached;
            }

            var texture = Resources.Load<Texture2D>(path);
            if (texture == null)
            {
                Debug.LogError($"KawaGlint texture resource not found: {path}");
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
