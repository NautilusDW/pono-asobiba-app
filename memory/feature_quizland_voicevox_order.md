---
name: Quizland VOICEVOX 音声発注書 + 生成ツール
description: クイズ全181問の音声発注書 (ORDER-FULL.md) と、その音声を実際に生成するためのローカル HTML ツール (tools/voicevox-generator/) のセット。発注書整備は git 管理 / 音声生成はツール実行という役割分担で運用
type: feature
---

# Quizland VOICEVOX 発注書 + 生成ツール

## 役割分担（確定運用）

このプロジェクトの VOICEVOX 音声化は **2 つの工程に明確に分離** されている。

| 工程 | 場所 | 担当 |
|---|---|---|
| **(A) 発注書の整備** | `docs/quizland-voicevox-order/` (git 管理) | Claude エージェント (Export → Claude 反映) |
| **(B) 音声の生成** | `tools/voicevox-generator/voicevox-generator.html` (ローカル HTML ツール) | ユーザーがブラウザで開いて手元で実行 |

- 発注書を直すときは Claude チャットで指示 → エージェントが `docs/quizland-voicevox-order/` を編集 → commit
- 音声を作るときはユーザーが上記 HTML を開いて、手元の VOICEVOX エンジン (port 50021) に向けて実行
- どちらか一方だけを更新しても噛み合わなくなる、両方を 1 セットで管理する

## (A) 発注書

### 場所
- フル版: `docs/quizland-voicevox-order/ORDER-FULL.md` (Q01〜Q181)
- サンプル版: `docs/quizland-voicevox-order/SAMPLE-PREVIEW.md` (Q01〜Q21、フォーマット確認用、命名規則は2桁)
- テスト発注: `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` (Q01 のみ、話者選定の最終確認用)

## 規模
- 181問 × 5音声 (問題文+選択肢4) = 905ファイル
- + Q160 同音異義の補足版 2 (q160_a_alt.wav / q160_b_alt.wav) = **907ファイル**

## 命名規則
- フル版: `q{NNN}_{q|a|b|c|d}.wav` (3桁ゼロパディング、q001〜q181)

## 読み方ルール
1. **order_color (Q01〜Q23, Q181)**: 英語キー → 日本語 (red→あか, blue→あお, yellow→きいろ, green→みどり, pink→ピンク, orange→オレンジ, purple→むらさき, cyan→みずいろ)
2. **count_total (Q24〜Q47)**: 画面「Nつ」(10だけ「10こ」)、speech は和語数詞「ひとつ / ふたつ / みっつ / よっつ / いつつ / むっつ / ななつ / やっつ / ここのつ / じゅっこ」
3. **number_sequence (Q169〜Q180)**: 裸数字、speech は音読み「いち / に / さん / よん / ご / ろく / なな / はち / きゅう / じゅう」
4. **opposite (Q95〜Q118)**: speech からカギ括弧「」を除去 (例: 画面「「おおきい」の はんたいは？」→ speech「おおきい の はんたいは？」)
5. **助数詞付き選択肢 (shape_name 等)**: speech 側でカナ化 (3こ→さんこ、5ほん→ごほん、6ぽん→ろっぽん、7しょく→ななしょく)
6. **Q160「はい(肺)」/「い(胃)」同音異義**: 通常版 + 補足版 (「ぞうきの はい」「いぶくろの い」) 両案発注、試聴後判断
7. **Q133/Q165 等の括弧・カギ括弧**: speech では文脈に応じて読点化 or 除去

## 数字×助数詞リファレンス
| 数 | つ | こ | ほん/ぽん | しょく | 単独 |
|---|---|---|---|---|---|
| 1 | ひとつ | いっこ | いっぽん | いっしょく | いち |
| 6 | むっつ | ろっこ | ろっぽん | ろくしょく | ろく |
| 8 | やっつ | はっこ | はっぽん | はっしょく | はち |
| 10 | じゅっこ | じゅっこ | じゅっぽん | じゅっしょく | じゅう |
| 0 | - | ぜろこ | - | - | ぜろ |

