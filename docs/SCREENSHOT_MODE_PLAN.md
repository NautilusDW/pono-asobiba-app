# SCREENSHOT MODE PLAN

LP の play-cards / 将来のアプリストア掲載 / SNS マーケ素材 を、 各ゲームの「本物のゲーム画面」 から直接撮るための統一機構の設計プラン。

---

## 1. 目的 / 背景

### 1.1 背景
- LP (`/index.html`, `play.html`) の play-cards セクションで使用しているゲームサムネが、 現状 `recipe_card_frame.png` (UI フレーム) や `stage5.jpg` (背景単体) の流用にとどまっており、 「実際に遊んでいる画面」 に見えない。
- 既存の差し替え運用は `docs/SCREENSHOT_GUIDE.md` で **手撮り PNG を `assets/images/previews/` に置く** 前提で、 ゲーム内 UI のフレーム位置・キャラ表情・タイミングを毎回手で揃える必要があり、 再現性が低い。
- MVP リリース後 (`bento`, `maze`, `oto`, `puzzle`, `quizland` 全公開 + `starparodier`, `undersea-cave`, `sea-album` の sub tier 隠し公開) を機に、 「ゲーム本編から canvas/DOM を直接キャプチャ」 する内蔵機構へ移行したい。

### 1.2 目的
1. **LP play-cards 用** … 1920×1080 / 1200×900 等、 横長サムネ。 ストーリー性のある複数枚 (①導入 ②プレイ中 ③ごほうび) を 1 ゲームあたり 2〜3 枚。
2. **アプリストア掲載用** … App Store 6.5" (1284×2778) / 5.5" (1242×2208)、 Google Play 縦長 (1080×1920) 等の縦長スクショ。 デバイスフレーム合成も視野。
3. **SNS / マーケ素材** … X (1200×675) / Instagram (1080×1080 / 1080×1350) 等。

### 1.3 非目的
- ゲーム録画 (動画) は本プランの対象外 (将来 `MediaRecorder` で別系統)。
- 任意 DOM の HTML→Canvas レンダリング (html2canvas) は **採用しない** (フォント/CSS 差異で本編とズレるため)。 各ゲームの「本物の canvas/レイヤ」 をそのまま取り込む。

---

## 2. アーキテクチャ

### 2.1 全体方針
- 新規ファイル **`common/capture.js`** を 1 つ追加。 各ゲームの `index.html` には 3〜5 行の hookup (script tag + register 呼び出し) だけを足す。
- `common/capture.js` はトリガ層・合成層・出力層に分割した自己完結スクリプトとし、 `common/sw-update.js` と同じく **window guard** で多重初期化を防ぐ。
- 各ゲームは「自分の主要 canvas (および必要な DOM オーバーレイ) をどう合成すべきか」 を `window.PonoCapture.register({ gameId, build })` で **build コールバック** として渡す。 capture.js は build を呼び、 返ってきた `HTMLCanvasElement` (オフスクリーン) を PNG 化してダウンロードする。

### 2.2 ファイル構成
```
common/capture.js          ← 新規。 トリガ/UI/合成/出力。 全ゲーム共通。
{game}/index.html          ← 各ゲームに hookup 追加 (script + register)。
admin/index.html           ← Phase 3 で global trigger UI 追加。
assets/images/captures/    ← 任意。 ダウンロード先はブラウザ既定 (Downloads)。 開発時手動コピー用。
```

### 2.3 トリガ層
3 系統を用意:

| 種別 | 起動条件 | 用途 |
|---|---|---|
| URL クエリ | `?capture=1` (任意で `&w=1920&h=1080&fmt=png&shot=intro`) | LP/ストア向けバッチ撮影 (ブックマーク化) |
| キーボード | `Shift+Alt+C` (修飾必須) を 1 回押下 | 開発中のクイック撮影。 iPad Smart Keyboard を装着した子供利用環境を想定し、 修飾なし `C` 連打は採用しない (誤爆リスク + ゲーム内で C キーをデバッグショートカットに使う実装が将来出ても衝突しない) |
| Admin パネル | `admin/index.html` の「スクショモード」 ボタン → `localStorage.ponoCaptureArmed = '1'` をセットして対象ゲームを別タブで開く | Phase 3。 全ゲーム一括撮影、 sub tier 隠しゲーム含む |

