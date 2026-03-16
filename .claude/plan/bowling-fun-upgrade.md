# Implementation Plan: ボウリングゲーム爽快感アップグレード

## Task Type
- [x] Frontend (single-file HTML game)

## Current State Analysis
- Physics engine: custom circle-circle collision (no library)
- Input: slingshot drag → launch ball
- Scoring: pins knocked + pocketed (corner holes)
- Feedback: banner text + confetti on パーフェクト
- Audio: WebAudio API (bonk, launch, strike sounds)
- 30 pins, 6x5 grid layout

## Problem Analysis
ゲームとして「惜しい」理由:
1. **フィードバックが弱い** — ピンに当たった時の手応えが薄い（音は改善済みだが視覚が弱い）
2. **ゲームループが単調** — 毎回同じピン配置、ただ当てるだけ
3. **達成感が薄い** — スコアが何点でも「次」がない、ハイスコアも残らない
4. **演出不足** — ピンが倒れる/ポケットに入る瞬間のインパクトが足りない

## Implementation Steps

### Step 1: 画面揺れ（スクリーンシェイク）
ボールがピンに当たった時、衝突の強さに比例してcanvasを一瞬揺らす。
- `translate(randomX, randomY)` を数フレーム適用
- 強い衝突→大きく揺れる、弱い→小さく揺れる
- **Expected**: ぶつかった瞬間の「ドン！」感

### Step 2: ヒットストップ（一瞬スローモーション）
強い衝突時に physics を一瞬スローにする（3-5フレーム）。
- accumulator に入れる elapsed を一時的に 0.3倍にする
- 格ゲーの「ヒットストップ」効果
- **Expected**: 強打の瞬間が際立つ

### Step 3: ピンが弾ける時のパーティクル
ピンがknocked判定されたら、そのピンの位置から小さな星/キラキラが飛び散る。
- confetti system を再利用、ピン位置から小規模に発生
- 色はピンの色に近い暖色系
- **Expected**: 1本1本倒れるたびに視覚的報酬

### Step 4: ポケットイン演出強化
ポケットに入った瞬間に:
- 吸い込みアニメーション（スケール縮小）
- 「+10!」のようなスコアポップアップがその位置から浮き上がる
- ポケット音を鳴らす
- **Expected**: ポケットに入れる快感

### Step 5: コンボシステム
短時間に複数のピンを倒したらコンボ扱い。
- 300ms以内に連続knock → 2x, 3x... のコンボ倍率
- コンボ数に応じてスコア倍率＆バナー表示
- 「3コンボ！」「5コンボ！！」
- **Expected**: 一気に吹き飛ばす爽快感と戦略性

### Step 6: ハイスコア保存 (localStorage)
- ラウンドごとのスコアではなく、累計スコア or ベストスコアを保存
- 画面上部に表示
- **Expected**: リプレイモチベーション

### Step 7: ラウンド間の変化（おまけ）
- ラウンドごとにピン配置パターンをランダム変化
  - 逆三角形、ダイヤモンド、円形、ランダム散布
- ラウンド番号表示
- **Expected**: 飽きにくさ

## Priority Order (Impact × Effort)
1. **Step 1 (画面揺れ)** ← 最小工数で最大インパクト、10行程度
2. **Step 2 (ヒットストップ)** ← 5行程度、劇的に変わる
3. **Step 3 (ピンパーティクル)** ← confetti再利用で簡単
4. **Step 4 (ポケット演出)** ← スコアポップアップ追加
5. **Step 5 (コンボ)** ← ゲーム性に直結
6. **Step 6 (ハイスコア)** ← localStorage 1行
7. **Step 7 (配置変化)** ← おまけ

## Key Files
| File | Operation | Description |
|------|-----------|-------------|
| bowling/index.html | Modify | 全変更をこの1ファイルに |

## Risks and Mitigation
| Risk | Mitigation |
|------|------------|
| パーティクル増加でFPS低下 | パーティクル上限を設定、iOS実機テスト |
| スクリーンシェイクが酔う | 振幅を小さく(max 4px)、短く(5frame) |
| ヒットストップが操作の邪魔 | ball launch中は無効、衝突後のみ |
