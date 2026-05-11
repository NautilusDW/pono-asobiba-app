---
name: OP Layout 配信ワークフロー（確定運用）
description: ローカル editor で位置調整 → JSON Export → Claude エージェントで saved-layout.json に反映 + sw.js bump + commit。「📡 配信」ボタンは使わない確定運用フロー
type: reference
---

# OP Layout 配信ワークフロー（確定運用）

> このプロジェクトの quizland OP layout (`__op_layout.{B,C,D}`) を更新する **唯一の運用フロー**。
> 過去に実装された staging editor の「📡 配信」ボタンは **運用上使わない** ことがユーザーから明示されている。
> Claude は今後このワークフロー以外を提案してはいけない。

## 1. ユーザー側の作業

1. ローカル editor (`tools/op-layout-editor.html`) を `?edit=1` 付きで開く
2. 位置・サイズ調整を行う
   - スライダー / slot ドラッグ
   - 「全ポーズに反映」ボタンで perVariant 13 entries を一括同期 (sw v936 で実用化)
3. ヘッダの **「📥 Export → JSON ファイル」** を押下
4. ダウンロードした JSON を `D:\ポノのおへや\Dr.owl'quiz\` に保存
   - パスに日本語 + アポストロフィを含むので bash 直叩きは NG、 Python 経由で読み込む
5. ファイル名 (例: `op-layout-2026-05-11-07-22-05.json`) を Claude チャットに伝える

## 2. Claude 側の作業

1. 実装エージェントを 1 つ立てる
2. ソース JSON を読み込み (Python 経由でパスエスケープ)
3. `quizland/saved-layout.json` の現状 `__op_layout` を読み込む
4. **deep diff** で差分を確認
   - top-level 220 keys (`q72` / `q83` / `__chip_text_overrides` / `__op_narration` 等) は **完全温存**
   - `__op_layout.{B,C,D}` のみ更新
   - `kurumi.perVariant` 13 entries の preserve guard を確認
5. 差分を反映 (置換) → JSON 保存
6. `sw.js` の `CACHE_VERSION` を +1 バンプ
7. **commit はしない** (post-commit hook の auto-commit に任せる) — ユーザーが明示的に commit を指示した場合のみ commit
8. `develop` への push は post-commit hook が自動で行う → GH Actions が staging に自動反映

## 3. 廃止された方法（今後一切言及しない）

- ❌ staging editor の **「📡 配信」ボタン** を使った直接配信
- ❌ Claude から「staging で開いて配信ボタンを使えば...」のような提案
- 過去に staging origin 限定 (`isStagingOrigin()`) でガードを実装した経緯はあるが (sw v906/v907)、 **運用上は使わない方針** がユーザーから明確に示されている
- 「📡 配信」ボタンの存在自体を **話題に出さない** こと
- ユーザーは「ステージングの方はもうやめた」と明言済み (理由は問わずこの方針を尊重する)

## 4. 配信内容の典型差分パターン

### 全ポーズ反映ボタン (sw v936 で実用化)
- editor 上で 1 variant の slot 値を調整 → 「全ポーズに反映」 → 同 VC の **perVariant 13 entries 全部** に同値が同期される
- v936 publish 例: `B.kurumi.perVariant` の 13 variants 全部が `slotOffsetX=77, slotOffsetY=19` に統一された (= ボタン発火痕跡)

### per-variant 個別調整 (v932 〜)
- variant ごとに `slotW` / `slotH` / `slotOffsetX` / `slotOffsetY` を独立に詰める
- `slotAspect='fixed_0.73'` / `objectPosition='bottom'` は維持

### per-VC 配信 (v935 〜 で C/D も実値化)
- B (1024×768) / C (1920×1080) / D (2560×1080) を独立に配信
- VC ごとに `slot.flat` / `kurumi.perVariant` / `hakase.slot` 等を個別管理

## 5. このフローを支えるコード資産

| 場所 | 役割 |
|---|---|
| `tools/op-layout-editor.html` | ローカル editor 本体。 「📥 Export → JSON ファイル」 / 「全ポーズに反映」 / 「対話 (P2-6)」 / 「シナリオ」 / 「ナレ」 モード切替 |
| `quizland/saved-layout.json` | 配信先。 top-level 220 keys + `__op_layout.{B,C,D}` を含む単一 JSON |
| `quizland/index.html` | runtime。 `_opApplyLayoutOverride` 等で saved-layout.json `__op_layout` を読み inline style 反映 |
| `sw.js` | `CACHE_VERSION` をバンプして配信 |
| `.git/hooks/post-commit` | develop ブランチで `git push origin develop` を自動実行 |
| `.github/workflows/deploy.yml` | `wrangler deploy --env staging` を実行 |

## 6. 関連 memory

- [feature_quizland_kurumi.md](feature_quizland_kurumi.md) — kurumi 13 variants の slot 配信状態
- [feature_quizland_opening.md](feature_quizland_opening.md) — OP cinematic 全体と saved-layout.json 連携
- [feedback_auto_push.md](feedback_auto_push.md) — develop 自動 push + Cloudflare Workers staging 自動反映
- [feature_quizland_voicevox_order.md](feature_quizland_voicevox_order.md) — **VOICEVOX 関連も含めた発注書ワークフロー**: 同じ「発注書 = git 管理 (Claude エージェント整備) / 実行物 = ローカルツール」の役割分担パターン (発注書 `docs/quizland-voicevox-order/` ↔ 生成ツール `tools/voicevox-generator/voicevox-generator.html`) を OP layout (saved-layout.json ↔ tools/op-layout-editor.html) と並列に運用
