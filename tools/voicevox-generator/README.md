# VOICEVOX 音声生成ツール (quizland 用)

quizland のクイズ全 181 問 × 5 音声 = 計 907 ファイル分の音声を、ローカル VOICEVOX エンジン経由で一括生成するためのブラウザ HTML ツール一式。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `voicevox-generator.html` | メイン HTML ツール (ブラウザで開く) |
| `voicevox_user_dict.csv` | 子供向けクイズ頻出語のアクセント辞書 (52 語、UTF-8 BOM なし) |
| `README.md` | このファイル |

発注書本体 (どのファイル名でどんな text を読ませるか) は `docs/quizland-voicevox-order/` 側:

- `SAMPLE-PREVIEW.md` (Q01〜Q21、フォーマット確認用)
- `COWORK-TEST-ORDER.md` (27 ファイル、話者試聴・確定用)
- `ORDER-FULL.md` (全 907 ファイル本番用)

## 必要環境

- **VOICEVOX デスクトップ版** (https://voicevox.hiroshiba.jp/ から無料 DL)
  - エンジンが `http://localhost:50021` で待機している必要あり (デスクトップ版を起動しておけば自動)
- **モダンブラウザ** (Chrome / Edge / Firefox 推奨、`fetch` + `Blob` + `JSZip` CDN が動けば OK)
- (任意) ローカル HTTP サーバー — `file://` でも動くが、CORS が厳しい場合は `python -m http.server` 経由が安全

## VOICEVOX エンジンの起動

1. VOICEVOX デスクトップ版を起動する
2. 起動するとバックグラウンドで `http://localhost:50021` にエンジン API が立ち上がる
3. 何か一文を再生して動作確認しておくと安心 (CPU/GPU 初期化のため初回は数秒かかる)

> エンジンだけ単体で動かしたい場合は VOICEVOX ENGINE 単体配布版もあるが、デスクトップ版で十分。

## ツールの開き方

二択。どちらでも動く:

**A. file:// で直接開く (最短)**

`tools/voicevox-generator/voicevox-generator.html` をダブルクリック → ブラウザで開く。

**B. ローカルサーバー経由 (CORS が気になる場合)**

```powershell
cd d:\AppDevelopment\pono-asobiba-app\tools\voicevox-generator
python -m http.server 8080
# → http://localhost:8080/voicevox-generator.html
```

## ワンクリック起動 (Windows)

`start.bat` をダブルクリックするだけ:
- Python HTTP サーバーが自動起動 (port 8765)
- ブラウザで `http://localhost:8765/voicevox-generator.html` が自動オープン
- ウィンドウを閉じるとサーバー停止

### 注意
- Python 3 がインストールされていること (`python --version` で確認)
- 既にポート 8765 が使われている場合は警告表示後に終了
- 同じツールを別タブで開きたい時は、ブラウザのタブをハードリロード (Ctrl+Shift+R) で OK

## 使用フロー

### 1. エンジン接続確認

ツールを開くと一番上に「VOICEVOX エンジン接続確認」セクションがある。
- 既定エンドポイント: `http://localhost:50021`
- 「接続確認」ボタンで `/version` を叩いてエンジン稼働を確認
- OK が出れば次へ

### 2. 辞書を一括登録 (52 語)

`voicevox_user_dict.csv` をエンジンの **ユーザー辞書** に登録すると、子供向けクイズ頻出語の誤読 (頭高化など) がほぼ解消される。

VOICEVOX エンジン API には `POST /user_dict_word` があるので、HTML ツールから一括登録するか、以下のような PowerShell で一発登録できる:

```powershell
$csv = Import-Csv -Encoding UTF8 .\voicevox_user_dict.csv
foreach ($row in $csv) {
  $body = @{
    surface = $row.surface
    pronunciation = $row.pronunciation
    accent_type = [int]$row.accent_type
    priority = [int]$row.priority
  }
  Invoke-RestMethod -Method Post -Uri "http://localhost:50021/user_dict_word" -Body $body
}
```

> 辞書登録はエンジンプロセス内に保存されるため、エンジン再起動後も保持される。
> 登録済み一覧は `GET /user_dict` で確認可能。

### 3. サンプル生成 (2 話者比較)

- HTML ツール上で `q001_q.wav` 相当の文を 2 話者 (例: カリンちゃんノーマル + 別候補) で生成
- ブラウザ内 `<audio>` で試聴して話者を絞り込む
- 確定話者は `docs/quizland-voicevox-order/COWORK-TEST-ORDER.md` で「雨晴はう」が第一候補

### 4. 確定話者で 27 ファイル生成 → ZIP

- 話者を 1 つ確定 → 「全 27 ファイル生成」ボタン
- 内部で `/audio_query` → `/synthesis` を全 27 行に対して順次実行
- 完了後、JSZip で zip にまとめてダウンロード
- 27 ファイルを Cowork (制作協力者) に送って試聴 → OK ならフルへ

### 5. フル 907 ファイル生成 (本番)

- ツール上の発注書ソースを `COWORK-TEST-ORDER.md` から `ORDER-FULL.md` に切り替える
  (HTML 内で発注書配列を入れ替える / コピペで貼り直す等、現状ツールは 27 行ハードコード前提なので必要に応じて改修)
- 同じく一括生成 → ZIP
- 命名規則は `q{NNN}_{q|a|b|c|d}.wav` (3 桁ゼロパディング、q001〜q181)
- Q160 は同音異義の補足版 2 ファイル (`q160_a_alt.wav` / `q160_b_alt.wav`) を別途追加 → 計 907

> 大量生成時は VOICEVOX エンジンの CPU 負荷が高いので、ノート PC では数十分〜1 時間程度を見込む。

## 辞書 CSV の編集方法

`voicevox_user_dict.csv` は UTF-8 (BOM なし)、ヘッダ:

```csv
surface,pronunciation,accent_type,priority,note
```

| カラム | 内容 |
|---|---|
| `surface` | 表記 (ひらがな or カタカナ、quizland 上で書かれる形) |
| `pronunciation` | 発音 (全角カタカナ、VOICEVOX 公式仕様) |
| `accent_type` | アクセント核位置 (0=平板, 1=頭高, 2 以上=中高、モーラ数で上限) |
| `priority` | 0〜10 (大きいほど優先、quizland では 5=確定 / 3=要試聴) |
| `note` | 自由記述 (理由・要試聴マーク等) |

### 誤読語を見つけたら

1. 試聴 → 違和感のある語をメモ
2. NHK 日本語発音アクセント辞典 等で正解アクセントを確認
3. CSV に新規行を追加 (`priority=5` で確定、自信ない場合は `priority=3` + `note` に「要試聴」)
4. エンジンに再登録 (`POST /user_dict_word`、既存語は `PUT /user_dict_word/{word_uuid}`)
5. 該当ファイルを再生成

## アクセント詳細編集機能の使い方

VOICEVOX エンジンの `POST /audio_query` は、音素ごとの pitch / アクセント核を含む詳細クエリを返す。
HTML ツール内では返ってきた `accent_phrases` を JSON で表示・編集してから `/synthesis` に渡すことで、辞書だけで直せない局所的な抑揚も微調整可能。

典型的な使い方:
- 「な に い ろ」が 4 モーラとして認識されているか確認 (`mora` 配列の長さ)
- `accent` プロパティを直接編集 (例: 平板にしたいなら 0 に)
- `pitch` を 0.95〜1.05 で微調整して語尾の不自然な上がり下がりを抑える

詳しい仕様は VOICEVOX エンジン Swagger UI (`http://localhost:50021/docs`) を参照。

## LLM 補正の有効化方法

HTML ツールには Anthropic API キーを入れることで読み方を LLM 経由で補正する仕組みを将来追加予定 (現状は手動辞書 + accent_phrases 編集が中心)。

予定している運用:

1. ツール上の「LLM 補正」スイッチを ON
2. Anthropic API キー (`sk-ant-...`) を入力欄に貼る (sessionStorage 保存・git 管理外)
3. 各行の text を `claude-haiku` 等に投げて「VOICEVOX が誤読しがちな箇所を kana 表記に書き換える」前処理をかける
4. 補正後 text を `/audio_query` に渡す

注意:
- API キーは絶対に CSV や HTML 内にハードコードしない
- キーが必要ない単純な発注 (辞書で十分なケース) では LLM 補正を OFF にしてコスト節約

## トラブルシューティング

### CORS で `/audio_query` が落ちる

- VOICEVOX エンジンは既定で `Access-Control-Allow-Origin: *` を返すため通常 file:// でも動く
- ダメなら `python -m http.server 8080` で localhost 経由に切り替える
- それでもダメなら VOICEVOX 起動時に `--allow_origin "*"` オプションを明示

### エンジンが起動しない / `localhost:50021` に繋がらない

- VOICEVOX デスクトップ版を再起動
- ポートが他プロセスに奪われていないか確認 (`netstat -ano | findstr 50021`)
- ファイアウォール / アンチウイルスがブロックしていないか確認

### 生成音声が「な[に]いろ↑」と頭高で読まれる

- 辞書未登録 → `voicevox_user_dict.csv` を再登録
- 既存語が違うアクセントで登録済 → `GET /user_dict` で確認、`PUT /user_dict_word/{uuid}` で更新

### ZIP ダウンロードが途中で止まる

- ブラウザのメモリ上限に達している可能性 → 27 ファイルずつ分割して生成
- フル 907 ファイルを 1 zip にしないで、カテゴリ別 (order_color / count_total / ...) に分割推奨

### 話者によって読みが違う

- これは VOICEVOX の仕様 (各話者ごとに音響モデルが独立)
- アクセント核は辞書で揃えられるが、ピッチ/発音の癖は揃わない
- → 全 907 ファイルは必ず同一話者で生成 (`feature_quizland_voicevox_order.md` の方針)

## 関連ドキュメント

- 発注書本体: `docs/quizland-voicevox-order/{SAMPLE-PREVIEW,COWORK-TEST-ORDER,ORDER-FULL}.md`
- メモリ: `memory/feature_quizland_voicevox_order.md` (読み方ルール・命名規則・話者選定経緯)
- メモリ: `memory/feature_quizland_kurumi.md` (話者キャラ「リスのくるみちゃん」設計)
