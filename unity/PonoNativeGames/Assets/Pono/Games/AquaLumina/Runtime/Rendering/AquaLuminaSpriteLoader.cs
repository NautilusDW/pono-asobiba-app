using System.Collections.Generic;
using UnityEngine;

namespace Pono.AquaLumina.Rendering
{
    // Loads illustrated (non-procedural) AquaLumina content PNGs as Sprites.
    // Mirrors the established RuntimeAssetLoader.LoadSprite (HideSeekCreatures) /
    // ColorWaterUiFactory.LoadSprite (ColorWaterDelivery) pattern exactly, so all
    // three games share one proven Resources.Load + Sprite.Create recipe.
    public static class AquaLuminaSpriteLoader
    {
        private static readonly Dictionary<string, Sprite> Sprites = new Dictionary<string, Sprite>();

        // WHY: sprites returned by this loader wrap Resources-owned textures and live in
        // the static cache above for reuse across stage rebuilds. Callers must NEVER pass
        // them (or their textures) to AquaLuminaStageContent.RegisterGeneratedAsset, whose
        // OnDestroy destroys every registered object - destroying a Resources-backed
        // texture would break every later Resources.Load of it for the lifetime of the
        // application (Resources-loaded assets are not reloaded once destroyed).
        public static Sprite LoadSprite(string path, Vector4 border = default)
        {
            var cacheKey = $"{path}:{border}";
            if (Sprites.TryGetValue(cacheKey, out var cached) && cached != null)
            {
                return cached;
            }

            var texture = Resources.Load<Texture2D>(path);
            if (texture == null)
            {
                Debug.LogError($"AquaLumina texture resource not found: {path}");
                return null;
            }

            // PixelsPerUnit is fixed at 100f to match AquaLuminaStageBuilder.PixelsPerUnit,
            // so a texture's native world size (pixels / 100) is directly comparable to
            // every procedurally-painted sprite the stage builder already places.
            // Pivot stays center (0.5, 0.5) like the precedent loaders - callers that need
            // to root a sprite on the seafloor compute centerY = rootY + worldHeight * 0.5f
            // themselves rather than this loader growing a pivot parameter, keeping the
            // cache key simple and the loader byte-for-byte on-pattern.
            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                new Vector2(0.5f, 0.5f),
                100f,
                0,
                SpriteMeshType.FullRect,
                border);
            sprite.name = texture.name;
            Sprites[cacheKey] = sprite;
            return sprite;
        }
    }
}
