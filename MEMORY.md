# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **デプロイ自動化 (Cloudflare Workers)**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commit で develop 自動 push → GitHub Actions が `wrangler deploy --env staging`
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報
- **文字書きシンプルモード復活 Phase 1 + UIリデザイン**: [memory/feature_writing_simple_mode.md](memory/feature_writing_simple_mode.md) — RPG化前のロジックを `writing/simple.html` として復活、左右分割レイアウト・RPGダークテーマ統一・妖精2体fixed常駐応援、Phase 2 (行選択+単語フェーズ) は未実装
- **迷路 画像ステージ Phase 1**: [memory/feature_maze_image_stage.md](memory/feature_maze_image_stage.md) — `?image=<name>` でAI生成画像背景+ポリライン歩行+カメラ追従。横画面前提。Phase 2 (エディタ・細線化) 未着手
- **迷路ラフ作成ツール**: [memory/feature_maze_rough_maker.md](memory/feature_maze_rough_maker.md) — `tools/maze-rough.html` で 32×18 タイルラフを描いて PNG 出力 → 生成 AI に「道の形を守って絵本風に」と一緒に渡すワークフロー
- **クリーンエッジスタジオ タイムライン再生**: [memory/feature_timeline_player.md](memory/feature_timeline_player.md) — 分割スプライトをID連番順に並べてFPS+各コマフレーム数で即時再生。スプライトカードはサムネドラッグで並び替え可、🎯ボタンで比較タブの元矩形にジャンプ
- **Layout System (`common/layout/`)**: [memory/reference_layout_system.md](memory/reference_layout_system.md) — WYSIWYG レイアウトエディタ + applier 共通モジュール。`LayoutSystem.init()` 4 行で opt-in、`?edit=1` でエディタ遅延ロード。ページ author docs は `common/layout/README.md`
- **Babble Voice System (Quizland)**: [memory/feature_babble_voice.md](memory/feature_babble_voice.md) — フクロウ博士のしゃべり声 (タイピング + Web Audio 合成)。owl preset = 年配おじいさん風、5母音フォルマント切替、6.2Hz ビブラート。`js/quizland-babble.js` + `quizland/index.html` の `setHakaseDialogue` 改修。キャラ別 preset 拡張ポイント (pono / hedgehog 将来用)
- **Quizland Opening Cinematic**: [memory/feature_quizland_opening.md](memory/feature_quizland_opening.md) — 6 パネル導入演出 (Ken Burns ドリー + ナレーション + 博士⇄ポノ会話 + babble + スキップ)。mode-btn → `playOpeningCinematic()` → `initGame()` の async 経路。仮素材は `OP_BG.png` 共有、本素材は `tmp/quizland-op-cinematic/CODEX-PROMPT.md` 経由で Codex に依頼

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 (Cloudflare Workers) 🚨🚨🚨

> **このプロジェクトは Cloudflare Workers で配信されている。Netlify は完全廃止済み。**
> Netlify という単語は二度と出さない (古いメモリ・ハンドオフドキュメントは過去のもの)。

#### 自動化フロー (develop)
1. `.git/hooks/post-commit` が develop ブランチで `git push origin develop` を実行 (バックグラウンド・flock ガード付き)
2. GitHub Actions (`.github/workflows/deploy.yml`) が `wrangler deploy --env staging` を実行
3. 数十秒で `https://pono-asobiba-staging.ndw.workers.dev/` に反映される

→ `git commit` するだけで staging に反映。Claude 側で `wrangler deploy` を手動実行する必要なし。

#### ブランチ運用ルール（厳守）
- **develop** = 開発・確認用。常用ブランチ。staging に自動反映
- **master** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけマージ
- **絶対に勝手に master へマージ・本番デプロイしない**

