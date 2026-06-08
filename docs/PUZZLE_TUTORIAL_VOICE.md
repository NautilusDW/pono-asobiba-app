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
これから、パズルの あそびかたを れんしゅうするよ。
```

## チュートリアル用ナレーション案

実装中の基本れんしゅう導線に合わせた短文。長すぎると操作待ちとずれるため、1 ファイル 1-2 文までにする。

## 実装済みファイル

2026-06-08 にユーザーが `D:\ポノのおへや\Puzzle\Tutorial` へ配置した wav 8 本を、以下の mp3 に変換して実装済み。

保存先: `assets/audio/puzzle/voice/`

| ファイル | 再生タイミング |
|---|---|
| `basic_tut_01.mp3` | 導入の `れんしゅうするよ` |
| `basic_tut_02.mp3` | `みる` ボタン横の `ながく おしてね` |
| `basic_tut_03.mp3` | `はなすと もどるよ` |
| `basic_tut_04.mp3` | `こまった ときに つかってね` |
| `basic_tut_05.mp3` | `つぎは、ひかっている ピースを タッチしてみよう` |
| `basic_tut_06.mp3` | `ピースを えらんだら、「ヒント」ボタンを おしてみよう` |
| `basic_tut_07.mp3` | ヒント使用後の `ひかったね。ピースの ばしょが わからないときは、ヒントを つかってね` |
| `basic_tut_08.mp3` | 練習終了の `これで れんしゅうは おしまい` |

実装メモ:

- `basic_tut_02.mp3` の再生中にすぐ `みる` を長押ししても、`basic_tut_02.mp3` が終わるまで次の案内へ進めない。
- 長押し中/長押し後の案内も、現在の音声が終わってから次の `basic_tut_03.mp3` / `basic_tut_04.mp3` を再生する。
- `basic_tut_05.mp3` は、対象ピースとオレンジの案内リングがキャンバスに実際に描画されたことを検知し、そこから約1秒見せてから吹き出し表示と同時に再生する。
- `basic_tut_05.mp3` が終わるまでは、光っているピースをタッチしても `basic_tut_06.mp3` へ進まない。
- `basic_tut_06.mp3` は、ピースを選んだ状態で `ヒント` ボタンの吹き出し表示と同時に再生する。
- `basic_tut_07.mp3` は、ヒントボタンのクリック処理で正解位置の発光が実際に描画された後、吹き出し表示と同時に再生する。
- `basic_tut_07.mp3` 開始後、対象ピースを正解位置へ自動で移動してはめる。音声とアニメーションが両方終わったら基本チュートリアルを自動終了する。
- `みる` ボタンは短く押してすぐ離しても、古い長押し案内キューを残さず、何度でも押し直して全体像を表示できるようにする。

### `tut_basic_01_intro`

```text
これから、パズルの あそびかたを れんしゅうするよ。
ゆっくりで だいじょうぶ。いっしょに やってみよう。
```

### `tut_basic_02_peek_press`

```text
まずは、「みる」ボタンを ながく おしてみよう。
```

### `tut_basic_03_peek_release`

```text
はなすと、パズルに もどるよ。
```

### `tut_basic_04_peek_hint`

```text
こまった ときに つかってね。
```

### `tut_basic_05_select_piece`

```text
つぎは、ひかっている ピースを タッチしてみよう。
```

### `tut_basic_06_hint_press`

```text
ピースを えらんだら、「ヒント」ボタンを おしてみよう。
```

### `tut_basic_07_hint_done`

```text
ひかったね。
ピースの ばしょが わからないときは、ヒントを つかってね。
```

### `tut_basic_08_finish`

```text
これで れんしゅうは おしまい。さあ、パズルで あそぼう。
```

## 生成時の注意

- Google AI Studio 側では「Speech to Text」ではなく、音声を作る「Text to Speech / Speech generation」を使う。
- AI Studio の音声系ツールは通常チャットの History と同じように保存されない可能性があるため、speaker / Scene / Sample Context / 原稿はこのファイルを正本にする。
- ひらがな多めにして、ボタン名だけ「みる」「ヒント」のようにカギ括弧で読む。
- 句点ごとに自然な短い間を入れる。必要なら `[short pause]` を英文指示側に追加して調整する。
- 声はやさしいが、テンションを上げすぎない。子どもに指示が届く、落ち着いた案内役にする。
