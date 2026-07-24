using System;
using UnityEngine;

namespace Pono.TownCraft
{
    public static class TownCraftDualGrid
    {
        private static readonly int[] FrameByMask =
        {
            -1, 15, 8, 9, 0, 11, 14, 7, 13, 4, 1, 10, 3, 2, 5, 6
        };

        public static int Mask(TownCraftState state, int x, int y, Func<TownCell, bool> filled)
        {
            var mask = 0;
            if (IsFilled(state, x - 1, y - 1, filled)) mask |= 1;
            if (IsFilled(state, x, y - 1, filled)) mask |= 2;
            if (IsFilled(state, x - 1, y, filled)) mask |= 4;
            if (IsFilled(state, x, y, filled)) mask |= 8;
            return mask;
        }

        public static int FrameForMask(int mask) =>
            FrameByMask[Mathf.Clamp(mask, 0, FrameByMask.Length - 1)];

        public static Vector2Int AtlasCellForMask(int mask)
        {
            var frame = FrameForMask(mask);
            return frame < 0 ? new Vector2Int(-1, -1) : new Vector2Int(frame % 4, frame / 4);
        }

        private static bool IsFilled(TownCraftState state, int x, int y, Func<TownCell, bool> filled) =>
            state.Contains(x, y) && filled(state.Cell(x, y));
    }

    public sealed class TownCraftDualGridAtlas
    {
        private const int TileSize = 128;
        private readonly Sprite[] _frames = new Sprite[16];

        public TownCraftDualGridAtlas(TerrainArtVariant variant)
        {
            var resource = variant == TerrainArtVariant.SpriteCookRich
                ? "TownCraft/DualGrid/grass_dirt_rich_15piece"
                : "TownCraft/DualGrid/grass_dirt_restrained_15piece";
            var texture = Resources.Load<Texture2D>(resource);
            if (texture == null) return;

            for (var frame = 0; frame < _frames.Length; frame++)
            {
                var column = frame % 4;
                var rowFromTop = frame / 4;
                var rect = new Rect(column * TileSize, (3 - rowFromTop) * TileSize, TileSize, TileSize);
                _frames[frame] = Sprite.Create(texture, rect, new Vector2(0.5f, 0.5f), TileSize);
                _frames[frame].name = $"{variant}-frame-{frame}";
            }
        }

        public Sprite SpriteForMask(int mask)
        {
            var frame = TownCraftDualGrid.FrameForMask(mask);
            return frame < 0 ? null : _frames[frame];
        }
    }
}
