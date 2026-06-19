> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Puzzle Tutorial Voice Memo

作成日: 2026-06-08

## 目的

パズルの「やりかたを見る」チュートリアル用に、Google AI Studio の Text to Speech / Speech generation で女性ナレーションを生成するための設定メモ。

既存オープニング音声:

- `assets/audio/puzzle/opening_narration_c01.mp3`
- `assets/audio/puzzle/opening_narration_c02.mp3`
- `assets/audio/puzzle/opening_narration_c03.mp3`

注記: 既存 mp3 のメタデータには Google AI Studio の speaker 名は残っていない。ユーザー確認ではオープニングは女性声。

## Speaker 候補

第一候補: `Aoede`

- 子ども向けの案内に合う、軽くやわらかい女性ナレーション候補。
- まず既存オープニング音声と聴き比べる。

第二候補: `Leda`

- `Aoede` より少し若め・はっきりした印象にしたい場合に試す。

第三候補: `Kore`

- 少し固め・案内役っぽさが欲しい場合に試す。

今回は `Charon` / `Iapetus` は第一候補から外す。`Iapetus` は既存 story docs ではナレーション用途の記録があるが、パズルの女性オープニング声と断定できないため。

## AI Studio 入力欄

### Scene

```text
A gentle female guide teaches a preschool puzzle tutorial in a warm forest playroom.
```

### Sample Context

```text
Japanese narration for a young children's puzzle tutorial. Use a gentle female storyteller voice, close to the opening narration. Warm, soft, clear, and reassuring. Speak slowly with short natural pauses. Keep the tone friendly and playful, but not overly excited.
```

## 試聴用短文

speaker の聴き比べは、まずこの短文で確認する。

```text
あそびかたを れんしゅうするよ。
```

## チュートリアル用ナレーション案

実装中の基本れんしゅう導線に合わせた短文。長すぎると操作待ちとずれるため、1 ファイル 1-2 文までにする。

## 実装済みファイル

