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

### 1.1 ディレクトリ構造 (新規セッション向け概観)

```
play.html                 ← トップ画面 (ゲーム選択カード UI / Codex メイン)
sw.js                     ← Service Worker (CACHE_VERSION バンプ規約 §6 / Claude のみ)
wrangler.toml             ← Cloudflare Workers 配信設定 (Claude のみ)
common/                   ← ゲーム横断の共通ライブラリ (layout-editor 等 / Claude メイン)
quizland/                 ← クイズ系ゲーム本体 (questions.js / saved-layout.json)
maze/                     ← 迷路ゲーム
assets/ui/                ← UI 装飾画像 (Codex メイン、 PostToolUse hook 対象外)
assets/images/            ← ゲーム内画像 (Claude PostToolUse hook で自動最適化)
tmp/alpha_pending/        ← Codex から Claude への画像納品エリア (§5.1)
docs/                     ← STORY_OPENING_ENDING.md 等の物語/設計ドキュメント
scripts/                  ← orchestrator.py / auto_optimize_image.py 等 (Claude のみ)
HANDOFF.md                ← Claude / Codex 共有の申し送りノート (§4.7)
```

---

## 2. 絶対禁止 (Hard rules)

下記は例外なし。 違反するとユーザーに迷惑がかかります。

1. **「Netlify」というキーワードは出さない。** (旧基盤、 完全廃止済み。 提案/コマンド/コメント/コミットメッセージのいずれにも書かない)
2. **`master` ブランチへの直接 push、 勝手なマージ、 勝手な production デプロイは禁止。** ユーザーが明示的に「本番に上げて」と指示した時のみ実行。
3. **機密ファイルを git add しない。** `.env`, `.env.*`, `.dev.vars`, `credentials.json`, `secrets.yaml`, `wrangler.toml.local` 等 (`.gitignore` 済み + pre-commit が阻止)。
4. **3MB を超える画像を git add しない。** pre-commit が阻止します。 大きい画像は `python scripts/auto_optimize_image.py <path>` で最適化してから add。
5. **`--no-verify` で git hook をスキップしない。** hook が阻止する状況には正当な理由があります。
6. **不明な権限・モデル・API キーを使わない。** 既に `wrangler` で設定済みのものだけ使用。
7. **画像生成モデルは GPT Image 2 以外使わない。** (Codex 側の仕事。 DALL-E / Stable Diffusion / Imagen / Flux / Nano Banana 等は使用禁止) 既存アセットがすべて GPT Image 2 で生成されているため、 別モデルを混ぜると画風が揺らぐ。 §5.1.0 と整合。

---

## 3. 担当領域マトリクス

| 領域 | Codex | Claude Code | 備考 |
|---|---|---|---|
| `play.html` の CSS / HTML / アニメ | ✅ メイン | レビュー側 | カードレイアウト、 ホバー演出、 ボトムナビ装飾 |
| `play.html` 内の hover/select 等の軽い JS | ✅ | レビュー側 | renderCards、 cardClick、 selectGame レベル |
| `assets/ui/`, `assets/images/` の追加・差し替え | ✅ | レビュー側 | 画像最適化 (§5) を踏むこと |
| `sw.js` (CACHE_VERSION バンプ含む) | ❌ 触らない | ✅ メイン | §6 のバンプ規約参照 |
| `scripts/`, `common/`, ゲーム本体 (`maze/`, `quizland/` 等) | ❌ | ✅ メイン | ゲームロジック / 共通ライブラリ |
| `quizland/data/questions.js` | ✅ メイン (問題追加・文言調整) | レビュー側 | クイズデータ。 Codex は新規問題追加 OK、 既存問題の id 変更は禁止 |
| `quizland/saved-layout.json` | ❌ 触らない | ✅ メイン | layout-editor 経由でのみ更新。 手書き編集禁止 (フォーマットが壊れる) |
| `quizland/data/_review/codex-followup-*.md` | ✅ 読む側 (指示の受信) | ✅ 書く側 (指示の発信) | Claude → Codex への作業依頼ノート |
| `quizland/data/_review/audit.html` 等のレビュー成果物 | ✅ メイン | レビュー側 | Codex 主導のオーディット |
| `wrangler.toml`, `.github/workflows/`, `.git/hooks/` | ❌ | ✅ メイン | デプロイ設定 / CI / git hooks |
| `CLAUDE.md` | ❌ | ✅ | Claude Code 固有の運用ファイル |
| `MEMORY.md`, `memory/*` | 読み取り専用 (参考のみ) | ✅ | Claude の知見蓄積。 Codex は編集禁止だが**読んで矛盾を見つけたら HANDOFF で共有**してよい |
| `docs/STORY_OPENING_ENDING.md` 等の物語/設計 docs | レビュー側 | ✅ メイン | 物語フローの正本 |
| `HANDOFF.md` | ✅ 自分のバッチ ID 行のみ | ✅ 自分のバッチ ID 行のみ | §4.7 のルールに従い、 他バッチ行は触らない |
| `AGENTS.md` (本ファイル) | 提案 OK / commit はユーザー承認後 | 同左 | ルール変更は両 AI が提案可 |

