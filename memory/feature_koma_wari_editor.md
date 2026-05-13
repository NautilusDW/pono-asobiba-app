---
name: コマ割アニメーションエディタ (= 2026-05-13 MVP + 拡張)
description: tools/koma-wari-editor.html — キャラクターアニメーションをコマ割で作るエディタ。 配置/scale/rotate/マスクで各フレームを編集し、 manifest + WebP ZIP として出力。 ZIP を assets/animations/<id>/ に配置 → js/animation-player.js 経由で quizland 等から再生。 既存 playStagePonoHooray は manifest が無ければ旧 dance_hooray.webp + CSS crop に fallback で段階的移行
type: feature
---

# コマ割アニメーションエディタ (2026-05-13)

## 概要
- 単一 HTML: `tools/koma-wari-editor.html` (約 2500-2700 行)
- 共通ライブラリ: `js/animation-player.js` (78 行、 manifest 駆動の再生)
- アプリ統合: `quizland/index.html` の `playStagePonoHooray` に新経路 + 既存 fallback

## 配置先 (= ZIP 解凍コピー先)
```
d:\AppDevelopment\pono-asobiba-app\assets\animations\<animId>\
  manifest.json
  frame_001.webp
  frame_002.webp
  ...
```

## 実装済機能 (= 2026-05-13 時点)

### コア
- 素材 drag-drop 読み込み (FileReader)
- ステージ 1024×1024 canvas + drag-move (X/Y)
- 8 ハンドル resize (uniform scale)
- rotate ノブ (top-center 上)
- 右ペイン X/Y/Scale/Rotation/Duration 双方向数値入力
- Timeline strip (= drag-drop 並び替え + 各コマ duration 入力)
- FPS スライダー (1-30) + loop / pingPong
- ▶ ⏸ ⏹ 再生

### 編集補助
- Ctrl+C / Ctrl+V でコマコピペ (= ペーストは末尾)
- Ctrl+ドラッグで複製挿入
- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)、 最大 50 件履歴

### 素材管理
- 素材ライブラリ (= 元素材プール)
- 調整済みストック (= 「✂️ 調整」 モーダル経由 でサイズ統一して保管)
- ステージから直接ストックへ (= 「📦 この状態をストックへ」)
- 素材 + ストック 共通の「× 削除」 (= 参照中 frame があれば確認 + 一緒に削除)

### ガイド
- 中央十字 / 三分割 / 16×16 グリッド / セーフエリア
- 上部 Top Bar の📐ガイド トグル 4 つ、 localStorage 保存

### マスク
- 右ペイン「🎭 マスク」 セクション、 モード ON/OFF
- ON 時にステージ drag で frame.maskRects に矩形追加 (= 入力画像座標、 rotation/scale 補正済)
- 描画時に一時 canvas で alpha 0 化 → 元 frame に焼き付け
- 矩形一覧 + 個別 × 削除

### プロジェクト管理
- **IndexedDB** (= idb-keyval CDN) で複数プロジェクト保管
- Top Bar 「📁 プロジェクト ▼」: 新規 / 上書き / 別名で / 複製 / 名前変更 / 削除 / 一覧
- 30 秒ごと自動保存
- localStorage 自動保存 (= 1 件) も並走

### ファイル経路
- 「📥 ファイルから読み込み」 (= JSON ファイル選択)
- 「📤 ファイルとしてエクスポート」 (= JSON ダウンロード)
- 「📦 ZIP エクスポート」 (= manifest.json + frame_*.webp、 JSZip CDN)

## アプリ側統合 (= quizland)

`js/animation-player.js`:
```js
window.AnimationPlayer.play(imgEl, animId, { onComplete });
```

`quizland/index.html` `playStagePonoHooray()`:
- 新経路: `AnimationPlayer.play('pono-banzai-bust', ...)` を試す
- fallback: handle === null なら旧 `dance_hooray.webp + is-hooray CSS crop` (= 完全保持)

→ `assets/animations/pono-banzai-bust/manifest.json` が無い間は既存挙動維持、 配置で自動切替

## 出力フォーマット

`manifest.json` (再生用、 軽量):
```json
{
  "schema": "pono-anim-manifest-v1",
  "id": "pono-banzai-bust",
  "fps": 12,
  "loop": true,
  "frames": [
    {"file": "frame_001.webp", "duration": 100},
    {"file": "frame_002.webp", "duration": 100}
  ]
}
```

- 個別 WebP (= アルファ保持、 quality 0.9)
- 容量目安: 1024×1024 / 12 frames / WebP 0.9 ≒ 30-50KB/frame → 1 アニメ約 500KB

## 既知の課題 + Phase 4 以降

- マスクの rotation 補正は scale/translate のみ対応、 rotation 時の挙動は要検証
- ZIP 解凍 → assets/animations/ 配置の PowerShell 自動化スクリプト未作成
- 他ゲーム (= maze / drawing / writing 等) への AnimationPlayer 適用は未実施

## 関連 Plan ファイル
- `C:\Users\surfe\.claude\plans\jolly-greeting-barto.md` (= 2026-05-13 立案、 ユーザー承認済)

## 関連 commit (= 2026-05-13)
- `0a59318` — Phase 1 MVP (= 単一 HTML 1483 行 + animation-player.js + quizland 統合)
- `03b827a` — 重複ドロップ fix
- `cc912ec` — drag-reorder + Ctrl+C/V + Ctrl-drag + ストック領域
- `5cab79b` — ガイド線 4 種
- `20a609e` — Undo/Redo + ステージから自由ストック
- `d7e5a49` — 素材 + ストック 削除統一
- `9fe91a3` — IndexedDB プロジェクト管理 + マスク機能

## How to apply (= 次回セッションで参照)
- ユーザーがエディタの追加機能を要望した場合、 まず本ファイルで現状把握
- 新規アニメ作成フロー: エディタで作成 → ZIP エクスポート → 解凍 → `assets/animations/<id>/` 配置 → quizland 等で再生確認
- マスクの rotation 補正バグ等の既知課題は本ファイルに追記
