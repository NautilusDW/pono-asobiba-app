# AGENTS.md

このファイルは、 このリポジトリで作業する **すべての AI エージェントが守るべき共通ルール** を集約した単一ソースです。

OpenAI Codex (VS Code 拡張) は本ファイルを起動時に自動で読み込みます。 GitHub Copilot Chat は [.github/copilot-instructions.md](.github/copilot-instructions.md) から本ファイルへ誘導されます。 Claude Code は [CLAUDE.md](./CLAUDE.md) から本ファイルを参照します。

> **DRY 原則**: 重複ルールは本ファイルにのみ書きます。 各 AI 固有の運用 (例: Claude の Self-Evolving Framework) はそれぞれの専用ファイルに残します。

---

## 0. 文字コード / 改行コード規約

すべてのテキストファイルは **UTF-8 (BOM なし) / LF 改行** で保存します。

- `.editorconfig` (リポジトリ直下) と `.vscode/settings.json` で自動適用。 これらが効いていれば自前で何もしなくて OK。
- Windows 上のエディタは Japanese を含むファイルを **CP932 / Shift_JIS** と誤判定することがあります (Codex 拡張で発生実績あり)。 `.editorconfig` を尊重するエディタを使うか、 ファイルを明示的に **UTF-8 で開き直して** ください。
- BOM (`EF BB BF`) は付けません (シェル / git で副作用が出るため)。
- ファイル読込時に文字化けして見えた場合、 まずエディタの文字コード設定を確認。 ファイル本体は UTF-8 のままです。

---

## 1. プロジェクト概要

**ポノのあそびば** — 子ども向け Web 知育 PWA。

- **言語/フレームワーク**: 純 JavaScript / HTML / CSS。 ビルドツールなし、 npm 不使用。
- **配信**: **Cloudflare Workers** (`wrangler.toml` 参照)。
- **ブランチ運用**:
  - `develop` → push で **staging に自動デプロイ** (`https://pono-asobiba-staging.ndw.workers.dev/`)
  - `master` → push で **production に自動デプロイ** (`https://pono.kodama-no-mori.com/`、 ユーザー明示指示時のみ)
- **手動デプロイ**: `wrangler deploy --env staging` または `wrangler deploy`

---

## 2. 絶対禁止 (Hard rules)

下記は例外なし。 違反するとユーザーに迷惑がかかります。

1. **「Netlify」というキーワードは出さない。** (旧基盤、 完全廃止済み。 提案/コマンド/コメント/コミットメッセージのいずれにも書かない)
2. **`master` ブランチへの直接 push、 勝手なマージ、 勝手な production デプロイは禁止。** ユーザーが明示的に「本番に上げて」と指示した時のみ実行。
3. **機密ファイルを git add しない。** `.env`, `.env.*`, `.dev.vars`, `credentials.json`, `secrets.yaml`, `wrangler.toml.local` 等 (`.gitignore` 済み + pre-commit が阻止)。
4. **3MB を超える画像を git add しない。** pre-commit が阻止します。 大きい画像は `python scripts/auto_optimize_image.py <path>` で最適化してから add。
5. **`--no-verify` で git hook をスキップしない。** hook が阻止する状況には正当な理由があります。
6. **不明な権限・モデル・API キーを使わない。** 既に `wrangler` で設定済みのものだけ使用。

---

## 3. 担当領域マトリクス

| 領域 | Codex | Claude Code | 備考 |
|---|---|---|---|
| `play.html` の CSS / HTML / アニメ | ✅ メイン | レビュー側 | カードレイアウト、 ホバー演出、 ボトムナビ装飾 |
| `play.html` 内の hover/select 等の軽い JS | ✅ | レビュー側 | renderCards、 cardClick、 selectGame レベル |
| `assets/ui/`, `assets/images/` の追加・差し替え | ✅ | レビュー側 | 画像最適化 (§5) を踏むこと |
| `sw.js` (CACHE_VERSION バンプ含む) | ❌ 触らない | ✅ メイン | §6 のバンプ規約参照 |
| `scripts/`, `common/`, ゲーム本体 (`maze/`, `quizland/` 等) | ❌ | ✅ メイン | ゲームロジック / 共通ライブラリ |
| `wrangler.toml`, `.github/workflows/`, `.git/hooks/` | ❌ | ✅ メイン | デプロイ設定 / CI / git hooks |
| `CLAUDE.md`, `MEMORY.md`, `memory/*` | ❌ | ✅ | Claude Code 固有の運用ファイル |
| `AGENTS.md` (本ファイル) | 提案 OK / commit はユーザー承認後 | 同左 | ルール変更は両 AI が提案可 |

**役割が重なる場合**は、 ユーザーが「いま誰が何を触っているか」口頭で伝える運用。 重なる懸念がある時は作業を始める前に確認すること。

---