**役割が重なる場合**は、 ユーザーが「いま誰が何を触っているか」口頭で伝える運用。 重なる懸念がある時は作業を始める前に確認すること。

---

## 4. すれ違い回避の最低限ルール

0. **★着手前の重複チェック義務 (2026-05-06 追加)**: 新しい依頼を受けた瞬間に**自走を始める前**に、 同じ作業を過去スレッド/別 AI が既にやっていないか確認する。
   - `HANDOFF.md` の Recent / Done を「該当領域 (例: `quizland/data/opposite/`)」でざっと検索
   - `git log --oneline -20 -- <該当ディレクトリ>` で過去 20 件の commit を確認
   - 該当ディレクトリの `ls` で既存ファイルの有無を確認 (画像生成タスクで特に重要)
   - 既存成果物が見つかった場合: **再生成・再実装をせず**、 ユーザーに 「○○ は既に <commit hash> で対応済みのようですが、 追加で何が必要ですか?」 と確認
   - 何も見つからなかった場合: HANDOFF に 「過去成果物無しと確認済 → 着手します」 を 1 行宣言してから進む
   - **理由**: 「いや、 その辺さ、 すでに以前に出してない？」 のリワーク事故を防ぐ。

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

   **★文字コード厳守 (2026-05-06 追加 / 何度も発生中)**: `HANDOFF.md` は**頻繁に文字化けが発生**しています。 書き込み時は必ず:
   - **UTF-8 (BOM なし) / LF 改行** で保存 (§0 と同じ)。
   - Windows 上のエディタ (特に Codex VS Code 拡張) は HANDOFF.md を **CP932 / Shift_JIS と誤判定して上書き保存**するケースが繰り返し発生。 → 読み込み時に文字化けが出たら**そのまま保存し直さない**。 まず文字コードを UTF-8 にし直してから保存。
   - 編集前に `file HANDOFF.md` (or エディタの文字コード表示) で UTF-8 であることを確認。
   - 自分が書き込んだ直後にもう一度開いて化けていないか目視確認。
   - 化けを見つけたらユーザーに即報告 (隠して放置しない)。 修復は git の以前の commit から `git show <sha>:HANDOFF.md` で復元可能。

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

   **★文字化け検知ヘッダ (2026-05-10 追加)**: 新規ハンドオフ md (`CODEX-*.md` / `HANDOFF.md` / `codex指示*.md` / `tmp/**/CODEX-*.md` など、 AI 同士が読み書きするすべての md) は **冒頭に以下の検知ヘッダを必ず入れる**:

   ```
   > ⚠️ **文字化けチェック**: この行が読めない (例: 「・・」「ヒメ」のような化け文字) の場合、 ファイルが UTF-8 で開かれていません。 VS Code で「Reopen with Encoding」→「UTF-8」を選択して開き直してください。 詳細: AGENTS.md §0 / §4 ルール 7
   ```

   これは Markdown blockquote として可視化される (HTML コメント `<!-- -->` だとレンダリング時に消えてしまうため不可)。 化けていればこの行自体が壊れて即気付ける、 という早期検知の仕組み。 既存ハンドオフ md にも順次同じヘッダを差し込んでいく。

   加えて、 プロジェクト root の `.editorconfig` (`charset = utf-8`, `end_of_line = lf`) に従って Codex 側でも EditorConfig 拡張 (`EditorConfig.EditorConfig`) を有効化することを推奨。 EditorConfig が効いていれば Codex VS Code 拡張の Shift_JIS 誤判定 → 上書き化けを防げる。