## カテゴリ別問題数 (questions.js 真値)
- order_color: 24 (Q01〜Q23 + Q181 補足)
- count_total: 24 (Q24〜Q47)
- shape_name: 23 (Q48〜Q70)
- weather: 24 (Q71〜Q94)
- opposite: 24 (Q95〜Q118)
- trivia: 26 (Q119〜Q144)
- body: 24 (Q145〜Q168)
- number_sequence: 12 (Q169〜Q180)
- **計 181問**

## 注意点
- count_total の数値配列は 2026-05-10 に文字列配列 (助数詞付き) に変更済。発注書は変更後の画面表示を反映
- order_color の Q181 は当初の発注書から漏れていたが追加済 (末尾に「補足」セクション)
- 既存バグ (window.QUIZLAND_COLORS undefined) は同日に修正、order_color の画面表示も日本語に戻った
- **話者はアシスタントキャラ「リスのくるみちゃん」（女声）で統一、第一候補「雨晴はう」 (2026-05-11 更新)**: 元々は博士キャラ (owl preset = 年配おじいさん風) で発注予定だったが、VOICEVOX におじいさん風候補が乏しく断念。代わりに新アシスタント「くるみちゃん」（リスの女の子、元気で優しいお姉さん感）を追加し、VOICEVOX 読み上げを担当させる。**ユーザーが VOICEVOX 公式話者を一通り試聴して「雨晴はう」（あめはれ はう、看護師さん風、温かい優しさ）を第一候補として確定**。比較用候補は「春日部つむぎ」「冥鳴ひまり」「九州そら あまあま」「WhiteCUL ふつう」「もち子さん」。全 907 ファイル同一話者で生成、選択肢ごとの話者切り替え禁止。テスト発注 (`COWORK-TEST-ORDER.md`) で「雨晴はう」で `q001_q.wav` のみ生成 → ユーザー＋Cowork 試聴で OK ならそのまま 27 ファイル → フル発注 (`ORDER-FULL.md`) も同話者で全 907 ファイル。「合わない」と判断された場合のみ比較用候補から再選定。フクロウ博士キャラは babble voice (owl preset) として OPシネマティック・ヒント等で温存。詳細は [memory/feature_quizland_kurumi.md](feature_quizland_kurumi.md)

---

## (B) VOICEVOX 生成ツール

### 場所
- 本体: `tools/voicevox-generator/voicevox-generator.html` (1166 行、Cowork ベースから派生)
- 辞書: `tools/voicevox-generator/voicevox_user_dict.csv` (52 語、子供向けクイズ頻出語アクセント、NHK ベース)
- ガイド: `tools/voicevox-generator/README.md` (189 行)

### 由来
Cowork オリジナル (484 行) をベースに、子供向けクイズ用途に **4 機能を追加** + **クロスレビュー指摘 (X 技術 / Y UX) 13 件 (HIGH 6 + MED 7)** を反映した派生版。

### 4 機能拡張

#### A. ユーザー辞書管理セクション
- `voicevox_user_dict.csv` を fetch して **VOICEVOX エンジンに一括登録**
- 重複語ガード (既登録ならスキップ)
- 「辞書クリア」ボタンで全削除
- 52 語: クイズ頻出固有名詞・動植物・体パーツ・色・数詞などのアクセント核を NHK 辞典準拠で固定

#### B. AccentPhrase 詳細編集
- 生成前のテキストを VOICEVOX `audio_query` で AccentPhrase 配列化
- mora セルを **クリック** で核位置 ± 操作
- 編集結果を **即試聴**
- 編集後の読み・アクセントを **CSV 1 行 DL** (そのまま `voicevox_user_dict.csv` に追記できる形式)

