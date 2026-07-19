# Codex Follow-up: Q82 つばめ — tsubame.png 飛んでない姿に再生成 (batch:15)

> **★ 最初に読んでください — オーケストレーター専任モード指示**:
>
> あなたは全体の進捗と品質管理に徹底し、 今後タスクは行わないでください。 実装はエージェントチームを組成して、 なるべく並列で行ってください。 レビューは必ずエージェント同士のクロスレビューをしてください。
>
> **画像生成モデルはすべて GPT Image 2 を使用することを厳格に守ってください。**
>
> **背景は不必要に白以外の色にしないでください。** alpha 抜きで多少色が残っても白なら目立たないが、 ピンク/紫など濃色が残ると視覚的に強烈に気になる。 どうしても白だと色かぶりして alpha 抜きがうまくいかない場合 (例: 雪・氷・白い動物など被写体が白い) のみ、 別の色を許容するが、 **その場合もなるべく薄い色** (淡いグレー、 淡い水色など) にしてください。

**作成日**: 2026-05-09
**バッチ ID**: `[batch:15-tsubame-still]`
**目的**: Q82 (debug ナンバー、 trivia Lv2「そらを とべない とりは どれ？」) の選択肢タイル `tsubame.png` を、 現状の **「翼を大きく広げて飛んでいる動的ポーズ」 から 「地面 or 木の枝に止まっている静止ポーズ」 に変更**する。 同問題の他選択肢 (`taka.png` / `hato.png` / `penguin.png`) はいずれも止まっているので、 つばめだけ動的構図で浮いており構図統一を取る。

---

## 問題コンテキスト (Q82)

| 項目 | 内容 |
|---|---|
| 問題 ID | Q82 (debug ナンバー、 trivia Lv2 #2) |
| カテゴリ | trivia (びっくり豆知識) |
| 問い | 「そらを とべない とりは どれ？」 |
| 選択肢 | `['タカ', 'ペンギン', 'ハト', 'ツバメ']` |
| 正解 | 「ペンギン」 (index 1) |
| 解説 | 「ペンギンは とべないけど うみを およぐのが とくいだよ！」 |
| ステージ画像 | `stage_trivia_four_birds_silhouette.png` (4 鳥のシルエット) |
| 採用日 | 既存 (sprint-13/14 配線済み) |

---

## 配置先

| 項目 | 値 |
|---|---|
| 出力ファイル名 | `tsubame.png` (既存ファイルを上書き) |
| 配置先 (Claude 側で配置) | `assets/images/quizland/illust/choice/tsubame.png` |
| 用途 | 選択肢タイル (choice) |

---

## イラスト要件

### 構図 (重要)
- **つばめが地面 or 木の枝に「止まっている」 静止ポーズ**
- カメラは横〜やや斜め前から、 全身が画面中央に大きく収まる
- 翼は**閉じている**、 または**軽く広げる程度** (折りたたみが基本)
- 二股に分かれた長い尾羽は依然として識別ポイントとして残す (止まり姿勢でも特徴が読めるように)

### 絶対避けること (NG)
- 空を飛んでいる構図 (羽を大きく広げ、 体が水平 / 風切羽がフルに広がっている動的ポーズ)
- 翼を完全に広げた羽ばたきポーズ
- 動きの線 (スピード線、 ぼかし、 風表現) を入れる
- 周囲に空・雲・背景空間を描く

### タッチ
- 既存 `assets/images/quizland/illust/choice/taka.png` / `hato.png` / `penguin.png` と**完全に同じ水彩絵本タッチ**で統一
- 柔らかい鉛筆風アウトライン、 暖色寄りパステル、 リアル過ぎないデフォルメ

### 色味
- 背 (頭〜翼〜尾) は**黒〜濃紺** (光沢のある藍色)
- 腹は**白**
- 顔 (額〜のど) は**赤茶 / ピンク赤**
- 全体的にやわらかいトーンで、 子供向けに親しみやすい

### サイズ・フォーマット
- **背景**: 透過 PNG (アルファ抜き必須)
- **解像度**: 1200×1200 程度、 RGBA PNG
- **切り抜き**: 個別 PNG として切り出し済で納品

---

## 既存資産との整合性

- 同 Q82 の他選択肢 (`taka.png` / `hato.png` / `penguin.png`) と**同じアートスタイル / 同じパレット感 / 同じ視点**で統一
- ステージ画像 `stage_trivia_four_birds_silhouette.png` のシルエットは「飛んでいる影」 ではなく既存版なので変更不要
- アルファチャンネル付き PNG (透過) で納品

### 参考画像
- `assets/images/quizland/illust/choice/taka.png` (タカ — 止まり姿)
- `assets/images/quizland/illust/choice/hato.png` (ハト — 立ち姿)
- `assets/images/quizland/illust/choice/penguin.png` (ペンギン — 立ち姿)
- `assets/images/quizland/illust/choice/tsubame.png` (現状の飛行姿、 これを止まり姿に置換)

---

## 命名規則と納品方法

| Output Filename | 配置先 (Claude 側で配置) |
|---|---|
| `tsubame.png` | `assets/images/quizland/illust/choice/tsubame.png` |

**合計 1 個別 PNG**

### 納品手順 (sw v802 batch:07c 以降の workflow)
1. Codex (or 画像生成 AI) が raw 画像を `tmp/alpha_pending/raw/15/` に保存 (新規バッチフォルダ)
2. **user が手動で alpha 抜き処理** → `tmp/alpha_pending/alpha/15/` へ移動
3. **Claude が `assets/images/quizland/illust/choice/tsubame.png` に copy 配置** (raw は `alpha/15/` に保持。 user 方針: raw は削除/移動せず保管)
4. Claude が `auto_optimize_image.py` 経由で 1200px 上限に最適化 (alpha 維持)
5. Claude が `image_manifest.json` の `tsubame` entry の `subject_detailed` を「止まり姿」 に更新 + `status` を `pending` → `generated` に再設定
6. Claude が `sw.js` CACHE_VERSION バンプ
7. **questions.js は触らない** (img 参照は `tsubame.png` のままで配線維持。 配置完了でそのまま反映)

---

## 検収観点

1. ✅ 既存 `taka.png` / `hato.png` / `penguin.png` と画風が揃う (水彩タッチ、 同じパレット)
2. ✅ つばめが**止まっている静止ポーズ** (地面 or 枝)、 翼は閉じる or 軽く広げる程度
3. ✅ 飛行構図 / 大きく広げた羽 / 動きの線が**ない**
4. ✅ alpha 抜き完了 (背景透過、 白い縁取り残りなし)
5. ✅ 二股の長い尾羽が識別ポイントとして読める (止まり姿でも)
6. ✅ 個別 PNG 切り出し済 (シートではなく単体ファイル形式で納品)
7. ✅ ≥1200×1200 程度
8. ✅ 子供向けにふさわしい優しさ (リアル過ぎる写真風 NG)

---

## 関連メタ

- カテゴリ: trivia (びっくり豆知識)
- レベル: 2 (ふつう)
- 問題 ID: Q82 (debug ナンバー)
- 発注日: 2026-05-09
- 既存 manifest entry: `image_manifest.json` の `tsubame` (status は `redo-pending` に更新予定)

---

## 完了報告

HANDOFF.md の Active セクションに append:

```
- 2026-05-09 - [batch:15-tsubame-still] Codex: Q82 つばめ choice 用 tsubame.png raw を tmp/alpha_pending/raw/15/ に納品完了。 alpha 抜き → 配置 → manifest 更新 → sw bump は user/Claude 側で対応予定。 (by Codex)
```
