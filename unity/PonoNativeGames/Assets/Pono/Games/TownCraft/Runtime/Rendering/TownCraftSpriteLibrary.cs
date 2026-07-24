using System.Collections.Generic;
using UnityEngine;

namespace Pono.TownCraft
{
    public sealed class TownCraftSpriteLibrary
    {
        private readonly Dictionary<string, Sprite> _cache = new();
        public TownTheme Theme { get; set; } = TownTheme.Countryside;

        public Sprite Tile(string id) => Load($"TownCraft/Tiles/{id}");
        public Sprite Prop(string id) => Load($"TownCraft/Props/{id}");
        public Sprite House(string id) => Load($"TownCraft/Houses/{id}");

        private Sprite Load(string countrysidePath)
        {
            var themeName = Theme.ToString();
            var themedPath = countrysidePath.Replace("TownCraft/", $"TownCraft/Themes/{themeName}/");
            var key = $"{themeName}:{countrysidePath}";
            if (_cache.TryGetValue(key, out var cached)) return cached;
            var sprite = Theme == TownTheme.Countryside ? null : Resources.Load<Sprite>(themedPath);
            sprite ??= Resources.Load<Sprite>(countrysidePath);
            _cache[key] = sprite;
            return sprite;
        }
    }
}
