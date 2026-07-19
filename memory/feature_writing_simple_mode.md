# 文字書き シンプルモード復活 (Phase 1 + UI リデザイン) — 2026-04-26

## 背景
`writing/index.html` が RPG 化（敵バトル・カゲロウ戦・回想シーン等）されて 15,479 行に肥大化。
RPG 化前の素直な「あ-ん をなぞって練習する」体験を別モードとして復活させたい、という要望。
妖精のデザインだけ現行 RPG と揃えて、応援してくれる感じにする。

**追加リクエスト (2026-04-26 同日)**: 古い CSS のレイアウトが横画面でキャンバスが伸びて見づらかった、
背景・色味・フォントを RPG モードと揃えたい、ポノ/ハリネズミなどのキャラ装飾は不要、
画面を **左右分割** にして左側で文字選択 / 右側で大きいキャンバスを使う形に変更したい。

## 復活元
- `git show 29a657c:writing/index.html` (805行、2026-03-01 "fix: ポノ位置...")
- これ以降 `8c0e39d` "feat(battle): v265 ピボット" でバトル化開始

## 構成 (Phase 1 + UI リデザイン後)

### writing/simple.html — RPG テーマで全面リデザイン (2026-04-26)
- 文字書きロジック（HanziWriter / なぞり判定 / マイルストーン演出 / BGM / 連続ストリーク）はオリジナル 805 行版のまま流用
- CSS / DOM レイアウトを完全に書き換え:
  - **カラー変数を RPG モード (`writing/index.html`) と統一**: `--bg #05070f` / `--text #F4E9D0` / `--window-border #F4E9D0` / `--canvas-bg #05070f` / `--primary #FFD36E` / `--secondary #C084FC` 等
  - **背景**: 黒〜紺 radial-gradient + 星空 (RPG モードと同じ)、明るい `BG_03.png` 撤去
  - **フォント**: `DotGothic16` (ドラクエ風ドット) を主、`Zen Maru Gothic` を fallback
  - **「ポノのもじかき」h1 / subtitle 削除** — 上部はメニュー戻るボタン+BGM+ストリーク連続バッジのみ
  - **ポノ装飾 `.pono-deco` を撤去** (DOM/CSS 両方)
  - **左右分割レイアウト** (`.main-split` flex-row):
    - 左: `.side-panel` (clamp(108px, 24vw, 170px)) — `.category-tabs` (ひらがな/カタカナ) + `.char-selector` (2列グリッド縦スクロール、あ-んを縦に選べる)
    - 右: `.trace-area` (flex:1) — 大きいキャンバス (`min(100%, 70vh)`, max 540px) + 下に「けす/おてほん/つぎ」コントロール
  - **キャンバス**: 黒地 + ベージュ枠 + 田の字グリッド、書き取り線は金グロウ (RPG モードと同じ filter)
  - **HanziWriter のカラー**: 金/水色/紫/緑/赤/琥珀の6色ローテに変更（暗背景に映える色味）
  - **char-btn / ctrl-btn**: 暗背景 + ベージュ枠、選択中は金色グロー、達成済みは緑色
  - **妖精位置**: `.cheer-fairy` を `position: fixed` に変更し画面の左下/右下に常駐 (`.leefa` left:8px / `.hinoka` right:8px)。レイアウトの flex ストリームから外して左右分割に干渉しない。吹き出しも fixed。
  - **吹き出しデザイン**: RPG ウィンドウ調 (黒地+ベージュ枠+ドットフォント)
- 既存 ID は維持: `categoryTabs` / `charSelector` / `canvasContainer` / `writerTarget` / `strokeNumbers` / `btnClear` / `btnHint` / `btnNext` / `confettiContainer` / `completionOverlay` / `milestone-modal` / `streak-badge` / `btn-bgm` / `bgm`
- 既存クラス名も維持: `.category-tab[.active]` / `.char-btn[.active|.done]` / `.cheer-fairy.leefa|.hinoka` / `.fairy-bubble.leefa|.hinoka`

### 既存ファイル変更（最小限）
- `writing/index.html`
  - L5363: タイトル画面に `<button id="titleBtnSimple">🌸 シンプルモード</button>` 追加
  - L15314 付近: `simpleBtn.click → location.href='./simple.html'`（BGM 一旦停止）
- `sw.js`
  - `CACHE_VERSION` 448 → 449 → (linter 450) → 451（新リソース展開のため、リデザイン時にもう1度 bump）
  - `urls` 配列ナシ・HTML は network-first + no-store なので simple.html はパス追加不要

## 妖精配置 (リデザイン後)
- 画面左下 (`position: fixed; left:8px; bottom:64px`): **リーファ (森)** — `assets/images/characters/pixies/Riefa/riefa_001.png`
- 画面右下 (`fixed; right:8px; bottom:64px`): **ヒノカ (火)** — `assets/images/characters/pixies/Hinoka/hinoka_001.png`
- 両者 `cheerFloat` 3.2-3.6s で上下に揺れる（位相ずらし）
- 吹き出しは `position: fixed` で各妖精の頭上、RPG ウィンドウ調デザイン
- 横画面/縦画面どちらでも左右分割の本体レイアウトに干渉しない（flex の外）
- セリナ (氷) は今回未配置 — レイアウト的に2体が適正と判断

## セリフ発火ルール
- 起動 1 秒後に `start` 系を1回（その後は文字切替の度に出る）
- `onComplete` (合格) → `success` 系を必ず
- `onMistake` → 4秒に1回まで + 35% 確率で `retry` 系
- ランダム妖精・ランダムセリフ

## Phase 2 で残っている範囲（未実装）
- **行選択 (あ行/か行/...)** — 805 版にはなく、未実装
- **単語フェーズ (1行クリア後の単語練習)** — 805 版にはなく、未実装
  - プラン承認時はユーザー選択に含まれていたが、実装は Phase 1 から分離した
  - 着手判断はユーザーフィードバック後

## 動作確認
1. `python -m http.server 8000` を pono-asobiba-app 直下で起動
2. `http://localhost:8000/writing/` → タイトルに「🌸 シンプルモード」表示
3. クリック → simple.html に遷移、妖精 2 体が常駐し浮遊、合格時にセリフ
4. 「はじめから」「つづきから」（RPG モード）が従来通り動作

## 既知の制約
- 縦画面が狭い時 (max-width: 500px) は妖精サイズを 72px → 58px に縮小、canvas にやや重なる位置に配置
- 妖精画像はキャラ等身大の `_001.png` をそのまま使用（軽量化されたサムネ版は今回未作成）
