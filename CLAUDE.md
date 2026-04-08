# Self-Evolving Framework

このプロジェクトには Self-Evolving Framework が統合されています。
タスク完了時に自動で学習ループを回し、ベストプラクティスの抽出と難易度調整を行います。

---

## 🚨 AGENT/SKILL FIRST RULE (最上位・他の全ルールに優先)

**ユーザー指示を受けたら、コードに触る前に必ず以下のフレーズスキャンを実行すること。**
このルールを見逃すと過去のセッションで何度も怒られている。**絶対に無視しないこと。**

### STEP 1: フレーズスキャン（必須）

以下のいずれかにマッチしたら **AGENT MODE** に突入：

| カテゴリ | トリガーフレーズ（部分一致でOK） |
|---|---|
| フルループ | `自律で` `全自動で` `勝手に` `任せた` `任せる` `まかせ` `丸投げ` |
| 調査 | `リサーチ` `調査` `調べて` `徹底的に` `深く` `探して` `洗い出して` |
| レビュー | `レビュー` `チェックして` `確認して`（コード対象） `見直して` |
| 計画/設計 | `計画` `プラン` `設計` `アーキテクチャ` `方針` |
| セキュリティ | `セキュリティ` `脆弱性` `認証` `ユーザー入力` |
| テスト | `テスト走らせて` `E2E` `動作確認して` `回して` `TDD` |
| 品質 | `死コード` `リファクタ` `掃除` `クリーンアップ` `重複` |
| ビルド | `ビルドエラー` `型エラー` `コンパイル` |

### STEP 2: 対応表でエージェント選択

| トリガー | 呼ぶべきもの |
|---|---|
| 自律/全自動/任せた/丸投げ | **フルループ**: `everything-claude-code:planner` → 実装 → `everything-claude-code:code-reviewer` → （必要なら `e2e-runner`） |
| リサーチ/徹底的に調べて | `Explore` subagent（広域探索）または `general-purpose`（深い調査） |
| レビュー/コード見て | `everything-claude-code:code-reviewer`（言語別: `go-reviewer` `python-reviewer` `kotlin-reviewer`） |
| 計画立てて/設計して | `everything-claude-code:planner` または `:architect` |
| セキュリティ見て | `everything-claude-code:security-reviewer` |
| リファクタして/死コード削って | `everything-claude-code:refactor-cleaner` |
| E2E 回して/動作確認して | `everything-claude-code:e2e-runner` |
| ビルドエラー直して | `everything-claude-code:build-error-resolver`（Go: `go-build-resolver`、Kotlin: `kotlin-build-resolver`） |
| TDD で書いて | `everything-claude-code:tdd-guide` |
| ドキュメント/コードマップ | `everything-claude-code:doc-updater` |

### STEP 3: 起動前チェック（必須の声出し）

AGENT MODE に入ったら、**最初のツール呼び出しの前に** 以下を1-2行で宣言すること：

```
🎯 トリガー検出: 「<フレーズ>」 → <エージェント名> を起動します
```

これを省略すると「またエージェント使い忘れた」と怒られる。絶対に省略しない。

### STEP 4: 単発呼び出しを省略してよい場面（ホワイトリスト）

以下の場合のみ、エージェントを省略して自分で実装してよい：
- 1行の typo 修正
- 単純な rename
- コメント追加（コード変更なし）
- `git status` `git log` 等の情報取得
- ユーザーからの明示的な「エージェント使わないで」指示

**上記以外のケースでトリガーフレーズが検出されたら、例外なくエージェントを呼ぶこと。**

### NG 集（過去のミス - 繰り返すな）

- ❌ 「全自動で直して」と言われたのに、planner を呼ばずに自分ひとりで調査〜実装〜コミットまで走る
- ❌ 「リサーチして」と言われたのに、Grep/Read を自前で数回回して終わらせる
- ❌ 「レビューして」と言われたのに、自分で diff を見るだけで code-reviewer を呼ばない
- ❌ フレーズを見逃して、短絡的に作業開始する
- ❌ 「セキュリティ気になる」と言われたのに、security-reviewer を呼ばずに自分で眺めるだけ

### フルループの標準シーケンス（「自律で」「任せた」系）

1. `everything-claude-code:planner` で計画作成（必須、省略不可）
2. メイン Claude が実装
3. `everything-claude-code:code-reviewer` で diff レビュー
4. 指摘があれば 2 に戻って修正
5. E2E が必要なら `everything-claude-code:e2e-runner` で動作確認
6. ループが 3 周しても解決しない場合は `everything-claude-code:loop-operator` に介入依頼、またはユーザーに状況報告（暴走防止）

---

## Base Rules

