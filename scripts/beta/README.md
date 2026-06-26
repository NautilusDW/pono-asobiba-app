# βテスト 配布物ジェネレータ

`scripts/beta/` 配下は、 ポノあそびば βテスト (10 家族規模、 期間 2 週間) のための fid 発行 + Google Forms prefilled URL + QR コード PNG を一括生成するスクリプト群です。

> このディレクトリの成果物 (`out/` 以下) は配布前提のものなので、 リポジトリには push しません。 `scripts/beta/.gitignore` で `out/` を除外しています。

---

## 1. 全体フロー

```
[Google Forms 中間/最終を作成]
        │
        │ formId / entry ID をコピー
        ▼
[gen_beta_fids.js]  ──▶  out/beta_fids.csv   (10 家族分の fid + 短縮 URL + 2 種の prefilled アンケート URL)
        │
        ▼
[gen_qr_codes.js]   ──▶  out/qr/<fid>.png    (1200x1200px, ECC=H, margin=8)
        │
        ▼
[チラシ/同意書/配布物にレイアウト]
```

---

## 2. 事前準備

### 2.1 Node.js
Node.js **18 以上** が必要。 (`node --version` で確認)

### 2.2 中間/最終アンケート (Google Forms) を作る

1. Google Forms で 2 つフォームを作成 (中間 3 問、 最終 12 問の構成は `CLAUDE.md` 内 βテスト統合プラン参照)
2. 各フォームに **fid 用の hidden field** を 1 つ追加 (短答テキスト、 必須にしない)。 タイトルは `fid` 推奨。
3. プレビューモードで 「事前入力したリンクを取得」 を選び、 fid 欄に適当な値 (例: `TEST00`) を入れて `リンクを取得`
4. 取得した URL から `formId` と `entry.XXXXXXXXXX` を控える。
   - 例: `https://docs.google.com/forms/d/e/1FAIpQLSe-xxxxx/viewform?usp=pp_url&entry.1234567890=TEST00`
     - `formId` = `1FAIpQLSe-xxxxx`
     - `entry`  = `entry.1234567890`
5. 中間/最終それぞれ別 formId なので **混同しないように管理**。

