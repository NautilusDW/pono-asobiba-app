---
name: ORDER-FULL.md の Q### は宣言順表記、 アプリの実 Q### は questions.js の QUIZLAND_CATEGORIES キー順 (2026-05-12 大事故から導出)
description: Quizland の Q### (= 全 181 問の通し番号) は、 questions.js の QUIZLAND_QUESTIONS 宣言順 ではなく QUIZLAND_CATEGORIES のキー順 で決まる。 ORDER-FULL.md / CSV / 展開 JSON 等の発注書系ドキュメントは宣言順表記で書かれているため、 アプリの実 Q### と +1 以上ズレている可能性大。 音声配置 / questions.js 編集 / Q### 参照時は必ず questions.js の CATEGORIES を真値として参照すること
type: feedback
---

# questions.js Q### 真値ルール

## ルール (恒久運用)

Quizland の Q### (= 全 181 問の通し番号) は以下のルールで決まる:

1. **真値**: `quizland/data/questions.js` の `QUIZLAND_CATEGORIES` の **キー順** で各カテゴリの問題が並ぶ
2. アプリは `Object.keys(QUIZLAND_CATEGORIES)` で順序を決定 (= 例: `quizland/index.html:3263 const ALL_CATS = Object.keys(QUIZLAND_CATEGORIES);`)
3. `QUIZLAND_QUESTIONS` の **宣言順は信用してはいけない** (= JS の object key 順序保証はあるが、 アプリは CATEGORIES 側を参照する)
4. `ORDER-FULL.md` / `voicepeak_lines_*.csv` / `voicepeak_unique_expand_*.json` 等の発注書系ドキュメントは **宣言順表記で書かれている可能性大** → アプリの実 Q### と +1 以上ズレている

## 実際の Q### 範囲 (2026-05-12 questions.js 真値)

| # | category | Q### | n |
|---|---|---|---|
| 1 | order_color | Q1-Q24 | 24 |
| 2 | count_total | Q25-Q48 | 24 |
| 3 | shape_name | Q49-Q71 | 23 |
| 4 | **number_sequence** | **Q72-Q83** | 12 |
| 5 | trivia | Q84-Q109 | 26 |
| 6 | weather | Q110-Q133 | 24 |
| 7 | opposite | Q134-Q157 | 24 |
| 8 | body | Q158-Q181 | 24 |

合計 181 問。

## Why (= 2026-05-12 大事故から導出)

2026-05-12 のナレーション漢字混じり化作業中、 Q### を「ORDER-FULL.md の宣言順表記」 で扱った結果、 wav ファイル名が **アプリ実 Q### と +97 ズレ** (= number_sequence の Q72-Q83 を Q169-Q180 と命名) してしまった。

ユーザー指摘で発覚、 復旧に時間を要した。 同じ事故を防ぐためのルール化。

## How to apply (Quizland 関連の Q### を扱う作業前に必ず読む)

- 音声 wav ファイル名を決める時 (= `q072_q.wav` 等)
  → questions.js の CATEGORIES 順を参照、 ORDER-FULL.md の表記は信用しない
- questions.js の問題を編集 / 追加 / 削除する時
  → 該当カテゴリの配列に対応する Q### が変動するので注意 (= 例: order_color に 1 問追加すると count_total 以降の Q### が +1 シフト)
- ORDER-FULL.md / 発注書を更新する時
  → questions.js の真値に合わせて Q### を計算
- ORDER-FULL.md と questions.js が ズレている場合
  → questions.js が真、 ORDER-FULL.md を更新 (= 別タスク化推奨、 巨大変更のため)

## 関連

- 真値ファイル: `quizland/data/questions.js` の `QUIZLAND_QUESTIONS` + `QUIZLAND_CATEGORIES`
- アプリの参照経路: `quizland/index.html:3263` `const ALL_CATS = Object.keys(QUIZLAND_CATEGORIES);`
- 影響を受ける発注書系: `docs/quizland-voicevox-order/ORDER-FULL.md` / `tools/voicepeak/voicepeak_lines_*.csv` / `tools/voicepeak/voicepeak_unique_expand_*.json`
- 2026-05-12 number_sequence 修正 (= -97 シフト) の経緯: 本事故から導出。 他カテゴリ (= ORDER-FULL.md 全体の +1 ズレ) は別タスクで一括整理
