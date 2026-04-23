# Self-Evolving Framework

このプロジェクトには Self-Evolving Framework が統合されています。
タスク完了時に自動で学習ループを回し、ベストプラクティスの抽出と難易度調整を行います。

## 推奨ECCスキル（このプロジェクト専用の短縮リスト）

ECCプラグインには多数のスキルが入っているが、このプロジェクト（子供向けWeb知育アプリ / 純JS・HTML・PWA）で実際に使うのは以下。迷ったらこの中から選ぶこと。他の言語系（Go/Kotlin/Swift/Django/Spring/Perl等）・業務系（物流/調達/投資家向け等）スキルは基本的に無視してよい。

- `everything-claude-code:coding-standards` — JS/TS/Reactの書き方
- `everything-claude-code:frontend-patterns` — フロントエンド全般
- `everything-claude-code:tdd-workflow` — 機能追加時のテスト駆動
- `everything-claude-code:security-review` — 入力処理・認証・データ保存系の変更後
- `everything-claude-code:e2e-testing` — Playwrightでの動作確認
- `everything-claude-code:deployment-patterns` — sw.js の CACHE_VERSION、Cloudflare デプロイ
- `everything-claude-code:verification-loop` — 大きな変更後の一括検証
- `everything-claude-code:simplify` — 変更後のコード整理
- `everything-claude-code:save-session` / `resume-session` — セッション引き継ぎ
- `everything-claude-code:continuous-learning-v2` — 学習ループ
- `everything-claude-code:strategic-compact` — 長時間作業時のコンテキスト節約
- `everything-claude-code:fal-ai-media` — 画像/音声の生成素材が必要な時だけ

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

## Auto-Extracted Best Practices (Updated: 2026-04-23)

以下のルールは過去のタスク実績から自動抽出されたベストプラクティスです。

1. **編集前にファイルを読んで理解した** (検出回数: 271, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
2. **エラー発生後に別のアプローチに切り替えた** (検出回数: 267, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
3. **小さな単位で検証しながら進めた** (検出回数: 265, 例: ピボット修正+スワップバグ修正+GitHubゴミファイル削除（エージェント自律ループでplanner/code-reviewer活用）, めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消)
4. **実装前にコードベースを探索した** (検出回数: 154, 例: めいろゲーム改修: 自動歩行を直進のみに変更し L字も明示タップ必須化、再帰バックトラッカーで本物の迷路生成、Pono drawing をbase layer必須化、障害物配置をplayer-reachable限定、no-spam-solve audit追加, rewards保存のSHA mismatchエラーをHTTPキャッシュバイパスで解消, めいろ修正: draw loop の例外停止を try/catch で根本対応、チュートリアル + ステージ1 を新規追加 (コの字+石ブロック)、🪨 STONE タイル追加、リテラル \n 修正)
5. **テストを先に書いてから実装した (TDD)** (検出回数: 12, 例: 未作成カードの非表示機能と下書き取消、恐竜L2問題追加, 魔法攻撃を「手前→奥へ飛ぶ光球+着弾破裂」に置換 (色味は行属性連動 fire/ice/thunder/light/...)、Unity ハイブリッド方針(案②) を project memory に保存 (v229), battle v230: バトル導入モーダル刷新 + ポノ/ハリネズミを戦闘中は非表示 + 攻撃プランを通常3魔法2に固定 + 炎属性ハードコード)
