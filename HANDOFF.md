# HANDOFF — Claude ⇄ Codex 申し送りノート

> このファイルは Claude Code と OpenAI Codex の **共有メモ帳** です。
> 同じ説明をユーザーから 2 回されないように、 一方の AI が
> やったこと / 次に他方にお願いしたいこと を **ここに書いて受け渡す**。
>
> - **作業開始時**: 必ず本ファイルを最初に読む (AGENTS.md §4 ルール)
> - **作業完了時**: 「Active」 のチェックを付けて 「Done」 に移動 + 1 行サマリ
> - **新しい依頼を受けた時**: 「Active」 に追記する
> - エントリは作業者を `(by Claude)` / `(by Codex)` で明記
> - 古いエントリ (3 日以上前の Done) は気付いた方が削除して衛生を保つ

---

## Active (進行中 / 未着手)

- [ ] **タイトル画面 3 ゲーム改修** (担当: Codex / 依頼日 2026-04-29、 ユーザー訂正反映済み)
  
  ### 1. パズル (`puzzle/index.html`) — 縦長レイアウト
  - **重要**: パズルのタイトル画面は他ゲームと違って **9:16 縦長デザイン**。 ユーザーが新 BG を縦長サイズで作成済み。
  - **新背景画像**: `assets/images/puzzle/title_back2.jpg` (1130×2000, 607KB) ← 既に Claude が配置済み
  - **既存横長背景**: `assets/images/puzzle/title_back.jpg` (1600×685) ← 残してあるが、 今回の改修では使わない
  - **ロゴ**: `assets/images/puzzle/title_logo.png` (透過 PNG、 既存)
  - **配置指示**: 縦長 BG の **「上の森が映っている場所ぐらい」** にタイトルロゴを重ねる (BG2 の上 1/3 〜 半分くらいまでの範囲)
  - **「タップしてスタート」ボタン**: ロゴの直下に配置
  
  ### 2. 音タッチ (`oto/index.html`) — 右寄せ
  - **背景 / ロゴは現状のまま**: `assets/images/oto/title_back.jpg` + `assets/images/oto/title_logo.png`
  - **ロゴ位置**: 画面**右側**に寄せる
  - **「タップしてスタート」ボタン**: ロゴの直下に配置
  
  ### 3. お弁当 (`bento/index.html`) — 右寄せ ★訂正で追加
  - **背景 / ロゴは現状のまま**: `assets/images/bento/title_back.jpg` + `assets/images/bento/title_logo.png`
  - **ロゴ位置**: 画面**右側**に寄せる
  - **「タップしてスタート」ボタン**: ロゴの直下に配置
  - **⚠ 衝突注意**: `bento/index.html` の **`#title-screen` セクション (上部のロゴ表示部) のみ** を改修すること。 ゲーム本体 (食材ロジック / 評価 / 完成画面 / NPC 依頼者モード) は Claude が別途 NPC モード追加で改修予定なので **触らないでください**。 物理的にはファイル上部の `#title-screen` 関連 CSS / 該当 HTML / そのクリックハンドラ周辺だけ。
  
  ### 共通の注意
  - 「フクロウばかせのなぞなぞ」 「こだまのもりのこえさがし」 「あつめよう！ポノのもりのずかん」 「ポノとランタンのめいろ」 は対象外
  - 完成後は Claude に sw.js CACHE_VERSION バンプ依頼 (= ユーザーから「バンプして」 と来たら Claude が対応)

---

## Recent (Done — 古い順に削除)

- 2026-04-29 — HANDOFF.md / AGENTS.md §4.7 を整備して運用開始 (by Claude)
- 2026-04-29 — oto / bento / puzzle のタイトル画面合成 (背景 × 透過ロゴ) 完了 (by Codex, commits `eafce16` / `bbb0504`)
- 2026-04-29 — sw.js CACHE_VERSION 532 → 533 (oto ロゴ alpha 再取込のため) (by Claude, commit `d62d47a`)

---

## 書き方ガイド (例)

```md
## Active

- [ ] **〇〇 を実装** (担当: Codex)
  - 背景 + ロゴを `assets/images/{game}/title_back.jpg` × `title_logo.png` で合成
  - 完了したら sw.js CACHE_VERSION バンプを Claude に依頼
- [ ] **〇〇 を直す** (担当: Claude)
  - 〇〇のロジックを修正
  - 終わったらここをチェック → Done に移動
```

---

> **依頼テンプレート (ユーザー向け)**
> - 「Claude、 〇〇 して、 ハンドオフに書いといて」 → 詳細は HANDOFF.md に書かれる
> - 「Codex、 ハンドオフ通り作業して」 → Codex は AGENTS.md ルールで自動的に HANDOFF.md を読む
