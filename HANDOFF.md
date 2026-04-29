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

- 2026-04-29 — sw.js CACHE_VERSION 547 → 548 バンプ (Codex の wordmatch 大規模リファクタ + quiz-sound 整理 + 21:9 崩れ修正反映、 commit `c0896b2`) (by Claude)
- 2026-04-29 — Codex が wordmatch / quiz-sound / quizland / play.html を一括改修 (commit `c0896b2`)。 wordmatch は内部ロジックを `forestdex.css` (789 行) + `forestdex.js` (745 行) に分離してインライン量を 1991 行削減、 関連フレーム画像 2 枚 (`forestdex_collection_frame.png` 2.7MB / `forestdex_gameplay_frame.png` 2.6MB) を `assets/images/wordmatch/` に追加 (※ 2MB 警告閾値超え、 後で auto_optimize_image での圧縮検討推奨)。 quiz-sound も同方向のスリム化 (985 行削除)。 quizland は +182 行で 21:9 崩れ修正 (game-shell 高さ固定、 question-panel / stage-area / choices / 図形・絵文字サイズ圧縮)。 play.html は +14 行の細部調整。 (by Codex / Recent への記録 by Claude)
- 2026-04-29 — `quizland/index.html` の 21:9 崩れを Codex が修正。広いランドスケープ幅で `game-shell` を viewport 内高さに固定し、`question-panel` / `stage-area` / `choices` / 図形・絵文字サイズを圧縮して縦スクロール風レイアウトを解消。`sw.js` の CACHE_VERSION バンプは未対応なので Claude 側で要実施。 (by Codex)
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
- 2026-04-29 ・Codex が `wordmatch/forestdex.css` を再調整。生成済みフレームに対して CSS の白箱・帯・補助背景を極力削除し、HUD / 図鑑欄 / 4択 / リザルト欄を「文字と最小限の当たり判定だけ重ねる」方向へ変更。特に `memo-ribbon` は下部横長帯から右端の縦メモ枠へ移設し、`collection-card` / `detail-row` / `page-row` / `hud-chip` の背景を透明化して、生成画像の枠と二重にならないようにした。(by Codex)
