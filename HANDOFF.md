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

- 2026-04-29 — play.html の oto / bento / puzzle カード調整。丸サムネと紙オーバーレイの見せ位置を個別化し、タイトル色を3件ぶん変更。`ポノの` / `ポノと` の助詞だけ小さくする補正を追加。 (by Codex)
- 2026-04-29 — タイトル画面 3 ゲーム改修完了 (puzzle 縦長 BG2 + oto/bento ロゴ右寄せ + ボタン下配置) (by Codex, commit `13739bb`)
- 2026-04-29 — Codex 上書き後の puzzle/title_back2.jpg を再最適化 (1520×2688/1036KB → 1130×2000/608KB)。 Codex は AGENTS.md §5 の `auto_optimize_image.py` を通していなかった (by Claude)
- 2026-04-29 — auto_optimize_image.py の手動モードのデフォルトを「拡張子保持で安全」 に変更。 alpha なし PNG を JPG に rename したい場合のみ `--allow-jpeg-rename` を opt-in する形に変更 (Codex 指摘の透明 PNG 誤変換リスクを排除) (by Claude)
- 2026-04-29 — sw.js CACHE_VERSION 535 → 536 バンプ (Codex タイトル画面改修反映 + 画像再最適化 + スクリプト更新) (by Claude)
- 2026-04-29 — bento NPC 依頼者モード実装完了 (30%確率で動物 6 種から 1 体出現 → 訪問演出 → 完成画面前に NPC 反応 → ポノ反応) + 食材スロット着地時 sparkle 演出追加 + sw.js CACHE_VERSION 534 → 535 バンプ。 タイトル画面部分は触っていないので Codex 改修と非干渉。 (by Claude)

- 2026-04-29 — HANDOFF.md / AGENTS.md §4.7 を整備して運用開始 (by Claude)
- 2026-04-29 — oto / bento / puzzle のタイトル画面合成 (背景 × 透過ロゴ) 完了 (by Codex, commits `eafce16` / `bbb0504`)
- 2026-04-29 — sw.js CACHE_VERSION 532 → 533 (oto ロゴ alpha 再取込のため) (by Claude, commit `d62d47a`)

---

> **依頼テンプレート (ユーザー向け)**
> - 「Claude、 〇〇 して、 ハンドオフに書いといて」 → 詳細は HANDOFF.md に書かれる
> - 「Codex、 ハンドオフ通り作業して」 → Codex は AGENTS.md ルールで自動的に HANDOFF.md を読む