2026-06-19 時点の基本チュートリアルは 13 ステップ（`basic_tut_01.mp3` 〜 `basic_tut_13.mp3`）。`D:\ポノのおへや\Puzzle\Tutorial\` 配下の WAV から変換した音声を実装している。ヒント導入を「選ぶ（拍A）」と「押す（拍B）」の 2 行に分割し、`basic_tut_09`（SELECT 拍A）/ `basic_tut_10`（PRESS 拍B, NEW）の 2 ファイルにした。拍A/拍B は承認済みの TTS 生成クリップ（Aoede voice）。これに伴い旧 `basic_tut_10`〜`12`（発光／締め／終了）はそれぞれ 1 つ上のスロット（`11`〜`13`）へシフトした。

保存先: `assets/audio/puzzle/voice/`

| ファイル | registryIndex | 再生タイミング | セリフ（正本） |
|---|---|---|---|
| `basic_tut_01.mp3` | 0 | 導入 | これからパズルの遊び方を練習するよ。まずはお手本を見てね |
| `basic_tut_02.mp3` | 1 | ドラッグ手本 | このピースをつかんで青い場所へ持っていくよ |
| `basic_tut_03.mp3` | 2 | ドラッグ実践 | ピースを持って、青い場所へ離してね ※先頭の「やってみよう。」はバッジ表示に置き換え、音声からはトリム済み |
| `basic_tut_04.mp3` | 3 | 「見る」予告（実践完了→見る練習へ） | できたね。次は、見るボタンを試すよ |
| `basic_tut_05.mp3` | 4 | 見る練習の導入（長押し指示） | まずは見るボタンを長く押してみよう |
| `basic_tut_06.mp3` | 5 | 見る長押しの説明（NEW、手本中に index 4 の後で連続再生） | 見るボタンは長く押している間だけ絵が見えるよ |
| `basic_tut_07.mp3` | 6 | 見る練習で長押し中（離す前に再生） | 離すと、元のパズルに戻るよ |
| `basic_tut_08.mp3` | 7 | 見る練習の締め（離した直後） | 困った時に使ってね |
| `basic_tut_09.mp3` | 8 | ヒント SELECT（拍A、まずピースを選ぶ指示） | 次はヒントだよ。場所を知りたいピースを、まず選んでね |
| `basic_tut_10.mp3` | 9 | ヒント PRESS（拍B、選択後にヒントを押す指示。NEW INSERT） | ヒントを押すと、その場所が光るよ |
| `basic_tut_11.mp3` | 10 | 発光表示時（ヒント実践） | 光った場所へピースを持っていくよ |
| `basic_tut_12.mp3` | 11 | 最後の締め | できたね。わからない時は見るとヒントを使ってね |
| `basic_tut_13.mp3` | 12 | チュートリアル終了時（ステージ1へ進む直前の締め） | これで練習はおしまい。さあ、パズルで遊ぼう。 |

実装メモ:

- `basic_tut_05.mp3`（index 4）は「見る」ボタンの長押し指示。手のデモは廃止し、この指示の直後に「見る」ボタンを直接押せるようにする（demo バッジではなく `try` バッジ「やってみよう！」を表示）。index 4 が終わると続けて `basic_tut_06.mp3`（index 5, 長押し説明）を再生するが、この時点でボタンは既に押下可能で、子供は説明中に押してもよい。
- ユーザーが `見る` を長押し中（押している間）に `basic_tut_07.mp3`（index 6,「離すと、元のパズルに戻るよ」）を再生する。離した後ではなく押下中に流す。
- 子供が `見る` を離した後に `basic_tut_08.mp3`（index 7,「困った時に使ってね」）を再生してから、ヒント手本へ進む。
- `basic_tut_09.mp3`（index 8, SELECT 拍A）は、ヒント節の最初（ばしょを しりたい ピースを えらぶ指示）に再生する。コーチ吹き出しは「つぎは ヒントだよ／ばしょを しりたい ピースを えらんでね」。
- `basic_tut_10.mp3`（index 9, PRESS 拍B, NEW）は、子供がピースを選んだ直後（`basic-hint-press-try`）に再生し、「ヒント」ボタンを押すよう促す。コーチ吹き出しは「ヒントを おしてみよう／おすと ばしょが ひかるよ」。
- `basic_tut_11.mp3`（index 10）は、ヒント実践で発光が見えるタイミングに再生する。
- `basic_tut_12.mp3`（index 11, 最後の締め）は、ヒントボタンのクリック処理で正解位置の発光が実際に描画された後、吹き出し表示と同時に再生する。これでチュートリアルが終了する。
- `basic_tut_11.mp3` 開始後、対象ピースを正解位置へ自動で移動してはめる。音声とアニメーションが両方終わったら基本チュートリアルを自動終了する。
- `basic_tut_12.mp3`（index 11, 「できたね…」）の再生が終わった直後に、続けて `basic_tut_13.mp3`（index 12, 締めの一言）を再生する。締めの音声が終わってからステージ1へ遷移するため、子供は「これで練習はおしまい。さあ、パズルで遊ぼう。」を聞いてからゲーム本編に入る。コーチ吹き出しは「これで れんしゅうは おしまい／さあ、パズルで あそぼう」を表示する。
- `見る` ボタンは短く押してすぐ離しても、古い長押し案内キューを残さず、何度でも押し直して全体像を表示できるようにする。

### `tut_basic_01_intro` (index 0)

```text
これからパズルの遊び方を練習するよ。まずはお手本を見てね。
```

### `tut_basic_02_drag_demo` (index 1)

```text
このピースをつかんで青い場所へ持っていくよ。
```

### `tut_basic_03_drag_try` (index 2)

```text
ピースを持って、青い場所へ離してね。
```

> 補足: 出荷音声は先頭の「やってみよう。」をトリム済み。「やってみよう」は `try` バッジで視覚的に提示するため、音声では重複させない。

### `tut_basic_04_peek_intro` (index 3)

```text
できたね。次は、見るボタンを試すよ。
```

### `tut_basic_05_peek_press` (index 4)

```text
まずは見るボタンを長く押してみよう。
```

### `tut_basic_06_peek_explain` (index 5)

```text
見るボタンは長く押している間だけ絵が見えるよ。
```

> 補足: index 4（押下指示）が終わると続けて再生する説明。この時点で「見る」ボタンは既に押下可能で、子供は説明の途中で押してもよい。

### `tut_basic_07_peek_release` (index 6)

```text
離すと、元のパズルに戻るよ。
```

### `tut_basic_08_peek_stuck` (index 7)

```text
困った時に使ってね。
```

### `tut_basic_09_hint_select` (index 8, 拍A SELECT)

```text
次はヒントだよ。場所を知りたいピースを、まず選んでね。
```

### `tut_basic_10_hint_press` (index 9, 拍B PRESS, NEW)

```text
ヒントを押すと、その場所が光るよ。
```

### `tut_basic_11_hint_glow` (index 10)

```text
光った場所へピースを持っていくよ。
```

### `tut_basic_12_finish` (index 11)

```text
できたね。わからない時は見るとヒントを使ってね。
```

### `tut_basic_13_closing` (index 12)

```text
これで練習はおしまい。さあ、パズルで遊ぼう。
```

## 生成時の注意

- Google AI Studio 側では「Speech to Text」ではなく、音声を作る「Text to Speech / Speech generation」を使う。
- AI Studio の音声系ツールは通常チャットの History と同じように保存されない可能性があるため、speaker / Scene / Sample Context / 原稿はこのファイルを正本にする。
- 簡単な漢字は使い、ボタン名は「見る」「ヒント」のように画面表示と同じ語で読む。難しい漢字は避ける。
- 句点ごとに自然な短い間を入れる。必要なら `[short pause]` を英文指示側に追加して調整する。
- 声はやさしいが、テンションを上げすぎない。子どもに指示が届く、落ち着いた案内役にする。

## 実装メモ

- `basic_tut_11.mp3`（index 10, `tut_basic_11_hint_glow`）は正解位置が光った後に再生し、約 2.2 秒待って対象ピースを正解位置へ自動移動させる。続けて `basic_tut_12.mp3`（index 11, 締め）→ `basic_tut_13.mp3`（index 12, 締めの一言）を再生し、音声と移動アニメーションの両方が終わってから基本チュートリアルを終了する。
