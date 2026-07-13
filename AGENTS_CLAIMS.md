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

- 2026-07-13 09:40 - by Codex - [batch:1276-title-stickerbook-pressed-buttons] - tmp/alpha_pending/1276-title-stickerbook-pressed-buttons/**, assets/_PonoSubmarine/Art/UI/StickerBook3D/*pressed*, assets/ui/gacha/*entry*pressed*, assets/ui/title/*pressed*, Prototypes/StickerBookThreeJS/{index.html,styles.css}, play.html, sw.js, tests/**, AGENTS_CLAIMS.md, HANDOFF.md - シールちょう上部の全画像ボタンと、タイトル監査で押下画像がないガチャ／日次チャレンジ／絵本特典へGPT Image 2押下状態を追加。既存押下素材は再利用し、ゲームカードの未発火selectorも修正 [overlap: batch:860-hand-edit, batch:933-haptics-quick-win-phase1, batch:934-sticker-paste-particles, batch:935-paste-particles-v2-rework, batch:tier-v3-phase1]
- 2026-06-28 09:27 - by Codex - [batch:877-gacha-tray-mask-lower] - play.html, sw.js, AGENTS_CLAIMS.md, HANDOFF.md - ガチャ受け皿マスクが上すぎるため奥壁ラインを下げて再調整 [overlap: batch:860-data-export-import]
- 2026-06-28 13:00 - by Claude - [batch:885-difficulty-label-phase3-fix] - quizland/index.html, puzzle/partner-select.js, bento/index.html - クロスレビュー Critical/High 修正 (quizland「かんたん」UI 露出 / puzzle partner「かんたん」/ bento aria-label hardcode) [overlap: batch:884-maze-water-line-skate]
- 2026-06-28 13:30 - by Claude - [batch:886-difficulty-label-sw-bump-1736] - sw.js, play.html - 難易度ラベル統一 Phase 2+4 fix を v1735→v1736 でバンプ (maze HUD / oto タブ / puzzle album / bento title / quizland UI / partner-select / common/difficulty.js は既登録) [overlap: batch:885-difficulty-label-phase3-fix]
- 2026-06-29 14:18 - by Codex - [batch:911-maze-water-bug-body-collision] - maze/index.html, AGENTS_CLAIMS.md, HANDOFF.md - みずすべりを場所判定ではなく動いているおじゃま虫本体のタイミング判定へ修正 [overlap: batch:909-gacha-mobile-mask-artifact, batch:910-bento-face-food-zones]
- 2026-06-29 09:28 - by Claude - [batch:920-shop-bgm-swap] - assets/audio/honey_bell_shop.mp3, play.html, sw.js, AGENTS_CLAIMS.md - shop BGM を Honey Bell Shop.mp3 に差し替え + sticker-book との兼用解消 + sw v1784
- 2026-06-29 10:34 - by Claude - [batch:921-lp-age-label-upper-limit-removal] - index.html, AGENTS_CLAIMS.md - LP hero CTA 横の推奨年齢 3〜6歳 → 3歳〜 (上限撤廃)
- 2026-07-02 12:00 - by Claude - [batch:931-sticker-book-engagement-research-v2] - docs/**, AGENTS_CLAIMS.md - sticker-book engagement research v2 + docs
- 2026-07-02 - by Claude - [batch:932-tray-gray-silhouette-phase1] - tmp/tray_baseline/**, AGENTS_CLAIMS.md - tray gray silhouette 実装 (第一弾)
- 2026-07-02 - by Claude - [batch:933-haptics-quick-win-phase1] - common/haptics.js, Prototypes/StickerBookThreeJS/**, play.html, sw.js, AGENTS_CLAIMS.md - haptics quick win 実装 (触覚 Phase 1)
- 2026-07-02 - by Claude - [batch:934-sticker-paste-particles] - Prototypes/StickerBookThreeJS/**, AGENTS_CLAIMS.md - sticker paste particles (骨格 4 の予告実装)
- 2026-07-02 - by Claude - [batch:935-paste-particles-v2-rework] - Prototypes/StickerBookThreeJS/**, AGENTS_CLAIMS.md - paste particles v2 rework (方向/位置/色/数/サイズ全面調整)
- 2026-07-05 - by Claude - [batch:948-oto-title-flow] - oto/index.html, sw.js, play.html, AGENTS_CLAIMS.md - オットタッチ: 「タップしてスタート」廃止 (起動即モード選択) + リズム→ステージ選択直行 (ステージ選択解放済み=何度目かの人のみ) + sw bump
- 2026-07-05 - by Claude - [batch:950-gacha-lever-hitarea-expand] - play.html, sw.js, AGENTS_CLAIMS.md - デイリーガチャレバーのタップ判定を子供向けに拡張 (::before 疑似要素で不可視ヒット領域を上下左右に inflate、 見た目とレバー中心座標は不変) + sw bump v1960→v1961
- 2026-07-05 - by Claude - [batch:951-gacha-lever-cache-sync-and-shell-clip] - play.html, AGENTS_CLAIMS.md - Finding A: PAGE_CACHE_VERSION 1960→1961 で sw.js と同期 (critical drift 解消)。 Finding B: mobile ::before の下方 inflation を -90%→-60% に絞って .daily-gacha-shell の overflow:hidden による下端クリップ (320×568 で 15.4px, 375×667 で 6.5px) を回避 [overlap: batch:950-gacha-lever-hitarea-expand]
- 2026-07-05 - by Claude - [batch:939b-survey-dedup-and-record-copy] - survey.html, common/rating-modal.js, sw.js, play.html, AGENTS_CLAIMS.md - survey.html 永久 dedup 実装漏れ修正 + record mode title/subcopy 差し替え + sw v1964→v1965
- 2026-07-06 - by Claude - [batch:tier-v3-phase1] - common/tier.js, assets/data/game-stickers.json, js/game-stickers.js, Prototypes/StickerBookThreeJS/**, play.html, oto/index.html, docs/**, sw.js - tier v3 Phase 1 実装 (fable/sonnet workflow) [overlap: batch:1131-avatar-40-fullbody-presets (play.html/sw.js)]
- 2026-07-06 - by Claude - [batch:1202-oto-quit-to-play-html] - oto/index.html, sw.js, play.html, AGENTS_CLAIMS.md - batch:1201 の音タッチ もどる/おしまい 実装を forward fix。音タッチ内タイトル (#start-mode-choice) 遷移を廃止し、#oto-menu-home と同型の ../play.html 遷移に訂正 + sw v2003→v2004 [overlap: batch:tier-v3-phase1 (oto/index.html, play.html, sw.js)]
- 2026-07-06 - by Claude - [batch:1203-ux-3fixes] - common/data-export.js, common/sw-update.js, sw.js, play.html, AGENTS_CLAIMS.md - UX 3件: Preview 強化 + SW toast 繰り返し抑制 + CORE_PRESERVE_IF_ABSENT 拡張 + sw v2006→v2007 [overlap: batch:tier-v3-phase1]
- 2026-07-06 21:04 - by Claude - [batch:1204-capacitor-phase1-scaffold] - native/** (新規), .gitignore, .assetsignore, common/sw-update.js, common/cloud-sync.js, bento/kitchen.html, AGENTS_CLAIMS.md - Capacitor Phase 1 scaffold (Android 先行、www build pipeline + Web側 SW gating 3点)。play.html/sw.js/CLAUDE.md/HANDOFF.md/MEMORY.md 等の既存 dirty 10 ファイルには一切 touch しない [overlap: batch:1203-ux-3fixes (common/sw-update.js), batch:952-cloud-sync-step-c (common/cloud-sync.js)]
- 2026-07-13 - by Claude - [batch:1280-data-analytics-plan] - docs/**, AGENTS_CLAIMS.md - 子供の遊びデータ収集の棚卸し + マーケ活用分析 + Cloudflare 分析基盤プラン策定 (docs のみ、コード変更なし) [overlap: batch:931-sticker-book-engagement-research-v2 (docs/**)]
## なぜ HANDOFF.md と別ファイルなのか

HANDOFF.md は履歴 (Done エントリ含む) が積み上がるため、 「いまアクティブな claim だけを瞬時に把握する」 用途には不向き。 このボードは **常に短い / 常に最新 / 行は使い捨て** という性質を維持することで、 衝突検出のコストをほぼゼロにする狙い。
