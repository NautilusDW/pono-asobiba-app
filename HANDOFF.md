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

なし。

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
