# 文字書き シンプルモード復活 (Phase 1) — 2026-04-26

## 背景
`writing/index.html` が RPG 化（敵バトル・カゲロウ戦・回想シーン等）されて 15,479 行に肥大化。
RPG 化前の素直な「あ-ん をなぞって練習する」体験を別モードとして復活させたい、という要望。
妖精のデザインだけ現行 RPG と揃えて、応援してくれる感じにする。

## 復活元
- `git show 29a657c:writing/index.html` (805行、2026-03-01 "fix: ポノ位置...")
- これ以降 `8c0e39d` "feat(battle): v265 ピボット" でバトル化開始

## 構成 (Phase 1 で完了した範囲)

### 新規ファイル
- `writing/simple.html` — 805行版を復元 + 妖精常駐 UI を追加
  - 文字書きロジック（HanziWriter / なぞり判定 / マイルストーン演出）はオリジナルのまま流用
  - 上書きしたのは `<title>` のみ
  - 追加: `.cheer-fairy.leefa` / `.cheer-fairy.hinoka` 用 CSS、吹き出し `.fairy-bubble`、`FAIRY_LINES` セリフ辞書、`fairyCheer(type)` ヘルパー

### 既存ファイル変更（最小限）
- `writing/index.html`
  - L5363: タイトル画面に `<button id="titleBtnSimple">🌸 シンプルモード</button>` 追加
  - L15314 付近: `simpleBtn.click → location.href='./simple.html'`（BGM 一旦停止）
- `sw.js`
  - `CACHE_VERSION` 448 → 449（新リソース展開のため）
  - `urls` 配列ナシ・HTML は network-first + no-store なので simple.html はパス追加不要

## 妖精配置
- 左外側 (canvas 左端の外): **リーファ (森)** — `assets/images/characters/pixies/Riefa/riefa_001.png`
- 右下: **ヒノカ (火)** — `assets/images/characters/pixies/Hinoka/hinoka_001.png`
- 両者 `cheerFloat` 3.2-3.6s で上下に揺れる（位相ずらし）
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
