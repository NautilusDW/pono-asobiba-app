using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Pono.TownCraft
{
    public sealed class TownCraftGameController : MonoBehaviour
    {
        private TownCraftState _state;
        private TownCraftWorldRenderer _world;
        private Camera _camera;
        private EditTool _tool = EditTool.Road;
        private string _placementAsset = "tree_round";
        private PlacementCategory _placementCategory = PlacementCategory.Vegetation;
        private string _message = "みちを ひいて まちを つくろう！";
        private Vector2 _scroll;
        private int _houseIndex;
        private GUIStyle _button;
        private GUIStyle _label;
        private GUIStyle _panel;
        private Texture2D _panelTexture;

        private void Awake()
        {
            _state = TownCraftStore.LoadOrDemo();
            SetupCamera();
            var worldObject = new GameObject("TownCraftWorld");
            _world = worldObject.AddComponent<TownCraftWorldRenderer>();
            _world.Render(_state);
        }

        private void SetupCamera()
        {
            _camera = Camera.main;
            if (_camera == null)
            {
                var cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                _camera = cameraObject.AddComponent<Camera>();
            }
            _camera.orthographic = true;
            _camera.orthographicSize = 7.2f;
            _camera.transform.position = new Vector3((_state.width - 1) * 0.5f, (_state.height - 1) * 0.5f, -10f);
            _camera.backgroundColor = new Color(0.72f, 0.88f, 0.98f);
        }

        private void Update()
        {
            if (Pointer.current == null || !Pointer.current.press.wasPressedThisFrame) return;
            var point = Pointer.current.position.ReadValue();
            if (point.y > Screen.height - 120 || point.y < 150) return;
            var world = _camera.ScreenToWorldPoint(new Vector3(point.x, point.y, 0));
            var x = Mathf.RoundToInt(world.x);
            var y = Mathf.RoundToInt(world.y);
            ApplyAt(x, y);
        }

        private void ApplyAt(int x, int y)
        {
            if (_tool is EditTool.Plant or EditTool.Roadside or EditTool.Fence or EditTool.Building)
            {
                if (!TownCraftRules.CanPlace(_state, _placementCategory, x, y, out var reason))
                {
                    _message = reason;
                    return;
                }
                var asset = _placementAsset;
                if (_placementCategory == PlacementCategory.Building)
                {
                    var house = TownCraftCatalog.Houses[_houseIndex];
                    _state.selectedHouseId = house.Id;
                    asset = house.ResourceName;
                    _state.placements.RemoveAll(p => p.id == "home");
                }
                _state.placements.Add(new TownPlacement
                {
                    id = _placementCategory == PlacementCategory.Building ? "home" : Guid.NewGuid().ToString("N"),
                    assetId = asset, category = _placementCategory, x = x, y = y
                });
                _message = _placementCategory == PlacementCategory.Building ? "わたしの おうちを おいたよ！" : "おけたよ！";
            }
            else
            {
                TownCraftRules.ApplyTool(_state, _tool, x, y);
                _message = "まちが かわったよ！";
            }
            TownCraftStore.Save(_state);
            _world.Render(_state);
        }

        private void OnGUI()
        {
            EnsureStyles();
            GUI.Box(new Rect(8, 8, Screen.width - 16, 108), GUIContent.none, _panel);
            GUILayout.BeginArea(new Rect(18, 14, Screen.width - 36, 96));
            GUILayout.BeginHorizontal();
            ToolButton("じめん", EditTool.Ground);
            ToolButton("みち", EditTool.Road);
            ToolButton("かわ", EditTool.Water);
            ToolButton("たかく", EditTool.Raise);
            ToolButton("ひくく", EditTool.Lower);
            ToolButton("けす", EditTool.Erase);
            ToolButton("しょくぶつ", EditTool.Plant, PlacementCategory.Vegetation, "tree_round");
            ToolButton("みちの そば", EditTool.Roadside, PlacementCategory.Roadside, "streetlamp_green_spritecook");
            ToolButton("さく", EditTool.Fence, PlacementCategory.Boundary, "fence_straight");
            ToolButton("おうち", EditTool.Building, PlacementCategory.Building, TownCraftCatalog.Houses[_houseIndex].ResourceName);
            GUILayout.EndHorizontal();
            GUILayout.Label(_message, _label);
            GUILayout.EndArea();

            GUI.Box(new Rect(8, Screen.height - 138, Screen.width - 16, 130), GUIContent.none, _panel);
            GUILayout.BeginArea(new Rect(18, Screen.height - 132, Screen.width - 36, 118));
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("◀ おうち", _button, GUILayout.Width(112))) ChangeHouse(-1);
            GUILayout.Label(TownCraftCatalog.Houses[_houseIndex].DisplayName, _label, GUILayout.Width(240));
            if (GUILayout.Button("おうち ▶", _button, GUILayout.Width(112))) ChangeHouse(1);
            if (GUILayout.Button($"テーマ：{ThemeName(_state.theme)}", _button, GUILayout.Width(170))) ChangeTheme();
            GUILayout.FlexibleSpace();
            GUILayout.Label($"ざいりょう {_state.inventory.materials}　ひらめき {_state.inventory.ideas}", _label);
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            if (GUILayout.Button($"じめん：{TerrainName(_state.terrainArt)}", _button, GUILayout.Width(170))) ChangeTerrainArt();
            if (GUILayout.Button("おへやへ", _button, GUILayout.Width(140))) _message = "わたしの おへやへ つなぐ いりぐち";
            if (GUILayout.Button("ずかん", _button, GUILayout.Width(120))) _message = "ずかんを ひらく いりぐち";
            GUILayout.Label("おうちの なかで かぐを かえたり ずかんを よめるよ", _label);
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        private void ToolButton(string text, EditTool tool, PlacementCategory category = PlacementCategory.Vegetation, string asset = "")
        {
            var old = GUI.backgroundColor;
            if (_tool == tool) GUI.backgroundColor = new Color(1f, 0.82f, 0.35f);
            if (GUILayout.Button(text, _button, GUILayout.Height(44)))
            {
                _tool = tool;
                _placementCategory = category;
                if (!string.IsNullOrEmpty(asset)) _placementAsset = asset;
                _message = $"{text}を えらんだよ";
            }
            GUI.backgroundColor = old;
        }

        private void ChangeHouse(int amount)
        {
            _houseIndex = (_houseIndex + amount + TownCraftCatalog.Houses.Length) % TownCraftCatalog.Houses.Length;
            _placementAsset = TownCraftCatalog.Houses[_houseIndex].ResourceName;
            _message = $"{TownCraftCatalog.Houses[_houseIndex].DisplayName}を えらんだよ";
        }

        private void ChangeTheme()
        {
            _state.theme = (TownTheme)(((int)_state.theme + 1) % 3);
            _message = $"{ThemeName(_state.theme)}の えに きりかえたよ";
            TownCraftStore.Save(_state);
            _world.Render(_state);
        }

        private void ChangeTerrainArt()
        {
            _state.terrainArt = (TerrainArtVariant)(((int)_state.terrainArt + 1) % 3);
            _message = $"{TerrainName(_state.terrainArt)}の じめんに したよ";
            TownCraftStore.Save(_state);
            _world.Render(_state);
        }

        private static string ThemeName(TownTheme theme) => theme switch
        {
            TownTheme.Modern => "まち",
            TownTheme.Future => "みらい",
            _ => "いなか"
        };

        private static string TerrainName(TerrainArtVariant variant) => variant switch
        {
            TerrainArtVariant.SpriteCookRich => "にぎやか",
            TerrainArtVariant.SpriteCookRestrained => "すっきり",
            _ => "もとのえ"
        };

        private void EnsureStyles()
        {
            if (_button != null) return;
            _button = new GUIStyle(GUI.skin.button) { fontSize = 19, fontStyle = FontStyle.Bold, padding = new RectOffset(10, 10, 6, 6) };
            _label = new GUIStyle(GUI.skin.label) { fontSize = 20, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleLeft, normal = { textColor = new Color(0.22f, 0.12f, 0.05f) } };
            _panelTexture = new Texture2D(1, 1);
            _panelTexture.SetPixel(0, 0, new Color(1f, 0.96f, 0.82f, 0.94f));
            _panelTexture.Apply();
            _panel = new GUIStyle(GUI.skin.box) { normal = { background = _panelTexture } };
        }
    }
}
