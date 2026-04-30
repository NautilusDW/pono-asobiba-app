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
- 2026-04-30 ・Codex が `quizland/index.html` の 21:9 / 16:9 セーフエリアCSSを再調整。`game-shell` を `16:9` の実寸箱に固定し、`header` / `hud` も生成フレーム画像の比率 (`780x291`, `1879x291`) に合わせて幅と aspect-ratio を指定。さらに `max-width: 1180px` で stage を 1 カラムに落としていた条件を `900px` へ縮小し、iPad 横画面で問題パネルと回答パネルが上下に崩れないようにした。(by Codex)
- 2026-04-30 ・Codex が `quizland/index.html` の iPad 横画面崩れを追加修正。前回の画像実寸比固定では `header` と `hud` が縦方向を取りすぎたため、`game-shell` の行配分を `14% / 12% / 残り` に固定し、横画面では `header` / `hud` をその高さへ強制的に収める override を追加。`answer-guide` と `choices` も高さ固定を外し、問題エリア内に収まるように圧縮。(by Codex)
- 2026-04-30 ・Codex が `quizland/index.html` の iPad 横レイアウトをさらに再調整。上部2段の生成フレームがまだ高さを取りすぎていたため、`game-shell` の縦配分を `9% / 8% / 残り` に再圧縮し、タイトル札を `34%` 幅、HUDを `88%` 幅まで縮小。回答ガイド、問題帯、選択肢枠も横画面 override 内で薄くし、問題ボードと回答4択が 16:9 内に収まりやすい比率に変更。(by Codex)
- 2026-04-30 — sw.js CACHE_VERSION 552 → 553 バンプ + Codex の上記 quizland 再調整を commit & push (by Claude)
- 2026-04-30 ・Codex が `quizland/index.html` のフクロウ博士問題画面を追加修正。上部タイトル/HUD、問題枠、選択肢枠で生成画像を `100% 100%` 背景として潰していた指定をやめ、`border-image` と紙背景に分離して縦横比崩れを抑制。横画面では stage を `1.25fr / 1fr` に戻して選択肢側を拡大し、左の問題枠は chip と問題文を同じ上段に収めて、問題ボードが縦に大きく使えるように変更。未プッシュ。(by Codex)
- 2026-04-30 ・Codex が `quizland/index.html` の枠画像指定をさらに修正。`border-image` shorthand と `stretch` を廃止し、`border-image-source/slice/width/repeat` の個別指定 + `border-image-repeat: repeat` に変更。Safari/iPad/スマホで shorthand + `clamp()` が不安定になる可能性と、辺画像が伸びる問題を避けるため。Chrome/Edge headlessで実機相当スクリーンショット取得を試したが、この環境では両方とも exit code 13 で起動不可。代替として `rg` で `ui_*` 画像が `background: ... 100% 100%` や `stretch` 指定に残っていないことを静的確認済み。(by Codex)
- 2026-04-30 — sw.js CACHE_VERSION 553 → 554 バンプ (Codex の frame stretching 防止改修 `f59a9cc` 反映) (by Claude)
- 2026-04-30 ・Codex が `quizland/index.html` のフクロウ博士問題画面フレームを再調整。`border-image-repeat` で葉・どんぐり装飾がタイル状に繰り返され、装飾サイズと密度がばらついていたため、`ui_*_frame.png` の9-slice流用をやめ、ヘッダー/HUD/問題枠/回答枠を同じ木目風CSSフレームに統一。問題チップが左下へ落ちる副作用も修正し、横画面では問題チップを上段左、問題文を上段中央、問題ボードを下段全幅に固定。(by Codex)
- 2026-04-30 — sw.js CACHE_VERSION 554 → 555 バンプ + Codex の上記木目風CSSフレーム統一改修を commit & push (by Claude)
- 2026-04-30 ・Codex が `quizland/index.html` のフクロウ博士問題画面をCSS-firstテンプレート方式へ再設計。生成画像に合わせて文字を後乗せするのをやめ、16:9安全領域内でタイトル札/HUD/問題欄/回答欄/ヒント/4択/注意書きの位置をCSS Gridで先に固定。`question-panel` は `chip/question/board`、`answer-panel` は `guide/choices/note` のgrid-areaでテキスト位置を明示。1181px以上の旧レイアウトoverrideも削除し、後から同じ矩形サイズで生成画像を差し替えられる構造に変更。(by Codex)
- 2026-04-30 — sw.js CACHE_VERSION 555 → 556 バンプ + Codex の上記 CSS-first テンプレート再設計を commit & push (by Claude)
- 2026-04-30 ・Codex が `quizland/index.html` のフクロウ博士問題画面を参考イメージ寄せで再配置。上段をロゴだけの札から、フクロウ博士アイコン + タイトルロゴ + `1/5` + 進捗ドットを含む横長バーへ変更し、右上は「タイトル」「おしらせ」「せってい」の操作ボックスに整理。問題チップと冗長な「こたえをえらぼう」説明文は非表示にし、左は問題文カード + 問題ボード、右は4択ボード + 短いヒント + フクロウ博士の構成へ寄せた。(by Codex)
- 2026-05-01 — sw.js CACHE_VERSION 556 → 557 バンプ + Codex の上記参考イメージ寄せ再配置を commit & push (by Claude)
- 2026-05-01 ・Codex が `quizland/index.html` のフクロウ博士問題画面を横向き固定前提で再調整。`max-width: 900px/760px` の縦・狭幅用1カラムレイアウトを削除し、縦持ちは既存の「よこむきにしてね」オーバーレイのみ表示する運用に統一。左上フクロウ博士は全身containではなく顔寄りクロップに変更し、ロゴは高さ基準でバー内に収めるよう修正。右4択の最小幅を下げ、問題文の日本語が1文字ずつ割れないようにし、図形/色チップ/数アイテムの最小サイズも小さい横画面で切れない値へ圧縮。Chrome headlessで `844x390` スマホ横、`1194x834` iPad横、`390x844` 縦向きオーバーレイを一時プレビューHTML経由で確認済み。(by Codex)
- 2026-05-01 — sw.js CACHE_VERSION 557 → 558 バンプ (Codex の `7e922a0` 横向き固定再調整反映) (by Claude)
- 2026-05-01 ・Codex が `quizland/index.html` の上段バーを更にスリム化。 `top-left bar 1250x104 → 1300x78`、 `top-right controls 330x104 → 280x78`、 左 panel `936x760 → 1000x790`、 右 panel `646x760 → 560x790` に再配分し、 `header-owl` / ロゴ / `hud-label` / paddings / gap / border-radius を全て圧縮。 上 9.2% / 残り のグリッドで上段が縦を取りすぎないよう調整。 (by Codex)
- 2026-05-01 — sw.js CACHE_VERSION 558 → 559 バンプ + Codex の上記上段バー再スリム化 commit & push (by Claude)
- 2026-05-01 ・Codex が `quizland/index.html` のフクロウ博士問題画面を、枠より中身優先で再調整。左/右の配分を `64fr / 34fr` にして問題側を広げ、問題ラベルを横長化、問題ボードの内側余白と枠を圧縮。色チップ・数アイテム・図形を拡大し、4択は「図の下に文字」の縦積みへ変更、下部の冗長なヒント帯は非表示。右下フクロウも拡大しつつ、小さい横画面ではチップ切れ・文字割れ・フクロウ重なりを抑える max-height 500px 用補正を追加。Chrome headless で `1194x834` / `844x390` の一時プレビューを確認済み。 (by Codex)
- 2026-05-01 — sw.js CACHE_VERSION 559 → 560 バンプ (Codex の `40000f3` 中身優先再調整 64fr/34fr 反映) (by Claude)
- 2026-05-01 ・Codex が `quizland/index.html` の上記調整をPCスクショ指摘に合わせて再修正。前回は内側拡大に引っ張られて外枠まで大きく残っていたため、ヘッダー左バーを `980px → 700px` に短縮し、問題パネルを `82%` 高、4択パネルを `72%` 高へ縮小。右4択はカード外枠を小さくしつつ色チップ/文字は大きめのまま維持、右下フクロウはパネル外側へ逃がして選択肢への食い込みを軽減。PC相当 `1624x913` とスマホ横 `844x390` をChrome headlessで確認済み。sw.js CACHE_VERSION バンプは未対応なので Claude 側で要実施。 (by Codex)
