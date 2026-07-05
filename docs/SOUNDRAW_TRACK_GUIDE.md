# 🎵 SoundDraw で寝かしつけアプリ 3 曲を作るガイド

## 事前準備
- SoundDraw の **Artist Pro プラン $23.39/月** に登録 (WAV + stems 書き出し / Change Key / Change Tempo が有効になる最低ライン)
- 出力先ローカルフォルダ: `docs/audio/sounddraw_raw/` を用意
- 528Hz drone 合成は Web Audio API 側 (batch:940 の loop engine) で後段実施 → SoundDraw 素の wav を単体でアプリに埋めない前提で ToS 上 「派生物」 扱いにする

## 全曲共通の設定ルール (絶対に守る)
- **Length: 5 分固定** (300 秒、 上限)
- **Drums セクション: Off** (Very Low でも brush snare が混入するので Off 一択)
- **Bass セクション: Off** (Very Low 許容は曲 2 のみ、 528Hz drone との唸り回避)
- **Energy: Low** (曲 2 のみ Very Low)
- **Structure タブで最終セクションの 「Ending」 を削除 or Verse に差し替え** (デフォルトの自動 fade-out 15-20 秒を無効化しないと crossfade ループに使えない)
- **BPM は Change Tempo で数値指定 / Key は Change Key で強制** (SoundDraw は生成前後どちらでも slider 変更可)
- **楽器は 「Music Box を ON」 ではなく 「Melody セクションで Music Box プリセットを選ぶ」 動線** (SoundDraw の粒度は Melody / Chord / Backing / Drums / Bass の 5 セクション単位、 名指しトグルではない)
- **未改変配信禁止** → 必ずアプリで 528Hz drone layer + crossfade を追加して派生物化してから配信 (Artist Pro の商用ライセンス条項準拠、 stem 個別配布は禁止)
- **528Hz drone との beat 回避基準**: B4 (494Hz) 〜 C#5 (554Hz) の帯域に 3 秒以上 sustain する音が乗ったテイクは棄却 (528Hz と C5 の 4.75Hz beat は最も知覚しやすい帯域)

---

## 曲 1: もりのこもりうた (童謡的子守唄)

### SoundDraw UI 選択

| 項目 | 選択 |
|---|---|
| **Genre** | **Kids** (第一候補) / Ambient (第二) / Cinematic (最終手段) |
| **Length** | 300 秒 |
| **Mood** | Calm + Dreamy + Warm (3 個複合) |
| **Energy** | Very Low |
| **Melody** | Medium (童謡は旋律必須、 High は主張しすぎ、 Low は drone 化して曲 2 と被る) |
| **Drums** | Off (セクションごと無効化) |
| **Bass** | Off (セクションごと無効化) |
| **BPM (Change Tempo)** | **64 BPM 数値指定** |
| **Key (Change Key)** | **D major 強制** (曲 2 D dorian への tonic 接続) |
| **Instruments** | Melody: Music Box プリセット / Chord: Warm Pad or Felt Piano / Backing: Harp or Celesta / Drums セクション Off / Bass セクション Off |
| **除外必須** | Strings (Cinematic の Violin/Cello/Ensemble)、 Brass、 Synth Lead、 Electric Guitar、 Vocal Chop / Choir |

### 生成のコツ
Kids ジャンルは Music Box / Toy Piano / Glockenspiel が Melody dropdown に集約されていて童謡感の当たり率が Ambient の 3-4 倍。 Ambient から入って drone 寄りに 6 割振れる罠を回避できる。 Mood の Warm は Cinematic 経由で Strings を呼び寄せる副作用があるので、 Strings が出たら Warm を外して Dreamy + Calm の 2 個に絞る。

### 判定基準

**OK (全部満たす)**
- Music box または Celesta の高域キラキラが主旋律として聴こえる
- Pad が持続していて空白の恐怖感がない
- Drums / Percussion / Shaker が完全無音
- Bass 帯域が -30dB 以下
- 5 分間で 3-4 回同じ旋律が優しく循環している
- **B4〜C#5 に 3 秒以上 sustain する音がない** (528Hz drone との唸り回避)
- key が D major (Change Key で強制済みなら常に OK)