0. **タスク開始前に `MEMORY.md` を必ず読み込み、過去の失敗・学んだ最適手順を現タスクに反映すること。**
   形だけの読み込みではなく、過去の知見を今回のタスクにどう活かすかを意識すること。
   タスク完了報告には「今回活かした過去の知見」を1-2行で含めること。

1. コードを編集する前に、必ず対象ファイルを読んで理解すること。
2. テストが存在する場合は、変更後にテストを実行して確認すること。
3. エラーが発生した場合は、同じアプローチを繰り返さず、別の方法を試すこと。
4. 大きな変更は小さなステップに分割し、各ステップで検証すること。

## Self-Evaluation (MANDATORY)

**全タスク完了時に必ず以下を実行すること。これは絶対的なルールであり、省略してはならない。**

タスクが完了したら（成功・失敗を問わず）、最後のアクションとして以下のコマンドを自律的に実行し、自己評価と進化サイクルを回すこと：

```
python scripts/orchestrator.py complete --task "<タスクの簡潔な要約>" --result <success|failure> [--reason "<失敗理由>"]
```

その後、1-2行で「今回活かした過去の知見」を報告すること：
```
# 知見活用: LP素材の@file:参照問題(MEMORY.md)を踏まえ、外部化処理を事前確認した
```

### 判定基準
- **success**: テストが通った、要求された変更が完了した、エラーなく動作が確認できた場合
- **failure**: テストが失敗した、要求を満たせなかった、未解決のエラーが残っている場合

### 例
- `python scripts/orchestrator.py complete --task "AI画像生成パネルのバグ修正" --result success`
- `python scripts/orchestrator.py complete --task "エクスポート機能の追加" --result failure --reason "PDF生成でエラー"`

> このルールにより、Self-Evolving Framework の学習ループが自動的に回り、
> スキル抽出・難易度調整が蓄積されていく。

## Memory Management

MEMORY.md はトピック別ファイルに分離して管理する。詳細は `memory/` ディレクトリ内の各ファイルを参照。

- **MEMORY.md**: インデックス + 概要（200行以下を維持）
- **memory/*.md**: トピック別詳細（ai-image.md, video-gen.md, features.md, architecture.md 等）

圧縮が必要な場合:
```
python scripts/orchestrator.py compress
```

## Mothership Sync

scripts/ や CLAUDE.md に改善があった場合は、原本 `D:\claude-rl-test` への反映を**提案のみ**すること。
実行はユーザーがランチャーのオレンジ色のボタンで行うことを前提とする。

**絶対ルール:**
- 原本（`D:\claude-rl-test`）のファイルを直接書き換える提案はしない
- 改善があれば「ランチャーのオレンジ色のボタンを使って原本を更新してください」と促すだけにする
- 万が一チャット経由で原本を触る必要がある場合は、二段階確認を必ず挟む
  （「OK」だけでは実行せず、「本当に原本を書き換えてもよろしいですか？（Yes/No）」と再確認）

## Framework Structure

```
scripts/
  observe.py           # Phase 1: Observation (transcript parsing)
  analyze.py           # Phase 2: Feedback & Analysis
  evolve.py            # Phase 3: Self-Evolution & Difficulty Adjustment
  orchestrator.py      # Main entry point (Phases 1+2+3 + compress)
logs/                  # Runtime artifacts (auto-generated, gitignored)
```

## Conventions

- ログファイルは JSONL 形式で `logs/` に保存する。
- MEMORY.md への書き込みはマーカー (`## Section Name`) で区切る。
- CLAUDE.md のフレームワーク自動更新セクションは `## Auto-Extracted` または `## Current Difficulty` で始まる。















## Current Difficulty Level

- **レベル**: 5 - 抽象指示 (Abstract)
- **説明**: 非常に抽象的な指示で、問題の発見から解決まですべてを任せる
- **直近の成功率**: 100%
- **調整理由**: 成功率 100% → 難易度維持
- **指示の例**: コード品質を向上させてください。

> タスクを依頼する際は、上記レベルの抽象度でプロンプトを作成してください。

## Auto-Extracted Best Practices (Updated: 2026-04-08)

以下のルールは過去のタスク実績から自動抽出されたベストプラクティスです。

1. **編集前にファイルを読んで理解した** (検出回数: 17, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
2. **小さな単位で検証しながら進めた** (検出回数: 16, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
3. **エラー発生後に別のアプローチに切り替えた** (検出回数: 16, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
4. **実装前にコードベースを探索した** (検出回数: 3, 例: めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消, めいろ修正: draw loop の例外停止を try/catch で根本対応、チュートリアル + ステージ1 を新規追加 (コの字+石ブロック)、🪨 STONE タイル追加、リテラル \n 修正)