3 系統とも最終的に `PonoCapture.armUI()` → 画面右下に「📸 撮る」 フローティングボタンを出す。 子供向け本番ビルドでも誤起動しないよう、 URL/キー/admin いずれかを経由しないと UI は出ない。

### 2.4 capture.js コア構造
```js
window.PonoCapture = {
  // 各ゲーム index.html が呼ぶ。 build は () => Promise<HTMLCanvasElement>
  register({ gameId, build, defaultLabel, presets }) { ... },

  // ゲーム側が「今 撮っていいよ」 を通知 (ready 待機型ゲーム用)
  markReady() { ... },

  // 即時撮影 (UI ボタン / shortcut から呼ばれる)
  async shoot({ w, h, label, fit } = {}) {
    const inner = await registered.build();   // ゲーム本編の canvas
    const out   = await compose(inner, { w, h, fit });
    const name  = fileName(gameId, label);
    download(out, name);
    return name;
  },

  // URL 駆動の自動撮影
  async autoshot() { /* ?capture=1 → 全 presets を順番に撮る */ },
};
```

### 2.5 合成層 (`compose`)
- 引数で指定された出力サイズ (例: 1920×1080) のオフスクリーン canvas を作成し、 ゲーム側 canvas を `fit: 'contain' | 'cover' | 'stretch'` で配置。
- 余白は **透明** がデフォルト。 オプションで `bg: '#fff'` や グラデも指定可能 (LP 用)。
- `devicePixelRatio` 補正: 出力 canvas は実ピクセルベース。 取り込み時に元 canvas が DPR 拡縮されていれば downscale。

### 2.6 出力層
- `canvas.toBlob('image/png', 1.0)` → `URL.createObjectURL` → `<a download>` をプログラム的にクリック。
- JPEG/WebP は Phase 2 のオプション (`&fmt=webp` 等)。
- ファイル名: `{game_id}_{YYYYMMDD}_{seq}.png` (seq は `sessionStorage` の連番)。 オプションで `&shot=intro` 等のラベルを末尾追加: `bento_20260619_001_intro.png`。

### 2.7 ゲーム側 hookup の最小コード
各ゲーム `index.html` (`</body>` 直前):
```html
<script src="/common/capture.js" defer></script>
<script>
  // canvas ベースの例 (maze)
  window.addEventListener('DOMContentLoaded', () => {
    window.PonoCapture?.register({
      gameId: 'maze',
      defaultLabel: 'play',
      build: async () => document.getElementById('gameCanvas'),
      presets: [{ label: 'intro' }, { label: 'play' }, { label: 'clear' }],
    });
  });
</script>
```
DOM ベース (bento/puzzle) は build 内で `document.getElementById('app')` の 子 canvas を merge するか、 後述 6 章の DOM→Canvas 戦略を取る。

---

## 3. ゲームごとの hookup 詳細表

