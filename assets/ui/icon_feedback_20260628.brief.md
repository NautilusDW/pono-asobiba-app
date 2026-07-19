# icon_feedback_20260628.png — GPT Image 2 生成仕様

## 目的

`play.html` の bottom-nav に追加予定の 5 番目ボタン「ごかんそう」用アイコン。

現行の 4 ボタンストリップ (`assets/ui/title/title_bottom_nav_4_generated_20260626.webp`) の「せってい」ボタンと同じ、角丸の木枠タイル、クリーム色の内側面、太い焦げ茶の線、下ラベル入りの見た目に合わせる。

## 出力

| 種別 | パス | 仕様 |
|---|---|---|
| 通常 | `assets/ui/icon_feedback_20260628.png` | 64x64 PNG / RGBA / 背景完全透過 |
| 押下 | `assets/ui/icon_feedback_20260628_pressed.png` | 64x64 PNG / RGBA / 背景完全透過 |
| 通常・実表示用 | `assets/ui/icon_feedback_20260628_512.png` | 512x512 PNG / RGBA / 背景完全透過 |
| 押下・実表示用 | `assets/ui/icon_feedback_20260628_pressed_512.png` | 512x512 PNG / RGBA / 背景完全透過 |

生成は GPT Image 2 を使い、1024px 相当の raw から透過処理後に Lanczos で 64x64 / 512x512 へ縮小する。`play.html` の bottom-nav 表示では 64px 版を拡大すると低解像度に見えるため、512px 版を使う。

## デザイン

- モチーフ: 角丸の紙、太い短い鉛筆、アンケートらしい箇条書きの丸点と短い線。
- 枠: 「せってい」ボタンと同じ丸い木枠タイル。
- ラベル: 下部に `ごかんそう`。子ども向け UI 表記ルールに合わせ、ユーザーが漢字で指定しても画像内はかな表記にする。
- 押下版: 同じ絵柄のまま、内側が少し沈み、色がわずかに濃く見える状態。
- 背景: 完全透過。生成時は #00ff00 クロマキー背景を使い、後処理で alpha 抜き。

## 色・質感

- 木枠/鉛筆: warm honey wood (`#D9A55C` - `#C28A47`)
- 内側面/紙: cream (`#FAF1DC` - `#F2D8A8`)
- 線/ラベル: dark brown (`#6B4423`)
- 鉛筆芯: dark gray (`#3A2F2A`)

太めの丸線、木彫りおもちゃ風、手描き絵本調。外側の drop shadow は焼き込まない。

## 禁止

- `ごかんそう` 以外の文字、数字、ロゴ、透かし
- 漢字ラベル
- 写実、3D、金属光沢、ネオン、グロー、強すぎるグラデーション
- 背景色や模様の焼き込み

## 2026-06-28 生成メモ

- batch: `891-feedback-icon-label-pressed`
- raw: `tmp/alpha_pending/891-feedback-icon-label-pressed/`
- 通常/押下とも GPT Image 2 built-in workflow で生成。
- 参照: ユーザー添付の「せってい」ボタン、`title_bottom_nav_4_generated_20260626.webp`、既存 `button_bottom_005.png`。
- 2026-06-28: 実表示用に 512px 版を追加。1024px 透過中間から再縮小し、64px 版のアップスケールは使わない。
