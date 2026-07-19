---
name: 使わないUI要素はデフォルトで最小化・非表示にする
description: ツールの未使用パネル/タブが画面を占有しデッドスペースを作るのをユーザーは強く嫌う。使わないとき=完全非表示が原則。
type: feedback
---

# 使わない UI 要素はデフォルトで最小化・非表示

ユーザーは「使ってないウィンドウは最小の面積に」を**繰り返し**要求している。
今回 (2026-04-27) のクリーンエッジスタジオでも 3 回目以上の指摘。

**Why**: 子ども向け知育アプリのオーサリングツールは画面が縦に詰まりがち。
未使用パネルがデッドスペースとして居座ると、本来見たいパーツ (タイムライン
本体・スプライトカード・プレビュー) が下にスクロールしないと見えず、毎回
の作業ストレスになる。「とりあえず表示しておく」は一見親切だが、UX 的には
逆効果。

**How to apply**: タブ・パネル・モード切替系を作るときは:
1. **デフォルト = 完全非表示** (`display: none`)。ON にしたモードのときだけ表示
2. モード切替 OFF 時に `tab.active` を**確実に外す**: `switchToTab()` 経由で
   片付けるだけでは、CSS の `:not(.mode-on)` ガードを必ず併用して、`.active`
   が残留しても表示されない二重防御にする
3. モード排他: `multi-mode` / `timeline-mode` 等は同時 ON 不可。
   ON にする側のハンドラで他モードを **先に OFF** してから自分を ON にする
4. 未使用時は `flex: 0 0 auto` ではなく `display: none` を選ぶ。
   `flex: 0 0 auto + min-height` でも内容ぶんは確保されてしまう

## やってはいけない実装パターン
- `tab-composite.active` を `display: flex; max-height: 50vh; overflow-y: auto;`
  だけで管理 → モード OFF 時に `.active` が残ると 50vh のデッドスペースが居座る
- 「最小化ボタンで畳む」UI → ユーザーが押す手間を強いる。デフォルトで隠せ

## このプロジェクト固有の注意
- `tools/creature_studio.html` の右パネルは `.split-mode` で上下分割固定:
  - 上 = `#tab-compare` (常時)
  - 下 = `#tab-sprites` (常時)
- それ以外のタブ (`#tab-composite`, `#tab-timeline`) を出すには:
  - `.right-panel.split-mode.<mode-name>` のクラスでレイアウト切替する
  - **必ず** `.right-panel.split-mode:not(.<mode-name>) #tab-<name> { display: none !important; }` も
    書いて、モード OFF 時に確実に消えるようにする