| ブランチ | 環境 | URL | 反映方法 |
|---------|------|-----|----------|
| develop | staging | `https://pono-asobiba-staging.ndw.workers.dev/` | commit → 自動 push → GH Actions |
| master  | production | `https://pono.kodama-no-mori.com/` (および `pono-asobiba-app.ndw.workers.dev`) | ユーザー明示指示時のみ手動 merge |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
# → GH Actions が wrangler deploy (production) を実行
git checkout develop
```

#### 緊急時の手動デプロイ (GH Actions 死亡時のみ)
```
wrangler deploy --env staging   # develop 内容を staging に
wrangler deploy                  # master 内容を production に
```

### 単一HTMLファイルWebアプリ設計パターン
- Web Audio APIを使えば外部音声ファイルなしで効果音を生成可能
- Google Fonts `Zen Maru Gothic` は子ども向けの丸みフォントとして適切
- 全ゲーム共通: `touch-action: none` を持つ親要素の内側に overlay を置かない

### 文字なぞり・書き順ガイド（確定アーキテクチャ）
- **AnimCJK SVGデータが最適解**: 教科書体ベースのスケルトンデータ
  - かな: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJaKana/{unicode}.svg`
  - 漢字: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJa/{unicode}.svg`
  - viewBox: `0 0 1024 1024`
- SVG構造: stroke shapes (`path[id]`) = 輪郭, median paths (`path[clip-path]`) = 中心線
- 判定: `getPointAtLength()`で60点サンプリング → 精度/カバレッジ/方向の3条件
- Hanzi Writerは明朝体ベースで教育向きでない → AnimCJK直接利用が正解

### iOS Safari タッチイベントの落とし穴
- `backdrop-filter` を持つ要素の**子要素にタッチが届かない**既知バグあり → 使用しない
- `touch-action: none` の親要素内の `touchend` で `e.preventDefault()` を呼ぶと、子要素の `click` 合成が抑制される
- 修正パターン: 親の touchend でボタンタップを除外 + ボタンに `touchstart` ハンドラを直接登録
- `youtube-nocookie.com` は iOS Safari のトラッキング防止でブロックされることがある → `www.youtube.com/embed` + `?playsinline=1` を使う

### ゲーム実装パターン
- **ブロック崩し** (`breakout/index.html`): overlay は `#app` 直下（game-wrap の外）に配置
- **つみき** (`stacking/index.html`): Matter.js使用、スタート画面廃止・ページ開いたら即startGame()
- **お絵描き** (`drawing/index.html`): OpenMoji CDN でスタンプ、`crossOrigin='anonymous'` 必須
- **もじかき** (`writing/index.html`): AnimCJK SVGデータでなぞり書き

### orchestrator.py の既知バグ
- `compress` コマンドが別プロジェクト (`storyboard-generator`) のパスを参照してしまう
- → 圧縮は手動で行う（このファイルを直接編集）

---

## Recent Errors

(エラー発生時に自動追記されます)

## Task Analysis History

