---
name: Quizland 音声発注書 + 生成ツール (【主軸変更 2026-05-12】 VOICEPEAK 一本化、 VOICEVOX 雨晴はう廃案、 くるみ話者は 「女の子」 → 「女性4」 に再差替)
description: クイズ全181問の音声発注書 (ORDER-FULL.md / COWORK-TEST-ORDER.md / ORDER-EXTRA-NON-QUIZ.md) と、その音声を実際に生成するためのワークフロー。【主軸変更 2026-05-12】 VOICEVOX 雨晴はう案は廃案、 VOICEPEAK に一本化。 くるみ話者は同日内に 「女の子」 中継確定 → 27 ファイル試聴で却下 → 最終的に 「女性4」 プリセットに再差替で確定。 VOICEVOX 関連ツール・記述および 「女の子」 中継案は履歴として温存
type: feature
---

# Quizland 音声発注書 + 生成ツール

# 【主軸変更 2026-05-12】 VOICEVOX 雨晴はう案は廃案、 VOICEPEAK 「女の子」 プリセットに一本化

> **2026-05-12 ユーザー確定**: 試聴比較の結果、 VOICEVOX 雨晴はうは「くるみちゃんの雰囲気と合わない」 と判断され却下。 全 912 件 (= 問題本編 907 + 第1〜5問目 5) を **VOICEPEAK 「女の子」 プリセット** で統一録音する方針に変更。
>
> 博士担当 (48 件) は **VOICEPEAK 「ナレーター おじいさん」 (秦なおき声、 2026-05-12 ユーザー単体購入確定 ¥5,980)** で確定。 微調整は素のプリセットで試聴して必要なら追い込む方針 (素のままで通す前提)。 Plan B は「男性3 (柊一希) + パラメータ調整 (¥0)」 として温存。
>
> 本ファイルの旧 VOICEVOX 関連記述は **削除せず「【廃案】 過去の検討経緯」 セクションへ移動** (将来戻す可能性のため履歴温存)。 現行ワークフローは「【現行】 VOICEPEAK ワークフロー」 セクションを参照。
>
> 方針転換の詳細は [feature_quizland_voicepeak_pivot.md](feature_quizland_voicepeak_pivot.md) を参照。 ユーザー購入済 VOICEPEAK ボイス一覧は [reference_voicepeak_voices_purchased.md](reference_voicepeak_voices_purchased.md) を参照。

---

# 【現行】 VOICEPEAK ワークフロー (2026-05-12〜)

## 話者方針

| キャラ | エンジン / プリセット | 件数 | 備考 |
|---|---|---|---|
| **くるみ** | VOICEPEAK 「女の子」 | 912 (= 907 + 5) | 問題本編 + 第1〜5問目導入。 全件統一録音 |
| **博士** | VOICEPEAK 「ナレーター おじいさん」 (秦なおき声) | 48 | 2026-05-12 ユーザー単体購入確定 (¥5,980)。 微調整は試聴で確定 (素のままで通す前提)。 Plan B = 「男性3 + パラメータ調整 (¥0)」 を温存 |
| **ポノ** | (音声化保留) | — | アイデンティティ確定までは babble (`js/quizland-babble.js` pono preset) のまま |

## 発注書ファイル

| ファイル | 件数 | 用途 |
|---|---|---|
| `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` | 27 件 | 話者選定の最終確認用テスト発注 (VOICEPEAK 化書き換え済) |
| `docs/quizland-voicevox-order/ORDER-FULL.md` | 907 件 | フル本体 (Q01〜Q181 × 5 音声 + Q160 補足 2、 VOICEPEAK 化書き換え済) |
| `docs/quizland-voicevox-order/ORDER-EXTRA-NON-QUIZ.md` | 53 件 | クイズ本編以外 (第1〜5問目導入 + 博士セリフ等、 新規追加) |

> **ファイルパスは `docs/quizland-voicevox-order/` のまま** (リネームすると参照が壊れるため、 中身で「VOICEPEAK 化済み」 を明示)

## ツール

- `tools/voicepeak/` 配下の Convert スクリプト + 辞書 CSV/VDC2
- VDC2 フォーマットの詳細は [reference_voicepeak_vdc2_format.md](reference_voicepeak_vdc2_format.md) を参照

## 規模 (現行)

- 全 912 件 = 問題本編 907 + 第1〜5問目 5
- 命名規則は VOICEVOX 時代と同じ `q{NNN}_{q|a|b|c|d}.wav` を踏襲
- 全件 VOICEPEAK 「女の子」 単一話者で生成、 選択肢ごとの話者切り替え禁止 (くるみ統一)

## 読み方ルール (VOICEPEAK でも継続適用)

旧 VOICEVOX 用に整備した読み方ルール (order_color の英→日変換、 count_total の和語数詞、 number_sequence の音読み、 opposite のカギ括弧除去、 助数詞付き選択肢のカナ化、 Q160 同音異義の補足版等) は、 **エンジンが VOICEPEAK に変わっても speech 文字列上の表記ルールはそのまま適用**。 詳細は本ファイル下部の「【廃案】 過去の検討経緯」 → 「読み方ルール」 を参照 (内容は VOICEPEAK でも有効)。