---

## 5. 画像追加・差し替え手順

### 5.1 画像生成 ✕ 後処理 の役割分担 (2026-05-06c — 手作業に再帰)

| 工程 | 担当 |
|---|---|
| **生成** (GPT Image 2 等で raw 画像生成) | Codex |
| **アルファ抜き** (白/単色背景の透過化) | **ユーザー (ローカル)** ← Codex は**やらない** |
| **切り抜き** (split / crop / 個別オブジェクト分離) | **ユーザー (ローカル)** ← Codex は**やらない** |
| **配置** (`tmp/` から `assets/` への移動 + リネーム) | Claude |
| **最適化** (`auto_optimize_image.py`) | Claude (PostToolUse hook 自動 or 手動) |
| **questions.js / sw.js 反映** | Claude |

**経緯 (alpha 抜き責務の遷移)**:
- 〜2026-05-05: Codex 側で alpha 抜き → ばらつきあり
- 2026-05-06a: ユーザーローカルで alpha 抜き (品質安定優先)
- 2026-05-06b: 再び Codex に alpha 抜き任せる (チーム編成 + クロスレビューで担保しようとした)
- **2026-05-06c (現行)**: ユーザー手作業に最終回帰。 Photoshop での手動制御の方が安定。 Codex 側のクロスレビューは品質を保証しきれない。

**Codex は raw 画像 (生成 API のレスポンスそのまま、 白背景/単色背景含む) を保存するだけ**。 後処理は全部ユーザーがローカルで実施。

納品先: `tmp/alpha_pending/<NN>/` 配下に raw 画像で。 ユーザーが Photoshop でアルファ抜き + 切り出し → `tmp/alpha_pending/alpha/<NN>/` に配置 → 「< NN/ 入れた」と Claude に伝達 → Claude が `assets/` に最終配置 + コード反映。

### 5.1.0 ★Codex 依頼時の冒頭文言 (必須)

ユーザーが Codex に画像生成を依頼するとき、 Claude が依頼文を準備する場合は**必ず以下の文言を一番最初に付け加える**:

> あなたは全体の進捗と品質管理に徹底し、 今後タスクは行わないでください。 実装はエージェントチームを組成して、 なるべく並列で行ってください。 レビューは必ずエージェント同士のクロスレビューをしてください。
>
> **画像生成モデルはすべて GPT Image 2 を使用することを厳格に守ってください。**
>
> **アルファチャンネル抜きと切り抜きは行わないでください。** 生成 API のレスポンスをそのまま raw 画像として保存。 後処理 (alpha 透過化、 個別 PNG 切り出し) はユーザーがローカルの Photoshop で手作業します (2026-05-06c ポリシー)。
>
> **背景は不必要に白以外の色にしないでください。** alpha 抜きで多少色が残っても白なら目立たないが、 ピンク/紫など濃色が残ると視覚的に強烈に気になる。 どうしても白だと色かぶりして alpha 抜きがうまくいかない場合 (例: 雪・氷・白い動物など被写体が白い) のみ、 別の色を許容するが、 **その場合もなるべく薄い色** (淡いグレー、 淡い水色など) にしてください。

これは Codex に**オーケストレーター専任モード**で動いてもらうための指示。 Codex が単独で全部やろうとせず、 サブエージェントを組成して並列実装 + クロスレビューする体制を作るための前置き。 alpha 抜き / crop も品質担保のためこの体制でやる。

**画像生成モデル統一**: GPT Image 2 以外のモデル (DALL-E / Stable Diffusion / Imagen / Flux / Nano Banana 等) を混ぜると画風が揺らぐ。 既存 quizland アセットは全て GPT Image 2 で生成されているので、 新規も同モデルで揃える (§2.7 で絶対禁止に格上げ済み)。

**コスト無制限ポリシー (★Codex 限定)**: **画像生成のコストは Codex 経由 GPT Image 2 ルートに限り**、 ユーザー側で「気にしなくてよい」体制が確保されている。 そのため Codex は:
- 「コスト最小化のため枚数を絞る」「再利用してコスト節約」のような遠慮は不要
- 教育的価値があれば 1 タスクで 20-30 枚生成も問題なし
- 再利用は**整合性 / 一貫性**の理由のときだけ採用

