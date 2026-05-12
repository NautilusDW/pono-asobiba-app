---
name: ずかん 調査画面 背景バリアント (1 エリア最大 5 種)
description: 調査画面で同じエリアの背景画像を v1〜v5 で切替できる機能。zukan-data.js の spot.fieldBgVariants 配列 + 投資画面エディタのドロップダウン UI
type: feature
---

# ずかん 調査画面 背景バリアント切替 (sw v942, 2026-05-11 / 2026-05-12 拡張)

## 目的

1 エリアあたり**任意枚数**の背景画像 (シーン違い) を持てるようにして、 同じスポットで複数のシーンを編集・プレイ可能にする。 同一エリア内で背景だけ差し替え、 ホットスポット / 隠れパーツ / window-frame 等のレイアウトは共有 (= saved-layout.json は全 variant 共通)。

当初は length=5 固定だったが、 v942 で投資画面エディタの UI を動的 option 生成 (`buildVariantOptions()`) に変更し、 `fieldBgVariants.length` が任意の値でも option が自動構築されるようになった。

## 現在の variant 登録状況 (2026-05-12)

| エリア | variant 数 | 内訳 |
|---|---|---|
| **flower_path** | **9 (v1〜v9)** | v1 = 既存、 v2〜v9 = 2026-05-11 に 16:9 PNG 8 枚を新規追加 |
| mushroom_forest | 1 + 4 placeholder (length=5) | v1 のみ実在、 v2〜v5 は null |
| sunlit_forest | 1 + 4 placeholder (length=5) | v1 のみ実在 (規約外名: leaf_glow_forest_field_16x9.png)、 v2〜v5 は null |
| dew_pond | 1 + 4 placeholder (length=5) | v1 のみ実在、 v2〜v5 は null |

他エリアも今後 flower_path と同様に追加予定 (現状 length=5 を確保するのみ)。

## スキーマ (zukan/data/zukan-data.js)

各 spot に `fieldBgVariants` (optional, **任意 length** 配列) を追加。 既存 `fieldBg` (string) は **温存** (v1 と等価扱い、 後方互換のため削除しない)。

```js
{
  fieldBg: "../assets/zukan/search/flower_path_field_16x9.png",      // 既存 (v1 と等価)
  fieldBgVariants: [
    "../assets/zukan/search/flower_path_field_16x9.png",              // v1 = 既存ファイル
    "../assets/zukan/search/flower_path_field_16x9_v2.png",           // v2 (実在)
    "../assets/zukan/search/flower_path_field_16x9_v3.png",           // v3 (実在)
    ...                                                                // v4〜v9 (実在)
    null                                                               // null = 未生成 (UI で disabled)
  ],
  ...
}
```

- `null` = 「未生成」スロット (UI で disabled+grey 表示)
- 旧コードが `spot.fieldBg` (string) だけを見る場合も無事継続動作
- 4 エリアすべて (flower_path / mushroom_forest / sunlit_forest / dew_pond) に追加済み
- **注意**: sunlit_forest の v1 ファイル名は既存命名 `leaf_glow_forest_field_16x9.png` を温存 (規約と異なるが既存資産を壊さないため)。 v2〜v5 は `sunlit_forest_field_16x9_v<N>.png` 規約に従う
- **flower_path だけ length=9 まで拡張済み** (2026-05-11)、 他 3 エリアは length=5 placeholder のまま

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

ツールバー (`.zk-inv-toolbar`) の `<select id="zk-bg-variant">` は **option を動的生成** (v942 以降):

```html
<select id="zk-bg-variant"
        title="同じエリアの背景画像を v1〜vN で切替 (レイアウトは共有)。 option は fieldBgVariants.length から動的生成">
  <!-- option は IIFE 内 buildVariantOptions() で動的生成 -->
</select>
```

```js
function buildVariantOptions(variants) {
  if (!sel) return;
  sel.innerHTML = '';
  variants.forEach(function (url, idx) {
    var opt = document.createElement('option');
    opt.value = String(idx);
    if (idx === 0) {
      opt.textContent = url ? 'v1 (現在のメイン)' : 'v1 (未生成)';
    } else {
      opt.textContent = url ? ('v' + (idx + 1)) : ('v' + (idx + 1) + ' (未生成)');
    }
    if (!url) opt.disabled = true;
    sel.appendChild(opt);
  });
}
```

挙動:
- 起動時、 `zukan-data.js` の `fieldBgVariants` (任意 length) を読んで option を構築
- 実在チェック (`new Image()` で HTTP probe) を `variants.length` 分回す (旧 5 固定 → 動的)
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

- 940 → 941: 背景バリアント機能初投入
- 941 → 942: flower_path に v2〜v9 を 8 枚追加 + UI を動的 option 生成 (length 任意) に変更 (2026-05-11)
- 942 → 943: `.zk-inv-toolbar` をメインツールバーと被らないよう右下端固定 (bottom:16px / z-index:9500 / flex-wrap) に変更 (2026-05-11)
- 943 → 944: `.zk-inv-toolbar` を左上寄り (top:120px / left:16px) に移動。 右側は layout-editor の常駐パネル (.numeric-panel / .le-list-panel) と、 左下は help-note と競合するため。 一時的に金色 2px ボーダー + glow で視認性強化。 起動時 console.log で visibility 検証ロジック追加 (2026-05-11)
- 944 → 945: `.le-ruler` に pointer-events: none を追加し、 ヘッダードラッグの妨害を解消
- 945 → 946: 投資画面エディタの variant probe/apply で path 解決バグ修正。 zukan-data.js は ../ (1階層) パスだが、 投資画面は 3 階層下にあるため toAbsolute() で / 起点に変換
- 946 → 947: 投資画面エディタに 📥 差し替えボタン追加。 現在選択中 variant の画像を GitHub API 経由で差し替え。
- 948 → 949: applyRotate に「img も bg-image も無い要素は自身を translate+rotate 合成で回す」 第 3 分岐を追加。 .hint-panel 等の複合パネルが回転するように。 LayoutEditor の transform イベントで再適用。
- 949 → 950: 90°回転バグ診断のため rotate90 / applyRotate / getSelectedSingle に verbose console.log 追加。 ユーザーが Console を見れば選択要素・実行パス・transform 適用結果が即可視化される。 原因特定後にログ削減予定。
- 950 → 951: .zk-inv-toolbar の mousedown を capture-phase で stopPropagation。 layout-editor.js bgHandler が selection クリアするのを防止。 これで 90°回転・100% リセット・比率固定切替が選択中要素に対して動くようになる。
