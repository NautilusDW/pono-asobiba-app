using System.Collections.Generic;
using UnityEngine;

namespace Pono.TownCraft
{
    public sealed class TownCraftWorldRenderer : MonoBehaviour
    {
        private readonly TownCraftSpriteLibrary _sprites = new();
        private readonly List<GameObject> _spawned = new();
        private TownCraftState _state;
        private Font _font;

        public void Render(TownCraftState state)
        {
            _state = state;
            _sprites.Theme = state.theme;
            _font ??= Resources.Load<Font>("Fonts/NotoSansJP-Variable");
            Clear();

            for (var y = 0; y < state.height; y++)
            for (var x = 0; x < state.width; x++)
            {
                var cell = state.Cell(x, y);
                var elevation = cell.height * 0.18f;
                AddSprite($"ground-{x}-{y}", GroundSprite(cell), new Vector3(x, y + elevation, 0), 0, Vector3.one);

                if (cell.height > 0)
                {
                    AddSprite($"cliff-{x}-{y}", _sprites.Tile("cliff_edge_s"),
                        new Vector3(x, y - 0.25f + elevation, -0.05f), 4 + y, Vector3.one);
                }
                if (cell.water)
                {
                    AddSprite($"water-{x}-{y}", _sprites.Tile("ground_water"),
                        new Vector3(x, y, -0.08f), 2 + y, Vector3.one);
                }
                else if (cell.road)
                {
                    AddSprite($"road-{x}-{y}", _sprites.Tile("ground_dirt"),
                        new Vector3(x, y + elevation, -0.08f), 3 + y, Vector3.one);
                }
            }

            foreach (var placement in state.placements) RenderPlacement(placement);
        }

        private Sprite GroundSprite(TownCell cell)
        {
            if (cell.water) return _sprites.Tile("ground_grass");
            return cell.ground switch
            {
                GroundKind.Dirt => _sprites.Tile("ground_dirt"),
                GroundKind.Stone => _sprites.Tile("ground_stone"),
                _ => _sprites.Tile("ground_grass")
            };
        }

        private void RenderPlacement(TownPlacement placement)
        {
            Sprite sprite;
            var scale = Vector3.one;
            if (placement.category == PlacementCategory.Building)
            {
                sprite = _sprites.House(placement.assetId);
                scale = Vector3.one * 2.25f;
            }
            else
            {
                sprite = _sprites.Prop(placement.assetId);
                scale = placement.assetId.StartsWith("tree_") ? Vector3.one * 1.65f : Vector3.one * 1.25f;
            }
            var position = new Vector3(placement.x, placement.y + 0.33f, -0.2f);
            var root = AddSprite($"placement-{placement.id}", sprite, position,
                100 + (stateHeight(placement.x, placement.y) * 5) + placement.y, scale,
                placement.rotation);
            if (placement.id == "home")
            {
                AddNameplate(root.transform);
            }
        }

        private int stateHeight(int x, int y) =>
            _state.Contains(x, y) ? _state.Cell(x, y).height : 0;

        private void AddNameplate(Transform house)
        {
            var labelObject = new GameObject("PlayerNameplate");
            labelObject.transform.SetParent(house, false);
            labelObject.transform.localPosition = new Vector3(0.30f, -0.38f, -0.1f);
            labelObject.transform.localScale = Vector3.one;
            var text = labelObject.AddComponent<TextMesh>();
            text.text = $"{SanitizeName(_state.playerName)}\nの おうち";
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.050f;
            text.fontSize = 44;
            text.color = new Color(0.25f, 0.12f, 0.04f);
            if (_font != null)
            {
                text.font = _font;
                text.GetComponent<MeshRenderer>().sharedMaterial = _font.material;
            }
            text.GetComponent<MeshRenderer>().sortingOrder = 1000;
        }

        public static string SanitizeName(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "わたし";
            value = value.Trim().Replace("\n", "").Replace("\r", "");
            return value.Length <= 8 ? value : value[..8];
        }

        private GameObject AddSprite(string name, Sprite sprite, Vector3 position, int order,
            Vector3 scale, float rotation = 0f)
        {
            var item = new GameObject(name);
            item.transform.SetParent(transform, false);
            item.transform.position = position;
            item.transform.localScale = scale;
            item.transform.rotation = Quaternion.Euler(0, 0, rotation);
            var renderer = item.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sortingOrder = order;
            if (_state != null && _state.theme == TownTheme.Modern)
                renderer.color = new Color(0.94f, 0.97f, 1f);
            else if (_state != null && _state.theme == TownTheme.Future)
                renderer.color = new Color(0.85f, 0.96f, 1f);
            _spawned.Add(item);
            return item;
        }

        private void Clear()
        {
            foreach (var item in _spawned)
                if (item != null) DestroyImmediate(item);
            _spawned.Clear();
        }
    }
}