| # | ゲーム | tier | 主要 canvas / 主要 DOM | ready シグナル | 推奨撮影タイミング | hookup 難易度 |
|---|---|---|---|---|---|---|
| 1 | **maze** | free | `#gameCanvas` (主), `#bowlCanvas` (stage7 ボーリングミニゲ) | stage select → in-play (3〜5s 経過後) | ステージ 3 中盤 / どんぐりボウリングのピン直前 / クリア表彰 | **易** |
| 2 | **oto** | free | `#bgCanvas` (背景), `#rhythm3d-road`, `#rhythm3d-notes` (3 枚合成必要) | 譜面開始 1 秒後 | 3D 道路にノートが流れている瞬間、 ポノが楽器を構えた瞬間 | **中** (3 canvas 合成) |
| 3 | **starparodier** | sub | `#gameCanvas` | wave 1 開始後 | 弾幕が画面に出ている戦闘中、 ボス登場カットイン | **易** |
| 4 | **undersea-cave** | sub | `#gameCanvas` | 探検開始後 | 洞窟内で生き物に遭遇した瞬間、 図鑑カード獲得演出 | **易** |
| 5 | **sea-album** | sub | `#gameCanvas` | アルバム表示後 | 海中シーン (魚が多く泳いでる瞬間)、 アルバムページめくり | **易** |
| 6 | **bento** | free | `#app` (DOM 構造)、 `.bento-stage`, `.right-panel.free-layout-panel` (パレット) | お弁当箱に 1 つ以上配置済 | おかずが並んでデコ前、 「これで OK」 確認モーダル直前 | **難** (DOM ベース。 build 内で複数子 canvas を集約 or 部分 html2canvas) |
| 7 | **puzzle** | free | DOM ベース (ピースは絶対配置 `<img>` / SVG)。 主要コンテナを特定要 | 1 ピース以上 hit 済 | パズル 70% 完成、 完成演出のキラキラ瞬間 | **難** (DOM ベース) |
| 8 | **quizland** | free | `#stage-area` 配下 (背景 SVG/img + キャラ + プレート DOM) | 第 1 問表示後 | 「だい X もんめ」 プレート出現直後、 正解バブル中 | **中** (DOM + SVG 背景) |

凡例:
- **易** … 既存の単一 canvas を `getElementById` で取って `compose` に渡すだけ。
- **中** … 複数 canvas / SVG を 1 枚に合成するロジックが必要。
- **難** … 主要表示が DOM。 後述「DOM ベース戦略」 を要適用。

---

## 4. 段階実装プラン

### Phase 1 — capture.js コア + 1 ゲーム (PoC)
**対象**: `common/capture.js` + `maze` (一番素直な単一 canvas)。

実装項目:
1. `common/capture.js` 新規作成。 register / shoot / compose / download / armUI / hotkey / URL parser を実装。
2. `maze/index.html` に hookup 3 行を追加 (script + register)。
3. `sw.js` の `CACHE_VERSION` を +1 (`common/capture.js` を precache 対象に追加)。
4. `?capture=1` と `C×2` の両トリガで `maze_YYYYMMDD_001.png` が落ちることをローカル確認。
5. プリセット `intro/play/clear` を 3 連射する `?capture=1&auto=1` をテスト。

完了条件:
- ローカルで maze を開き、 `?capture=1` → 撮影 UI → 1920×1080 PNG ダウンロード。
- 子供向け通常起動 (`/maze/` 単体) では UI が出ないこと。

### Phase 2 — 全ゲーム展開
**対象**: 残り 7 ゲーム (`oto`, `starparodier`, `undersea-cave`, `sea-album`, `bento`, `puzzle`, `quizland`)。

実装順 (易 → 難):
1. `starparodier`, `undersea-cave`, `sea-album` (易、 ほぼコピペ)
2. `oto` (中、 3 canvas 合成)
3. `quizland` (中、 SVG + DOM)
4. `bento`, `puzzle` (難、 DOM ベース戦略を適用)

DOM ベースは Phase 2 後半で 1 つ確立できれば残りに横展開可能 (6 章参照)。

完了条件:
- 全 8 ゲームで `?capture=1` から最低 1 枚撮れる。
- LP 用 16:9 と ストア用 9:16 の両方で破綻しないこと (fit 確認)。
- `docs/SCREENSHOT_GUIDE.md` を Phase 1/2 用に追記更新。

### Phase 3 — admin パネル統合 + バッチ撮影
**対象**: `admin/index.html`。

実装項目:
1. admin に「📸 スクショモード」 タブを新設。 `localStorage.ponoCaptureArmed = '1'` をセットして「対象ゲームを別タブで開く」 ランチャー (8 ゲーム + プリセット選択)。
2. 各ゲーム capture.js は起動時に `localStorage.ponoCaptureArmed` を見て、 URL クエリなしでも UI を armed 状態にする。
3. **バッチモード**: admin から「全ゲーム × 全プリセット 連続撮影」 を起動 → 各ゲームを順に開き、 撮影完了で次へ。 `BroadcastChannel('pono-capture')` でタブ間連絡。
4. (任意) 撮影済リストを admin に表示 (`IndexedDB` に Blob を保存して再エクスポート可能に)。

