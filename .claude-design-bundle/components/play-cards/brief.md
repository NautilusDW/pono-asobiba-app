# 「あそびばで できること」セクション 生成ブリーフ

> このファイルは Claude Design 上で 3 案を並列生成するための仕様書。生成対象は **ヒーロー B 案 (採用済) 直下に挿入する新セクション「あそびばで できること」のみ**。LP は morito 戦略再解釈により「遊び場コミュニティ醸成 LP」へ転換済み。3〜6 ヶ月以内のアプリ化 (PWA / ネイティブ) を見据えた **エンゲージメント獲得** が最大の目的。絵本販売は「ああ、絵本もあるんだ」程度の控えめ扱いで OK。

---

## 目的

- 親に **「うちの子にいい」と思える成長効果** を一目で伝える (知育・情緒・身体性のどれかを各カードで明示)
- 子供には **静止画だけで「これやりたい！」** とワクワクさせる。ファミマガ的グラビア感が key (morito の幼少期の記憶)
- ヒーロー B 案 CTA「すぐ あそぶ」で来た親子の **滞在時間を延ばし、play.html へ送客** する中継セクション
- ありきたりな絵本販売 LP 脱却 → 「遊び場」の体験価値を front and center に置く

---

## セクション全体の構造

- **配置**: ヒーロー B 案 直下 (Amazon バナー帯の **上**)
- **大見出し**: 「あそびばで できること」(Zen Maru Gothic 900, clamp(26px, 5.5vw, 44px), 中央寄せ、上下マージン余白多め)
- **サブ見出し**: 「ポノと いっしょに、こんな あそびが まってるよ」(700, clamp(14px, 3vw, 18px), `--text-light`)
- **カード**: 4-5 枚をグリッド配置 (BP により縦並び / 2 列 / 3-5 列で可変)
- **末尾 CTA リピート (任意)**: 「ぜんぶ あそびに いく →」(`--primary`, 角丸 24px, ヒーロー CTA と同一スタイル、`href="play.html"`)
- セクション背景: `--bg` ベースに薄い `--primary-light` グラデーション or 紙質ノイズ (印刷物っぽさ)

## 各カードの構造

- **visual**: 静止画 (推奨アスペクト比 16:9 or 4:3、`loading="lazy"`、`alt` は意味のある日本語)
- **title**: ふりがな付きゲーム名 (`<ruby>` 推奨、Zen Maru 900)
- **play_desc**: 「こういう遊び」1 文 (ひらがな多め、子供にも分かる優しい言葉)
- **growth_desc**: 「こういう力が育つ」1 文 (親向け、知育要素を明示。漢字使って OK)
- **(optional) tag chips**: 「もじ」「かず」「そうぞう」「リズム」「たんけん」等 1-2 個まで (`--primary-light` 背景, 12-13px)

---

## 3 案の方向性

### 案 A: 雑誌グラビア風 (ファミマガ全振り)

- 大きめ visual + たっぷり余白 + 手書き風キャプション (Zen Maru 900 + slight rotation)
- ファミマガっぽい **ワクワク感最強**。カラフルで賑やか
- カード間に余白多め、**縦並びゆったり** (PC でも 1-2 列まで)
- 各カードに「あたらしい！」「いま にんき！」等の手書き風吹き出しを 1 枚にだけ添える
- 背景: ノート罫線 or マスキングテープ風の装飾
- **狙い**: 子供が「次のページを早くめくりたい」と感じる。親も「子供が食いつくな」と感じる
- **避ける**: 整列しすぎ、グリッド感、情報密度高すぎ

### 案 B: 図鑑風 (整理感 / 親フレンドリー)

- 5 枚整列グリッド、統一ラベル、図鑑カード感
- 親が「比較・吟味」しやすい。タグチップ・育つ力のアイコン化を駆使
- カード小さめ、横並び (PC で 3-5 列、iPad で 2-3 列、phone で 2 列)
- visual はアスペクト比 4:3 で揃え、見出しの位置・行数を統一
- 背景: 淡い `--bg` 単色、余計な装飾なし
- **狙い**: 親が「ちゃんと考えて作られたサービス」と納得する。比較検討フェーズの安心感
- **避ける**: 子供向けポップ感の過剰演出、ガチャガチャ感

