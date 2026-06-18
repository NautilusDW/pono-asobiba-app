# Sub Tier / Sticker Book Handoff

## Latest Context

- 現状は、2 つのメニューがどちらも「本を購入してくれた人向け」のメニュー扱いになっている。
- ただしシール帳側には全コンテンツが混ざっている。`スターパロジャー` 系やアプリ専用のものも入っている。
- シール帳は作り始めたばかりで、今後レイアウトやデザインを頻繁に変更する前提。
- そのため、購入者向けメニューとシール帳を分ける時に UI を複製しない。片方のレイアウトや見た目を直したら、もう片方にも自動で反映される構造にする。

## Required Separation

メニューは「見た目」と「出す内容」を分けて扱う。

| Surface | 表示するもの | 表示しないもの |
|---|---|---|
| Book Purchaser Menu | 本購入者向けの特典、購入済み本に紐づく項目 | アプリ専用、`スターパロジャー` 専用、シール帳全体カタログ |
| Sticker Book | シール帳として解放・収集できるシール | 購入者向けメニュー専用導線。ただしアプリ専用や `スターパロジャー` は別カテゴリ/別フィルタに分離 |

シール帳の中でも、少なくとも次のカテゴリを分ける。

- `book`: 本に紐づくシール。
- `app`: アプリ専用シール。
- `star_paroja`: `スターパロジャー` 系。
- `shared`: 両方で使える共通素材。必要な場合だけ明示する。

## Architecture Rule

メニューごとに別々のレイアウト prefab / view / style を持たせない。

推奨構造:

```text
ContentDefinition
  - id
  - displayName
  - thumbnail
  - category: book / app / star_paroja / shared
  - allowedSurfaces: book_purchaser_menu / sticker_book
  - unlockCondition
  - sortOrder

ContentCatalog
  - all items

ContentFilter
  - surface
  - allowed categories
  - entitlement requirements

SharedMenuLayoutView
  - grid/list layout
  - card visual
  - empty state
  - responsive spacing

BookPurchaserMenuController
  - uses SharedMenuLayoutView
  - applies book-purchaser filter

StickerBookController
  - uses SharedMenuLayoutView
  - applies sticker-book filter/category tabs
```

各画面の差分は、タイトル、説明文、選択中フィルタ、解放条件だけに閉じる。カードのサイズ、余白、色、タブ、グリッド、選択状態、ロック状態は共有 view 側に寄せる。

## Implementation Tasks

1. 現在の購入者向けメニューとシール帳メニューが参照しているデータソースを確認する。
2. コンテンツ定義に `category` と `allowedSurfaces` 相当の分類を追加する。
3. 既存のシール帳リストから `スターパロジャー` とアプリ専用項目を取り出し、カテゴリで分ける。
4. 2 つのメニューが別々のレイアウトを持っている場合は、共通の `SharedMenuLayoutView` に統合する。
5. 購入者向けメニューは `book` かつ `book_purchaser_menu` 許可の項目だけを表示する。
6. シール帳は `sticker_book` 許可の項目だけを表示し、`book` / `app` / `star_paroja` はタブまたはフィルタで分ける。
7. レイアウト変更時に両方へ反映されることを確認するため、両メニューが同じ共有 prefab / view / style を参照しているかチェックする。

## Guardrails

- UI の見た目を直すために、購入者向けメニュー専用 prefab とシール帳専用 prefab を二重管理しない。
- `スターパロジャー` やアプリ専用を、購入者向けメニューの初期一覧に混ぜない。
- 「本購入者向け」と「シール帳」は同じではない。購入者向けは権利/導線、シール帳は収集/閲覧の面として扱う。
- 今後カテゴリが増える前提で、`if (id.Contains(...))` のような文字列判定ではなく、データ側の分類で出し分ける。
- 既存データの移行時は保存済み解放状態を壊さない。ID は変更せず、分類フィールドだけ追加する。

## Verification

- Book Purchaser Menu に `app` と `star_paroja` の項目が出ない。
- Sticker Book では `book` / `app` / `star_paroja` を分けて表示できる。
- 共有レイアウト側のカードサイズや余白を変更すると、両方の画面に反映される。
- 既存の解放済みシール/購入済み状態が維持される。
- 新しいシールを追加する時は、データ定義にカテゴリと surface を入れるだけで該当メニューに出る。

## Page Flip Asset Plan

2026-06-16 historical update: the Three.js prototype began treating the page, spine, tabs, and ring hardware as separate runtime layers. Do not crop the full generated concept image for page textures, because the baked center/ring art creates duplicate horizontal rings. `tools/build_sticker_book_generated_texture_pack.py` generated page-only left/right/back textures with inner-edge binder holes, a spine/base texture, and a separate side-tab texture. The visible rings should be narrow 3D half-ring tube meshes in `Prototypes/StickerBookThreeJS/main.js`; ring endpoints should read as entering the page holes, not as visible cut caps. Page materials should write depth with alpha-tested holes, and the ring meshes should depth-test against the page so a turning page can occlude ring ends while holes reveal the ring path. Do not use the old 2D ring overlay path.

2026-06-16 texture/thickness update: do not add a separate full-height page-edge strip mesh to show paper thickness. It detaches from the turning page and creates a thin vertical sliver above/below the book. With the dedicated-layer pipeline, thickness should come from the visible page texture itself plus shadows; only use a separate generated asset if it is a narrow edge-only strip, not a full duplicate page. The flipping page itself stays a single deforming page surface. Do not bake metal rings into page textures. Keep page, spine/base, tabs, and 3D half-ring hardware as separate layers. Rings should stay matte and should not be the only high-gloss element in the scene.