参考: [Google Forms - 事前入力リンクの取得](https://support.google.com/docs/answer/2839588?hl=ja#zippy=%2C%E5%9B%9E%E7%AD%94%E3%82%92%E4%BA%8B%E5%89%8D%E3%81%AB%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%9F%E3%83%AA%E3%83%B3%E3%82%AF%E3%82%92%E5%85%B1%E6%9C%89%E3%81%99%E3%82%8B)

### 2.3 qrcode パッケージ (QR 生成のみで必要)

`gen_beta_fids.js` は標準ライブラリのみで動きますが、 `gen_qr_codes.js` は QR ライブラリが必要です:

```bash
npm install qrcode --no-save
```

`--no-save` を付けると `package.json` を汚しません。 プロジェクトの dev 依存に正式追加したい場合は `--save-dev` でも OK (チームと相談)。

---

## 3. 実行

### 3.1 fid + URL 一括発行

```bash
node scripts/beta/gen_beta_fids.js \
  --count 10 \
  --mid-form-id   1FAIpQLSe-MID-xxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --mid-entry     entry.1234567890 \
  --final-form-id 1FAIpQLSe-FINAL-xxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --final-entry   entry.0987654321
```

オプション一覧は `node scripts/beta/gen_beta_fids.js --help` を参照。

**出力例:** `out/beta_fids.csv`

```csv
family_no,fid,beta_url,mid_survey_url,final_survey_url
1,K7M3PQ,https://pono.kodama-no-mori.com/b/K7M3PQ,https://docs.google.com/forms/d/e/1FAIpQLSe-MID-xxxxxxxxxxxxxxxxxxxxxxxxxxx/viewform?usp=pp_url&entry.1234567890=K7M3PQ,https://docs.google.com/forms/d/e/1FAIpQLSe-FINAL-xxxxxxxxxxxxxxxxxxxxxxxxxxx/viewform?usp=pp_url&entry.0987654321=K7M3PQ
2,W4XR82,https://pono.kodama-no-mori.com/b/W4XR82,...,...
3,H9NTC5,https://pono.kodama-no-mori.com/b/H9NTC5,...,...
```

**fid の仕様:**
- 6 文字 base32 (使用文字: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` の 31 種)
- `0` / `O` / `1` / `I` / `L` を除外 (チラシ手書き/口頭読み上げの誤認回避)
- 既存 `out/beta_fids.csv` があれば自動でロードし、 既出 fid と衝突しないように再抽選

**追加発行 (例: 後から 5 家族増やしたい)** は同じコマンドを `--count 5` で再実行すれば、 既存 CSV に追記されます (family_no も連番継続)。

### 3.2 QR コード一括生成

```bash
node scripts/beta/gen_qr_codes.js
```

オプションを変えたい場合:

```bash
node scripts/beta/gen_qr_codes.js --in out/beta_fids.csv --out-dir out/qr
```

**出力例:**

```
out/qr/
├── K7M3PQ.png
├── W4XR82.png
├── H9NTC5.png
└── ...
```

各 PNG は **1200x1200px / 余白 8 module / 誤り訂正レベル H**。 60mm 角で印刷する想定なので、 印刷会社の入稿仕様 (RGB 可) でそのまま渡せます。

---

## 4. 印刷時の注意

| 項目 | 推奨 | 理由 |
| --- | --- | --- |
| QR サイズ | **最小 25mm 角**、 標準 30-40mm | スマホ標準カメラで読める下限 |
| 余白 (quiet zone) | **QR の周りに 4 module 以上の白** を確保 | QR 仕様上必須、 ぶつけると読み取り失敗 |
| 短縮 URL 併記 | **必ず `pono.kodama-no-mori.com/b/<fid>` をテキストで併記** | QR が読めない/カメラを向けにくい家庭向けフォールバック |
| fid 併記 | **fid 単体も大きめに印刷**(例: `K7M3PQ`) | 同意書/問い合わせメールに書いてもらう用 |
| 色 | **黒文字×白背景** が最も読みやすい (本スクリプトのデフォルト) | カラフルな QR は環境光で読めない事故が多い |
| 印刷紙 | **マット紙** 推奨 | グロス紙は反射で読み取りミスが増える |

チラシのレイアウト例 (1 家族 1 枚配布):

```
+-------------------------------------+
|  あなたの fid (家族番号)             |
|                                     |
|        K7M3PQ                       |  ← 36-48pt
|                                     |
|  ┌─────────────────┐                |
|  │                 │                |
|  │      [QR]       │   ← 30mm 角   |
|  │                 │                |
|  └─────────────────┘                |
|                                     |
|  https://pono.kodama-no-mori.com/  |
|  b/K7M3PQ                           |
|                                     |
|  (アンケート URL は同梱の保護者向け |
|   メール本文 or 同意書を参照)       |
+-------------------------------------+
```

---

## 5. ファイルの取り扱い

- `out/beta_fids.csv` は **個人情報ではない** が、 βテスト参加家庭に紐付く識別子なので、 リポジトリには push しない (`scripts/beta/.gitignore` で除外済)
- アンケート集計時は Google Forms 側で `fid` 列を必ず参照し、 家族番号→ fid のマッピング表 (= この CSV) と突合する
- βテスト終了後 (2026-12-31 まで) に CSV を削除し、 fid 自体も localStorage/IndexedDB から expire させる (60 日 TTL 実装側責務)

---

## 6. トラブルシューティング

### fid が衝突した
- スクリプトは既存 CSV を読んで再抽選するので通常は問題なし
- 数百万件規模で衝突が頻発するなら `FID_LENGTH` を 7 に上げる (10 家族ではまず不要)

### Google Forms の entry ID が分からない
- フォーム編集画面の **「事前入力したリンクを取得」** から取得 (上記 2.2 参照)
- entry ID は **フォームの設問順を変えても固定** なので、 一度取れば再利用可能

### `npm install qrcode` を入れたくない
- `gen_qr_codes.js` のみ動かない (fid 発行は問題なし)
- 代替: CSV を Excel/Numbers に取り込み、 オンラインの QR ジェネレータ (例: qr.io) で beta_url をまとめて生成する手作業も可
- ただし 10 家族なら `qrcode` を入れる方が圧倒的に速い

### CSV のカラム順が変わった/壊れた
- `gen_beta_fids.js` は既存ヘッダが期待値と違うと警告を出して追記する
- 壊れた場合は `out/beta_fids.csv` を一旦削除して再生成 (家族番号がリセットされるので注意)

---

## 7. 関連

- `CLAUDE.md` 内 「βテスト統合プラン」 セクション (期間/規模/同意/go-no-go 基準の正本)
- アプリ側の fid 受け取り実装は `?fid=XXXXXX` → localStorage 保存 → URL から param 除去 → IndexedDB 二重保存 (期限 60 日)
- 保護者ゲート: 右上歯車 (opacity 0.15) を 3 秒長押し + 二桁加算クイズ

---

## 8. Markdown → HTML 変換 (`md_to_html.js`)

βテスト配布物の Markdown (チラシ / 同意書 / 保育園リクエスト / Q&A / Google Forms テンプレート) を、 **印刷向けの単体 HTML** にまとめて変換するスクリプトです。 ブラウザの 「印刷 → PDF として保存」 で A4 PDF を作って、 そのまま入稿/配布に回す運用を想定しています。

### 8.1 何が出るか

- 出力先: **`docs/beta/_html/<basename>.html`** (元のディレクトリ構造は無視してフラット配置)
- 1 ファイル 1 HTML (`<!DOCTYPE html>` から `</html>` まで自己完結 / 外部 CSS なし)
- 印刷向けインライン CSS 入り:
  - 日本語フォントスタック (`Noto Sans JP` / `Hiragino Sans` / `Yu Gothic` / `Meiryo`)
  - `@page { size: A4; margin: 15mm }` で A4 縦印刷
  - 落ち着いたネイビー (`#1a4d7a`) 系の配色 (赤や原色は使わない)
  - 見出しのリズム / リスト / テーブル / コードブロックを最低限整形
  - `h1` 単位で `page-break-before: always` (最初の h1 を除く)
  - `<hr class="page-break">` を入れれば任意位置で改ページ可能

### 8.2 デフォルト 6 ファイルを一括変換

```bash
node scripts/beta/md_to_html.js
```

引数なしで実行すると以下の 6 本を変換します:

| 入力 | 出力 |
| --- | --- |
| `docs/beta/google_forms_template.md` | `docs/beta/_html/google_forms_template.html` |
| `docs/beta/google_forms_setup_guide.md` | `docs/beta/_html/google_forms_setup_guide.html` |
| `assets/beta/parent_flyer.md` | `docs/beta/_html/parent_flyer.html` |
| `assets/beta/daycare_request.md` | `docs/beta/_html/daycare_request.html` |
| `assets/beta/daycare_qa.md` | `docs/beta/_html/daycare_qa.html` |
| `assets/beta/consent_form.md` | `docs/beta/_html/consent_form.html` |

上書きは無確認で実施されるので、 Markdown 側を直してから **再実行すれば最新化** されます。

### 8.3 個別ファイルを指定して変換

```bash
node scripts/beta/md_to_html.js path/to/file.md
node scripts/beta/md_to_html.js docs/beta/google_forms_template.md --out-dir docs/beta/_html
```

出力先はデフォルト `docs/beta/_html/` ですが、 `--out-dir` で差し替え可能です。

### 8.4 サポートする Markdown 要素

- 見出し `#` 〜 `######`
- 段落 (空行区切り) / 強調 `**bold**` / `*italic*` / インラインコード `` `code` ``
- コードブロック (` ``` ` で囲む / 言語指定可)
- 順序付き / 順序なしリスト (ネスト 2 階層まで)
- リンク `[text](url)`
  - 同一プロジェクト内の `.md` リンクは **自動で `.html` に書き換え**
  - 例: `[a](other.md)` → `<a href="other.html">a</a>`
- 水平線 `---`
- テーブル (`| a | b |` 形式 / 区切り行のアライン `:---`, `:---:`, `---:` 対応)
- 末尾 2 スペースで `<br>` (Markdown 標準)
- 1 行で完結する HTML タグ (例: `<div style="page-break-before: always"></div>`) は **そのままパススルー**

### 8.5 PDF にする

ブラウザ (Chrome / Edge / Firefox) で `docs/beta/_html/parent_flyer.html` を開き、 `Ctrl+P` → 「PDF として保存」 → 余白 「デフォルト」 → 用紙サイズ A4。 CSS の `@page` 指定で 15mm 余白が効くため、 ブラウザ側はデフォルトで OK です。

### 8.6 トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| 文字化け (â / ã / ¢ 等) | 入力 Markdown 自体の文字コードを確認。 必ず UTF-8 で保存 |
| HTML 内の `<` `>` が消える | 1 行で完結しない HTML タグはパススルーされない。 `<div>...</div>` を 1 行にまとめるか、 自前のパーサ拡張で対応 |
| 改ページ位置を制御したい | Markdown 内に `<hr class="page-break">` を入れる、 もしくは `h1` を増やす (h1 ごとに改ページが入る) |
| 印刷時の余白を変えたい | スクリプト先頭の `PRINT_CSS` 内 `@page { margin: ... }` を編集 |
