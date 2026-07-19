using System;
using UnityEngine;

namespace Pono.MarbleRun3D.UI
{
    /// <summary>
    /// Generated atlas order. Keep this in top-to-bottom, left-to-right image order.
    /// </summary>
    public enum ActionIcon
    {
        Rotate = 0,
        Delete = 1,
        Undo = 2,
        Clear = 3,
        Save = 4,
        Load = 5,
        Orbit = 6,
        Overview = 7,
        Reset = 8,
        Play = 9,
        Pause = 10,
        Edit = 11
    }

    /// <summary>
    /// Lazily loads and slices the shared 4x3 action-icon texture.
    /// </summary>
    public static class ActionIconAtlas
    {
        public const int Columns = 4;
        public const int Rows = 3;
        public const int IconCount = Columns * Rows;
        public const string ResourcePath = "UI/MarbleActionIcons";

        private static readonly Sprite[] Sprites = new Sprite[IconCount];
        private static Texture2D _texture;

        public static Texture2D Texture
        {
            get
            {
                if (_texture == null)
                {
                    _texture = Resources.Load<Texture2D>(ResourcePath);
                    if (_texture == null)
                        throw new InvalidOperationException(
                            "Action icon atlas is missing from Resources/" + ResourcePath + ".png");

                    if (_texture.width % Columns != 0 || _texture.height % Rows != 0)
                        throw new InvalidOperationException(
                            "Action icon atlas dimensions must be divisible by 4x3.");

                    _texture.filterMode = FilterMode.Bilinear;
                    _texture.wrapMode = TextureWrapMode.Clamp;
                }

                return _texture;
            }
        }

        public static Sprite Get(ActionIcon icon)
        {
            var index = (int)icon;
            if (index < 0 || index >= IconCount)
                throw new ArgumentOutOfRangeException(nameof(icon), icon, "Unknown action icon.");

            var cached = Sprites[index];
            if (cached != null) return cached;

            var texture = Texture;
            var cellWidth = texture.width / Columns;
            var cellHeight = texture.height / Rows;
            var column = index % Columns;
            var rowFromTop = index / Columns;
            var unityRow = Rows - 1 - rowFromTop;
            var rect = new Rect(
                column * cellWidth,
                unityRow * cellHeight,
                cellWidth,
                cellHeight);

            cached = Sprite.Create(
                texture,
                rect,
                new Vector2(0.5f, 0.5f),
                100f,
                0,
                SpriteMeshType.FullRect);
            cached.name = "ActionIcon_" + icon;
            Sprites[index] = cached;
            return cached;
        }
    }
}