完了条件:
- admin から 1 クリックで全 8 ゲームの全プリセットが連射撮影できる。
- sub tier 隠しゲーム (`starparodier`, `undersea-cave`, `sea-album`) も admin gate 経由でのみ撮影できる。

---

## 5. ストア掲載用拡張

### 5.1 アスペクト比プリセット
`common/capture.js` 内に共通プリセットテーブルを持つ:

| プリセット名 | 解像度 | 用途 |
|---|---|---|
| `lp-16x9` | 1920×1080 | LP play-cards / SNS X |
| `lp-4x3` | 1200×900 | LP プロモモーダル (既存 previews 後継) |
| `ig-square` | 1080×1080 | Instagram 正方形 |
| `ig-portrait` | 1080×1350 | Instagram 縦 |
| `ios-65` | 1284×2778 | App Store 6.5" |
| `ios-55` | 1242×2208 | App Store 5.5" |
| `play-portrait` | 1080×1920 | Google Play 縦 |
| `play-landscape` | 1920×1080 | Google Play 横 |

URL: `?capture=1&preset=ios-65`、 または admin から複数選択チェックボックス。

### 5.2 デバイスフレーム合成 (Phase 3.5)
- `assets/images/frames/iphone_15_pro.png` 等のフレーム PNG (中央くり抜き済) を別途用意し、 `compose` の後段で重ねるオプション `frame: 'iphone-15-pro'`。
- フレーム内の差し込み領域は JSON で定義: `{ x, y, w, h, radius }`。 透過 PNG で枠+影、 中央に canvas を `clip` で配置。
- 縁の角丸クリップは Path2D + `roundRect`。

### 5.3 余白・背景・キャプション (Phase 3.5)
- ストアスクショは余白上下にキャプション文字 (「ぽのと いっしょに おうちごはん！」 等) を載せたいケースがある。
- `compose` に `caption: { text, font, color, align }` を追加。 ただしフォントは Web 配信フォントが limp になるため、 PNG 出力後に Figma 等で別合成も可。 最低限の「テキスト無し版」 をデフォルトに。

---

## 6. DOM ベースゲーム (bento / puzzle / quizland) の戦略

DOM ベースを綺麗に PNG 化する戦略 3 案、 採用順:

1. **A. ゲーム側に「キャプチャ用合成 canvas」 を生やす (推奨)**
   - 各ゲームは元々レンダラを持っているはず (bento はおかず配置を canvas で描いている瞬間がある: 8585 行で `document.createElement('canvas')` で mask を作っている)。
   - キャプチャ要求時のみ、 ゲームの主要状態 (配置データ / ピース位置 / 背景 ID) を読み、 オフスクリーン canvas に再レンダする `renderForCapture()` を各ゲームに実装してもらう。
   - 利点: 解像度を出力サイズに合わせて自由に出せる (Retina 相当 1920 幅でクリア)、 UI ボタンが写り込まない。
   - 欠点: ゲームごとに描画コードの 1 関数化が必要。

2. **B. SVG + foreignObject トリック**
   - 主要 DOM を `<foreignObject>` 経由で SVG 化 → `Image` 経由で canvas に描く。
   - 欠点: CSS フォント・外部 webfont が乗らない。 quizland のように SVG キャラ多用なら可。

3. **C. html2canvas (フォールバック)**
   - 既存 OSS。 サイズが大きく、 フォント/グラデ再現が完全ではない。 採用は最後の手段。

→ Phase 2 では **A 案** を bento / puzzle / quizland で順次実装する。 各ゲーム build 内で `renderForCapture(w, h)` を呼ぶ規約。

---

## 7. セキュリティ / ガバナンス

