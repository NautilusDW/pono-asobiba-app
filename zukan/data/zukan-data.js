// zukan-data.js
// ずかん SPA 用 seed データ。グローバル window.ZUKAN_DATA / ヘルパを export する。
// パスは zukan/index.html (SPA) からの相対パスで書く ( ../assets/... )。
// 4 エリア x 1 スポット x 1 動物 の seed。将来 9 匹/エリアまで拡張予定。

window.ZUKAN_DATA = {
  areas: [
    {
      id: "flower_path",
      displayName: "花の小道",
      sign: "../assets/zukan/map/sign_flower_path.png",
      innerSpotImg: "../assets/zukan/innermap/spot_flower_path.png",
      // world_map.png 内での hotspot 比率 (右上エリア)。実装エディタ調整前の暫定値
      worldHotspot: { x: 0.55, y: 0.10, w: 0.40, h: 0.40 },
      // world_map.png と同じ寸法 (1463x897) の透過 PNG。
      // 花の小道部分のみ絵柄、他は完全透明。 全画面オーバーレイで世界地図の上に
      // ぴったり重ねて発光させる。
      worldHighlight: "../assets/zukan/map/highlight/flower_path.png",
      // RPG ミニマップ風 innerMap (Phase 1)。 SVG viewBox 0..1600 0..900
      // hotspots[0] が機能 (spotIdx=0)、 hotspots[1..4] は placeholder (Phase 2 以降)
      innerMap: {
        baseColor: "#b6d99a",       // 明るい黄緑
        pathColor: "#d9b88a",       // 砂色
        // 中央広場 cx=800, cy=450 から 上下左右に枝
        pathSvg: "M 800 450 L 800 100 M 800 450 L 800 800 M 800 450 L 200 450 M 800 450 L 1400 450",
        pathStroke: 90,
        // ポノ初期位置 (Phase 2 で表示)
        ponoPos: { x: 0.50, y: 0.50 },
        hotspots: [
          { id: "main",  spotIdx: 0,    x: 0.50, y: 0.50, label: "おはなの ひろば" },
          { id: "north", spotIdx: null, x: 0.50, y: 0.11, label: "もりの いりぐち", placeholder: true },
          { id: "south", spotIdx: null, x: 0.50, y: 0.89, label: "ちいさな いけ",   placeholder: true },
          { id: "west",  spotIdx: null, x: 0.13, y: 0.50, label: "おおきな き",     placeholder: true },
          { id: "east",  spotIdx: null, x: 0.88, y: 0.50, label: "はなの ベンチ",   placeholder: true }
        ]
      },
      silhouettes: [
        "../assets/zukan/map/silhouettes/flower_path_1.png",
        "../assets/zukan/map/silhouettes/flower_path_2.png",
        "../assets/zukan/map/silhouettes/flower_path_3.png"
      ],
      ponoMemo: "おはなが いっぱいの みちだよ。\nウサギが かくれてるかも？",
      spots: [
        {
          id: "flower_path_main",
          name: "おはなの ひろば",
          fieldBg: "../assets/zukan/search/flower_path_field_16x9.png",
          // v1 (= 既存 fieldBg) + v2〜v5 placeholder。null は「未生成」を示す。
          // 命名規則: <area>_field_16x9_v<N>.png (v1 は既存ファイル名のまま、v2〜v5 が新規)
          fieldBgVariants: [
            "../assets/zukan/search/flower_path_field_16x9.png",
            null, null, null, null
          ],
          windowFrame: "../assets/zukan/ui/investigation_window_frame_16x9.png",
          // innermap 上のピン位置 (spot_flower_path.png 上の比率)
          mapPin: { x: 0.50, y: 0.55 },
          animals: [
            {
              animalId: "rabbit",
              animalName: "うさぎ",
              hiddenPart: "../assets/zukan/hidden_parts/rabbit_ears_hidden.png",
              hiddenPartStyle: { x: 0.64, y: 0.38, w: 0.08 },
              hotspot: { x: 0.62, y: 0.34, w: 0.14, h: 0.18 },
              hints: [
                "おはなの かげで\nなにかが うごいたよ",
                "ながい おみみが\nみえるかも？",
                "ぴょんぴょん はねる\nどうぶつだよ"
              ],
              owlComment: "ウサギは みみが ながいのじゃ！"
            }
          ]
        }
      ]
    },
    {
      id: "mushroom_forest",
      displayName: "きのこの森",
      sign: "../assets/zukan/map/sign_mushroom_forest.png",
      innerSpotImg: "../assets/zukan/innermap/spot_mushroom_forest.png",
      // 右下
      worldHotspot: { x: 0.55, y: 0.50, w: 0.40, h: 0.45 },
      // world_map.png と同寸 (1463x897) の透過 PNG。きのこの森のみ絵柄。
      worldHighlight: "../assets/zukan/map/highlight/mushroom_forest.png",
      silhouettes: [
        "../assets/zukan/map/silhouettes/mushroom_forest_1.png",
        "../assets/zukan/map/silhouettes/mushroom_forest_2.png",
        "../assets/zukan/map/silhouettes/mushroom_forest_3.png"
      ],
      ponoMemo: "きのこが いっぱいの もりだよ。\nハリネズミが かくれてるかも？",
      spots: [
        {
          id: "mushroom_forest_main",
          name: "きのこの ひろば",
          fieldBg: "../assets/zukan/search/mushroom_forest_field_16x9.png",
          fieldBgVariants: [
            "../assets/zukan/search/mushroom_forest_field_16x9.png",
            null, null, null, null
          ],
          windowFrame: "../assets/zukan/ui/investigation_window_frame_16x9.png",
          mapPin: { x: 0.50, y: 0.55 },
          animals: [
            {
              animalId: "hedgehog",
              animalName: "ハリネズミ",
              // 既存の隠しパーツが rabbit/cat/bird しかない。bird_shadow を流用
              hiddenPart: "../assets/zukan/hidden_parts/bird_shadow_hidden.png",
              hiddenPartStyle: { x: 0.30, y: 0.55, w: 0.08 },
              hotspot: { x: 0.28, y: 0.50, w: 0.14, h: 0.20 },
              hints: [
                "きのこの かげで\nなにかが もぞもぞ",
                "ちいさな まるい\nかげが みえるよ",
                "とげとげの せなかの\nどうぶつだよ"
              ],
              owlComment: "ハリネズミは とげが ある のじゃ！"
            }
          ]
        }
      ]
    },
    {
      id: "sunlit_forest",
      displayName: "こもれびの森",
      sign: "../assets/zukan/map/sign_sunlit_forest.png",
      innerSpotImg: "../assets/zukan/innermap/spot_sunlit_forest.png",
      // 左上
      worldHotspot: { x: 0.05, y: 0.10, w: 0.45, h: 0.40 },
      // world_map.png と同寸 (1463x897) の透過 PNG。こもれびの森のみ絵柄。
      worldHighlight: "../assets/zukan/map/highlight/sunlit_forest.png",
      silhouettes: [
        "../assets/zukan/map/silhouettes/sunlit_forest_1.png",
        "../assets/zukan/map/silhouettes/sunlit_forest_2.png",
        "../assets/zukan/map/silhouettes/sunlit_forest_3.png"
      ],
      ponoMemo: "ひかりが さしこむ もりだよ。\nリスが かくれてるかも？",
      spots: [
        {
          id: "sunlit_forest_main",
          name: "こもれびの ひろば",
          fieldBg: "../assets/zukan/search/leaf_glow_forest_field_16x9.png",
          // 注意: v1 のファイル名は既存命名 (leaf_glow_forest_field_16x9.png) を温存。
          // v2〜v5 は <area>_field_16x9_v<N>.png 規約に従い sunlit_forest_field_16x9_v<N>.png とする。
          fieldBgVariants: [
            "../assets/zukan/search/leaf_glow_forest_field_16x9.png",
            null, null, null, null
          ],
          windowFrame: "../assets/zukan/ui/investigation_window_frame_16x9.png",
          mapPin: { x: 0.50, y: 0.55 },
          animals: [
            {
              animalId: "squirrel",
              animalName: "リス",
              // 既存隠しパーツから cat_tail 流用 (リスっぽいしっぽとして見立て)
              hiddenPart: "../assets/zukan/hidden_parts/cat_tail_hidden.png",
              hiddenPartStyle: { x: 0.70, y: 0.40, w: 0.08 },
              hotspot: { x: 0.66, y: 0.36, w: 0.16, h: 0.22 },
              hints: [
                "きの えだで\nなにかが うごいたよ",
                "ふさふさの しっぽが\nみえるかも？",
                "どんぐり だいすきな\nどうぶつだよ"
              ],
              owlComment: "リスは どんぐりが だいすき のじゃ！"
            }
          ]
        }
      ]
    },
    {
      id: "dew_pond",
      displayName: "しずくの池",
      sign: "../assets/zukan/map/sign_dew_pond.png",
      innerSpotImg: "../assets/zukan/innermap/spot_dew_pond.png",
      // 左下
      worldHotspot: { x: 0.05, y: 0.50, w: 0.45, h: 0.45 },
      // world_map.png と同寸 (1463x897) の透過 PNG。しずくの池のみ絵柄。
      worldHighlight: "../assets/zukan/map/highlight/dew_pond.png",
      silhouettes: [
        "../assets/zukan/map/silhouettes/dew_pond_1.png",
        "../assets/zukan/map/silhouettes/dew_pond_2.png",
        "../assets/zukan/map/silhouettes/dew_pond_3.png"
      ],
      ponoMemo: "しずくが きらめく いけだよ。\nカモが かくれてるかも？",
      spots: [
        {
          id: "dew_pond_main",
          name: "しずくの ひろば",
          fieldBg: "../assets/zukan/search/dew_pond_field_16x9.png",
          fieldBgVariants: [
            "../assets/zukan/search/dew_pond_field_16x9.png",
            null, null, null, null
          ],
          windowFrame: "../assets/zukan/ui/investigation_window_frame_16x9.png",
          mapPin: { x: 0.50, y: 0.55 },
          animals: [
            {
              animalId: "duck",
              animalName: "カモ",
              hiddenPart: "../assets/zukan/hidden_parts/bird_shadow_hidden.png",
              hiddenPartStyle: { x: 0.45, y: 0.55, w: 0.08 },
              hotspot: { x: 0.42, y: 0.50, w: 0.16, h: 0.20 },
              hints: [
                "みずべで\nなにかが ぱしゃっ",
                "ちいさな くろい\nかげが うかんでるよ",
                "すいすい およぐ\nとりさんだよ"
              ],
              owlComment: "カモは みずに もぐるのが じょうずじゃ！"
            }
          ]
        }
      ]
    }
  ],

  // 各エリアで全動物の collection 登録に使う一覧 (今回は 1 エリア 1 匹を seed として実装するが、
  // collection roster は 9 匹/エリアまで含める。将来の拡張ポイント)。
  // animalImage は既存 assets/zukan/animals/<area>/<animalId>.png を参照。
  collectionRoster: {
    flower_path: [
      { animalId: "rabbit",     animalName: "うさぎ",     image: "../assets/zukan/animals/flower_path/rabbit.png" },
      { animalId: "kitten",     animalName: "ねこ",       image: "../assets/zukan/animals/flower_path/kitten.png" },
      { animalId: "puppy",      animalName: "いぬ",       image: "../assets/zukan/animals/flower_path/puppy.png" },
      { animalId: "hamster",    animalName: "ハムスター", image: "../assets/zukan/animals/flower_path/hamster.png" },
      { animalId: "guinea_pig", animalName: "モルモット", image: "../assets/zukan/animals/flower_path/guinea_pig.png" },
      { animalId: "pony",       animalName: "ポニー",     image: "../assets/zukan/animals/flower_path/pony.png" },
      { animalId: "piglet",     animalName: "こぶた",     image: "../assets/zukan/animals/flower_path/piglet.png" },
      { animalId: "sheep",      animalName: "ひつじ",     image: "../assets/zukan/animals/flower_path/sheep.png" },
      { animalId: "goat",       animalName: "やぎ",       image: "../assets/zukan/animals/flower_path/goat.png" }
    ],
    mushroom_forest: [
      { animalId: "hedgehog", animalName: "ハリネズミ",  image: "../assets/zukan/animals/mushroom_forest/hedgehog.png" },
      { animalId: "mouse",    animalName: "ねずみ",      image: "../assets/zukan/animals/mushroom_forest/mouse.png" },
      { animalId: "mole",     animalName: "もぐら",      image: "../assets/zukan/animals/mushroom_forest/mole.png" },
      { animalId: "dormouse", animalName: "やまね",      image: "../assets/zukan/animals/mushroom_forest/dormouse.png" },
      { animalId: "bat",      animalName: "こうもり",    image: "../assets/zukan/animals/mushroom_forest/bat.png" },
      { animalId: "badger",   animalName: "あなぐま",    image: "../assets/zukan/animals/mushroom_forest/badger.png" },
      { animalId: "ferret",   animalName: "フェレット",  image: "../assets/zukan/animals/mushroom_forest/ferret.png" },
      { animalId: "marten",   animalName: "テン",        image: "../assets/zukan/animals/mushroom_forest/marten.png" },
      { animalId: "stoat",    animalName: "オコジョ",    image: "../assets/zukan/animals/mushroom_forest/stoat.png" }
    ],
    sunlit_forest: [
      { animalId: "squirrel",        animalName: "リス",            image: "../assets/zukan/animals/sunlit_forest/squirrel.png" },
      { animalId: "fox",             animalName: "きつね",          image: "../assets/zukan/animals/sunlit_forest/fox.png" },
      { animalId: "tanuki",          animalName: "たぬき",          image: "../assets/zukan/animals/sunlit_forest/tanuki.png" },
      { animalId: "fawn",            animalName: "こじか",          image: "../assets/zukan/animals/sunlit_forest/fawn.png" },
      { animalId: "bear_cub",        animalName: "こぐま",          image: "../assets/zukan/animals/sunlit_forest/bear_cub.png" },
      { animalId: "baby_wild_boar",  animalName: "うりぼう",        image: "../assets/zukan/animals/sunlit_forest/baby_wild_boar.png" },
      { animalId: "red_panda",       animalName: "レッサーパンダ",  image: "../assets/zukan/animals/sunlit_forest/red_panda.png" },
      { animalId: "flying_squirrel", animalName: "ももんが",        image: "../assets/zukan/animals/sunlit_forest/flying_squirrel.png" },
      { animalId: "forest_bird",     animalName: "ことり",          image: "../assets/zukan/animals/sunlit_forest/forest_bird.png" }
    ],
    dew_pond: [
      { animalId: "duck",    animalName: "カモ",       image: "../assets/zukan/animals/dew_pond/duck.png" },
      { animalId: "mallard", animalName: "マガモ",     image: "../assets/zukan/animals/dew_pond/mallard.png" },
      { animalId: "swan",    animalName: "はくちょう", image: "../assets/zukan/animals/dew_pond/swan.png" },
      { animalId: "heron",   animalName: "サギ",       image: "../assets/zukan/animals/dew_pond/heron.png" },
      { animalId: "frog",    animalName: "カエル",     image: "../assets/zukan/animals/dew_pond/frog.png" },
      { animalId: "turtle",  animalName: "カメ",       image: "../assets/zukan/animals/dew_pond/turtle.png" },
      { animalId: "otter",   animalName: "カワウソ",   image: "../assets/zukan/animals/dew_pond/otter.png" },
      { animalId: "beaver",  animalName: "ビーバー",   image: "../assets/zukan/animals/dew_pond/beaver.png" },
      { animalId: "raccoon", animalName: "アライグマ", image: "../assets/zukan/animals/dew_pond/raccoon.png" }
    ]
  }
};

// localStorage 操作のヘルパも export
window.ZUKAN_STATE_KEY = "zukan.state.v1";

window.loadZukanState = function () {
  try {
    const raw = localStorage.getItem(window.ZUKAN_STATE_KEY);
    if (!raw) return { collected: {}, hintsUsed: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { collected: {}, hintsUsed: {} };
    parsed.collected = parsed.collected || {};
    parsed.hintsUsed = parsed.hintsUsed || {};
    return parsed;
  } catch (e) {
    console.warn("[zukan] state load failed:", e);
    return { collected: {}, hintsUsed: {} };
  }
};

window.saveZukanState = function (state) {
  try {
    localStorage.setItem(window.ZUKAN_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[zukan] state save failed:", e);
  }
};

window.markZukanCollected = function (animalId, areaId) {
  const s = window.loadZukanState();
  if (!s.collected[animalId]) {
    s.collected[animalId] = { area: areaId, at: Date.now() };
    window.saveZukanState(s);
  }
  return s;
};