### 案 C: ストーリー型 (横スクロール / 絵本タッチ)

- 横スクロール (もしくは縦の小さいカルーセル、scroll-snap)
- 1 枚ずつめくる体験で「次は何？」を促す。**絵本を読む感覚** に寄せる
- キャプション多めの絵本タッチ。各カード下部に「ネモ先生」のコメント風 1 行 (語尾「だよ」「みてね」)
- visual はカード全幅、上 70% に画像、下 30% にテキスト
- 背景: クラフト紙 or 絵本見開きの折り目を模した薄影
- **狙い**: 絵本 LP との地続き感を残しつつ「遊び場の物語」として届ける。アプリ化後もカルーセル形式に流用しやすい
- **避ける**: 矢印が小さすぎる UX、スクロールヒント不足

---

## 取り上げる 要素 (5 要素、morito 確定)

### 1. ポノとつくろう いろどりべんとう (bento)
- **ふりがな**: `<ruby>彩<rt>いろど</rt></ruby>り<ruby>弁当<rt>べんとう</rt></ruby>` (もしくは「いろどりべんとう」全ひらがな)
- **play_desc 案**: 「すきな おかずを えらんで、じぶんだけの おべんとうを つくろう！」
- **growth_desc 案**: 「色の組み合わせや配置で **彩りのセンスと段取り力** が育ちます」
- **tag chips**: 「そうぞう」「いろ」「だんどり」
- **visual 候補**: `assets/images/bento/cooking/ui/recipe_card_frame.png` 系のレシピカード演出 or 完成おべんとうの俯瞰ショット (要 morito 別途キャプチャ)

### 2. ポノとランタンのめいろ (maze)
- **ふりがな**: `<ruby>迷路<rt>めいろ</rt></ruby>` or 全ひらがな
- **play_desc 案**: 「ランタンを もって、くらい もりを たんけん！ ゴールまで みちを みつけよう。」
- **growth_desc 案**: 「先を見通す **空間認識力・意思決定力** と、暗闇でも進む **小さな勇気** が育ちます」
- **tag chips**: 「たんけん」「ゆうき」「かんがえる」
- **visual 候補**: `assets/images/maze/title_back.jpg` (タイトル背景) or `maze/imageStages/stage5.jpg` (木の葉あかりの森、雰囲気抜群) or `assets/images/characters/pono/pono_lantan.png` (ランタン持ちポノ単体抜き)

### 3. ポノのおとタッチ (oto)
- **ふりがな**: 「おとタッチ」(全ひらがな+カタカナ)
- **play_desc 案**: 「タップで ドレミが なるよ！ どうぶつの こえや たいこも あそべるよ。」
- **growth_desc 案**: 「音の高低・リズム遊びで **聴覚と音感、表現する楽しさ** が育ちます」
- **tag chips**: 「リズム」「おんがく」「ひょうげん」
- **visual 候補**: `assets/images/oto/title_back.jpg` + `assets/images/oto/title_logo.png` 重ね、もしくは `btn_note_kana_do.png` 〜 `btn_note_kana_si.png` のドレミボタン横並び合成

### 4. シールアルバム (sticker album)
- **ふりがな**: 「シールアルバム」(カタカナそのまま)
- **play_desc 案**: 「あそんで あつめた シールを、じぶんの アルバムに ぺたぺた はろう！」
- **growth_desc 案**: 「集めて並べる楽しさで **達成感とコレクション欲、整理する力** が育ちます」
- **tag chips**: 「あつめる」「せいり」「たっせいかん」
- **visual 候補**: `assets/images/sticker-book/sticker_book_base_kids_16x9.png` (公式 16:9 ベース、まさにこの用途) + `sticker_page_bento_laminated.png` (見開き) 重ね