2026-06-16 historical Image2 correction: the copied texture source was real Image2 output, not mostly procedural reconstruction. `sb3d_image2_texture_source.png` is the ringless full-book source that was used for left/right pages, underlays, spine, and tabs. `sb3d_image2_page_back_source.png` is the Image2 page-back source for the turning page reverse. The old `tools/build_sticker_book_generated_texture_pack.py` flow cropped these sources into runtime PNGs, then applied post-processing: alpha masks, binder holes, and temporary sticker-state icons. This is preserved as provenance, but the migration note below supersedes it for future fixes.

2026-06-16 migration note: this prototype and texture pack were moved from the Unity project workspace into the web app workspace at `D:\AppDevelopment\pono-asobiba-app`. In the app repo, runtime files use lowercase `assets/_PonoSubmarine/Art/UI/StickerBook3D/` and `tools/build_sticker_book_generated_texture_pack.py`. User review of batch:023 found that tightening crop masks only made the artifacts slightly paler and did not fix the underlying problem. Do not continue tuning crop boxes or alpha masks as the main fix.

2026-06-16 dedicated-layer redo: `tools/build_sticker_book_generated_texture_pack.py` now generates the runtime left page, right page, page back, spine/ring base, and left/right tab columns as dedicated front-facing PNG layers. `sb3d_image2_texture_source.png` and `sb3d_image2_page_back_source.png` remain in `assets/_PonoSubmarine/Art/UI/StickerBook3D/` as reference/provenance only. Do not use their crop boxes or masks to fix tab/page alignment. A non-runtime guide image, `sb3d_threejs_layer_guide.png`, documents the layer coordinate relationship for future Image2/style passes.

2026-06-16 real-page pass: the placeholder circle-based page art was replaced with GPT Image 2 inside-page and cover source art for two variants, `boy` and `girl`. `tools/build_sticker_book_generated_texture_pack.py` now ingests `sb3d_boy_*_source.png` and `sb3d_girl_*_source.png`, trims fake source-side binder/spine artifacts, overlays cover titles locally, and emits dedicated runtime textures for inside pages, covers, cover-inside pages, variant spines, and variant tab columns. `main.js` switches these via `?book=boy|girl` and `?surface=inside|cover`.

2026-06-16 underlay correction: do not render full-page `leftUnderlay` / `rightUnderlay` planes in the Three.js prototype. A separate underlay plane appears as a second misaligned sheet. Keep thickness in the visible page texture and shadows unless a future asset is specifically generated as a narrow edge-only strip.

2026-06-16 tab mask/cache correction: side-tab masks must be tight to the colored tab bodies. If the pale Image2 background is included in the mask, it appears as shifted bookmark/registration plates on both sides. `main.js` now appends `ASSET_VERSION` to texture URLs so the stable preview URL can remain unchanged while generated PNG cache is invalidated.

2026-06-16 side-tab alpha correction: the side tabs are not bookmarks or registration masks in the product model; they are visual tab layers behind the page edges. In the Three.js prototype, generate their alpha row-by-row so only the colored tab body remains opaque. Do not leave the pale Image2 source background or the vertical paper-edge strip inside the tab PNG alpha. The tab planes should sit slightly under the page edges, not outside them with a visible gap. `index.html` also version-suffixes `main.js` so the same preview URL can load the latest JS after a hard refresh.

ページめくりは、AI で別ページ画像を毎回作るのではなく、実際に表示している左右ページを同じ座標系から `RenderTexture` / スクショ化して使う。めくっている紙と表示中の紙が同一ソースなら、絵柄・余白・大きさのズレが出ない。

追加済み素材:

- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_left_test.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_right_test.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_back_blank.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_spine_underlay.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_binding_overlay.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_inner_shadow_left.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_inner_shadow_right.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_flip_shadow.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_book_floor_shadow.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_flat.obj`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_grid_32.obj`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_layout.json`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_generated_style_reference.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_image2_texture_source.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_image2_page_back_source.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_left_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_right_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_page_back_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_underlay_left_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_underlay_right_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_spine_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_side_tabs_left_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_side_tabs_right_generated.png`
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_side_tabs_generated.png`

生成画像由来のテクスチャは `tools/build_sticker_book_generated_texture_pack.py` で再生成する。

軸の基準:

- 右ページをめくる時は、右ページ画像の左端ではなく物理的な背表紙ラインを軸にする。
- `sb3d_page_grid_32.obj` は local X=0 がヒンジ。ページは +X 方向へ伸びる。
- 背表紙と金具はページとは別パーツにし、ページメッシュより前面に重ねる。
- 金具でヒンジ周辺を隠すことで、紙がリングの下を通っている見え方にする。

Unity 実装が難しい場合:

- `Prototypes/StickerBook3D/index.html` で同じ PNG を使ったローカル 3D 風プロトタイプを確認できる。
- `Prototypes/StickerBookThreeJS/index.html` で Three.js の実メッシュ版を確認できる。現在は rigid な `ShapeGeometry` ページで、`?book=boy|girl` と `?surface=inside|cover` の切替がある。CSS 3D ではない。
- Three.js 版は Perspective camera、移動ヒンジ、押し出し 3D リングを使う。ヒンジは右ページ側から左ページ側へ移動し、めくり終端の横位置が左ページ幅に合うようにする。
- 現在の Three.js 版は、以前生成したシール帳コンセプト画像を元にした `*_generated.png` テクスチャをデフォルトで使う。ページ比率も元絵に合わせてスクエア寄りへ変更済み。
- 先に HTML 側で軸、重なり、影の強さを調整し、確定した数値を Unity へ戻す。
- ただし最終的な本番は Unity の `RenderTexture` をページテクスチャに貼る方式が安全。HTML は検証用。
