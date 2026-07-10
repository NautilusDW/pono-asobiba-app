using System.Collections.Generic;
using UnityEngine;

namespace Pono.HideSeekCreatures.UI
{
    public static class RuntimeAssetLoader
    {
        private static readonly Dictionary<string, Sprite> Sprites = new Dictionary<string, Sprite>();

        public static Font LoadFont()
        {
            return Resources.Load<Font>("Fonts/NotoSansJP-Variable");
        }

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
                Debug.LogError($"Texture resource not found: {path}");
                return null;
            }

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
