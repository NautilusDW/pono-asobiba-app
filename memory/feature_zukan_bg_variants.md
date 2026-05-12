---
name: ずかん 調査画面 背景バリアント (1 エリア最大 5 種)
description: 調査画面で同じエリアの背景画像を v1〜v5 で切替できる機能。zukan-data.js の spot.fieldBgVariants 配列 + 投資画面エディタのドロップダウン UI
type: feature
---

# ずかん 調査画面 背景バリアント切替 (sw v941, 2026-05-11)

## 目的

1 エリアあたり最大 5 種類の背景画像 (シーン違い) を持てるようにして、 同じスポットで複数のシーンを編集・プレイ可能にする。 同一エリア内で背景だけ差し替え、 ホットスポット / 隠れパーツ / window-frame 等のレイアウトは共有 (= saved-layout.json は全 variant 共通)。

## スキーマ (zukan/data/zukan-data.js)

各 spot に `fieldBgVariants` (optional, length 5 配列) を追加。 既存 `fieldBg` (string) は **温存** (v1 と等価扱い、 後方互換のため削除しない)。

```js
{
  fieldBg: "../assets/zukan/search/flower_path_field_16x9.png",   // 既存 (v1 と等価)
  fieldBgVariants: [
    "../assets/zukan/search/flower_path_field_16x9.png",          // v1 = 既存ファイル
    null,                                                          // v2 (未生成)
    null,                                                          // v3 (未生成)
    null,                                                          // v4 (未生成)
    null                                                           // v5 (未生成)
  ],
  ...
}
```

- `null` = 「未生成」スロット (UI で disabled+grey 表示)
- 旧コードが `spot.fieldBg` (string) だけを見る場合も無事継続動作
- 4 エリアすべて (flower_path / mushroom_forest / sunlit_forest / dew_pond) に追加済み
- **注意**: sunlit_forest の v1 ファイル名は既存命名 `leaf_glow_forest_field_16x9.png` を温存 (規約と異なるが既存資産を壊さないため)。 v2〜v5 は `sunlit_forest_field_16x9_v<N>.png` 規約に従う

## 命名規則

`<area>_field_16x9_v<N>.png` (v1 は既存ファイル名のまま、 v2〜v5 が新規)

| エリア | v1 (既存ファイル名) | v2-v5 (新規ファイル名) |
|---|---|---|
| flower_path | `flower_path_field_16x9.png` | `flower_path_field_16x9_v2.png` 〜 `_v5.png` |
| mushroom_forest | `mushroom_forest_field_16x9.png` | `mushroom_forest_field_16x9_v2.png` 〜 `_v5.png` |
| sunlit_forest | `leaf_glow_forest_field_16x9.png` (規約外) | `sunlit_forest_field_16x9_v2.png` 〜 `_v5.png` |
| dew_pond | `dew_pond_field_16x9.png` | `dew_pond_field_16x9_v2.png` 〜 `_v5.png` |

配置先: `assets/zukan/search/`

## 投入運用 (素材生成 → 反映)

1. ユーザーが `D:\ポノのおへや\Zukan\asset\BG\<area>\` で 16:9 変換した PNG を準備
2. Claude エージェントが `assets/zukan/search/<area>_field_16x9_v<N>.png` にコピー配置
3. `zukan/data/zukan-data.js` の対応する `fieldBgVariants[N-1]` を `null` から実パスに置換
4. sw.js の CACHE_VERSION を 1 段階 bump
5. ローカルで `zukan/preview/investigation/?edit=1` を開き、 ツールバーの「🌅 背景バリアント」 select で v2〜v5 に切替できることを確認

## UI (zukan/preview/investigation/index.html)

ツールバー (`.zk-inv-toolbar`) に HTML 直書きで追加:

```html
<span class="zk-inv-label">🌅 背景バリアント</span>
<select id="zk-bg-variant">
  <option value="0">v1 (現在のメイン)</option>
  <option value="1">v2 (未生成)</option>
  <option value="2">v3 (未生成)</option>
  <option value="3">v4 (未生成)</option>
  <option value="4">v5 (未生成)</option>
</select>
```

挙動:
- 起動時、 `zukan-data.js` の `fieldBgVariants` を読んで実在チェック (`new Image()` で HTTP probe)
- `null` または 404 のスロットは `disabled` + 「(未生成)」 ラベルに降格
- 切替時は `.field-bg > img` の `src` を差し替えるだけ (レイアウト保持)
- デフォルトは v1

デバッグログ:
- 起動時: `[zk-bg] variant UI bound, available=<count>, default=v1`
- 切替時: `[zk-bg] switched to v<N>, src=<url>`
- 404 検出時: `[zk-bg] v<N> not found (404), marked as 未生成`

## 本番ずかん画面 (zukan/index.html) の後方互換

`currentSpot.fieldBg` 参照を `currentSpot.fieldBgVariants?.[0] || currentSpot.fieldBg` に変更 (`renderQuestion()` 内)。 variant 配列がある時は v1 (index 0) を採用、 無ければ既存 `fieldBg` にフォールバック。 旧 saved-layout も無傷。

## saved-layout の方針 (Phase 1: 共有モード)

**全 variant で同じレイアウト (= saved-layout.json) を共有**。 背景だけ差し替わる仕様。 既存 `zukan/preview/investigation/saved-layout.json` はノータッチ。

## 将来課題

- **variant ごとのレイアウト独立化**: ユーザーが variant ごとに別の hotspot/hidden-part/window-frame 配置を保持したい場合、 `saved-layout.json` のキーに `@vN` suffix を付ける (例: `flower_path_field_16x9.png@v2` の userbox set)。 quizland の per-question layout (whitelist + `@${qid}` suffix) と同じパターンが応用可能。 ([feature_quizland_per_question_layout.md](feature_quizland_per_question_layout.md) 参照)
- **エリア切替**: investigation editor は現状 flower_path 固定。 URL `?area=<id>` で動的化すれば 1 つの editor で 4 エリアの variant を切替できる
- **本番側 variant 選択 UI**: 現状は v1 固定。 デバッグメニューや「シーン切替」 UI で variant 選択を露出
- **runtime キャッシュ**: variant ごとに HTTP probe が走るのでローカル sessionStorage キャッシュ化

## sw.js CACHE_VERSION 履歴

- 940 → 941: 背景バリアント機能初投入 (このタスク)
