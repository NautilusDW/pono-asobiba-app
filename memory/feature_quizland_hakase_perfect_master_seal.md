---
name: clear.perfect[2] 「はかせを こえとるかも しれんのう」 を全カテゴリパーフェクト限定の最上級ご褒美セリフに昇格 (未着手)
description: Quizland 博士の最上級褒め言葉を 1 セッション 5/5 正解時の確率発火から「難しい/優しい/物知り 全カテゴリパーフェクトクリア」 限定発火に格上げする実装修正タスク。 2026-05-12 にユーザー方針確定、 音声化はそのまま進めて発動条件改修のみ後日対応
type: project
originSessionId: 66a166a1-c31b-4e7a-902a-59ab8150f7fb
---
# clear.perfect[2] 「はかせを こえとるかも しれんのう」 の発動条件改修

## 確定した方針 (2026-05-12 ユーザー指示)

セリフ 「**きみは もう、 はかせを こえとるかも しれんのう**」 は博士の **最上級ご褒美** として、 安易に出さず特別感を維持したい。

### 現状
- `quizland/index.html` の `HAKASE_DIALOGUE.clear.perfect` プール 3 件の 1 つ
- 1 セッション 5/5 正解 (100%) 時に **ランダム** 発火
  - perfect[0] 「ぜんもん せいかい！ きみは もう、 もりの なぞなぞマスターじゃな！」
  - perfect[1] 「ほっほっほ、 わしも おどろいた！」
  - perfect[2] 「きみは もう、 はかせを こえとるかも しれんのう」 ← **格上げ対象**

### 目標
perfect[2] を **「難しい / 優しい / 物知り 全カテゴリパーフェクトクリア」** 達成時の **限定発火セリフ** に昇格。 通常 perfect プールから外し、 特別判定で発火させる。

## Why
- 博士の発話で最も強い称賛 (「博士を超えてる」 = 究極の評価)
- 1 セッション 5/5 だけで頻繁に出ると **賞のインフレ** が起きる
- 全カテゴリ制覇 = 真の達人 という子供の達成感を演出する仕掛けに使いたい

## How to apply
**音声化は今フェーズで進める** (テキストは変更なし、 録音だけ完了させる)。 発動条件改修は別タスクとして以下を要調査:

1. Quizland の **「難しい / 優しい / 物知り」 のモード/カテゴリ構造** を把握
   - `quizland/index.html` のモード選択画面 / カテゴリ判定ロジック
   - 既存 `HAKASE_DIALOGUE.problem.byCategory` の 8 キー (order_color / count_total / shape_name / number_sequence / opposite / trivia / weather / body) との関係
   - 「難しい」「優しい」 はおそらく難易度モード、 「物知り」 はトリビア系カテゴリ?
2. **カテゴリ別パーフェクトクリア状態の永続化**
   - `localStorage` に各カテゴリの best_score / cleared フラグを保存
   - 全制覇判定: 3 つのモード/カテゴリすべてで perfect 達成済み
3. **発動ロジック改修**
   - `clear.perfect` プールから perfect[2] を除外
   - 全制覇達成セッション直後に perfect[2] 単独発火 (ランダムではなく確定)
   - 1 度発火したら再発火するか?
     (a) 毎回発火 — 全制覇後は毎セッション perfect[2]
     (b) 初回のみ — フラグで管理、 2 回目以降は他 perfect でランダム
     どちらにするかユーザー判断要

## 関連ファイル
- `quizland/index.html` HAKASE_DIALOGUE.clear.perfect (要該当行抽出)
- 想定影響: モード選択ロジック、 結果画面の `showResult()`、 localStorage キー追加

## 着手タイミング
音声録音 (= VOICEPEAK 発注 38 件) が完了してから着手。 音声 wav が手元に揃った段階で「実装すれば即動く」 状態で出戻り防止。

## 知見活用
[memory/feedback_restate_content_when_referring.md](feedback_restate_content_when_referring.md) ルールに従い、 セリフ参照時は本文併記すること。