## 4. すれ違い回避の最低限ルール

1. **作業前に最新を取得**: `git pull origin develop`
2. **作業後にコミット & push**: `git push origin develop` (post-commit hook が自動 push するので明示不要なケースが多い)
3. **コミットメッセージの末尾に作者の AI 種別を入れる** (どっちが作業したか git log で追跡可能にする):
   ```
   ...通常のメッセージ...

   Co-Authored-By: Codex <noreply@openai.com>
   ```
   または
   ```
   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
   ```
4. **同時編集中の領域を踏まない**: 担当領域マトリクス (§3) を尊重。 マトリクス外のファイルを触る必要が出たら、 ユーザーに事前確認。
5. **AI 同士は直接通信しない**: 私 (Codex) と Claude Code は同じワークスペースを共有しているが、 互いの作業中状態は見えない。 git log と working tree で確認、 ユーザー口頭伝達で同期。
6. **「auto-commit by Claude Code」名義のコミットの中身に注意**: このプロジェクトの自動化フローによって、 Codex / Claude Code どちらの編集も「auto-commit by Claude Code」というメッセージで自動コミットされ origin/develop に push されることがあります (作者欄はリポジトリ所有者の名前)。 つまり **コミット名義 ≠ 実作業者**。 git log で誰の作業か確認したいときは `git show <sha>` でファイル内容と時刻を見て判断してください。
7. **`HANDOFF.md` を読む / 書く** (★必須ルーチン): リポジトリ直下の [`HANDOFF.md`](./HANDOFF.md) は Claude / Codex 共有の申し送りノート。
   - **作業開始時** (新規セッション、 ユーザーから依頼を受けた時、 大きなタスクに着手する直前): 必ず最初に開いて 「Active」 セクションを読む。 相手 AI からの引き継ぎ・進行中タスクをここで把握する。
   - **作業完了時 / 重要な情報を相手に伝えたい時**: 「Active」 のチェックを付けて 「Done」 に移動 + 1 行サマリを残す。 これにより、 ユーザーが同じ説明を 2 回繰り返さなくて済む。
   - 自分の作業者名 (`by Claude` / `by Codex`) を必ず明記する。
   - 古い Done エントリ (3 日以上前) は気付いた方が削除して衛生を保つ。

   **★並列スレッド競合防止ルール (2026-05-06 追加)**: 複数の Codex/Claude スレッドが並行して同じバッチ作業をする場合 (例: 04/ alpha 抜き と 05/ 新規生成 を別スレッドで同時に進める) 、 HANDOFF.md の上書き合戦で報告が消える事故が起きやすい。 以下を厳守:
   - **バッチ ID 必須**: ユーザーから依頼を受けた時点で、 そのタスクには `[batch:NN-topic]` 形式のバッチ ID が割り振られているはず (例: `[batch:05-opposite-new-pairs]`)。 ユーザー指示に明記がなければ自分で命名して**最初の HANDOFF エントリで宣言**する。
   - **自分のバッチ ID のエントリだけを編集**: 他のバッチ ID のエントリは**絶対に触らない** (内容修正・削除・移動すべて NG)。 たとえ古く見えても、 別スレッドが進行中の可能性がある。
   - **append-only**: 進捗更新は新しい行を**追加** (古い行を編集して上書きしない)。 状態遷移は「同じバッチ ID で複数行に連なる」形で表現:
     ```
     - 2026-05-06 - [batch:05] Codex: opposite 23 枚生成開始
     - 2026-05-06 - [batch:05] Codex: 23 枚 → tmp/alpha_pending/alpha/05/ に納品完了
     - 2026-05-06 - [batch:05] Claude: 配置・コード反映・sw v749 デプロイ完了
     ```
   - **掃除タイム**: 過去のバッチで全行 done になったものは、 1 つの「[batch:NN] DONE — 1 行サマリ」エントリに集約して Recent に移動して良い (同期のために必ず**そのバッチに関わった全エージェントの作業が done 済**であることを git log と working tree で確認すること)。
   - **競合検出**: git push が rejected された場合は、 fetch + rebase してから再 push。 自分のエントリと衝突しているなら、 競合を解決する際に**他バッチのエントリは絶対変更しない** (rebase で他バッチの変更が混ざっても、 自分のバッチ部分だけ追記する)。

---

## 5. 画像追加・差し替え手順

### 5.1 画像生成 ✕ 後処理 の役割分担 (2026-05-06 ポリシー)

| 工程 | 担当 |
|---|---|
| **生成** (Codex で GPT Image 2 等を呼ぶ、 raw 画像出力) | Codex (or 任意の AI) |
| **アルファ抜き** (白/単色背景の透過化) | **ユーザー (ローカル)** ← Codex は**やらない** |
| **切り抜き** (split / crop / 個別オブジェクト分離) | **ユーザー (ローカル)** ← Codex は**やらない** |
| **配置** (`tmp/` から `assets/` への移動 + リネーム) | Claude |
| **最適化** (`auto_optimize_image.py`) | Claude (PostToolUse hook 自動 or 手動) |
| **questions.js / sw.js 反映** | Claude |