### 7.1 子供向け本番での誤起動防止
- capture.js は **window guard + 3 トリガ いずれかを経由しないと UI を出さない**。 デフォルトでは `<script>` を読み込んだだけでは何も起きない。
- `Shift+Alt+C` はモバイル (タッチ) では発火しない、 iPad Smart Keyboard でも 3 キー同時押しは幼児の手指では事実上不可能 → 子供誤爆 0。
- `?capture=1` を含む URL を play.html や LP からは絶対にリンクしない。
- **環境ガード追加**: capture.js は `location.hostname` を見て **本番ドメイン (pono-asobiba-app.ndw.workers.dev 等) では 3 トリガすべてを無効化** し、 `localhost` / `*-staging.ndw.workers.dev` / `127.0.0.1` のみで有効化する。 admin gate 経由の `sessionStorage.ponoCaptureArmed` のみ本番でも例外許可 (admin パスワード保護下なので)。

### 7.2 sub tier 隠しゲームの撮影権限
- `starparodier`, `undersea-cave`, `sea-album` は現状 `PonoTier` で sub 判定がないとゲーム本体が起動しない (tier 判定は `common/tier.js` の `isAppBuild()` = `window.__APP_BUILD__` 経由)。
- 撮影時は admin gate の裏で `sessionStorage.ponoCaptureTierBypass = '1'` を立て、 各ゲーム起動コードに「capture armed && sessionStorage flag が立っていれば tier check skip」 を追加。
- **APP_BUILD との整合**: capture モード時は `window.__APP_BUILD__` を勝手に書き換えない (Worker が prepend する正規ルートを汚染しない)。 代わりに `PonoTier` に `setCaptureOverride(true)` のような明示 API を追加し、 capture flag が立っているときだけ `PonoTier.getTier()` が `'sub'` を返すよう拡張する (= [tier_system_policy memory](feature_puzzle_mori_no_nakayoshi.md) の free/book/sub 3 パターン維持と非破壊で両立)。
- localStorage には書かない (タブを閉じれば消える)。 admin 経由でしかこの session flag は立たない。

### 7.3 admin gate
- admin ページ自体は既存の admin パスワードゲート (現行運用) の裏。 capture trigger 機能はその admin タブの一画として追加するので、 既存の gate を流用。
- バッチ撮影タブが BroadcastChannel で session 内通信 → 別オリジン窃取不可。

### 7.4 機密データの写り込み防止
- 撮影前に DOM 内の デバッグオーバーレイ (DEV indicator 等)、 設定ボタン、 admin ボタンを `[data-capture-hide]` 属性で隠す。
- capture.js の armUI 起動時に `document.body.classList.add('capture-armed')` → CSS で `.capture-armed [data-capture-hide]{visibility:hidden}` を一括適用。

---

## 8. 工数見積もり

| Phase | 内容 | 概算 |
|---|---|---|
| Phase 1 | capture.js コア + maze hookup + sw.js bump + ローカル検証 | **0.5〜1 日** |
| Phase 2 | 残り 7 ゲーム hookup (易 3、 中 2、 難 2) + DOM 戦略 A 実装 + プリセット表整備 | **3〜4 日** |
| Phase 3 | admin パネル統合 + バッチ撮影 + デバイスフレーム合成 + キャプション | **2〜3 日** |
| **合計** | | **5.5〜8 日** |

(難 2 ゲーム + quizland の DOM `renderForCapture()` 実装が最大リスク。 bento は 8585 行付近で動的 canvas を多用しておりイベント駆動状態保持型のため、 「現スナップショットから 1 枚 canvas へ再描」 関数の新設は実質ゼロから書く工数。 oto の 3 canvas 合成も z-order と DPR ズレで初回ハマりが想定される。 admin バッチ + BroadcastChannel + デバイスフレーム合成は実装が嵩む割に検証も必要なため 1.5〜2 日では足りない可能性が高く、 2〜3 日に伸長。)

**フォールバック方針**: DOM ベース A 案 (`renderForCapture()`) が想定より重いと判明した時点で、 該当ゲームのみ html2canvas (Phase 2 後半・案 C) に切替可能。 html2canvas は CDN 配信 (3〜5KB gzipped の loader でも素材本体は ~50KB) で capture モード時のみ動的 import → 本番バンドルを汚染しない。

---

## 9. 既存コード調査結果

