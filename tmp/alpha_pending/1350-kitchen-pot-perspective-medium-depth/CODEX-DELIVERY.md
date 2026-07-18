# batch:1350-kitchen-pot-perspective-medium-depth

## 採用画像

- `boil_pot_perspective_raw.png`: GPT Image 2生成raw（1672 x 941）。
- `boil_pot_perspective_alpha.png`: 公式chroma helperで緑背景をsoft-matte／despill透過した原寸版。
- runtime: `assets/images/bento/cooking/boil/boil_pot_cold.png`（836 x 471 RGBA）。

## 参照画像

- `assets/images/bento/cooking/stove_base.webp`: カメラ角度・バーナー輪・五徳面の正本。
- 旧 `assets/images/bento/cooking/boil/boil_pot_cold.png`: 槌目銅胴・銀縁・木製取っ手・静水・水彩タッチのみ参照。

## 実装

- 鍋表示: width 76% / left 12% / top -1%。
- 水面・泡・波紋・投入食材の共通楕円: left 31.5% / top 15.2% / width 36.6% / height 33%。
- runtime URL: `boil_pot_cold.png?v=1350`。
- 既存のオレンジ2本炎 `heat-glow` は変更せず、top 69%へ配置。
- 1366 x 768沸騰画面を目視確認。鍋底・取っ手・水面・泡・五徳への接地、横overflow 0を確認。

## 最終生成プロンプト要約

コンロ背景をカメラとパースの正本にし、開口部・水面・胴下端をバーナー輪と同軸の楕円にする。旧鍋の材質と画風を保ちながら、浅鍋案より胴を約40%深くした中深さの茹で鍋を、均一な緑背景上に完全な輪郭と余白つきで描く。

生成方式: Codex組み込みGPT Image 2。