---

# 【廃案ツール】 VOICEVOX-generator HTML ツール

- **状態**: 主軸が VOICEPEAK に切り替わったため、 当面使用しない
- **削除/アーカイブはユーザー判断待ち** (今は触らない、 履歴として温存)
- 場所: `tools/voicevox-generator/voicevox-generator.html` (1570 行) + `voicevox_user_dict.csv` (52 語) + `README.md` (189 行)
- 詳細仕様は本ファイル下部の「【廃案】 過去の検討経緯」 → 「(B) VOICEVOX 生成ツール」 を参照

---

# 【廃案】 過去の検討経緯 (VOICEVOX 主軸時代の記述、 履歴温存)

> 以下は 2026-05-11 までの VOICEVOX 雨晴はう主軸時代の記述。 2026-05-12 に廃案となったが、 将来戻す可能性のため履歴として温存。 **現行運用は上記「【現行】 VOICEPEAK ワークフロー」 セクションを参照すること。**

## 役割分担（VOICEVOX 時代の確定運用）

このプロジェクトの VOICEVOX 音声化は **2 つの工程に明確に分離** されていた (VOICEVOX 時代)。

| 工程 | 場所 | 担当 |
|---|---|---|
| **(A) 発注書の整備** | `docs/quizland-voicevox-order/` (git 管理) | Claude エージェント (Export → Claude 反映) |
| **(B) 音声の生成** | `tools/voicevox-generator/voicevox-generator.html` (ローカル HTML ツール、 【廃案ツール】) | ユーザーがブラウザで開いて手元で実行 |

- 発注書を直すときは Claude チャットで指示 → エージェントが `docs/quizland-voicevox-order/` を編集 → commit
- 音声を作るときはユーザーが上記 HTML を開いて、手元の VOICEVOX エンジン (port 50021) に向けて実行
- どちらか一方だけを更新しても噛み合わなくなる、両方を 1 セットで管理する
- **2026-05-12 以降**: (A) 発注書は VOICEPEAK 化書き換え済みで継続運用、 (B) 生成ツールは VOICEPEAK 移行に伴い当面不使用 (削除はユーザー判断待ち)

## (A) 発注書 (VOICEVOX 時代の構成)

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
- **【廃案 2026-05-12】 話者はアシスタントキャラ「リスのくるみちゃん」（女声）で統一、第一候補「雨晴はう」 (2026-05-11 時点)**: 元々は博士キャラ (owl preset = 年配おじいさん風) で発注予定だったが、VOICEVOX におじいさん風候補が乏しく断念。代わりに新アシスタント「くるみちゃん」（リスの女の子、元気で優しいお姉さん感）を追加し、VOICEVOX 読み上げを担当させる。ユーザーが VOICEVOX 公式話者を一通り試聴して「雨晴はう」（あめはれ はう、看護師さん風、温かい優しさ）を第一候補として確定。比較用候補は「春日部つむぎ」「冥鳴ひまり」「九州そら あまあま」「WhiteCUL ふつう」「もち子さん」。全 907 ファイル同一話者で生成、選択肢ごとの話者切り替え禁止。テスト発注 (`COWORK-TEST-ORDER.md`) で「雨晴はう」で `q001_q.wav` のみ生成 → ユーザー＋Cowork 試聴で OK ならそのまま 27 ファイル → フル発注 (`ORDER-FULL.md`) も同話者で全 907 ファイル。「合わない」と判断された場合のみ比較用候補から再選定。フクロウ博士キャラは babble voice (owl preset) として OPシネマティック・ヒント等で温存。詳細は [memory/feature_quizland_kurumi.md](feature_quizland_kurumi.md)。 **→ 2026-05-12 試聴比較で「雨晴はう」 がくるみの雰囲気と合わないと判断され却下、 VOICEPEAK 「女の子」 に切替決定 ([feature_quizland_voicepeak_pivot.md](feature_quizland_voicepeak_pivot.md))**

---

## (B) VOICEVOX 生成ツール (【廃案ツール】 2026-05-12 主軸変更で当面不使用)

### 場所
- 本体: `tools/voicevox-generator/voicevox-generator.html` (1570 行、Cowork ベースから派生)
- 辞書: `tools/voicevox-generator/voicevox_user_dict.csv` (52 語、子供向けクイズ頻出語アクセント、NHK ベース)
- ガイド: `tools/voicevox-generator/README.md` (189 行)
- **削除/アーカイブはユーザー判断待ち** (今は触らない、 履歴温存)

### 由来
Cowork オリジナル (484 行) をベースに、子供向けクイズ用途に **6 機能を追加** + **クロスレビュー指摘 (X 技術 / Y UX) 13 件 (HIGH 6 + MED 7)** を反映した派生版。**確定運用は機能 F (未補正エクスポート) → Claude Code でアクセント補正 JSON 生成 → 機能 E (accent_overrides 読込) で適用 → synthesis** の Claude Code 一本化フロー (機能 D の LLM 直接呼び出しは残置するが非推奨)。

