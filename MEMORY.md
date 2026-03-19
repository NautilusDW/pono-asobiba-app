# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 17+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題

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

### 2026-03-19T10:13:53Z - 全ゲーム(11画面)にcommon/menu.jsを統合: ⚙️トグルメニュー+ホーム確認ダイアログ
- **タスク**: 全ゲーム(11画面)にcommon/menu.jsを統合: ⚙️トグルメニュー+ホーム確認ダイアログ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: ファイルを読まずに編集しようとした, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Edit": 168, "Bash": 54, "ToolSearch": 7, "TaskOutput": 1, "Grep": 76, "Read": 171, "Write": 3, "Glob": 3, "Agent": 15, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-03-19T10:13:19Z - aquarium/room に common/menu.js を適用: script追加+btnBack/btnBgm/ui-back CSS・HTML削除+initMenu()呼び出し追加
- **タスク**: aquarium/room に common/menu.js を適用: script追加+btnBack/btnBgm/ui-back CSS・HTML削除+initMenu()呼び出し追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Bash": 54, "Read": 172, "Edit": 169, "ToolSearch": 7, "TaskOutput": 1, "Grep": 74, "Write": 3, "Glob": 3, "Agent": 15, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-03-19T10:08:30Z - breakout/coloring に common/menu.js を適用: script追加+back-link CSS削除+initMenu()呼び出し
- **タスク**: breakout/coloring に common/menu.js を適用: script追加+back-link CSS削除+initMenu()呼び出し
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 175, "Edit": 169, "Bash": 60, "ToolSearch": 7, "TaskOutput": 1, "Grep": 66, "Write": 3, "Glob": 3, "Agent": 14, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


### 2026-03-19T10:08:29Z - wordmatchとstackingにcommon/menu.jsを適用（script追加、.back-link CSS削除、initMenu()呼び出し追加）
- **タスク**: wordmatchとstackingにcommon/menu.jsを適用（script追加、.back-link CSS削除、initMenu()呼び出し追加）
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 175, "Edit": 169, "Bash": 60, "ToolSearch": 7, "TaskOutput": 1, "Grep": 66, "Write": 3, "Glob": 3, "Agent": 14, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


### 2026-03-19T10:08:05Z - drawing/index.htmlにcommon/menu.jsを適用：script追加、back-link/btn-bgm CSS削除、initMenu({bgmToggle})呼び出し追加
- **タスク**: drawing/index.htmlにcommon/menu.jsを適用：script追加、back-link/btn-bgm CSS削除、initMenu({bgmToggle})呼び出し追加
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 175, "Edit": 169, "Bash": 60, "ToolSearch": 7, "TaskOutput": 1, "Grep": 66, "Write": 3, "Glob": 3, "Agent": 14, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


### 2026-03-19T10:08:01Z - puzzle にcommon/menu.js を適用: script タグ追加 + initMenu() BGM トグルコールバック統合
- **タスク**: puzzle にcommon/menu.js を適用: script タグ追加 + initMenu() BGM トグルコールバック統合
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 175, "Edit": 169, "Bash": 60, "ToolSearch": 7, "TaskOutput": 1, "Grep": 66, "Write": 3, "Glob": 3, "Agent": 14, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


### 2026-03-19T10:07:38Z - writing/index.htmlにcommon/menu.jsを適用: script追加+back-link/btn-bgm CSS・HTML削除+initMenu BGMコールバック統合
- **タスク**: writing/index.htmlにcommon/menu.jsを適用: script追加+back-link/btn-bgm CSS・HTML削除+initMenu BGMコールバック統合
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: なし
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 175, "Edit": 169, "Bash": 60, "ToolSearch": 7, "TaskOutput": 1, "Grep": 66, "Write": 3, "Glob": 3, "Agent": 14, "ExitPlanMode": 2}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。


### 2026-03-19T06:44:21Z - シャボン玉4点改善: タイトル順序+スコアリセット/ハイスコア+イベント結果表示+星座クールダウン
- **タスク**: シャボン玉4点改善: タイトル順序+スコアリセット/ハイスコア+イベント結果表示+星座クールダウン
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 16
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 175, "Edit": 142, "Grep": 62, "Bash": 100, "Agent": 5, "ToolSearch": 6, "WebFetch": 5, "TaskOutput": 1, "Write": 1, "Glob": 2, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-03-19T05:25:08Z - シャボン玉イベントUI改善: ボタン配置+おほしさま演出+円クリア+にじラベル+いきもの強化+UI重複防止
- **タスク**: シャボン玉イベントUI改善: ボタン配置+おほしさま演出+円クリア+にじラベル+いきもの強化+UI重複防止
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 500
- **エラー数**: 16
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"ToolSearch": 7, "WebFetch": 11, "Bash": 104, "Read": 177, "Edit": 132, "Grep": 59, "Agent": 5, "TaskOutput": 1, "Write": 1, "Glob": 2, "ExitPlanMode": 1}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