### 9.1 canvas ベース (易〜中)
- `maze/index.html:2847` → `<canvas id="gameCanvas">` (主)
- `maze/index.html:7672` → `<canvas class="bowl-game__canvas" id="bowlCanvas">` (stage7 ミニゲ)
- `oto/index.html:5057` → `<canvas id="bgCanvas">`
- `oto/index.html:5158-5159` → `<canvas id="rhythm3d-road">` + `<canvas id="rhythm3d-notes">` (3D ノート)
- `starparodier/index.html:333` → `<canvas id="gameCanvas">`
- `undersea-cave/index.html:303` → `<canvas id="gameCanvas">`
- `sea-album/index.html:735` → `<canvas id="gameCanvas">`

### 9.2 DOM ベース (難)
- `bento/index.html:4984` → `<div id="app">` がルート。 内部にパレット (`.right-panel.free-layout-panel`) と弁当箱 (`.bento-stage`)。 マスク生成では `document.createElement('canvas')` を内部で多用 (8585 行〜) しているので、 同方式で 1 枚 canvas を生やす目はある。
- `puzzle/index.html:71` → `<div id="puzzle-container">` がパズル本体ルート (`puzzle/main.js:425` で `getElementById('puzzle-container')` を取得し、 ピース img / scatter overlay / 完成形 canvas 等をすべてここに重ねる)。 加えて `#success-modal` / `#confetti-container` 等は本体外オーバーレイなので、 build 内で `#puzzle-container` を基準に bounding rect 取得 → 主要子要素 (img/SVG/独立 canvas) を一括合成する方針で良い。 事前 1 時間調査は不要。
- `quizland/index.html:3422` → `<div id="stage-area">` がステージ全体。 内部に SVG キャラ + プレート DOM。

### 9.3 既存 `common/` (capture.js 追加が干渉しないか)
`common/` 配下 18 ファイル (encyclopedia / highscore / museum-data / parallax / se / treasure / first-clear / thankyou / stickers / mvp-flags / page-nav / narration / achievements / menu / acorns / promo / tier / sw-update)。 いずれも `window.Pono*` 名前空間で生存しており、 **`window.PonoCapture` は名前衝突なし**。 capture.js を新規追加しても既存スクリプトに副作用なし。

### 9.4 sw.js キャッシュ運用
- 現行 `sw.js` の `CACHE_VERSION` は `1340` (`sw.js:84`)。 新規ファイル `common/capture.js` を追加した時点で +1 し、 同行 v-comment に Phase 番号と「Screenshot capture core + maze hookup」 等の要約を追記する (既存規約に沿う)。
- precache 戦略を再確認: 現行 sw.js は明示的な precache list ではなく `fetch` ハンドラ内のランタイムキャッシュ方式 (`sw.js:94` コメント参照)。 つまり `/common/capture.js` への明示登録は不要、 初回アクセス時に自動キャッシュされる。 ただし **capture.js が dev/staging でしか動かない仕様** (7.1 の hostname ガード) なので、 本番ユーザーには配布しても起動しない安全側設計。
- 各ゲーム index.html 編集を伴うため、 [Deploy pipeline & SW update memory](tech_deploy_pipeline_sw_update.md) の「toast 型更新 UX」 「skipWaiting/clients.claim を install/activate で呼ばない設計」 を維持。

### 9.5 既存スクショ運用との関係
- `docs/SCREENSHOT_GUIDE.md` は「手撮り PNG を `assets/images/previews/` に置く」 運用。 Phase 2 完了時点でこのドキュメントを「自動撮影 → 手で previews/ にコピー」 フローに更新する。
- 既存 `assets/images/previews/{game}_{n}.png` 命名は LP プロモモーダルが直接参照しているので、 capture.js の出力ファイル名 (`{game_id}_{date}_{seq}.png`) からのリネーム手順を Phase 2 のドキュメント更新に含める。

---

## 10. オープン課題

- フォント (web font) のロード完了待ち … `document.fonts.ready` を `shoot` 前に await する。
- DPR 高い端末で巨大 canvas を作る場合のメモリ上限 (iOS Safari は 16384²?). ストア用 1284×2778 程度なら問題なし。
- 動画素材 (App Preview) は対象外だが、 同じ capture フックを `MediaRecorder` で拡張できる設計にしておく (build を呼んだ canvas から `captureStream()` 可)。
