---
name: Quizland 博士セリフプール拡張 (tryAgain 3→7 + hint2FallbackGeneric[0] 笑い声抜き) (2026-05-12)
description: フクロウ博士の `clear.tryAgain` プールを 3→7 に拡張 (うち 1 件は差し替え、 4 件は新規追加) + `hint2FallbackGeneric[0]` を「ほっほっほ、 もうすこしじゃ」 から「ふむ… もうすこしじゃ」 に変更して笑い声の連続発火を抑制。 VOICEPEAK 男性3 で全 38 件の博士音声収録を見据えた変更
type: project
originSessionId: 66a166a1-c31b-4e7a-902a-59ab8150f7fb
---
# 博士セリフプール拡張 (2026-05-12)

## 変更ファイル
- `quizland/index.html` の `HAKASE_DIALOGUE.clear.tryAgain` (3→7 件)
- `quizland/index.html` の `HAKASE_DIALOGUE.hint2FallbackGeneric[0]` (笑い声抜き差し替え)
- `sw.js` の `CACHE_VERSION` バンプ

## clear.tryAgain プール (0-2/5 正解時、 60% 未満で発動) — 7 件構成

| # | セリフ | 状態 | 角度 |
|---|---|---|---|
| 0 | むずかしかったのう。 また やってみるとよい | 新規 (旧「また あそびに きてくれよな」 を差し替え) | 失敗体験を労う / 過去軸 |
| 1 | あわてず、 ゆっくりで よいぞ | 既存維持 | 今この瞬間 / 落ち着き |
| 2 | つぎは もっと できるはずじゃ | 既存維持 | 次回 / 前向き |
| 3 | かんがえたのが えらいぞ | 新規追加 | プロセス称賛 (考えた行為自体を肯定) |
| 4 | わしも むかしは そうじゃった | 新規追加 | 博士共感 (博士も間違えてた) |
| 5 | ひとやすみして また おいで | 新規追加 | 休憩→再来訪誘導 |
| 6 | ちょっと きゅうけいして また あそぼう | 新規追加 | 休憩→再開誘い |

### 差し替えの理由 (旧 tryAgain[0])
旧「また あそびに きてくれよな」 はユーザーが「アニメ主人公的な響き」 として NG。 博士は「導く側 / 年配の知者」 としてブレずに残すべき。 「〜よな」 のような同年代男児に語る軽口語尾が NG 主因と推定。

### 拡張の意図
プール 3 件だと 5 セッション × 5 問の中で同じセリフが何度も鳴り飽きる。 7 件に増やすことで:
- 時間軸 4 種 (過去 / 今 / 未来 / 翌日以降) のバリエーション
- 角度 4 種 (失敗を労う / 落ち着き / 次回 / プロセス称賛 / 博士共感 / 休憩誘導 × 2) のバリエーション
- ランダム発火で繰り返し感を抑える

## hint2FallbackGeneric[0] 差し替え

旧: 「ほっほっほ、 もうすこしじゃ」
新: 「ふむ… もうすこしじゃ」

### 理由 (笑い声連続発火抑制 第 1 段)
博士の「ほっほっほ」 笑い声は 5 セリフに分散している:
- rarePraise[0] 「ほっほっほ…わしも まけておれんな」
- rarePraise[5] 「わしの まけじゃ、 ほっほっほ」
- clear.perfect[1] 「ほっほっほ、 わしも おどろいた！」
- clear.okay[1] 「ほっほっほ、 いい かんじじゃ」
- (旧) hint2FallbackGeneric[0] 「ほっほっほ、 もうすこしじゃ」

ヒント時点で「ほっほっほ」 が出ると、 直後の正解 rarePraise でまた「ほっほっほ」 が出て 2 連続することがある。 ヒント側を笑い声抜きに差し替えて連続発火確率を下げる。

ユーザー方針: **「笑い声は博士の特徴・個性として残す」 が前提**。 完全廃止ではなく、 ヒント側 1 件だけ抜くことで「特徴維持 + 連続不自然回避」 のバランスを取る。

### 様子見後のオプション (未着手)
データ側 1 行修正で連続発火が解消されない場合の第 2 段:
- 笑い声含有 4 プール (rarePraise / clear.perfect / clear.okay / hint2FallbackGeneric) にだけ局所適用するミニロジック (`pickRandomNoLaughRepeat`、 直前発話を `_lastDialogueText` に記録 → 直前が笑い声なら笑い声含む候補を除外して抽選、 差分 ~10 行)
- 全 `pickRandom` 置換は過剰なので局所適用に留める

## 関連音声化発注

`docs/quizland-voicevox-order/ORDER-EXTRA-NON-QUIZ.md` (新規) に以下 38 件の博士セリフ + 5 件の くるみ問題番号コール = **計 43 件** を発注:
- correct 10 件 / rarePraise 6 件 / wrong 8 件 / consecutiveMiss 6 件
- clear.perfect 3 件 / good 3 件 / okay 3 件 / **tryAgain 7 件 (拡張済)**
- hint2FallbackGeneric 2 件 (差し替え版含む)

話者: VOICEPEAK 男性3 + ピッチ/速度を下げて年配感。 くるみは VOICEPEAK 「女の子」。

## ユーザー判断履歴 (2026-05-12)
1. 「却下無し、 全部 OK」 → B1/B2/E1/E2 4 案すべて採用 (tryAgain[3-6])
2. 「笑い声は個性として残す」 → 完全廃止せず、 ヒント側 1 件だけデータ調整
3. 「ID だけで参照しない、 必ず本文併記」 (恒久ルール、 [feedback_restate_content_when_referring.md](feedback_restate_content_when_referring.md) に保存)
4. clear.perfect[2] 「きみは もう、 はかせを こえとるかも しれんのう」 は **全カテゴリパーフェクト限定発火** に格上げ予定 (アプリ実装は別タスク、 [feature_quizland_hakase_perfect_master_seal.md](feature_quizland_hakase_perfect_master_seal.md) に記録)

## 知見活用
過去のセッションで「短縮 ID で参照してユーザーをスクロールさせる」 失敗が頻発したため、 本ドキュメントでもセリフ全文を必ず併記。
