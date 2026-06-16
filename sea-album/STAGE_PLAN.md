# ポノの海底アルバム Stage Plan

## Core Loop

1. Stage を選ぶ。
2. まっすぐ弾と、下へ落ちるぽよん弾で生き物を観察する。
3. 観察できた生き物がアルバムに登録される。
4. アルバムで「すむところ」「たべもの」「からだのひみつ」を読む。
5. 未発見カードとレアカードを集めるために再挑戦する。

## Weapon Growth

- Power 1: homing bait torpedo, one active shot at a time
- Power 2: bait torpedo turns a little faster
- Power 3: bubble food bomb can launch a 2-orb drop
- Power 4: bait torpedo reloads a little faster, bubble food bomb has wider splash

## Exploration Gimmicks

Stage 1 should teach "go forward, find an item, go back, reveal a hidden thing" without adding a menu-heavy RPG layer.

1. Hidden shell chest near the start
   - A closed shell sits at x=520, visible but locked.
   - After feeding the hermit crab, it drops a "shell key" pearl.
   - Returning left and touching the closed shell opens it, scattering coins and revealing a rare album note.

2. Bubble switch behind seaweed
   - A seaweed curtain blocks a lower path around x=1850.
   - Feeding the goby makes it point to a bubble switch just behind the curtain.
   - A bubble food bomb that lands on the switch lifts the seaweed for that run.

3. Dark tidepool nook
   - A dim side pocket sits left of the boss gate.
   - The first pass only shows silhouettes.
   - Buying or finding a "small light" lets the player revisit it and reveal one rare creature card.

4. Three-pearl boss gate
   - The boss approach has three empty shell sockets.
   - Pearl colors come from a small task each: feed all regular creatures once, open the start shell chest, and hit the bubble switch.
   - When all three are set, the gate animates open and the boss warning starts.

5. Coin use
   - Coins should first buy convenience items, not raw attack power: small light, magnet shell, and map hint.
   - This keeps the feeding pace readable while still making repeated exploration feel useful.

## Seven Stages

| Stage | Field | Regular album targets | Boss |
|---|---|---|---|
| 1 | しおだまりと浅瀬 | ヤドカリ、小エビ、ヒトデ、ハゼ、イソギンチャク | カブトガニ |
| 2 | サンゴの迷路 | クマノミ、ナンヨウハギ、チョウチョウウオ、タツノオトシゴ、クリーナーシュリンプ | オウムガイ |
| 3 | 海藻の森 | カニ、アワビ、ウニ、小魚群れ、イカ | ミズダコ |
| 4 | 外洋の青い道 | マンタ、マンボウ、トビウオ、クラゲ、イワシ群れ | メガマウス |
| 5 | 夕暮れの中層 | ハダカイワシ、ホウライエソ、細長い深海魚、クラゲ | リュウグウノツカイ |
| 6 | 深海の海底 | ダイオウグソクムシ、深海エビ、ナマコ、アンコウ、タカアシガニ系 | シーラカンス |
| 7 | 古代海底神殿 | ダイオウイカ、巨大クラゲ、古代魚風、深海甲殻類 | クラーケン伝説 |

## Stage 1 Alpha Asset Targets

After alpha/crop is done, save the final PNGs as:

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

The player submarine uses the existing shared asset:

```text
assets/images/ocean/Submarine/Submarine_003.png
```

The current game loads these alpha PNGs with `USE_ALPHA_SPRITES` in `sea-album/index.html`.

## Effect Asset Policy

- Bubbles, small food sparkles, hit rings, water shimmer, and other lightweight effects should be drawn as canvas particles.
- Do not generate or request image assets for generic bubbles unless the effect needs a specific character-like design.