### 6 機能拡張

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

#### D. LLM アクセント補正 (ブラウザ直接呼び出し / 非推奨)
- Anthropic API キーを入力欄に貼り付け、各 speech の AccentPhrase を Claude に投げて校正
- モデル ID 選択肢: **Opus 4.7 / Sonnet 4.6 / Haiku 4.5 / Custom** (HIGH-1 で最新世代に修正済)
- フォールバック: LLM 失敗時のみ生 audio_query を使用 / HTTP エラーは throw (HIGH-2)
- **2026-05-11 以降は非推奨**: 課金が発生 + Claude Code Max plan を契約済のため追加コストゼロの **機能 E + F の Claude Code 経由フローを主推奨**。機能 E と機能 D はチェックボックス排他制御で同時 ON 不可。コードは互換性のため残置するが、新規 UI からは機能 E が優先される

#### E. accent_overrides.json 読込モード (★ 主推奨 / Claude Code 一本化)
- LLM (主に Claude Code、 互換性のため Codex も同フォーマット可) が生成した **最小差分パッチ JSON** を読み込んで synthesis 時に適用
- フォーマット: `{ schema_version, speaker_id, source, items: [{id, text, patches: [{phrase_index, mora_signature, accent, confidence, note}], needs_listen}] }`
- **mora_signature 検証**: 生 audio_query の mora 列と signature が一致しない場合は警告タグ + `console.warn` (発注書改訂や辞書追加で mora 構造が変わった patch を検出)
- **confidence 別挙動**: high / medium / low の 3 段階で扱いを分ける (low は警告タグ常時 ON)
- **needs_listen=true** は警告タグ付きで synthesis (デフォルト ON、 試聴チェック対象を明示化)
- 機能 D (LLM 直接呼び出し) と **チェックボックス排他制御** (同時 ON にしないよう UI 側で守る)

#### F. 未補正テキスト + audio_query エクスポート (★ Claude Code への入力データ生成用)
- 現在の FILES 配列の全テキストで `audio_query` を **逐次取得 → 単一 JSON ダウンロード**
- 出力形式ラジオで切替:
  - **full** — audio_query 込み (mora signature を含むので Claude Code が patch を作りやすい)
  - **text** — テキストのみ軽量 (テキスト確認だけしたい場合)
- ファイル名: `accent_input_YYYYMMDDhhmmss.json`
- **Claude Code (このリポジトリで会話している Claude) や Codex CLI に渡す入力データを作るための機能**

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

### 確定運用フロー (Claude Code 一本化、 2026-05-11 確定 — 【廃案 2026-05-12】)
1. ユーザー: ローカルで VOICEVOX エンジンを起動 (port 50021) + ツールをブラウザで開く
2. ユーザー: 接続テスト → 機能 A の「ユーザー辞書 一括登録」で `voicevox_user_dict.csv` (52 語) を取り込む
3. ユーザー: **機能 F でエクスポート** (full モード推奨) → `accent_input_YYYYMMDDhhmmss.json` をダウンロード
4. ユーザー: Claude Code (このリポジトリで会話している Claude) に JSON を渡す
5. Claude: アクセント補正パッチを `accent_overrides.json` フォーマット (機能 E のスキーマ) に書き出し
6. ユーザー: **機能 E で読込** → synthesis → zip → 試聴
7. 誤読語があれば `voicevox_user_dict.csv` に追記、 または accent_overrides を Claude Code で再生成
8. 修正済み辞書・accent_overrides は git で履歴管理 (Claude エージェント経由で commit)

### 廃止された案 (今後一切言及しない)
- ❌ **ブラウザから Anthropic API 直接呼び出し** (機能 D は残置するが非推奨、 Claude Code 経由を主推奨)
- ❌ **Codex App Server 起動** (重い + セットアップ必要、 今回スコープに不適)
- ❌ **OpenAI API 直叩き** (課金回避不可)

### Claude Code 一本化を選んだ理由
- ユーザーは **Claude Code Max plan を契約済**で、追加課金ゼロでアクセント補正 JSON が生成可能
- 同セッション内で「補正 JSON 生成 → ファイル書き出し → 試聴フィードバック → 辞書追記 → 再生成」が **完結** する
- Codex CLI も同等の機能を提供し JSON フォーマットも互換 (`schema_version`/`patches[]` 構造) だが、 追加セットアップ + ChatGPT Pro 上限ありで Claude Code より複雑
- Codex 相談の結論: **Codex App Server は今回スコープに重い → 採用見送り**、 **Claude Code 一本化がセットアップゼロで最現実的**

関連: [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) (発注書整備の Export → Claude 反映パターンの源流、 VOICEVOX 機能 E/F フローも同じ「ユーザー Export → Claude が JSON 反映」パターン)
