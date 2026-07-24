# TownCraft

Unity 6用の2Dトップダウン町づくりプロトタイプ。メニューは `Pono > TownCraft > Rebuild Scene`、検証は `Pono > TownCraft > Verify Assets`。

実行シーンは `Scenes/92_TownCraft.unity`。地形、接続道路・河川、高低差、用途別配置、15種類の「わたしのおうち」、名前表札、保存、町のお願い報酬、テーマ差し替えを含む。

素材は `Content/Resources/TownCraft`、ロジックは `Runtime/Core`、表示は `Runtime/Rendering` に分離している。既存の部屋・図鑑を接続するときは `TownCraftGameController` の `OpenRoom` / `OpenZukan` を実遷移へ置き換える。
# TownCraft Unity Tilemap workflow

TownCraftの町編集はUnity標準のTilemap環境で行います。Playモードの独自クリックUIは編集の正本ではありません。

## 開き方

1. `Pono > TownCraft > Town Builder`
2. `編集シーンを開く`
3. `Window > 2D > Tile Palette`
4. Active Paletteを `TownCraft_Master` にする
5. 専用ウィンドウでレイヤーを選び、Sceneビューへ1マスずつ塗る

道路と川はRule Tileです。向きや回転を手動選択せず、隣のセルへ同じTileを塗ります。

## レイヤー

- Ground
- Elevation
- Road
- Water
- Buildings
- Roadside
- Vegetation
- Boundary
- Waterside

建物、街灯、木、柵などを同じTilemapへ混ぜないでください。