### 5. メインビジュアル / タイトル画面 (play.html 直結のキー絵)
- **ふりがな**: 「ポノの あそびば」
- **play_desc 案**: 「ここから ぜんぶの あそびに いけるよ。きょうは どれで あそぶ？」
- **growth_desc 案**: 「自分で選んで遊びを決める **主体性・選択力** が育ちます」
- **tag chips**: 「えらぶ」「しゅたいせい」
- **visual 候補**: `assets/ui/brand_sign_01.webp` (木製看板ロゴ、play.html スプラッシュで使用中、LP との一貫性 max) or `assets/ui/play_bento_title_back.webp` 系統の play.html 風タイル合成

> **note**: 5 枚を案 B 図鑑風で全採用、案 A グラビア風は 4 枚厳選 (タイトル画面を省略、もしくは hero と被るので削る)、案 C ストーリー型は 5 枚で「めくる順序」が体験になる構成、を推奨。

---

## 既存利用可能アセット (Phase 1 調査結果)

### bento (お弁当)
- `assets/images/bento/cooking/ui/recipe_card_frame.png` — レシピカード枠 (グラビア表紙風に流用可)
- `assets/images/bento/cooking/ui/mode_select_cards_sheet.png` — モード選択カード集合
- `assets/images/bento/cooking/ui/fridge_prep_thumbnails_sheet.png` — 食材サムネ集合
- `assets/images/bento/story/staff/pono_wave.webp` — ポノ手振り (お料理シェフ姿)
- `assets/images/bento/cooking/stove_base.webp` — コンロベース (背景素材)
- 不足: **完成お弁当の俯瞰ショット (vivid な色味)** — 要 morito キャプチャ or fal-ai 生成

### maze (めいろ)
- `assets/images/maze/title_back.jpg` — タイトル背景 (森の入口)
- `assets/images/maze/title_logo.png` — タイトルロゴ
- `maze/imageStages/stage5.jpg` — 木の葉あかりの森 (幻想的)
- `maze/imageStages/stage6.jpg` / `stage7.jpg` — 雰囲気ある背景
- `assets/images/characters/pono/pono_lantan.png` — ランタン持ちポノ単体抜き ⭐ (キーアセット)
- 不足: 「ランタンで照らす演出」が一目で分かる合成カット — 上記素材で十分合成可

### oto (おとタッチ)
- `assets/images/oto/title_back.jpg` — タイトル背景
- `assets/images/oto/title_logo.png` — タイトルロゴ
- `assets/images/oto/buttons/btn_note_kana_{do,re,mi,fa,so,la,si,do_high}.png` — ドレミ 8 ボタン (横並び合成にうってつけ)
- `assets/images/oto/buttons/btn_note_animal_*.png` — どうぶつの声バリエ
- 不足: なし。既存素材で十分

### sticker album (シールアルバム)
- `assets/images/sticker-book/sticker_book_base_kids_16x9.png` ⭐ **16:9 ベース、まさにカード visual 用**
- `assets/images/sticker-book/sticker_page_bento_laminated.png` — 見開き
- `assets/images/sticker-book/sticker_storage_sheet.png` — 収納シート
- `assets/images/sticker-book/sticker_page_flip_sheet_3x3.png` — めくり 3x3
- 不足: なし

### メインビジュアル (play.html / タイトル画面)
- `assets/ui/brand_sign_01.webp` ⭐ — 木製看板ロゴ (play.html スプラッシュで使用、LP との一貫性 max)
- `assets/ui/brand_sign_02.webp` — 木製看板別バージョン
- `assets/ui/play_bento_title_back.webp` — play.html ベント遷移用背景
- `assets/ui/play_maze_title_back.webp` / `play_oto_title_back.webp` — 各ゲームタイル背景 (5 枚モザイクに使える)
- `assets/images/characters/pono/pono_001.png` 〜 `pono_004.png` — ポノ各種ポーズ
- `assets/images/characters/pono_side_fullbody.webp` — 横向き全身
- 不足: なし

---

## 共通要件

### viewport / breakpoints
- **390px (iPhone) / 768px (iPad縦) / 1200px (PC)** の 3 BP すべてでプレビューを生成
- viewport meta は `width=device-width, initial-scale=1.0` のみ。`user-scalable=no` は使わない

