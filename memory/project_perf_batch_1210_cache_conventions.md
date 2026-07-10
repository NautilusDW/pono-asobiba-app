---
name: project-perf-batch-1210-cache-conventions
description: batch:1210 (sw v2073) 全体パフォーマンス改善で変わったキャッシュ規約・新設バージョン定数・残課題の正本メモ
metadata:
  type: project
---

# batch:1210 パフォーマンス改善 (2026-07-10, sw v2073) — 変更後の規約と残課題

## 変わった配信規約 (以後の作業で前提にすること)

1. **HTML は no-store → no-cache** (src/worker.js applyCacheHeaders + _headers)。ETag 304 revalidate 前提。デプロイ即時反映は従来どおり保証される。
2. **sw.js の `?v=` / `?t=` 画像バイパスは廃止** — 画像・動画・BGM/storyboard 音声は cache-first。**同一 URL の上書き差し替えは今後 NG**: ピクセルを差し替える時は (a) ファイル名変更 (推奨、`_YYYYMMDD` suffix)、(b) `?v=` の値バンプ、(c) sw.js CACHE_VERSION バンプ (2世代で退役) のいずれか必須。admin の media 上書き系ワークフローは特に注意。
3. **precache は cache:'reload' → 'no-cache' + 旧世代 cache からの copy-forward**。CACHE_VERSION バンプごとの ~10.7MB 全量再DLは解消済み。
4. **sw.js の更新履歴コメントは docs/sw-changelog-archive.md へ退避**。sw.js 先頭には直近 ~10 エントリのみ保持 (次のバンプ時に古い行を archive へ移す)。
5. **フラッシュ防止の cover-first 原則**: ゲーム開始タップ→OP/チュートリアルの経路では、「不透明カバーを同期表示 → その後に await (fetch/decode) → 旧画面を隠す」の順を厳守。quizland / maze / bento / oto / puzzle で実装済み。新ゲーム・改修時も同パターンを踏襲。
6. **`Date.now()` キャッシュバスターは原則禁止** — 通常プレイヤー経路は安定版数、`?edit=1` 等のエディタ経路のみ hard-bust。

## 新設バージョン定数 (アセット/レイアウト更新時にバンプが必要)

- `QUIZLAND_ASSET_VERSION` (quizland/index.html, 'v2073') — quizland の illust/saved-layout 差し替え時にバンプ
- `MAZE_DATA_REV` / `STAGE_ASSET_REV` (maze/index.html, maze/image-runtime.js, '20260710') — maze の op-layout.json / stage JSON / stage 背景差し替え時にバンプ
- maze の `?v=1060` (imgBowlBoss ojama_boss.png) は**意図的に残置** (同名上書き差し替え歴のため、剥がすと旧絵が蘇る)

## WebP 変換の状態

- 494 枚変換済み (~285MB→~36MB)。**原本 PNG はすべてディスク上に温存** (安全ネット)。quizland illust は webp-first + png onerror フォールバック。
- 原本 PNG の cleanup は別タスク。着手前に cross-scope 参照の webp 化が必要: undersea-cave / sea-album / admin / common/museum-data.js / quizland/data/_review/image_manifest.json / .smoke_quizland.html。
- .assetsignore に assets/_legacy_png/ と Prototypes/StickerBookThreeJS/screenshots/ を追加済み (~107MB 配信除外)。

## 残課題 (未対処)

- **native/www ミラーは pre-batch のまま** — 次の Capacitor native build 前に再同期必須 (play.html/maze/bento/quizland/oto/preload-helper が旧挙動)。
- 音声の再エンコード (WAV 771 本 105MB → mp3/m4a、honey_bell_shop.mp3 190kbps→112kbps) は未実施。
- aquarium の岩 60 リクエストのスプライトシート化、play.html の inline CSS/JS 分割 (324KB+317KB) は未実施 (L 効果だが要リアーキ)。
- 実機 staging での視覚確認 (play.html の一斉ペイント挙動) 推奨: https://pono-asobiba-app-staging.ndw.workers.dev/