**Codex は画像生成 API のレスポンスを生のまま保存するだけ**でよい。 アルファ抜きや切り抜きの後処理スクリプトを書いて実行する必要はない。 これはユーザーが Photoshop 等で手作業/半自動でやる方が品質が安定するため (2026-05-05 以前は Codex 側で alpha 抜きしていたが、 ばらつきが出るため変更)。

納品先: 画像生成バッチは `tmp/alpha_pending/alpha/<NN>/` (新規バッチごとに連番フォルダ) に置く。 ユーザーがそこから alpha 抜き → Claude に「< NN/ 入れた」と伝える → Claude が `assets/` に配置 + 反映。

### 5.2 配置・最適化手順 (Claude 側)

1. ファイルを **assets/ui/<name>.png** または **assets/images/<dir>/<name>.png** に置く。
2. ファイルが大きい場合 (>3MB は pre-commit が必ず阻止、 1MB 超でも軽量化推奨):
   ```bash
   python scripts/auto_optimize_image.py <path>
   ```
3. 透過 (alpha) を持つ PNG は **常に PNG のまま** 圧縮 (透明部分が消えると `<img src="*.png">` の見た目が崩れるため)。
4. 透過なし PNG → JPG への **拡張子変更** は **デフォルトでは行わない** (= 既存 `<img src="*.png">` 参照を勝手に壊さないため)。 JPG 化したい時だけ手動で `--allow-jpeg-rename` を opt-in:
   ```bash
   python scripts/auto_optimize_image.py --allow-jpeg-rename <path>
   ```
5. `assets/images/` 配下は Claude Code の PostToolUse hook で自動最適化されるが、 **`assets/ui/` 配下と Codex の編集は対象外**。 Codex はファイルを置く時、 自分で `auto_optimize_image.py` を実行するか、 後で Claude にバンプ依頼するついでに最適化チェックも依頼すること。

---

## 6. sw.js CACHE_VERSION バンプ規約

**HTML / JS / CSS / 画像 / フォント** いずれかを変更したら、 `sw.js` の 4行目 `CACHE_VERSION` を **+1** すること。 これを忘れると、 PWA としてインストール済みのユーザー端末が古いキャッシュを掴み続けます。

```js
const CACHE_VERSION = NNN;  // ← 変更ごとに +1
```

**運用**:
- Codex は `sw.js` を触らないので、 PR / 作業完了時に **「sw.js CACHE_VERSION バンプお願いします」** とユーザーまたは Claude Code に伝える。
- Claude Code はコミット前に CACHE_VERSION バンプを習慣化。

---

## 7. 既存の自動化 (情報共有)

知らずに発火させて慌てないように。

| Hook / Script | 対象 | 動作 |
|---|---|---|
| `.git/hooks/pre-commit` | 全 commit | 機密ファイル・3MB超画像をブロック |
| `.git/hooks/post-commit` | develop ブランチ commit | 自動 `git push origin develop` (flock ガード) |
| Claude Code PostToolUse | Claude の Write/Edit | `auto_optimize_image.py --hook` (assets/images/ のみ) + `docs_review_hook.py --mark` |
| Claude Code Stop | Claude セッション終了 | `docs_review_hook.py --check` (skip flag で逃げ可) + auto push |
| GitHub Actions | develop / master push | Cloudflare Workers staging / production に自動デプロイ |

**Codex 側はこれらのうち git hook (pre-commit / post-commit) と GitHub Actions の恩恵を自動的に受けます。** Claude 専用の PostToolUse / Stop hook は Codex の編集に対しては発火しません。

---

## 8. AGENTS.md 自身の更新ルール

- 内容を変えたい場合は提案コミットを作り、 ユーザー承認後にマージ。
- Codex / Claude のどちらが提案しても可。
- 変更時のチェックリスト:
  1. `AGENTS.md` を編集
  2. `CLAUDE.md` の参照箇所と矛盾しないか確認
  3. `.github/copilot-instructions.md` (ポインタなので通常更新不要、 リンク切れだけ確認)
  4. ユーザーに変更点を 1-2 行で報告

---

## クイックリファレンス

```
staging  : https://pono-asobiba-staging.ndw.workers.dev/
production: https://pono.kodama-no-mori.com/
deploy   : git push origin develop  (staging自動)
            git push origin master  (本番、ユーザー明示時のみ)
            wrangler deploy --env staging
            wrangler deploy
画像最適化: python scripts/auto_optimize_image.py <path>
SW バンプ : sw.js 4行目 CACHE_VERSION を +1
```