#### C. 発注書動的読み込み
- 3 ラジオで切り替え:
  - `hardcoded` — ツール内蔵のデフォルト
  - `file` — ローカル MD を選択
  - `url` — URL 指定 (例: GitHub raw)
- MD パーサで `## Q### / Speech: ...` ブロックを抽出
- ツールを git にコミットしないで発注書だけ更新するワークフローに対応

#### D. LLM アクセント補正 (オプション)
- Anthropic API キーを入力欄に貼り付け、各 speech の AccentPhrase を Claude に投げて校正
- モデル ID 選択肢: **Opus 4.7 / Sonnet 4.6 / Haiku 4.5 / Custom** (HIGH-1 で最新世代に修正済)
- フォールバック: LLM 失敗時のみ生 audio_query を使用 / HTTP エラーは throw (HIGH-2)
- **推奨は Sonnet 4.6** (コスト・速度バランス、HIGH-5 で明記)

### クロスレビュー反映 (HIGH 6 件)
- HIGH-1: LLM モデル ID を Opus 4.7 / Sonnet 4.6 / Haiku 4.5 / Custom に修正 (旧モデル名は撤去)
- HIGH-2: フォールバック明確化 (LLM 失敗のみ吸収、HTTP エラーは throw して握りつぶさない)
- HIGH-3: 辞書未登録警告 (サンプル/フル生成前に辞書 0 件チェック → 警告ダイアログ)
- HIGH-4: AccentPhrase → CSV DL 後の使い方 note 追加 (`voicevox_user_dict.csv` への追記手順)
- HIGH-5: LLM コスト・速度・API キー入手方法を UI に明記
- HIGH-6: zip ダウンロード忘れ防止 (生成完了時に confirm 自動 DL)

### クロスレビュー反映 (MED 7 件)
- MED-1: CSV パーサ堅牢化 (引用符・カンマ含むセル対応)
- MED-2: MD パーサで空セル保持
- MED-3: JSON 抽出 fallback (LLM が ```json ブロックなしで返した場合の救済)
- MED-4: 進捗カウンタ N/M 表示
- MED-5: 「2.5 (推奨)」を speedScale デフォルトに明示
- MED-6: mora セルクリック説明を UI に追加
- MED-7: LLM fallback タグ表示 (どのフレーズが LLM 経由 / 生 audio_query かを可視化)

### スコープ外 (将来タスク)
- Y-2 中断耐性 (IndexedDB / 中間 zip): HIGH-6 の「自動 DL confirm」だけ軽量対応済、フル中断耐性は未実装
- LOW 指摘 (グローバル変数集約、CRLF 対応 等): 未対応

### 運用フロー (音声生成)
1. ローカルで VOICEVOX エンジンを起動 (port 50021)
2. `tools/voicevox-generator/voicevox-generator.html` をブラウザで開く
3. 「ユーザー辞書 一括登録」ボタンで `voicevox_user_dict.csv` を取り込み
4. 発注書ソースを選択 (hardcoded / file / url)
5. (任意) LLM 補正を ON にして API キーを入力 (Sonnet 4.6 推奨)
6. サンプル数件で試聴 → アクセント OK なら全件生成
7. 生成完了時に zip 自動 DL confirm
8. 試聴で見つけた誤読語は `voicevox_user_dict.csv` に追記して git commit (履歴管理)

### VOICEVOX 音声生成パイプライン (確定運用)
1. 発注書 (`docs/quizland-voicevox-order/`) は git 管理、Claude エージェントが整備 (Export → Claude 反映)
2. 音声生成は `tools/voicevox-generator/` をブラウザで開いて手元で実行
3. アクセント精度は **52 語辞書 + LLM 補正 (オプション、Sonnet 4.6 推奨)** で向上
4. 試聴で見つけた誤読語は `voicevox_user_dict.csv` に追記して git で履歴管理 (発注書修正は Claude / 辞書追記もユーザー → Claude チャット経由で OK)

関連: [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) (発注書整備の Export → Claude 反映パターンの源流)
