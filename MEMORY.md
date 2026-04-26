# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **git push自動化**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commitフックでNetlify自動デプロイ
- **毎回デプロイ必須**: [memory/feedback_auto_deploy.md](memory/feedback_auto_deploy.md) — タスク完了時は確認せず自動でcommit+deploy
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報
- **文字書きシンプルモード復活 Phase 1 + UIリデザイン**: [memory/feature_writing_simple_mode.md](memory/feature_writing_simple_mode.md) — RPG化前のロジックを `writing/simple.html` として復活、左右分割レイアウト・RPGダークテーマ統一・妖精2体fixed常駐応援、Phase 2 (行選択+単語フェーズ) は未実装

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 🚨🚨🚨

> **`.git/hooks/post-commit` で自動化済み** — developブランチでコミットすると自動でNetlifyデプロイが実行される。
> 手動デプロイは不要。git pushも不要（ただしリモートバックアップのためpushは推奨）。
>
> 万が一フックが動かなかった場合の手動コマンド:
```
netlify deploy --dir . --alias develop
```

**`git push` だけでは絶対にダメ。`netlify deploy` がなければユーザーには何も届かない。**

#### ブランチ運用ルール（厳守）
- **develop ブランチ** = 開発・確認用。通常の作業はすべてここ。
- **master ブランチ** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけ反映。
- **絶対に勝手に master へマージ・本番デプロイしない。**

| ブランチ | URL | デプロイコマンド |
|---------|-----|----------------|
| develop | `develop--pono-asobiba.netlify.app` | `netlify deploy --dir . --branch develop --alias develop` |
| master  | `pono-asobiba.netlify.app` | `netlify deploy --dir . --prod` |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
netlify deploy --dir . --prod
git checkout develop
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

