using UnityEditor;
using UnityEngine;

namespace Pono.TownCraft.Editor
{
    public sealed class TownCraftBuilderWindow : EditorWindow
    {
        [MenuItem("Pono/TownCraft/Town Builder")]
        public static void Open()
        {
            var window = GetWindow<TownCraftBuilderWindow>("まちづくり");
            window.minSize = new Vector2(280, 440);
            window.Show();
        }

        private void OnGUI()
        {
            GUILayout.Label("TownCraft まちづくり", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "1.「編集シーンを開く」\n2. 下のレイヤーを選ぶ\n3. Window > 2D > Tile Palette で素材を選ぶ\n4. Scene画面の白い1マスをクリックして塗る",
                MessageType.Info);

            if (GUILayout.Button("編集シーンを開く", GUILayout.Height(36)))
                TownCraftTilemapSetup.OpenWorkspace();
            if (GUILayout.Button("素材・パレットを作り直す", GUILayout.Height(28)))
                TownCraftTilemapSetup.RebuildWorkspace();

            GUILayout.Space(10);
            GUILayout.Label("塗る場所を選ぶ", EditorStyles.boldLabel);
            foreach (var layer in TownCraftTilemapSetup.LayerNames)
                if (GUILayout.Button(LayerLabel(layer), GUILayout.Height(30)))
                    TownCraftTilemapSetup.SelectLayer(layer);

            GUILayout.Space(8);
            EditorGUILayout.HelpBox(
                "道・川は向きを選びません。同じRule Tileを隣のマスへ塗ると自動でつながります。家、街灯、木、柵は必ず専用レイヤーへ置きます。",
                MessageType.None);
        }

        private static string LayerLabel(string layer) => layer switch
        {
            "Ground" => "じめん",
            "Elevation" => "だんさ",
            "Road" => "みち",
            "Water" => "かわ",
            "Buildings" => "たてもの",
            "Roadside" => "みちの そば",
            "Vegetation" => "しょくぶつ",
            "Boundary" => "さく・もん",
            "Waterside" => "みずべ",
            _ => layer
        };
    }
}
