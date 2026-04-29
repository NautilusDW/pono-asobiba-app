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

---

## 5. 画像追加・差し替え手順

1. ファイルを **assets/ui/<name>.png** または **assets/images/<dir>/<name>.png** に置く。
2. ファイルが大きい場合 (>3MB は pre-commit が必ず阻止、 1MB 超でも軽量化推奨):
   ```bash
   python scripts/auto_optimize_image.py <path>
   ```
3. 透過 (alpha) を持つ PNG は PNG のまま圧縮、 透過なしは JPEG に変換可能 (`--scan` または手動呼び出し時のみ)。
4. `assets/images/` 配下は Claude Code の PostToolUse hook で自動最適化されるが、 **`assets/ui/` 配下は対象外**なので Codex 編集後は手動実行を推奨。

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