**reroll 必須 (どれか 1 つ)**
- Strings ensemble が前に出て cinematic 化
- Piano solo だけになって music box 要素ゼロ
- Melody が半音階跳躍で童謡感なし
- 途中で Energy が上がる展開
- C5 前後 (B4-C#5) に強い sustain がある

### 期待所要
**3-5 回生成想定** (Kids ジャンル採用で 1-2 回目で当たりやすい)。 5 回失敗したら Ambient → Cinematic の順で Genre 切替、 それでも失敗したら SUNO 版採用で SoundDraw 版は諦めて OK (両建て前提)。

---

## 曲 2: もりの つきよ (環境音ドローン)

### SoundDraw UI 選択

| 項目 | 選択 |
|---|---|
| **Genre** | **Ambient** (第一) / Cinematic (drone 寄りが出ない場合) |
| **Length** | 300 秒 |
| **Mood** | Peaceful + Dreamy (Calm / Warm 併用可、 Mysterious は不気味さで NG) |
| **Energy** | **Low** (Very Low は Melody まで消える) |
| **Melody** | **Very Low** (「聞こえるか聞こえないか」 の距離感が命) |
| **Drums** | Off |
| **Bass** | Off (第一) / Very Low (pad の warm 感が消える場合のみ許容) |
| **BPM (Change Tempo)** | tempo-less を狙う → 最低値 50 BPM 前後に固定 (SoundDraw に完全 tempo-less はないので実質最低値) |
| **Key (Change Key)** | **D dorian が dropdown にあれば選ぶ / なければ D minor で生成 → dorian っぽいテイク (III が長 3 度に聞こえる) を採用** |
| **Instruments** | Melody: Flute 系 or Ocarina 系プリセット (dropdown に該当あれば) / なければ Melody セクション自体を Off にして Chord の Pad だけで drone 化 / Chord: Ambient Pad or Warm Pad or Analog Pad / Backing: Celesta or Ethereal Voices (Choir 系プリセット) / Drums Off / Bass Off |
| **除外必須** | Piano (メロディ主張が曲 1 と衝突) / Guitar (アルペジオが刻みで drone 崩壊) / Percussion 全般 / Brass / Synth Lead / Vocal Chops |

### 生成のコツ
「Melody セクション自体を Off にする」 逃げ道が SoundDraw 運用の現実解。 SoundDraw のプリセットは音楽的に成立させようとしがちで、 Melody を Very Low にしても Flute 系が主張してくることがある。 その時は Melody セクションごと切って Chord の Pad + Backing の Celesta だけの 2 レイヤー drone に絞る。

### 判定基準

**OK**
- Drums が本当に無音か再検聴 (Ambient でも稀に percussive 混入あり)
- Melody が 「遠くで聞こえる」 距離感 (前に出てきたら NG)
- キーが D 系 (D dorian / D minor / D major いずれか、 A/C/D/E/G の音が主音)
- **B4〜C#5 に 3 秒以上 sustain する音がない**
- 曲 1 の 5 分ラストからの crossfade で違和感なし

**reroll 必須**
- Melody が前に出て 「音楽」 として成立してしまう
- Percussive 要素混入
- 短調で寂しい (dorian でなく完全 minor)
- Pad が high register (D5=587Hz 帯) で鳴っていて C 成分の唸りが出る

### 期待所要
**2-4 回**。 曲 3 曲中で最も当たり率が高い (drone は SoundDraw の得意分野)。

---

## 曲 3: ふくろうのおやすみ (アンビエントハープ)

### SoundDraw UI 選択

| 項目 | 選択 |
|---|---|
| **Genre** | **Kids** (Harp プリセットが集約されていて第一候補) / Ambient (第二) / Cinematic (harp が Ambient dropdown に無い場合の第三) |
| **Length** | 300 秒 |
| **Mood** | Dreamy (第一) + Peaceful 併用可 (Calm は曲 2 と被るので avoid) |
| **Energy** | Low (Very Low は harp arpeggio の推進感まで消える) |
| **Melody** | Low (Medium は曲 1 と被る、 Very Low は arpeggio が pad に埋もれる) |
| **Drums** | Off |
| **Bass** | Off (第一) / Very Low (許容) |
| **BPM (Change Tempo)** | **58 BPM 数値指定** |
| **Key (Change Key)** | **【重要判断】 A minor で生成 → 528Hz drone と C5 が 4.75Hz beat で唸る → B♭ minor に半音上げ (C → D♭5=554Hz に逃がして beat 消去) を推奨。 曲 2 D dorian からの接続は B♭ でも 「長 3 度下」 で違和感なし。 A minor 維持する場合は Web Audio 側の drone を 528Hz → 523.25Hz (純正 C5) に落として beat 自体を消す** |
| **Instruments** | Melody: Harp プリセット / なければ Celtic Instruments プリセット → なければ Pluck Synth (reverb 厚め) → 最終手段 Kalimba / Chord: Warm Pad or Ambient Pad / Backing: Celesta or Music Box + Wind Chime 系 / Drums Off / Bass Off |
| **除外必須** | Acoustic Guitar fingerpicking (硬い) / Percussion / Brass / Synth Lead |

### 生成のコツ
**Kids ジャンルは harp の nocturne 系プリセット当たり率が Celtic → Pluck Synth より高い可能性**があるので、 Ambient で harp が出ない → Kids ジャンル → Cinematic の順で fallback。 harp arpeggio は 「流れて」 いるが melody line として立ちすぎない状態が理想 (Melody Low の意図)。 Pluck Synth 代替時は reverb / hall preset を強めにかけて harp らしさを補う。

### 判定基準

**OK**
- Harp arpeggio が流れているが立ちすぎていない
- 終盤 30 秒がフェードアウトしすぎず音量が持続 (**Structure タブで Ending セクションを削除 or Verse に差し替え済み**)
- キーが A minor (or B♭ minor 移調版)
- **Harp arpeggio の C5 音が 2 秒以上 sustain するテイクは棄却** (528Hz drone との唸り)
- Length が 5 分近く確保できている

**reroll 必須**
- 自動 fade-out が残っていて loop 用に使えない (Structure タブ操作忘れ)
- C5 sustain が harp で頻発
- Percussive 要素混入
- Pluck Synth になった場合に digital 質感が抜けない (reverb で補えない場合は Genre 切替)

### 期待所要
**4-6 回**。 3 曲中で最も難易度高 (harp プリセット依存 + Key 判断 + fade-out 無効化)。 それでも失敗する場合は **SUNO 側で曲 3 のみ再生成**の fallback。

---

## SoundDraw で作った後の後工程

1. **書き出し前チェック**: Structure タブで Ending セクション削除済みか / Change Key / Change Tempo の設定が反映されているか / Length 300 秒か
2. **WAV DL** (Artist Pro 以上、 24bit/48kHz 推奨)
3. **Stems 分離書き出し** (Melody / Chord / Backing / Drums / Bass の 5 レイヤー個別)。 drone/pad を単独抽出して 528Hz drone との mix 微調整の保険にする
4. **配置**: `docs/audio/sounddraw_raw/{song1|song2|song3}/` に master.wav + stems/ で保存
5. **Claude に共有** → batch:940 の loop engine に 15/30/45 分 crossfade (8-15 秒 overlap) 設定で登録
6. **528Hz drone layer は Web Audio 側で常時継続** (曲間切り替わりで途切れないよう batch:940 実装済み前提)
7. **ライセンス note**: Artist Pro 契約下で商用配信可 / 528Hz drone との mix で 「派生物化」 して未改変再配布禁止条項を回避 / stem 個別配布は禁止

---

## user 判断待ちの点

1. **曲 3 の Key 選択 (最重要 / launch 前必須)**: (a) A minor 維持 + Web Audio drone を 528Hz → 523.25Hz (純正 C5) に変更して beat 消去 / (b) B♭ minor に半音移調して C5 を D♭5 (554Hz) に逃がす / (c) A minor + 528Hz のまま run し実機で唸りをユーザーテストで判定。 レビュアーは (a) or (b) を強く推奨。
2. **曲 1 の Genre 第一候補**: Kids ジャンル採用でよいか (SUNO 版との比較で 「童謡らしい旋律の跳ね」 が SoundDraw Kids で十分出るなら SUNO 版は不要になる可能性、 出なければ両建て継続)。
3. **stems 書き出しの ON/OFF 方針**: 3 曲全部で stems 書き出すか、 曲 2 (drone 主体で mix 調整余地大) のみか。 ストレージと後工程手間のトレードオフ。