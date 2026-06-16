# ポノの海底アルバム ステージ計画

## 基本ループ

1. ステージを選ぶ。
2. えさ魚雷と泡つきえさボムで生き物を観察する。
3. 観察できた生き物がアルバムに登録される。
4. アルバムで「すむところ」「たべもの」「からだのひみつ」を読む。
5. 未発見カードとレアカードを集めるために再挑戦する。

## えさの強化

- パワー1: えさ魚雷。画面内に1発だけ出せる。
- パワー2: えさ魚雷の曲がり方が少し強くなる。
- パワー3: 泡つきえさボムを2個まで落とせる。
- パワー4: えさ魚雷の再発射が少し早くなり、泡つきえさボムの効果範囲が広がる。

## ステージ1 探索ギミック

ステージ1では、メニューの多い探索ゲームにせず、「先へ進む → 何かを見つける → 左へ戻る → さっきなかったものが出る」を自然に覚えられるようにする。上下スクロールは将来ステージ用に残し、1面は左右スクロールだけで成立させる。

- ワールド幅: 1面は少し横に広げ、貝宝箱・泡スイッチ・真珠ゲートの間に探索の余白を作る。
- ボス条件: 時間経過では出さず、3つの真珠がそろってゲートを通過したらカブトガニ警告へ進む。

1. スタート近くの貝の宝箱
   - x=520 あたりに、最初から閉じた貝を見せておく。
   - ヤドカリにえさをあげて仲良くなると、「貝のかぎ」になる真珠を落とす。
   - 左へ戻って閉じた貝に触れると開き、コインがゆっくりばらまかれて、レアなアルバムメモが出る。

2. 海藻の奥の泡スイッチ
   - x=1850 あたりの下ルートを海藻カーテンでふさぐ。
   - ハゼにえさをあげると、海藻の奥にある泡スイッチを指さす。
   - 泡つきえさボムをスイッチに落とすと、そのプレイ中だけ海藻が上がって通れる。

3. 暗いしおだまりの小部屋
   - ボスゲートの少し左に、暗い横穴を置く。
   - 初回は生き物のシルエットだけ見える。
   - 「小さなライト」を買う、または拾ってから戻ると、レア生き物カードが1枚見つかる。

4. 3色真珠のボスゲート
   - ボス前に、真珠を3つはめる貝の台座を置く。
   - 真珠は「通常の生き物3匹と仲良くなる」「スタート近くの貝宝箱を開ける」「泡スイッチを押す」で1つずつ手に入る。
   - 3つそろうとゲートが開き、カブトガニの警告演出へ進む。

5. コインの使い道
   - 最初は攻撃力ではなく、探索が楽しくなる便利アイテムに使う。
   - 候補は「小さなライト」「磁石の貝」「地図ヒント」。
   - えさを読む時間を保ちつつ、繰り返し探索する意味を作れる。

## 見た目メモ

- 生き物が最後に喜ぶときは、吹き出しをピンクにしてハートを出す。
- 喜んだ生き物とハートは同じタイミングで薄くなって消える。
- コインは平面の丸ではなく、3D風にくるくる回りながら、ゆっくり海底へ落ちる。

## 7ステージ案

| ステージ | 場所 | 通常アルバム対象 | ボス |
|---|---|---|---|
| 1 | しおだまりと浅瀬 | ヤドカリ、小エビ、ヒトデ、ハゼ、イソギンチャク | カブトガニ |
| 2 | サンゴの迷路 | クマノミ、ナンヨウハギ、チョウチョウウオ、タツノオトシゴ、クリーナーシュリンプ | オウムガイ |
| 3 | 海藻の森 | カニ、アワビ、ウニ、小魚群れ、イカ | ミズダコ |
| 4 | 外洋の青い道 | マンタ、マンボウ、トビウオ、クラゲ、イワシ群れ | メガマウス |
| 5 | 夕暮れの中層 | ハダカイワシ、ホウライエソ、細長い深海魚、クラゲ | リュウグウノツカイ |
| 6 | 深海の海底 | ダイオウグソクムシ、深海エビ、ナマコ、アンコウ、タカアシガニ系 | シーラカンス |
| 7 | 古代海底神殿 | ダイオウイカ、巨大クラゲ、古代魚風、深海甲殻類 | クラーケン伝説 |

## ステージ1 アルファ素材の配置先

アルファ抜きと切り抜きが終わった最終PNGは、以下の名前で保存する。

```text
assets/images/sea-album/stage1/hermit_crab_normal.png
assets/images/sea-album/stage1/hermit_crab_eating.png
assets/images/sea-album/stage1/hermit_crab_happy.png
assets/images/sea-album/stage1/shrimp_normal.png
assets/images/sea-album/stage1/shrimp_eating.png
assets/images/sea-album/stage1/shrimp_happy.png
assets/images/sea-album/stage1/sea_star_normal.png
assets/images/sea-album/stage1/sea_star_eating.png
assets/images/sea-album/stage1/sea_star_happy.png
assets/images/sea-album/stage1/tidepool_goby_normal.png
assets/images/sea-album/stage1/tidepool_goby_eating.png
assets/images/sea-album/stage1/tidepool_goby_happy.png
assets/images/sea-album/stage1/sea_anemone_normal.png
assets/images/sea-album/stage1/sea_anemone_eating.png
assets/images/sea-album/stage1/sea_anemone_happy.png
assets/images/sea-album/stage1/horseshoe_crab_boss_normal.png
assets/images/sea-album/stage1/horseshoe_crab_boss_eating.png
assets/images/sea-album/stage1/horseshoe_crab_boss_happy.png
```

プレイヤー潜水艦は、既存の共通素材を使う。

```text
assets/images/ocean/Submarine/Submarine_003.png
```

現在のゲームは `sea-album/index.html` 内の素材切り替え設定で、これらのアルファPNGを読み込む。

## エフェクト素材方針

- 泡、小さいきらめき、ヒットリング、水のゆらぎなどの軽いエフェクトは、画像ではなくゲーム画面上で直接描く。
- キャラクターのような特別なデザインが必要な場合を除き、汎用の泡エフェクト画像は生成しない。