### 2026-05-07T02:43:06Z - quizland OP cinematic 5 review fixes (re-entry guard, hoist DOM lookups, iOS audio via audioCtx, idempotent finish() cleanup, skipBtn focus)
- **タスク**: quizland OP cinematic 5 review fixes (re-entry guard, hoist DOM lookups, iOS audio via audioCtx, idempotent finish() cleanup, skipBtn focus)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 27
- **エラー数**: 4
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 9, "Read": 8, "Grep": 3, "ToolSearch": 1, "Agent": 6}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T02:36:06Z - layout-editor.js enable() の _currentLayoutData に __savedAt が残るランドマイン修正
- **タスク**: layout-editor.js enable() の _currentLayoutData に __savedAt が残るランドマイン修正
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 56
- **エラー数**: 1
- **検出された良いパターン**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 13, "Glob": 7, "Read": 7, "ToolSearch": 1, "Write": 7, "Agent": 21}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T02:27:41Z - babble owl voice 無音バグ修正 (peakGain 0.10->0.5, bpfQ 8->3.5, osc2Mix 0.35->0.5) + sw v819->820 を staging にデプロイ。並行作業 (quizland/index.html cropMiss + 絵文字除去) は stash/pop で保持、rebase 後 push、GH Actions deploy success
- **タスク**: babble owl voice 無音バグ修正 (peakGain 0.10->0.5, bpfQ 8->3.5, osc2Mix 0.35->0.5) + sw v819->820 を staging にデプロイ。並行作業 (quizland/index.html cropMiss + 絵文字除去) は stash/pop で保持、rebase 後 push、GH Actions deploy success
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 7
- **エラー数**: 1
- **検出された良いパターン**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 3, "Read": 3, "Grep": 1}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T02:21:47Z - quizland-babble.js owl preset 無音バグ修正 (peakGain 0.10->0.5, bpfQ 8->3.5, osc2Mix 0.35->0.5) + sw.js 819->820
- **タスク**: quizland-babble.js owl preset 無音バグ修正 (peakGain 0.10->0.5, bpfQ 8->3.5, osc2Mix 0.35->0.5) + sw.js 819->820
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 16
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Agent": 15, "ToolSearch": 1}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T02:08:34Z - quizland babble v2 (年配フクロウ声) を staging にデプロイ: 並行エージェント作業 (cropMiss + 絵文字除去 + sw.js 817->819) を stash で退避し、自分の commit には babble v2 (js/quizland-babble.js + HAKASE_TYPING_DELAY_MS 60->105 + sw.js 816->817) のみを含めた。stash pop の sw.js コンフリクトは 819 (上位値) で解決して並行作業を保持。rebase 後 push 成功、GH Actions deploy success
- **タスク**: quizland babble v2 (年配フクロウ声) を staging にデプロイ: 並行エージェント作業 (cropMiss + 絵文字除去 + sw.js 817->819) を stash で退避し、自分の commit には babble v2 (js/quizland-babble.js + HAKASE_TYPING_DELAY_MS 60->105 + sw.js 816->817) のみを含めた。stash pop の sw.js コンフリクトは 819 (上位値) で解決して並行作業を保持。rebase 後 push 成功、GH Actions deploy success
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 46
- **エラー数**: 0
- **検出された良いパターン**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 11, "Glob": 7, "Read": 6, "ToolSearch": 1, "Write": 6, "Agent": 15}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T01:58:27Z - quizland-babble.js owl preset を声っぽい年配フクロウ風に刷新 (2osc+BPF+LFO、5母音フォルマント切替、index ベース決定論、cancelAll/onended で全ノード解放)
- **タスク**: quizland-babble.js owl preset を声っぽい年配フクロウ風に刷新 (2osc+BPF+LFO、5母音フォルマント切替、index ベース決定論、cancelAll/onended で全ノード解放)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 10
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Agent": 9, "ToolSearch": 1}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T01:57:40Z - quizland: HAKASE_TYPING_DELAY_MS 60->105 + sw.js CACHE_VERSION 818->819
- **タスク**: quizland: HAKASE_TYPING_DELAY_MS 60->105 + sw.js CACHE_VERSION 818->819
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 10
- **エラー数**: 0
- **検出された良いパターン**: なし
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 特になし
- **ツール使用統計**: {"Agent": 9, "ToolSearch": 1}
- **サマリ**: 成功タスク: 0個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T01:46:34Z - quizland babble 音声機能を staging にデプロイ (commit 7a156b9, post-commit auto-push 経由で GH Actions 成功、 _smoke.js は 0 byte で commit 除外、 OP assets と センサス.zip も unstaged のまま)
- **タスク**: quizland babble 音声機能を staging にデプロイ (commit 7a156b9, post-commit auto-push 経由で GH Actions 成功、 _smoke.js は 0 byte で commit 除外、 OP assets と センサス.zip も unstaged のまま)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 37
- **エラー数**: 0
- **検出された良いパターン**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 8, "Glob": 7, "Read": 4, "ToolSearch": 1, "Write": 5, "Agent": 12}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-05-07T01:43:11Z - quizland editor: Playtest ON 時も chip/吹き出しクリックを editor 選択優先に戻す (v801 リグレッション修正)、 sw v815→816、 reference_layout_editor_features.md 追記
- **タスク**: quizland editor: Playtest ON 時も chip/吹き出しクリックを editor 選択優先に戻す (v801 リグレッション修正)、 sw v815→816、 reference_layout_editor_features.md 追記
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 32
- **エラー数**: 0
- **検出された良いパターン**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 小さな単位で検証しながら進めた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 7, "Glob": 7, "Read": 4, "ToolSearch": 1, "Write": 5, "Agent": 8}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