### typography
- 本文: `Zen Maru Gothic` weight 700, fallback `Hiragino Maru Gothic Pro`
- 見出し: weight 900
- 各サイズは `clamp()` で BP 可変
- ふりがなは `<ruby>` タグ、`rt` は親要素の 40-50% サイズ

### colors (tokens/colors.html 準拠)
- `--bg: #FFF8F0`
- `--primary: #F2915A`
- `--primary-light: #FDDCBF`
- `--text: #5D4E37`
- `--text-light: #A89880`
- カードボーダー: `rgba(93, 78, 55, 0.08)` の薄い線
- カード影: `0 4px 14px rgba(93, 78, 55, 0.12)`

### アクセシビリティ
- **WCAG AA** コントラスト 4.5:1 以上 (大型 3:1)
- カード全体が `<a href="play.html#bento">` 等のリンクなら `:focus-visible` で 2px outline (`--primary`) 必須
- カードがリンクでない場合でも、内部 CTA に `:focus-visible` 必須
- `prefers-reduced-motion: reduce` 時、hover/load アニメーションを無効化
- visual の `alt` は意味のある日本語 (装飾画像なら `alt=""`)
- min タップターゲット 48px

### コピー制約
- **「無料」断言禁止** → 「**きほんの あそびは むりょう**」「すぐにあそべるよ」程度に留める
- 「今だけ」「限定」「○○ NO.1」等の煽り表現 NG
- 受賞バッジ・利用者数の架空数字 NG (景表法)
- 子供を煽る赤字・点滅 NG

### スコープ規律
- `:root` 再宣言禁止 → 必ず `.play-cards` (or section スコープ) に CSS 変数を退避
- staging 絶対 URL 禁止 → `assets/images/...` 相対パス
- inline `onerror` の JS 避ける → CSS only fallback (background-image 重ね or `<picture>`)
- Amazon バナーには触れない (このセクションは遊び場紹介専用、Amazon は別セクション)
- ヒーロー B 案の :root や CSS 変数を上書きしない

---

## NG

- 受賞バッジ / 利用者数の架空数字 (景表法)
- 子供を煽る赤字 / 「今だけ」「限定」表現
- 「無料」単独露出 (「むりょう」「ぜんぶ無料」等)
- 絵文字オンリーのサムネ (実画像 or 実イラスト必須、OS 間差を避ける)
- ゲームの完成度が伝わらない引きの素材だけの羅列
- Amazon / こだまの森出版 / 絵本販売 への直接言及 (このセクションはゲーム遊び場紹介専用)

---

## 採用後フロー

1. Claude Design 上で 3 案 (A/B/C) を並列生成 → 各 BP プレビュー確認
2. morito が採用案を選定 (案 + 細部 mix-and-match 許可)
3. Claude Code が `DesignSync` で pull → ヒーロー B 案直下、Amazon バナー上に挿入
4. `js/sw.js` の `CACHE_VERSION` をバンプ (sw.js キャッシュ対象を編集したため必須)
5. staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で iPad / iPhone / PC 実機検証
6. 不足アセット (bento 完成俯瞰) があれば `fal-ai-media` で生成 → `assets/images/bento/poster/` に配置
7. 本番反映 (Cloudflare Workers 配信)

---

## メモ (morito 向け)

- 案 B 図鑑風が **コンバージョン的に最有力候補** だが、案 A グラビア風の "ワクワク" を完全に捨てるのは惜しい → ハイブリッド (案 B レイアウト + 案 A の手書き吹き出し 1 枚) も視野
- 5 番目「タイトル画面」は **hero と意味が被るリスク** あり。図鑑風では 5 枚で完結、グラビア風では 4 枚に絞る、ストーリー型では「ゲートウェイ」として最後に置く、と使い分けると良い
- 完成 bento の俯瞰ショットが現状ない → 暫定案: `recipe_card_frame.png` + `fridge_prep_thumbnails_sheet.png` の合成、もしくは pono_wave (シェフ姿) + 食材アイコン散らしで凌ぐ