### 2026-04-26T22:26:56Z - v278u: 9 件 — 山道 caption 1 行化、Hinoka 認識+魔法相性 bustup を left に、フル画面妖精 3 体を勇者左 7-11% にクラスタ化、Hiragino フォント全箇所に DotGothic16 を先頭追加、'ザガン が しこんだ' → 'ザガン に かけられた'、Serina+Riefa セリフを 2 行に再構成、_showMemoryFlashback img を 100vw/100vh cover でフル画面化。sw 454
- **タスク**: v278u: 9 件 — 山道 caption 1 行化、Hinoka 認識+魔法相性 bustup を left に、フル画面妖精 3 体を勇者左 7-11% にクラスタ化、Hiragino フォント全箇所に DotGothic16 を先頭追加、'ザガン が しこんだ' → 'ザガン に かけられた'、Serina+Riefa セリフを 2 行に再構成、_showMemoryFlashback img を 100vw/100vh cover でフル画面化。sw 454
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 446
- **エラー数**: 13
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 114, "Grep": 70, "Bash": 119, "Edit": 132, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-26T04:01:06Z - v278t: セリナの低解像度 pixel art 3 枚 (front/back/side) を D:/ポノのおへや/.../セリナ低解像度_001-003.png から assets/images/characters/pixies/Serina/serina_pixel_*.png にコピー。writing/index.html と writing/simple.html の in-battle Serina img src を差替え、image-rendering:pixelated を適用、onerror で旧素材フォールバック。sw 453
- **タスク**: v278t: セリナの低解像度 pixel art 3 枚 (front/back/side) を D:/ポノのおへや/.../セリナ低解像度_001-003.png から assets/images/characters/pixies/Serina/serina_pixel_*.png にコピー。writing/index.html と writing/simple.html の in-battle Serina img src を差替え、image-rendering:pixelated を適用、onerror で旧素材フォールバック。sw 453
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 415
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 111, "Grep": 70, "Bash": 105, "Edit": 118, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T03:02:10Z - v278s: 5 件 — simple.html リーファをキャンバス左上、セリナ新規追加で左下、視聴覚イベント (visibility/blur/focus/pagehide) で BGM pause/resume、orientation portrait で 'よこむきに' 警告 + screen.orientation.lock 試行、メニュー→タイトル ボタン化、writing/index 側も妖精を per-fairy 絶対位置に。sw 452
- **タスク**: v278s: 5 件 — simple.html リーファをキャンバス左上、セリナ新規追加で左下、視聴覚イベント (visibility/blur/focus/pagehide) で BGM pause/resume、orientation portrait で 'よこむきに' 警告 + screen.orientation.lock 試行、メニュー→タイトル ボタン化、writing/index 側も妖精を per-fairy 絶対位置に。sw 452
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 401
- **エラー数**: 12
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 110, "Grep": 70, "Bash": 98, "Edit": 112, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T02:43:12Z - writing/simple.html を RPG ダークテーマに UI リデザイン: 左右分割レイアウト(左=ひらがな/カタカナタブ+文字選択, 右=大きいキャンバス), 背景/フォント/ウィンドウ枠を RPG モードと統一, ポノ装飾とヘッダー h1 削除, 妖精を fixed left/right 配置に変更, sw.js CACHE_VERSION 451
- **タスク**: writing/simple.html を RPG ダークテーマに UI リデザイン: 左右分割レイアウト(左=ひらがな/カタカナタブ+文字選択, 右=大きいキャンバス), 背景/フォント/ウィンドウ枠を RPG モードと統一, ポノ装飾とヘッダー h1 削除, 妖精を fixed left/right 配置に変更, sw.js CACHE_VERSION 451
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 71
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 2, "ToolSearch": 2, "Bash": 15, "Write": 3, "ExitPlanMode": 1, "Read": 19, "Grep": 5, "Glob": 6, "Edit": 18}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-26T02:37:14Z - v278r: 6 件 — caption box +2 文字 (66vw/472px)、フル画面で勇者 left:18% 専用 override、_playKagerouCounterAttack と _playHinokaRecognitionIntro で per-line bustup 切替 (onEnter)、タップ hint を caption box 内右下に統一、回想 caption を boxed style に。sw 450
- **タスク**: v278r: 6 件 — caption box +2 文字 (66vw/472px)、フル画面で勇者 left:18% 専用 override、_playKagerouCounterAttack と _playHinokaRecognitionIntro で per-line bustup 切替 (onEnter)、タップ hint を caption box 内右下に統一、回想 caption を boxed style に。sw 450
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 355
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 94, "Grep": 67, "Bash": 84, "Edit": 99, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T02:24:21Z - RPG前のシンプル文字書きモード復活: writing/simple.html を 29a657c から復元 + 妖精常駐応援UI(リーファ/ヒノカ + 吹き出しセリフ) + タイトル第3ボタン追加 + sw.js CACHE_VERSION 449 (Phase 1 = 単語フェーズ抜き)
- **タスク**: RPG前のシンプル文字書きモード復活: writing/simple.html を 29a657c から復元 + 妖精常駐応援UI(リーファ/ヒノカ + 吹き出しセリフ) + タイトル第3ボタン追加 + sw.js CACHE_VERSION 449 (Phase 1 = 単語フェーズ抜き)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 43
- **エラー数**: 1
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Agent": 2, "ToolSearch": 2, "Bash": 9, "Write": 1, "ExitPlanMode": 1, "Read": 10, "Grep": 2, "Glob": 6, "Edit": 10}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-26T02:07:13Z - v278q: 5 件 — climax caption 60vw/432px、fullscreen log を 60vw/400px (5 文字分広げ)、battle-mode log を v278o revert で left:48px、enemy-info top 通常 80% / 全画面 70%、volcano_lord size 通常 165px / 全画面 220px。sw 448
- **タスク**: v278q: 5 件 — climax caption 60vw/432px、fullscreen log を 60vw/400px (5 文字分広げ)、battle-mode log を v278o revert で left:48px、enemy-info top 通常 80% / 全画面 70%、volcano_lord size 通常 165px / 全画面 220px。sw 448
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 329
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 84, "Grep": 66, "Bash": 80, "Edit": 88, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T01:55:06Z - v278p: 回想シーン全体 (memory flashback → battle_last_01 → memory_04) を z:1798 の常駐黒幕で覆い遷移時の背景透けを解消。VOLCANO_MEMORY_BEATS[2] を memory_04 → memory_03 に差替えてホムラ歌の重複表示を解消。sw 447
- **タスク**: v278p: 回想シーン全体 (memory flashback → battle_last_01 → memory_04) を z:1798 の常駐黒幕で覆い遷移時の背景透けを解消。VOLCANO_MEMORY_BEATS[2] を memory_04 → memory_03 に差替えてホムラ歌の重複表示を解消。sw 447
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 319
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 84, "Grep": 66, "Bash": 77, "Edit": 81, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-26T01:49:54Z - v278o: ん完了で battleHitEnemy 発火 → 1400ms 後に combo、battle-log-window を split/full 両モードで半分幅+中央、フル画面妖精 bottom を 30% 専用 override、volcano_lord enemy-info を top 78%→65%。sw 446
- **タスク**: v278o: ん完了で battleHitEnemy 発火 → 1400ms 後に combo、battle-log-window を split/full 両モードで半分幅+中央、フル画面妖精 bottom を 30% 専用 override、volcano_lord enemy-info を top 78%→65%。sw 446
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 306
- **エラー数**: 11
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 82, "Grep": 64, "Bash": 72, "Edit": 77, "Glob": 5, "Agent": 2, "ToolSearch": 2, "Write": 1, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


