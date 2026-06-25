# Daily Quest フクロウ TTS 台本仕様書

> Phase 2-4 の実装エージェントが参照する TTS 台本確定 + 検証フロー。
> Project memory [[feedback_tts_whisper_verify_required]] の whisper 検証ループ必須に準拠。

## 台本一覧 (7 本)

| ファイル名 | テキスト (台本) | whisper キーワード (全一致必須) |
| --- | --- | --- |
| `pono_quest_maze_intro.mp3` | きょうは めいろで あそぼう！ | `めいろ` / `あそぼ` |
| `pono_quest_quizland_intro.mp3` | きょうは クイズランドで あそぼう！ | `クイズランド` / `あそぼ` |
| `pono_quest_puzzle_intro.mp3` | きょうは パズルで あそぼう！ | `パズル` / `あそぼ` |
| `pono_quest_oto_intro.mp3` | きょうは おとあそびで あそぼう！ | `おとあそび` / `あそぼ` |
| `pono_quest_bento_intro.mp3` | きょうは おべんとうで あそぼう！ | `おべんとう` / `あそぼ` |
| `pono_quest_cleared.mp3` | やったね！ ガチャで シール もらえるよ | `やった` / `ガチャ` / `シール` |
| `pono_quest_locked_modal.mp3` | きょうの ぼうけんを やったら ガチャ できるよ | `ぼうけん` / `ガチャ` |

> whisper の transcribe 結果は表記揺れする (カタカナ/ひらがな、 促音、 長音) ので、 `しーる`/`シール`、 `がちゃ`/`ガチャ` の双方を allow するキーワードマッチを推奨。 ` ` (半角スペース) は ignore して照合。

---

## TTS エンジン選定

### 第一候補: LP production worker `/api/ai-tts` (TTS3.1)

- project memory [[architecture]] / 既存ナレーション再生成フロー (v1563 シール帳ナレーション再生成等) で実績あり
- 直近の `pono_quest_*` 系新規生成はこのパイプラインに乗せる
- TTS3.1 はトーン/話速調整パラメタを持つ。 子供向け話速 (やや遅め) + 優しいトーンを明示指定

### 第二候補: VoicePeak ローカル

- ネットワーク不調や TTS3.1 配信制限時のフォールバック
- project memory のローカル VoicePeak フローを再利用

どちらを採用しても、 **検証 (whisper) は必須**。

---

## 生成パイプライン

```
1. 上記 7 本のテキスト + キーワードを TTS エンジンに投入
2. 出力 mp3 を assets/audio/narration/ にステージング
3. faster-whisper で 7 本全部 transcribe
4. キーワード全部一致を assert
   - 1 つでも欠ければ reject → 該当ファイル再生成 → step 3 戻る
5. 全本通過したら確定 commit
```

### whisper 検証コード (雛形)

```bash
# scratchpad に検証スクリプトを置いて回す
for f in pono_quest_*.mp3; do
  whisper "$f" --model small --language ja --output_format json
done
# 出力 JSON の "text" フィールドに対してキーワード grep
```

詳細雛形は project memory [[feedback_tts_whisper_verify_required]] の commit f7b8ba3 を流用。

---

## 話速 / トーン / 読み方の指示

子供 3-6 歳向け:

| 項目 | 指示 |
| --- | --- |
| 話速 | やや遅め (TTS3.1 速度パラメタ -10 〜 -15 目安) |
| トーン | やさしい、 ハキハキ、 笑顔が見える感じ |
| ピッチ | やや高め (フクロウ博士キャラなので落ち着いた高め) |
| 感情 | intro 系は明るい誘い、 cleared は祝祭的、 locked は優しい説明 |

### 読み方の細部

- 「あそぼう」 → 「あそぼーう」 と少し伸ばす (子供の歌うようなニュアンス)
- 「やったね！」 → 「!」 を強調、 軽く跳ねる
- 「もらえるよ」 → 「もらえるよー」 と語尾を上げる
- 「ぼうけん」 → 「ぼ」 にアクセント、 はっきり発音
- 「ガチャ」 → 「ガ」 を強く、 楽しさを乗せる

### 各台本の意図

- `*_intro.mp3` (5 本): 今日のお題を告知する開幕ナレ。 起動時 / お題モーダル表示時に再生。
- `cleared.mp3`: お題達成時の祝祭ナレ。 ガチャ枠解放を予告する。
- `locked_modal.mp3`: お題未達成のままガチャを開こうとした子供に出すモーダルナレ。 怒らず優しく誘導。

---

## ファイル配置

```
assets/audio/narration/
  pono_quest_maze_intro.mp3
  pono_quest_quizland_intro.mp3
  pono_quest_puzzle_intro.mp3
  pono_quest_oto_intro.mp3
  pono_quest_bento_intro.mp3
  pono_quest_cleared.mp3
  pono_quest_locked_modal.mp3
```

既存 narration ファイルと同じ階層。 命名 prefix は `pono_quest_` で統一して grep しやすくする。

---

## `common/narration.js` manifest 登録

既存 `common/narration.js` の manifest オブジェクトに以下 7 行を追加:

```js
// === Daily Quest (v1564+) ===
'pono_quest_maze_intro':     'assets/audio/narration/pono_quest_maze_intro.mp3',
'pono_quest_quizland_intro': 'assets/audio/narration/pono_quest_quizland_intro.mp3',
'pono_quest_puzzle_intro':   'assets/audio/narration/pono_quest_puzzle_intro.mp3',
'pono_quest_oto_intro':      'assets/audio/narration/pono_quest_oto_intro.mp3',
'pono_quest_bento_intro':    'assets/audio/narration/pono_quest_bento_intro.mp3',
'pono_quest_cleared':        'assets/audio/narration/pono_quest_cleared.mp3',
'pono_quest_locked_modal':   'assets/audio/narration/pono_quest_locked_modal.mp3',
```

manifest の正確な構造 (オブジェクトリテラル / array / function 戻り値) は phase 2 実装エージェントが `common/narration.js` を読んで確認し、 上記キー名を保ったまま既存スタイルに合わせて挿入。

---

## 再生フロー (実装エージェント向け参考)

| イベント | 再生するファイル |
| --- | --- |
| お題モーダル open (今日のお題提示) | `pono_quest_<questId>_intro` |
| 該当ゲームクリア → daily quest 達成検知 | `pono_quest_cleared` (祝祭演出と同期) |
| ガチャを開こうとしたが未達成 | `pono_quest_locked_modal` |

### 再生制御

- 子供が連打しても多重再生しない (既存 narration.js の play() 排他処理を使う)
- お題モーダル open 時は `intro` を 1 回だけ (再 open での再生はしない、 sessionStorage で gate)
- クリア演出と `cleared.mp3` は同期 (シール獲得アニメ + ナレ重ね)

---

## QA チェックリスト (phase 2-4 完了時)

- [ ] 7 本全部 whisper 通過
- [ ] 各 mp3 ファイルサイズが妥当 (40KB 〜 200KB 程度、 既存 narration と同レンジ)
- [ ] manifest 登録後、 admin / DevTools から `PonoNarration.play('pono_quest_maze_intro')` 等で個別再生可能
- [ ] iPad / iPhone 実機で 7 本通しテスト (Web Audio iOS lock 経験あり)
- [ ] BGM と被った時のミキシング確認 (既存 narration と同じ priority)
