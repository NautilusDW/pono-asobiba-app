---
name: chip-label v968 4 段防御で残る残バグ (288×240 + 改行混入、 v969 attempt は破棄済、 再着手必要)
description: chip-label 編集時の overlay 子要素 (resize-handle x8 + resize-size-label 288xN) 混入問題が v968 4 段防御 (detach/reattach + cloneNode strip + tail regex sanitizer + idempotency guard) でも 288×240 + 改行混入のパターンで再発。 v969 attempt (全 element-child 一括除去 + load-time sanitizer + 全角対応 2-pass regex) は今回の rebase 混乱で broken 判定で破棄、 次タスクで再着手必要
type: project
---

# chip-label v968 残バグ + v969 attempt 破棄

## 確定事実 (2026-05-12 時点)
- sw.js: 現行 **v968** (chip-label 4 段防御まで)
- 既知症状: chip-label 編集後に `288×240` の寸法ラベルと改行が混入するケースが残存 (= v968 4 段防御を通過する)
- v969 attempt (= `layout-editor.js` 全 element-child 一括除去 + `layout-system.js` load-time sanitizer + 全角 digit / x|X|* 区切り対応 2-pass regex) は **broken 判定で 2026-05-12 全破棄済**
- 破棄理由: rebase 混乱中に auto-commit hook で巻き込まれて整合性が崩れた + テスト不十分のまま広範な編集を入れていた

## やってはいけないこと
- v969 attempt の修正案を「broken だから完成させる」 という方向で着手しない (= 試行錯誤のままだったので一からアプローチ見直し推奨)
- chip-label の editor 側だけ修正して runtime 側 sanitizer を入れない (load-time での自衛も必要 → v969 の load-time sanitizer 案は思想は正しい)

## やるべきこと (次タスクで再着手時)
1. v968 4 段防御の **どの段が通過させているか** を 288×240 + 改行混入の症状から逆引き解析
2. v969 attempt の **思想の良かった部分** (load-time sanitizer / 全角対応 regex / 全 element-child 除去) を再評価
3. PoC を先に書く (= 同症状を再現する unit test) → fix を入れる前にテストが赤いことを確認
4. CSS 仕様 (chip-label の display / overflow / box-shadow 関係、 v964 で flex 化済) との整合性を再確認
5. sw v969 bump は **次の bump 番号 v969 を温存** (= 過去の broken attempt と区別) する判断は不要、 新規 fix を素直に v969 として bump して OK

## Why
- ユーザー報告: 「288×240 + 改行混入」 の具体的再現がある → 防御漏れの直接証拠
- v968 4 段防御は detach/reattach + cloneNode strip + tail regex + idempotency guard で複合的に守っているが、 寸法ラベル + 改行のパターンは tail regex の取りこぼし or cloneNode の child 残存の可能性

## How to apply (次回セッション開始時)
- MEMORY.md インデックスから本ファイルを認識したら、 「chip-label 288×240 残バグの再着手タスクが残っています。 今日やりますか？」 と Claude から能動的に提案
- ユーザーが「今やる」 と判断したら 上記「やるべきこと」 1〜5 を順次実行
- ユーザーが「あとで」 と言ったら本ファイルを残して次回再提案

## 関連
- [project_develop_origin_divergence_pending.md] (作成中、 同期残課題)
- [feedback_auto_commit_hook_rebase_risk.md] (作成中、 hook 危険性)
- 関連コード: `common/layout/layout-editor.js` (_saveChipTextOverride v968) / `common/layout/layout-system.js` / `quizland/saved-layout.json`
