> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# AGENTS_CLAIMS — 「いま誰が何を触ってるか」 アクティブ・ボード

このファイルは **進行中の編集スコープだけ** を載せる短いボードです。 申し送り履歴・完了報告は [`HANDOFF.md`](./HANDOFF.md) が担当します。 詳細ルールは [AGENTS.md §4.9](./AGENTS.md) を参照。

---

## 使い方 (Claude / Codex / 人間 全員)

### 作業開始時 (新しいバッチを切る瞬間)
1. **このファイルを読む** (Active claims を全部見る)
2. 自分が触りたいパス (ディレクトリ or ファイル) と他者の active claim が **衝突していないか** 確認
3. 衝突あり → ユーザーに 1 行 ping (「○○ と被るけど続行します」 と宣言) → そのまま作業開始 (返答待ちで止まらない)。 自分の claim 行の末尾に `[overlap: <相手の batch ID>]` を付記。 物理衝突 (= 同じ行/関数) は `.git/hooks/pre-push` + `git pull --rebase` で必ず検知されるので、 そこが最後の砦。 ユーザーが明示的に「待って」 と言った時だけ停止
4. 衝突なし → 下の `## Active claims` セクションに **1 行追記** してから編集開始
5. 編集開始の前に `git pull --rebase origin <current-branch>` で最新を取り込む

### 作業終了時 (push が完了した直後)
- 自分の claim 行を **完全削除** して commit (`chore(claims): remove finished claim (no sw)` 等)
- HANDOFF.md には別途完了報告を残す (役割が違うので両方必要)
- 削除し忘れて 4 時間以上残っていたら、 他者が「これゾンビ?」 と ユーザーに確認して削除して OK

### push 直前
- もう一度 `git pull --rebase origin <current-branch>` を実行
- `.git/hooks/pre-push` が「behind なら block」 するので、 block されたら必ず pull --rebase してから再 push (`--no-verify` 禁止)

### claim 同時編集で merge conflict が出たとき

セッション A と B が同タイミングで claim 行を追記して push すると、 `AGENTS_CLAIMS.md` 自体が 3-way merge conflict になることがあります。 **どちらかを捨ててはいけません**。 両者ともまだアクティブな claim だからです。

対応手順:
1. `git pull --rebase origin <current-branch>` で conflict マーク (`<<<<<<<` / `=======` / `>>>>>>>`) が現れる
2. `AGENTS_CLAIMS.md` をエディタで開き、 `## Active claims` 内の **両方の claim 行を保持** (時系列順に並べる)
3. conflict マークを削除
4. `git add AGENTS_CLAIMS.md && git rebase --continue`
5. 再度 push

つまり claim conflict の「勝者・敗者」 は決めず、 **両方を共存** させる運用です。

---

## 行フォーマット

```
- <YYYY-MM-DD HH:MM> - <by Claude | by Codex | by Human> - [batch:NN-topic] - <touch paths (glob OK)> - <one-line goal>
```

例:
```
- 2026-06-27 10:32 - by Claude - [batch:858-puzzle-stage6] - puzzle/**, sw.js - stage6 追加 + sw bump
- 2026-06-27 10:35 - by Codex - [batch:859-lp-shop-copy] - index.html - LP 絵本セクションのコピー差し替え
- 2026-06-27 11:02 - by Human - [batch:860-hand-edit] - assets/ui/** - 画像 alpha 抜き手作業
```

---

## Active claims

<!-- ↓ ここに 1 行ずつ追記。 終わったら自分の行を完全削除。 -->

- 2026-06-27 01:30 - by Claude - [batch:860-data-export-import] - help.html, play.html, common/**, js/**, sw.js - セーブデータ JSON エクスポート/インポート UI 追加 + ヘルプ文言書き直し
- 2026-06-28 09:27 - by Codex - [batch:877-gacha-tray-mask-lower] - play.html, sw.js, AGENTS_CLAIMS.md, HANDOFF.md - ガチャ受け皿マスクが上すぎるため奥壁ラインを下げて再調整 [overlap: batch:860-data-export-import]
- 2026-06-28 13:00 - by Claude - [batch:885-difficulty-label-phase3-fix] - quizland/index.html, puzzle/partner-select.js, bento/index.html - クロスレビュー Critical/High 修正 (quizland「かんたん」UI 露出 / puzzle partner「かんたん」/ bento aria-label hardcode) [overlap: batch:884-maze-water-line-skate]
- 2026-06-28 13:30 - by Claude - [batch:886-difficulty-label-sw-bump-1736] - sw.js, play.html - 難易度ラベル統一 Phase 2+4 fix を v1735→v1736 でバンプ (maze HUD / oto タブ / puzzle album / bento title / quizland UI / partner-select / common/difficulty.js は既登録) [overlap: batch:885-difficulty-label-phase3-fix]
- 2026-06-29 14:18 - by Codex - [batch:911-maze-water-bug-body-collision] - maze/index.html, AGENTS_CLAIMS.md, HANDOFF.md - みずすべりを場所判定ではなく動いているおじゃま虫本体のタイミング判定へ修正 [overlap: batch:909-gacha-mobile-mask-artifact, batch:910-bento-face-food-zones]
- 2026-06-29 09:28 - by Claude - [batch:920-shop-bgm-swap] - assets/audio/honey_bell_shop.mp3, play.html, sw.js, AGENTS_CLAIMS.md - shop BGM を Honey Bell Shop.mp3 に差し替え + sticker-book との兼用解消 + sw v1784
- 2026-06-29 10:34 - by Codex - [batch:937-bento-shared-food-size] - admin/index.html, bento/index.html, src/worker.js, AGENTS_CLAIMS.md, HANDOFF.md - おかず配置エディタで同じ食材のサイズをA/B/C間で共有する [overlap: batch:885-difficulty-label-phase3-fix]
- 2026-06-29 10:34 - by Claude - [batch:921-lp-age-label-upper-limit-removal] - index.html, AGENTS_CLAIMS.md - LP hero CTA 横の推奨年齢 3〜6歳 → 3歳〜 (上限撤廃)
---

## なぜ HANDOFF.md と別ファイルなのか

HANDOFF.md は履歴 (Done エントリ含む) が積み上がるため、 「いまアクティブな claim だけを瞬時に把握する」 用途には不向き。 このボードは **常に短い / 常に最新 / 行は使い捨て** という性質を維持することで、 衝突検出のコストをほぼゼロにする狙い。