**Claude が他経路 (fal.ai MCP / Adobe Firefly 等) で画像生成する場合は、 このポリシーは適用されない**。 Claude は枚数・コストを事前にユーザーに確認すること。

**背景色ポリシー**: デフォルトは**白 (#FFFFFF)**。 これは alpha 抜きの残り誤差を視覚的に隠すため。 被写体が白い (雪原・白い動物・氷など) で色かぶり問題が出る場合のみ、 **淡いグレー (#E5E5E5) や淡い水色 (#E0F0FF)** など主張しない色にフォールバック。 ピンク・紫・原色などの濃色背景は禁止。

### 5.1.1 ★アセットシート方式 (2026-05-06 追加 / 必須)

**ペア対比やバリエーション (例: 同じドアの開/閉、 同じ棚の上/下、 同じ男の子の前/後、 「すき/きらい」等の表情対比) を Codex に依頼する場合は、 別々に複数枚生成しない**。 必ず以下のとおり:

- **1 つのプロンプトで 1 枚の画像を生成** (= 1 枚のアセットシート)
- その 1 枚に 2 つ (or 複数) のバリエーションを並べる:
  - 横並び 2 パネル / 縦並び 2 パネル / 2×2 グリッド など
  - パネル間にうっすら境界線 or 余白を入れる (ユーザーがクロップしやすいように)
- **カメラ画角・ライティング・小道具の細部 (棚の木目、 ドアノブ、 服のディテール、 顔立ち等) を全パネルで完全に共通化**
- ユーザーがローカルで `split_sprites.py` 等で個別 PNG に切り出す

**理由**: 別々に生成すると**カメラ角度、 棚の詳細、 服の柄、 体格**などが微妙にズレる。 子どもにとってペアの**主旨 (上/下とか 開/閉とか) ではなく、 ズレ自体に視覚が引きずられて**学習が阻害される。 1 枚のシートで構図と素材を強制的に揃えれば、 対比したい属性 (位置・動作・表情 etc.) だけが差分として浮かび上がる。

**例**: 「うえ/した」 → 同じ棚を 2 つ並べて、 左の棚にりんごが**上段に**、 右の棚にりんごが**下段に**置かれた絵を 1 枚のシートとして生成。 棚の木目・寸法・カメラ位置はピクセル単位で同一になる。

**Codex への指示テンプレ**: 「**A と B の 2 種類のシーンを 1 枚の画像にアセットシートとして生成**してください。 A は左パネル / B は右パネル、 同じ X (背景・小道具・キャラ衣装) を完全共有、 違うのは Y (位置・動作・表情) だけです。」

**解像度の最低条件 + フォールバック**:
- アセットシート方式は、 **シートを切り出した後、 各パネルが必要解像度以上 (通常 ≥1024×1024 相当)** であることが最低条件。 例: 2 パネル横並びなら**シート全体で ≥2048×1024** が必要。
- 生成 API のネイティブ出力サイズで上記を満たせない場合は**別々生成にフォールバック OK**。 ただしその際は:
  - **1 つ目を生成した後、 その画像をリファレンスとして 2 つ目を生成**する (= image-to-image 連鎖)
  - これにより 2 枚目が 1 枚目の構図・小道具・キャラデザを引き継ぐ
  - 別々でも実質的にアセットシート相当の整合性が出る
- **絶対 NG**: リファレンス無しの完全独立生成 2 回。 必ずシート方式 or リファレンス連鎖のどちらかにする。

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

## 7. タスク完了の定義 (DoD: Definition of Done)

「実装した = 完了」ではない。 以下を満たして初めて「完了」と報告してよい。

### 7.1 コード/CSS/画像変更の場合

1. 変更を commit & push (post-commit hook で自動 push される)
2. **sw.js CACHE_VERSION バンプ** (§6)
3. GitHub Actions の staging デプロイが緑になるのを待つ (1-2 分)
4. **シークレットウィンドウ** で staging URL を開いて**実際に動作確認**:
   - `https://pono-asobiba-staging.ndw.workers.dev/`
   - 通常ウィンドウだと PWA キャッシュを掴む。 必ずシークレット or `Ctrl+Shift+R` ハードリロード
5. ユーザーに報告: 「staging で <具体的な確認内容> を確認済み」

### 7.2 リグレッション防止の最低限チェック

変更した領域に応じて、 隣接機能が壊れていないか確認:

| 触った領域 | 最低限見るもの |
|---|---|
| `play.html` トップ画面 | 全カードが表示される / カードタップで該当ゲームに飛ぶ |
| `quizland/` | クイズが普通に進行する (1 問解ける) / トップに戻れる |
| `maze/` | チュートリアルが起動する / 1 ステージクリアできる |
| `common/layout/` 編集 | layout-editor を開いて保存・読み込みが壊れていない |
| `sw.js` | シークレットウィンドウで開いてリソースが 200 で取れている |

「golden path (子どもが普通に遊ぶ流れ) を 1 周通す」が原則。

### 7.3 動作確認できない場合

バックエンド設定・hook 改修・CI 変更等で staging では確認できない種類の変更は、 **「未確認」と明示**してユーザーに報告。 「動きました」と嘘の報告をしない。

---

## 8. コミット規約

### 8.1 メッセージフォーマット

```
<件名> (<理由 or 種別>、 sw vNNN)

[本文 (任意)]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>   ← または Codex
```

例:
- `chip-label を display: inline-block 化 (整列ズレ修正、 sw v772)`
- `applyOne: tx/ty=0 でも transform を書き込む (chip preset リセット時の残留 transform バグ修正、 sw v771)`
- `chore(layout): update saved layout (no sw)`  ← sw バンプ不要な変更

### 8.2 ルール

- 件名は日本語可、 50-70 文字目安
- sw.js を触った場合は `sw vNNN` を末尾括弧内に入れる (検索性のため)
- sw バンプ不要な変更 (docs / memory / `.gitignore` のみ等) は `(no sw)` で明示
- Co-Authored-By は §4.3 のとおり、 作業した AI 種別を入れる
- **複数の独立した変更を 1 commit に混ぜない** (例: バグ修正 + 新機能を分ける)

---

## 9. エラー時の振る舞い (正直報告プロトコル)

過去に「動いた」と虚偽報告したり、 失敗を隠して別の方法に逃げたりする事故が繰り返し発生している。 以下を厳守:

1. **ツール実行が失敗したら隠さず報告**: 「○○ コマンドが <エラー> で失敗しました。 推定原因: ××。 次に △△ を試します」
2. **同じアプローチを 2 回失敗させない**: 1 回目失敗 → 別アプローチに切り替え。 同じことを繰り返してログを汚さない (CLAUDE.md base rule §3 と整合)。
3. **「動作確認しました」は実際に挙動を見たときだけ言う**: コードを書いただけなら 「実装完了 / 動作未確認」 と書く。
4. **docs_review_hook の警告などシステム側ブロックを無視しない**: 警告に書いてある選択肢 (A: docs 更新 / B: skip フラグ) のどちらかを実行してから次へ進む。
5. **ユーザーから 「もう一回やってみて」 と言われた時**: 同じ方法を闇雲に再試行せず、 **直前の失敗内容を 1 行で説明してから**再試行に入る。

---

## 10. 仕様不明点はユーザーに確認する

抽象指示レベル (CLAUDE.md 末尾参照) で運用しているが、 **データ構造を増やす / スキーマを変える / 既存ファイルの分裂を伴う** 系は自己解釈で進めず、 選択肢を 2-3 個挙げてユーザーに選んでもらう。

**確認すべき場面の例**:
- 「デフォルト保存」 を **イラストあり / なしで 2 つ持つ**ことになった (= JSON スキーマが変わる)
- 1 つのファイルを**複数ファイルに分割**することになった (= 参照経路が変わる)
- ユーザーが「○○ できるようにして」と言ったが、 **既存の類似機能と挙動が分岐**する余地がある
- **後方互換性の判断**が必要 (例: 古い saved-layout.json を読み込んだとき)

**確認テンプレ**:
> ○○ について、 以下の選択肢が考えられます:
> - 案 A: ... (メリット/デメリット)
> - 案 B: ... (メリット/デメリット)
> どちらで進めますか?

自己解釈で進めて手戻りが出るより、 30 秒の確認の方が効率的。

---

## 11. 既存の自動化 (情報共有)

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

## 12. AGENTS.md 自身の更新ルール

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
