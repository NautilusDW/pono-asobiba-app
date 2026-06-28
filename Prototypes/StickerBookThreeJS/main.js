import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const ASSET_ROOT = "../../assets/_PonoSubmarine/Art/UI/StickerBook3D/";
const ASSET_VERSION = "20260629-928";
const PAGE_ASPECT = 1472 / 1536;
const PAGE_TEXTURE_W = 1472;
const PAGE_TEXTURE_H = 1536;
const PAGE_H = 6.0;
const PAGE_W = PAGE_H * PAGE_ASPECT;
const GUTTER = PAGE_H * (192 / 1536);
const COLLECTION_GUTTER = 0;
const SPINE_W = PAGE_H * (256 / 1536);
const CAMERA_FOV = 34;
const PAGE_RADIUS = PAGE_H * (92 / 1536);
const PAGE_HOLE_X = PAGE_W * (38 / 1472);
const PAGE_HOLE_RX = PAGE_W * (16 / 1472);
const PAGE_HOLE_RY = PAGE_H * (18 / 1536);
const PAGE_RING_PIXELS = [218, 452, 686, 920, 1154, 1388];
const STICKER_SPINE_STACK_EXTENSION = PAGE_H * 0.055;
const STICKER_SPINE_H = PAGE_H + STICKER_SPINE_STACK_EXTENSION;
const STICKER_SPINE_TOP_LIFT = PAGE_H * (5 / PAGE_TEXTURE_H);
const STICKER_OPEN_GAP = GUTTER * 0.62;
const STICKER_STACK_SPINE_OVERLAP = 0;
const BINDING_RING_HOLE_X = STICKER_OPEN_GAP / 2 + PAGE_HOLE_X;
const BINDING_RING_ENDPOINT_X = BINDING_RING_HOLE_X + PAGE_HOLE_RX * 2.15;
const BINDING_RING_TUBE_RADIUS = PAGE_H * 0.0086;
const BINDING_RING_ENDPOINT_Z = -0.088;
const BINDING_RING_HOLE_Z = -0.075;
const BINDING_RING_ARCH_Z = 0.44;
const BINDING_RING_ARCH_Y = PAGE_H * 0.006;
const BINDING_RING_BODY_COLOR = 0xd9d2bd;
const THICKNESS_TEXTURE_H = PAGE_H * (256 / 1536);
const THICKNESS_OVERLAP = PAGE_H * (16 / 1536);
const THICKNESS_LEVEL_NAMES = ["empty", "small", "half", "mostly", "full"];
const THICKNESS_DEFAULT_SCALE_Y = {
  empty: 0,
  small: 0.8,
  half: 0.9,
  mostly: 0.97,
  full: 1,
};
const STICKER_PLAN_URL = "./sticker_book_content_plan.json";
const GAME_STICKER_CATALOG_URL = "../../assets/data/game-stickers.json";
const STICKER_ASSET_PREFIX = "../../";
const EDITOR_STORAGE_KEY = "sb3d_sticker_editor_free_pages_v1";
const COLLECTION_ALBUM_PLACEMENTS_STORAGE_KEY = "sb3d_collection_album_placements_v1";
const EDITOR_STATE_VERSION = 3;
const COLLECTION_ALBUM_STATE_VERSION = 1;
const DEFAULT_CONTENT_SEED_VERSION = 2;
const EMPTY_STICKER_START_VERSION = 2;
const STICKER_TUTORIAL_SEEN_KEY = "sb3d_sticker_tutorial_seen_v1";
const STICKER_TUTORIAL_AUDIO_BASE = "../../assets/audio/stickerbook/tutorial/";
const STICKER_TUTORIAL_HAND_BASE = "../../assets/images/puzzle/ui/tutorial/";
const STICKER_TUTORIAL_HANDS = {
  open: `${STICKER_TUTORIAL_HAND_BASE}hand_open_hover.png`,
  release: `${STICKER_TUTORIAL_HAND_BASE}hand_open_release.png`,
  ready: `${STICKER_TUTORIAL_HAND_BASE}hand_grab_ready.png`,
  grip: `${STICKER_TUTORIAL_HAND_BASE}hand_grip.png`,
  pinch: `${STICKER_TUTORIAL_HAND_BASE}hand_pinch.png`,
  point: `${STICKER_TUTORIAL_HAND_BASE}hand_point_left.png`,
};
const STICKER_TUTORIAL_PICK_STICKER_IDS = [
  "maze_normal_lantern_lost_hachi_kabuto_amenbo_chocho_001",
  "bonus_quizland_chocho_rare",
  "quizland_butterfly",
  "maze_chocho",
];
const STICKER_TUTORIAL_DECOY_STICKER_IDS = [
  "bonus_quizland_batta_normal",
  "quizland_good_stamp_layer_14",
];
const STICKER_ALBUM_PAGE_COUNT = 12;
const COLLECTION_ALBUM_STICKERS_PER_PAGE = 12;
const COLLECTION_INDEX_ITEMS_PER_PAGE = 6;
const COLLECTION_PLACEMENT_SCALE = 0.52;
const STICKER_TRAY_DRAG_THRESHOLD = 8;
const COLLECTION_TOC_CATEGORY_DEFS = [
  {
    id: "bugs",
    label: "むし",
    indexTitle: "むしずかんもくじ",
    pageLabel: "むしずかん",
    summary: "はねや あしの かたちを みてみよう",
    representativeSubjectIds: ["bug_hachi", "bug_chocho", "bug_kabutomushi", "bug_amenbo"],
  },
  {
    id: "animals",
    label: "どうぶつ",
    indexTitle: "どうぶつずかんもくじ",
    pageLabel: "どうぶつずかん",
    summary: "もりや まちで あえる いきもの",
    representativeSubjectIds: ["animal_dog", "animal_cat", "animal_lion", "animal_penguin"],
  },
  {
    id: "sea",
    label: "うみ",
    indexTitle: "うみのずかんもくじ",
    pageLabel: "うみずかん",
    summary: "うみや みずべで くらす なかま",
    representativeSubjectIds: ["sea_kujira", "sea_kani", "sea_jinbeizame", "sea_daiouika"],
  },
  {
    id: "food",
    label: "たべもの",
    indexTitle: "たべものずかんもくじ",
    pageLabel: "たべものずかん",
    summary: "からだを つくる おいしい もの",
    representativeSubjectIds: ["food_onigiri", "food_tamago", "food_karaage", "food_broccoli"],
  },
];
const COLLECTION_ZUKAN_SUBJECT_DEFS = [
  {
    id: "bug_hachi",
    categoryId: "bugs",
    sourceStickerIds: ["maze_hachi"],
    label: "はち",
    kana: "はち",
    habitat: "はなや きの まわり",
    group: "こんちゅう",
    fact: "はなの みつを あつめながら、はなから はなへ かふんを はこぶことが あります。",
    guideSpeaker: "ポノ",
    guideText: "しまもようと はねを そっと かんさつしよう。",
  },
  {
    id: "bug_kabutomushi",
    categoryId: "bugs",
    sourceStickerIds: ["quizland_kabutomushi", "maze_kabuto"],
    label: "かぶとむし",
    kana: "かぶとむし",
    habitat: "もりの きや くちき",
    group: "こんちゅう",
    fact: "おすには おおきな つのが あり、じゅえきの でる きに あつまります。",
    guideSpeaker: "Codex",
    guideText: "つの、あし、からだの かたちを くらべてみよう。",
  },
  {
    id: "bug_amenbo",
    categoryId: "bugs",
    sourceStickerIds: ["maze_amenbo"],
    label: "あめんぼ",
    kana: "あめんぼ",
    habitat: "いけや かわの みずの うえ",
    group: "こんちゅう",
    fact: "ほそながい あしで みずの ひょうめんに たって、すいすい うごきます。",
    guideSpeaker: "ポノ",
    guideText: "みずに しずまない あしの ひみつを みつけよう。",
  },
  {
    id: "bug_chocho",
    categoryId: "bugs",
    sourceStickerIds: ["maze_chocho", "quizland_butterfly"],
    label: "ちょうちょ",
    kana: "ちょうちょ",
    habitat: "はなばたけや くさはら",
    group: "こんちゅう",
    fact: "はねには もようがあり、ながい くちで はなの みつを すいます。",
    guideSpeaker: "Codex",
    guideText: "はねの いろと もようを ゆっくり みてみよう。",
  },
  {
    id: "animal_dog",
    categoryId: "animals",
    sourceStickerIds: ["quizland_dog", "bento_inu"],
    label: "いぬ",
    kana: "いぬ",
    habitat: "ひとの くらしの そば",
    group: "ほにゅうるい",
    fact: "においを かぐ ちからが つよく、ひとの くらしを たすける しごとも します。",
    guideSpeaker: "ポノ",
    guideText: "みみや しっぽで きもちを つたえるよ。",
  },
  {
    id: "animal_cat",
    categoryId: "animals",
    sourceStickerIds: ["quizland_cat", "bento_neko"],
    label: "ねこ",
    kana: "ねこ",
    habitat: "まちや いえの まわり",
    group: "ほにゅうるい",
    fact: "やわらかい からだで しずかに あるき、ひげで せまい ところを たしかめます。",
    guideSpeaker: "Codex",
    guideText: "ひげ、つめ、めの かたちに ちゅうもく。",
  },
  {
    id: "animal_lion",
    categoryId: "animals",
    sourceStickerIds: ["quizland_lion"],
    label: "ライオン",
    kana: "らいおん",
    habitat: "アフリカの くさはら",
    group: "ほにゅうるい",
    fact: "なかまと むれで くらし、おすには おおきな たてがみが あります。",
    guideSpeaker: "ポノ",
    guideText: "たてがみは どこから どこまで あるかな。",
  },
  {
    id: "animal_penguin",
    categoryId: "animals",
    sourceStickerIds: ["quizland_penguin"],
    label: "ペンギン",
    kana: "ぺんぎん",
    habitat: "みなみの さむい うみべ",
    group: "とり",
    fact: "とぶことは にがてですが、うみの なかを すばやく およぎます。",
    guideSpeaker: "Codex",
    guideText: "つばさが およぐための ひれみたいに うごくよ。",
  },
  {
    id: "animal_kuma",
    categoryId: "animals",
    sourceStickerIds: ["quizland_kuma"],
    label: "くま",
    kana: "くま",
    habitat: "もりや やま",
    group: "ほにゅうるい",
    fact: "きのみや さかななど、すむ ばしょに あわせて いろいろな ものを たべます。",
    guideSpeaker: "ポノ",
    guideText: "おおきな てと からだの つくりを みてみよう。",
  },
  {
    id: "animal_kirin",
    categoryId: "animals",
    sourceStickerIds: ["quizland_kirin"],
    label: "キリン",
    kana: "きりん",
    habitat: "アフリカの くさはら",
    group: "ほにゅうるい",
    fact: "ながい くびで たかい きの はっぱを たべることが できます。",
    guideSpeaker: "Codex",
    guideText: "くびだけでなく、あしも とても ながいよ。",
  },
  {
    id: "animal_cheetah",
    categoryId: "animals",
    sourceStickerIds: ["quizland_cheetah"],
    label: "チーター",
    kana: "ちーたー",
    habitat: "アフリカの くさはら",
    group: "ほにゅうるい",
    fact: "しなやかな からだで、みじかい きょりを とても はやく はしります。",
    guideSpeaker: "ポノ",
    guideText: "からだの もようと ながい あしを みてみよう。",
  },
  {
    id: "animal_araiguma",
    categoryId: "animals",
    sourceStickerIds: ["bento_araiguma"],
    label: "あらいぐま",
    kana: "あらいぐま",
    habitat: "もりや みずべ",
    group: "ほにゅうるい",
    fact: "てを じょうずに つかい、みずべで たべものを さがすことが あります。",
    guideSpeaker: "Codex",
    guideText: "ての かたちと かおの もようを くらべよう。",
  },
  {
    id: "animal_usagi",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_usagi"],
    label: "うさぎ",
    kana: "うさぎ",
    habitat: "くさはらや もりの まわり",
    group: "ほにゅうるい",
    fact: "ながい みみで まわりの おとを きき、うしろあしで ぴょんと はねます。",
    guideSpeaker: "ポノ",
    guideText: "みみ、しっぽ、うしろあしを じゅんばんに みてみよう。",
  },
  {
    id: "animal_risu",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_risu", "bento_risu"],
    label: "りす",
    kana: "りす",
    habitat: "もりの きの うえ",
    group: "ほにゅうるい",
    fact: "きのみを たべたり、ほおぶくろに いれて はこんだりする なかまも います。",
    guideSpeaker: "Codex",
    guideText: "しっぽの ふくらみと きのみを もつ てを みてみよう。",
  },
  {
    id: "animal_shika",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_kojika", "bento_shika"],
    label: "しか",
    kana: "しか",
    habitat: "もりや くさはら",
    group: "ほにゅうるい",
    fact: "くさや はっぱを たべ、すばやく はしって もりの なかを いどうします。",
    guideSpeaker: "ポノ",
    guideText: "ほそい あしと やさしい かおを かんさつしよう。",
  },
  {
    id: "animal_kitsune",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_kitsune", "zukan_fox"],
    label: "きつね",
    kana: "きつね",
    habitat: "もりや くさはら",
    group: "ほにゅうるい",
    fact: "おおきな みみと ふさふさの しっぽを もち、よるに うごくことも あります。",
    guideSpeaker: "Codex",
    guideText: "みみの かたちと しっぽの ながさを くらべよう。",
  },
  {
    id: "animal_karasu",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_karasu"],
    label: "からす",
    kana: "からす",
    habitat: "もりや まちの そら",
    group: "とり",
    fact: "くちばしを じょうずに つかい、まちでも もりでも くらすことが できます。",
    guideSpeaker: "ポノ",
    guideText: "くちばしと はねの くろい いろを みてみよう。",
  },
  {
    id: "animal_harinezumi",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_harinezumi"],
    label: "はりねずみ",
    kana: "はりねずみ",
    habitat: "くさむらや もりの した",
    group: "ほにゅうるい",
    fact: "からだの はりで みを まもり、ちいさな むしなどを さがして たべます。",
    guideSpeaker: "Codex",
    guideText: "せなかの はりと ちいさな あしを みつけよう。",
  },
  {
    id: "animal_fukurou",
    categoryId: "animals",
    sourceStickerIds: ["puzzle_fukurou"],
    label: "ふくろう",
    kana: "ふくろう",
    habitat: "もりの きの うえ",
    group: "とり",
    fact: "おおきな めで くらい ところでも まわりを みつけやすい とりです。",
    guideSpeaker: "ポノ",
    guideText: "まるい めと はねの かたちを みてみよう。",
  },
  {
    id: "animal_ahiru",
    categoryId: "animals",
    sourceStickerIds: ["bento_ahiru"],
    label: "あひる",
    kana: "あひる",
    habitat: "いけや みずべ",
    group: "とり",
    fact: "みずかきの ある あしで みずの うえを およぎます。",
    guideSpeaker: "Codex",
    guideText: "くちばしと みずかきの あしを さがしてみよう。",
  },
  {
    id: "sea_kujira",
    categoryId: "sea",
    sourceStickerIds: ["maze_kujira"],
    label: "くじら",
    kana: "くじら",
    habitat: "ひろい うみ",
    group: "ほにゅうるい",
    fact: "さかなではなく、あかちゃんを うみ、はいで いきを する なかまです。",
    guideSpeaker: "ポノ",
    guideText: "しおを ふく あなの ばしょを そうぞうしてみよう。",
  },
  {
    id: "sea_kani",
    categoryId: "sea",
    sourceStickerIds: ["maze_kani"],
    label: "かに",
    kana: "かに",
    habitat: "うみべや いわば",
    group: "こうかくるい",
    fact: "かたい からと はさみを もち、よこに あるく すがたが よく みられます。",
    guideSpeaker: "Codex",
    guideText: "はさみと あしの かずを かぞえてみよう。",
  },
  {
    id: "sea_daiouika",
    categoryId: "sea",
    sourceStickerIds: ["quizland_daiouika"],
    label: "ダイオウイカ",
    kana: "だいおういか",
    habitat: "ふかい うみ",
    group: "なんたいどうぶつ",
    fact: "とても ながい あしを もち、ふかい うみで くらす おおきな イカです。",
    guideSpeaker: "ポノ",
    guideText: "ながい あしは どれかな。からだと くらべてみよう。",
  },
  {
    id: "sea_jinbeizame",
    categoryId: "sea",
    sourceStickerIds: ["quizland_jinbeizame"],
    label: "ジンベエザメ",
    kana: "じんべえざめ",
    habitat: "あたたかい うみ",
    group: "さかな",
    fact: "おおきな からだですが、ちいさな プランクトンなどを たべます。",
    guideSpeaker: "Codex",
    guideText: "からだの しろい もようを さがしてみよう。",
  },
  {
    id: "food_onigiri",
    categoryId: "food",
    sourceStickerIds: ["bento_onigiri"],
    label: "おにぎり",
    kana: "おにぎり",
    habitat: "おべんとうや しょくたく",
    group: "ごはん",
    fact: "ごはんを にぎって つくる たべもの。なかに ぐを いれることも あります。",
    guideSpeaker: "ポノ",
    guideText: "さんかく、まる、たわらがた。どんな かたちかな。",
  },
  {
    id: "food_tamago",
    categoryId: "food",
    sourceStickerIds: ["bento_tamago"],
    label: "たまごやき",
    kana: "たまごやき",
    habitat: "おべんとうや あさごはん",
    group: "たまごりょうり",
    fact: "たまごを まぜて やき、ふんわり まいた きいろい おかずです。",
    guideSpeaker: "Codex",
    guideText: "きいろい いろと まいた かたちを みてみよう。",
  },
  {
    id: "food_karaage",
    categoryId: "food",
    sourceStickerIds: ["bento_karaage"],
    label: "からあげ",
    kana: "からあげ",
    habitat: "おべんとうや しょくたく",
    group: "にくりょうり",
    fact: "したあじを つけた とりにくなどに ころもを つけて あげます。",
    guideSpeaker: "ポノ",
    guideText: "そとの ころもと なかの にくを くらべてみよう。",
  },
  {
    id: "food_broccoli",
    categoryId: "food",
    sourceStickerIds: ["bento_broccoli"],
    label: "ブロッコリー",
    kana: "ぶろっこりー",
    habitat: "はたけから しょくたくへ",
    group: "やさい",
    fact: "つぼみの あつまりを たべる やさいで、みどりの こまかい つぶが みえます。",
    guideSpeaker: "Codex",
    guideText: "ちいさな つぼみが たくさん あつまっているよ。",
  },
  {
    id: "food_wiener",
    categoryId: "food",
    sourceStickerIds: ["bento_wiener"],
    label: "ウインナー",
    kana: "ういんなー",
    habitat: "おべんとうや しょくたく",
    group: "にくの かこうひん",
    fact: "にくを こまかくして つめ、たべやすい かたちに した たべものです。",
    guideSpeaker: "ポノ",
    guideText: "きった かたちで たこさんにも へんしんするよ。",
  },
  {
    id: "food_ichigo",
    categoryId: "food",
    sourceStickerIds: ["bento_fruit_ichigo"],
    label: "いちご",
    kana: "いちご",
    habitat: "はたけや ハウス",
    group: "くだもの",
    fact: "あかく あまい くだもの。そとの つぶつぶは たねのように みえます。",
    guideSpeaker: "Codex",
    guideText: "あかい みと つぶつぶを かんさつしよう。",
  },
];
const DRAWING_COLORS = [
  "#EF4444",
  "#F97316",
  "#FBBF24",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F43F5E",
  "#92400E",
  "#78716C",
  "#1C1917",
];
const DRAWING_STAMPS = [
  { id: "star", label: "スター", src: "../../assets/images/mojikko/writing/icon_star.png" },
  { id: "heart", label: "ハート", src: "../../assets/images/mojikko/writing/icon_heart.png" },
  { id: "sparkle", label: "きらきら", src: "../../assets/images/mojikko/writing/icon_sparkle.png" },
  { id: "cookie", label: "クッキー", src: "../../assets/images/mojikko/writing/icon_cookie.png" },
  { id: "pencil", label: "えんぴつ", src: "../../assets/images/mojikko/writing/icon_pencil.png" },
  { id: "stamp", label: "スタンプ", src: "../../assets/images/icons/stamp_001.png" },
  { id: "rainbow", label: "にじ", src: "../../assets/images/icons/icons_001.png" },
  { id: "kirakira", label: "ひかり", src: "../../assets/images/icons/kirakira.png" },
];
const DRAWING_DEFAULT_COLOR = DRAWING_COLORS[0];
const DRAWING_DEFAULT_SIZE = 14;
const DRAWING_MIN_DISTANCE = 0.22;
const EDITOR_STICKER_RENDER_SCALE_MAX = 3;

const SHARED_TEXTURES = {
  pageBack: "sb3d_page_back_generated.webp",
  innerLeft: "sb3d_inner_shadow_left.webp",
  innerRight: "sb3d_inner_shadow_right.webp",
  flipShadow: "sb3d_flip_shadow.webp",
  floorShadow: "sb3d_book_floor_shadow.webp",
};

const ZUKAN_THICKNESS_STRIPS = [
  { file: "sb3d_zukan_thickness_strip_01_alpha.png", aspect: 1564 / 127 },
  { file: "sb3d_zukan_thickness_strip_02_alpha.png", aspect: 1585 / 142 },
  { file: "sb3d_zukan_thickness_strip_03_alpha.png", aspect: 1553 / 127 },
  { file: "sb3d_zukan_thickness_strip_04_alpha.png", aspect: 1596 / 140 },
  { file: "sb3d_zukan_thickness_strip_05_alpha.png", aspect: 1613 / 117 },
];
const ZUKAN_PAGE_TEMPLATES = {
  index: "sb3d_image2_zukan_template_index_green_6items_alpha_user_20260621.png",
  detail: "sb3d_image2_zukan_template_detail_green_wide_labels_alpha_user_20260621.png",
};
const ZUKAN_TEMPLATE_PRINT_INSET = {
  top: 58,
  bottom: 46,
  outer: 56,
  inner: 92,
};
const DEFAULT_ZUKAN_FORMAT_INDEX = 1;
const ZUKAN_THICKNESS_DISPLAY_SCALE_Y = 1.32;

const BOOK_VARIANTS = {
  boy: {
    insideLeft: "sb3d_boy_free_blank_page_simple_jp_20260629.webp",
    insideRight: "sb3d_boy_free_blank_page_simple_jp_20260629.webp",
    freePage: "sb3d_boy_free_blank_page_simple_jp_20260629.webp",
    coverPrint: "sb3d_boy_cover_front_simple_jp_20260629.webp",
    coverHardwareMode: "separate",
    coverFront: "sb3d_boy_cover_front_simple_jp_20260629.webp",
    coverBack: "sb3d_boy_cover_back_simple_jp_20260629.webp",
    coverInside: "sb3d_boy_cover_inside_simple_jp_20260629.webp",
    spine: "sb3d_boy_spine_simple_jp_20260629.webp",
    tabsLeft: "sb3d_boy_side_tabs_left_generated.webp",
    tabsRight: "sb3d_boy_side_tabs_right_generated.webp",
  },
  girl: {
    insideLeft: "sb3d_girl_free_blank_page_simple_jp_20260629.webp",
    insideRight: "sb3d_girl_free_blank_page_simple_jp_20260629.webp",
    freePage: "sb3d_girl_free_blank_page_simple_jp_20260629.webp",
    coverPrint: "sb3d_girl_cover_front_simple_jp_20260629.webp",
    coverHardwareMode: "separate",
    coverFront: "sb3d_girl_cover_front_simple_jp_20260629.webp",
    coverBack: "sb3d_girl_cover_back_simple_jp_20260629.webp",
    coverInside: "sb3d_girl_cover_inside_simple_jp_20260629.webp",
    spine: "sb3d_girl_spine_simple_jp_20260629.webp",
    tabsLeft: "sb3d_girl_side_tabs_left_generated.webp",
    tabsRight: "sb3d_girl_side_tabs_right_generated.webp",
  },
  forest: {
    insideLeft: "sb3d_forest_free_blank_page_image2_20260629.webp",
    insideRight: "sb3d_forest_free_blank_page_image2_20260629.webp",
    freePage: "sb3d_forest_free_blank_page_image2_20260629.webp",
    coverPrint: "sb3d_forest_cover_front_pono_hedgehog_20260629.webp",
    coverHardwareMode: "separate",
    coverFront: "sb3d_forest_cover_front_pono_hedgehog_20260629.webp",
    coverBack: "sb3d_forest_cover_back_canvas_20260623.webp",
    coverInside: "sb3d_forest_cover_inside_canvas_20260623.webp",
    spine: "sb3d_forest_spine_canvas_20260623.webp",
    thicknessKey: "boy",
  },
  sakura: {
    insideLeft: "sb3d_sakura_free_blank_page_simple_jp_20260629.webp",
    insideRight: "sb3d_sakura_free_blank_page_simple_jp_20260629.webp",
    freePage: "sb3d_sakura_free_blank_page_simple_jp_20260629.webp",
    coverPrint: "sb3d_sakura_cover_front_simple_jp_20260629.webp",
    coverHardwareMode: "separate",
    coverFront: "sb3d_sakura_cover_front_simple_jp_20260629.webp",
    coverBack: "sb3d_sakura_cover_back_simple_jp_20260629.webp",
    coverInside: "sb3d_sakura_cover_inside_simple_jp_20260629.webp",
    spine: "sb3d_sakura_spine_simple_jp_20260629.webp",
    thicknessKey: "girl",
  },
  shinobi: {
    insideLeft: "sb3d_shinobi_free_blank_page_simple_jp_20260629.webp",
    insideRight: "sb3d_shinobi_free_blank_page_simple_jp_20260629.webp",
    freePage: "sb3d_shinobi_free_blank_page_simple_jp_20260629.webp",
    coverPrint: "sb3d_shinobi_cover_front_simple_jp_20260629.webp",
    coverHardwareMode: "separate",
    coverFront: "sb3d_shinobi_cover_front_simple_jp_20260629.webp",
    coverBack: "sb3d_shinobi_cover_back_simple_jp_20260629.webp",
    coverInside: "sb3d_shinobi_cover_inside_simple_jp_20260629.webp",
    spine: "sb3d_shinobi_spine_simple_jp_20260629.webp",
    thicknessKey: "boy",
  },
};

const ENTERTAINMENT_BOOK_TEMPLATE_PRESETS = [
  {
    key: "hero",
    thicknessKey: "boy",
    accent: "#e75f3e",
    sub: "#348dd8",
    line: "#e1b447",
    tab: "#ffe0b8",
    board: 0xd94a3b,
    boardShadow: 0x843126,
    spine: 0xe85d4e,
    spineDark: 0x9f352d,
    spineHighlight: 0xffc5a3,
    ring: 0xd6b66b,
    ringHighlight: 0xfff0c6,
    frame: "#e85d4e",
    frameDark: "#b73934",
    innerStroke: "#f5a06f",
    motifSet: "skyGarden",
    tabs: ["#e85d4e", "#348dd8", "#ffd45f", "#7ed0e2", "#f6974f"],
  },
  {
    key: "kaiju",
    thicknessKey: "boy",
    accent: "#80be65",
    sub: "#68b7d9",
    line: "#ef9b7e",
    tab: "#dff2c8",
    board: 0x77b86a,
    boardShadow: 0x4b7f40,
    spine: 0x8dcc76,
    spineDark: 0x5d934e,
    spineHighlight: 0xe4f5b8,
    ring: 0xc7aa62,
    ringHighlight: 0xffedbd,
    frame: "#80be65",
    frameDark: "#5b944f",
    innerStroke: "#b9dda2",
    motifSet: "nature",
    tabs: ["#8dcc76", "#76c3de", "#ffb08e", "#f7d66d", "#b5df9a"],
  },
  {
    key: "idol",
    thicknessKey: "girl",
    accent: "#ed87c6",
    sub: "#7cced0",
    line: "#d8b45f",
    tab: "#f7d4ef",
    board: 0xdd74ba,
    boardShadow: 0x97417d,
    spine: 0xe58ac8,
    spineDark: 0xae4d91,
    spineHighlight: 0xffd4f0,
    ring: 0xd8b45f,
    ringHighlight: 0xfff0be,
    frame: "#ed87c6",
    frameDark: "#c15fa0",
    innerStroke: "#f5b8da",
    motifSet: "skyGarden",
    tabs: ["#ed87c6", "#89ded4", "#d5a9f0", "#ffd76a", "#ffb4cf"],
  },
  {
    key: "robot",
    thicknessKey: "boy",
    accent: "#5db7bd",
    sub: "#f19a45",
    line: "#95aeb0",
    tab: "#d9f0ee",
    board: 0x4baab2,
    boardShadow: 0x2e777e,
    spine: 0x64bdc4,
    spineDark: 0x3c8790,
    spineHighlight: 0xc5f0f0,
    ring: 0xc7a66c,
    ringHighlight: 0xffefc6,
    frame: "#5db7bd",
    frameDark: "#398993",
    innerStroke: "#9cd4d4",
    motifSet: "sparkle",
    tabs: ["#5db7bd", "#f19a45", "#a9bec2", "#79d4e2", "#ffd56f"],
  },
  {
    key: "space_live",
    thicknessKey: "girl",
    accent: "#6c73d9",
    sub: "#2ec4d3",
    line: "#f1c657",
    tab: "#d7d4ff",
    board: 0x514eb1,
    boardShadow: 0x2e2a72,
    spine: 0x6862c8,
    spineDark: 0x3f3b91,
    spineHighlight: 0xbfc7ff,
    ring: 0xd3b15f,
    ringHighlight: 0xffefbd,
    frame: "#6c73d9",
    frameDark: "#43459e",
    innerStroke: "#97a5f0",
    motifSet: "skyGarden",
    tabs: ["#6c73d9", "#2ec4d3", "#ff78c6", "#f1c657", "#8c7cf0"],
  },
  {
    key: "game_center",
    thicknessKey: "boy",
    accent: "#2fb6c7",
    sub: "#ff7daf",
    line: "#ffca4d",
    tab: "#d8fbff",
    board: 0x2fa8be,
    boardShadow: 0x1d6e7c,
    spine: 0x42c3d2,
    spineDark: 0x248696,
    spineHighlight: 0xb3f6ff,
    ring: 0xd8a95a,
    ringHighlight: 0xffecb8,
    frame: "#2fb6c7",
    frameDark: "#238293",
    innerStroke: "#8bdbe2",
    motifSet: "sparkle",
    tabs: ["#2fb6c7", "#ff7daf", "#ffca4d", "#8c77ee", "#73dc83"],
  },
  {
    key: "mascot",
    thicknessKey: "girl",
    accent: "#f1a070",
    sub: "#8fc9d7",
    line: "#dbbe63",
    tab: "#ffe1c8",
    board: 0xe99063,
    boardShadow: 0x9e5a38,
    spine: 0xf2a175,
    spineDark: 0xb66b47,
    spineHighlight: 0xffdac2,
    ring: 0xcfaa60,
    ringHighlight: 0xffedc5,
    frame: "#f1a070",
    frameDark: "#c77752",
    innerStroke: "#f6c0a0",
    motifSet: "nature",
    tabs: ["#f1a070", "#8fc9d7", "#ffd46b", "#a9d58b", "#f6b5ce"],
  },
  {
    key: "parade",
    thicknessKey: "girl",
    accent: "#ef805e",
    sub: "#4fbfc9",
    line: "#e3b94d",
    tab: "#ffe0bb",
    board: 0xe77854,
    boardShadow: 0xa04b35,
    spine: 0xf08b64,
    spineDark: 0xb25a3f,
    spineHighlight: 0xffd7b4,
    ring: 0xd2ad5d,
    ringHighlight: 0xffefc5,
    frame: "#ef805e",
    frameDark: "#bd5f42",
    innerStroke: "#f6ae92",
    motifSet: "skyGarden",
    tabs: ["#ef805e", "#4fbfc9", "#ffd45f", "#6e91e8", "#f4a3c1"],
  },
  {
    key: "secret_base",
    thicknessKey: "boy",
    accent: "#c98b45",
    sub: "#4caaa0",
    line: "#d2b15b",
    tab: "#f2d7a8",
    board: 0xb8793a,
    boardShadow: 0x734820,
    spine: 0xc98b45,
    spineDark: 0x89592b,
    spineHighlight: 0xf2c681,
    ring: 0xc7a15d,
    ringHighlight: 0xffe8b3,
    frame: "#c98b45",
    frameDark: "#965f2e",
    innerStroke: "#e2bb7d",
    motifSet: "nature",
    tabs: ["#c98b45", "#4caaa0", "#e3c760", "#78bd7e", "#f29d70"],
  },
  {
    key: "anime_studio",
    thicknessKey: "boy",
    accent: "#5aa6cf",
    sub: "#f28b76",
    line: "#d9b655",
    tab: "#d7eff8",
    board: 0x4f9bc4,
    boardShadow: 0x2f6785,
    spine: 0x65afd0,
    spineDark: 0x3d7f9e,
    spineHighlight: 0xbde9f5,
    ring: 0xc9a65d,
    ringHighlight: 0xffedc0,
    frame: "#5aa6cf",
    frameDark: "#3d7fa3",
    innerStroke: "#96cce2",
    motifSet: "sparkle",
    tabs: ["#5aa6cf", "#f28b76", "#f6cc5e", "#8dd8c1", "#b9a6ef"],
  },
  {
    key: "neon_city",
    thicknessKey: "boy",
    accent: "#2fc4ff",
    sub: "#ff5bc8",
    line: "#f6d65f",
    tab: "#182f6f",
    board: 0x20349a,
    boardShadow: 0x0c1a54,
    spine: 0x1a89a8,
    spineDark: 0x0d5268,
    spineHighlight: 0x80f3ff,
    ring: 0xc5a86b,
    ringHighlight: 0xffefd0,
    frame: "#2fc4ff",
    frameDark: "#176da6",
    innerStroke: "#8d78ff",
    motifSet: "sparkle",
    paper: ["#071a3a", "#112f67", "#1e2a75"],
    tabs: ["#2fc4ff", "#ff5bc8", "#f6d65f", "#7c7cff", "#24e0b8"],
  },
  {
    key: "candy_pop",
    thicknessKey: "girl",
    accent: "#ff82b8",
    sub: "#72d7d2",
    line: "#f7c85a",
    tab: "#ffd6e8",
    board: 0xef79a8,
    boardShadow: 0xaa416e,
    spine: 0xff97c4,
    spineDark: 0xc35d8a,
    spineHighlight: 0xffe2f0,
    ring: 0xd3ad61,
    ringHighlight: 0xfff0c8,
    frame: "#ff82b8",
    frameDark: "#c75d8b",
    innerStroke: "#ffc0dc",
    motifSet: "skyGarden",
    paper: ["#ffe0ef", "#c9fff6", "#fff09a"],
    tabs: ["#ff82b8", "#72d7d2", "#ffd95f", "#b99bff", "#ffb17b"],
  },
  {
    key: "manga_action",
    thicknessKey: "boy",
    accent: "#ef463f",
    sub: "#27a5df",
    line: "#f7d135",
    tab: "#ffe76b",
    board: 0xe34136,
    boardShadow: 0x8e1f22,
    spine: 0xf5c636,
    spineDark: 0xbc7a18,
    spineHighlight: 0xffef7b,
    ring: 0xc5a35e,
    ringHighlight: 0xffedbe,
    frame: "#ef463f",
    frameDark: "#9c2628",
    innerStroke: "#ffcf45",
    motifSet: "sparkle",
    paper: ["#ffd52d", "#ff6a54", "#2da9e6"],
    tabs: ["#ef463f", "#27a5df", "#f7d135", "#ffffff", "#111111"],
  },
  {
    key: "cyber_grid",
    thicknessKey: "boy",
    accent: "#27d7d0",
    sub: "#8f72ff",
    line: "#9af05a",
    tab: "#102b46",
    board: 0x0f6172,
    boardShadow: 0x092637,
    spine: 0x1b9bb0,
    spineDark: 0x0d5b68,
    spineHighlight: 0x9ffffc,
    ring: 0xbca971,
    ringHighlight: 0xfff0ca,
    frame: "#27d7d0",
    frameDark: "#12838c",
    innerStroke: "#70f0e8",
    motifSet: "sparkle",
    paper: ["#061725", "#07344c", "#10245f"],
    tabs: ["#27d7d0", "#8f72ff", "#9af05a", "#2ea8ff", "#ff69c9"],
  },
  {
    key: "rainbow_dream",
    thicknessKey: "girl",
    accent: "#f49bd0",
    sub: "#75cfe4",
    line: "#f6d66a",
    tab: "#d9efff",
    board: 0xe995ca,
    boardShadow: 0xa96292,
    spine: 0x8ccfe7,
    spineDark: 0x5c9eba,
    spineHighlight: 0xe3fbff,
    ring: 0xd2b56b,
    ringHighlight: 0xfff0c8,
    frame: "#f49bd0",
    frameDark: "#c16aa0",
    innerStroke: "#c4dbff",
    motifSet: "skyGarden",
    paper: ["#ffdef0", "#d9efff", "#f5e6ff"],
    tabs: ["#f49bd0", "#75cfe4", "#f6d66a", "#b9a5ff", "#91e2a7"],
  },
  {
    key: "midnight_magic",
    thicknessKey: "girl",
    accent: "#8f78e8",
    sub: "#63bfe6",
    line: "#d9bd69",
    tab: "#211b57",
    board: 0x3b2a87,
    boardShadow: 0x17123e,
    spine: 0x5b4dba,
    spineDark: 0x32266f,
    spineHighlight: 0xc6bdff,
    ring: 0xc3a46b,
    ringHighlight: 0xffedc8,
    frame: "#8f78e8",
    frameDark: "#5747a5",
    innerStroke: "#bdafff",
    motifSet: "sparkle",
    paper: ["#121242", "#242168", "#382a73"],
    tabs: ["#8f78e8", "#63bfe6", "#d9bd69", "#c477e8", "#5ec9b5"],
  },
  {
    key: "pop_art",
    thicknessKey: "girl",
    accent: "#ff4fa8",
    sub: "#22c4d9",
    line: "#ffd23f",
    tab: "#ffec72",
    board: 0xea4aa0,
    boardShadow: 0x93285f,
    spine: 0xff7f36,
    spineDark: 0xb84c1f,
    spineHighlight: 0xffc66d,
    ring: 0xc9a55f,
    ringHighlight: 0xffedc3,
    frame: "#ff4fa8",
    frameDark: "#bd347b",
    innerStroke: "#ffd23f",
    motifSet: "sparkle",
    paper: ["#ff3f9f", "#ffd23f", "#22c4d9"],
    tabs: ["#ff4fa8", "#22c4d9", "#ffd23f", "#ff7f36", "#ffffff"],
  },
  {
    key: "festival_night",
    thicknessKey: "boy",
    accent: "#e85d42",
    sub: "#36b6c9",
    line: "#d9a84f",
    tab: "#192f5f",
    board: 0x183a72,
    boardShadow: 0x0c1b3b,
    spine: 0x2d6d98,
    spineDark: 0x173d61,
    spineHighlight: 0x8fd2ee,
    ring: 0xc49e5c,
    ringHighlight: 0xffedbd,
    frame: "#e85d42",
    frameDark: "#a33b2d",
    innerStroke: "#f0b858",
    motifSet: "skyGarden",
    paper: ["#071d3b", "#123d67", "#e25f44"],
    tabs: ["#e85d42", "#36b6c9", "#d9a84f", "#f29b40", "#315ea8"],
  },
  {
    key: "sweet_gothic",
    thicknessKey: "girl",
    accent: "#b783d4",
    sub: "#e596b7",
    line: "#d0b366",
    tab: "#2f2442",
    board: 0x6e4b86,
    boardShadow: 0x31213f,
    spine: 0x8e67a8,
    spineDark: 0x583d70,
    spineHighlight: 0xe5c8f1,
    ring: 0xc8a760,
    ringHighlight: 0xffefc6,
    frame: "#b783d4",
    frameDark: "#795291",
    innerStroke: "#d8b5e8",
    motifSet: "garden",
    paper: ["#392946", "#71507f", "#c998d7"],
    tabs: ["#b783d4", "#e596b7", "#d0b366", "#4a395f", "#c7a4df"],
  },
  {
    key: "sports_power",
    thicknessKey: "boy",
    accent: "#78c92d",
    sub: "#278cdf",
    line: "#ff9d2f",
    tab: "#dbff9a",
    board: 0x61a82d,
    boardShadow: 0x3a681f,
    spine: 0x2b91c8,
    spineDark: 0x1b5d83,
    spineHighlight: 0xa7e5ff,
    ring: 0xc49f5e,
    ringHighlight: 0xffedbd,
    frame: "#78c92d",
    frameDark: "#4e8f1e",
    innerStroke: "#c7f076",
    motifSet: "sparkle",
    paper: ["#b9ef3f", "#278cdf", "#ff9d2f"],
    tabs: ["#78c92d", "#278cdf", "#ff9d2f", "#f4d43f", "#ffffff"],
  },
];

for (const { key, thicknessKey } of ENTERTAINMENT_BOOK_TEMPLATE_PRESETS) {
  BOOK_VARIANTS[key] = {
    insideLeft: `sb3d_${key}_free_blank_page_image2_20260623.webp`,
    insideRight: `sb3d_${key}_free_blank_page_image2_20260623.webp`,
    freePage: `sb3d_${key}_free_blank_page_image2_20260623.webp`,
    coverPrint: `sb3d_${key}_cover_front_distinct_image2_20260623.webp`,
    coverHardwareMode: "separate",
    coverFront: `sb3d_${key}_cover_front_distinct_image2_20260623.webp`,
    coverBack: `sb3d_${key}_cover_back_distinct_image2_20260623.webp`,
    coverInside: `sb3d_${key}_cover_inside_image2_20260623.webp`,
    spine: `sb3d_${key}_spine_image2_20260623.webp`,
    thicknessKey,
  };
}

const SIMPLE_JP_BOOK_TEMPLATE_KEYS = [
  "hero",
  "kaiju",
  "idol",
  "robot",
  "space_live",
  "game_center",
  "mascot",
  "parade",
  "secret_base",
  "anime_studio",
  "neon_city",
  "candy_pop",
  "manga_action",
  "cyber_grid",
  "rainbow_dream",
  "midnight_magic",
  "pop_art",
  "festival_night",
  "sweet_gothic",
  "sports_power",
];

for (const key of SIMPLE_JP_BOOK_TEMPLATE_KEYS) {
  const bundle = BOOK_VARIANTS[key];
  if (!bundle) {
    continue;
  }
  Object.assign(bundle, {
    insideLeft: `sb3d_${key}_free_blank_page_simple_jp_20260629.webp`,
    insideRight: `sb3d_${key}_free_blank_page_simple_jp_20260629.webp`,
    freePage: `sb3d_${key}_free_blank_page_simple_jp_20260629.webp`,
    coverPrint: `sb3d_${key}_cover_front_simple_jp_20260629.webp`,
    coverHardwareMode: "separate",
    coverFront: `sb3d_${key}_cover_front_simple_jp_20260629.webp`,
    coverBack: `sb3d_${key}_cover_back_simple_jp_20260629.webp`,
    coverInside: `sb3d_${key}_cover_inside_simple_jp_20260629.webp`,
    spine: `sb3d_${key}_spine_simple_jp_20260629.webp`,
  });
}

const PERSONALITY_JP_BOOK_TEMPLATE_KEYS = [
  "girl",
  "shinobi",
  "hero",
  "kaiju",
  "space_live",
  "game_center",
  "mascot",
  "secret_base",
  "anime_studio",
  "cyber_grid",
  "sweet_gothic",
  "neon_city",
];

for (const key of PERSONALITY_JP_BOOK_TEMPLATE_KEYS) {
  const bundle = BOOK_VARIANTS[key];
  if (!bundle) {
    continue;
  }
  Object.assign(bundle, {
    insideLeft: `sb3d_${key}_free_blank_page_personality_jp_20260629.webp`,
    insideRight: `sb3d_${key}_free_blank_page_personality_jp_20260629.webp`,
    freePage: `sb3d_${key}_free_blank_page_personality_jp_20260629.webp`,
    coverPrint: `sb3d_${key}_cover_front_personality_jp_20260629.webp`,
    coverHardwareMode: "separate",
    coverFront: `sb3d_${key}_cover_front_personality_jp_20260629.webp`,
    coverBack: `sb3d_${key}_cover_back_personality_jp_20260629.webp`,
    coverInside: `sb3d_${key}_cover_inside_personality_jp_20260629.webp`,
    spine: `sb3d_${key}_spine_personality_jp_20260629.webp`,
  });
}

const REFINED_JP_BOOK_TEMPLATE_KEYS = [
  "kaiju",
  "mascot",
  "hero",
];

for (const key of REFINED_JP_BOOK_TEMPLATE_KEYS) {
  const bundle = BOOK_VARIANTS[key];
  if (!bundle) {
    continue;
  }
  Object.assign(bundle, {
    insideLeft: `sb3d_${key}_free_blank_page_refine_jp_20260629.webp`,
    insideRight: `sb3d_${key}_free_blank_page_refine_jp_20260629.webp`,
    freePage: `sb3d_${key}_free_blank_page_refine_jp_20260629.webp`,
    coverPrint: `sb3d_${key}_cover_front_refine_jp_20260629.webp`,
    coverHardwareMode: "separate",
    coverFront: `sb3d_${key}_cover_front_refine_jp_20260629.webp`,
    coverBack: `sb3d_${key}_cover_back_refine_jp_20260629.webp`,
    coverInside: `sb3d_${key}_cover_inside_refine_jp_20260629.webp`,
    spine: `sb3d_${key}_spine_refine_jp_20260629.webp`,
  });
}

const STICKER_BOOK_THEMES = {
  boy: {
    accent: "#d79a34",
    sub: "#55aeb8",
    line: "#d3b35f",
    tab: "#f4e7b8",
    coverHardware: {
      board: 0x0b5260,
      boardShadow: 0x063540,
      spine: 0x0d7480,
      spineDark: 0x07505d,
      spineHighlight: 0x7ee0e4,
      ring: 0xc2a060,
      ringHighlight: 0xffedd0,
    },
    collection: {
      paper: ["#fffbe8", "#fff2c9", "#f2dfaa"],
      text: "#334447",
      pageBorder: "#f9edc8",
      pageHighlight: "rgba(255, 255, 255, 0.78)",
      frameShadow: "rgba(87, 66, 21, 0.18)",
      infoAccent: "#64ad57",
      infoAccentSoft: "rgba(111, 179, 91, 0.26)",
      ring: 0xd9c48e,
      ringHighlight: 0xfff6d6,
      spine: {
        warm: "#f1d56a",
        paper: "#fff8df",
        shadow: "#716332",
        seam: "#2f9fa7",
        foldPaper: "250, 244, 216",
        foldWarm: "210, 190, 127",
        foldDark: "81, 72, 38",
      },
      pages: {
        left: {
          frame: "#9aca55",
          frameDark: "#70a63b",
          accent: "#58ad75",
          innerStroke: "#bedf7a",
          motifSet: "nature",
        },
        right: {
          frame: "#f0c84f",
          frameDark: "#ca9c24",
          accent: "#73b957",
          innerStroke: "#f4dc84",
          motifSet: "nature",
        },
      },
      slotBand: {
        fill: "#efd15d",
        edge: "#caa01f",
        slot: "rgba(255, 250, 231, 0.9)",
        stroke: "rgba(181, 130, 28, 0.32)",
      },
      card: {
        foundFill: "rgba(255, 253, 238, 0.82)",
        lockedFill: "rgba(224, 226, 214, 0.58)",
        foundStroke: "rgba(126, 177, 78, 0.4)",
        lockedStroke: "rgba(116, 128, 122, 0.24)",
        numberFill: "#4aa8a2",
      },
      tabs: [
        { color: "#f0c82d", shadow: "#c89d15", motif: "star" },
        { color: "#ef8b35", shadow: "#c96b20", motif: "sparkle" },
        { color: "#8dcb4a", shadow: "#69a234", motif: "leaf" },
        { color: "#4eb4d5", shadow: "#2d8eb3", motif: "cloud" },
        { color: "#28a7a0", shadow: "#1a837e", motif: "shell" },
      ],
    },
  },
  girl: {
    accent: "#d78db9",
    sub: "#7bc8c8",
    line: "#dcb6cc",
    tab: "#f5ddea",
    coverHardware: {
      board: 0x7d5e95,
      boardShadow: 0x54406c,
      spine: 0x9b81b8,
      spineDark: 0x72598f,
      spineHighlight: 0xf2d6ff,
      ring: 0xd0b589,
      ringHighlight: 0xfff2d5,
    },
    collection: {
      paper: ["#fffbea", "#fff4d4", "#f8eac0"],
      text: "#39434a",
      pageBorder: "#fbedd2",
      pageHighlight: "rgba(255, 255, 255, 0.82)",
      frameShadow: "rgba(88, 62, 35, 0.16)",
      infoAccent: "#82c7b8",
      infoAccentSoft: "rgba(126, 199, 184, 0.26)",
      ring: 0xd8c3a1,
      ringHighlight: 0xfff8df,
      spine: {
        warm: "#bde4d7",
        paper: "#fff7df",
        shadow: "#657d75",
        seam: "#b79ad3",
        foldPaper: "250, 242, 219",
        foldWarm: "194, 222, 210",
        foldDark: "83, 86, 60",
      },
      pages: {
        left: {
          frame: "#bda8df",
          frameDark: "#9a83c4",
          accent: "#f4cf52",
          innerStroke: "#d6c4ee",
          motifSet: "garden",
        },
        right: {
          frame: "#a6dcca",
          frameDark: "#75bda6",
          accent: "#ef9b7c",
          innerStroke: "#c4ebdf",
          motifSet: "skyGarden",
        },
      },
      slotBand: {
        fill: "#f3d883",
        edge: "#ddb95a",
        slot: "rgba(255, 251, 236, 0.92)",
        stroke: "rgba(178, 137, 63, 0.28)",
      },
      card: {
        foundFill: "rgba(255, 253, 242, 0.78)",
        lockedFill: "rgba(226, 223, 218, 0.56)",
        foundStroke: "rgba(126, 188, 170, 0.38)",
        lockedStroke: "rgba(120, 128, 122, 0.22)",
        numberFill: "#82c7b8",
      },
      tabs: [
        { color: "#f5c664", shadow: "#d6a53a", motif: "star" },
        { color: "#f2a67f", shadow: "#d78464", motif: "flower" },
        { color: "#a8d9cb", shadow: "#7bbbaa", motif: "sparkle" },
        { color: "#7ec6e6", shadow: "#5aa5c8", motif: "cloud" },
        { color: "#b89dda", shadow: "#9479bd", motif: "flower" },
      ],
    },
  },
  forest: {
    accent: "#82a949",
    sub: "#58b5a7",
    line: "#c9b66d",
    tab: "#e7efd0",
    coverHardware: {
      board: 0x2f8365,
      boardShadow: 0x1c5f55,
      spine: 0x3a977f,
      spineDark: 0x206f62,
      spineHighlight: 0xbcebd1,
      ring: 0xc8ad72,
      ringHighlight: 0xfff0ca,
    },
    collection: {
      paper: ["#fffbe8", "#f6f1cf", "#e5e9ba"],
      text: "#334447",
      pageBorder: "#d8e7bc",
      pageHighlight: "rgba(255, 255, 255, 0.8)",
      frameShadow: "rgba(52, 79, 30, 0.16)",
      infoAccent: "#5aa46f",
      infoAccentSoft: "rgba(100, 172, 116, 0.25)",
      ring: 0xc8ad72,
      ringHighlight: 0xfff4d0,
      spine: {
        warm: "#cddf7a",
        paper: "#fff9df",
        shadow: "#647041",
        seam: "#54a594",
        foldPaper: "250, 244, 216",
        foldWarm: "198, 214, 132",
        foldDark: "73, 86, 50",
      },
      pages: {
        left: {
          frame: "#84bf74",
          frameDark: "#5c9e57",
          accent: "#5bb49f",
          innerStroke: "#b7d994",
          motifSet: "nature",
        },
        right: {
          frame: "#78c5b2",
          frameDark: "#4c9f8f",
          accent: "#d9bd55",
          innerStroke: "#aee0d3",
          motifSet: "garden",
        },
      },
      slotBand: {
        fill: "#cddf7a",
        edge: "#96b646",
        slot: "rgba(255, 252, 232, 0.92)",
        stroke: "rgba(106, 143, 48, 0.28)",
      },
      card: {
        foundFill: "rgba(255, 253, 238, 0.8)",
        lockedFill: "rgba(224, 226, 214, 0.56)",
        foundStroke: "rgba(105, 174, 112, 0.38)",
        lockedStroke: "rgba(116, 128, 122, 0.22)",
        numberFill: "#5aa46f",
      },
      tabs: [
        { color: "#c7d957", shadow: "#98ad35", motif: "leaf" },
        { color: "#66bfa5", shadow: "#41977f", motif: "sparkle" },
        { color: "#f1c95b", shadow: "#c99c2a", motif: "star" },
        { color: "#8ecb72", shadow: "#68a753", motif: "leaf" },
        { color: "#61b8d2", shadow: "#3b92aa", motif: "cloud" },
      ],
    },
  },
  sakura: {
    accent: "#d46b8c",
    sub: "#8abfba",
    line: "#d89aac",
    tab: "#f8dce4",
    coverHardware: {
      board: 0xa94f6f,
      boardShadow: 0x733047,
      spine: 0xc76783,
      spineDark: 0x95465e,
      spineHighlight: 0xffd8e2,
      ring: 0xd4b17a,
      ringHighlight: 0xffefd0,
    },
    collection: {
      paper: ["#fff8ea", "#fff0e9", "#f8d4d8"],
      text: "#40373b",
      pageBorder: "#f1b6c3",
      pageHighlight: "rgba(255, 255, 255, 0.8)",
      frameShadow: "rgba(118, 48, 69, 0.16)",
      infoAccent: "#cf6d8a",
      infoAccentSoft: "rgba(207, 109, 138, 0.24)",
      ring: 0xd4b17a,
      ringHighlight: 0xfff1d4,
      spine: {
        warm: "#f0a6b8",
        paper: "#fff8e7",
        shadow: "#70445a",
        seam: "#d27895",
        foldPaper: "250, 238, 224",
        foldWarm: "232, 165, 184",
        foldDark: "96, 52, 72",
      },
      pages: {
        left: {
          frame: "#e7a1b4",
          frameDark: "#c56f88",
          accent: "#83bcae",
          innerStroke: "#f0bfcc",
          motifSet: "garden",
        },
        right: {
          frame: "#d987a0",
          frameDark: "#b95c79",
          accent: "#d8b85e",
          innerStroke: "#efb0c2",
          motifSet: "skyGarden",
        },
      },
      slotBand: {
        fill: "#f0b7c4",
        edge: "#cc7890",
        slot: "rgba(255, 250, 232, 0.92)",
        stroke: "rgba(183, 90, 112, 0.28)",
      },
      card: {
        foundFill: "rgba(255, 253, 241, 0.8)",
        lockedFill: "rgba(228, 222, 218, 0.56)",
        foundStroke: "rgba(207, 109, 138, 0.38)",
        lockedStroke: "rgba(125, 118, 122, 0.22)",
        numberFill: "#cf6d8a",
      },
      tabs: [
        { color: "#f3a8bc", shadow: "#d06f8b", motif: "flower" },
        { color: "#ffd36a", shadow: "#d6a53a", motif: "star" },
        { color: "#8ed0bd", shadow: "#66a998", motif: "sparkle" },
        { color: "#f0b7d6", shadow: "#cc86aa", motif: "flower" },
        { color: "#83c8dd", shadow: "#5ba4bc", motif: "cloud" },
      ],
    },
  },
  shinobi: {
    accent: "#315d89",
    sub: "#79b3bd",
    line: "#bca465",
    tab: "#dce8e2",
    coverHardware: {
      board: 0x244e7b,
      boardShadow: 0x17324f,
      spine: 0x2d5d8f,
      spineDark: 0x1d4067,
      spineHighlight: 0xa8cfdd,
      ring: 0xc2a264,
      ringHighlight: 0xffebbd,
    },
    collection: {
      paper: ["#fffbe6", "#edf4e8", "#d8e5df"],
      text: "#2d3d44",
      pageBorder: "#90b5c6",
      pageHighlight: "rgba(255, 255, 255, 0.78)",
      frameShadow: "rgba(27, 52, 76, 0.16)",
      infoAccent: "#4f8ba5",
      infoAccentSoft: "rgba(79, 139, 165, 0.24)",
      ring: 0xc2a264,
      ringHighlight: 0xffedc8,
      spine: {
        warm: "#7ea8b6",
        paper: "#fff8df",
        shadow: "#30495d",
        seam: "#315d89",
        foldPaper: "245, 240, 216",
        foldWarm: "128, 168, 182",
        foldDark: "43, 66, 86",
      },
      pages: {
        left: {
          frame: "#6ba0b5",
          frameDark: "#477f99",
          accent: "#d5b454",
          innerStroke: "#9ac2ce",
          motifSet: "skyGarden",
        },
        right: {
          frame: "#315d89",
          frameDark: "#234767",
          accent: "#7ab7a8",
          innerStroke: "#7fa7bd",
          motifSet: "nature",
        },
      },
      slotBand: {
        fill: "#90b5c6",
        edge: "#5b87a0",
        slot: "rgba(255, 252, 232, 0.92)",
        stroke: "rgba(62, 99, 123, 0.28)",
      },
      card: {
        foundFill: "rgba(255, 253, 238, 0.8)",
        lockedFill: "rgba(220, 225, 218, 0.56)",
        foundStroke: "rgba(79, 139, 165, 0.38)",
        lockedStroke: "rgba(112, 122, 128, 0.22)",
        numberFill: "#4f8ba5",
      },
      tabs: [
        { color: "#315d89", shadow: "#1f405e", motif: "sparkle" },
        { color: "#d2ad4f", shadow: "#a98531", motif: "star" },
        { color: "#72b2bd", shadow: "#4c8b9a", motif: "cloud" },
        { color: "#6d8fb2", shadow: "#4e6e91", motif: "sparkle" },
        { color: "#86c596", shadow: "#5e9a70", motif: "leaf" },
      ],
    },
  },
};

for (const preset of ENTERTAINMENT_BOOK_TEMPLATE_PRESETS) {
  STICKER_BOOK_THEMES[preset.key] = createEntertainmentStickerTheme(preset);
}

function createEntertainmentStickerTheme(preset) {
  const tabs = preset.tabs.map((color, index) => ({
    color,
    shadow: index % 2 ? preset.frameDark : preset.boardShadow ? `#${preset.boardShadow.toString(16).padStart(6, "0")}` : preset.frameDark,
    motif: ["star", "sparkle", "cloud", "flower", "leaf"][index % 5],
  }));
  return {
    accent: preset.accent,
    sub: preset.sub,
    line: preset.line,
    tab: preset.tab,
    coverHardware: {
      board: preset.board,
      boardShadow: preset.boardShadow,
      spine: preset.spine,
      spineDark: preset.spineDark,
      spineHighlight: preset.spineHighlight,
      ring: preset.ring,
      ringHighlight: preset.ringHighlight,
    },
    collection: {
      paper: preset.paper ?? ["#fffbea", "#fff6dc", preset.tab],
      text: "#2d3d44",
      pageBorder: preset.frame,
      pageHighlight: "rgba(255, 255, 255, 0.78)",
      frameShadow: "rgba(32, 56, 64, 0.14)",
      infoAccent: preset.accent,
      infoAccentSoft: "rgba(90, 166, 207, 0.22)",
      ring: preset.ring,
      ringHighlight: preset.ringHighlight,
      spine: {
        warm: preset.frame,
        paper: "#fff8df",
        shadow: preset.frameDark,
        seam: preset.accent,
        foldPaper: "248, 241, 220",
        foldWarm: "142, 190, 198",
        foldDark: "56, 82, 96",
      },
      pages: {
        left: {
          frame: preset.frame,
          frameDark: preset.frameDark,
          accent: preset.sub,
          innerStroke: preset.innerStroke,
          motifSet: preset.motifSet,
        },
        right: {
          frame: preset.sub,
          frameDark: preset.frameDark,
          accent: preset.line,
          innerStroke: preset.innerStroke,
          motifSet: preset.motifSet,
        },
      },
      slotBand: {
        fill: preset.frame,
        edge: preset.frameDark,
        slot: "rgba(255, 252, 232, 0.92)",
        stroke: "rgba(64, 86, 96, 0.24)",
      },
      card: {
        foundFill: "rgba(255, 253, 238, 0.8)",
        lockedFill: "rgba(220, 225, 218, 0.56)",
        foundStroke: "rgba(79, 139, 165, 0.34)",
        lockedStroke: "rgba(112, 122, 128, 0.22)",
        numberFill: preset.accent,
      },
      tabs,
    },
  };
}

function stickerBookTheme(bookName) {
  return STICKER_BOOK_THEMES[bookName] || STICKER_BOOK_THEMES.boy;
}

function coverPrintFile(bookName = activeBook) {
  const bundle = BOOK_VARIANTS[bookName] || BOOK_VARIANTS.boy;
  return bundle.coverPrint || bundle.coverFront;
}

function shouldShowCoverHardware(bookName = activeBook) {
  const bundle = BOOK_VARIANTS[bookName] || BOOK_VARIANTS.boy;
  return activeAlbumMode !== "collection" && bundle.coverHardwareMode !== "baked";
}

function isTextureFileName(value) {
  return typeof value === "string" && /\.(?:png|jpe?g|webp)$/i.test(value);
}

function bookVariantTextureFiles(bookName) {
  return Object.values(BOOK_VARIANTS[bookName] || {}).filter(isTextureFileName);
}

function bookThemeThumbnailFile(bookName) {
  return coverPrintFile(bookName);
}

function assetCssUrl(file) {
  return `url("${ASSET_ROOT}${file}?v=${ASSET_VERSION}")`;
}

const canvas = document.getElementById("scene");
const slider = document.getElementById("flipSlider");
const playButton = document.getElementById("playButton");
const resetButton = document.getElementById("resetButton");
const tuningPanel = document.getElementById("tuningPanel");
const spreadJumper = document.getElementById("spreadJumper");
const spreadJumpButtons = [...document.querySelectorAll("[data-spread-target]")];
const bookButtons = [...document.querySelectorAll("[data-book]")];
const themeButtons = [...document.querySelectorAll("[data-book-theme]")];
const surfaceButtons = [...document.querySelectorAll("[data-surface]")];
const stickerEditor = document.getElementById("stickerEditor");
const editorClose = document.getElementById("editorClose");
const editorPageLabel = document.getElementById("editorPageLabel");
const editorGameFilter = document.getElementById("editorGameFilter");
const editorStickerSearch = document.getElementById("editorStickerSearch");
const stickerLibrary = document.getElementById("stickerLibrary");
const editorPageCanvas = document.getElementById("editorPageCanvas");
const editorScale = document.getElementById("editorScale");
const editorRotation = document.getElementById("editorRotation");
const editorLayerBack = document.getElementById("editorLayerBack");
const editorLayerFront = document.getElementById("editorLayerFront");
const editorDelete = document.getElementById("editorDelete");
const editorApply = document.getElementById("editorApply");
const editorModeButtons = [...document.querySelectorAll("[data-editor-mode]")];
const editorFilterGrid = document.querySelector(".editor-filter-grid");
const drawingTools = document.getElementById("drawingTools");
const drawPenButton = document.getElementById("drawPen");
const drawEraserButton = document.getElementById("drawEraser");
const drawStampButton = document.getElementById("drawStamp");
const drawRainbowButton = document.getElementById("drawRainbow");
const drawSparkleButton = document.getElementById("drawSparkle");
const drawColorPalette = document.getElementById("drawColorPalette");
const drawSizeButtons = [...document.querySelectorAll("[data-draw-size]")];
const drawStampPanel = document.getElementById("drawStampPanel");
const drawUndoButton = document.getElementById("drawUndo");
const drawClearButton = document.getElementById("drawClear");
const bookPageControls = document.getElementById("bookPageControls");
const bookPrevPage = document.getElementById("bookPrevPage");
const bookNextPage = document.getElementById("bookNextPage");
const bookPageLabel = document.getElementById("bookPageLabel");
const bookPageJump = document.getElementById("bookPageJump");
const topSettingsButton = document.getElementById("topSettingsButton");
const topThemeButton = document.getElementById("topThemeButton");
const topEditButton = document.getElementById("topEditButton");
const zukanSettingsPanel = document.getElementById("zukanSettingsPanel");
const zukanSettingsClose = document.getElementById("zukanSettingsClose");
const bookThemePanel = document.getElementById("bookThemePanel");
const bookThemeClose = document.getElementById("bookThemeClose");
const settingsBackButton = document.getElementById("settingsBackButton");
const settingsTutorialButton = document.getElementById("settingsTutorialButton");
const zukanSettingsButtons = [...document.querySelectorAll("[data-zukan-side][data-zukan-type]")];
const stickerModeButtons = [...document.querySelectorAll("[data-sticker-edit-mode]")];
const zukanTuneButton = document.getElementById("zukanTuneButton");
const bookThemePreview = document.getElementById("bookThemePreview");
const bookThemePreviewCover = document.getElementById("bookThemePreviewCover");
const bookThemePreviewName = document.getElementById("bookThemePreviewName");
const bookThemePreviewSwatches = document.getElementById("bookThemePreviewSwatches");
const albumModeToggle = document.getElementById("albumModeToggle");
const collectionStickerTray = document.getElementById("collectionStickerTray");
const collectionStickerTrayItems = document.getElementById("collectionStickerTrayItems");
const stickerTrayCounter = document.getElementById("stickerTrayCounter");
const inlineStickerControls = document.getElementById("inlineStickerControls");
const inlineStickerScale = document.getElementById("inlineStickerScale");
const inlineStickerRotation = document.getElementById("inlineStickerRotation");
const inlineStickerClose = document.getElementById("inlineStickerClose");
const inlineStickerDelete = document.getElementById("inlineStickerDelete");
const inlineStickerOk = document.getElementById("inlineStickerOk");
const stickerTutorial = document.getElementById("stickerTutorial");
const stickerTutorialSpotlight = document.getElementById("stickerTutorialSpotlight");
const stickerTutorialGhost = document.getElementById("stickerTutorialGhost");
const stickerTutorialHand = document.getElementById("stickerTutorialHand");
const stickerTutorialStart = document.getElementById("stickerTutorialStart");
const stickerTutorialStartButton = document.getElementById("stickerTutorialStartButton");
const stickerTutorialStartSkip = document.getElementById("stickerTutorialStartSkip");
const stickerTutorialCard = document.getElementById("stickerTutorialCard");
const stickerTutorialText = document.getElementById("stickerTutorialText");
const stickerTutorialCount = document.getElementById("stickerTutorialCount");
const stickerTutorialSkip = document.getElementById("stickerTutorialSkip");
const stickerTutorialReplay = document.getElementById("stickerTutorialReplay");
const stickerTutorialNext = document.getElementById("stickerTutorialNext");
const stickerTutorialStepSkip = document.getElementById("stickerTutorialStepSkip");  // v1637: try 中 3 失敗 or 30s で表示

const params = new URLSearchParams(window.location.search);
const localPreviewHostnames = new Set(["", "localhost", "127.0.0.1", "::1"]);
const isLocalPreview = localPreviewHostnames.has(window.location.hostname);
const tuningEnabled = params.get("tune") === "1";
const editorEnabled = true;
const prototypeControlsEnabled = isLocalPreview && (tuningEnabled || readBooleanParam("controls"));
const requestedBook = params.get("book");
let activeBook = BOOK_VARIANTS[requestedBook] ? requestedBook : "forest";
let activeAlbumMode = params.get("album") === "collection" ? "collection" : "free";
let stickerEditMode = activeAlbumMode !== "collection" && params.get("edit") === "1";
const zukanFormatIndex = Math.round(
  readClampedNumber(params.get("zukanFormat"), DEFAULT_ZUKAN_FORMAT_INDEX + 1, 1, ZUKAN_THICKNESS_STRIPS.length),
) - 1;
const selectedZukanThickness = ZUKAN_THICKNESS_STRIPS[zukanFormatIndex] || ZUKAN_THICKNESS_STRIPS[DEFAULT_ZUKAN_FORMAT_INDEX];
const requestedSurface = params.get("surface");
let activeSurface = requestedSurface === "cover"
  ? "cover"
  : requestedSurface === "inside" || params.has("page") || params.has("spread")
    ? "inside"
    : "cover";
let flipProgress = isLocalPreview ? readClampedNumber(params.get("progress"), 0, 0, 1) : 0;
let spreadPosition = isLocalPreview && params.has("spread")
  ? readClampedNumber(params.get("spread"), 0.5, 0, 1)
  : 0;
let isPlaying = params.get("play") === "1";
// シール帳 正本統一: grant 動線から渡される query (game / pasteId / firstEver) を受け取る。
// game=<gameId> → catalog page を該当ページへ auto-open。
// pasteId=<stickerId> → 対象シール強調 + ページ移動 (gameId を内包するため pasteId 優先)。
// firstEver=1 → 初回専用 welcome overlay + tutorial 強制起動。
const requestedGameId = (params.get("game") || "").trim();
const requestedPasteStickerId = (params.get("pasteId") || "").trim();
const requestedFirstEver = params.get("firstEver") === "1";
const clock = new THREE.Clock();
if (activeSurface === "cover") {
  flipProgress = 0;
  isPlaying = false;
}
document.body.classList.toggle("is-editor-enabled", editorEnabled);
document.body.classList.toggle("is-prototype-controls", prototypeControlsEnabled);
const bookThemeLabels = new Map(
  [...themeButtons, ...bookButtons].map((button) => [
    button.dataset.bookTheme || button.dataset.book,
    button.textContent.trim(),
  ]),
);
hydrateBookThemeCards();
slider.value = String(THREE.MathUtils.clamp(flipProgress, 0, 1));
playButton.classList.toggle("playing", isPlaying);

// v1637: チュートリアル 2 段階モーダル化。
// 各 step は `textDemo` (お手本フェーズ — 話者中立) と `textTry` (子供が操作するとき) を持つ。
// intro / final は `textTry` を省略し旧来の demo → 「つぎ」 click 待ちを維持。
// tryMaxMs は try フェーズ無操作タイムアウト (経過後 「とばす」 ボタンを自動表示)。
const STICKER_TUTORIAL_STEPS = [
  {
    id: "intro",
    target: "book",
    card: "corner",
    textDemo: "これから シールちょうの\nあそびかたを おしえるね",
    audio: "stickerbook_tut_00_intro.mp3",
    hand: "open",
    minAdvanceMs: 4200,
  },
  {
    id: "mode",
    target: "editButton",
    card: "corner",
    textDemo: "まずは おてほん だよ\nここを おすよ",
    textTry: "やって みよう！\nここを おしてね",
    audio: "stickerbook_tut_01_mode.mp3",
    hand: "point",
    minAdvanceMs: 6000,
    tryMaxMs: 30000,
    advanceOn: ["enterEdit"],
  },
  {
    id: "place",
    target: "trayItems",
    card: "corner",
    textDemo: "まずは おてほん だよ\nえらんで すきな ところに はるよ",
    textTry: "やって みよう！\nシールを えらんで はろう",
    audio: ["stickerbook_tut_02_find.mp3", "stickerbook_tut_03_pick.mp3", "stickerbook_tut_04_place.mp3"],
    hand: "point",
    ghost: true,
    playbackRate: 1.04,
    minAdvanceMs: 5000,
    tryMaxMs: 30000,
    advanceOn: ["dropSticker"],
  },
  {
    id: "move",
    target: "selectedSticker",
    card: "corner",
    textDemo: "まずは おてほん だよ\nはった あとも うごかせるよ",
    textTry: "やって みよう！\nシールを うごかしてね",
    audio: "stickerbook_tut_05_move.mp3",
    hand: "grip",
    minAdvanceMs: 4500,
    tryMaxMs: 30000,
    advanceOn: ["moveSticker"],
  },
  {
    id: "scale",
    target: "scaleControl",
    card: "corner",
    textDemo: "まずは おてほん だよ\nバーで おおきさを かえるよ",
    textTry: "やって みよう！\nバーで おおきさを かえてね",
    audio: "stickerbook_tut_06_scale.mp3",
    hand: "point",
    playbackRate: 1.12,
    minAdvanceMs: 5000,
    tryMaxMs: 30000,
    advanceOn: ["scaleSticker"],
  },
  {
    id: "rotate",
    target: "rotationControl",
    card: "corner",
    textDemo: "まずは おてほん だよ\nバーで むきを かえるよ",
    textTry: "やって みよう！\nバーで むきを かえてね",
    audio: "stickerbook_tut_07_rotate.mp3",
    hand: "point",
    minAdvanceMs: 4500,
    tryMaxMs: 30000,
    advanceOn: ["rotateSticker"],
  },
  {
    id: "ok",
    target: "okButton",
    card: "corner",
    textDemo: "まずは おてほん だよ\nOKで きまり",
    textTry: "やって みよう！\nOKを おしてね",
    audio: "stickerbook_tut_08_ok.mp3",
    hand: "point",
    minAdvanceMs: 4000,
    tryMaxMs: 30000,
    advanceOn: ["confirmSticker"],
  },
  {
    id: "page",
    target: "nextPageButton",
    card: "corner",
    textDemo: "まずは おてほん だよ\nページも めくれるよ",
    textTry: "やって みよう！\nつぎの ページに めくってね",
    audio: ["stickerbook_tut_11_page.mp3"],
    hand: "point",
    minAdvanceMs: 4500,
    tryMaxMs: 30000,
    advanceOn: ["pageTurn"],
  },
  {
    id: "view",
    target: "editButton",
    card: "corner",
    textDemo: "まずは おてほん だよ\nみるときは みるモード",
    textTry: "やって みよう！\nここを おして みるモードに してね",
    audio: "stickerbook_tut_09_view.mp3",
    hand: "point",
    minAdvanceMs: 4500,
    tryMaxMs: 30000,
    advanceOn: ["exitEdit"],
  },
  {
    id: "final",
    target: "book",
    card: "corner",
    textDemo: "すきな シールちょうを\nつくろう",
    audio: "stickerbook_tut_10_final.mp3",
    hand: "open",
    minAdvanceMs: 6500,
    finish: true,
  },
];

// v1646 (task 2): 全 TRY step 共通の「褒め一言」 マップ。
// TRY 成功 (advanceOn ヒット) で phase=complete 突入時に stickerTutorialText を 1.6s 差し替え、
// 「つぎ」 ボタン pulse と同時に達成感を言語化する (子供は何で褒められたか分かると再現できる)。
// place は 既存 (sw1640 で追加) の 「ぺったん！」 をそのまま採用。
const STICKER_TUTORIAL_PRAISE_BY_STEP = {
  mode:   "できたね！\nはる モードに なったよ",
  place:  "ぺったん！\nじょうずに はれたね",
  move:   "すごい！\nじょうずに うごかせたね",
  scale:  "おおきさ かえられたね\nじょうず！",
  rotate: "くるん！\nむきも かえられたね",
  ok:     "きまり！\nシールを はりつけたよ",
  page:   "めくれた！\nつぎの ページに きたよ",
  view:   "みるモードに なったよ\nじょうずに できたね",
};

// v1637: try phase 中の「明らかな間違い操作」 定義。 該当 action が notify されたら failCount++。
// 3 回到達で 「とばす」 ボタンを表示 (子供がスタックしない救済)。
const STICKER_TUTORIAL_STEP_WRONG_ACTIONS = {
  mode:   ["exitEdit"],
  // v1646 (task 5): tray scroll を「明らかな誤操作」 から除外。 .sticker-tray-icon の touch-action: pan-x
  // 緩和で意図的な横スライドが正常動作になったため、 シール探索のため tray を流すのは「正しい操作」。
  place:  ["selectSticker", "enterEdit", "exitEdit"],
  move:   ["scaleSticker", "rotateSticker", "confirmSticker", "exitEdit"],
  scale:  ["rotateSticker", "moveSticker", "confirmSticker"],
  rotate: ["scaleSticker", "moveSticker", "confirmSticker"],
  ok:     ["moveSticker", "scaleSticker", "rotateSticker"],
  page:   ["enterEdit", "exitEdit"],
  view:   ["enterEdit", "pageTurn"],
};

const TUNING_STORAGE_KEY = "sb3d_layer_tuning_by_pair_v9";
const LEGACY_TUNING_STORAGE_KEY = "sb3d_layer_tuning_v1";
const COVER_TUNING_STORAGE_KEY = "sb3d_cover_tuning_v6";
const ZUKAN_TEXT_TUNING_STORAGE_KEY = "sb3d_zukan_text_tuning_v1";
const ZUKAN_SIDE_TEMPLATE_STORAGE_KEY = "sb3d_zukan_side_template_settings_v1";
const RIGHT_ONLY_PAIR_KEY = "empty-full";
const RIGHT_ONLY_SYNC_MARKER_KEY = `${TUNING_STORAGE_KEY}_right_only_seed_v2`;
const TUNING_HISTORY_LIMIT = 80;
const SPREAD_JUMP_SETTLE_PROGRESS = 0;
const SPREAD_JUMP_MIN_DURATION = 0.28;
const SPREAD_JUMP_MAX_DURATION = 0.62;
const COVER_OPEN_DURATION = 1.15;
const COVER_CLOSE_DURATION = 0.95;
const COVER_CLOSED_X = GUTTER / 2;
const COVER_OPEN_X = -GUTTER / 2;
const COVER_CENTER_X = COVER_CLOSED_X + PAGE_W / 2;
const BOOK_COVER_X = -COVER_CENTER_X;
const BOOK_SWIPE_MIN_DISTANCE = 58;
const BOOK_SWIPE_MAX_VERTICAL_RATIO = 0.72;
const BOOK_SWIPE_MAX_DURATION_MS = 1800;
const BOOK_INSIDE_X = 0;
const FLUTTER_PAGE_MIN_COUNT = 3;
const FLUTTER_PAGE_MAX_COUNT = 6;
const PAGE_TURN_BEND = 0.34;
const PAGE_FLUTTER_BEND = 0.56;
const COLLECTION_PAGE_SPINE_CURVE_WIDTH = PAGE_W * 0.22;
const COLLECTION_PAGE_SPINE_PULL = 0;
const COLLECTION_PAGE_SPINE_DIP = PAGE_H * 0.009;
const COLLECTION_FOLD_W = SPINE_W * 0.68;
const COLLECTION_FOLD_DEPTH = PAGE_H * 0.02;
const COLLECTION_FOLD_Z = 0.026;
const COLLECTION_STACK_SEGMENTS_X = 32;
const COLLECTION_STACK_SEGMENTS_Y = 10;
const COLLECTION_STACK_SPINE_DROP = PAGE_H * 0.008;
const COLLECTION_STACK_SPINE_DEPTH = PAGE_H * 0.009;
const COLLECTION_STACK_BOTTOM_WAVE = PAGE_H * 0.0024;
const COLLECTION_STACK_INNER_BOTTOM_WIDTH = 0.22;
const COLLECTION_STACK_INNER_BOTTOM_ROWS = 0.36;
const COLLECTION_STACK_INNER_BOTTOM_EDGE_ROWS = 0.16;
const COLLECTION_STACK_INNER_BOTTOM_LIFT = PAGE_H * 0.018;
const COLLECTION_STACK_INNER_BOTTOM_TAPER = PAGE_W * 0.014;
const COLLECTION_STACK_INNER_BOTTOM_DEPTH = PAGE_H * 0.0046;
const COLLECTION_STACK_INNER_U_CROP = Math.min(0.065, PAGE_RADIUS / PAGE_W);
const STICKER_PAGE_SPINE_CURVE_WIDTH = PAGE_W * 0.34;
const STICKER_PAGE_FREE_CURVE_WIDTH = PAGE_W * 0.24;
const STICKER_PAGE_SPINE_PULL = 0;
const STICKER_PAGE_SPINE_DIP = PAGE_H * 0.0025;
const STICKER_PAGE_CENTER_RAISE = PAGE_H * 0.0022;
const STICKER_PAGE_FREE_EDGE_LIFT = PAGE_H * 0.0012;
const STICKER_PAGE_BLOCK_DEPTH = PAGE_H * 0.032;
const STICKER_PAGE_BLOCK_TOP_Z = -PAGE_H * 0.021;
const STICKER_PAGE_BLOCK_DEPTH_SCALE = {
  empty: 0,
  small: 0.34,
  half: 0.58,
  mostly: 0.78,
  full: 1,
};
const STICKER_COVER_BOARD_DEPTH = PAGE_H * 0.021;
const STICKER_COVER_FACE_LIFT = PAGE_H * 0.0018;
const STICKER_COVER_CLOSED_BOARD_Z = PAGE_H * 0.006;
const STICKER_BACK_COVER_PEEK_BY_LEVEL = {
  empty: 0,
  small: PAGE_H * 0.018,
  half: PAGE_H * 0.038,
  mostly: PAGE_H * 0.057,
  full: PAGE_H * 0.068,
};
const STICKER_BACK_COVER_DEPTH = PAGE_H * 0.026;
const STICKER_BACK_COVER_Z = -PAGE_H * 0.011;
const STICKER_COVER_3D_RING_PIXELS = [218, 452, 686, 920, 1154, 1388];
const STICKER_COVER_3D_RING_ANCHOR_X = PAGE_W * 0.066;
const STICKER_COVER_3D_RING_REACH = PAGE_W * 0.082;
const STICKER_COVER_3D_RING_FRONT_Z = STICKER_COVER_CLOSED_BOARD_Z + PAGE_H * 0.025;
const STICKER_COVER_3D_RING_DEPTH_SCALE = 0.22;
const STICKER_COVER_3D_EYELET_RADIUS = PAGE_W * 0.011;
const STICKER_COVER_3D_EYELET_TUBE = PAGE_W * 0.0023;
const STICKER_COVER_3D_EYELET_HOLE = PAGE_W * 0.0074;
const STICKER_COVER_3D_SOCKET_DEPTH = PAGE_H * 0.025;
const FLUTTER_TRAIL_OPACITY = 0.16;
const DEFAULT_TUNING = {
  stackLeftX: 0,
  stackLeftY: 0.62,
  stackLeftScaleX: 1,
  stackLeftScaleY: 1,
  stackRightX: 0,
  stackRightY: 0.62,
  stackRightScaleX: 1,
  stackRightScaleY: 1,
};
const SHARED_TUNING_FALLBACK = {
  ...DEFAULT_TUNING,
  stackLeftScaleY: THICKNESS_DEFAULT_SCALE_Y.full,
  stackRightScaleY: THICKNESS_DEFAULT_SCALE_Y.full,
};
const TUNING_FIELDS = [
  ["stackLeftX", "左 厚み X", -0.6, 0.6, 0.005],
  ["stackLeftY", "左 厚み Y", -0.75, 2.0, 0.005],
  ["stackLeftScaleX", "左 幅", 0.7, 1.25, 0.005],
  ["stackLeftScaleY", "左 高さ", 0.12, 1.65, 0.005],
  ["stackRightX", "右 厚み X", -0.6, 0.6, 0.005],
  ["stackRightY", "右 厚み Y", -0.75, 2.0, 0.005],
  ["stackRightScaleX", "右 幅", 0.7, 1.25, 0.005],
  ["stackRightScaleY", "右 高さ", 0.12, 1.65, 0.005],
];
const DEFAULT_COVER_TUNING = {
  coverStackX: 0,
  coverStackY: 0.24,
  coverStackScaleX: 1,
  coverStackScaleY: 0.62,
  coverStackOpacity: 0.96,
  coverBgScaleX: 1.16,
  coverBgScaleY: 1.08,
  coverBgOpacity: 0,
};
const COVER_TUNING_FIELDS = [
  ["coverStackX", "厚み X", -0.7, 0.7, 0.005],
  ["coverStackY", "厚み Y", -0.35, 1.6, 0.005],
  ["coverStackScaleX", "厚み 幅", 0.75, 1.5, 0.005],
  ["coverStackScaleY", "厚み 高さ", 0.08, 1.6, 0.005],
  ["coverStackOpacity", "厚み 濃さ", 0, 1, 0.01],
  ["coverBgScaleX", "背景 幅", 0.9, 1.45, 0.005],
  ["coverBgScaleY", "背景 高さ", 0.9, 1.35, 0.005],
  ["coverBgOpacity", "背景 なじみ", 0, 0.8, 0.01],
];
const DEFAULT_ZUKAN_TEXT_TUNING = {
  indexTitleX: 0,
  indexTitleY: 0,
  indexSubtitleX: 0,
  indexSubtitleY: 0,
  indexTemplateX: 0,
  indexTemplateY: 0,
  indexTemplateW: 0,
  indexTemplateH: 0,
  indexBadgeX: 0,
  indexBadgeY: 0,
  indexImageX: 0,
  indexImageY: 0,
  indexTextX: 0,
  indexTextY: 0,
  detailNumberX: 0,
  detailNumberY: 0,
  detailNameX: 0,
  detailNameY: 0,
  detailSubtitleX: 0,
  detailSubtitleY: 0,
  detailCategoryX: 0,
  detailCategoryY: 0,
  detailImageX: 0,
  detailImageY: 0,
  detailFieldTitleX: 0,
  detailFieldTitleY: 0,
  detailFieldTextX: 0,
  detailFieldTextY: 0,
  detailMemoTitleX: 0,
  detailMemoTitleY: 0,
  detailMemoTextX: 0,
  detailMemoTextY: 0,
  detailTemplateX: 0,
  detailTemplateY: 0,
  detailTemplateW: 0,
  detailTemplateH: 0,
};
const ZUKAN_INDEX_CARD_TUNING_PARTS = [
  { id: "Badge", label: "ばんごう", baseKey: "indexBadge", min: -120, max: 120 },
  { id: "Image", label: "え", baseKey: "indexImage", min: -180, max: 180 },
  { id: "Text", label: "なまえ", baseKey: "indexText", min: -180, max: 180 },
];
for (let slotIndex = 0; slotIndex < COLLECTION_INDEX_ITEMS_PER_PAGE; slotIndex += 1) {
  for (const part of ZUKAN_INDEX_CARD_TUNING_PARTS) {
    DEFAULT_ZUKAN_TEXT_TUNING[zukanIndexSlotTuningKey(slotIndex, part.id, "X")] = 0;
    DEFAULT_ZUKAN_TEXT_TUNING[zukanIndexSlotTuningKey(slotIndex, part.id, "Y")] = 0;
  }
}
const ZUKAN_INDEX_CARD_TUNING_FIELDS = [];
for (let slotIndex = 0; slotIndex < COLLECTION_INDEX_ITEMS_PER_PAGE; slotIndex += 1) {
  for (const part of ZUKAN_INDEX_CARD_TUNING_PARTS) {
    const slotLabel = String(slotIndex + 1).padStart(2, "0");
    ZUKAN_INDEX_CARD_TUNING_FIELDS.push(
      [zukanIndexSlotTuningKey(slotIndex, part.id, "X"), `${slotLabel} ${part.label} X`, part.min, part.max, 1],
      [zukanIndexSlotTuningKey(slotIndex, part.id, "Y"), `${slotLabel} ${part.label} Y`, part.min, part.max, 1],
    );
  }
}
const ZUKAN_INDEX_CARD_TUNING_GROUPS = [];
for (let slotIndex = 0; slotIndex < COLLECTION_INDEX_ITEMS_PER_PAGE; slotIndex += 1) {
  for (const part of ZUKAN_INDEX_CARD_TUNING_PARTS) {
    const slotLabel = String(slotIndex + 1).padStart(2, "0");
    const id = zukanIndexSlotGroupId(slotIndex, part.id);
    ZUKAN_INDEX_CARD_TUNING_GROUPS.push({
      id,
      label: `${slotLabel} ${part.label}`,
      keys: [
        zukanIndexSlotTuningKey(slotIndex, part.id, "X"),
        zukanIndexSlotTuningKey(slotIndex, part.id, "Y"),
      ],
    });
  }
}
const ZUKAN_TEXT_TUNING_FIELDS = [
  ["indexTitleX", "もくじ みだし X", -180, 180, 1],
  ["indexTitleY", "もくじ みだし Y", -180, 180, 1],
  ["indexSubtitleX", "もくじ せつめい X", -180, 180, 1],
  ["indexSubtitleY", "もくじ せつめい Y", -180, 180, 1],
  ["indexTemplateX", "もくじ ぜんたい X", -220, 220, 1],
  ["indexTemplateY", "もくじ ぜんたい Y", -220, 220, 1],
  ["indexTemplateW", "もくじ ぜんたい はば", -260, 260, 1],
  ["indexTemplateH", "もくじ ぜんたい たかさ", -260, 260, 1],
  ["indexBadgeX", "もくじ ばんごう X", -120, 120, 1],
  ["indexBadgeY", "もくじ ばんごう Y", -120, 120, 1],
  ["indexImageX", "もくじ え X", -180, 180, 1],
  ["indexImageY", "もくじ え Y", -180, 180, 1],
  ["indexTextX", "もくじ なまえ X", -180, 180, 1],
  ["indexTextY", "もくじ なまえ Y", -180, 180, 1],
  ...ZUKAN_INDEX_CARD_TUNING_FIELDS,
  ["detailNumberX", "しょうさい No X", -160, 160, 1],
  ["detailNumberY", "しょうさい No Y", -160, 160, 1],
  ["detailNameX", "しょうさい なまえ X", -220, 220, 1],
  ["detailNameY", "しょうさい なまえ Y", -160, 160, 1],
  ["detailSubtitleX", "しょうさい よみ X", -220, 220, 1],
  ["detailSubtitleY", "しょうさい よみ Y", -160, 160, 1],
  ["detailCategoryX", "しょうさい ぶんるい X", -180, 180, 1],
  ["detailCategoryY", "しょうさい ぶんるい Y", -160, 160, 1],
  ["detailImageX", "しょうさい え X", -220, 220, 1],
  ["detailImageY", "しょうさい え Y", -220, 220, 1],
  ["detailFieldTitleX", "こうもく みだし X", -180, 180, 1],
  ["detailFieldTitleY", "こうもく みだし Y", -180, 180, 1],
  ["detailFieldTextX", "こうもく ぶん X", -180, 180, 1],
  ["detailFieldTextY", "こうもく ぶん Y", -180, 180, 1],
  ["detailMemoTitleX", "メモ みだし X", -180, 180, 1],
  ["detailMemoTitleY", "メモ みだし Y", -180, 180, 1],
  ["detailMemoTextX", "メモ ぶん X", -180, 180, 1],
  ["detailMemoTextY", "メモ ぶん Y", -180, 180, 1],
  ["detailTemplateX", "しょうさい ぜんたい X", -220, 220, 1],
  ["detailTemplateY", "しょうさい ぜんたい Y", -220, 220, 1],
  ["detailTemplateW", "しょうさい ぜんたい はば", -260, 260, 1],
  ["detailTemplateH", "しょうさい ぜんたい たかさ", -260, 260, 1],
];
const ZUKAN_TEXT_TUNING_GROUPS = [
  { id: "indexTitle", label: "もくじ みだし", keys: ["indexTitleX", "indexTitleY"] },
  { id: "indexSubtitle", label: "もくじ せつめい", keys: ["indexSubtitleX", "indexSubtitleY"] },
  { id: "indexTemplate", label: "もくじ ぜんたい", keys: ["indexTemplateX", "indexTemplateY", "indexTemplateW", "indexTemplateH"] },
  { id: "indexBadge", label: "もくじ ばんごう", keys: ["indexBadgeX", "indexBadgeY"] },
  { id: "indexImage", label: "もくじ え", keys: ["indexImageX", "indexImageY"] },
  { id: "indexText", label: "もくじ なまえ", keys: ["indexTextX", "indexTextY"] },
  ...ZUKAN_INDEX_CARD_TUNING_GROUPS,
  { id: "detailNumber", label: "しょうさい No", keys: ["detailNumberX", "detailNumberY"] },
  { id: "detailName", label: "しょうさい なまえ", keys: ["detailNameX", "detailNameY"] },
  { id: "detailSubtitle", label: "しょうさい よみ", keys: ["detailSubtitleX", "detailSubtitleY"] },
  { id: "detailCategory", label: "しょうさい ぶんるい", keys: ["detailCategoryX", "detailCategoryY"] },
  { id: "detailImage", label: "しょうさい え", keys: ["detailImageX", "detailImageY"] },
  { id: "detailFieldTitle", label: "こうもく みだし", keys: ["detailFieldTitleX", "detailFieldTitleY"] },
  { id: "detailFieldText", label: "こうもく ぶん", keys: ["detailFieldTextX", "detailFieldTextY"] },
  { id: "detailMemoTitle", label: "メモ みだし", keys: ["detailMemoTitleX", "detailMemoTitleY"] },
  { id: "detailMemoText", label: "メモ ぶん", keys: ["detailMemoTextX", "detailMemoTextY"] },
  { id: "detailTemplate", label: "しょうさい ぜんたい", keys: ["detailTemplateX", "detailTemplateY", "detailTemplateW", "detailTemplateH"] },
];
const ZUKAN_TEXT_TUNING_GROUP_BY_ID = new Map(ZUKAN_TEXT_TUNING_GROUPS.map((group) => [group.id, group]));
const ZUKAN_TEXT_TUNING_FIELD_GROUP_BY_KEY = new Map(
  ZUKAN_TEXT_TUNING_GROUPS.flatMap((group) => group.keys.map((key) => [key, group.id])),
);
const ZUKAN_TEXT_TUNING_LIMIT_BY_KEY = new Map(
  ZUKAN_TEXT_TUNING_FIELDS.map(([key, , min, max]) => [key, { min, max }]),
);
const SPREAD_PRESETS = [
  ["empty-full", 0, "右だけ"],
  ["small-mostly", 0.25, "右多め"],
  ["half-half", 0.5, "半分"],
  ["mostly-small", 0.75, "左多め"],
  ["full-empty", 1, "左だけ"],
];
let layerTuningByPair = loadLayerTuningStore();
let coverTuning = loadCoverTuning();
let zukanTextTuning = loadZukanTextTuning();
let zukanSideTemplateSettings = loadZukanSideTemplateSettings();
let tuningUndoStack = [];
let tuningRedoStack = [];
let activeTuningEditLabel = "";
let selectedZukanTuningTargetId = "";
let zukanTuningDragState = null;
let suppressZukanTuningClick = false;
let spreadJumpAnimation = null;
let coverOpenAnimation = null;
let bookSwipeState = null;
let stickerTrayDragState = null;
let suppressStickerTrayClick = false;
let suppressSceneClickAfterSwipe = false;
// v1650 (task 2): tray drop 直後の合成 click (canvas 側) を 250ms 抑止。
// suppressStickerTrayClick は collectionStickerTray 専用で canvas には届かないため別フラグ。
// これがないと drop → 合成 click → pickEditablePage ヒット → refreshPageTemplateTextures
// 2 回目発火 → loadStickerImage の microtask 解決前なので blank canvas が 1-2 フレーム描画され、
// spotlight pulse と組み合わさって 「貼ったシールが消えた」 視覚バグになる。
let suppressSceneClickAfterStickerDrop = false;
let lastBookSwipeDebug = null;
let stickerPlan = null;
let gameStickerCatalog = null;
let stickerOptions = [];
let collectionStickerOptions = [];
let editorPageDefinitions = createFallbackEditorPageDefinitions();
let collectionPageDefinitions = createFallbackCollectionPageDefinitions();
let activeCollectionTocCategoryId = "";
let pendingCollectionTocCategoryId = "";
let editorState = loadEditorState();
let collectionAlbumState = loadCollectionAlbumState();
let activeEditorPage = 1;
const requestedInitialPage = Math.max(1, Math.round(readClampedNumber(params.get("page"), 1, 1, 999)));
let activeBookPage = requestedInitialPage % 2 === 0 ? requestedInitialPage - 1 : requestedInitialPage;
if (!isLocalPreview || !params.has("spread")) {
  spreadPosition = spreadPositionForBookPage(activeBookPage);
}
let selectedPlacementId = null;
let stickerDragState = null;
let inlineStickerDragState = null;
let suppressInlineStickerClick = false;
let stickerTrayTouchStartY = 0;
let stickerTrayRevealHideTimer = 0;
let stickerTutorialState = null;
let stickerTutorialAudio = null;
let stickerTutorialAudioBlocked = false;
// === BGM (loop track) ===
// pono_bgm_enabled は他ゲーム (maze 等) と共有する横断キー。 ユーザーが一度 OFF にしたら全ゲーム共通でミュート。
const STICKER_BGM_URL = "../../assets/audio/stickerbook/bgm/sticker-album-morning.mp3";
const STICKER_BGM_BASE_VOLUME = 0.28;   // 通常時
const STICKER_BGM_DUCK_VOLUME = 0.08;   // チュートリアル ナレ中
const STICKER_BGM_FADE_MS = 600;        // 起動/停止 フェード長
let stickerBgmAudio = null;
let stickerBgmEnabled = localStorage.getItem("pono_bgm_enabled") !== "off";
let stickerBgmUnlocked = false;
let stickerBgmFadeTimer = null;
let stickerBgmDucked = false;
let stickerTutorialAutoStartChecked = false;
let stickerTutorialLayoutFrame = 0;
let stickerTutorialDemoFrame = 0;
let stickerTutorialDemoStartTime = 0;
let stickerTutorialDemoBaseScroll = 0;
let stickerTutorialDemoTimers = [];
let stickerTutorialTryTimeoutTimer = 0;          // v1637: try phase の無操作タイムアウト用 (setTimeout id)
let stickerTutorialDragPageTurnTimer = 0;
let stickerTutorialDragPageTurnDirection = 0;
let stickerTutorialProgrammaticTrayScroll = false;
let stickerTutorialProgrammaticTrayScrollUntil = 0;
let stickerTutorialSuppressModeNotify = false;
let stickerTutorialLastOkRect = null;  // v1625: OK click 後 inlineStickerControls が hidden になっても黄枠が page rect に飛ばないよう直近を保持
const stickerTutorialSuppressedDemoActions = new Set();
let editorStateSaveTimer = 0;
let editorStateDirty = false;
let editorGameFilterValue = "all";
let editorSearchQuery = "";
let editorMode = "sticker";
let drawTool = "pen";
let drawBrushColor = DRAWING_DEFAULT_COLOR;
let drawBrushSize = DRAWING_DEFAULT_SIZE;
let selectedDrawingStamp = DRAWING_STAMPS[0].id;
let drawingPointerState = null;
const stickerImageCache = new Map();
const stickerAspectCache = new Map();
const drawingStampImageCache = new Map();
seedAllTuningPairsFromRightOnlyOnce();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.sortObjects = true;

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
const cameraTarget = new THREE.Vector3(0, 0.08, 0);
const pageRaycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

const loader = new THREE.TextureLoader();
const textureFiles = [
  ...new Set([
    ...Object.values(SHARED_TEXTURES),
    ...Object.values(ZUKAN_PAGE_TEMPLATES),
    ...ZUKAN_THICKNESS_STRIPS.map(({ file }) => file),
    ...bookVariantTextureFiles(activeBook),
    ...["boy", "girl"].flatMap((bookName) =>
      THICKNESS_LEVEL_NAMES.flatMap((level) => [
        `sb3d_${bookName}_page_thickness_left_${level}.webp`,
        `sb3d_${bookName}_page_thickness_right_${level}.webp`,
      ]),
    ),
  ]),
];
const textureEntries = await Promise.all(textureFiles.map(async (file) => [file, await loadTexture(file)]));
const textureMap = new Map(textureEntries);
const textureLoadPromises = new Map();
const pageTemplateTextureMap = new Map();
const stickerSpineTextureMap = new Map();
const freeSideTabsTextureMap = new Map();
const collectionSpineTextureMap = new Map();
const collectionFoldTextureMap = new Map();
const collectionTabsTextureMap = new Map();
window.__stickerBookAssetsLoaded = true;

const book = new THREE.Group();
scene.add(book);

const floorShadow = makePlane(SHARED_TEXTURES.floorShadow, PAGE_W * 2 + GUTTER + 0.9, 0.7, {
  opacity: 0.72,
  depth: -0.22,
});
floorShadow.position.set(0, -PAGE_H * 0.54, -0.06);
book.add(floorShadow);

const coverOnly = new THREE.Group();
book.add(coverOnly);

const coverBackground = new THREE.Mesh(
  createCoverSurfaceGeometry(),
  new THREE.MeshBasicMaterial({
    color: 0x173a43,
    transparent: true,
    opacity: DEFAULT_COVER_TUNING.coverBgOpacity,
    depthWrite: false,
  }),
);
coverBackground.position.set(COVER_CLOSED_X, 0, -0.08);
coverBackground.renderOrder = 18;
coverOnly.add(coverBackground);

const coverThickness = createCoverThicknessLayer();
coverOnly.add(coverThickness.group);

const coverHardware = createCoverHardwareLayer();
coverOnly.add(coverHardware.group);

const closedCoverDepth = createCoverDepthLayer();
closedCoverDepth.group.position.set(COVER_CLOSED_X, 0, STICKER_COVER_CLOSED_BOARD_Z);
coverOnly.add(closedCoverDepth.group);

const closedCover = makePageSurface(coverPrintFile(activeBook), createCoverSurfaceGeometry());
closedCover.position.set(COVER_CLOSED_X, 0, STICKER_COVER_CLOSED_BOARD_Z + STICKER_COVER_FACE_LIFT);
closedCover.renderOrder = 30;
coverOnly.add(closedCover);

const closedCoverRings = createCover3DRingLayer();
closedCoverRings.group.position.set(COVER_CLOSED_X, 0, 0);
coverOnly.add(closedCoverRings.group);

const coverTurn = new THREE.Group();
coverTurn.visible = false;
coverTurn.position.set(COVER_CLOSED_X, 0, 0.18);
book.add(coverTurn);

const coverTurnGeometry = createCoverSurfaceGeometry();
const coverTurnBackGeometry = createCoverSurfaceGeometry();
mirrorGeometryUvX(coverTurnBackGeometry);
const coverTurnFront = new THREE.Mesh(
  coverTurnGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(coverPrintFile(activeBook)),
    transparent: false,
    side: THREE.FrontSide,
    depthWrite: true,
    roughness: 0.9,
    metalness: 0.0,
  }),
);
const coverTurnDepth = createCoverDepthLayer();
const coverTurnBack = new THREE.Mesh(
  coverTurnBackGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(BOOK_VARIANTS[activeBook].coverInside),
    transparent: false,
    side: THREE.BackSide,
    depthWrite: true,
    roughness: 0.92,
    metalness: 0.0,
  }),
);
coverTurnFront.position.z = STICKER_COVER_FACE_LIFT;
coverTurnBack.position.z = -STICKER_COVER_BOARD_DEPTH - STICKER_COVER_FACE_LIFT;
coverTurnFront.renderOrder = 86;
coverTurnBack.renderOrder = 85;
coverTurnDepth.group.renderOrder = 84;
coverTurn.add(coverTurnDepth.group);
coverTurn.add(coverTurnBack);
coverTurn.add(coverTurnFront);
const coverTurnRings = createCover3DRingLayer();
coverTurnRings.group.renderOrder = 88;
coverTurn.add(coverTurnRings.group);

const spine = makePlane(BOOK_VARIANTS[activeBook].spine, SPINE_W, STICKER_SPINE_H, { depth: -0.09, lit: true, transparent: true });
spine.position.set(0, 0, -0.09);
spine.material.depthWrite = false;
spine.renderOrder = 1;
book.add(spine);

const collectionFold = new THREE.Mesh(
  createCollectionFoldGeometry(),
  new THREE.MeshBasicMaterial({
    map: getCollectionFoldTexture(activeBook),
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
collectionFold.position.set(0, 0, COLLECTION_FOLD_Z);
collectionFold.renderOrder = 16;
collectionFold.visible = false;
book.add(collectionFold);

const sideTabs = createSideTabs();
sideTabs.group.position.z = -0.04;
book.add(sideTabs.group);

const pageStacks = createPageStacks();
book.add(pageStacks.group);

const stickerBookDepth = createStickerBookDepthLayer();
book.add(stickerBookDepth.group);

const stickerBackCoverBoards = createStickerBackCoverBoards();
book.add(stickerBackCoverBoards.group);

const leftPageOuter = makePageSurface(BOOK_VARIANTS[activeBook].coverBack, createPageSurfaceGeometry("right"));
leftPageOuter.position.set(-PAGE_W - GUTTER / 2, 0, -0.001);
leftPageOuter.renderOrder = 9;
book.add(leftPageOuter);

const standardLeftPageGeometry = createPageSurfaceGeometry("right");
const standardRightPageGeometry = createPageSurfaceGeometry("left");
const collectionLeftPageGeometry = createCurvedCollectionPageSurfaceGeometry("right");
const collectionRightPageGeometry = createCurvedCollectionPageSurfaceGeometry("left");

const leftPageInner = makePageSurface(BOOK_VARIANTS[activeBook].insideLeft, standardLeftPageGeometry);
leftPageInner.position.set(-PAGE_W - GUTTER / 2, 0, 0);
leftPageInner.renderOrder = 10;
book.add(leftPageInner);

const rightPage = makePageSurface(BOOK_VARIANTS[activeBook].insideRight, standardRightPageGeometry);
rightPage.position.set(GUTTER / 2, 0, 0);
rightPage.renderOrder = 10;
book.add(rightPage);

const innerLeft = makePlane(SHARED_TEXTURES.innerLeft, GUTTER, PAGE_H, { opacity: 0.64, depth: 0.05 });
innerLeft.position.set(-GUTTER / 2, 0, 0.03);
innerLeft.renderOrder = 12;
book.add(innerLeft);

const innerRight = makePlane(SHARED_TEXTURES.innerRight, GUTTER, PAGE_H, { opacity: 0.64, depth: 0.05 });
innerRight.position.set(GUTTER / 2, 0, 0.03);
innerRight.renderOrder = 12;
book.add(innerRight);

const pageTurn = new THREE.Group();
pageTurn.position.set(GUTTER / 2, 0, 0.08);
book.add(pageTurn);

const standardTurningPageGeometry = createBendablePageSurfaceGeometry("left");
const collectionTurningPageGeometry = createBendablePlainPageSurfaceGeometry();
const standardFlipShadowGeometry = standardTurningPageGeometry.clone();
const collectionFlipShadowGeometry = collectionTurningPageGeometry.clone();
let turningPageGeometry = standardTurningPageGeometry;
prepareBendGeometry(turningPageGeometry);
prepareBendGeometry(collectionTurningPageGeometry);
prepareBendGeometry(standardFlipShadowGeometry);
prepareBendGeometry(collectionFlipShadowGeometry);
const frontPage = new THREE.Mesh(
  turningPageGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(BOOK_VARIANTS[activeBook].insideRight),
    transparent: false,
    side: THREE.FrontSide,
    depthWrite: true,
    roughness: 0.92,
    metalness: 0.0,
  }),
);
frontPage.renderOrder = 20;

const backPage = new THREE.Mesh(
  turningPageGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(SHARED_TEXTURES.pageBack),
    transparent: false,
    side: THREE.BackSide,
    depthWrite: true,
    roughness: 0.95,
    metalness: 0.0,
  }),
);
backPage.renderOrder = 19;

frontPage.position.z = 0.002;
backPage.position.z = -0.002;
pageTurn.add(backPage);
pageTurn.add(frontPage);

const flipShadow = new THREE.Mesh(
  standardFlipShadowGeometry,
  new THREE.MeshBasicMaterial({
    map: getTexture(SHARED_TEXTURES.flipShadow),
    transparent: true,
    opacity: 0.18,
    side: THREE.FrontSide,
    depthWrite: false,
  }),
);
flipShadow.position.z = 0.018;
flipShadow.renderOrder = 23;
pageTurn.add(flipShadow);

const flutterPages = createFlutterPages();
book.add(flutterPages.group);

const ringGroup = createHalfRingMeshes();
ringGroup.renderOrder = 70;
book.add(ringGroup);

function setBindingRingVisible(visible) {
  ringGroup.visible = visible && activeAlbumMode !== "collection";
}

const topLight = new THREE.DirectionalLight(0xffffff, 1.7);
topLight.position.set(-2.5, 3.5, 6);
scene.add(topLight);

const sideLight = new THREE.DirectionalLight(0x8fd9e5, 0.75);
sideLight.position.set(4, -3, 5);
scene.add(sideLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.86));

slider.addEventListener("input", () => {
  cancelSpreadJump();
  flipProgress = Number(slider.value);
  isPlaying = false;
  playButton.classList.remove("playing");
  updatePage(flipProgress);
  syncUrl();
});

playButton.addEventListener("click", () => {
  cancelSpreadJump();
  isPlaying = !isPlaying;
  playButton.classList.toggle("playing", isPlaying);
  syncUrl();
});

resetButton.addEventListener("click", () => {
  cancelSpreadJump();
  isPlaying = false;
  flipProgress = 0;
  slider.value = String(flipProgress);
  playButton.classList.remove("playing");
  updatePage(flipProgress);
  syncUrl();
});

function hydrateBookThemeCards() {
  for (const button of [...themeButtons, ...bookButtons]) {
    const bookName = button.dataset.bookTheme || button.dataset.book;
    if (!BOOK_VARIANTS[bookName]) {
      continue;
    }
    const theme = stickerBookTheme(bookName);
    const label = bookThemeLabels.get(bookName) || button.textContent.trim() || bookName;
    button.style.setProperty("--book-thumb", assetCssUrl(bookThemeThumbnailFile(bookName)));
    button.style.setProperty("--book-accent", theme.accent || "#49aba2");
    button.setAttribute("aria-label", `${label}を えらぶ`);
  }
}

function updateBookThemePreview() {
  if (!bookThemePreview || !bookThemePreviewCover || !bookThemePreviewName || !bookThemePreviewSwatches) {
    return;
  }
  const theme = stickerBookTheme(activeBook);
  const label = bookThemeLabels.get(activeBook) || activeBook;
  bookThemePreview.style.setProperty("--book-thumb", assetCssUrl(bookThemeThumbnailFile(activeBook)));
  bookThemePreview.style.setProperty("--book-accent", theme.accent || "#49aba2");
  bookThemePreviewCover.style.backgroundImage = assetCssUrl(bookThemeThumbnailFile(activeBook));
  bookThemePreviewName.textContent = label;
  bookThemePreviewSwatches.replaceChildren();
  for (const color of [theme.accent, theme.sub, theme.line, theme.tab].filter(Boolean)) {
    const swatch = document.createElement("span");
    swatch.style.backgroundColor = color;
    bookThemePreviewSwatches.append(swatch);
  }
}

async function setActiveBook(nextBook) {
  const normalizedBook = BOOK_VARIANTS[nextBook] ? nextBook : "boy";
  if (normalizedBook === activeBook) {
    updateControlState();
    return;
  }
  try {
    await ensureBookVariantTextures(normalizedBook);
  } catch (error) {
    console.error("Failed to load sticker book theme textures", normalizedBook, error);
    return;
  }
  cancelSpreadJump();
  closeBookPageJump();
  activeBook = normalizedBook;
  applyVariantState();
}

for (const button of bookButtons) {
  button.addEventListener("click", () => setActiveBook(button.dataset.book));
}

for (const button of themeButtons) {
  button.addEventListener("click", () => setActiveBook(button.dataset.bookTheme));
}

for (const button of surfaceButtons) {
  button.addEventListener("click", () => {
    const nextSurface = button.dataset.surface === "cover" ? "cover" : "inside";
    if (nextSurface === activeSurface) {
      return;
    }
    setBookSurface(nextSurface, activeBookPage);
  });
}

for (const button of spreadJumpButtons) {
  button.addEventListener("click", () => {
    const target = readClampedNumber(button.dataset.spreadTarget, spreadPosition, 0, 1);
    startSpreadJump(target);
  });
}

topSettingsButton?.addEventListener("click", () => {
  toggleZukanSettingsPanel();
});

topThemeButton?.addEventListener("click", () => {
  toggleBookThemePanel();
});

topEditButton?.addEventListener("click", () => {
  const previousMode = stickerEditMode;
  setStickerEditMode(!stickerEditMode, { openInside: true });
  closeZukanSettingsPanel();
  closeBookThemePanel();
  if (stickerTutorialSuppressModeNotify) {
    scheduleStickerTutorialLayout();
    return;
  }
  if (!previousMode && stickerEditMode) {
    notifyStickerTutorialAction("enterEdit");
  } else if (previousMode && !stickerEditMode) {
    notifyStickerTutorialAction("exitEdit");
  }
});

syncTopSettingsButton();
setupZukanSettingsPanel();
updateStickerEditModeUi();

albumModeToggle?.addEventListener("click", () => {
  setAlbumMode(activeAlbumMode === "collection" ? "free" : "collection");
});

window.addEventListener("resize", resize);
setupTuningPanel();
setupBookPageControls();
setupBookSwipeNavigation();
setupCollectionStickerTray();
setupInlineStickerControls();
setupStickerTutorial();
setupStickerTrayReveal();
if (editorEnabled) {
  setupScenePagePicking();
  setupStickerEditor();
} else {
  stickerEditor?.remove();
  loadStickerPlanForEditor();
}
resize();
applyVariantState();
window.__stickerBookReady = true;
window.__stickerBookDebugState = () => ({
  activeBookPage,
  activeSurface,
  activeAlbumMode,
  stickerEditMode,
  flipProgress,
  spreadPosition,
  thicknessPair: thicknessPairForSpread(spreadPosition),
  spreadJumpActive: Boolean(spreadJumpAnimation),
  spreadJumpVisiblePageCount: spreadJumpAnimation?.visiblePageCount ?? 0,
  spreadJumpCycles: spreadJumpAnimation?.cycles ?? 0,
  coverOpenActive: Boolean(coverOpenAnimation),
  coverOpenDirection: coverOpenAnimation?.direction || "",
  coverOpenAge: coverOpenAnimation ? coverOpenAnimation.elapsed || 0 : 0,
  coverOpenDuration: coverOpenAnimation?.duration ?? 0,
  coverPrint: coverPrintFile(activeBook),
  coverHardwareVisible: coverHardware.group.visible,
  lastBookSwipeDebug,
  ringGroupVisible: ringGroup.visible,
  innerLeftVisible: innerLeft.visible,
  innerRightVisible: innerRight.visible,
  pageTurnVisible: pageTurn.visible,
  frontPageVisible: frontPage.visible,
  backPageVisible: backPage.visible,
  leftPlacementCount: getPagePlacements(activeBookPage).length,
  rightPlacementCount: getPagePlacements(rightBookPageNumber()).length,
  leftCollectionPlacementCount: getCollectionPagePlacements(activeBookPage).length,
  rightCollectionPlacementCount: getCollectionPagePlacements(rightBookPageNumber()).length,
  collectionTocCardCount: Math.max(1, Math.ceil(collectionTocPageCount() / 2)),
  collectionTocDockVisible: Boolean(collectionStickerTray && !collectionStickerTray.hidden),
  turnFrontTextureIsCanvas: frontPage.material.map?.image instanceof HTMLCanvasElement,
  turnBackTextureIsCanvas: backPage.material.map?.image instanceof HTMLCanvasElement,
});
window.__stickerBookZukanStructure = () => collectionPageDefinitions.map((pageDef) => ({
  page: pageDef.page,
  type: pageDef.type,
  categoryId: pageDef.categoryId || "",
  subjectId: pageDef.subjectId || "",
  subjectIds: Array.isArray(pageDef.subjectIds) ? [...pageDef.subjectIds] : [],
  indexTargets: Array.isArray(pageDef.indexTargets) ? pageDef.indexTargets.map((target) => ({ ...target })) : [],
}));
window.__stickerBookZukanIndexTargets = (page = activeBookPage) => {
  const pageDef = collectionPageDefinitions[Math.max(1, Math.round(page)) - 1] || null;
  return collectionZukanIndexTargetsForPage(pageDef);
};
animate();

function setupScenePagePicking() {
  if (!editorEnabled) {
    return;
  }
  canvas.addEventListener("pointerdown", handleZukanTuningPointerDown);
  canvas.addEventListener("pointerdown", handleInlineStickerPointerDown);
  canvas.addEventListener("pointermove", (event) => {
    if (handleInlineStickerPointerMove(event)) {
      return;
    }
    if (handleZukanTuningPointerMove(event)) {
      return;
    }
    const stickerTarget = pickInlineStickerTarget(event);
    const tuningTarget = pickZukanTextTuningTarget(event);
    canvas.style.cursor = tuningTarget
      ? "grab"
      : stickerTarget
        ? "grab"
        : pickCollectionZukanTarget(event)
        ? "pointer"
        : "";
  });
  canvas.addEventListener("pointerup", endInlineStickerDrag);
  canvas.addEventListener("pointercancel", cancelInlineStickerDrag);
  canvas.addEventListener("pointerup", endZukanTuningDrag);
  canvas.addEventListener("pointercancel", endZukanTuningDrag);
  canvas.addEventListener("pointerleave", () => {
    if (!zukanTuningDragState && !inlineStickerDragState) {
      canvas.style.cursor = "";
    }
  });
  canvas.addEventListener("click", (event) => {
    if (suppressSceneClickAfterSwipe) {
      event.preventDefault();
      suppressSceneClickAfterSwipe = false;
      return;
    }
    if (suppressZukanTuningClick) {
      event.preventDefault();
      suppressZukanTuningClick = false;
      return;
    }
    if (suppressInlineStickerClick) {
      event.preventDefault();
      suppressInlineStickerClick = false;
      return;
    }
    // v1650 (task 2): tray drop 直後 250ms は canvas click を全 skip。
    // drop で走った #1 refreshPageTemplateTextures の async draw が完了する前に
    // canvas click handler が #2 refreshPageTemplateTextures を打って blank frame を作る事故を防止。
    if (suppressSceneClickAfterStickerDrop) {
      event.preventDefault();
      return;
    }
    const zukanTarget = pickCollectionZukanTarget(event);
    if (zukanTarget) {
      event.preventDefault();
      navigateCollectionZukanTarget(zukanTarget);
      return;
    }
    // v1650 (task 2): place TRY 完了 〜 「つぎ」 押下までは selectedPlacementId を保護。
    // 単に selectedPlacementId 保護だけでは pickInlineStickerTarget/refreshInlineStickerPage が
    // refreshPageTemplateTextures を打って blank frame を生むので、 protect 中は両 branch を
    // 完全 early-return する (a681f99 (v1646) は guard 不完全だった真因)。
    const tutorialStep = currentStickerTutorialStep?.();
    const tutorialPhase = stickerTutorialState?.phase;
    const protectPlacement = (
      tutorialStep?.id === "place"
      && (tutorialPhase === "complete" || tutorialPhase === "try")
    );
    const stickerTarget = pickInlineStickerTarget(event);
    if (stickerTarget) {
      event.preventDefault();
      if (protectPlacement) {
        // 自分自身を再選択するだけでも refreshInlineStickerPage が走るので skip。
        return;
      }
      selectInlineSticker(stickerTarget);
      return;
    }
    if (pickEditablePage(event)) {
      if (protectPlacement) {
        event.preventDefault();
        return;
      }
      selectedPlacementId = null;
      updateInlineStickerControls();
      refreshPageTemplateTextures();
      updatePage(flipProgress);
    }
  });
}

function handleZukanTuningPointerDown(event) {
  const target = pickZukanTextTuningTarget(event);
  if (!target) {
    return false;
  }
  event.preventDefault();
  selectZukanTuningTarget(target.id, { redraw: true });
  suppressZukanTuningClick = true;
  zukanTuningDragState = {
    pointerId: event.pointerId,
    object: target.object,
    targetId: target.id,
    label: target.label,
    startX: target.textureX,
    startY: target.textureY,
    startTuning: normalizeZukanTextTuning(zukanTextTuning),
    undoStarted: false,
    moved: false,
  };
  canvas.setPointerCapture?.(event.pointerId);
  canvas.style.cursor = "grabbing";
  return true;
}

function handleZukanTuningPointerMove(event) {
  if (!zukanTuningDragState) {
    return false;
  }
  if (event.pointerId !== zukanTuningDragState.pointerId) {
    return true;
  }
  event.preventDefault();
  const hit = pickScenePageHit(event);
  if (!hit?.uv || hit.object !== zukanTuningDragState.object) {
    return true;
  }
  const point = texturePointFromPageHit(hit);
  const deltaX = Math.round(point.x - zukanTuningDragState.startX);
  const deltaY = Math.round(point.y - zukanTuningDragState.startY);
  if (Math.abs(deltaX) + Math.abs(deltaY) < 1) {
    return true;
  }
  if (!zukanTuningDragState.undoStarted) {
    beginTuningEdit(zukanTuningDragState.label);
    zukanTuningDragState.undoStarted = true;
  }
  zukanTuningDragState.moved = true;
  if (moveZukanTextTuningTarget(
    zukanTuningDragState.targetId,
    deltaX,
    deltaY,
    zukanTuningDragState.startTuning,
  )) {
    updateTuningOutput();
    refreshPageTemplateTextures();
    updatePage(flipProgress);
  }
  return true;
}

function endZukanTuningDrag(event) {
  if (!zukanTuningDragState) {
    return;
  }
  if (event?.pointerId != null && event.pointerId !== zukanTuningDragState.pointerId) {
    return;
  }
  if (zukanTuningDragState.undoStarted) {
    endTuningEdit();
  }
  try {
    if (canvas.hasPointerCapture?.(zukanTuningDragState.pointerId)) {
      canvas.releasePointerCapture(zukanTuningDragState.pointerId);
    }
  } catch {}
  zukanTuningDragState = null;
  canvas.style.cursor = "";
  window.setTimeout(() => {
    suppressZukanTuningClick = false;
  }, 0);
}

function setupInlineStickerControls() {
  inlineStickerScale?.addEventListener("input", () => {
    updateSelectedPlacement({ scale: Number(inlineStickerScale.value) });
    notifyStickerTutorialAction("scaleSticker");
  });
  inlineStickerRotation?.addEventListener("input", () => {
    updateSelectedPlacement({ rotation: Number(inlineStickerRotation.value) });
    notifyStickerTutorialAction("rotateSticker");
  });
  for (const input of [inlineStickerScale, inlineStickerRotation]) {
    input?.addEventListener("change", () => flushEditorStateSave());
  }
  inlineStickerDelete?.addEventListener("click", () => {
    deleteSelectedPlacement();
    refreshInlineStickerPage();
  });
  inlineStickerClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    clearInlineStickerSelection();
  });
  inlineStickerOk?.addEventListener("click", (event) => {
    event.stopPropagation();
    flushEditorStateSave();
    clearInlineStickerSelection();
    notifyStickerTutorialAction("confirmSticker");
  });
  updateInlineStickerControls();
}

function isInlineStickerPanelOpen() {
  return Boolean(inlineStickerControls && !inlineStickerControls.hidden);
}

function canUseInlineStickerEditing() {
  return activeAlbumMode !== "collection"
    && stickerEditMode
    && editorEnabled
    && activeSurface === "inside"
    && !coverOpenAnimation
    && !spreadJumpAnimation
    && (!stickerEditor || stickerEditor.hidden);
}

function pickInlineStickerTarget(event) {
  if (!canUseInlineStickerEditing()) {
    return null;
  }
  const hit = pickScenePageHit(event);
  if (!hit?.uv || !hit.object) {
    return null;
  }
  const page = pageNumberForPickedPage(hit.object);
  const point = texturePointFromPageHit(hit);
  const placements = [...getPagePlacements(page)]
    .filter((placement) => placement.assetUrl)
    .sort((a, b) => (Number(b.z) || 0) - (Number(a.z) || 0));
  for (const placement of placements) {
    if (pointHitsPlacement(point, placement)) {
      return { placement, page, object: hit.object, point };
    }
  }
  return null;
}

function pointHitsPlacement(point, placement) {
  const bounds = placementTextureBounds(placement);
  const radians = THREE.MathUtils.degToRad(-(placement.rotation || 0));
  const dx = point.x - bounds.x;
  const dy = point.y - bounds.y;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
  return Math.abs(localX) <= bounds.width / 2 && Math.abs(localY) <= bounds.height / 2;
}

// keep in sync with styles.css `.placed-sticker { clip-path: inset(...) }` (per-genre)
const STICKER_PLACEMENT_INSET_DEFAULT = 0.05;
const STICKER_PLACEMENT_INSET_BY_GENRE = {
  "sea-album": 0.14, // 透明 padding 16-22% を相殺して bbox を一段階小さく見せる
};

function resolveStickerGenre(placement) {
  const sid = placement?.stickerId ? String(placement.stickerId) : "";
  const fromLibrary = sid && typeof stickerOptions !== "undefined"
    ? stickerOptions.find((item) => item?.id === sid)?.gameId
    : null;
  if (fromLibrary) return fromLibrary;
  if (sid.startsWith("bonus_sea_album_") || sid.startsWith("sea_album_")) return "sea-album";
  return "default";
}

function stickerPlacementInset(placement) {
  const genre = resolveStickerGenre(placement);
  return STICKER_PLACEMENT_INSET_BY_GENRE[genre] ?? STICKER_PLACEMENT_INSET_DEFAULT;
}

function placementTextureBounds(placement) {
  const scale = sanitizedPlacementScale(placement?.scale);
  const aspect = stickerAspectForPlacement(placement);
  const width = PAGE_TEXTURE_W * 0.18 * scale * 1.24;
  const height = width / Math.max(0.2, aspect);
  const shrink = 1 - 2 * stickerPlacementInset(placement);
  return {
    x: (placement.x / 100) * PAGE_TEXTURE_W,
    y: (placement.y / 100) * PAGE_TEXTURE_H,
    width: width * shrink,
    height: height * 1.24 * shrink,
  };
}

function stickerAspectForPlacement(placement) {
  const cached = placement?.assetUrl ? stickerAspectCache.get(placement.assetUrl) : null;
  if (Number.isFinite(cached) && cached > 0) {
    return cached;
  }
  if (placement?.assetUrl) {
    loadStickerImage(placement.assetUrl)
      .then((image) => {
        const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
        stickerAspectCache.set(placement.assetUrl, Math.max(0.2, aspect));
      })
      .catch(() => {});
  }
  return 1;
}

function handleInlineStickerPointerDown(event) {
  const target = pickInlineStickerTarget(event);
  if (!target) {
    return false;
  }
  event.preventDefault();
  selectInlineSticker(target);
  inlineStickerDragState = {
    pointerId: event.pointerId,
    page: target.page,
    object: target.object,
    id: target.placement.id,
    offsetX: target.point.x - (target.placement.x / 100) * PAGE_TEXTURE_W,
    offsetY: target.point.y - (target.placement.y / 100) * PAGE_TEXTURE_H,
    moved: false,
  };
  try {
    canvas.setPointerCapture?.(event.pointerId);
  } catch {}
  canvas.style.cursor = "grabbing";
  document.body.classList.add("is-inline-sticker-editing");
  return true;
}

function handleInlineStickerPointerMove(event) {
  if (!inlineStickerDragState) {
    return false;
  }
  if (event.pointerId !== inlineStickerDragState.pointerId) {
    return true;
  }
  event.preventDefault();
  const placement = getPlacementByIdOnPage(inlineStickerDragState.id, inlineStickerDragState.page);
  if (!placement) {
    return true;
  }
  const targetPage = inlineStickerDragTargetFromPointer(event);
  if (targetPage && targetPage.page !== inlineStickerDragState.page) {
    movePlacementBetweenPages(placement, inlineStickerDragState.page, targetPage.page);
    inlineStickerDragState.page = targetPage.page;
    inlineStickerDragState.object = targetPage.object;
    inlineStickerDragState.offsetX = 0;
    inlineStickerDragState.offsetY = 0;
    activeEditorPage = targetPage.page;
    selectedPlacementId = placement.id;
  }
  const point = targetPage?.object === inlineStickerDragState.object
    ? targetPage.point
    : pagePointFromPointer(event, inlineStickerDragState.object);
  if (!point) {
    return true;
  }
  placement.x = THREE.MathUtils.clamp(((point.x - inlineStickerDragState.offsetX) / PAGE_TEXTURE_W) * 100, 4, 96);
  placement.y = THREE.MathUtils.clamp(((point.y - inlineStickerDragState.offsetY) / PAGE_TEXTURE_H) * 100, 4, 96);
  inlineStickerDragState.moved = true;
  markEditorStateDirty();
  refreshInlineStickerPage();
  notifyStickerTutorialAction("moveSticker");
  return true;
}

function inlineStickerDragTargetFromPointer(event) {
  const hit = pickScenePageHit(event);
  if (!hit?.uv || (hit.object !== leftPageInner && hit.object !== rightPage)) {
    return null;
  }
  return {
    object: hit.object,
    page: pageNumberForPickedPage(hit.object),
    point: texturePointFromPageHit(hit),
  };
}

function movePlacementBetweenPages(placement, fromPage, toPage) {
  if (!placement || fromPage === toPage) {
    return;
  }
  const fromPlacements = getPagePlacements(fromPage);
  const toPlacements = getPagePlacements(toPage);
  const index = fromPlacements.findIndex((item) => item.id === placement.id);
  if (index >= 0) {
    fromPlacements.splice(index, 1);
  }
  if (!toPlacements.some((item) => item.id === placement.id)) {
    placement.z = nextPlacementZ(toPlacements);
    toPlacements.push(placement);
  }
}

function pagePointFromPointer(event, mesh) {
  const hit = pickScenePageHit(event);
  if (hit?.uv && hit.object === mesh) {
    return texturePointFromPageHit(hit);
  }
  const rect = projectedMeshClientRect(mesh);
  if (!rect?.width || !rect.height) {
    return null;
  }
  return {
    x: THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * PAGE_TEXTURE_W, 0, PAGE_TEXTURE_W),
    y: THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * PAGE_TEXTURE_H, 0, PAGE_TEXTURE_H),
  };
}

function endInlineStickerDrag(event) {
  if (!inlineStickerDragState) {
    return;
  }
  if (event?.pointerId != null && event.pointerId !== inlineStickerDragState.pointerId) {
    return;
  }
  const moved = inlineStickerDragState.moved;
  cleanupInlineStickerDrag();
  if (moved) {
    suppressInlineStickerClick = true;
    window.setTimeout(() => {
      suppressInlineStickerClick = false;
    }, 120);
  }
  flushEditorStateSave();
}

function cancelInlineStickerDrag(event) {
  if (!inlineStickerDragState) {
    return;
  }
  if (event?.pointerId != null && event.pointerId !== inlineStickerDragState.pointerId) {
    return;
  }
  cleanupInlineStickerDrag();
}

function cleanupInlineStickerDrag() {
  try {
    if (canvas.hasPointerCapture?.(inlineStickerDragState.pointerId)) {
      canvas.releasePointerCapture(inlineStickerDragState.pointerId);
    }
  } catch {}
  inlineStickerDragState = null;
  document.body.classList.remove("is-inline-sticker-editing");
  canvas.style.cursor = "";
}

function selectInlineSticker(target) {
  activeEditorPage = target.page;
  selectedPlacementId = target.placement.id;
  updateInlineStickerControls();
  refreshInlineStickerPage();
  notifyStickerTutorialAction("selectSticker");
}

function refreshInlineStickerPage() {
  if (stickerEditor && !stickerEditor.hidden) {
    return;
  }
  refreshPageTemplateTextures();
  updatePage(flipProgress);
  updateInlineStickerControls(false);
}

function clearInlineStickerSelection() {
  selectedPlacementId = null;
  updateInlineStickerControls();
  refreshPageTemplateTextures();
  updatePage(flipProgress);
}

function updateInlineStickerControls(syncInputs = true) {
  const placement = getSelectedPlacement();
  const visible = canUseInlineStickerEditing()
    && Boolean(placement)
    && !shouldSuppressInlineStickerControlsForTutorial();
  if (inlineStickerControls) {
    inlineStickerControls.hidden = !visible;
  }
  document.body.classList.toggle("is-inline-sticker-panel-open", visible);
  if (visible) {
    setStickerTrayPeek(false);
  }
  if (!visible) {
    return;
  }
  if (syncInputs) {
    if (inlineStickerScale) {
      inlineStickerScale.value = String(placement.scale);
    }
    if (inlineStickerRotation) {
      inlineStickerRotation.value = String(placement.rotation || 0);
    }
  }
}

function shouldSuppressInlineStickerControlsForTutorial() {
  if (!stickerTutorialState || stickerTutorial?.hidden) {
    return false;
  }
  const stepId = currentStickerTutorialStep()?.id;
  return stepId === "place" || stepId === "move";
}

function pickEditablePage(event) {
  if (
    activeAlbumMode === "collection"
    || !stickerEditMode
    || !editorEnabled
    || activeSurface !== "inside"
    || !stickerEditor
    || !stickerEditor.hidden
  ) {
    return null;
  }
  return pickScenePageHit(event)?.object || null;
}

function pickScenePageHit(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pageRaycaster.setFromCamera(pointerNdc, camera);
  return pageRaycaster.intersectObjects([rightPage, leftPageInner], false)[0] || null;
}

function texturePointFromPageHit(hit) {
  return {
    x: hit.uv.x * PAGE_TEXTURE_W,
    y: (1 - hit.uv.y) * PAGE_TEXTURE_H,
  };
}

function pickZukanTextTuningTarget(event) {
  if (
    !tuningEnabled
    || activeAlbumMode !== "collection"
    || activeSurface !== "inside"
    || coverOpenAnimation
    || spreadJumpAnimation
    || (pageTurn.visible && flipProgress > 0.001)
  ) {
    return null;
  }
  const hit = pickScenePageHit(event);
  if (!hit?.uv || !hit.object) {
    return null;
  }
  const pageNumber = pageNumberForPickedPage(hit.object);
  if (hit.object === rightPage && pageNumber === activeBookPage) {
    return null;
  }
  const pageDef = collectionPageDefinitions[pageNumber - 1] || null;
  const subjects = collectionStickersForPageDefinition(pageDef);
  const point = texturePointFromPageHit(hit);
  const side = hit.object === rightPage ? "right" : "left";
  const targets = zukanTextTuningTargetsForPage(pageDef, subjects, pageNumber, side)
    .sort((a, b) => (a.width * a.height) - (b.width * b.height));
  const target = targets.find((item) => (
    point.x >= item.x
    && point.x <= item.x + item.width
    && point.y >= item.y
    && point.y <= item.y + item.height
  ));
  return target ? { ...target, object: hit.object, textureX: point.x, textureY: point.y } : null;
}

function pickCollectionZukanTarget(event) {
  if (
    tuningEnabled ||
    activeAlbumMode !== "collection"
    || activeSurface !== "inside"
    || coverOpenAnimation
    || spreadJumpAnimation
    || (pageTurn.visible && flipProgress > 0.001)
    || !stickerEditor
    || !stickerEditor.hidden
  ) {
    return null;
  }
  const hit = pickScenePageHit(event);
  if (!hit?.uv || !hit.object) {
    return null;
  }
  const pageNumber = pageNumberForPickedPage(hit.object);
  if (hit.object === rightPage && pageNumber === activeBookPage) {
    return null;
  }
  const pageDef = collectionPageDefinitions[pageNumber - 1] || null;
  const side = hit.object === rightPage ? "right" : "left";
  if (zukanTemplateTypeForSide(pageDef, side) !== "index") {
    return null;
  }
  const x = hit.uv.x * PAGE_TEXTURE_W;
  const y = (1 - hit.uv.y) * PAGE_TEXTURE_H;
  const subjects = collectionStickersForPageDefinition(pageDef);
  const layout = collectionZukanIndexLayout(subjects.length, side);
  for (let index = 0; index < subjects.length; index += 1) {
    const rect = collectionZukanIndexCellRect(index, layout);
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
      return collectionZukanIndexTargetForSubject(pageDef, subjects[index].id);
    }
  }
  return null;
}

function setupBookPageControls() {
  bookPrevPage?.addEventListener("click", () => {
    if (activeSurface === "inside" && activeBookPage <= 1) {
      setBookSurface("cover", activeBookPage);
      notifyStickerTutorialAction("pageTurn");
      return;
    }
    setBookPage(activeBookPage - 2, { turnMode: "single" });
    notifyStickerTutorialAction("pageTurn");
  });
  bookNextPage?.addEventListener("click", () => {
    if (activeSurface === "cover") {
      setBookSurface("inside", 1);
      notifyStickerTutorialAction("pageTurn");
      return;
    }
    setBookPage(activeBookPage + 2, { turnMode: "single" });
    notifyStickerTutorialAction("pageTurn");
  });
  bookPageLabel?.addEventListener("click", () => toggleBookPageJump());
  document.addEventListener("pointerdown", (event) => {
    if (bookPageJump?.hidden) {
      return;
    }
    if (bookPageControls?.contains(event.target)) {
      return;
    }
    closeBookPageJump();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBookPageJump();
    }
  });
}

function setupBookSwipeNavigation() {
  if (!canvas) {
    return;
  }
  canvas.addEventListener("pointerdown", handleBookSwipePointerDown);
  canvas.addEventListener("pointerup", handleBookSwipePointerUp);
  canvas.addEventListener("pointercancel", cancelBookSwipe);
  canvas.addEventListener("pointerleave", (event) => {
    if (bookSwipeState?.pointerId === event.pointerId) {
      cancelBookSwipe(event);
    }
  });
}

function canStartBookSwipe(event) {
  if (event.target !== canvas) {
    return "target";
  }
  if (event.isPrimary === false) {
    return "secondary";
  }
  if (event.button !== 0) {
    return "button";
  }
  if (tuningEnabled) {
    return "tuning";
  }
  if (coverOpenAnimation) {
    return "cover-open";
  }
  if (spreadJumpAnimation) {
    return "spread-jump";
  }
  if (pageTurn.visible && flipProgress > 0.001) {
    return "page-turn";
  }
  if (zukanTuningDragState) {
    return "zukan-drag";
  }
  if (inlineStickerDragState || pickInlineStickerTarget(event)) {
    return "inline-sticker";
  }
  if (stickerTrayDragState) {
    return "sticker-tray-drag";
  }
  if (stickerDragState) {
    return "sticker-drag";
  }
  if (drawingPointerState) {
    return "drawing";
  }
  if (stickerEditor && !stickerEditor.hidden) {
    return "editor";
  }
  return "";
}

function handleBookSwipePointerDown(event) {
  const blockReason = canStartBookSwipe(event);
  if (blockReason) {
    lastBookSwipeDebug = { stage: "blocked", reason: blockReason, x: event.clientX, y: event.clientY };
    return;
  }
  bookSwipeState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startTime: performance.now(),
  };
  lastBookSwipeDebug = { stage: "start", x: event.clientX, y: event.clientY };
  setCanvasPointerCapture(event.pointerId);
}

function handleBookSwipePointerUp(event) {
  if (!bookSwipeState || event.pointerId !== bookSwipeState.pointerId) {
    return;
  }
  const swipe = bookSwipeState;
  bookSwipeState = null;
  releaseCanvasPointerCapture(event.pointerId);

  const dx = event.clientX - swipe.startX;
  const dy = event.clientY - swipe.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const elapsed = performance.now() - swipe.startTime;
  const isPageSwipe = (
    absX >= BOOK_SWIPE_MIN_DISTANCE
    && absY <= absX * BOOK_SWIPE_MAX_VERTICAL_RATIO
    && elapsed <= BOOK_SWIPE_MAX_DURATION_MS
  );
  lastBookSwipeDebug = { stage: "end", dx, dy, elapsed, isPageSwipe };
  if (!isPageSwipe) {
    return;
  }

  event.preventDefault();
  suppressSceneClickAfterSwipe = true;
  window.setTimeout(() => {
    suppressSceneClickAfterSwipe = false;
  }, 1400);
  navigateBookBySwipe(dx < 0 ? 1 : -1);
}

function cancelBookSwipe(event) {
  if (!bookSwipeState) {
    return;
  }
  if (event && event.pointerId !== bookSwipeState.pointerId) {
    return;
  }
  releaseCanvasPointerCapture(bookSwipeState.pointerId);
  bookSwipeState = null;
}

function setCanvasPointerCapture(pointerId) {
  try {
    canvas.setPointerCapture?.(pointerId);
  } catch {
    // Synthetic touch tests can lack an active browser pointer; swipe math still works without capture.
  }
}

function releaseCanvasPointerCapture(pointerId) {
  try {
    canvas.releasePointerCapture?.(pointerId);
  } catch {
    // Ignore missing capture for synthetic or already-finished pointer streams.
  }
}

function navigateBookBySwipe(direction) {
  closeBookPageJump();
  if (direction > 0) {
    if (activeSurface === "cover") {
      setBookSurface("inside", 1);
      return;
    }
    const lastSpreadStart = spreadStartForPage(editorPageCount());
    if (activeBookPage < lastSpreadStart) {
      setBookPage(activeBookPage + 2, { turnMode: "single" });
    }
    return;
  }

  if (activeSurface === "cover") {
    return;
  }
  if (activeBookPage <= 1) {
    setBookSurface("cover", activeBookPage);
    return;
  }
  setBookPage(activeBookPage - 2, { turnMode: "single" });
}

function syncTopSettingsButton() {
  const settingsOpen = Boolean(zukanSettingsPanel && !zukanSettingsPanel.hidden);
  const themeOpen = Boolean(bookThemePanel && !bookThemePanel.hidden);
  topSettingsButton?.setAttribute(
    "aria-pressed",
    settingsOpen ? "true" : "false",
  );
  topThemeButton?.setAttribute("aria-pressed", themeOpen ? "true" : "false");
}

function setupZukanSettingsPanel() {
  refreshZukanSettingsControls();
  zukanSettingsClose?.addEventListener("click", () => closeZukanSettingsPanel());
  bookThemeClose?.addEventListener("click", () => closeBookThemePanel());
  settingsBackButton?.addEventListener("click", () => navigateBackToPlay());
  settingsTutorialButton?.addEventListener("click", () => {
    closeZukanSettingsPanel();
    // v1650: チュートリアル中に 「あそびかた」 が押されたら二重起動を避けるため
    // 一度 finishStickerTutorial で内部 state / timer / class を完全クリーンアップ
    // (markSeen:false で 「みた」 を立てない) してから restart する。
    const tutorialActive = document.body.classList.contains(
      "is-sticker-tutorial-active",
    );
    if (tutorialActive) {
      try {
        finishStickerTutorial({ markSeen: false });
      } catch (_) {}
    }
    startStickerTutorial({ manual: true });
  });
  for (const button of stickerModeButtons) {
    button.addEventListener("click", () => {
      setStickerEditMode(button.dataset.stickerEditMode === "edit", { openInside: true });
      closeZukanSettingsPanel();
    });
  }
  for (const button of zukanSettingsButtons) {
    button.addEventListener("click", () => {
      const side = button.dataset.zukanSide === "right" ? "right" : "left";
      const type = normalizeZukanTemplateType(button.dataset.zukanType);
      saveZukanSideTemplateSettings({
        ...zukanSideTemplateSettings,
        [side]: type,
      });
    });
  }
  zukanTuneButton?.addEventListener("click", () => openZukanTuningMode());
  document.addEventListener("pointerdown", (event) => {
    if (zukanSettingsPanel && !zukanSettingsPanel.hidden) {
      if (!zukanSettingsPanel.contains(event.target) && !topSettingsButton?.contains(event.target)) {
        closeZukanSettingsPanel();
      }
    }
    if (bookThemePanel && !bookThemePanel.hidden) {
      if (!bookThemePanel.contains(event.target) && !topThemeButton?.contains(event.target)) {
        closeBookThemePanel();
      }
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeZukanSettingsPanel();
      closeBookThemePanel();
    }
  });
}

function setupStickerTutorial() {
  stickerTutorialStartSkip?.addEventListener("click", () => finishStickerTutorial({ markSeen: true }));
  stickerTutorialStartButton?.addEventListener("click", () => beginStickerTutorialSteps());
  stickerTutorialSkip?.addEventListener("click", () => finishStickerTutorial({ markSeen: true }));
  stickerTutorialReplay?.addEventListener("click", () => {
    // v1637: complete 状態でも push → demo phase に戻して再演示。 actionDone をリセットしないと
    // 「もういちど」 押下後すぐに try に入っても advanceOn 判定が「既に正解済」 で弾かれる。
    const step = currentStickerTutorialStep();
    if (!step || !stickerTutorialState) {
      return;
    }
    stopStickerTutorialStepDemo();
    setStickerTutorialPhase("demo");
    stickerTutorialState.actionDone = false;
    stickerTutorialState.failCount = 0;
    stickerTutorialState.skipShown = false;
    hideStickerTutorialStepSkipButton();
    if (stickerTutorialNext) {
      stickerTutorialNext.classList.remove("is-ready-pulse");
    }
    stickerTutorialState.stepStartedAt = performance.now();
    if (stickerTutorialText) {
      stickerTutorialText.textContent = step.textDemo || step.text || "";
    }
    updateStickerTutorialNextAvailability(step);
    startStickerTutorialStepDemo(step);
    playStickerTutorialAudio(step);
  });
  stickerTutorialStepSkip?.addEventListener("click", () => {
    // v1637: 「とばす」 → 次 step へ。 markSeen は触らない (チュートリアル全体は続行)。
    if (!stickerTutorialState) {
      return;
    }
    const step = currentStickerTutorialStep();
    if (step?.finish) {
      finishStickerTutorial({ markSeen: true });
      return;
    }
    showStickerTutorialStep(stickerTutorialState.index + 1);
  });
  stickerTutorialNext?.addEventListener("click", () => {
    if (!stickerTutorialState) {
      return;
    }
    const step = currentStickerTutorialStep();
    if (stickerTutorialRemainingStepMs(step) > 80) {
      updateStickerTutorialNextAvailability(step);
      return;
    }
    if (step?.finish) {
      finishStickerTutorial({ markSeen: true });
      return;
    }
    showStickerTutorialStep(stickerTutorialState.index + 1);
  });
  document.addEventListener("keydown", (event) => {
    if (!stickerTutorialState) {
      return;
    }
    if (event.key === "Escape") {
      finishStickerTutorial({ markSeen: true });
    }
  });
  document.addEventListener("pointerdown", retryBlockedStickerTutorialAudio, { capture: true });
  window.__startStickerBookTutorial = () => startStickerTutorial({ manual: true });
}

function maybeStartStickerTutorial() {
  if (stickerTutorialAutoStartChecked) {
    return;
  }
  stickerTutorialAutoStartChecked = true;
  if (params.get("tutorial") === "0") {
    return;
  }
  const forced = params.get("tutorial") === "1";
  if (!forced && hasSeenStickerTutorial()) {
    return;
  }
  window.setTimeout(() => {
    startStickerTutorial({ manual: forced });
  }, forced ? 320 : 900);
}

function startStickerTutorial(options = {}) {
  if (!stickerTutorial || !STICKER_TUTORIAL_STEPS.length) {
    return;
  }
  // 起動した瞬間に seen 確定 (放置 → 再訪での自動再生 防止)。
  // 「おわる」 押下時の markStickerTutorialSeen は冪等なので二重呼びでも問題なし。
  markStickerTutorialSeen();
  closeZukanSettingsPanel();
  closeBookThemePanel();
  if (activeAlbumMode === "collection") {
    setAlbumMode("free");
  }
  flushEditorStateSave();
  stickerTutorialState = {
    index: 0,
    manual: Boolean(options.manual),
    actionDone: false,
    intro: true,
    editorSnapshot: null,
    phase: "demo",        // v1637: "demo" | "try" | "complete"
    failCount: 0,         // v1637: try 中の誤操作カウンタ (step 切替で 0 リセット)
    skipShown: false,     // v1637: 「とばす」 ボタン visible 化済みフラグ
    completeStartedAt: 0, // v1643: complete phase 開始時刻 (place min-hold gate 用)
    praiseShown: false,   // v1646: TRY 成功 → complete 時の褒め言葉差し替え多重発火防止
    coverFadeTimer: 0,    // v1675: is-await-cover-open 2000ms fail-safe timer id
  };
  enterStickerTutorialCleanAlbum();
  stickerTutorial.hidden = false;
  document.body.classList.add("is-sticker-tutorial-active");
  showStickerTutorialIntro();
}

function finishStickerTutorial(options = {}) {
  if (!stickerTutorialState && stickerTutorial?.hidden) {
    return;
  }
  // v1637: try タイムアウト + skip ボタンを必ず片付ける (phase class も後段 classList.remove で除去)。
  clearStickerTutorialTryTimeout();
  // v1675 (task 1, fail-safe leak prevention): 2000ms cover-fade fail-safe timer もここで必ずクリア。
  if (stickerTutorialState?.coverFadeTimer) {
    clearTimeout(stickerTutorialState.coverFadeTimer);
    stickerTutorialState.coverFadeTimer = 0;
  }
  hideStickerTutorialStepSkipButton();
  stopStickerTutorialAudio();
  stopStickerTutorialStepDemo();
  restoreStickerTutorialCleanAlbum();
  stickerTutorialState = null;
  if (stickerTutorial) {
    stickerTutorial.hidden = true;
  }
  if (stickerTutorialStart) {
    stickerTutorialStart.hidden = true;
  }
  if (stickerTutorialCard) {
    stickerTutorialCard.hidden = true;
  }
  if (stickerTutorialSpotlight) {
    stickerTutorialSpotlight.hidden = true;
  }
  if (stickerTutorialHand) {
    stickerTutorialHand.hidden = true;
  }
  if (stickerTutorialGhost) {
    stickerTutorialGhost.hidden = true;
  }
  document.body.classList.remove(
    "is-sticker-tutorial-active",
    "is-sticker-tutorial-card-top",
    "is-sticker-tutorial-card-corner",
    "is-sticker-tutorial-intro",
    "is-sticker-tutorial-linked-scroll",
    "is-sticker-tutorial-tray-silhouette",
    "is-sticker-tutorial-phase-demo",
    "is-sticker-tutorial-phase-try",
    "is-sticker-tutorial-phase-complete",
  );
  updateStickerTutorialTraySilhouettes(false);
  updateRaritySuperSilhouettes(false);
  removeStickerTutorialStepClasses();
  setStickerTrayPeek(false);
  if (options.markSeen !== false) {
    markStickerTutorialSeen();
  }
}

function enterStickerTutorialCleanAlbum() {
  if (!stickerTutorialState || stickerTutorialState.editorSnapshot) {
    return;
  }
  stickerTutorialState.editorSnapshot = {
    pages: cloneStickerTutorialEditorData(editorState.pages),
    drawings: cloneStickerTutorialEditorData(editorState.drawings),
    selectedPlacementId,
    activeEditorPage,
  };
  editorState.pages = {};
  editorState.drawings = {};
  selectedPlacementId = null;
  activeEditorPage = activeBookPage;
  updateInlineStickerControls();
  refreshPageTemplateTextures();
  updatePage(flipProgress);
}

function restoreStickerTutorialCleanAlbum() {
  const snapshot = stickerTutorialState?.editorSnapshot;
  if (!snapshot) {
    return;
  }
  editorState.pages = cloneStickerTutorialEditorData(snapshot.pages);
  editorState.drawings = cloneStickerTutorialEditorData(snapshot.drawings);
  selectedPlacementId = snapshot.selectedPlacementId || null;
  activeEditorPage = Number(snapshot.activeEditorPage) || activeBookPage || 1;
  if (editorStateSaveTimer) {
    window.clearTimeout(editorStateSaveTimer);
    editorStateSaveTimer = 0;
  }
  editorStateDirty = false;
  updateInlineStickerControls();
  refreshPageTemplateTextures();
  updatePage(flipProgress);
}

function cloneStickerTutorialEditorData(value) {
  try {
    return JSON.parse(JSON.stringify(value && typeof value === "object" ? value : {}));
  } catch {
    return {};
  }
}

function showStickerTutorialIntro() {
  if (!stickerTutorialState) {
    return;
  }
  stopStickerTutorialAudio();
  stopStickerTutorialStepDemo();
  stickerTutorialState.intro = true;
  if (stickerTutorialStart) {
    stickerTutorialStart.hidden = false;
  }
  if (stickerTutorialCard) {
    stickerTutorialCard.hidden = true;
  }
  if (stickerTutorialSpotlight) {
    stickerTutorialSpotlight.hidden = true;
  }
  if (stickerTutorialHand) {
    stickerTutorialHand.hidden = true;
  }
  if (stickerTutorialGhost) {
    stickerTutorialGhost.hidden = true;
  }
  document.body.classList.add("is-sticker-tutorial-intro");
  document.body.classList.remove(
    "is-sticker-tutorial-card-top",
    "is-sticker-tutorial-card-corner",
    "is-sticker-tutorial-linked-scroll",
    "is-sticker-tutorial-tray-silhouette",
  );
  updateStickerTutorialTraySilhouettes(false);
  updateRaritySuperSilhouettes(false);
  removeStickerTutorialStepClasses();
}

function beginStickerTutorialSteps() {
  if (!stickerTutorialState) {
    return;
  }
  stickerTutorialState.intro = false;
  updateStickerTutorialTraySilhouettes(true, false);
  updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  showStickerTutorialStep(0, { replayAudio: true });
}

function currentStickerTutorialStep() {
  if (!stickerTutorialState) {
    return null;
  }
  return STICKER_TUTORIAL_STEPS[stickerTutorialState.index] || null;
}

function showStickerTutorialStep(index, options = {}) {
  if (!stickerTutorialState) {
    return;
  }
  stopStickerTutorialStepDemo();
  updateStickerTutorialTraySilhouettes(true, false);
  updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  if (stickerTutorialStart) {
    stickerTutorialStart.hidden = true;
  }
  if (stickerTutorialCard) {
    stickerTutorialCard.hidden = false;
    // v1675 (task 1, iPad stuck fix): cover-open swing **open 方向進行中** に限り潜伏。
    // 旧: `coverOpenAnimation || activeSurface !== "inside"` だと intro step (setBookSurface 未呼び/
    // activeSurface === "cover" のまま) で永久に opacity:0 + pointer-events:none となり、
    // iOS Safari は親 opacity:0 のヒットテストを skip するため「つぎ」 が押せない致命バグ。
    // 修正: open swing が実際に動いている step (mode/place/move/scale/rotate/ok 経路) のみ潜伏。
    // intro / view / final / corner 系は最初から可視。
    const needsCoverOpenWait =
      coverOpenAnimation && coverOpenAnimation.direction !== "close";
    if (needsCoverOpenWait) {
      stickerTutorialCard.classList.add("is-await-cover-open");
    } else {
      stickerTutorialCard.classList.remove("is-await-cover-open");
    }
  }
  // v1628: spotlight の visible 化を「位置確定後」 に遅延 (下記 updateStickerTutorialLayout 直後)。
  // 旧仕様は hidden=false → rAF 内で layout 更新 の順だったため、 前 step の CSS 変数 (--tutorial-x/y/w/h)
  // が残った状態で 1 フレームだけ描画され、 ok → page 遷移で「黄枠が一瞬下 (OK ボタン位置) にずれる」 視覚バグが発生していた。
  // 解決: hidden 状態のまま prepare + 同期 layout で正しい rect を CSS 変数に書き込み → 初めて hidden=false。
  if (stickerTutorialHand) {
    stickerTutorialHand.hidden = false;
  }
  document.body.classList.remove("is-sticker-tutorial-intro");
  const clampedIndex = THREE.MathUtils.clamp(Math.round(index), 0, STICKER_TUTORIAL_STEPS.length - 1);
  stickerTutorialState.index = clampedIndex;
  stickerTutorialState.actionDone = false;
  stickerTutorialState.intro = false;
  stickerTutorialState.stepStartedAt = performance.now();
  // v1637: step 切替時は必ず failCount / skipShown を 0 リセット (累積で skip が早く出すぎる事故防止)。
  stickerTutorialState.failCount = 0;
  stickerTutorialState.skipShown = false;
  // v1643: 前 step の complete 開始時刻もリセット (place min-hold gate が次 step に持ち越されないように)。
  stickerTutorialState.completeStartedAt = 0;
  hideStickerTutorialStepSkipButton();
  setStickerTutorialPhase("demo");
  const step = currentStickerTutorialStep();
  if (!step) {
    finishStickerTutorial({ markSeen: true });
    return;
  }
  prepareStickerTutorialStep(step);
  // mode step は prepareStickerTutorialStep() 内で cover open を開始するため、
  // 判定をここでも行い、表紙が完全に静止するまで左ページ直書きテキストを出さない。
  if (stickerTutorialCard && coverOpenAnimation && coverOpenAnimation.direction !== "close") {
    stickerTutorialCard.classList.add("is-await-cover-open");
  }
  if (stickerTutorialText) {
    // v1637: phase=demo 開始時は必ず textDemo を表示 (旧 step.text フォールバック維持)。
    stickerTutorialText.textContent = step.textDemo || step.text || "";
  }
  if (stickerTutorialCount) {
    stickerTutorialCount.textContent = `${clampedIndex + 1} / ${STICKER_TUTORIAL_STEPS.length}`;
  }
  if (stickerTutorialNext) {
    stickerTutorialNext.textContent = step.finish ? "おわる" : "つぎ";
    stickerTutorialNext.classList.remove("is-ready-pulse");
  }
  updateStickerTutorialNextAvailability(step);
  document.body.classList.toggle("is-sticker-tutorial-card-top", step.card === "top");
  document.body.classList.toggle("is-sticker-tutorial-card-corner", step.card === "corner");
  removeStickerTutorialStepClasses();
  document.body.classList.add(`is-sticker-tutorial-step-${step.id}`);
  // v1628: 同期で layout 1 回実行 → CSS 変数を新 step rect に確定させてから spotlight を visible 化。
  // updateStickerTutorialLayout は stickerTutorial.hidden が true でも CSS 変数を書き込む実装 (現在 hidden は
  // tutorial 全体 root の hidden で、 各 step では false 状態を維持) なので問題なく動作する。
  // 注: hidden=true ガードは stickerTutorial 全体 (root) を見ているが、 currentStickerTutorialStep が null だと
  // 早期 return するため安全。 ここでは step を取れた直後なので OK。
  updateStickerTutorialLayout();
  // v1629: 強制 reflow を挟み cascaded style を flush。 updateStickerTutorialLayout で書いた CSS 変数 (親 + spotlight 自身)
  // が確実に computed style に反映された状態で hidden=false → first paint で新 step rect を必ず使う。
  // iOS Safari の inherited var cascade 遅延への保険 (spotlight 自身への inline 複写 + reflow + 後 hidden=false の三重防護)。
  if (stickerTutorialSpotlight) {
    void stickerTutorialSpotlight.offsetWidth;
    stickerTutorialSpotlight.hidden = false;
  }
  // 後続: DOM 変化 (setStickerEditMode 等で sticker 描画が一拍遅延するケース) に追従するための保険を残す。
  scheduleStickerTutorialLayout();
  window.setTimeout(scheduleStickerTutorialLayout, 180);
  window.setTimeout(scheduleStickerTutorialLayout, 720);
  startStickerTutorialStepDemo(step);
  // v1675 (task 1, fail-safe): 何らかの理由で updateCoverOpen の open 完了ブランチが走らず
  // is-await-cover-open が残っても、 2000ms 上限で必ず外す。 stuck の最終防護。
  if (stickerTutorialState.coverFadeTimer) {
    clearTimeout(stickerTutorialState.coverFadeTimer);
    stickerTutorialState.coverFadeTimer = 0;
  }
  stickerTutorialState.coverFadeTimer = window.setTimeout(() => {
    stickerTutorialCard?.classList.remove("is-await-cover-open");
    stickerTutorialState.coverFadeTimer = 0;
  }, 2600);
  if (options.replayAudio !== false) {
    playStickerTutorialAudio(step);
  }
}

function prepareStickerTutorialStep(step) {
  if (!step) {
    return;
  }
  updateStickerTutorialTraySilhouettes(true, step.id === "place");
  updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  closeBookPageJump();
  if (activeAlbumMode === "collection") {
    setAlbumMode("free");
  }
  if (step.id === "mode") {
    if (activeSurface === "cover") {
      setBookSurface("inside", activeBookPage || 1);
    }
    if (stickerEditMode) {
      setStickerEditMode(false);
    }
    selectedPlacementId = null;
    updateInlineStickerControls();
    setStickerTrayPeek(false);
  }
  if (["place", "move", "scale", "rotate", "ok"].includes(step.id)) {
    if (!stickerEditMode) {
      setStickerEditMode(true, { openInside: true });
    } else if (activeSurface === "cover") {
      setBookSurface("inside", activeBookPage || 1);
    }
    window.setTimeout(() => setStickerTrayPeek(true), 60);
  }
  if (["move", "scale", "rotate", "ok"].includes(step.id)) {
    window.setTimeout(ensureStickerTutorialEditableSticker, 180);
  }
  if (step.id === "view") {
    selectedPlacementId = null;
    updateInlineStickerControls();
  }
}

function releaseStickerTutorialCardAfterCoverOpen() {
  if (!stickerTutorialCard?.classList.contains("is-await-cover-open")) {
    return;
  }
  const state = stickerTutorialState;
  requestAnimationFrame(() => {
    if (!state || stickerTutorialState !== state) {
      return;
    }
    scheduleStickerTutorialLayout();
    requestAnimationFrame(() => {
      if (stickerTutorialState !== state) {
        return;
      }
      updateStickerTutorialLayout();
      window.setTimeout(() => {
        if (stickerTutorialState !== state) {
          return;
        }
        stickerTutorialCard?.classList.remove("is-await-cover-open");
        if (stickerTutorialState?.coverFadeTimer) {
          clearTimeout(stickerTutorialState.coverFadeTimer);
          stickerTutorialState.coverFadeTimer = 0;
        }
      }, 120);
    });
  });
}

function ensureStickerTutorialEditableSticker() {
  if (!stickerTutorialState || activeAlbumMode === "collection") {
    return null;
  }
  if (activeSurface === "cover") {
    setBookSurface("inside", activeBookPage || 1);
    return null;
  }
  const current = getSelectedPlacement();
  if (current) {
    updateInlineStickerControls();
    return current;
  }
  const pages = [activeBookPage, rightBookPageNumber()].filter((page) => page >= 1 && page <= editorPageCount());
  for (const page of pages) {
    const placement = getPagePlacements(page).find((item) => item?.assetUrl);
    if (placement) {
      activeEditorPage = page;
      selectedPlacementId = placement.id;
      updateInlineStickerControls();
      refreshInlineStickerPage();
      return placement;
    }
  }
  // v1640 (task 4): fallback も ✓ (stickerOptions[0] = quizland_good_stamp) ではなく
  // チュートリアル正本シール (蝶々 or grant pasteId) を貼る。 ensureStickerTutorialEditableSticker
  // は move/scale/rotate/ok step で「画面上に編集対象が無い時の最後の保険」 として呼ばれるため、
  // 「貼ったのは ✓ なのに画面では蝶々のお話」 という素材ズレを根本回避。
  const sticker = stickerTutorialPickSticker("try") || stickerOptions[0];
  if (!sticker) {
    return null;
  }
  const page = pages[1] || pages[0] || 1;
  addStickerFromTrayToPage(sticker.id, page, { x: 54, y: 42 });
  return getSelectedPlacement();
}

function startStickerTutorialStepDemo(step) {
  if (!step) {
    return;
  }
  if (step.id === "mode") {
    startStickerTutorialModeDemo();
    return;
  }
  if (step.id === "place") {
    startStickerTutorialPlaceDemo();
    return;
  }
  if (step.id === "move") {
    startStickerTutorialMoveDemo();
    return;
  }
  if (step.id === "scale") {
    startStickerTutorialScaleDemo();
    return;
  }
  if (step.id === "rotate") {
    startStickerTutorialRotateDemo();
    return;
  }
  if (step.id === "ok") {
    startStickerTutorialOkDemo();
    return;
  }
  if (step.id === "page") {
    startStickerTutorialPageDemo();
    return;
  }
  if (step.id === "view") {
    startStickerTutorialViewDemo();
  }
}

function startStickerTutorialModeDemo() {
  // v1637: 操作型化 — 自動 press は 1 回のみ「演示」 し、 最後に setPhase("try") で子供にバトンタッチ。
  // 旧 3 連 press (絶対 2400/3850/5250ms) は削除。 演示後 はるモードに入った状態のまま try フェーズに移行する
  // (place step が editMode 前提のため、 視覚状態は保持)。
  const startStep = currentStickerTutorialStep();
  document.body.classList.add("is-sticker-tutorial-mode-demo");
  document.body.classList.add("is-sticker-tutorial-mode-rest");
  // Phase 1 (1100-2000ms): rest → editButton から手前へ approach (open のまま)
  addStickerTutorialDemoTimer(() => {
    document.body.classList.remove("is-sticker-tutorial-mode-rest");
    document.body.classList.add("is-sticker-tutorial-mode-approach");
  }, 1100);
  // Phase 2 (2000ms): point に切替 + press keyframe 開始
  addStickerTutorialDemoTimer(() => {
    setStickerTutorialHandKey("point");
    document.body.classList.remove("is-sticker-tutorial-mode-approach");
    document.body.classList.add("is-sticker-tutorial-mode-press");
  }, 2000);
  // Phase 3 (2400ms): 1 回だけ press して「ここを押すと変わる」 ことを見せる (notify は飛ばさない)。
  // press 後は state を元に戻すため、 すぐに exit (notify false) を 1 回叩いて初期 (= みるモード) に復帰させる。
  addStickerTutorialDemoTimer(() => {
    setStickerTutorialHandKey("point");
    triggerStickerTutorialEditButtonPress({ targetMode: true, notify: false });
  }, 2400);
  // Phase 4 (3850ms): demo 完了 → みるモード に戻して (notify false)、 setPhase("try") で子供に渡す。
  addStickerTutorialDemoTimer(() => {
    setStickerTutorialHandKey("point");
    triggerStickerTutorialEditButtonPress({ targetMode: false, notify: false });
  }, 3850);
  // Phase 5 (5250ms): try フェーズ移行。
  addStickerTutorialDemoTimer(() => {
    finishStickerTutorialDemoToTry(startStep);
  }, 5250);
}

// v1637: demo 完了時に try フェーズへ遷移する共通 helper (intro / final は textTry が無いので complete へ直行)。
// v1643: expectedStep ガードで stale timer 防止 (前 step の setTimeout が次 step に遷移後に発火しても無視)。
function finishStickerTutorialDemoToTry(expectedStep = null) {
  const step = currentStickerTutorialStep();
  if (!stickerTutorialState || !step) {
    return;
  }
  if (expectedStep && expectedStep !== step) {
    // 次 step に遷移済 → 前 step の stale timer なので無視
    return;
  }
  if (stickerTutorialState.phase !== "demo") {
    return;
  }
  if (step.finish || !step.textTry) {
    setStickerTutorialPhase("complete");
    return;
  }
  setStickerTutorialPhase("try");
}

function triggerStickerTutorialEditButtonPress(options = {}) {
  if (!topEditButton) {
    if (typeof options.targetMode === "boolean") {
      setStickerEditMode(options.targetMode, { openInside: true });
    }
    if (options.notify !== false && options.targetMode === true) {
      notifyStickerTutorialAction("enterEdit");
    } else if (options.notify !== false && options.targetMode === false) {
      notifyStickerTutorialAction("exitEdit");
    }
    return;
  }
  topEditButton.classList.add("is-tutorial-pressing");
  addStickerTutorialDemoTimer(() => {
    const shouldClick = typeof options.targetMode !== "boolean" || stickerEditMode !== options.targetMode;
    if (shouldClick) {
      stickerTutorialSuppressModeNotify = options.notify === false;
      topEditButton.click();
      stickerTutorialSuppressModeNotify = false;
    }
    if (options.targetMode === true) {
      setStickerTrayPeek(true);
    }
    scheduleStickerTutorialLayout();
    if (!shouldClick && options.notify !== false) {
      notifyStickerTutorialAction(options.targetMode === false ? "exitEdit" : "enterEdit");
    }
  }, 140);
  addStickerTutorialDemoTimer(() => {
    topEditButton.classList.remove("is-tutorial-pressing");
    scheduleStickerTutorialLayout();
  }, 360);
}

function startStickerTutorialPlaceDemo() {
  if (!collectionStickerTrayItems) {
    return;
  }
  const startStep = currentStickerTutorialStep();
  setStickerTutorialHandKey("point");
  setStickerTrayPeek(true);
  updateStickerTutorialTraySilhouettes(true, true);
  updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  document.body.classList.add("is-sticker-tutorial-combo-place");
  stickerTutorialDemoStartTime = performance.now();
  const maxScroll = Math.max(0, collectionStickerTrayItems.scrollWidth - collectionStickerTrayItems.clientWidth);
  const clientWidth = collectionStickerTrayItems.clientWidth;
  const targetButton = stickerTutorialTargetTrayButton();
  const targetScroll = targetButton
    ? THREE.MathUtils.clamp(
      targetButton.offsetLeft + targetButton.offsetWidth / 2 - clientWidth / 2,
      0,
      maxScroll,
    )
    : Math.min(maxScroll, collectionStickerTrayItems.scrollLeft + Math.min(420, Math.max(180, maxScroll * 0.36)));
  // v1624: base を targetScroll より大きく左にプリセット = 「画面が右から大きく流れて蝶々で止まる」 演出。
  // 旧仕様は scrollLeft 現在値 (通常 0) を base にしていたため、 蝶々が tray 前方にあると totalDistance ≒ 0-420px
  // しかなく 「全然スライドしてない」 印象に。 desiredTravel を min(maxScroll, max(700px, viewport90%)) で強制。
  // v1627: 700→1100 / 0.9vw→1.4vw へ 1.5x 拡大 (cc4d20f → ユーザー「まだ動きが小さい」 指摘)。
  // v1629: 1100→2400 / 1.4vw→3.0vw へ さらに 2.0x+ 拡大 (af35de7 後ユーザー「もっと」 3 回目)。
  //        viewport 約 3 個分流れる体感 (PC 2800px / タブ 2400px) = 「全部流れる」 体感を確立。
  //        さらに maxScroll が物理上 5000px 以上ある場合は targetScroll 自体を起点 (= 必ず tray 先頭から流す) を許容するため
  //        clamp 上限を maxScroll そのまま (= 最大 targetScroll まで使い切り) に。 蝶々が tray 前方なら短く、 後方なら長く。
  const desiredTravel = Math.min(maxScroll, Math.max(2400, clientWidth * 3.0, targetScroll));
  const adjustedBase = THREE.MathUtils.clamp(targetScroll - desiredTravel, 0, maxScroll);
  // programmatic scroll 抑制中に一瞬で base 位置へジャンプ (listener 抑制は run() 内 stickerTutorialProgrammaticTrayScroll で行う)
  stickerTutorialProgrammaticTrayScroll = true;
  stickerTutorialProgrammaticTrayScrollUntil = performance.now() + 200;
  collectionStickerTrayItems.scrollLeft = adjustedBase;
  stickerTutorialDemoBaseScroll = adjustedBase;
  const totalDistance = THREE.MathUtils.clamp(targetScroll - stickerTutorialDemoBaseScroll, 0, maxScroll);
  if (totalDistance > 0) {
    document.body.classList.add("is-sticker-tutorial-linked-scroll");
    const duration = 4500;
    const run = (now) => {
      const elapsed = Math.max(0, now - stickerTutorialDemoStartTime);
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      const halfDistance = totalDistance / 2;
      let offset = totalDistance;
      if (progress < 0.43) {
        offset = halfDistance * smootherstep(progress / 0.43);
      } else if (progress < 0.57) {
        offset = halfDistance;
      } else if (progress < 0.98) {
        offset = halfDistance + halfDistance * smootherstep((progress - 0.57) / 0.41);
      }
      stickerTutorialProgrammaticTrayScroll = true;
      stickerTutorialProgrammaticTrayScrollUntil = performance.now() + 140;
      collectionStickerTrayItems.scrollLeft = THREE.MathUtils.clamp(
        stickerTutorialDemoBaseScroll + offset,
        0,
        maxScroll,
      );
      if (progress >= 1) {
        stopStickerTutorialStepDemoFrame({ keepTrayScrollSuppression: true });
        scheduleStickerTutorialLayout();
        return;
      }
      stickerTutorialDemoFrame = requestAnimationFrame(run);
    };
    stickerTutorialDemoFrame = requestAnimationFrame(run);
  }
  addStickerTutorialDemoTimer(() => {
    scheduleStickerTutorialLayout();
  }, 4550);
  addStickerTutorialDemoTimer(() => {
    if (currentStickerTutorialStep()?.id === "place") {
      setStickerTutorialHandKey("open");
    }
  }, 5000);
  addStickerTutorialDemoTimer(() => {
    if (currentStickerTutorialStep()?.id === "place") {
      setStickerTutorialHandKey("grip");
    }
  }, 8400);
  // v1624: open 切替を 11300ms (64.20% / hover 直前) → 13350ms (75.85% / drop press 「ぐっ」) に移動。
  // 旧タイミングは hover 到達直前で発火していたため、 hover→to (64.5%→73% = 1.50s) を真下に降ろす最中に
  // 手だけ開く不整合 (「下がりながら手を開いてる」) が発生していた。 drop press と同期させて 「ぐっ → 開く →
  // release lift」 の自然な所作に整える。
  // v1627: hover→drop 区間圧縮で 13350 → 12200ms に前倒し (CSS keyframe 69.32% = drop press と完全同期)。
  // 体感「シール置く瞬間が約 1.15s 早く来る」。 「ぐっ」 と open の同フレーム同期 (v1624 不変条件) は維持。
  // v1629: drop 最小化で 12200 → 11176ms に前倒し (CSS keyframe 63.5% = drop press と完全同期)。
  // hover→to を 5pp→2pp に短縮 (体感「シュッと真下に降りる」)、 to→drop を 3.32pp→0.5pp に短縮 (=同フレーム)。
  addStickerTutorialDemoTimer(() => {
    if (currentStickerTutorialStep()?.id === "place") {
      setStickerTutorialHandKey("open");
    }
  }, 11176);
  // v1624: シール配置も 11600ms → 13500ms (76.71%) に同期。 open 切替の 150ms 後 = 「開いた手の下にシールが残る」 順序を維持。
  // release lift より前なので、 release lift で手だけ持ち上がりシールは page に残るという視覚整合も保たれる。
  // v1627: open 12200ms に合わせて addSticker も 12350ms に前倒し (+150ms オフセット不変)。
  // CSS release lift (72.5% = 12760ms) より前 = 視覚整合維持。
  // v1629: 「手が静止 = パッと離す = 同時にシールが貼られる」 を体感最優先するため +150ms オフセットを廃止、 +24ms (≒同フレーム) に短縮。
  // addSticker 12350 → 11200ms (open +24ms)。 CSS release lift (64.5% = 11352ms) より +152ms 前 = 視覚整合維持 (open → addSticker → release lift の順序不変)。
  // v1637: 操作型化 — 旧 addStickerFromTutorialDemoToPage の自動配置を削除。
  // hand grip ジェスチャだけ見せて、 実 sticker 配置は子供のドラッグに任せる。
  addStickerTutorialDemoTimer(() => {
    finishStickerTutorialDemoToTry(startStep);
  }, 11400);
}

function startStickerTutorialMoveDemo() {
  const placement = ensureStickerTutorialEditableSticker();
  if (!placement) {
    return;
  }
  const startStep = currentStickerTutorialStep();
  const originalX = THREE.MathUtils.clamp(Number(placement.x) || 52, 14, 82);
  const originalY = THREE.MathUtils.clamp(Number(placement.y) || 42, 16, 78);
  placement.x = originalX;
  placement.y = originalY;
  refreshInlineStickerPage();
  document.body.classList.add("is-sticker-tutorial-move-js");
  setStickerTutorialHandKey("grip");
  const path = [
    { x: originalX, y: originalY },
    { x: originalX - 13, y: originalY - 10 },
    { x: originalX + 15, y: originalY - 7 },
    { x: originalX + 7, y: originalY + 14 },
    { x: originalX - 9, y: originalY + 8 },
    { x: originalX + 7, y: originalY + 3 },
  ].map((point) => ({
    x: THREE.MathUtils.clamp(point.x, 9, 91),
    y: THREE.MathUtils.clamp(point.y, 12, 84),
  }));
  stickerTutorialSuppressedDemoActions.add("moveSticker");
  // v1637: 操作型化 — demo 終了後は placement を元位置に戻して try フェーズへ。
  // 「ポノが触ったあと」 を残さないことで、 子供が「自分で動かす」 体験を妨げない。
  animateStickerTutorialPlacement(5600, (progress) => {
    const point = interpolateStickerTutorialPath(path, progress);
    placement.x = point.x;
    placement.y = point.y;
    setStickerTutorialHandPoint(stickerTutorialScreenPointForPlacement(placement, point));
    refreshInlineStickerPage();
  }, () => {
    placement.x = originalX;
    placement.y = originalY;
    setStickerTutorialHandPoint(stickerTutorialScreenPointForPlacement(placement, { x: originalX, y: originalY }));
    refreshInlineStickerPage();
    stickerTutorialSuppressedDemoActions.delete("moveSticker");
    finishStickerTutorialDemoToTry(startStep);
  });
}

function startStickerTutorialScaleDemo() {
  const placement = ensureStickerTutorialEditableSticker();
  if (!placement) {
    return;
  }
  const startStep = currentStickerTutorialStep();
  const startScale = THREE.MathUtils.clamp(Number(placement.scale) || 1, 0.7, 1.35);
  const smallScale = Math.max(0.65, startScale * 0.78);
  const largeScale = Math.min(1.9, startScale * 1.48);
  const settleScale = Math.min(1.65, Math.max(startScale * 1.14, startScale + 0.12));
  document.body.classList.add("is-sticker-tutorial-slider-js");
  setStickerTutorialHandKey("point");
  const step = currentStickerTutorialStep();
  const rect = stickerTutorialTargetRect(step);
  // v1625: scale 値 → 実 thumb fraction で直接 hand x を打つ (handProgress 概念廃止)。
  // 「最初 (startScale=1.0) のフレームで hand が smallFrac に居て thumb と ~10% ズレる」 + 「settle phase で handProgress が固定値 0.42 → scale との不整合」 を構造的に解消。
  // 加えて thumb 半径 (~8px) を考慮した usable track (input.left+thumbR ~ input.right-thumbR) 上の位置に補正。
  const sliderMin = 0.35, sliderMax = 2.4, sliderRange = sliderMax - sliderMin;
  const trackPad = 12;  // rect は expandedElementRect で 12px 外側に拡張済 → input 実 left = rect.left + trackPad
  const thumbR = 8;     // ブラウザ既定 thumb 半径相当 (Chrome/Safari/Firefox で 6-10px、 中央値 8)
  const inputLeft = rect.left + trackPad;
  const inputW = Math.max(rect.width - trackPad * 2, 0);
  const usableW = Math.max(inputW - thumbR * 2, 0);
  const centerY = rect.top + rect.height / 2;
  const xFor = (s) => inputLeft + thumbR + usableW * THREE.MathUtils.clamp((s - sliderMin) / sliderRange, 0, 1);
  stickerTutorialSuppressedDemoActions.add("scaleSticker");
  // v1637: 操作型化 — demo 終了後は scale を元に戻して try フェーズへ。
  animateStickerTutorialPlacement(9300, (progress) => {
    let scale;
    if (progress < 0.24) {
      const t = smootherstep(progress / 0.24);
      scale = THREE.MathUtils.lerp(startScale, largeScale, t);
    } else if (progress < 0.42) {
      scale = largeScale;
    } else if (progress < 0.68) {
      const t = smootherstep((progress - 0.42) / 0.26);
      scale = THREE.MathUtils.lerp(largeScale, smallScale, t);
    } else if (progress < 0.84) {
      scale = smallScale;
    } else {
      const t = smootherstep((progress - 0.84) / 0.16);
      scale = THREE.MathUtils.lerp(smallScale, settleScale, t);
    }
    setStickerTutorialHandPoint({ x: xFor(scale), y: centerY });
    placement.scale = scale;
    if (inlineStickerScale) {
      inlineStickerScale.value = scale.toFixed(2);
    }
    refreshInlineStickerPage();
  }, () => {
    placement.scale = startScale;
    if (inlineStickerScale) {
      inlineStickerScale.value = startScale.toFixed(2);
    }
    setStickerTutorialHandPoint({ x: xFor(startScale), y: centerY });
    refreshInlineStickerPage();
    stickerTutorialSuppressedDemoActions.delete("scaleSticker");
    finishStickerTutorialDemoToTry(startStep);
  });
}

function startStickerTutorialRotateDemo() {
  const placement = ensureStickerTutorialEditableSticker();
  if (!placement) {
    return;
  }
  const startStep = currentStickerTutorialStep();
  const baseRotation = Number(placement.rotation) || 0;
  const rightRotation = THREE.MathUtils.clamp(baseRotation + 28, -180, 180);
  const leftRotation = THREE.MathUtils.clamp(baseRotation - 24, -180, 180);
  const settleRotation = THREE.MathUtils.clamp(baseRotation + 14, -180, 180);
  document.body.classList.add("is-sticker-tutorial-slider-js");
  setStickerTutorialHandKey("point");
  const step = startStep;
  const rect = stickerTutorialTargetRect(step);
  // v1625: rotation 値 → 実 thumb fraction で直接 hand x を打つ (handProgress 概念廃止)。
  // 旧実装は from=baseRotation(0°) / to=rightRotation(+28°) の 2 点 lerp で 4 phase (base→right→left→settle) を回していたため、
  // phase 3 (右→左 +28°→-24°) で hand は to→from (28° 分) しか戻らず、 thumb は -24° まで行って innerW × 14.4% の置き去りズレが発生していた。
  // scale demo と同じ thumb 半径補正パターンで rotation 値から直接 x を計算する。
  const sliderMin = -180, sliderMax = 180, sliderRange = sliderMax - sliderMin;
  const trackPad = 12;
  const thumbR = 8;
  const inputLeft = rect.left + trackPad;
  const inputW = Math.max(rect.width - trackPad * 2, 0);
  const usableW = Math.max(inputW - thumbR * 2, 0);
  const centerY = rect.top + rect.height / 2;
  const xFor = (r) => inputLeft + thumbR + usableW * THREE.MathUtils.clamp((r - sliderMin) / sliderRange, 0, 1);
  stickerTutorialSuppressedDemoActions.add("rotateSticker");
  // v1637: 操作型化 — demo 終了後は rotation を元に戻して try フェーズへ。
  animateStickerTutorialPlacement(5200, (progress) => {
    let rotation;
    if (progress < 0.24) {
      const t = smootherstep(progress / 0.24);
      rotation = THREE.MathUtils.lerp(baseRotation, rightRotation, t);
    } else if (progress < 0.4) {
      rotation = rightRotation;
    } else if (progress < 0.68) {
      const t = smootherstep((progress - 0.4) / 0.28);
      rotation = THREE.MathUtils.lerp(rightRotation, leftRotation, t);
    } else if (progress < 0.82) {
      rotation = leftRotation;
    } else {
      const t = smootherstep((progress - 0.82) / 0.18);
      rotation = THREE.MathUtils.lerp(leftRotation, settleRotation, t);
    }
    const clamped = THREE.MathUtils.clamp(rotation, -180, 180);
    setStickerTutorialHandPoint({ x: xFor(clamped), y: centerY });
    placement.rotation = clamped;
    if (inlineStickerRotation) {
      inlineStickerRotation.value = String(Math.round(clamped));
    }
    refreshInlineStickerPage();
  }, () => {
    placement.rotation = baseRotation;
    if (inlineStickerRotation) {
      inlineStickerRotation.value = String(Math.round(baseRotation));
    }
    setStickerTutorialHandPoint({ x: xFor(baseRotation), y: centerY });
    refreshInlineStickerPage();
    stickerTutorialSuppressedDemoActions.delete("rotateSticker");
    finishStickerTutorialDemoToTry(startStep);
  });
}

function triggerStickerTutorialOkButtonPress() {
  // v1625: OK ボタン押下を視覚化 (top-edit-button.is-tutorial-pressing と同思想)。
  // CSS .inline-sticker-ok.is-tutorial-pressing で translateY(2px) + scale(0.94) + 黄リング glow。
  // 140ms class add → click → 360ms class remove。 click が clearInlineStickerSelection → confirmSticker notify を発火。
  if (!inlineStickerOk || inlineStickerOk.hidden) {
    // フォールバック: ボタンが無ければ直接 notify (既存ハンドラ非対応のケースを救済)
    notifyStickerTutorialAction("confirmSticker");
    return;
  }
  // v1627: press 直前に hand=point を再保証 (scheduleLayout で他 pose に流れていた場合の救済)。
  setStickerTutorialHandKey("point");
  inlineStickerOk.classList.add("is-tutorial-pressing");
  addStickerTutorialDemoTimer(() => {
    // v1627: click 瞬間も point pose 再保証。
    setStickerTutorialHandKey("point");
    inlineStickerOk?.click();
    // v1627: OK click 後 spotlight 黄枠が click 跡地 (cache rect) に居座る問題への対処。
    // 即 hidden=true で消し、 次 step (page) 遷移時に showStickerTutorialStep() が hidden=false に戻す既存挙動に任せる。
    // cache 機構 (v1625) は将来別経路の再表示で安全側のため温存。
    if (stickerTutorialSpotlight) {
      stickerTutorialSpotlight.hidden = true;
    }
  }, 140);
  addStickerTutorialDemoTimer(() => {
    inlineStickerOk?.classList.remove("is-tutorial-pressing");
  }, 360);
}

function startStickerTutorialOkDemo() {
  // v1637: 操作型化 — 自動 click を削除。 ボタン側の is-tutorial-pressing class add だけで「押し込み」 を
  // 視覚的に見せ、 実 click は子供に任せる。 keyframe 52% (1560ms) に合わせて class add → 360ms 後 remove。
  const startStep = currentStickerTutorialStep();
  setStickerTutorialHandKey("point");
  addStickerTutorialDemoTimer(() => {
    if (currentStickerTutorialStep()?.id !== "ok" || stickerTutorialState?.actionDone) {
      return;
    }
    setStickerTutorialHandKey("point");
    // 視覚的「指が降りて押し込み」 のみ実行。 inlineStickerOk?.click() は呼ばない。
    if (inlineStickerOk && !inlineStickerOk.hidden) {
      inlineStickerOk.classList.add("is-tutorial-pressing");
      addStickerTutorialDemoTimer(() => {
        inlineStickerOk?.classList.remove("is-tutorial-pressing");
      }, 360);
    }
  }, 1560);
  // demo 完了 → try フェーズ。 keyframe 終了 (~3000ms) と OK 押し込み演出完了後に遷移。
  addStickerTutorialDemoTimer(() => {
    finishStickerTutorialDemoToTry(startStep);
  }, 3200);
}

function startStickerTutorialPageDemo() {
  // v1637: 操作型化 — 矢印ボタンの spot ハイライトだけ見せ、 click は子供に任せる。
  const startStep = currentStickerTutorialStep();
  if (bookNextPage) {
    bookNextPage.classList.add("is-tutorial-spotlit-arrow");
  }
  // Phase B (~2400ms): ハイライトはそのまま残す (try 中も spot 強調で「ここを押す」 と伝える)。
  // 旧 4400ms の bookNextPage.click() は削除。 demo 完了 → try フェーズ。
  addStickerTutorialDemoTimer(() => {
    finishStickerTutorialDemoToTry(startStep);
  }, 2800);
}

function startStickerTutorialViewDemo() {
  // v1637: 操作型化 — editButton の自動 click を削除。 demo 期間は hand cursor のみ見せて try フェーズへ。
  const startStep = currentStickerTutorialStep();
  addStickerTutorialDemoTimer(() => {
    finishStickerTutorialDemoToTry(startStep);
  }, 3000);
}

function animateStickerTutorialPlacement(duration, onFrame, onComplete) {
  const startTime = performance.now();
  const run = (now) => {
    if (!stickerTutorialState) {
      return;
    }
    const progress = THREE.MathUtils.clamp((now - startTime) / duration, 0, 1);
    onFrame(smootherstep(progress));
    if (progress >= 1) {
      stickerTutorialDemoFrame = 0;
      if (typeof onComplete === "function") {
        onComplete();
      }
      return;
    }
    stickerTutorialDemoFrame = requestAnimationFrame(run);
  };
  stickerTutorialDemoFrame = requestAnimationFrame(run);
}

function addStickerFromTutorialDemoToPage() {
  // v1640 (task 4): DEMO 中の自動配置 helper (現在の v1637 では呼ばれないが保険的に維持)。
  // phase は "demo" 扱い (= 蝶々固定) で素材ズレを防止。
  const sticker = stickerTutorialPickSticker("demo") || stickerOptions[0];
  if (!sticker) {
    return;
  }
  const page = rightBookPageNumber();
  addStickerFromTrayToPage(sticker.id, page, { x: 56, y: 42 });
  const placement = getSelectedPlacement();
  if (placement) {
    placement.scale = THREE.MathUtils.clamp(defaultStickerScale(sticker) * 1.05, 0.45, 2.2);
    refreshInlineStickerPage();
  }
}

function addStickerTutorialDemoTimer(callback, delay) {
  const timer = window.setTimeout(() => {
    stickerTutorialDemoTimers = stickerTutorialDemoTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  stickerTutorialDemoTimers.push(timer);
  return timer;
}

function clearStickerTutorialDemoTimers() {
  for (const timer of stickerTutorialDemoTimers) {
    window.clearTimeout(timer);
  }
  stickerTutorialDemoTimers = [];
}

function stopStickerTutorialStepDemoFrame(options = {}) {
  if (stickerTutorialDemoFrame) {
    cancelAnimationFrame(stickerTutorialDemoFrame);
    stickerTutorialDemoFrame = 0;
  }
  stickerTutorialProgrammaticTrayScroll = false;
  stickerTutorialProgrammaticTrayScrollUntil = options.keepTrayScrollSuppression
    ? performance.now() + 420
    : 0;
  document.body.classList.remove("is-sticker-tutorial-linked-scroll");
}

function stopStickerTutorialStepDemo(options = {}) {
  stopStickerTutorialStepDemoFrame(options);
  clearStickerTutorialDemoTimers();
  cancelStickerTutorialDragPageTurn();
  stickerTutorialSuppressModeNotify = false;
  stickerTutorialSuppressedDemoActions.clear();
  topEditButton?.classList.remove("is-tutorial-pressing");
  inlineStickerOk?.classList.remove("is-tutorial-pressing");
  bookNextPage?.classList.remove("is-tutorial-spotlit-arrow");
  // v1625: 次 step に遷移したら OK の last-rect cache をクリア (現 step が ok でない場合のみ)
  if (currentStickerTutorialStep()?.id !== "ok") {
    stickerTutorialLastOkRect = null;
  }
  document.body.classList.remove(
    "is-sticker-tutorial-mode-demo",
    "is-sticker-tutorial-mode-rest",
    "is-sticker-tutorial-mode-approach",
    "is-sticker-tutorial-mode-press",
    "is-sticker-tutorial-combo-place",
    "is-sticker-tutorial-move-js",
    "is-sticker-tutorial-slider-js",
  );
  if (stickerTutorialState) {
    // Keep tray silhouette ON for the whole tutorial; only drop the yellow target highlight.
    updateStickerTutorialTraySilhouettes(true, false);
    updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  } else {
    document.body.classList.remove("is-sticker-tutorial-tray-silhouette");
    updateStickerTutorialTraySilhouettes(false);
    updateRaritySuperSilhouettes(false);
  }
}

function setStickerTutorialHandBetween(from, to, progress) {
  const t = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
  setStickerTutorialHandPoint({
    x: THREE.MathUtils.lerp(from.x, to.x, t),
    y: THREE.MathUtils.lerp(from.y, to.y, t),
  });
}

function setStickerTutorialHandPoint(point) {
  setStickerTutorialPointVar("--tutorial-hand-x", point.x);
  setStickerTutorialPointVar("--tutorial-hand-y", point.y);
}

function notifyStickerTutorialAction(action) {
  if (stickerTutorialSuppressedDemoActions.has(action)) {
    return;
  }
  const step = currentStickerTutorialStep();
  if (!stickerTutorialState || !step || step.finish || stickerTutorialState.actionDone) {
    return;
  }
  // v1637: phase ゲート — demo 中の notify は無視 (子供がいじっても「先回り正解」 扱いしない)。
  if (stickerTutorialState.phase === "demo") {
    return;
  }
  const actions = Array.isArray(step.advanceOn) ? step.advanceOn : [];
  if (actions.includes(action)) {
    // 正解 — try フェーズ完了 → complete + 「つぎ」 pulse。 自動 advance はしない (子供主導)。
    stickerTutorialState.actionDone = true;
    setStickerTutorialPhase("complete");
    updateStickerTutorialNextAvailability(step, { forceReady: true });
    if (stickerTutorialNext) {
      stickerTutorialNext.classList.add("is-ready-pulse");
    }
    return;
  }
  // v1637: 操作型化に伴う「明らかな誤操作」 カウンタ。 3 回到達で「とばす」 ボタン表示。
  // try フェーズのみカウント (complete 後は無視)。
  if (stickerTutorialState.phase !== "try") {
    return;
  }
  const wrongs = STICKER_TUTORIAL_STEP_WRONG_ACTIONS[step.id] || [];
  if (!wrongs.includes(action)) {
    return;
  }
  stickerTutorialState.failCount = (stickerTutorialState.failCount || 0) + 1;
  if (stickerTutorialState.failCount >= 3 && !stickerTutorialState.skipShown) {
    showStickerTutorialStepSkipButton();
  }
}

// v1637: phase 切替 — body class + DOM 可視性 + try timeout タイマ管理を一元化。
function setStickerTutorialPhase(phase) {
  if (!stickerTutorialState) {
    return;
  }
  stickerTutorialState.phase = phase;
  document.body.classList.toggle("is-sticker-tutorial-phase-demo", phase === "demo");
  document.body.classList.toggle("is-sticker-tutorial-phase-try", phase === "try");
  document.body.classList.toggle("is-sticker-tutorial-phase-complete", phase === "complete");
  const step = currentStickerTutorialStep();
  // v1643 (task 5): complete phase 開始時刻を記録 (place 専用 min-hold gate で使用)。
  // v1646 (task 2): 全 8 TRY step に「褒め一言」 を追加 — 1.6s 表示 + 600ms scale pop で
  // 「正解できたよ」 を子供にはっきり伝える。 音声は別途事前生成のため textContent 上書きのみで安全。
  if (phase === "complete") {
    stickerTutorialState.completeStartedAt = performance.now();
    const praise = step?.id ? STICKER_TUTORIAL_PRAISE_BY_STEP[step.id] : null;
    if (praise && stickerTutorialText && !stickerTutorialState.praiseShown) {
      stickerTutorialState.praiseShown = true;
      stickerTutorialText.textContent = praise;
      stickerTutorialText.classList.add("is-praise-pop");
      addStickerTutorialDemoTimer(() => {
        stickerTutorialText?.classList.remove("is-praise-pop");
      }, 650);
    }
    scheduleStickerTutorialLayout();
  } else {
    stickerTutorialState.completeStartedAt = 0;
    stickerTutorialState.praiseShown = false;
    stickerTutorialText?.classList.remove("is-praise-pop");
  }
  // try フェーズ突入時: テキストを textTry に差し替え + tryMaxMs タイムアウト起動。
  clearStickerTutorialTryTimeout();
  if (phase === "try") {
    if (stickerTutorialText && step?.textTry) {
      stickerTutorialText.textContent = step.textTry;
    }
    const tryMaxMs = Number(step?.tryMaxMs) || 30000;
    if (tryMaxMs > 0) {
      stickerTutorialTryTimeoutTimer = window.setTimeout(() => {
        stickerTutorialTryTimeoutTimer = 0;
        if (
          stickerTutorialState?.phase === "try" &&
          currentStickerTutorialStep() === step &&
          !stickerTutorialState.skipShown
        ) {
          showStickerTutorialStepSkipButton();
        }
      }, tryMaxMs);
    }
  }
  // v1640 (task 3/4): phase 切替時に tray silhouette + spotlight rect を再計算。
  // - try 突入で DEMO 中の per-step デコイ強調 (place の蝶々ハイライト等) を確実に反映
  // - spotlight CSS 変数を新 step / 新 phase に基づき再注入し、 残骸描画を防止
  if (stickerTutorialState) {
    updateStickerTutorialTraySilhouettes(true, false);
    updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  }
  scheduleStickerTutorialLayout();
}

function clearStickerTutorialTryTimeout() {
  if (stickerTutorialTryTimeoutTimer) {
    window.clearTimeout(stickerTutorialTryTimeoutTimer);
    stickerTutorialTryTimeoutTimer = 0;
  }
}

function showStickerTutorialStepSkipButton() {
  if (!stickerTutorialState) {
    return;
  }
  stickerTutorialState.skipShown = true;
  if (stickerTutorialStepSkip) {
    stickerTutorialStepSkip.hidden = false;
  }
}

function hideStickerTutorialStepSkipButton() {
  if (stickerTutorialStepSkip) {
    stickerTutorialStepSkip.hidden = true;
  }
}

function stickerTutorialRemainingStepMs(step) {
  const minMs = Number(step?.minAdvanceMs) || 0;
  if (!minMs || !stickerTutorialState?.stepStartedAt) {
    return 0;
  }
  return Math.max(0, minMs - (performance.now() - stickerTutorialState.stepStartedAt));
}

function updateStickerTutorialNextAvailability(step = currentStickerTutorialStep(), opts = {}) {
  if (!stickerTutorialNext) {
    return;
  }
  const forceReady =
    opts.forceReady === true ||
    Boolean(stickerTutorialState?.actionDone);
  const remaining = stickerTutorialRemainingStepMs(step);
  // v1643 (task 4): DEMO 中は forceReady でなければ常に 「つぎ」 を disable。
  // - 旧仕様は minAdvanceMs (4-6s) を満たした瞬間 enable + 音声 ended で forceReady → 子供が
  //   demo を見終わる前に「つぎ」 を押せて DEMO→TRY 強制ループが成立せず、 帆船の意図と乖離。
  // - 新仕様: DEMO 中は actionDone / opts.forceReady がない限り disable 固定 (try に入って初めて enable)。
  // - place step は actionDone でも「貼った直後 1.5s」 だけ追加で disable に保つ (min-hold gate)。
  const isDemoPhase = stickerTutorialState?.phase === "demo";
  let disabled = !forceReady && remaining > 80;
  if (isDemoPhase && !forceReady) {
    disabled = true;
  }
  // place complete 直後の min-hold gate: 「貼ったシール」 を 1.5s 残してから次に進めるようにする。
  const completeStartedAt = stickerTutorialState?.completeStartedAt || 0;
  const placeHoldMs = 1500;
  if (
    !disabled
    && step?.id === "place"
    && stickerTutorialState?.phase === "complete"
    && completeStartedAt > 0
  ) {
    const heldFor = performance.now() - completeStartedAt;
    if (heldFor < placeHoldMs) {
      disabled = true;
      addStickerTutorialDemoTimer(() => {
        if (currentStickerTutorialStep() === step) {
          updateStickerTutorialNextAvailability(step);
        }
      }, placeHoldMs - heldFor + 20);
    }
  }
  stickerTutorialNext.disabled = disabled;
  stickerTutorialNext.setAttribute("aria-disabled", disabled ? "true" : "false");
  if (disabled && remaining > 80 && !isDemoPhase) {
    addStickerTutorialDemoTimer(() => {
      if (currentStickerTutorialStep() === step) {
        updateStickerTutorialNextAvailability(step);
      }
    }, remaining + 20);
  }
}

function retryBlockedStickerTutorialAudio() {
  if (!stickerTutorialState || !stickerTutorialAudioBlocked) {
    return;
  }
  const step = currentStickerTutorialStep();
  if (step) {
    playStickerTutorialAudio(step, { fromGesture: true });
  }
}

// === BGM control ===
// SW pre-cache に登録していないので、 cache-bust クエリは付けない
// (URL 不一致を避け、 SW runtime cache (network-first) に素直に乗せる)。
function ensureStickerBgmElement() {
  if (stickerBgmAudio) return stickerBgmAudio;
  const a = new Audio(STICKER_BGM_URL);
  a.loop = true;
  a.preload = "auto";
  a.volume = 0;
  stickerBgmAudio = a;
  return a;
}

function fadeStickerBgmTo(targetVol, durationMs) {
  const a = stickerBgmAudio;
  if (!a) return;
  if (stickerBgmFadeTimer) { clearInterval(stickerBgmFadeTimer); stickerBgmFadeTimer = null; }
  const start = a.volume;
  const t0 = performance.now();
  stickerBgmFadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - t0) / Math.max(1, durationMs));
    a.volume = start + (targetVol - start) * t;
    if (t >= 1) {
      clearInterval(stickerBgmFadeTimer);
      stickerBgmFadeTimer = null;
      if (targetVol <= 0.001) { try { a.pause(); } catch (_) {} }
    }
  }, 30);
}

function startStickerBgm() {
  if (!stickerBgmEnabled) return;
  const a = ensureStickerBgmElement();
  const target = stickerBgmDucked ? STICKER_BGM_DUCK_VOLUME : STICKER_BGM_BASE_VOLUME;
  const p = a.play();
  if (p && p.catch) p.catch(() => { stickerBgmUnlocked = false; });
  stickerBgmUnlocked = true;
  fadeStickerBgmTo(target, STICKER_BGM_FADE_MS);
}

function stopStickerBgm() {
  if (!stickerBgmAudio) return;
  fadeStickerBgmTo(0, STICKER_BGM_FADE_MS);
}

function duckStickerBgm() {
  stickerBgmDucked = true;
  if (stickerBgmAudio && !stickerBgmAudio.paused) {
    fadeStickerBgmTo(STICKER_BGM_DUCK_VOLUME, 280);
  }
}

function unduckStickerBgm() {
  stickerBgmDucked = false;
  if (stickerBgmEnabled && stickerBgmAudio && !stickerBgmAudio.paused) {
    fadeStickerBgmTo(STICKER_BGM_BASE_VOLUME, 420);
  }
}

function toggleStickerBgm() {
  stickerBgmEnabled = !stickerBgmEnabled;
  localStorage.setItem("pono_bgm_enabled", stickerBgmEnabled ? "on" : "off");
  if (stickerBgmEnabled) startStickerBgm(); else stopStickerBgm();
}

// 外部 (admin/menu 等) から制御できるよう公開
window.__stickerBookToggleBgm = toggleStickerBgm;
window.__stickerBookStartBgm = startStickerBgm;
window.__stickerBookStopBgm = stopStickerBgm;

function _sbBgmPause() {
  if (stickerBgmAudio && !stickerBgmAudio.paused) {
    try { stickerBgmAudio.pause(); } catch (_) {}
  }
}
function _sbBgmResume() {
  if (stickerBgmEnabled && stickerBgmUnlocked) {
    const a = ensureStickerBgmElement();
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) _sbBgmPause(); else _sbBgmResume();
});
window.addEventListener("blur", _sbBgmPause);
window.addEventListener("focus", _sbBgmResume);
window.addEventListener("pagehide", _sbBgmPause);
window.addEventListener("pageshow", _sbBgmResume);

// autoplay unlock (初回 pointerdown で BGM を起動)
document.addEventListener("pointerdown", function _bgmUnlock() {
  if (stickerBgmEnabled && !stickerBgmUnlocked) startStickerBgm();
  document.removeEventListener("pointerdown", _bgmUnlock, { capture: true });
}, { capture: true, passive: true });

function playStickerTutorialAudio(step) {
  stopStickerTutorialAudio();
  duckStickerBgm();
  const audioFiles = (Array.isArray(step?.audio) ? step.audio : [step?.audio]).filter(Boolean);
  if (!audioFiles.length) {
    return;
  }
  const playAt = (index) => {
    if (!stickerTutorialState || currentStickerTutorialStep() !== step || !audioFiles[index]) {
      return;
    }
    const audio = new Audio(`${STICKER_TUTORIAL_AUDIO_BASE}${audioFiles[index]}?v=${ASSET_VERSION}`);
    audio.preload = "auto";
    audio.volume = 0.92;
    audio.playbackRate = Number(step.playbackRate) || 1;
    audio.addEventListener("error", () => {
      if (stickerTutorialAudio !== audio) {
        return;
      }
      // mp3 が未配置 (404) でもチュートリアル進行を止めない。 minAdvanceMs 経過後に「つぎ」 で進める
      if (index + 1 < audioFiles.length) {
        playAt(index + 1);
      } else {
        stickerTutorialAudio = null;
      }
    }, { once: true });
    audio.addEventListener("ended", () => {
      if (stickerTutorialAudio !== audio) {
        return;
      }
      if (index + 1 < audioFiles.length) {
        playAt(index + 1);
      } else {
        stickerTutorialAudio = null;
        // v1643 (task 4): 音声完了 → DEMO 中なら 「つぎ」 を enable しない。
        // - 旧仕様は音声 ended で forceReady=true → DEMO→TRY 強制ループが破綻 (子供が demo 中に進める)。
        // - 新仕様: DEMO 中は何もせず demo 終了 (finishStickerTutorialDemoToTry) で phase=try に入った後、
        //   try 完了 (advanceOn 一致) で notifyStickerTutorialAction が forceReady を立てる。
        // - intro / final (textTry なし = step.finish もしくは textTry 未定義) のみ従来通り音声完了で enable。
        if (
          stickerTutorialState &&
          !step.finish &&
          currentStickerTutorialStep() === step
        ) {
          const isDemoStep = Boolean(step.textTry);
          const isDemoPhase = stickerTutorialState.phase === "demo";
          if (!isDemoStep || !isDemoPhase) {
            updateStickerTutorialNextAvailability(step, { forceReady: true });
            if (stickerTutorialNext) {
              stickerTutorialNext.classList.add("is-ready-pulse");
            }
          }
        }
      }
    }, { once: true });
    stickerTutorialAudio = audio;
    stickerTutorialAudioBlocked = false;
    audio.play().catch(() => {
      // Mobile browsers may require a user gesture; visual guidance still continues.
      if (stickerTutorialAudio === audio) {
        stickerTutorialAudioBlocked = true;
      }
    });
  };
  playAt(0);
}

function stopStickerTutorialAudio() {
  if (!stickerTutorialAudio) {
    // 既に音声が停止していても duck 解除は実施 (チュートリアル終了時など)
    unduckStickerBgm();
    return;
  }
  try {
    stickerTutorialAudio.pause();
    stickerTutorialAudio.currentTime = 0;
  } catch {}
  stickerTutorialAudio = null;
  stickerTutorialAudioBlocked = false;
  unduckStickerBgm();
}

function scheduleStickerTutorialLayout() {
  if (!stickerTutorialState || !stickerTutorial || stickerTutorial.hidden) {
    return;
  }
  if (stickerTutorialLayoutFrame) {
    cancelAnimationFrame(stickerTutorialLayoutFrame);
  }
  stickerTutorialLayoutFrame = requestAnimationFrame(() => {
    stickerTutorialLayoutFrame = 0;
    updateStickerTutorialLayout();
  });
}

function updateStickerTutorialLayout() {
  const step = currentStickerTutorialStep();
  if (!step || !stickerTutorial || stickerTutorial.hidden) {
    return;
  }
  const rect = stickerTutorialTargetRect(step);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const widthPx = Math.max(46, rect.width);
  const heightPx = Math.max(38, rect.height);
  const radiusVal = rect.radius || "18px";
  stickerTutorial.style.setProperty("--tutorial-x", `${centerX}px`);
  stickerTutorial.style.setProperty("--tutorial-y", `${centerY}px`);
  stickerTutorial.style.setProperty("--tutorial-w", `${widthPx}px`);
  stickerTutorial.style.setProperty("--tutorial-h", `${heightPx}px`);
  stickerTutorial.style.setProperty("--tutorial-radius", radiusVal);
  // v1629: 真因対応 (spotlight stale paint root cause)。
  // 旧仕様は親 stickerTutorial にのみ CSS 変数を書いていたため、 子 stickerTutorialSpotlight が hidden=false に
  // 切り替わった瞬間、 inherited cascade の flush 遅延 (iOS Safari/WebKit で顕著) で 1 frame だけ前 step の値
  // (OK ボタン位置 = 画面下端) で描画される → 「黄枠が一瞬下にずれる」 視覚バグ。
  // 解決: spotlight 要素自身にも同じ変数を inline で複写する (= 子は自分の inline style を優先するため
  // cascade 遅延の影響を受けない)。 v1628 の 「位置確定後に hidden=false」 と併用して二重防護。
  if (stickerTutorialSpotlight) {
    stickerTutorialSpotlight.style.setProperty("--tutorial-x", `${centerX}px`);
    stickerTutorialSpotlight.style.setProperty("--tutorial-y", `${centerY}px`);
    stickerTutorialSpotlight.style.setProperty("--tutorial-w", `${widthPx}px`);
    stickerTutorialSpotlight.style.setProperty("--tutorial-h", `${heightPx}px`);
    stickerTutorialSpotlight.style.setProperty("--tutorial-radius", radiusVal);
  }
  // v1630: ノート直書き chip — 左ページ rect を CSS 変数で公開し
  // .sticker-tutorial-page-text を mesh に追従させる (mesh は Three.js 描画なので getBoundingClientRect 不可、
  // projectedMeshClientRect で 2D 画面 rect に射影)。 ページめくり等で leftPageInner.visible=false の間は
  // 直近の有効 rect を保持して chip がワープしないようにする。
  const leftPageRect = stickerTutorialSidePageRect("left") || stickerTutorialPageRect();
  if (leftPageRect && Number.isFinite(leftPageRect.left) && Number.isFinite(leftPageRect.top)) {
    // v1646 (task 1): 左ページ overlay を中央 70% に再配置。
    // 旧 (08% offset / 84% 幅) は AABB 由来で 「左上に押し込まれている」 体感が強かったため、
    // 左右対称 15% 余白 + 上下対称 18% offset で 「ページ中央寄り」 に矯正。
    // textHeight は 36% でボタン群 (page-block flex 子) と帆船イラスト下半分の干渉を回避。
    const textTop = leftPageRect.top + leftPageRect.height * 0.18;
    const textHeight = leftPageRect.height * 0.36;
    const textLeft = leftPageRect.left + leftPageRect.width * 0.15;
    const textWidth = leftPageRect.width * 0.70;
    stickerTutorial.style.setProperty("--tutorial-leftpage-x", `${textLeft}px`);
    stickerTutorial.style.setProperty("--tutorial-leftpage-y", `${textTop}px`);
    stickerTutorial.style.setProperty("--tutorial-leftpage-w", `${textWidth}px`);
    stickerTutorial.style.setProperty("--tutorial-leftpage-h", `${textHeight}px`);
    // v1643 (task 3): 操作ボタン群を 「左ページ下部固定 overlay」 → 「page-block 内 flex 子 (テキスト直下)」
    // に再編。 leftpage-btn-* CSS 変数は廃止 (styles.css 側も position: static + flex-column で描画)。
  }
  updateStickerTutorialDemo(step, rect);
}

function updateStickerTutorialDemo(step, rect) {
  if (!stickerTutorial || !rect) {
    return;
  }
  const center = rectCenter(rect);
  const handKey = step?.hand || "open";
  // step "mode" は Phase 0 (rest) / Phase 1 (approach) の間だけ open を強制する。
  // Phase 2 (press) 以降は step.hand="point" を尊重しないと、 後続の
  // scheduleStickerTutorialLayout() が走るたびに hand が open に戻ってしまい、
  // 「open のまま押している」 不一致が発生する (バグ修正: v1601)
  const inModeRestOrApproach =
    step?.id === "mode" &&
    (document.body.classList.contains("is-sticker-tutorial-mode-rest") ||
      document.body.classList.contains("is-sticker-tutorial-mode-approach"));
  const initialHandKey = inModeRestOrApproach ? "open" : handKey;
  setStickerTutorialHandKey(initialHandKey);
  const demo = stickerTutorialDemoPoints(step, rect);
  // step "mode" は初期 hand 位置を rest (右下) に固定。 keyframe 内で left/top を上書きしながら遷移する
  const initialHand = step?.id === "mode" && demo.rest ? demo.rest : demo.hand;
  setStickerTutorialPointVar("--tutorial-hand-x", initialHand.x);
  setStickerTutorialPointVar("--tutorial-hand-y", initialHand.y);
  if (step?.id === "mode" && demo.rest) {
    setStickerTutorialPointVar("--tutorial-demo-rest-x", demo.rest.x);
    setStickerTutorialPointVar("--tutorial-demo-rest-y", demo.rest.y);
  }
  setStickerTutorialPointVar("--tutorial-demo-from-x", demo.from.x);
  setStickerTutorialPointVar("--tutorial-demo-from-y", demo.from.y);
  setStickerTutorialPointVar("--tutorial-demo-to-x", demo.to.x);
  setStickerTutorialPointVar("--tutorial-demo-to-y", demo.to.y);
  setStickerTutorialPointVar("--tutorial-scroll-from-x", (demo.scrollFrom || demo.from).x);
  setStickerTutorialPointVar("--tutorial-scroll-from-y", (demo.scrollFrom || demo.from).y);
  setStickerTutorialPointVar("--tutorial-scroll-to-x", (demo.scrollTo || demo.to).x);
  setStickerTutorialPointVar("--tutorial-scroll-to-y", (demo.scrollTo || demo.to).y);
  setStickerTutorialPointVar("--tutorial-demo-away-x", (demo.away || demo.to).x);
  setStickerTutorialPointVar("--tutorial-demo-away-y", (demo.away || demo.to).y);
  setStickerTutorialPointVar("--tutorial-demo-choose-left-x", (demo.chooseLeft || demo.from).x);
  setStickerTutorialPointVar("--tutorial-demo-choose-left-y", (demo.chooseLeft || demo.from).y);
  setStickerTutorialPointVar("--tutorial-demo-choose-right-x", (demo.chooseRight || demo.from).x);
  setStickerTutorialPointVar("--tutorial-demo-choose-right-y", (demo.chooseRight || demo.from).y);
  setStickerTutorialPointVar("--tutorial-demo-wander1-x", (demo.wander1 || demo.from).x);
  setStickerTutorialPointVar("--tutorial-demo-wander1-y", (demo.wander1 || demo.from).y);
  setStickerTutorialPointVar("--tutorial-demo-wander2-x", (demo.wander2 || demo.to).x);
  setStickerTutorialPointVar("--tutorial-demo-wander2-y", (demo.wander2 || demo.to).y);
  setStickerTutorialPointVar("--tutorial-demo-wander3-x", (demo.wander3 || demo.to).x);
  setStickerTutorialPointVar("--tutorial-demo-wander3-y", (demo.wander3 || demo.to).y);
  setStickerTutorialPointVar("--tutorial-demo-hover-x", (demo.hover || demo.to).x);
  setStickerTutorialPointVar("--tutorial-demo-hover-y", (demo.hover || demo.to).y);
  setStickerTutorialPointVar("--tutorial-demo-over-target-x", (demo.overTarget || demo.from).x);
  setStickerTutorialPointVar("--tutorial-demo-over-target-y", (demo.overTarget || demo.from).y);
  setStickerTutorialPointVar(
    "--tutorial-demo-find-wander1-x",
    (demo.findWander1 || demo.wander1 || demo.from).x,
  );
  setStickerTutorialPointVar(
    "--tutorial-demo-find-wander1-y",
    (demo.findWander1 || demo.wander1 || demo.from).y,
  );
  setStickerTutorialPointVar(
    "--tutorial-demo-find-over-target-x",
    (demo.findOverTarget || demo.overTarget || demo.from).x,
  );
  setStickerTutorialPointVar(
    "--tutorial-demo-find-over-target-y",
    (demo.findOverTarget || demo.overTarget || demo.from).y,
  );
  setStickerTutorialPointVar(
    "--tutorial-demo-overshoot-x",
    (demo.overshoot || demo.to).x,
  );
  setStickerTutorialPointVar(
    "--tutorial-demo-overshoot-y",
    (demo.overshoot || demo.to).y,
  );
  setStickerTutorialPointVar("--tutorial-ghost-x", demo.from.x);
  setStickerTutorialPointVar("--tutorial-ghost-y", demo.from.y);
  updateStickerTutorialGhost(step, demo.ghostSrc);
  if (!demo.hand) {
    setStickerTutorialPointVar("--tutorial-hand-x", center.x);
    setStickerTutorialPointVar("--tutorial-hand-y", center.y);
  }
}

function setStickerTutorialHandKey(handKey) {
  if (!stickerTutorialHand) {
    return;
  }
  stickerTutorialHand.src = STICKER_TUTORIAL_HANDS[handKey] || STICKER_TUTORIAL_HANDS.open;
}

function stickerTutorialDemoPoints(step, rect) {
  const center = rectCenter(rect);
  const base = { hand: center, from: center, to: center, away: center, ghostSrc: "" };
  if (!step) {
    return base;
  }
  if (step.id === "mode" || step.id === "view") {
    const bottom = rectBottom(rect);
    const restOffset = Math.min(26, Math.max(18, rect.height * 0.34));
    const pressOffset = Math.min(8, Math.max(4, rect.height * 0.1));
    const from = {
      x: center.x,
      y: Math.min(window.innerHeight - 44, bottom + restOffset),
    };
    const to = {
      x: center.x,
      y: Math.min(window.innerHeight - 48, bottom + pressOffset),
    };
    if (step.id === "mode") {
      // Phase 0 (rest): book 右下相当に open hand を出す
      // viewport ベース で clamp、 editButton が右側にあるケースを想定して右下へ
      const rest = {
        x: Math.min(window.innerWidth - 80, center.x + Math.max(180, rect.width * 1.8)),
        y: Math.min(window.innerHeight - 80, from.y + Math.max(120, rect.height * 1.4)),
      };
      return { ...base, hand: rest, from, to, rest };
    }
    return { ...base, hand: from, from, to };
  }
  if (step.id === "page") {
    const point = {
      x: Math.min(window.innerWidth - 44, rectRight(rect) + Math.min(52, Math.max(38, rect.width * 0.22))),
      y: center.y,
    };
    return { ...base, hand: point, from: point, to: point };
  }
  if (step.id === "ok") {
    // v1628: OK step は from=rest (ボタン右隣)、 to=center (ボタン中央 = 押下接触点) に分離。
    // stickerTutorialOkPressDemo keyframe が from↔to を動的に往復し「指で押している」 を表現。
    // v1630: press.y を rect center → 上 1/3 に補正 (rect は padding=12 で上下に膨張しているため
    // center.y は実 button の中心より低く出る。 keyframe 52% の translate(-50%, -28%) と合わさり
    // 指が button 下にめり込んでいた → press.y を rect.top + h*0.30 に上げて着地点を実 button 中央へ)。
    const rest = {
      x: Math.min(window.innerWidth - 44, rectRight(rect) + Math.min(52, Math.max(38, rect.width * 0.22))),
      y: center.y,
    };
    const press = { x: center.x, y: rect.top + rect.height * 0.30 };
    return { ...base, hand: rest, from: rest, to: press };
  }
  if (step.id === "place") {
    const trayRect = expandedElementRect(collectionStickerTrayItems || collectionStickerTray, 10, "16px") || rect;
    const scrollFrom = {
      x: rectRight(trayRect) - Math.min(96, trayRect.width * 0.18),
      y: trayRect.top + trayRect.height * 0.72,
    };
    const scrollTo = {
      x: trayRect.left + Math.min(96, trayRect.width * 0.18),
      y: scrollFrom.y,
    };
    const targetIcon = stickerTutorialTargetTrayIcon();
    const targetIconRect = targetIcon?.getBoundingClientRect();
    const source = targetIconRect?.width
      ? rectCenter(targetIconRect)
      : {
        x: trayRect.left + trayRect.width * 0.52,
        y: trayRect.top + trayRect.height * 0.54,
      };
    const chooseLeft = {
      x: Math.max(trayRect.left + 58, source.x - Math.min(92, trayRect.width * 0.16)),
      y: source.y + 3,
    };
    const chooseRight = {
      x: Math.min(rectRight(trayRect) - 58, source.x + Math.min(92, trayRect.width * 0.16)),
      y: source.y - 2,
    };
    const pageRect = stickerTutorialSidePageRect("right") || stickerTutorialPageRect() || rect;
    const to = { x: pageRect.left + pageRect.width * 0.55, y: pageRect.top + pageRect.height * 0.42 };
    const away = {
      x: Math.min(window.innerWidth - 58, to.x + Math.min(86, pageRect.width * 0.16)),
      y: Math.max(54, to.y - Math.min(72, pageRect.height * 0.16)),
    };

    // === find phase 用 (tray Y 帯に閉じ込め、 横移動オンリー) ===
    const trayBandTop = trayRect.top + 4;
    const trayBandBottom = trayRect.top + trayRect.height - 4;
    const trayLeftEdge = trayRect.left + 40;
    const trayRightEdge = trayRect.left + trayRect.width - 40;
    const clampTrayX = (x) => Math.min(trayRightEdge, Math.max(trayLeftEdge, x));
    const clampTrayY = (y) => Math.min(trayBandBottom, Math.max(trayBandTop, y));
    const findWander1 = {
      // v1627: 左上中継点 (Y -18%) を排除し横移動オンリーに。
      // 旧仕様は CSS keyframe (v1621 rotate/scale) と組み合わさって 「上に上がって下に降りる」 Y ジグザグが目立っていた。
      // X 方向の 「左に振って戻る」 迷い演出は chooseLeft → findOverTarget の左右往復で温存。
      x: clampTrayX(source.x - Math.min(140, trayRect.width * 0.24)),
      y: clampTrayY(source.y),
    };
    const findOverTarget = {
      x: clampTrayX(source.x + Math.min(140, trayRect.width * 0.26)),
      y: clampTrayY(source.y - 4),
    };

    // === place phase 用: 旧 wander/overshoot 群は廃止し、 source → hover → drop の 3 stop 直行 (ゆっくり真っ直ぐ) ===
    // clampViewport は find phase 側の互換のためだけに残す (place 経路では未使用)
    const padX = Math.max(48, window.innerWidth * 0.08);
    const padY = Math.max(48, window.innerHeight * 0.08);
    const clampViewport = (p) => ({
      x: Math.min(window.innerWidth - padX, Math.max(padX, p.x)),
      y: Math.min(window.innerHeight - padY, Math.max(padY, p.y)),
    });
    const hover = clampViewport({
      x: to.x,
      y: Math.max(pageRect.top + 20, to.y - Math.min(56, pageRect.height * 0.10)),
    });
    const overTarget = {
      x: to.x,
      y: to.y - Math.min(48, pageRect.height * 0.06),
    };
    return {
      ...base,
      hand: scrollFrom,
      from: source,
      to,
      away,
      chooseLeft,
      chooseRight,
      scrollFrom,
      scrollTo,
      hover,
      overTarget,
      findWander1,
      findOverTarget,
      ghostSrc: firstVisibleStickerAssetForTutorial(),
    };
  }
  if (step.id === "move") {
    const from = { x: center.x, y: center.y };
    const to = { x: center.x + Math.min(72, Math.max(34, rect.width * 0.55)), y: center.y + Math.min(30, rect.height * 0.35) };
    return { ...base, hand: from, from, to };
  }
  if (step.id === "scale") {
    // v1625: thumb 半径補正版。 initial hand 位置を startScale (現在の thumb 位置) に合わせて起動瞬間のズレを解消。
    // from/to は CSS keyframe (stickerTutorialSliderDemo, JS 起動前の数フレーム) と setStickerTutorialHandBetween の汎用 lerp 用に残置するが、 JS demo は scale → fraction 直マッピングで使わない。
    const placement = (typeof getSelectedPlacement === "function") ? getSelectedPlacement() : null;
    const startScale = THREE.MathUtils.clamp(Number(placement?.scale) || 1, 0.7, 1.35);
    const smallScale = Math.max(0.65, startScale * 0.78);
    const largeScale = Math.min(1.9, startScale * 1.48);
    const sliderMin = 0.35, sliderMax = 2.4, sliderRange = sliderMax - sliderMin;
    const trackPad = 12;
    const thumbR = 8;
    const inputLeft = rect.left + trackPad;
    const inputW = Math.max(rect.width - trackPad * 2, 0);
    const usableW = Math.max(inputW - thumbR * 2, 0);
    const xFor = (s) => inputLeft + thumbR + usableW * THREE.MathUtils.clamp((s - sliderMin) / sliderRange, 0, 1);
    const from = { x: xFor(smallScale), y: center.y };
    const to   = { x: xFor(largeScale), y: center.y };
    const start = { x: xFor(startScale), y: center.y };
    return { ...base, hand: start, from, to };
  }
  if (step.id === "rotate") {
    // v1625: thumb 半径補正版。 initial hand 位置を baseRotation (現在の thumb 位置) に合わせる。
    // from/to は left↔right の sweep 範囲 (CSS keyframe 用)、 JS demo は rotation → fraction 直マッピング。
    const placement = (typeof getSelectedPlacement === "function") ? getSelectedPlacement() : null;
    const baseRotation = Number(placement?.rotation) || 0;
    const rightRotation = THREE.MathUtils.clamp(baseRotation + 28, -180, 180);
    const leftRotation = THREE.MathUtils.clamp(baseRotation - 24, -180, 180);
    const sliderMin = -180, sliderMax = 180, sliderRange = sliderMax - sliderMin;
    const trackPad = 12;
    const thumbR = 8;
    const inputLeft = rect.left + trackPad;
    const inputW = Math.max(rect.width - trackPad * 2, 0);
    const usableW = Math.max(inputW - thumbR * 2, 0);
    const xFor = (r) => inputLeft + thumbR + usableW * THREE.MathUtils.clamp((r - sliderMin) / sliderRange, 0, 1);
    const from = { x: xFor(leftRotation), y: center.y };
    const to   = { x: xFor(rightRotation), y: center.y };
    const start = { x: xFor(baseRotation), y: center.y };
    return { ...base, hand: start, from, to };
  }
  return base;
}

function updateStickerTutorialGhost(step, src) {
  if (!stickerTutorialGhost) {
    return;
  }
  const image = stickerTutorialGhost.querySelector("img");
  const visible = Boolean(step?.ghost && src);
  stickerTutorialGhost.hidden = !visible;
  if (image && visible && image.getAttribute("src") !== src) {
    image.src = src;
  }
}

function interpolateStickerTutorialPath(points, progress) {
  if (!Array.isArray(points) || !points.length) {
    return { x: 50, y: 50 };
  }
  if (points.length === 1) {
    return points[0];
  }
  const clamped = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const t = smootherstep(scaled - index);
  const from = points[index];
  const to = points[index + 1];
  return {
    x: THREE.MathUtils.lerp(from.x, to.x, t),
    y: THREE.MathUtils.lerp(from.y, to.y, t),
  };
}

function stickerTutorialScreenPointForPlacement(placement, point = placement) {
  const page = activeEditorPage || rightBookPageNumber() || activeBookPage || 1;
  const side = Math.round(page) === rightBookPageNumber() ? "right" : "left";
  const pageRect = stickerTutorialSidePageRect(side) || stickerTutorialPageRect();
  if (!pageRect) {
    return rectCenter(stickerTutorialTargetRect({ target: "selectedSticker" }));
  }
  return {
    x: pageRect.left + (THREE.MathUtils.clamp(Number(point.x) || 50, 4, 96) / 100) * pageRect.width,
    y: pageRect.top + (THREE.MathUtils.clamp(Number(point.y) || 50, 4, 96) / 100) * pageRect.height,
  };
}

function firstVisibleStickerAssetForTutorial() {
  // v1640 (task 4): ghost 画像 (DEMO 中に「ここに置くよ」 と見せる残像) は必ず DEMO 素材 (蝶々) を使う。
  // pasteId が ✓ だと ghost が ✓ になり 「お手本」 と誤解される事故を防止。
  const sticker = stickerTutorialPickSticker("demo") || stickerOptions[0];
  return sticker?.assetUrl || "";
}

function stickerTutorialPickSticker(phase) {
  // v1640 (task 4): phase を引数化 (default は現在の phase)。
  // - "demo" / 既定: 必ず STICKER_TUTORIAL_PICK_STICKER_IDS (蝶々) 固定。
  //   pasteId が ✓ (quizland_good_stamp_layer_14) の時に DEMO が ✓ にハイライトされて
  //   「これがお手本」 と誤解させる事故を構造的に防ぐ。
  // - "try": pasteId を最優先 (grant 動線で「いま渡されたシール」 を実際に貼って試させる)。
  // 後方互換: 既存 callsite (引数なし) は phase undefined → "demo" 扱い = 蝶々固定。
  const effectivePhase = phase || stickerTutorialState?.phase || "demo";
  if (effectivePhase === "try" && requestedPasteStickerId) {
    const requested = stickerOptions.find((item) => item.id === requestedPasteStickerId);
    if (requested) return requested;
    // catalog 未マッチ / load race の場合は既存 fallback chain に落とす
  }
  for (const id of STICKER_TUTORIAL_PICK_STICKER_IDS) {
    const sticker = stickerOptions.find((item) => item.id === id);
    if (sticker) {
      return sticker;
    }
  }
  return stickerOptions.find((item) => /butter|chocho|ちょう|蝶/i.test(`${item.id} ${item.label || ""} ${item.name || ""}`))
    || stickerOptions[0]
    || null;
}

function stickerTutorialPickActiveStickers() {
  const stickers = [];
  const main = stickerTutorialPickSticker();
  if (main) stickers.push(main);
  // 1) MAIN の DOM index ±1, ±2, ±3 を順に試行して decoy 2 個を viewport 内に揃える
  const trayButtons = collectionStickerTrayItems
    ? [...collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id]")]
    : [];
  if (main && trayButtons.length) {
    const mainIndex = trayButtons.findIndex((btn) => btn.dataset.stickerTrayId === main.id);
    if (mainIndex >= 0) {
      const offsets = [-1, 1, -2, 2, -3, 3];
      for (const offset of offsets) {
        if (stickers.length >= 3) break;
        const idx = mainIndex + offset;
        if (idx < 0 || idx >= trayButtons.length) continue;
        const id = trayButtons[idx].dataset.stickerTrayId;
        if (!id) continue;
        const candidate = stickerOptions.find((item) => item.id === id);
        if (!candidate || stickers.some((x) => x.id === candidate.id)) continue;
        stickers.push(candidate);
      }
    }
  }
  // 2) 揃わなかった場合のみ fallback: 既存 STICKER_TUTORIAL_DECOY_STICKER_IDS を使う
  if (stickers.length < 3) {
    for (const id of STICKER_TUTORIAL_DECOY_STICKER_IDS) {
      if (stickers.length >= 3) break;
      const s = stickerOptions.find((item) => item.id === id);
      if (s && !stickers.some((x) => x.id === s.id)) stickers.push(s);
    }
  }
  // 3) それでも足りない時は stickerOptions の先頭から補完 (空配列防御)
  if (stickers.length < 3) {
    for (const candidate of stickerOptions) {
      if (stickers.length >= 3) break;
      if (!stickers.some((x) => x.id === candidate.id)) stickers.push(candidate);
    }
  }
  return stickers;
}

function stickerTutorialTargetTrayButton() {
  const sticker = stickerTutorialPickSticker();
  if (!sticker || !collectionStickerTrayItems) {
    return null;
  }
  return [...collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id]")]
    .find((button) => button.dataset.stickerTrayId === sticker.id) || null;
}

function stickerTutorialTargetTrayIcon() {
  return stickerTutorialTargetTrayButton()?.querySelector(".sticker-tray-icon") || visibleStickerTrayIconForTutorial();
}

function updateStickerTutorialTraySilhouettes(enabled = false, withTarget = enabled) {
  document.body.classList.toggle("is-sticker-tutorial-tray-silhouette", Boolean(enabled));
  const activeStickers = enabled && withTarget ? stickerTutorialPickActiveStickers() : [];
  const activeIds = new Set(activeStickers.map((s) => s.id));
  collectionStickerTrayItems?.querySelectorAll("[data-sticker-tray-id]").forEach((button) => {
    button.classList.toggle("is-tutorial-target-sticker", activeIds.has(button.dataset.stickerTrayId));
  });
}

// v1636: target ±2 内の未取得 SR (rarity=super) を silhouette 化するための補助関数群。
// 既存 updateStickerTutorialTraySilhouettes と独立、 per-card class のみで動作。
function readOwnedStickerIds() {
  const owned = new Set();
  try {
    if (window.PonoGameStickers && typeof window.PonoGameStickers.getOwned === "function") {
      const raw = window.PonoGameStickers.getOwned();
      // shape: { "<gameId>": { owned: { "<stickerId>": {count,...} } } } or { stickerId: {...} }
      Object.values(raw || {}).forEach((page) => {
        const map = page && page.owned ? page.owned : page;
        Object.entries(map || {}).forEach(([id, entry]) => {
          if (entry && entry.count > 0) owned.add(id);
        });
      });
    } else {
      const raw = JSON.parse(localStorage.getItem("pono_game_stickers_v1") || "{}");
      Object.values(raw.pages || {}).forEach((page) => {
        Object.entries((page && page.owned) || {}).forEach(([id, entry]) => {
          if (entry && entry.count > 0) owned.add(id);
        });
      });
    }
  } catch (_) {}
  return owned;
}

function pickNearbySuperSilhouetteIds(mainStickerId, ownedSet) {
  if (!collectionStickerTrayItems || !mainStickerId) return [];
  const trayButtons = [...collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id]")];
  const mainIndex = trayButtons.findIndex((btn) => btn.dataset.stickerTrayId === mainStickerId);
  if (mainIndex < 0) return [];
  const offsets = [-2, -1, 1, 2]; // ±2 厳守 (main 自身は除外)
  const ids = [];
  for (const offset of offsets) {
    const idx = mainIndex + offset;
    if (idx < 0 || idx >= trayButtons.length) continue;
    const id = trayButtons[idx].dataset.stickerTrayId;
    const sticker = stickerOptions.find((s) => s.id === id);
    if (!sticker) continue;
    if (sticker.rarity !== "super") continue; // SR 限定
    if (ownedSet.has(id)) continue;            // 取得済みは除外
    ids.push(id);
  }
  return ids;
}

function updateRaritySuperSilhouettes(enabled, mainStickerId) {
  if (!collectionStickerTrayItems) return;
  const cards = collectionStickerTrayItems.querySelectorAll(".sticker-tray-card");
  if (!enabled || !mainStickerId) {
    cards.forEach((c) => c.classList.remove("is-rarity-super-silhouette"));
    return;
  }
  const ownedSet = readOwnedStickerIds();
  const targetIds = new Set(pickNearbySuperSilhouetteIds(mainStickerId, ownedSet));
  cards.forEach((card) => {
    const id = card.dataset.stickerTrayId;
    card.classList.toggle("is-rarity-super-silhouette", targetIds.has(id));
  });
}

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function rectRight(rect) {
  return Number.isFinite(Number(rect?.right)) ? Number(rect.right) : rect.left + rect.width;
}

function rectBottom(rect) {
  return Number.isFinite(Number(rect?.bottom)) ? Number(rect.bottom) : rect.top + rect.height;
}

function setStickerTutorialPointVar(name, value) {
  if (!stickerTutorial) {
    return;
  }
  const number = Number(value);
  stickerTutorial.style.setProperty(name, `${Number.isFinite(number) ? number : 0}px`);
}

function stickerTutorialTargetRect(step) {
  const fallback = {
    left: window.innerWidth * 0.24,
    top: window.innerHeight * 0.24,
    width: window.innerWidth * 0.52,
    height: window.innerHeight * 0.42,
    radius: "22px",
  };
  if (step.target === "editButton") {
    return expandedElementRect(topEditButton, 8, "16px") || fallback;
  }
  if (step.target === "trayItems") {
    // v1643 (task 5): place 完了直後は spotlight を 「貼ったシール」 に再アンカー。
    // 旧仕様は trayItems 固定で 「何も起きてない」 体感だった (シールが画面に乗っているのに
    // 黄枠が tray に残り続けるため達成感が消失)。 complete phase かつ placement があれば
    // selectedSticker rect を優先し、 取れなければ従来 tray rect にフォールバック。
    if (stickerTutorialState?.phase === "complete" && step.id === "place") {
      const placedRect = stickerTutorialSelectedStickerRect();
      if (placedRect) {
        return placedRect;
      }
    }
    return expandedElementRect(collectionStickerTrayItems || collectionStickerTray, 10, "16px") || fallback;
  }
  if (step.target === "firstSticker") {
    const first = visibleStickerTrayIconForTutorial()
      || collectionStickerTrayItems?.querySelector("[data-sticker-tray-id] .sticker-tray-icon");
    return expandedElementRect(first || collectionStickerTrayItems || collectionStickerTray, 10, "16px") || fallback;
  }
  if (step.target === "scaleControl") {
    return expandedElementRect(inlineStickerScale || inlineStickerControls, 12, "16px") || stickerTutorialPageRect() || fallback;
  }
  if (step.target === "rotationControl") {
    return expandedElementRect(inlineStickerRotation || inlineStickerControls, 12, "16px") || stickerTutorialPageRect() || fallback;
  }
  if (step.target === "okButton") {
    // v1625: OK click 直後 inlineStickerControls が hidden になる → live rect が null → fallback で黄枠がページ全体に飛ぶ違和感を解消。
    // live が取れる間は更新し、 hidden 化後 (actionDone=true) は最後の rect を保持して次 step 遷移で自然に消える。
    const live = expandedElementRect(inlineStickerOk, 12, "999px") || expandedElementRect(inlineStickerControls, 12, "999px");
    if (live) {
      stickerTutorialLastOkRect = live;
      return live;
    }
    if (stickerTutorialLastOkRect && stickerTutorialState?.actionDone) {
      return stickerTutorialLastOkRect;
    }
    return stickerTutorialPageRect() || fallback;
  }
  if (step.target === "nextPageButton") {
    return expandedElementRect(bookNextPage, 10, "999px") || fallback;
  }
  if (step.target === "selectedSticker") {
    return stickerTutorialSelectedStickerRect() || stickerTutorialPageRect() || fallback;
  }
  if (step.target === "page") {
    return stickerTutorialPageRect() || fallback;
  }
  if (step.target === "book") {
    return stickerTutorialBookRect() || fallback;
  }
  return fallback;
}

function expandedElementRect(element, padding = 0, radius = "18px") {
  if (!element || element.hidden) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  return {
    left: Math.max(0, rect.left - padding),
    top: Math.max(0, rect.top - padding),
    width: Math.min(window.innerWidth, rect.width + padding * 2),
    height: Math.min(window.innerHeight, rect.height + padding * 2),
    radius,
  };
}

function visibleStickerTrayIconForTutorial() {
  if (!collectionStickerTrayItems) {
    return null;
  }
  const trayRect = collectionStickerTrayItems.getBoundingClientRect();
  const trayCenterX = trayRect.left + trayRect.width / 2;
  let nearest = null;
  let nearestDistance = Infinity;
  collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id] .sticker-tray-icon").forEach((icon) => {
    const rect = icon.getBoundingClientRect();
    const visible = rect.right > trayRect.left + 4
      && rect.left < trayRect.right - 4
      && rect.bottom > trayRect.top + 4
      && rect.top < trayRect.bottom - 4;
    if (!visible) {
      return;
    }
    const distance = Math.abs(rect.left + rect.width / 2 - trayCenterX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = icon;
    }
  });
  return nearest;
}

function stickerTutorialSelectedStickerRect() {
  const placement = getSelectedPlacement();
  if (!placement) {
    return null;
  }
  const page = activeEditorPage || activeBookPage;
  const side = Math.round(page) === rightBookPageNumber() ? "right" : "left";
  const pageRect = stickerTutorialSidePageRect(side);
  if (!pageRect) {
    return null;
  }
  const scale = sanitizedPlacementScale(placement.scale);
  const width = Math.max(46, Math.min(pageRect.width, pageRect.height) * 0.17 * scale);
  const aspect = stickerAspectForPlacement(placement);
  const height = width / Math.max(0.35, aspect);
  const center = {
    x: pageRect.left + (THREE.MathUtils.clamp(Number(placement.x) || 50, 4, 96) / 100) * pageRect.width,
    y: pageRect.top + (THREE.MathUtils.clamp(Number(placement.y) || 50, 4, 96) / 100) * pageRect.height,
  };
  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    right: center.x + width / 2,
    bottom: center.y + height / 2,
    width,
    height,
    radius: "18px",
  };
}

function stickerTutorialSidePageRect(side) {
  const mesh = side === "left" ? leftPageInner : rightPage;
  return mesh?.visible ? projectedMeshClientRect(mesh) : null;
}

function stickerTutorialPageRect() {
  const candidates = [rightPage, leftPageInner]
    .filter((mesh) => mesh?.visible)
    .map((mesh) => projectedMeshClientRect(mesh))
    .filter(Boolean);
  if (!candidates.length) {
    return null;
  }
  return combineClientRects(candidates, 10, "24px");
}

function stickerTutorialBookRect() {
  const candidates = [rightPage, leftPageInner, coverOnly]
    .filter((mesh) => mesh?.visible)
    .map((mesh) => projectedMeshClientRect(mesh))
    .filter(Boolean);
  if (!candidates.length) {
    return stickerTutorialPageRect();
  }
  return combineClientRects(candidates, 12, "26px");
}

function combineClientRects(rects, padding = 0, radius = "18px") {
  const left = Math.max(0, Math.min(...rects.map((rect) => rect.left)) - padding);
  const top = Math.max(0, Math.min(...rects.map((rect) => rect.top)) - padding);
  const right = Math.min(window.innerWidth, Math.max(...rects.map((rect) => rect.right)) + padding);
  const bottom = Math.min(window.innerHeight, Math.max(...rects.map((rect) => rect.bottom)) + padding);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    radius,
  };
}

function removeStickerTutorialStepClasses() {
  for (const className of [...document.body.classList]) {
    if (className.startsWith("is-sticker-tutorial-step-")) {
      document.body.classList.remove(className);
    }
  }
}

function hasSeenStickerTutorial() {
  try {
    return localStorage.getItem(STICKER_TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markStickerTutorialSeen() {
  try {
    localStorage.setItem(STICKER_TUTORIAL_SEEN_KEY, "1");
  } catch {}
}

function toggleZukanSettingsPanel() {
  if (!zukanSettingsPanel) {
    return;
  }
  if (zukanSettingsPanel.hidden) {
    openZukanSettingsPanel();
  } else {
    closeZukanSettingsPanel();
  }
}

function openZukanSettingsPanel(options = {}) {
  if (!zukanSettingsPanel) {
    return;
  }
  closeBookThemePanel();
  zukanSettingsPanel.hidden = false;
  syncTopSettingsButton();
}

function closeZukanSettingsPanel() {
  if (!zukanSettingsPanel) {
    return;
  }
  zukanSettingsPanel.hidden = true;
  syncTopSettingsButton();
}

function toggleBookThemePanel() {
  if (!bookThemePanel) {
    return;
  }
  if (bookThemePanel.hidden) {
    openBookThemePanel();
  } else {
    closeBookThemePanel();
  }
}

function openBookThemePanel() {
  if (!bookThemePanel) {
    return;
  }
  closeZukanSettingsPanel();
  bookThemePanel.hidden = false;
  syncTopSettingsButton();
}

function closeBookThemePanel() {
  if (!bookThemePanel) {
    return;
  }
  bookThemePanel.hidden = true;
  syncTopSettingsButton();
}

function navigateBackToPlay() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.assign("../../play.html");
}

function openZukanTuningMode() {
  const url = new URL(window.location.href);
  url.searchParams.set("album", "collection");
  url.searchParams.set("surface", "inside");
  url.searchParams.set("page", String(activeBookPage));
  url.searchParams.set("tune", "1");
  window.location.href = url.toString();
}

function pageNumberForPickedPage(mesh) {
  if (mesh === leftPageInner) {
    return activeBookPage;
  }
  if (mesh === rightPage) {
    return rightBookPageNumber();
  }
  return activeBookPage;
}

function setupCollectionStickerTray() {
  if (!collectionStickerTray || !collectionStickerTrayItems) {
    return;
  }
  collectionStickerTray.addEventListener("click", (event) => {
    if (suppressStickerTrayClick) {
      event.preventDefault();
      suppressStickerTrayClick = false;
      return;
    }
    const stickerButton = event.target.closest("[data-sticker-tray-id]");
    if (stickerButton && collectionStickerTray.contains(stickerButton)) {
      if (activeAlbumMode !== "collection" && activeSurface === "inside") {
        event.preventDefault();
      }
      return;
    }
    const button = event.target.closest("[data-collection-toc-category]");
    if (!button || !collectionStickerTray.contains(button)) {
      return;
    }
    const categoryId = button.dataset.collectionTocCategory || "";
    if (!categoryId || button.disabled) {
      return;
    }
    event.preventDefault();
    navigateCollectionTocCategory(categoryId);
  });
  collectionStickerTray.addEventListener("pointerdown", handleStickerTrayPointerDown);
  collectionStickerTray.addEventListener("dragstart", (event) => {
    if (event.target.closest?.("[data-sticker-tray-id]")) {
      event.preventDefault();
    }
  });
  collectionStickerTrayItems.addEventListener("scroll", () => {
    window.requestAnimationFrame(updateStickerTrayCounter);
    if (!stickerTutorialProgrammaticTrayScroll && performance.now() > stickerTutorialProgrammaticTrayScrollUntil) {
      notifyStickerTutorialAction("trayScroll");
    }
  }, { passive: true });
  window.addEventListener("pointermove", handleStickerTrayPointerMove);
  window.addEventListener("pointerup", endStickerTrayDrag);
  window.addEventListener("pointercancel", cancelStickerTrayDrag);
  renderCollectionStickerTray();
}

function setupStickerTrayReveal() {
  window.addEventListener("pointermove", updateStickerTrayPeekFromPointer);
  window.addEventListener("pointerleave", () => setStickerTrayPeek(false));
  window.addEventListener("touchstart", (event) => {
    if (!canUseStickerTrayPeek()) {
      stickerTrayTouchStartY = 0;
      return;
    }
    const touch = event.touches?.[0];
    stickerTrayTouchStartY = touch && touch.clientY > window.innerHeight - 76 ? touch.clientY : 0;
  }, { passive: true });
  window.addEventListener("touchmove", (event) => {
    const touch = event.touches?.[0];
    if (!touch || !stickerTrayTouchStartY) {
      return;
    }
    if (stickerTrayTouchStartY - touch.clientY > 18) {
      setStickerTrayPeek(true);
      scheduleStickerTrayPeekHide();
      stickerTrayTouchStartY = 0;
    }
  }, { passive: true });
}

function updateStickerTrayPeekFromPointer(event) {
  if (event.pointerType && event.pointerType !== "mouse") {
    return;
  }
  if (!canUseStickerTrayPeek()) {
    setStickerTrayPeek(false);
    return;
  }
  const trayRect = collectionStickerTray?.getBoundingClientRect();
  const inTray = trayRect && event.clientY >= trayRect.top - 8 && event.clientY <= trayRect.bottom + 8;
  const nearBottom = event.clientY >= window.innerHeight - 92;
  setStickerTrayPeek(Boolean(nearBottom || inTray || stickerTrayDragState));
}

function canUseStickerTrayPeek() {
  return activeAlbumMode !== "collection"
    && stickerEditMode
    && activeSurface === "inside"
    && Boolean(collectionStickerTray)
    && !collectionStickerTray.hidden
    && !isInlineStickerPanelOpen();
}

function setStickerTrayPeek(visible) {
  document.body.classList.toggle("is-sticker-tray-peek", Boolean(visible && canUseStickerTrayPeek()));
}

function scheduleStickerTrayPeekHide() {
  window.clearTimeout(stickerTrayRevealHideTimer);
  stickerTrayRevealHideTimer = window.setTimeout(() => {
    if (!stickerTrayDragState) {
      setStickerTrayPeek(false);
    }
  }, 3000);
}

function renderCollectionStickerTray() {
  if (!collectionStickerTray || !collectionStickerTrayItems) {
    return;
  }
  collectionStickerTray.classList.toggle("is-sticker-source", activeAlbumMode !== "collection");
  if (activeAlbumMode !== "collection") {
    renderStickerThumbnailTray();
    return;
  }
  const fragment = document.createDocumentFragment();
  const title = document.createElement("span");
  title.className = "collection-toc-title";
  title.textContent = "もくじ";
  title.setAttribute("aria-hidden", "true");
  fragment.append(title);

  const categories = buildCollectionTocCategories();
  for (const category of categories) {
    const progressRatio = category.total > 0 ? category.found / category.total : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collection-toc-card";
    button.dataset.collectionTocCategory = category.id;
    button.setAttribute("aria-label", `${category.label}のずかんへ`);
    button.title = category.label;
    if (!Number.isFinite(category.targetPage)) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }

    const icon = document.createElement("span");
    icon.className = "collection-toc-icon";
    icon.setAttribute("aria-hidden", "true");
    if (category.representative) {
      const image = document.createElement("img");
      image.className = "collection-toc-image";
      image.src = category.representative.assetUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      icon.append(image);
    } else {
      const mystery = document.createElement("span");
      mystery.className = "collection-toc-mystery";
      mystery.textContent = "？";
      icon.append(mystery);
    }

    const label = document.createElement("span");
    label.className = "collection-toc-label";
    label.textContent = category.label;

    const bar = document.createElement("span");
    bar.className = "collection-toc-bar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "collection-toc-bar-fill";
    fill.style.width = `${Math.round(progressRatio * 100)}%`;
    bar.append(fill);

    button.append(icon, label, bar);
    fragment.append(button);
  }
  collectionStickerTrayItems.replaceChildren(fragment);
  updateCollectionTraySelection();
  updateCollectionStickerTrayVisibility();
  updateStickerTrayCounter();
}

function renderStickerThumbnailTray() {
  if (!collectionStickerTray || !collectionStickerTrayItems) {
    return;
  }
  const fragment = document.createDocumentFragment();
  const title = document.createElement("span");
  title.className = "collection-toc-title";
  title.textContent = "シール";
  title.setAttribute("aria-hidden", "true");
  fragment.append(title);

  const pendingImages = [];
  for (const sticker of stickerOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collection-toc-card sticker-tray-card";
    button.dataset.stickerTrayId = sticker.id;
    button.draggable = false;
    button.setAttribute("aria-label", `${sticker.label}を ドラッグして はる`);
    button.title = sticker.label;

    const icon = document.createElement("span");
    icon.className = "collection-toc-icon sticker-tray-icon";
    icon.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.className = "collection-toc-image";
    image.src = sticker.assetUrl;
    image.alt = "";
    // v1627: lazy → eager に変更し tray 表示時点で全 sticker を並列 fetch 開始 (切替時の「グレー空欄」 対策)。
    image.loading = "eager";
    image.decoding = "async";
    image.draggable = false;
    pendingImages.push(image);
    icon.append(image);

    button.append(icon);
    fragment.append(button);
  }
  collectionStickerTrayItems.replaceChildren(fragment);
  // v1627: 全 icon ロード完了まで tray を visibility:hidden で隠して切替時の点滅を防止 (CLS 回避のため opacity ではなく visibility)。
  // error も resolve でブロックせず (1 個 404 で全体停止防止)、 最終的に必ず class を外す。
  collectionStickerTrayItems.classList.add("is-loading");
  const waitFor = (img) => new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    const done = () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      resolve();
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
  Promise.all(pendingImages.map(waitFor)).then(() => {
    collectionStickerTrayItems?.classList.remove("is-loading");
  });
  if (stickerTutorialState) {
    const tutorialStepId = currentStickerTutorialStep()?.id;
    updateStickerTutorialTraySilhouettes(true, tutorialStepId === "place");
    updateRaritySuperSilhouettes(true, stickerTutorialPickSticker()?.id);
  } else {
    updateStickerTutorialTraySilhouettes(false);
    updateRaritySuperSilhouettes(false);
  }
  updateCollectionStickerTrayVisibility();
  updateStickerTrayCounter();
}

function updateStickerTrayCounter() {
  if (!stickerTrayCounter || !collectionStickerTray || !collectionStickerTrayItems) {
    return;
  }
  const visible = activeAlbumMode !== "collection"
    && stickerEditMode
    && activeSurface === "inside"
    && !collectionStickerTray.hidden
    && stickerOptions.length > 0;
  stickerTrayCounter.hidden = !visible;
  if (!visible) {
    return;
  }
  const cards = [...collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id]")];
  if (!cards.length) {
    stickerTrayCounter.textContent = "0 / 0";
    stickerTrayCounter.setAttribute("aria-label", "シールは ありません");
    return;
  }
  const trayRect = collectionStickerTrayItems.getBoundingClientRect();
  const centerX = trayRect.left + trayRect.width / 2;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - centerX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const current = nearestIndex + 1;
  const total = cards.length;
  stickerTrayCounter.textContent = `${current} / ${total}`;
  stickerTrayCounter.setAttribute("aria-label", `${total}このうち ${current}こめのシール`);
}

function handleStickerTrayPointerDown(event) {
  if (
    activeAlbumMode === "collection"
    || !stickerEditMode
    || activeSurface !== "inside"
    || coverOpenAnimation
    || spreadJumpAnimation
    || isInlineStickerPanelOpen()
    || (stickerEditor && !stickerEditor.hidden)
  ) {
    return;
  }
  const button = event.target.closest("[data-sticker-tray-id]");
  if (!button || !collectionStickerTray?.contains(button)) {
    return;
  }
  const icon = event.target.closest(".sticker-tray-icon");
  if (!icon || !button.contains(icon)) {
    return;
  }
  const sticker = stickerOptions.find((item) => item.id === button.dataset.stickerTrayId);
  if (!sticker) {
    return;
  }
  notifyStickerTutorialAction("pickSticker");
  stickerTrayDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    sticker,
    source: button,
    dragging: false,
    ghost: null,
  };
  // v1646 (task 5): pointerdown 即時 preventDefault は廃止。
  // .sticker-tray-icon の touch-action: pan-x と組み合わせ、 横スライドは native scroll に委譲。
  // threshold (8px) を超えた pointermove 側 (handleStickerTrayPointerMove L~5976) で preventDefault する。
  // マウスは pointercapture を維持しないと drag 中に focus 喪失するため pointerType==="mouse" 分岐は据置。
  if (event.pointerType === "mouse") {
    try {
      button.setPointerCapture?.(event.pointerId);
    } catch {}
  }
}

function handleStickerTrayPointerMove(event) {
  const state = stickerTrayDragState;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }
  if (!state.dragging) {
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const distance = Math.hypot(dx, dy);
    if (distance < STICKER_TRAY_DRAG_THRESHOLD) {
      return;
    }
    const trayRect = collectionStickerTray?.getBoundingClientRect();
    const outsideTray = trayRect && (
      event.clientY < trayRect.top
      || event.clientY > trayRect.bottom
      || event.clientX < trayRect.left
      || event.clientX > trayRect.right
    );
    const verticalDrag = Math.abs(dy) > Math.abs(dx) * 0.62;
    if (!outsideTray && !verticalDrag) {
      return;
    }
    startStickerTrayDrag(state, event);
  }
  event.preventDefault();
  positionStickerTrayGhost(state, event.clientX, event.clientY);
  maybeScheduleStickerDragPageTurn(event);
}

function startStickerTrayDrag(state, event) {
  state.dragging = true;
  suppressStickerTrayClick = true;
  state.source?.classList.add("is-dragging");
  document.body.classList.add("is-sticker-tray-dragging");
  try {
    state.source?.setPointerCapture?.(event.pointerId);
  } catch {}

  const ghost = document.createElement("div");
  ghost.className = "sticker-tray-drag-ghost";
  const image = document.createElement("img");
  image.src = state.sticker.assetUrl;
  image.alt = "";
  image.draggable = false;
  ghost.append(image);
  document.body.append(ghost);
  state.ghost = ghost;
  positionStickerTrayGhost(state, event.clientX, event.clientY);
}

function positionStickerTrayGhost(state, x, y) {
  if (!state?.ghost) {
    return;
  }
  state.ghost.style.left = `${x}px`;
  state.ghost.style.top = `${y}px`;
}

function maybeScheduleStickerDragPageTurn(event) {
  const direction = stickerDragPageTurnDirection(event);
  if (!direction) {
    cancelStickerTutorialDragPageTurn();
    return;
  }
  if (stickerTutorialDragPageTurnTimer && stickerTutorialDragPageTurnDirection === direction) {
    return;
  }
  cancelStickerTutorialDragPageTurn();
  stickerTutorialDragPageTurnDirection = direction;
  stickerTutorialDragPageTurnTimer = window.setTimeout(() => {
    stickerTutorialDragPageTurnTimer = 0;
    const currentDirection = stickerTutorialDragPageTurnDirection;
    stickerTutorialDragPageTurnDirection = 0;
    turnPageDuringStickerDrag(currentDirection);
  }, 620);
}

function stickerDragPageTurnDirection(event) {
  if (activeSurface !== "inside" || coverOpenAnimation || spreadJumpAnimation) {
    return 0;
  }
  if (bookNextPage && !bookNextPage.disabled && pointInExpandedElement(event, bookNextPage, 18)) {
    return 1;
  }
  if (bookPrevPage && !bookPrevPage.disabled && pointInExpandedElement(event, bookPrevPage, 18)) {
    return -1;
  }
  return 0;
}

function pointInExpandedElement(event, element, padding = 0) {
  const rect = element?.getBoundingClientRect();
  if (!rect?.width || !rect.height) {
    return false;
  }
  return event.clientX >= rect.left - padding
    && event.clientX <= rect.right + padding
    && event.clientY >= rect.top - padding
    && event.clientY <= rect.bottom + padding;
}

function turnPageDuringStickerDrag(direction) {
  if (!direction || activeSurface !== "inside") {
    return;
  }
  if (direction > 0) {
    const nextPage = activeBookPage + 2;
    if (nextPage <= spreadStartForPage(editorPageCount())) {
      setBookPage(nextPage, { turnMode: "single", skipEditorSync: true });
      setStickerTrayPeek(true);
      scheduleStickerTutorialLayout();
    }
    return;
  }
  if (activeBookPage > 1) {
    setBookPage(activeBookPage - 2, { turnMode: "single", skipEditorSync: true });
    setStickerTrayPeek(true);
    scheduleStickerTutorialLayout();
  }
}

function cancelStickerTutorialDragPageTurn() {
  if (stickerTutorialDragPageTurnTimer) {
    window.clearTimeout(stickerTutorialDragPageTurnTimer);
    stickerTutorialDragPageTurnTimer = 0;
  }
  stickerTutorialDragPageTurnDirection = 0;
}

function endStickerTrayDrag(event) {
  const state = stickerTrayDragState;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }
  if (state.dragging) {
    event.preventDefault();
    let target = stickerTrayDropTarget(event);
    // v1646 (task 3): place TRY 中だけ、 drop が miss しても本ページ中央に貼れる「サルベージ」 を有効化。
    // 子供の指がページ AABB から外れる事故 (8px pad 外し) で 「貼ったつもりが消えた」 体感を排除。
    if (!target) {
      const tutorialStep = currentStickerTutorialStep?.();
      const tutorialPhase = stickerTutorialState?.phase;
      if (tutorialStep?.id === "place" && tutorialPhase === "try") {
        const fallbackMesh = (rightPage?.visible ? rightPage : (leftPageInner?.visible ? leftPageInner : null));
        if (fallbackMesh) {
          const fallbackPage = pageNumberForPickedPage(fallbackMesh);
          target = { page: fallbackPage, point: { x: 54, y: 42 } };
        }
      }
    }
    if (target) {
      addStickerFromTrayToPage(state.sticker.id, target.page, target.point);
    }
  }
  cancelStickerTutorialDragPageTurn();
  cleanupStickerTrayDrag(state.dragging);
}

function cancelStickerTrayDrag(event) {
  if (!stickerTrayDragState) {
    return;
  }
  if (event?.pointerId != null && event.pointerId !== stickerTrayDragState.pointerId) {
    return;
  }
  cancelStickerTutorialDragPageTurn();
  cleanupStickerTrayDrag(stickerTrayDragState.dragging);
}

function cleanupStickerTrayDrag(suppressClick = false) {
  const state = stickerTrayDragState;
  if (!state) {
    return;
  }
  cancelStickerTutorialDragPageTurn();
  state.source?.classList.remove("is-dragging");
  try {
    if (state.source?.hasPointerCapture?.(state.pointerId)) {
      state.source.releasePointerCapture(state.pointerId);
    }
  } catch {}
  state.ghost?.remove();
  stickerTrayDragState = null;
  document.body.classList.remove("is-sticker-tray-dragging");
  if (suppressClick) {
    suppressStickerTrayClick = true;
    window.setTimeout(() => {
      suppressStickerTrayClick = false;
    }, 180);
    // v1650 (task 2): canvas 側の合成 click も 250ms 抑止。 drop 直後の
    // refreshPageTemplateTextures 2 回目発火 (blank canvas → spotlight pulse 空打ち) を防止。
    suppressSceneClickAfterStickerDrop = true;
    window.setTimeout(() => {
      suppressSceneClickAfterStickerDrop = false;
    }, 250);
  }
}

function stickerTrayDropTarget(event) {
  if (
    activeAlbumMode === "collection"
    || activeSurface !== "inside"
    || coverOpenAnimation
    || spreadJumpAnimation
    || isInlineStickerPanelOpen()
    || (stickerEditor && !stickerEditor.hidden)
  ) {
    return null;
  }
  const hit = pickScenePageHit(event);
  if (hit?.uv && hit.object) {
    const page = pageNumberForPickedPage(hit.object);
    const point = texturePointFromPageHit(hit);
    return {
      page,
      point: {
        x: THREE.MathUtils.clamp((point.x / PAGE_TEXTURE_W) * 100, 4, 96),
        y: THREE.MathUtils.clamp((point.y / PAGE_TEXTURE_H) * 100, 4, 96),
      },
    };
  }
  return projectedStickerTrayDropTarget(event);
}

function projectedStickerTrayDropTarget(event) {
  const candidates = [rightPage, leftPageInner].filter((mesh) => mesh?.visible);
  for (const mesh of candidates) {
    const rect = projectedMeshClientRect(mesh);
    if (!rect) {
      continue;
    }
    const pad = 8;
    if (
      event.clientX < rect.left - pad
      || event.clientX > rect.right + pad
      || event.clientY < rect.top - pad
      || event.clientY > rect.bottom + pad
    ) {
      continue;
    }
    return {
      page: pageNumberForPickedPage(mesh),
      point: {
        x: THREE.MathUtils.clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 4, 96),
        y: THREE.MathUtils.clamp(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 4, 96),
      },
    };
  }
  return null;
}

function projectedMeshClientRect(mesh) {
  if (!mesh?.geometry) {
    return null;
  }
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }
  const box = mesh.geometry.boundingBox;
  if (!box) {
    return null;
  }
  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) {
    return null;
  }
  mesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  const xs = [];
  const ys = [];
  for (const corner of corners) {
    corner.applyMatrix4(mesh.matrixWorld).project(camera);
    xs.push(canvasRect.left + ((corner.x + 1) / 2) * canvasRect.width);
    ys.push(canvasRect.top + ((1 - corner.y) / 2) * canvasRect.height);
  }
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

async function addStickerFromTrayToPage(stickerId, page, point = {}) {
  const sticker = stickerOptions.find((item) => item.id === stickerId);
  if (!sticker || activeAlbumMode === "collection") {
    return;
  }
  const pageNumber = THREE.MathUtils.clamp(Math.round(page) || activeBookPage, 1, editorPageCount());
  const placements = getPagePlacements(pageNumber);
  const placement = {
    id: createPlacementId(),
    stickerId: sticker.id,
    label: sticker.label,
    assetUrl: sticker.assetUrl,
    x: THREE.MathUtils.clamp(Number(point.x) || 50, 4, 96),
    y: THREE.MathUtils.clamp(Number(point.y) || 50, 4, 96),
    scale: defaultStickerScale(sticker),
    rotation: 0,
    z: nextPlacementZ(placements),
  };
  placements.push(placement);
  activeEditorPage = pageNumber;
  selectedPlacementId = placement.id;
  saveEditorState();
  // v1650 (task 2): refreshPageTemplateTextures より前に decode 完了を待つ。
  // 旧仕様は loadStickerImage(...).then(...) を fire-and-forget して直ぐ
  // refreshPageTemplateTextures → 新 CanvasTexture を空 canvas のまま GPU upload してしまい、
  // microtask 解決後の drawAsyncPlacedSticker は GPU 反映に更に 1 フレーム遅れていた。
  // ここで 1 回 await することで decode 済 (同期 drawImage 可能) 状態を保証 → blank frame ゼロ化。
  // 失敗時は無視して既存挙動 (after-the-fact 描画) にフォールバック。
  await loadStickerImage(placement.assetUrl).catch(() => null);
  refreshPageTemplateTextures();
  updatePage(flipProgress);
  updateInlineStickerControls();
  notifyStickerTutorialAction("dropSticker");
}

function buildCollectionTocCategories() {
  return COLLECTION_TOC_CATEGORY_DEFS.map((definition) => {
    const stickers = collectionStickerOptions.filter((sticker) => collectionStickerMatchesTocCategory(sticker, definition));
    const firstPageIndex = collectionPageDefinitions.findIndex((pageDef) => (
      pageDef.categoryId === definition.id
      || collectionStickersForPageDefinition(pageDef).some((sticker) => collectionStickerMatchesTocCategory(sticker, definition))
    ));
    const targetPage = firstPageIndex >= 0 ? firstPageIndex + 1 : Number.NaN;
    return {
      ...definition,
      stickers,
      targetPage,
      found: stickers.filter((sticker) => sticker.unlock === "found").length,
      total: stickers.length,
      representative: representativeCollectionTocSticker(definition, stickers),
    };
  });
}

function collectionTocPageCount() {
  return Math.max(
    1,
    collectionPageDefinitions.length,
    Math.ceil(collectionStickerOptions.length / COLLECTION_ALBUM_STICKERS_PER_PAGE),
  );
}

function buildCollectionZukanSubjects(stickers) {
  const stickersById = new Map(stickers.map((sticker) => [sticker.id, sticker]));
  return COLLECTION_ZUKAN_SUBJECT_DEFS
    .map((subjectDef, index) => {
      const sourceStickers = (subjectDef.sourceStickerIds || [])
        .map((id) => stickersById.get(id))
        .filter(Boolean);
      const sourceSticker = sourceStickers.find((sticker) => canShowSpecificCollectionSticker(sticker))
        || sourceStickers[0]
        || null;
      if (!sourceSticker) {
        return null;
      }
      return {
        ...sourceSticker,
        ...subjectDef,
        id: subjectDef.id,
        sourceStickerId: sourceSticker.id,
        sourceStickerIds: [...(subjectDef.sourceStickerIds || [])],
        gameId: sourceSticker.gameId || "zukan",
        view: sourceSticker.view || subjectDef.categoryId,
        label: subjectDef.label,
        kana: subjectDef.kana || subjectDef.label,
        sort: Number.isFinite(Number(subjectDef.sort)) ? Number(subjectDef.sort) : index + 1,
        unlock: sourceSticker.unlock || "found",
        listNote: subjectDef.group,
        assetStatus: sourceSticker.assetStatus || (sourceSticker.assetUrl ? "existing" : "missing"),
        assetPath: sourceSticker.assetPath || "",
        assetUrl: sourceSticker.assetUrl || "",
        nameIdeas: [subjectDef.label],
        isZukanSubject: true,
      };
    })
    .filter(Boolean);
}

function collectionStickerMatchesTocCategory(sticker, category) {
  if (!sticker || !category) {
    return false;
  }
  if (sticker.categoryId && sticker.categoryId === category.id) {
    return true;
  }
  if (Array.isArray(category.excludeCategoryIds)) {
    for (const excludeId of category.excludeCategoryIds) {
      const excludedCategory = COLLECTION_TOC_CATEGORY_DEFS.find((definition) => definition.id === excludeId);
      if (excludedCategory && collectionStickerMatchesTocCategory(sticker, excludedCategory)) {
        return false;
      }
    }
  }
  const viewMatch = Array.isArray(category.viewIds) && category.viewIds.includes(sticker.view);
  const searchText = collectionStickerSearchText(sticker);
  const keywordMatch = Array.isArray(category.keywords)
    && category.keywords.some((keyword) => searchText.includes(String(keyword).toLowerCase()));
  return Boolean(viewMatch || keywordMatch);
}

function collectionStickerSearchText(sticker) {
  return [
    sticker.id,
    sticker.gameId,
    sticker.view,
    sticker.label,
    sticker.kana,
    sticker.listNote,
    ...(Array.isArray(sticker.nameIdeas) ? sticker.nameIdeas : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortCollectionStickersForZukan(stickers) {
  return [...stickers].sort((a, b) => (
    collectionZukanCategoryIndex(a) - collectionZukanCategoryIndex(b)
    || collectionZukanUnlockRank(a) - collectionZukanUnlockRank(b)
    || collectionZukanGameOrder(a.gameId) - collectionZukanGameOrder(b.gameId)
    || collectionZukanSortValue(a) - collectionZukanSortValue(b)
    || String(a.kana || a.label || a.id).localeCompare(String(b.kana || b.label || b.id), "ja")
  ));
}

function collectionZukanCategoryForSticker(sticker) {
  return COLLECTION_TOC_CATEGORY_DEFS.find((definition) => collectionStickerMatchesTocCategory(sticker, definition)) || null;
}

function collectionZukanCategoryIndex(sticker) {
  const category = collectionZukanCategoryForSticker(sticker);
  const index = category ? COLLECTION_TOC_CATEGORY_DEFS.findIndex((definition) => definition.id === category.id) : -1;
  return index >= 0 ? index : COLLECTION_TOC_CATEGORY_DEFS.length;
}

function collectionZukanUnlockRank(sticker) {
  if (sticker?.unlock === "found") {
    return 0;
  }
  if (sticker?.unlock === "hidden") {
    return 1;
  }
  return 2;
}

function collectionZukanGameOrder(gameId) {
  const games = Array.isArray(stickerPlan?.games) ? stickerPlan.games : [];
  const index = games.findIndex((game) => game.id === gameId);
  return index >= 0 ? index : 999;
}

function collectionZukanSortValue(sticker) {
  const parsed = Number(sticker?.sort);
  return Number.isFinite(parsed) ? parsed : 9999;
}

function collectionZukanPageTitle(stickers) {
  if (!stickers.length) {
    return {
      label: "ずかん",
      subtitle: "みつけたものを しらべよう",
    };
  }
  const ranked = COLLECTION_TOC_CATEGORY_DEFS
    .map((category, index) => ({
      category,
      index,
      count: stickers.filter((sticker) => collectionStickerMatchesTocCategory(sticker, category)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index);
  const category = ranked[0]?.category || null;
  if (!category) {
    return {
      label: "ずかん",
      subtitle: "いろいろな ものを しらべよう",
    };
  }
  return {
    label: category.pageLabel || `${category.label}ずかん`,
    subtitle: category.summary || "みつけたものを しらべよう",
  };
}

function collectionZukanCardNote(sticker, found, canShowSpecificItem) {
  if (!canShowSpecificItem) {
    return "まだ みつけていないよ";
  }
  if (!found) {
    return sticker.group || "まだ しらべていないよ";
  }
  return sticker.group || sticker.listNote || "くわしく みてみよう";
}

function canShowSpecificCollectionSticker(sticker) {
  return sticker?.assetStatus === "existing" && Boolean(sticker.assetUrl);
}

function representativeCollectionTocSticker(category, stickers) {
  const preferredIds = [
    ...(Array.isArray(category.representativeSubjectIds) ? category.representativeSubjectIds : []),
    ...(Array.isArray(category.representativeStickerIds) ? category.representativeStickerIds : []),
  ];
  return stickers
    .filter((sticker) => canShowSpecificCollectionSticker(sticker))
    .map((sticker, index) => ({
      sticker,
      index,
      foundRank: sticker.unlock === "found" ? 0 : 1,
      preferredRank: preferredIds.includes(sticker.id) ? preferredIds.indexOf(sticker.id) : 999,
      sortRank: Number.isFinite(Number(sticker.sort)) ? Number(sticker.sort) : 9999,
    }))
    .sort((a, b) => (
      a.foundRank - b.foundRank
      || a.preferredRank - b.preferredRank
      || a.sortRank - b.sortRank
      || a.index - b.index
    ))[0]?.sticker || null;
}

function navigateCollectionTocCategory(categoryId) {
  const category = buildCollectionTocCategories().find((item) => item.id === categoryId);
  if (!category || !Number.isFinite(category.targetPage)) {
    return;
  }
  activeCollectionTocCategoryId = category.id;
  pendingCollectionTocCategoryId = category.id;
  const targetPage = spreadStartForPage(category.targetPage);
  closeBookPageJump();
  if (activeSurface === "cover") {
    setBookSurface("inside", targetPage, { preserveCollectionTocPending: true });
    return;
  }
  setBookPage(targetPage, {
    turnMode: Math.abs(targetPage - activeBookPage) <= 2 ? "single" : "jump",
    preserveCollectionTocPending: true,
  });
}

function navigateCollectionZukanTarget(target) {
  const targetPage = Number(target?.targetPage);
  if (!Number.isFinite(targetPage)) {
    return;
  }
  const pageDef = collectionPageDefinitions[Math.max(1, Math.round(targetPage)) - 1] || null;
  activeCollectionTocCategoryId = pageDef?.categoryId || target.categoryId || activeCollectionTocCategoryId;
  pendingCollectionTocCategoryId = activeCollectionTocCategoryId;
  closeBookPageJump();
  if (activeSurface === "cover") {
    setBookSurface("inside", targetPage, { preserveCollectionTocPending: true });
    return;
  }
  setBookPage(targetPage, {
    turnMode: Math.abs(spreadStartForPage(targetPage) - activeBookPage) <= 2 ? "single" : "jump",
    preserveCollectionTocPending: true,
  });
}

function availableCollectionStickers() {
  return collectionStickerOptions.filter((sticker) => Boolean(sticker.assetUrl));
}

function updateCollectionStickerTrayVisibility() {
  if (!collectionStickerTray) {
    return;
  }
  const itemCount = activeAlbumMode === "collection" ? collectionStickerOptions.length : stickerOptions.length;
  const modeAllowsTray = activeAlbumMode === "collection" || stickerEditMode;
  const visible = activeSurface === "inside"
    && !coverOpenAnimation
    && (!stickerEditor || stickerEditor.hidden)
    && modeAllowsTray
    && itemCount > 0;
  collectionStickerTray.hidden = !visible;
  document.body.classList.toggle("is-collection-tray-visible", visible);
  if (!visible || activeAlbumMode === "collection") {
    setStickerTrayPeek(false);
  }
  updateCollectionTraySelection();
  updateStickerTrayCounter();
  updateInlineStickerControls();
  scheduleStickerTutorialLayout();
}

function updateCollectionTraySelection() {
  if (!collectionStickerTrayItems) {
    return;
  }
  if (activeAlbumMode !== "collection") {
    collectionStickerTrayItems.querySelectorAll("[data-sticker-tray-id]").forEach((button) => {
      button.classList.remove("is-active");
      button.removeAttribute("aria-current");
    });
    return;
  }
  const activeStart = activeSurface === "inside" ? spreadStartForPage(activeBookPage) : 0;
  const categories = buildCollectionTocCategories();
  let selectedCategoryId = "";
  if (activeStart > 0) {
    const pendingCategory = pendingCollectionTocCategoryId
      ? categories.find((category) => category.id === pendingCollectionTocCategoryId)
      : null;
    if (pendingCategory) {
      if (collectionTocCategoryHasStickerOnSpread(pendingCategory, activeStart)) {
        selectedCategoryId = pendingCategory.id;
        activeCollectionTocCategoryId = selectedCategoryId;
        pendingCollectionTocCategoryId = "";
      } else {
        selectedCategoryId = pendingCategory.id;
      }
    } else {
      if (pendingCollectionTocCategoryId) {
        pendingCollectionTocCategoryId = "";
      }
      const currentCategory = categories.find((category) => category.id === activeCollectionTocCategoryId);
      selectedCategoryId = currentCategory && collectionTocCategoryHasStickerOnSpread(currentCategory, activeStart)
        ? currentCategory.id
        : categories.find((category) => collectionTocCategoryHasStickerOnSpread(category, activeStart))?.id || "";
      activeCollectionTocCategoryId = selectedCategoryId;
    }
  }
  collectionStickerTrayItems.querySelectorAll("[data-collection-toc-category]").forEach((button) => {
    const selected = button.dataset.collectionTocCategory === selectedCategoryId;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-current", selected ? "true" : "false");
  });
}

function collectionTocCategoryHasStickerOnSpread(category, pageStart) {
  const pageEnd = Math.min(pageStart + 1, collectionTocPageCount());
  for (let page = Math.max(1, pageStart); page <= pageEnd; page += 1) {
    const pageDef = collectionPageDefinitions[page - 1];
    for (const sticker of collectionStickersForPageDefinition(pageDef)) {
      if (collectionStickerMatchesTocCategory(sticker, category)) {
        return true;
      }
    }
  }
  return false;
}

function collectionStickerPlacementScale(sticker) {
  return defaultStickerScale(sticker) * COLLECTION_PLACEMENT_SCALE;
}

function setupStickerEditor() {
  if (!stickerEditor || !editorPageCanvas) {
    return;
  }

  editorClose?.addEventListener("click", closeStickerEditor);
  editorGameFilter?.addEventListener("change", () => {
    editorGameFilterValue = editorGameFilter.value;
    renderStickerLibrary();
  });
  editorStickerSearch?.addEventListener("input", () => {
    editorSearchQuery = editorStickerSearch.value.trim();
    renderStickerLibrary();
  });
  editorPageCanvas.addEventListener("pointerdown", handleEditorCanvasPointerDown);
  window.addEventListener("pointermove", handleStickerDragMove);
  window.addEventListener("pointerup", endStickerDrag);
  window.addEventListener("pointermove", handleDrawingPointerMove);
  window.addEventListener("pointerup", endDrawingStroke);
  window.addEventListener("pointercancel", endDrawingStroke);
  editorScale?.addEventListener("input", () => updateSelectedPlacement({ scale: Number(editorScale.value) }));
  editorRotation?.addEventListener("input", () => updateSelectedPlacement({ rotation: Number(editorRotation.value) }));
  editorLayerBack?.addEventListener("click", () => moveSelectedPlacementLayer(-1));
  editorLayerFront?.addEventListener("click", () => moveSelectedPlacementLayer(1));
  editorDelete?.addEventListener("click", deleteSelectedPlacement);
  editorApply?.addEventListener("click", applyStickerEditorToBook);
  buildDrawingControls();
  editorModeButtons.forEach((button) => {
    button.addEventListener("click", () => setEditorMode(button.dataset.editorMode));
  });
  drawPenButton?.addEventListener("click", () => setDrawTool("pen"));
  drawEraserButton?.addEventListener("click", () => setDrawTool("eraser"));
  drawStampButton?.addEventListener("click", () => {
    if (drawTool === "stamp" && drawStampPanel) {
      drawStampPanel.hidden = !drawStampPanel.hidden;
      return;
    }
    setDrawTool("stamp");
  });
  drawRainbowButton?.addEventListener("click", () => setDrawTool("rainbow"));
  drawSparkleButton?.addEventListener("click", () => setDrawTool("sparkle"));
  drawUndoButton?.addEventListener("click", undoDrawingStroke);
  drawClearButton?.addEventListener("click", clearActivePageDrawing);
  window.addEventListener("keydown", handleEditorKeydown);

  renderEditorShell();
  loadStickerPlanForEditor();
}

async function loadStickerPlanForEditor() {
  try {
    const [plan, catalog] = await Promise.all([
      loadStickerBookPlan(),
      loadGameStickerCatalog(),
    ]);
    stickerPlan = plan;
    gameStickerCatalog = catalog;
    const loadedStickerOptions = stickerPlan.stickers
      .map((sticker) => ({
        ...sticker,
        assetUrl: sticker.assetPath ? stickerAssetUrl(sticker.assetPath) : "",
      }));
    const catalogStickerOptions = buildStickerOptionsFromGameCatalog(gameStickerCatalog);
    collectionStickerOptions = sortCollectionStickersForZukan(buildCollectionZukanSubjects(loadedStickerOptions));
    const fallbackStickerOptions = loadedStickerOptions
      .filter((sticker) => sticker.assetStatus === "existing" && sticker.assetPath)
      .map((sticker) => ({ ...sticker }));
    stickerOptions = catalogStickerOptions.length
      ? catalogStickerOptions
      : fallbackStickerOptions;
    syncEditorPlacementsWithStickerPlan();
    syncCollectionPlacementsWithStickerPlan();
    editorPageDefinitions = buildEditorPageDefinitions();
    collectionPageDefinitions = buildCollectionPageDefinitions();
    activeBookPage = spreadStartForPage(Math.min(activeBookPage, editorPageCount()));
    activeEditorPage = THREE.MathUtils.clamp(Math.round(activeEditorPage), 1, editorPageDefinitions.length);
    if (!isLocalPreview || !params.has("spread")) {
      spreadPosition = spreadPositionForBookPage(activeBookPage);
    }
    migrateEditorStateForEmptyStart();
    ensureDefaultEditorPages();
    saveEditorState();
    if (editorEnabled) {
      setupEditorGameFilter();
      renderEditorShell();
    }
    renderCollectionStickerTray();
    refreshPageTemplateTextures();
    updateControlState();
    setupTuningPanel();
    updatePage(flipProgress);
    // シール帳 正本統一: grant 動線から渡された query を反映 (pasteId 優先 > game)。
    applyStickerEntryQueryNavigation();
    syncUrl();
    // firstEver=1 のときは welcome overlay → tap → tutorial 強制起動 のチェイン。
    // それ以外は従来通り maybeStartStickerTutorial の hasSeen 判定に従う。
    if (requestedFirstEver) {
      showStickerFirstEverWelcome();
    } else {
      maybeStartStickerTutorial();
    }
    window.__stickerEditorPlanLoaded = true;
  } catch (error) {
    console.warn("Sticker plan load failed", error);
    if (stickerLibrary) {
      stickerLibrary.textContent = "シールを よみこめません";
    }
  }
}

async function loadStickerBookPlan() {
  const response = await fetch(`${STICKER_PLAN_URL}?v=${ASSET_VERSION}`);
  if (!response.ok) {
    throw new Error(`plan ${response.status}`);
  }
  return response.json();
}

async function loadGameStickerCatalog() {
  try {
    const response = await fetch(`${GAME_STICKER_CATALOG_URL}?v=${ASSET_VERSION}`);
    if (!response.ok) {
      throw new Error(`game catalog ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn("Game sticker catalog load failed", error);
    return null;
  }
}

function buildStickerOptionsFromGameCatalog(catalog) {
  const pages = catalog?.pages && typeof catalog.pages === "object"
    ? Object.entries(catalog.pages)
    : [];
  return pages.flatMap(([gameId, page], pageIndex) => {
    const stickers = Array.isArray(page?.stickers) ? page.stickers : [];
    return stickers
      .filter((sticker) => sticker?.id && sticker.img)
      .map((sticker, stickerIndex) => ({
        id: String(sticker.id),
        gameId,
        view: gameId,
        label: sticker.name || sticker.label || page?.title || String(sticker.id),
        kana: sticker.kana || sticker.name || sticker.label || page?.title || String(sticker.id),
        sort: pageIndex * 1000 + stickerIndex,
        stage: stickerIndex + 1,
        rarity: sticker.rarity || "normal",
        tier: page?.appOnly ? "sub" : "free",
        unlock: "catalog",
        listNote: page?.subtitle || "",
        assetStatus: "existing",
        assetPath: sticker.img,
        assetUrl: stickerAssetUrl(sticker.img),
        gameLabel: page?.title || gameId,
      }));
  });
}

function syncEditorPlacementsWithStickerPlan() {
  const stickersById = new Map(stickerOptions.map((sticker) => [sticker.id, sticker]));
  let changed = false;
  for (const placements of Object.values(editorState.pages || {})) {
    if (!Array.isArray(placements)) {
      continue;
    }
    for (const placement of placements) {
      const sticker = stickersById.get(placement.stickerId);
      if (!sticker) {
        continue;
      }
      if (placement.assetUrl !== sticker.assetUrl || placement.label !== sticker.label) {
        placement.assetUrl = sticker.assetUrl;
        placement.label = sticker.label;
        changed = true;
      }
    }
  }
  if (changed) {
    editorStateDirty = true;
  }
}

function syncCollectionPlacementsWithStickerPlan() {
  const stickersById = new Map();
  for (const sticker of availableCollectionStickers()) {
    stickersById.set(sticker.id, sticker);
    if (Array.isArray(sticker.sourceStickerIds)) {
      for (const sourceId of sticker.sourceStickerIds) {
        stickersById.set(sourceId, sticker);
      }
    }
    if (sticker.sourceStickerId) {
      stickersById.set(sticker.sourceStickerId, sticker);
    }
  }
  let changed = false;
  for (const placements of Object.values(collectionAlbumState.pages || {})) {
    if (!Array.isArray(placements)) {
      continue;
    }
    for (const placement of placements) {
      const sticker = stickersById.get(placement.stickerId);
      if (!sticker) {
        continue;
      }
      if (placement.assetUrl !== sticker.assetUrl || placement.label !== sticker.label) {
        placement.assetUrl = sticker.assetUrl;
        placement.label = sticker.label;
        changed = true;
      }
      const nextScale = collectionStickerPlacementScale(sticker);
      if (!Number.isFinite(Number(placement.scale)) || Number(placement.scale) > nextScale * 1.16) {
        placement.scale = nextScale;
        changed = true;
      }
    }
  }
  if (changed) {
    saveCollectionAlbumState();
  }
}

function buildEditorPageDefinitions() {
  // シール帳 正本統一: catalog の page 順序に従い page→gameId マップを確立。
  // STICKER_ALBUM_PAGE_COUNT を固定長として既存ユーザの editorState.pages keying を維持
  // (順序が変わると保存位置がズレるため、 catalog 末尾追加でも先頭順序を保持)。
  const catalogIds = gameStickerCatalog?.pages && typeof gameStickerCatalog.pages === "object"
    ? Object.keys(gameStickerCatalog.pages)
    : [];
  if (!catalogIds.length) {
    return createFallbackEditorPageDefinitions();
  }
  return Array.from({ length: STICKER_ALBUM_PAGE_COUNT }, (_, index) => {
    const gameId = catalogIds[index] || "";
    const pageEntry = gameId ? gameStickerCatalog.pages[gameId] : null;
    const label = pageEntry?.title || `ページ ${index + 1}`;
    return {
      page: index + 1,
      gameId,
      label,
      shelfType: "sticker_album",
    };
  });
}

function createFallbackEditorPageDefinitions() {
  return Array.from({ length: STICKER_ALBUM_PAGE_COUNT }, (_, index) => ({
    page: index + 1,
    gameId: "",
    label: `ページ ${index + 1}`,
    shelfType: "sticker_album",
  }));
}

function findEditorPageByGameId(gameId) {
  if (!gameId || !Array.isArray(editorPageDefinitions)) return 0;
  const match = editorPageDefinitions.find((pageDef) => pageDef.gameId === gameId);
  return match && Number.isFinite(match.page) ? match.page : 0;
}

function findEditorPageByStickerId(stickerId) {
  if (!stickerId) return 0;
  const sticker = stickerOptions.find((s) => s && s.id === stickerId);
  if (!sticker) return 0;
  return findEditorPageByGameId(sticker.gameId);
}

// シール帳 正本統一: grant 動線の query (game / pasteId) を受け取り該当ページへ移動する。
// pasteId が先に評価 (gameId を内包するため)、 fallback で game。
// catalog 未マッチや無効 gameId は console.warn のみで cover 維持 (R3 緩和策)。
function applyStickerEntryQueryNavigation() {
  let targetPage = 0;
  let resolvedGameId = "";
  if (requestedPasteStickerId) {
    targetPage = findEditorPageByStickerId(requestedPasteStickerId);
    const sticker = stickerOptions.find((s) => s && s.id === requestedPasteStickerId);
    if (sticker) resolvedGameId = sticker.gameId || "";
    if (!targetPage) {
      console.warn("[sticker-book] pasteId not found in catalog:", requestedPasteStickerId);
    }
  }
  if (!targetPage && requestedGameId) {
    targetPage = findEditorPageByGameId(requestedGameId);
    if (targetPage) resolvedGameId = requestedGameId;
    else console.warn("[sticker-book] game id not found in catalog:", requestedGameId);
  }
  if (!targetPage) return;
  // 該当ページの game filter を選択 (pasteId のシールをトレイ内で見つけやすく)
  if (resolvedGameId && editorGameFilter) {
    const hasOption = [...editorGameFilter.options].some((o) => o.value === resolvedGameId);
    if (hasOption) {
      editorGameFilterValue = resolvedGameId;
      editorGameFilter.value = resolvedGameId;
    }
  }
  // cover の場合は inside へ open + 指定ページへ。 既に inside なら setBookPage で移動のみ。
  if (activeSurface === "cover") {
    setBookSurface("inside", targetPage);
  } else {
    setBookPage(targetPage);
  }
}

// シール帳 正本統一: 初回 (firstEver=1) 専用 welcome overlay。
// tap → tutorial 強制起動 のチェイン (R4: tutorial と二重表示しない排他制御)。
function showStickerFirstEverWelcome() {
  const overlay = document.getElementById("stickerFirstEverWelcome");
  if (!overlay) {
    // overlay 不在 fallback: 直接 tutorial を強制起動
    startStickerTutorial({ manual: true });
    return;
  }
  overlay.hidden = false;
  document.body.classList.add("is-sticker-first-ever-welcome");
  const dismiss = () => {
    overlay.hidden = true;
    document.body.classList.remove("is-sticker-first-ever-welcome");
    overlay.removeEventListener("click", onClick);
    const startBtn = overlay.querySelector("[data-firstever-start]");
    const skipBtn = overlay.querySelector("[data-firstever-skip]");
    if (startBtn) startBtn.removeEventListener("click", onStart);
    if (skipBtn) skipBtn.removeEventListener("click", onSkip);
  };
  const onStart = (event) => {
    event.stopPropagation();
    dismiss();
    startStickerTutorial({ manual: true });
  };
  const onSkip = (event) => {
    event.stopPropagation();
    dismiss();
    markStickerTutorialSeen();
  };
  const onClick = (event) => {
    if (event.target === overlay) {
      dismiss();
      startStickerTutorial({ manual: true });
    }
  };
  const startBtn = overlay.querySelector("[data-firstever-start]");
  const skipBtn = overlay.querySelector("[data-firstever-skip]");
  if (startBtn) startBtn.addEventListener("click", onStart);
  if (skipBtn) skipBtn.addEventListener("click", onSkip);
  overlay.addEventListener("click", onClick);
}

function createFallbackCollectionPageDefinitions() {
  return [{
    page: 1,
    type: "section-index",
    label: "ずかんもくじ",
    subtitle: "いきものや たべものを しらべよう",
    categoryId: "bugs",
    subjectIds: [],
    indexTargets: [],
    shelfType: "zukan_collection",
  }];
}

function buildCollectionPageDefinitions() {
  const pages = [];
  for (const category of COLLECTION_TOC_CATEGORY_DEFS) {
    const subjects = collectionStickerOptions.filter((subject) => collectionStickerMatchesTocCategory(subject, category));
    if (!subjects.length) {
      continue;
    }
    for (let index = 0; index < subjects.length; index += COLLECTION_INDEX_ITEMS_PER_PAGE) {
      const pageIndex = Math.floor(index / COLLECTION_INDEX_ITEMS_PER_PAGE);
      pages.push({
        type: "section-index",
        label: pageIndex > 0 ? `${category.pageLabel || `${category.label}ずかん`} ${pageIndex + 1}` : `${category.pageLabel || `${category.label}ずかん`} もくじ`,
        subtitle: category.summary || "みつけたものを しらべよう",
        categoryId: category.id,
        subjectIds: subjects.slice(index, index + COLLECTION_INDEX_ITEMS_PER_PAGE).map((subject) => subject.id),
        shelfType: "zukan_collection",
      });
    }
    for (const subject of subjects) {
      pages.push({
        type: "detail",
        label: subject.label,
        subtitle: category.pageLabel || `${category.label}ずかん`,
        categoryId: category.id,
        subjectId: subject.id,
        shelfType: "zukan_collection",
      });
    }
  }

  const normalizedPages = pages.length ? pages : createFallbackCollectionPageDefinitions();
  const numberedPages = normalizedPages.map((pageDef, index) => ({
    ...pageDef,
    page: index + 1,
  }));
  const detailPageBySubjectId = new Map(
    numberedPages
      .filter((pageDef) => pageDef.type === "detail" && pageDef.subjectId)
      .map((pageDef) => [pageDef.subjectId, pageDef.page]),
  );
  return numberedPages.map((pageDef) => {
    if (pageDef.type !== "section-index") {
      return pageDef;
    }
    const indexTargets = (pageDef.subjectIds || []).map((subjectId) => ({
      subjectId,
      targetPage: detailPageBySubjectId.get(subjectId) || null,
      categoryId: pageDef.categoryId || "",
      action: "open-zukan-detail",
    }));
    return {
      ...pageDef,
      indexTargets,
    };
  });
}

function activePageDefinitions() {
  return activeAlbumMode === "collection" ? collectionPageDefinitions : editorPageDefinitions;
}

function ensureDefaultEditorPages() {
  for (const pageDef of editorPageDefinitions) {
    getPagePlacements(pageDef.page);
    getPageDrawingStrokes(pageDef.page);
  }
  editorState.defaultContentSeedVersion = Math.max(
    Number(editorState.defaultContentSeedVersion) || 0,
    DEFAULT_CONTENT_SEED_VERSION,
  );
  editorState.emptyStartVersion = Math.max(
    Number(editorState.emptyStartVersion) || 0,
    EMPTY_STICKER_START_VERSION,
  );
  editorStateDirty = true;
}

function migrateEditorStateForEmptyStart() {
  const currentEmptyStartVersion = Number(editorState.emptyStartVersion) || 0;
  if (currentEmptyStartVersion >= EMPTY_STICKER_START_VERSION) {
    return;
  }
  if (hasAnyEditorContent()) {
    editorState.pages = {};
    editorState.drawings = {};
    selectedPlacementId = null;
  }
  editorState.emptyStartVersion = EMPTY_STICKER_START_VERSION;
  editorState.defaultContentSeedVersion = Math.max(
    Number(editorState.defaultContentSeedVersion) || 0,
    DEFAULT_CONTENT_SEED_VERSION,
  );
  editorStateDirty = true;
}

function editorStateLooksLikeGeneratedSeedContent() {
  if (!stickerOptions.length || !hasAnyEditorContent()) {
    return false;
  }
  if ((Number(editorState.defaultContentSeedVersion) || 0) <= 0) {
    return false;
  }
  const drawingValues = editorState.drawings && typeof editorState.drawings === "object"
    ? Object.values(editorState.drawings)
    : [];
  if (drawingValues.some((strokes) => Array.isArray(strokes) && strokes.length > 0)) {
    return false;
  }
  const expectedPages = buildGeneratedSeedPages();
  let actualTotal = 0;
  let expectedTotal = 0;
  let matchedTotal = 0;
  for (let page = 1; page <= editorPageCount(); page += 1) {
    const actual = Array.isArray(editorState.pages?.[String(page)]) ? editorState.pages[String(page)] : [];
    const expected = expectedPages[String(page)] || [];
    actualTotal += actual.length;
    expectedTotal += expected.length;
    if (actual.length !== expected.length) {
      return false;
    }
    for (let index = 0; index < actual.length; index += 1) {
      if (placementLooksLikeGeneratedSeed(actual[index], expected[index])) {
        matchedTotal += 1;
      }
    }
  }
  return actualTotal > 0
    && expectedTotal === actualTotal
    && matchedTotal / actualTotal >= 0.96;
}

function buildGeneratedSeedPages() {
  const expected = {};
  const sortedStickers = [...stickerOptions].sort((a, b) => {
    const gameOrderA = stickerGameOrder(a.gameId);
    const gameOrderB = stickerGameOrder(b.gameId);
    return gameOrderA - gameOrderB || String(a.id).localeCompare(String(b.id));
  });
  const pageCount = editorPageCount();
  const stickersPerPage = Math.max(1, Math.ceil(sortedStickers.length / pageCount));
  for (let page = 1; page <= pageCount; page += 1) {
    const start = (page - 1) * stickersPerPage;
    expected[String(page)] = createDefaultPlacements(sortedStickers.slice(start, start + stickersPerPage));
  }
  return expected;
}

function placementLooksLikeGeneratedSeed(actual, expected) {
  if (!actual || !expected || actual.stickerId !== expected.stickerId) {
    return false;
  }
  return nearlyEqualNumber(actual.x, expected.x, 0.12)
    && nearlyEqualNumber(actual.y, expected.y, 0.12)
    && nearlyEqualNumber(actual.scale, expected.scale, 0.015)
    && nearlyEqualNumber(actual.rotation || 0, expected.rotation || 0, 0.05)
    && nearlyEqualNumber(actual.z, expected.z, 0.1);
}

function nearlyEqualNumber(a, b, tolerance) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= tolerance;
}

function createDefaultPlacements(stickers) {
  const count = stickers.length;
  if (!count) {
    return [];
  }
  const cols = count <= 6 ? 3 : count <= 12 ? 4 : count <= 20 ? 5 : 6;
  const rows = Math.ceil(count / cols);
  const xPad = cols >= 6 ? 12 : 16;
  const yPad = rows >= 5 ? 13 : 18;
  const cellW = (100 - xPad * 2) / cols;
  const cellH = (100 - yPad * 2) / rows;
  const scale = count <= 6 ? 1.08 : count <= 12 ? 0.86 : count <= 20 ? 0.68 : 0.55;
  return stickers.map((sticker, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      id: createPlacementId(),
      stickerId: sticker.id,
      label: sticker.label,
      assetUrl: sticker.assetUrl,
      x: xPad + cellW * (col + 0.5),
      y: yPad + cellH * (row + 0.5),
      scale: defaultStickerScale(sticker) * scale,
      rotation: ((index % 5) - 2) * 3,
      z: (index + 1) * 10,
    };
  });
}

function seedDefaultEditorContentIfNeeded() {
  if (!stickerOptions.length || !shouldSeedDefaultEditorContent()) {
    return;
  }
  editorState.pages = {};
  if (!editorState.drawings || typeof editorState.drawings !== "object") {
    editorState.drawings = {};
  }
  const sortedStickers = [...stickerOptions].sort((a, b) => {
    const gameOrderA = stickerGameOrder(a.gameId);
    const gameOrderB = stickerGameOrder(b.gameId);
    return gameOrderA - gameOrderB || String(a.id).localeCompare(String(b.id));
  });
  const pageCount = editorPageCount();
  const stickersPerPage = Math.max(1, Math.ceil(sortedStickers.length / pageCount));
  for (let page = 1; page <= pageCount; page += 1) {
    const start = (page - 1) * stickersPerPage;
    const stickers = sortedStickers.slice(start, start + stickersPerPage);
    editorState.pages[String(page)] = createDefaultPlacements(stickers);
  }
  editorState.defaultContentSeedVersion = DEFAULT_CONTENT_SEED_VERSION;
  editorStateDirty = true;
}

function shouldSeedDefaultEditorContent() {
  if (!hasAnyEditorContent()) {
    return true;
  }
  if ((Number(editorState.defaultContentSeedVersion) || 0) >= DEFAULT_CONTENT_SEED_VERSION) {
    return false;
  }
  return editorStateLooksLikeLegacyDefaultContent();
}

function editorStateLooksLikeLegacyDefaultContent() {
  const drawingValues = editorState.drawings && typeof editorState.drawings === "object"
    ? Object.values(editorState.drawings)
    : [];
  if (drawingValues.some((strokes) => Array.isArray(strokes) && strokes.length > 0)) {
    return false;
  }
  const currentStickerIds = new Set(stickerOptions.map((sticker) => sticker.id));
  const placements = Object.values(editorState.pages || {})
    .flatMap((pagePlacements) => (Array.isArray(pagePlacements) ? pagePlacements : []));
  if (!placements.length) {
    return true;
  }
  const missingCount = placements.filter((placement) => !currentStickerIds.has(placement.stickerId)).length;
  return missingCount / placements.length >= 0.7;
}

function stickerGameOrder(gameId) {
  const catalogIds = gameStickerCatalog?.pages && typeof gameStickerCatalog.pages === "object"
    ? Object.keys(gameStickerCatalog.pages)
    : [];
  const catalogIndex = catalogIds.indexOf(gameId);
  if (catalogIndex >= 0) {
    return catalogIndex;
  }
  const planIndex = stickerPlan?.games?.findIndex((game) => game.id === gameId) ?? -1;
  return planIndex >= 0 ? planIndex : 9999;
}

function hasAnyEditorContent() {
  const pageValues = editorState.pages && typeof editorState.pages === "object"
    ? Object.values(editorState.pages)
    : [];
  if (pageValues.some((placements) => Array.isArray(placements) && placements.length > 0)) {
    return true;
  }
  const drawingValues = editorState.drawings && typeof editorState.drawings === "object"
    ? Object.values(editorState.drawings)
    : [];
  return drawingValues.some((strokes) => Array.isArray(strokes) && strokes.length > 0);
}

function setupEditorGameFilter() {
  if (!editorGameFilter || !stickerPlan) {
    return;
  }
  const activeGameIds = new Set(stickerOptions.map((sticker) => sticker.gameId));
  const catalogGames = gameStickerCatalog?.pages && typeof gameStickerCatalog.pages === "object"
    ? Object.entries(gameStickerCatalog.pages).map(([id, page]) => ({
      id,
      label: page?.title || id,
    }))
    : [];
  const games = (catalogGames.length ? catalogGames : stickerPlan.games)
    .filter((game) => activeGameIds.has(game.id));
  editorGameFilter.innerHTML = [
    '<option value="all">ぜんぶ</option>',
    ...games.map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.label)}</option>`),
  ].join("");
  if (![...editorGameFilter.options].some((option) => option.value === editorGameFilterValue)) {
    editorGameFilterValue = "all";
  }
  editorGameFilter.value = editorGameFilterValue;
}

function buildDrawingControls() {
  if (drawColorPalette && !drawColorPalette.children.length) {
    drawColorPalette.innerHTML = DRAWING_COLORS.map((color) => `
      <button
        type="button"
        class="draw-color-button${color === drawBrushColor ? " is-active" : ""}"
        data-draw-color="${escapeHtml(color)}"
        style="--draw-color:${escapeHtml(color)}"
        aria-label="${escapeHtml(color)}"
      ></button>
    `).join("");
    drawColorPalette.querySelectorAll("[data-draw-color]").forEach((button) => {
      button.addEventListener("click", () => {
        drawBrushColor = button.dataset.drawColor || DRAWING_DEFAULT_COLOR;
        setDrawTool("pen");
        updateDrawingControlState();
      });
    });
  }

  drawSizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      drawBrushSize = THREE.MathUtils.clamp(Number(button.dataset.drawSize) || DRAWING_DEFAULT_SIZE, 2, 48);
      updateDrawingControlState();
    });
  });

  if (drawStampPanel && !drawStampPanel.children.length) {
    drawStampPanel.innerHTML = DRAWING_STAMPS.map((stamp) => `
      <button
        type="button"
        class="draw-stamp-button${stamp.id === selectedDrawingStamp ? " is-active" : ""}"
        data-draw-stamp="${escapeHtml(stamp.id)}"
        aria-label="${escapeHtml(stamp.label)}"
        title="${escapeHtml(stamp.label)}"
      ><img src="${escapeHtml(stamp.src)}" alt=""></button>
    `).join("");
    drawStampPanel.querySelectorAll("[data-draw-stamp]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedDrawingStamp = button.dataset.drawStamp || DRAWING_STAMPS[0].id;
        setDrawTool("stamp");
        updateDrawingControlState();
      });
    });
    DRAWING_STAMPS.forEach((stamp) => getDrawingStampImage(stamp));
  }
  updateDrawingControlState();
}

function openStickerEditor(page = activeBookPage) {
  if (!editorEnabled || !stickerEditor || !editorPageCanvas) {
    return;
  }
  cancelSpreadJump();
  isPlaying = false;
  playButton.classList.remove("playing");
  activeEditorPage = THREE.MathUtils.clamp(Math.round(page), 1, editorPageCount());
  stickerEditor.hidden = false;
  selectedPlacementId = null;
  stickerDragState = null;
  updateCollectionStickerTrayVisibility();
  setEditorMode("sticker", { render: false });
  renderEditorShell();
}

function closeStickerEditor() {
  flushEditorStateSave();
  stickerEditor.hidden = true;
  selectedPlacementId = null;
  stickerDragState = null;
  drawingPointerState = null;
  canvas.style.cursor = "";
  updateCollectionStickerTrayVisibility();
  updateInlineStickerControls();
}

function renderEditorShell() {
  updateEditorModeUi();
  renderEditorPageChrome();
  renderStickerLibrary();
  renderEditorCanvas();
  updateEditorControls();
}

function renderEditorPageChrome() {
  const pageLabel = editorPageName(activeEditorPage);
  if (editorPageLabel) {
    editorPageLabel.textContent = `${activeEditorPage} / ${editorPageCount()}　${pageLabel}`;
  }
}

function setEditorMode(mode, options = {}) {
  const nextMode = mode === "draw" ? "draw" : "sticker";
  if (nextMode === editorMode && options.render !== false) {
    updateEditorModeUi();
    updateEditorControls();
    return;
  }
  editorMode = nextMode;
  if (editorMode === "draw") {
    selectedPlacementId = null;
    stickerDragState = null;
  } else {
    drawingPointerState = null;
  }
  updateEditorModeUi();
  if (options.render !== false) {
    renderEditorShell();
  }
}

function updateEditorModeUi() {
  if (stickerEditor) {
    stickerEditor.classList.toggle("is-draw-mode", editorMode === "draw");
    stickerEditor.classList.toggle("is-sticker-mode", editorMode === "sticker");
  }
  editorModeButtons.forEach((button) => {
    const active = button.dataset.editorMode === editorMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (editorFilterGrid) {
    editorFilterGrid.hidden = editorMode !== "sticker";
  }
  if (stickerLibrary) {
    stickerLibrary.hidden = editorMode !== "sticker";
  }
  if (drawingTools) {
    drawingTools.hidden = editorMode !== "draw";
  }
  updateDrawingControlState();
}

function setDrawTool(tool) {
  drawTool = ["eraser", "stamp", "rainbow", "sparkle"].includes(tool) ? tool : "pen";
  if (drawStampPanel) {
    drawStampPanel.hidden = drawTool !== "stamp";
  }
  updateDrawingControlState();
}

function updateDrawingControlState() {
  drawPenButton?.classList.toggle("is-active", drawTool === "pen");
  drawEraserButton?.classList.toggle("is-active", drawTool === "eraser");
  drawStampButton?.classList.toggle("is-active", drawTool === "stamp");
  drawRainbowButton?.classList.toggle("is-active", drawTool === "rainbow");
  drawSparkleButton?.classList.toggle("is-active", drawTool === "sparkle");
  drawColorPalette?.querySelectorAll("[data-draw-color]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.drawColor === drawBrushColor);
  });
  drawSizeButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.drawSize) === drawBrushSize);
  });
  drawStampPanel?.querySelectorAll("[data-draw-stamp]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.drawStamp === selectedDrawingStamp);
  });
}

function getDrawingStampDefinition(stampId) {
  return DRAWING_STAMPS.find((stamp) => stamp.id === stampId)
    || DRAWING_STAMPS.find((stamp) => stamp.label === stampId)
    || null;
}

function getDrawingStampImage(stamp) {
  if (!stamp?.src) {
    return null;
  }
  if (drawingStampImageCache.has(stamp.id)) {
    return drawingStampImageCache.get(stamp.id);
  }
  const image = new Image();
  image.decoding = "async";
  image.src = stamp.src;
  image.addEventListener("load", () => {
    if (!stickerEditor?.hidden) {
      renderDrawingCanvas();
    }
    refreshPageTemplateTextures();
  }, { once: true });
  drawingStampImageCache.set(stamp.id, image);
  return image;
}

function renderStickerLibrary() {
  if (!stickerLibrary) {
    return;
  }
  if (!stickerOptions.length) {
    stickerLibrary.textContent = "シールを よみこみちゅう";
    return;
  }
  const query = editorSearchQuery.toLowerCase();
  const filtered = stickerOptions.filter((sticker) => {
    if (editorGameFilterValue !== "all" && sticker.gameId !== editorGameFilterValue) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [
      sticker.id,
      sticker.label,
      sticker.kana,
      sticker.listNote,
      ...(sticker.nameIdeas || []),
    ].some((text) => String(text || "").toLowerCase().includes(query));
  });

  stickerLibrary.innerHTML = filtered.map((sticker) => `
    <button type="button" class="sticker-pick" data-sticker-id="${escapeHtml(sticker.id)}">
      <img src="${escapeHtml(sticker.assetUrl)}" alt="${escapeHtml(sticker.label)}" loading="lazy" decoding="async">
      <span>${escapeHtml(sticker.label)}</span>
    </button>
  `).join("");
  stickerLibrary.querySelectorAll("[data-sticker-id]").forEach((button) => {
    button.addEventListener("click", () => addStickerToActivePage(button.dataset.stickerId));
  });
}

function renderEditorCanvas() {
  if (!editorPageCanvas) {
    return;
  }
  const placements = [...getActivePagePlacements()].sort((a, b) => a.z - b.z);
  editorPageCanvas.innerHTML = `
    <canvas class="editor-template-canvas" aria-hidden="true"></canvas>
    <canvas class="editor-draw-canvas" aria-hidden="true"></canvas>
    ${placements.map((placement) => `
    <div
      class="placed-sticker${placement.id === selectedPlacementId ? " is-selected" : ""}"
      data-placement-id="${escapeHtml(placement.id)}"
      data-genre="${escapeHtml(resolveStickerGenre(placement))}"
      style="${placementStyleVars(placement)}"
      title="${escapeHtml(placement.label)}"
    >
      <img src="${escapeHtml(placement.assetUrl)}" alt="${escapeHtml(placement.label)}" draggable="false">
    </div>
  `).join("")}`;
  renderEditorTemplateCanvas();
  renderDrawingCanvas();
}

function findPlacementElement(id) {
  if (!editorPageCanvas || !id) {
    return null;
  }
  const escapedId = globalThis.CSS?.escape
    ? CSS.escape(String(id))
    : String(id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return editorPageCanvas.querySelector(`[data-placement-id="${escapedId}"]`);
}

function updatePlacementElementStyle(placement) {
  const element = findPlacementElement(placement?.id);
  if (!element) {
    return false;
  }
  applyPlacementStyleVars(element, placement);
  element.style.zIndex = String(placement.z);
  return true;
}

function placementStyleVars(placement) {
  const scale = sanitizedPlacementScale(placement?.scale);
  const renderScale = editorStickerRenderScale(scale);
  const visualScale = scale / renderScale;
  const selectionBorder = 2 / visualScale;
  const selectionRadius = 14 / visualScale;
  const whiteAxis = 0.82 / visualScale;
  const whiteDiag = 0.58 / visualScale;
  const blackAxis = 0.28 / visualScale;
  const blackDiag = 0.2 / visualScale;
  return [
    `--x:${placement.x}%`,
    `--y:${placement.y}%`,
    `--scale:${scale}`,
    `--render-scale:${renderScale}`,
    `--visual-scale:${visualScale}`,
    `--rotation:${placement.rotation || 0}deg`,
    `--z:${placement.z}`,
    `--selection-border:${selectionBorder.toFixed(3)}px`,
    `--selection-radius:${selectionRadius.toFixed(3)}px`,
    `--sticker-white-axis:${whiteAxis.toFixed(3)}px`,
    `--sticker-white-axis-neg:${(-whiteAxis).toFixed(3)}px`,
    `--sticker-white-diag:${whiteDiag.toFixed(3)}px`,
    `--sticker-white-diag-neg:${(-whiteDiag).toFixed(3)}px`,
    `--sticker-black-axis:${blackAxis.toFixed(3)}px`,
    `--sticker-black-axis-neg:${(-blackAxis).toFixed(3)}px`,
    `--sticker-black-diag:${blackDiag.toFixed(3)}px`,
    `--sticker-black-diag-neg:${(-blackDiag).toFixed(3)}px`,
  ].join("; ");
}

function applyPlacementStyleVars(element, placement) {
  const scale = sanitizedPlacementScale(placement?.scale);
  const renderScale = editorStickerRenderScale(scale);
  const visualScale = scale / renderScale;
  const whiteAxis = 0.82 / visualScale;
  const whiteDiag = 0.58 / visualScale;
  const blackAxis = 0.28 / visualScale;
  const blackDiag = 0.2 / visualScale;
  element.style.setProperty("--x", `${placement.x}%`);
  element.style.setProperty("--y", `${placement.y}%`);
  element.style.setProperty("--scale", String(scale));
  element.style.setProperty("--render-scale", String(renderScale));
  element.style.setProperty("--visual-scale", String(visualScale));
  element.style.setProperty("--rotation", `${placement.rotation || 0}deg`);
  element.style.setProperty("--z", String(placement.z));
  element.style.setProperty("--selection-border", `${(2 / visualScale).toFixed(3)}px`);
  element.style.setProperty("--selection-radius", `${(14 / visualScale).toFixed(3)}px`);
  element.style.setProperty("--sticker-white-axis", `${whiteAxis.toFixed(3)}px`);
  element.style.setProperty("--sticker-white-axis-neg", `${(-whiteAxis).toFixed(3)}px`);
  element.style.setProperty("--sticker-white-diag", `${whiteDiag.toFixed(3)}px`);
  element.style.setProperty("--sticker-white-diag-neg", `${(-whiteDiag).toFixed(3)}px`);
  element.style.setProperty("--sticker-black-axis", `${blackAxis.toFixed(3)}px`);
  element.style.setProperty("--sticker-black-axis-neg", `${(-blackAxis).toFixed(3)}px`);
  element.style.setProperty("--sticker-black-diag", `${blackDiag.toFixed(3)}px`);
  element.style.setProperty("--sticker-black-diag-neg", `${(-blackDiag).toFixed(3)}px`);
}

function sanitizedPlacementScale(scale) {
  return Math.max(0.2, Number(scale) || 1);
}

function editorStickerRenderScale(scale) {
  const normalized = sanitizedPlacementScale(scale);
  return Math.min(EDITOR_STICKER_RENDER_SCALE_MAX, Math.max(1.75, Math.ceil(normalized * 1.2)));
}

function updateEditorSelectionClass() {
  if (!editorPageCanvas) {
    return;
  }
  editorPageCanvas.querySelectorAll("[data-placement-id]").forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.placementId === selectedPlacementId);
  });
}

function addStickerToActivePage(stickerId) {
  const sticker = stickerOptions.find((item) => item.id === stickerId);
  if (!sticker) {
    return;
  }
  const placements = getActivePagePlacements();
  const offset = (placements.length % 5) - 2;
  const placement = {
    id: createPlacementId(),
    stickerId: sticker.id,
    label: sticker.label,
    assetUrl: sticker.assetUrl,
    x: THREE.MathUtils.clamp(50 + offset * 4, 12, 88),
    y: THREE.MathUtils.clamp(48 + offset * 3, 12, 88),
    scale: defaultStickerScale(sticker),
    rotation: 0,
    z: nextPlacementZ(placements),
  };
  placements.push(placement);
  selectedPlacementId = placement.id;
  saveEditorState();
  renderEditorShell();
}

function handleEditorCanvasPointerDown(event) {
  if (editorMode === "draw") {
    startDrawingStroke(event);
    return;
  }
  const target = event.target.closest("[data-placement-id]");
  if (!target) {
    selectedPlacementId = null;
    stickerDragState = null;
    updateEditorSelectionClass();
    updateEditorControls();
    return;
  }
  event.preventDefault();
  const placement = getPlacementById(target.dataset.placementId);
  if (!placement) {
    return;
  }
  selectedPlacementId = placement.id;
  const rect = editorPageCanvas.getBoundingClientRect();
  stickerDragState = {
    id: placement.id,
    offsetX: event.clientX - (rect.left + (placement.x / 100) * rect.width),
    offsetY: event.clientY - (rect.top + (placement.y / 100) * rect.height),
  };
  updateEditorSelectionClass();
  updateEditorControls();
}

function handleStickerDragMove(event) {
  if (!stickerDragState || !editorPageCanvas || stickerEditor.hidden) {
    return;
  }
  const placement = getPlacementById(stickerDragState.id);
  if (!placement) {
    return;
  }
  const rect = editorPageCanvas.getBoundingClientRect();
  placement.x = THREE.MathUtils.clamp(
    ((event.clientX - rect.left - stickerDragState.offsetX) / rect.width) * 100,
    4,
    96,
  );
  placement.y = THREE.MathUtils.clamp(
    ((event.clientY - rect.top - stickerDragState.offsetY) / rect.height) * 100,
    4,
    96,
  );
  updatePlacementElementStyle(placement);
  markEditorStateDirty();
}

function endStickerDrag() {
  stickerDragState = null;
  flushEditorStateSave();
}

function startDrawingStroke(event) {
  if (!editorPageCanvas || stickerEditor.hidden) {
    return;
  }
  event.preventDefault();
  const point = editorPointerToPagePoint(event);
  if (!point) {
    return;
  }
  if (drawTool === "stamp") {
    getActivePageDrawingStrokes().push({
      id: createDrawingStrokeId(),
      tool: "stamp",
      stamp: selectedDrawingStamp,
      color: drawBrushColor,
      size: drawBrushSize,
      points: [point],
    });
    saveEditorState();
    renderDrawingCanvas();
    return;
  }
  const stroke = {
    id: createDrawingStrokeId(),
    tool: drawTool,
    color: drawBrushColor,
    size: drawBrushSize,
    points: [point],
  };
  getActivePageDrawingStrokes().push(stroke);
  drawingPointerState = {
    pointerId: event.pointerId,
    stroke,
  };
  editorPageCanvas.setPointerCapture?.(event.pointerId);
  renderDrawingCanvas();
}

function handleDrawingPointerMove(event) {
  if (!drawingPointerState || stickerEditor.hidden || editorMode !== "draw") {
    return;
  }
  if (event.pointerId !== drawingPointerState.pointerId) {
    return;
  }
  const point = editorPointerToPagePoint(event);
  if (!point) {
    return;
  }
  const points = drawingPointerState.stroke.points;
  const lastPoint = points[points.length - 1];
  const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
  if (distance < DRAWING_MIN_DISTANCE) {
    return;
  }
  points.push(point);
  renderDrawingCanvas();
}

function endDrawingStroke(event) {
  if (!drawingPointerState) {
    return;
  }
  if (event?.pointerId != null && event.pointerId !== drawingPointerState.pointerId) {
    return;
  }
  drawingPointerState = null;
  saveEditorState();
}

function editorPointerToPagePoint(event) {
  if (!editorPageCanvas) {
    return null;
  }
  const rect = editorPageCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  return {
    x: THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    y: THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

function renderDrawingCanvas() {
  if (!editorPageCanvas) {
    return;
  }
  renderEditorTemplateCanvas();
  const drawCanvas = editorPageCanvas.querySelector(".editor-draw-canvas");
  if (!drawCanvas) {
    return;
  }
  const rect = editorPageCanvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (drawCanvas.width !== pixelWidth || drawCanvas.height !== pixelHeight) {
    drawCanvas.width = pixelWidth;
    drawCanvas.height = pixelHeight;
  }
  const ctx = drawCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawDrawingStrokes(ctx, getActivePageDrawingStrokes(), width, height);
}

function renderEditorTemplateCanvas() {
  if (!editorPageCanvas) {
    return;
  }
  const templateCanvas = editorPageCanvas.querySelector(".editor-template-canvas");
  if (!templateCanvas) {
    return;
  }
  const rect = editorPageCanvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (templateCanvas.width !== pixelWidth || templateCanvas.height !== pixelHeight) {
    templateCanvas.width = pixelWidth;
    templateCanvas.height = pixelHeight;
  }
  const ctx = templateCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(width / PAGE_TEXTURE_W, height / PAGE_TEXTURE_H);
  const side = editorPageSide(activeEditorPage);
  const palette = editorPagePalette();
  if (!drawStickerImage2FreePageTemplate(ctx, activeBook)) {
    drawPageTemplateBase(ctx, palette, side);
  }
  ctx.restore();
}

function editorPageSide(page) {
  return page % 2 === 1 ? "left" : "right";
}

function editorPagePalette() {
  return stickerBookTheme(activeBook);
}

function drawDrawingStrokes(ctx, strokes, width, height) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const brushScale = drawingBrushRenderScale(width, height);
  for (const stroke of strokes) {
    const points = Array.isArray(stroke.points) ? stroke.points : [];
    if (!points.length) {
      continue;
    }
    if (stroke.tool === "stamp") {
      drawStoredStamp(ctx, stroke, width, height, brushScale);
      continue;
    }
    const lineWidth = Math.max(1, (Number(stroke.size) || DRAWING_DEFAULT_SIZE) * brushScale);
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = lineWidth;

    if (stroke.tool === "rainbow") {
      drawRainbowStroke(ctx, points, width, height);
    } else {
      ctx.strokeStyle = stroke.color || DRAWING_DEFAULT_COLOR;
      drawStrokePath(ctx, points, width, height);
      if (stroke.tool === "sparkle") {
        drawSparkleDots(ctx, points, width, height, lineWidth, stroke.color || DRAWING_DEFAULT_COLOR);
      }
    }
  }
  ctx.restore();
}

function drawingBrushRenderScale(width, height) {
  if (Math.abs(width - PAGE_TEXTURE_W) < 1 && Math.abs(height - PAGE_TEXTURE_H) < 1) {
    return 1;
  }
  return Math.max(0.1, (width / PAGE_TEXTURE_W + height / PAGE_TEXTURE_H) / 2);
}

function drawStrokePath(ctx, points, width, height) {
  const first = points[0];
  ctx.beginPath();
  ctx.moveTo((first.x / 100) * width, (first.y / 100) * height);
  if (points.length === 1) {
    ctx.lineTo((first.x / 100) * width + 0.01, (first.y / 100) * height + 0.01);
  } else {
    for (let i = 1; i < points.length; i += 1) {
      const point = points[i];
      ctx.lineTo((point.x / 100) * width, (point.y / 100) * height);
    }
  }
  ctx.stroke();
}

function drawRainbowStroke(ctx, points, width, height) {
  if (points.length === 1) {
    ctx.strokeStyle = "hsl(0, 90%, 55%)";
    drawStrokePath(ctx, points, width, height);
    return;
  }
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    ctx.strokeStyle = `hsl(${(i * 18) % 360}, 90%, 55%)`;
    ctx.beginPath();
    ctx.moveTo((from.x / 100) * width, (from.y / 100) * height);
    ctx.lineTo((to.x / 100) * width, (to.y / 100) * height);
    ctx.stroke();
  }
}

function drawSparkleDots(ctx, points, width, height, lineWidth, color) {
  const sparkleColors = ["#FFD700", "#FF69B4", "#00E5FF", "#FFFFFF", color];
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < points.length; i += 2) {
    const point = points[i];
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;
    for (let j = 0; j < 3; j += 1) {
      const angle = ((i + j * 2) * 1.73) % (Math.PI * 2);
      const radius = lineWidth * (0.7 + j * 0.34);
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        Math.max(1.4, lineWidth * 0.12),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = sparkleColors[(i + j) % sparkleColors.length];
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStoredStamp(ctx, stroke, width, height, brushScale = 1) {
  const point = stroke.points[0];
  const x = (point.x / 100) * width;
  const y = (point.y / 100) * height;
  const size = Math.max(16, (Number(stroke.size) || DRAWING_DEFAULT_SIZE) * 3.6 * brushScale);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = "rgba(60, 48, 20, 0.18)";
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.05;
  const stampDef = getDrawingStampDefinition(stroke.stamp);
  const stampImage = getDrawingStampImage(stampDef);
  if (stampImage?.complete && stampImage.naturalWidth > 0) {
    const ratio = stampImage.naturalWidth / stampImage.naturalHeight || 1;
    const drawW = ratio >= 1 ? size : size * ratio;
    const drawH = ratio >= 1 ? size / ratio : size;
    ctx.drawImage(stampImage, x - drawW / 2, y - drawH / 2, drawW, drawH);
  } else {
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stampDef?.label || String(stroke.stamp || ""), x, y);
  }
  ctx.restore();
}

function undoDrawingStroke() {
  const strokes = getActivePageDrawingStrokes();
  if (!strokes.length) {
    return;
  }
  strokes.pop();
  saveEditorState();
  renderDrawingCanvas();
}

function clearActivePageDrawing() {
  const key = String(activeEditorPage);
  editorState.drawings[key] = [];
  saveEditorState();
  renderDrawingCanvas();
}

function updateSelectedPlacement(patch) {
  const placement = getSelectedPlacement();
  if (!placement) {
    return;
  }
  if (Number.isFinite(patch.scale)) {
    placement.scale = THREE.MathUtils.clamp(patch.scale, 0.35, 2.4);
  }
  if (Number.isFinite(patch.rotation)) {
    placement.rotation = THREE.MathUtils.clamp(patch.rotation, -180, 180);
  }
  updatePlacementElementStyle(placement);
  markEditorStateDirty();
  updateEditorControls(false);
  if (!stickerEditor || stickerEditor.hidden) {
    refreshInlineStickerPage();
  }
}

function moveSelectedPlacementLayer(direction) {
  const selected = getSelectedPlacement();
  if (!selected) {
    return;
  }
  const placements = getActivePagePlacements().sort((a, b) => a.z - b.z);
  const index = placements.findIndex((placement) => placement.id === selected.id);
  const targetIndex = THREE.MathUtils.clamp(index + direction, 0, placements.length - 1);
  if (targetIndex === index) {
    return;
  }
  const temp = placements[index].z;
  placements[index].z = placements[targetIndex].z;
  placements[targetIndex].z = temp;
  saveEditorState();
  updatePlacementElementStyle(placements[index]);
  updatePlacementElementStyle(placements[targetIndex]);
  updateEditorControls();
}

function deleteSelectedPlacement() {
  if (!selectedPlacementId) {
    return;
  }
  const placements = getActivePagePlacements();
  const index = placements.findIndex((placement) => placement.id === selectedPlacementId);
  if (index >= 0) {
    placements.splice(index, 1);
  }
  findPlacementElement(selectedPlacementId)?.remove();
  selectedPlacementId = null;
  saveEditorState();
  updateEditorControls();
  updateInlineStickerControls();
}

function handleEditorKeydown(event) {
  if (!stickerEditor || stickerEditor.hidden) {
    return;
  }
  if (event.key === "Escape") {
    closeStickerEditor();
  }
  if ((event.key === "Delete" || event.key === "Backspace") && selectedPlacementId) {
    event.preventDefault();
    deleteSelectedPlacement();
  }
}

function updateEditorControls(syncInputs = true) {
  const placement = getSelectedPlacement();
  const disabled = editorMode !== "sticker" || !placement;
  for (const input of [editorScale, editorRotation]) {
    if (input) {
      input.disabled = disabled;
    }
  }
  for (const button of [editorLayerBack, editorLayerFront, editorDelete]) {
    if (button) {
      button.disabled = disabled;
    }
  }
  if (placement && syncInputs) {
    editorScale.value = String(placement.scale);
    editorRotation.value = String(placement.rotation);
  }
}

function setEditorPage(page) {
  const nextPage = THREE.MathUtils.clamp(Math.round(page), 1, editorPageCount());
  if (nextPage === activeEditorPage) {
    return;
  }
  activeEditorPage = nextPage;
  selectedPlacementId = null;
  stickerDragState = null;
  drawingPointerState = null;
  renderEditorShell();
}

function applyStickerEditorToBook() {
  flushEditorStateSave();
  saveEditorState();
  setBookPage(activeEditorPage, { skipEditorSync: true, force: true });
  refreshPageTemplateTextures();
  closeStickerEditor();
}

function setBookPage(page, options = {}) {
  if (!options.preserveCollectionTocPending) {
    pendingCollectionTocCategoryId = "";
  }
  if (activeSurface === "cover") {
    setBookSurface("inside", page, options);
    return;
  }
  cancelCoverOpen();
  const previousPage = activeBookPage;
  const nextPage = spreadStartForPage(page);
  if (nextPage === activeBookPage && !options.force) {
    updateBookPageControls();
    return;
  }
  const nextSpreadPosition = spreadPositionForBookPage(nextPage);
  const shouldAnimate = shouldAnimateBookPageTurn(previousPage, nextPage, options);
  const mode = options.turnMode || (Math.abs(nextPage - previousPage) <= 2 ? "single" : "jump");
  if (shouldAnimate) {
    preparePageTurnTextures(previousPage, nextPage);
    startSpreadJump(nextSpreadPosition, {
      ...spreadJumpOptionsForBookTurn(previousPage, nextPage, mode),
      onComplete: () => applyBookPageSelection(nextPage, options),
    });
    return;
  }

  applyBookPageSelection(nextPage, options);
  cancelSpreadJump();
  spreadPosition = nextSpreadPosition;
  flipProgress = 0;
  slider.value = "0";
  updatePage(flipProgress);
  syncUrl();
}

function setAlbumMode(mode) {
  const nextMode = mode === "collection" ? "collection" : "free";
  if (nextMode === activeAlbumMode) {
    updateAlbumModeUi();
    return;
  }
  closeStickerEditor();
  cancelCoverOpen();
  cancelSpreadJump();
  activeAlbumMode = nextMode;
  if (activeAlbumMode === "collection") {
    stickerEditMode = false;
  }
  activeBookPage = spreadStartForPage(1);
  activeEditorPage = 1;
  spreadPosition = spreadPositionForBookPage(activeBookPage);
  flipProgress = 0;
  slider.value = "0";
  selectedPlacementId = null;
  stickerDragState = null;
  assignSpineTexture();
  assignSideTabTextures();
  applyAlbumLayout();
  refreshPageTemplateTextures();
  renderCollectionStickerTray();
  updateAlbumModeUi();
  updatePage(flipProgress);
  resize();
  syncUrl();
}

function setBookSurface(surface, page = activeBookPage, options = {}) {
  if (!options.preserveCollectionTocPending) {
    pendingCollectionTocCategoryId = "";
  }
  const nextSurface = surface === "cover" ? "cover" : "inside";
  cancelSpreadJump();
  if (activeSurface === "cover" && nextSurface === "inside") {
    startCoverOpen(page);
    return;
  }
  if (activeSurface === "inside" && nextSurface === "cover") {
    startCoverClose();
    return;
  }
  cancelCoverOpen();
  activeSurface = nextSurface;
  isPlaying = false;
  playButton.classList.remove("playing");
  flipProgress = 0;
  slider.value = "0";
  closeBookPageJump();
  if (activeSurface === "inside") {
    const nextPage = spreadStartForPage(page);
    activeBookPage = nextPage;
    activeEditorPage = nextPage;
    spreadPosition = spreadPositionForBookPage(nextPage);
    selectedPlacementId = null;
    stickerDragState = null;
    updateInlineStickerControls();
  }
  applyVariantState();
}

function startCoverOpen(page = activeBookPage) {
  cancelCoverOpen();
  const nextPage = spreadStartForPage(page);
  activeSurface = "inside";
  isPlaying = false;
  playButton.classList.remove("playing");
  flipProgress = 0;
  slider.value = "0";
  slider.disabled = true;
  activeBookPage = nextPage;
  activeEditorPage = nextPage;
  spreadPosition = spreadPositionForBookPage(nextPage);
  selectedPlacementId = null;
  stickerDragState = null;
  updateInlineStickerControls();
  closeBookPageJump();
  refreshPageTemplateTextures();
  updateControlState();
  assignCoverTurnTextures();
  coverOpenAnimation = {
    startTime: 0,
    elapsed: 0,
    duration: COVER_OPEN_DURATION,
    direction: "open",
  };
  updateCollectionStickerTrayVisibility();
  renderCoverOpenTransition(0);
  syncUrl();
  coverOpenAnimation.startTime = performance.now();
}

function startCoverClose() {
  cancelCoverOpen();
  if (activeSurface !== "inside") {
    return;
  }
  isPlaying = false;
  playButton.classList.remove("playing");
  flipProgress = 0;
  slider.value = "0";
  slider.disabled = true;
  selectedPlacementId = null;
  stickerDragState = null;
  updateInlineStickerControls();
  closeBookPageJump();
  refreshPageTemplateTextures();
  updateControlState();
  assignCoverTurnTextures();
  coverOpenAnimation = {
    startTime: 0,
    elapsed: 0,
    duration: COVER_CLOSE_DURATION,
    direction: "close",
  };
  updateCollectionStickerTrayVisibility();
  renderCoverOpenTransition(1);
  coverOpenAnimation.startTime = performance.now();
}

function cancelCoverOpen() {
  if (!coverOpenAnimation) {
    coverTurn.visible = false;
    return;
  }
  coverOpenAnimation = null;
  coverTurn.visible = false;
  if (activeSurface === "inside") {
    assignTextureObject(frontPage, getPageTemplateTexture("right"));
    assignTextureObject(backPage, getPageTemplateTexture("left"));
    slider.disabled = false;
  }
  updateCollectionStickerTrayVisibility();
}

function applyBookPageSelection(nextPage, options = {}) {
  activeBookPage = nextPage;
  if (!options.skipEditorSync) {
    activeEditorPage = nextPage;
    selectedPlacementId = null;
    renderEditorShell();
    updateInlineStickerControls();
  }
  refreshPageTemplateTextures();
  updateBookPageControls();
}

function preparePageTurnTextures(previousPage, nextPage) {
  if (activeSurface !== "inside") {
    return;
  }
  if (nextPage >= previousPage) {
    assignTextureObject(frontPage, getPageTemplateTexture("right", Math.min(previousPage + 1, editorPageCount())));
    assignTextureObject(backPage, getPageTemplateTexture("left", nextPage));
    return;
  }
  assignTextureObject(frontPage, getPageTemplateTexture("right", Math.min(nextPage + 1, editorPageCount())));
  assignTextureObject(backPage, getPageTemplateTexture("left", previousPage));
}

function spreadJumpOptionsForBookTurn(previousPage, nextPage, mode) {
  if (mode === "single") {
    return {
      cycles: 1,
      duration: 0.34,
      minVisiblePageCount: 0,
      visiblePageCount: 0,
    };
  }
  const pairDistance = Math.abs(
    Math.floor((spreadStartForPage(nextPage) - 1) / 2) - Math.floor((spreadStartForPage(previousPage) - 1) / 2),
  );
  const visiblePageCount = THREE.MathUtils.clamp(pairDistance + 1, FLUTTER_PAGE_MIN_COUNT, FLUTTER_PAGE_MAX_COUNT);
  return {
    cycles: visiblePageCount,
    duration: THREE.MathUtils.lerp(0.34, 0.68, (visiblePageCount - 1) / (FLUTTER_PAGE_MAX_COUNT - 1)),
    minVisiblePageCount: FLUTTER_PAGE_MIN_COUNT,
    visiblePageCount,
  };
}

function shouldAnimateBookPageTurn(previousPage, nextPage, options) {
  if (options.animate === false || activeSurface === "cover" || previousPage === nextPage) {
    return false;
  }
  return !editorEnabled || !stickerEditor || stickerEditor.hidden;
}

function updateBookPageControls() {
  document.body.classList.toggle("is-cover-surface", activeSurface === "cover");
  if (activeSurface === "cover") {
    if (bookPageLabel) {
      bookPageLabel.textContent = "ひょうし";
      bookPageLabel.disabled = true;
    }
    if (bookPrevPage) {
      bookPrevPage.disabled = true;
    }
    if (bookNextPage) {
      bookNextPage.disabled = false;
    }
    if (bookPageControls) {
      bookPageControls.hidden = false;
    }
    renderBookPageJump();
    updateCollectionTraySelection();
    return;
  }
  const rightPageNumber = rightBookPageNumber();
  const rangeLabel = rightPageNumber > activeBookPage
    ? `${activeBookPage}-${rightPageNumber}`
    : String(activeBookPage);
  const lastSpreadStart = spreadStartForPage(editorPageCount());
  if (bookPageLabel) {
    bookPageLabel.textContent = `${rangeLabel} / ${editorPageCount()}`;
    bookPageLabel.disabled = activeSurface === "cover";
  }
  if (bookPrevPage) {
    bookPrevPage.disabled = false;
  }
  if (bookNextPage) {
    bookNextPage.disabled = activeSurface === "cover" || activeBookPage >= lastSpreadStart;
  }
  if (bookPageControls) {
    bookPageControls.hidden = false;
  }
  renderBookPageJump();
  updateCollectionTraySelection();
}

function toggleBookPageJump() {
  if (!bookPageJump || activeSurface === "cover") {
    return;
  }
  if (bookPageJump.hidden) {
    renderBookPageJump();
    bookPageJump.hidden = false;
    bookPageLabel?.setAttribute("aria-expanded", "true");
  } else {
    closeBookPageJump();
  }
}

function closeBookPageJump() {
  if (!bookPageJump) {
    return;
  }
  bookPageJump.hidden = true;
  bookPageLabel?.setAttribute("aria-expanded", "false");
}

function renderBookPageJump() {
  if (!bookPageJump) {
    return;
  }
  const pairCount = Math.max(1, Math.ceil(editorPageCount() / 2));
  const activeStart = spreadStartForPage(activeBookPage);
  bookPageJump.replaceChildren();
  const coverButton = document.createElement("button");
  coverButton.type = "button";
  coverButton.textContent = "ひょうし";
  coverButton.classList.toggle("is-active", activeSurface === "cover");
  coverButton.addEventListener("click", () => {
    closeBookPageJump();
    setBookSurface("cover", activeBookPage);
  });
  bookPageJump.append(coverButton);
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const pageStart = pairIndex * 2 + 1;
    const pageEnd = Math.min(pageStart + 1, editorPageCount());
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = pageEnd > pageStart ? `${pageStart}-${pageEnd}` : String(pageStart);
    button.classList.toggle("is-active", pageStart === activeStart);
    button.addEventListener("click", () => {
      closeBookPageJump();
      if (activeSurface === "cover") {
        setBookSurface("inside", pageStart);
        return;
      }
      setBookPage(pageStart, { turnMode: Math.abs(pageStart - activeBookPage) <= 2 ? "single" : "jump" });
    });
    bookPageJump.append(button);
  }
}

function editorPageName(page) {
  return activePageDefinitions()[page - 1]?.label || "ページ";
}

function editorPageCount() {
  return Math.max(1, activePageDefinitions().length);
}

function spreadStartForPage(page) {
  const count = editorPageCount();
  let nextPage = THREE.MathUtils.clamp(Math.round(page) || 1, 1, count);
  if (nextPage % 2 === 0) {
    nextPage -= 1;
  }
  return THREE.MathUtils.clamp(nextPage, 1, count);
}

function spreadPositionForBookPage(page) {
  const pairCount = Math.max(1, Math.ceil(editorPageCount() / 2));
  if (pairCount <= 1) {
    return 0;
  }
  const pairIndex = Math.floor((spreadStartForPage(page) - 1) / 2);
  return THREE.MathUtils.clamp(pairIndex / (pairCount - 1), 0, 1);
}

function rightBookPageNumber() {
  return Math.min(activeBookPage + 1, editorPageCount());
}

function activeEditorPageDefinition() {
  return editorPageDefinitions[activeEditorPage - 1] || editorPageDefinitions[0] || null;
}

function activeBookPageDefinition() {
  const definitions = activePageDefinitions();
  return definitions[activeBookPage - 1] || definitions[0] || null;
}

function stickersForPage(page) {
  if (activeAlbumMode === "collection") {
    return collectionStickersForPageDefinition(collectionPageDefinitions[Math.max(1, Math.round(page)) - 1]);
  }
  const pageDef = editorPageDefinitions[page - 1];
  if (!pageDef?.gameId) {
    return stickerOptions;
  }
  return stickerOptions.filter((sticker) => sticker.gameId === pageDef.gameId);
}

function collectionStickersForPageDefinition(pageDef) {
  if (pageDef?.subjectId) {
    const subject = collectionStickerOptions.find((sticker) => sticker.id === pageDef.subjectId);
    return subject ? [subject] : [];
  }
  if (Array.isArray(pageDef?.subjectIds)) {
    return pageDef.subjectIds
      .map((id) => collectionStickerOptions.find((sticker) => sticker.id === id))
      .filter(Boolean);
  }
  if (Array.isArray(pageDef?.stickerIds)) {
    return pageDef.stickerIds
      .map((id) => collectionStickerOptions.find((sticker) => sticker.id === id))
      .filter(Boolean);
  }
  if (!pageDef?.page) {
    return [];
  }
  const start = (Math.max(1, Math.round(pageDef.page)) - 1) * COLLECTION_ALBUM_STICKERS_PER_PAGE;
  return collectionStickerOptions.slice(start, start + COLLECTION_ALBUM_STICKERS_PER_PAGE);
}

function getActivePagePlacements() {
  return getPagePlacements(activeEditorPage);
}

function getPagePlacements(page) {
  const key = String(page);
  if (!Array.isArray(editorState.pages[key])) {
    editorState.pages[key] = [];
  }
  return editorState.pages[key];
}

function getCollectionPagePlacements(page) {
  const key = String(page);
  if (!collectionAlbumState.pages || typeof collectionAlbumState.pages !== "object") {
    collectionAlbumState.pages = {};
  }
  if (!Array.isArray(collectionAlbumState.pages[key])) {
    collectionAlbumState.pages[key] = [];
  }
  return collectionAlbumState.pages[key];
}

function getActivePageDrawingStrokes() {
  return getPageDrawingStrokes(activeEditorPage);
}

function getPageDrawingStrokes(page) {
  const key = String(page);
  if (!editorState.drawings || typeof editorState.drawings !== "object") {
    editorState.drawings = {};
  }
  if (!Array.isArray(editorState.drawings[key])) {
    editorState.drawings[key] = [];
  }
  return editorState.drawings[key];
}

function getPlacementById(id) {
  return getActivePagePlacements().find((placement) => placement.id === id) || null;
}

function getPlacementByIdOnPage(id, page) {
  return getPagePlacements(page).find((placement) => placement.id === id) || null;
}

function getSelectedPlacement() {
  return selectedPlacementId ? getPlacementById(selectedPlacementId) : null;
}

function nextPlacementZ(placements) {
  return placements.reduce((max, placement) => Math.max(max, Number(placement.z) || 0), 0) + 10;
}

function defaultStickerScale(sticker) {
  if (/nori|ketchup/.test(sticker.id)) {
    return 0.72;
  }
  if (/box_|rice_/.test(sticker.id)) {
    return 1.18;
  }
  return 1;
}

function loadEditorState() {
  try {
    const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
    if (!raw) {
      return createEmptyEditorState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.pages || typeof parsed.pages !== "object") {
      return createEmptyEditorState();
    }
    return {
      version: parsed.version || 1,
      pages: parsed.pages,
      drawings: parsed.drawings && typeof parsed.drawings === "object" ? parsed.drawings : {},
      defaultContentSeedVersion: parsed.defaultContentSeedVersion || 0,
      emptyStartVersion: parsed.emptyStartVersion || 0,
    };
  } catch {
    return createEmptyEditorState();
  }
}

function loadCollectionAlbumState() {
  try {
    const raw = localStorage.getItem(COLLECTION_ALBUM_PLACEMENTS_STORAGE_KEY);
    if (!raw) {
      return createEmptyCollectionAlbumState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.pages || typeof parsed.pages !== "object") {
      return createEmptyCollectionAlbumState();
    }
    return {
      version: parsed.version || 1,
      pages: parsed.pages,
    };
  } catch {
    return createEmptyCollectionAlbumState();
  }
}

function createEmptyEditorState() {
  return {
    version: EDITOR_STATE_VERSION,
    pages: {},
    drawings: {},
    defaultContentSeedVersion: 0,
    emptyStartVersion: EMPTY_STICKER_START_VERSION,
  };
}

function createEmptyCollectionAlbumState() {
  return { version: COLLECTION_ALBUM_STATE_VERSION, pages: {} };
}

function saveEditorState() {
  if (stickerTutorialState?.editorSnapshot) {
    return;
  }
  try {
    editorState.version = EDITOR_STATE_VERSION;
    if (!editorState.drawings || typeof editorState.drawings !== "object") {
      editorState.drawings = {};
    }
    editorState.defaultContentSeedVersion = editorState.defaultContentSeedVersion || 0;
    editorState.emptyStartVersion = editorState.emptyStartVersion || EMPTY_STICKER_START_VERSION;
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editorState));
  } catch {
    // Local storage can be unavailable in private contexts; editing still works for the session.
  }
}

function saveCollectionAlbumState() {
  try {
    collectionAlbumState.version = COLLECTION_ALBUM_STATE_VERSION;
    if (!collectionAlbumState.pages || typeof collectionAlbumState.pages !== "object") {
      collectionAlbumState.pages = {};
    }
    localStorage.setItem(COLLECTION_ALBUM_PLACEMENTS_STORAGE_KEY, JSON.stringify(collectionAlbumState));
  } catch {
    // Keep collection placement editing available even if storage is blocked.
  }
}

function markEditorStateDirty() {
  editorStateDirty = true;
  if (editorStateSaveTimer) {
    return;
  }
  editorStateSaveTimer = window.setTimeout(() => {
    editorStateSaveTimer = 0;
    flushEditorStateSave();
  }, 160);
}

function flushEditorStateSave() {
  if (editorStateSaveTimer) {
    window.clearTimeout(editorStateSaveTimer);
    editorStateSaveTimer = 0;
  }
  if (!editorStateDirty) {
    return;
  }
  editorStateDirty = false;
  saveEditorState();
}

function createPlacementId() {
  return globalThis.crypto?.randomUUID?.() || `sticker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDrawingStrokeId() {
  return globalThis.crypto?.randomUUID?.() || `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stickerAssetUrl(path) {
  if (/^https?:\/\//.test(path) || path.startsWith("../") || path.startsWith("./")) {
    return path;
  }
  return `${STICKER_ASSET_PREFIX}${path}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function loadLayerTuningStore() {
  try {
    const raw = localStorage.getItem(TUNING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return normalizeTuningStore(parsed);
  } catch {
    return {};
  }
}

function migrateLegacyTuningStore() {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_TUNING_STORAGE_KEY);
    if (!legacyRaw) {
      return {};
    }
    const legacy = normalizeTuning(JSON.parse(legacyRaw));
    const pair = thicknessPairForSpread(spreadPosition);
    return { [pair.key]: legacy };
  } catch {
    return {};
  }
}

function normalizeTuningStore(store) {
  if (!store || typeof store !== "object") {
    return {};
  }
  const normalized = {};
  for (const [key, value] of Object.entries(store)) {
    normalized[key] = normalizeTuning(value, defaultTuningForPairKey(key));
  }
  return normalized;
}

function normalizeTuning(value, fallback = DEFAULT_TUNING) {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }
  const next = { ...fallback };
  for (const [key, , min, max] of TUNING_FIELDS) {
    next[key] = readClampedNumber(value[key], fallback[key], min, max);
  }
  return next;
}

function loadCoverTuning() {
  try {
    const raw = localStorage.getItem(COVER_TUNING_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_COVER_TUNING };
    }
    return normalizeCoverTuning(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_COVER_TUNING };
  }
}

function normalizeCoverTuning(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_COVER_TUNING };
  }
  const next = { ...DEFAULT_COVER_TUNING };
  for (const [key, , min, max] of COVER_TUNING_FIELDS) {
    next[key] = readClampedNumber(value[key], DEFAULT_COVER_TUNING[key], min, max);
  }
  return next;
}

function saveCoverTuning(nextTuning) {
  coverTuning = normalizeCoverTuning(nextTuning);
  persistCoverTuning();
}

function persistCoverTuning() {
  try {
    localStorage.setItem(COVER_TUNING_STORAGE_KEY, JSON.stringify(coverTuning));
  } catch {}
}

function loadZukanTextTuning() {
  try {
    const raw = localStorage.getItem(ZUKAN_TEXT_TUNING_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_ZUKAN_TEXT_TUNING };
    }
    return normalizeZukanTextTuning(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ZUKAN_TEXT_TUNING };
  }
}

function normalizeZukanTextTuning(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_ZUKAN_TEXT_TUNING };
  }
  const next = { ...DEFAULT_ZUKAN_TEXT_TUNING };
  for (const [key, , min, max] of ZUKAN_TEXT_TUNING_FIELDS) {
    next[key] = readClampedNumber(value[key], DEFAULT_ZUKAN_TEXT_TUNING[key], min, max);
  }
  return next;
}

function saveZukanTextTuning(nextTuning) {
  zukanTextTuning = normalizeZukanTextTuning(nextTuning);
  persistZukanTextTuning();
  refreshZukanTextTuningControls();
}

function persistZukanTextTuning() {
  try {
    localStorage.setItem(ZUKAN_TEXT_TUNING_STORAGE_KEY, JSON.stringify(zukanTextTuning));
  } catch {}
}

function normalizeZukanTemplateType(value) {
  return value === "index" || value === "detail" ? value : "auto";
}

function normalizeZukanSideTemplateSettings(value) {
  return {
    left: normalizeZukanTemplateType(value?.left),
    right: normalizeZukanTemplateType(value?.right),
  };
}

function loadZukanSideTemplateSettings() {
  try {
    const raw = localStorage.getItem(ZUKAN_SIDE_TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return normalizeZukanSideTemplateSettings();
    }
    return normalizeZukanSideTemplateSettings(JSON.parse(raw));
  } catch {
    return normalizeZukanSideTemplateSettings();
  }
}

function saveZukanSideTemplateSettings(nextSettings) {
  zukanSideTemplateSettings = normalizeZukanSideTemplateSettings(nextSettings);
  try {
    localStorage.setItem(ZUKAN_SIDE_TEMPLATE_STORAGE_KEY, JSON.stringify(zukanSideTemplateSettings));
  } catch {}
  refreshZukanSettingsControls();
  refreshPageTemplateTextures();
}

function zukanTemplateTypeForPageDef(pageDef) {
  return pageDef?.type === "detail" ? "detail" : "index";
}

function zukanTemplateTypeForSide(pageDef, side) {
  const override = normalizeZukanTemplateType(zukanSideTemplateSettings?.[side]);
  return override === "auto" ? zukanTemplateTypeForPageDef(pageDef) : override;
}

function refreshZukanSettingsControls() {
  for (const button of zukanSettingsButtons) {
    const side = button.dataset.zukanSide;
    const type = normalizeZukanTemplateType(button.dataset.zukanType);
    const active = normalizeZukanTemplateType(zukanSideTemplateSettings?.[side]) === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  updateStickerEditModeUi();
}

function zukanTextOffset(key) {
  const value = Number(zukanTextTuning?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function zukanIndexSlotTuningKey(slotIndex, partId, axis) {
  return `indexCard${slotIndex + 1}${partId}${axis}`;
}

function zukanIndexSlotGroupId(slotIndex, partId) {
  return `indexCard${slotIndex + 1}${partId}`;
}

function zukanIndexSlotTextOffset(slotIndex, partId, axis) {
  const part = ZUKAN_INDEX_CARD_TUNING_PARTS.find((item) => item.id === partId);
  const baseOffset = part ? zukanTextOffset(`${part.baseKey}${axis}`) : 0;
  return baseOffset + zukanTextOffset(zukanIndexSlotTuningKey(slotIndex, partId, axis));
}

function zukanTextTuningGroupForField(key) {
  return ZUKAN_TEXT_TUNING_FIELD_GROUP_BY_KEY.get(key) || "";
}

function zukanTextTuningGroupLabel(id) {
  return ZUKAN_TEXT_TUNING_GROUP_BY_ID.get(id)?.label || "えらんでいません";
}

function clampZukanTextTuningValue(key, value) {
  const limits = ZUKAN_TEXT_TUNING_LIMIT_BY_KEY.get(key);
  if (!limits) {
    return Number(value) || 0;
  }
  return readClampedNumber(value, DEFAULT_ZUKAN_TEXT_TUNING[key], limits.min, limits.max);
}

function selectZukanTuningTarget(targetId, { redraw = false } = {}) {
  selectedZukanTuningTargetId = ZUKAN_TEXT_TUNING_GROUP_BY_ID.has(targetId) ? targetId : "";
  refreshZukanTextTuningControls();
  if (redraw) {
    refreshPageTemplateTextures();
    updatePage(flipProgress);
  }
}

function moveZukanTextTuningTarget(targetId, deltaX, deltaY, baseTuning = zukanTextTuning) {
  const group = ZUKAN_TEXT_TUNING_GROUP_BY_ID.get(targetId);
  if (!group) {
    return false;
  }
  const nextTuning = { ...zukanTextTuning };
  for (const key of group.keys) {
    if (!key.endsWith("X") && !key.endsWith("Y")) {
      continue;
    }
    const baseValue = Number(baseTuning?.[key]) || 0;
    const delta = key.endsWith("X") ? deltaX : deltaY;
    nextTuning[key] = clampZukanTextTuningValue(key, baseValue + delta);
  }
  saveZukanTextTuning(nextTuning);
  return true;
}

function refreshZukanTextTuningControls() {
  const selectedLabel = document.getElementById("zukanTuningSelectedLabel");
  if (selectedLabel) {
    selectedLabel.textContent = `えらんでいる: ${zukanTextTuningGroupLabel(selectedZukanTuningTargetId)}`;
  }
  const selectedGroupId = selectedZukanTuningTargetId;
  document.querySelectorAll("[data-zukan-tuning-target]").forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.zukanTuningTarget === selectedGroupId);
  });
  let firstSelectedRow = null;
  document.querySelectorAll("[data-zukan-tuning-key]").forEach((row) => {
    const key = row.dataset.zukanTuningKey || "";
    const groupId = zukanTextTuningGroupForField(key);
    const isSelected = groupId === selectedGroupId;
    row.classList.toggle("is-selected", isSelected);
    if (isSelected && !firstSelectedRow) {
      firstSelectedRow = row;
    }
    row.querySelectorAll("input").forEach((input) => {
      input.value = String(zukanTextTuning[key] ?? DEFAULT_ZUKAN_TEXT_TUNING[key] ?? 0);
    });
  });
  if (firstSelectedRow) {
    firstSelectedRow.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function getCurrentLayerTuning() {
  const pair = thicknessPairForSpread(spreadPosition);
  if (!layerTuningByPair[pair.key]) {
    layerTuningByPair[pair.key] = defaultTuningForPairKey(pair.key);
  }
  return layerTuningByPair[pair.key];
}

function saveCurrentLayerTuning(tuning) {
  const pair = thicknessPairForSpread(spreadPosition);
  layerTuningByPair[pair.key] = normalizeTuning(tuning, defaultTuningForPairKey(pair.key));
  persistLayerTuningStore();
}

function defaultTuningForPairKey(key = "half-half") {
  const [leftLevel = "half", rightLevel = "half"] = String(key).split("-");
  return {
    ...SHARED_TUNING_FALLBACK,
    stackLeftScaleY: scaleForThicknessLevel(leftLevel),
    stackRightScaleY: scaleForThicknessLevel(rightLevel),
  };
}

function scaleForThicknessLevel(level) {
  return THICKNESS_DEFAULT_SCALE_Y[level] ?? THICKNESS_DEFAULT_SCALE_Y.full;
}

function persistLayerTuningStore() {
  try {
    localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(layerTuningByPair));
  } catch {}
}

function cloneTuningStore(store = layerTuningByPair) {
  const cloned = {};
  if (!store || typeof store !== "object") {
    return cloned;
  }
  for (const [key, value] of Object.entries(store)) {
    cloned[key] = normalizeTuning(value, defaultTuningForPairKey(key));
  }
  return cloned;
}

function tuningPairKeys() {
  return SPREAD_PRESETS.map(([key]) => key);
}

function rightOnlyTuningBase() {
  return normalizeTuning(layerTuningByPair[RIGHT_ONLY_PAIR_KEY], defaultTuningForPairKey(RIGHT_ONLY_PAIR_KEY));
}

function applyRightOnlyTuningToAllPairs({ pushHistory = false, overwrite = true } = {}) {
  if (pushHistory) {
    pushTuningUndo("右だけを全てへ");
  }
  const base = rightOnlyTuningBase();
  for (const key of tuningPairKeys()) {
    if (!overwrite && layerTuningByPair[key]) {
      continue;
    }
    const fallback = defaultTuningForPairKey(key);
    layerTuningByPair[key] = normalizeTuning({
      ...base,
      stackLeftScaleY: fallback.stackLeftScaleY,
      stackRightScaleY: fallback.stackRightScaleY,
    }, fallback);
  }
  persistLayerTuningStore();
}

function seedAllTuningPairsFromRightOnlyOnce() {
  try {
    if (localStorage.getItem(RIGHT_ONLY_SYNC_MARKER_KEY) === "v1") {
      return;
    }
  } catch {}

  for (const key of tuningPairKeys()) {
    if (!layerTuningByPair[key]) {
      layerTuningByPair[key] = defaultTuningForPairKey(key);
    }
  }
  persistLayerTuningStore();

  try {
    localStorage.setItem(RIGHT_ONLY_SYNC_MARKER_KEY, "v1");
  } catch {}
}

function createTuningSnapshot(label) {
  return {
    label,
    spreadPosition,
    layerTuningByPair: cloneTuningStore(),
    coverTuning: normalizeCoverTuning(coverTuning),
    zukanTextTuning: normalizeZukanTextTuning(zukanTextTuning),
  };
}

function pushTuningUndo(label) {
  tuningUndoStack.push(createTuningSnapshot(label));
  if (tuningUndoStack.length > TUNING_HISTORY_LIMIT) {
    tuningUndoStack.shift();
  }
  tuningRedoStack = [];
  updateTuningUndoRedoButtons();
}

function restoreTuningSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  activeTuningEditLabel = "";
  spreadPosition = THREE.MathUtils.clamp(Number(snapshot.spreadPosition), 0, 1);
  layerTuningByPair = cloneTuningStore(snapshot.layerTuningByPair);
  coverTuning = normalizeCoverTuning(snapshot.coverTuning);
  zukanTextTuning = normalizeZukanTextTuning(snapshot.zukanTextTuning);
  persistLayerTuningStore();
  persistCoverTuning();
  persistZukanTextTuning();
  setupTuningPanel();
  updatePage(flipProgress);
  syncUrl();
  updateTuningUndoRedoButtons();
}

function undoTuningChange() {
  const snapshot = tuningUndoStack.pop();
  if (!snapshot) {
    return;
  }
  tuningRedoStack.push(createTuningSnapshot("redo"));
  restoreTuningSnapshot(snapshot);
}

function redoTuningChange() {
  const snapshot = tuningRedoStack.pop();
  if (!snapshot) {
    return;
  }
  tuningUndoStack.push(createTuningSnapshot("undo"));
  restoreTuningSnapshot(snapshot);
}

function beginTuningEdit(label) {
  if (activeTuningEditLabel) {
    return;
  }
  pushTuningUndo(label);
  activeTuningEditLabel = label;
}

function endTuningEdit() {
  activeTuningEditLabel = "";
}

function updateTuningUndoRedoButtons() {
  const undo = document.getElementById("tuningUndo");
  if (undo) {
    undo.disabled = tuningUndoStack.length === 0;
  }
  const redo = document.getElementById("tuningRedo");
  if (redo) {
    redo.disabled = tuningRedoStack.length === 0;
  }
}

function setupTuningPanel() {
  if (!tuningPanel || !tuningEnabled) {
    return;
  }
  tuningPanel.hidden = false;
  tuningPanel.innerHTML = "";

  const title = document.createElement("div");
  title.className = "tuning-title";
  title.textContent = "厚みレイヤー調整";
  const version = document.createElement("span");
  version.textContent = ASSET_VERSION;
  title.append(version);
  tuningPanel.append(title);

  if (activeSurface === "cover") {
    setupCoverTuningPanel();
    return;
  }

  if (activeAlbumMode === "collection") {
    appendZukanTextTuningSection(tuningPanel);
  }

  const pair = thicknessPairForSpread(spreadPosition);
  const pairLabel = document.createElement("div");
  pairLabel.className = "tuning-pair";
  pairLabel.textContent = `組み合わせ: ${pair.left} / ${pair.right}`;
  tuningPanel.append(pairLabel);

  const presets = document.createElement("div");
  presets.className = "tuning-presets";
  for (const [key, presetSpread, label] of SPREAD_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.classList.toggle("is-active", key === pair.key);
    button.addEventListener("click", () => {
      if (spreadPosition === presetSpread) {
        return;
      }
      startSpreadJump(presetSpread, { recordUndo: true });
    });
    presets.append(button);
  }
  tuningPanel.append(presets);

  const grid = document.createElement("div");
  grid.className = "tuning-grid";
  tuningPanel.append(grid);

  appendSpreadTuningRow(grid);

  const currentTuning = getCurrentLayerTuning();
  for (const [key, label, min, max, step] of TUNING_FIELDS) {
    const row = document.createElement("label");
    row.className = "tuning-row";

    const text = document.createElement("span");
    text.textContent = label;

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(currentTuning[key]);

    const number = document.createElement("input");
    number.type = "number";
    number.min = String(min);
    number.max = String(max);
    number.step = String(step);
    number.value = String(currentTuning[key]);

    const update = (nextValue) => {
      const parsed = Number(nextValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      const nextTuning = { ...getCurrentLayerTuning() };
      nextTuning[key] = THREE.MathUtils.clamp(parsed, min, max);
      range.value = String(nextTuning[key]);
      number.value = String(nextTuning[key]);
      saveCurrentLayerTuning(nextTuning);
      updateTuningOutput();
      updatePage(flipProgress);
    };

    range.addEventListener("pointerdown", () => beginTuningEdit(label));
    range.addEventListener("keydown", () => beginTuningEdit(label));
    range.addEventListener("input", () => {
      beginTuningEdit(label);
      update(range.value);
    });
    range.addEventListener("change", endTuningEdit);
    range.addEventListener("pointerup", endTuningEdit);
    range.addEventListener("blur", endTuningEdit);
    number.addEventListener("change", () => {
      pushTuningUndo(label);
      update(number.value);
    });
    row.append(text, range, number);
    grid.append(row);
  }

  const actions = document.createElement("div");
  actions.className = "tuning-actions";
  const syncAll = document.createElement("button");
  syncAll.type = "button";
  syncAll.textContent = "右だけを全てへ";
  syncAll.addEventListener("click", () => {
    applyRightOnlyTuningToAllPairs({ pushHistory: true });
    setupTuningPanel();
    updatePage(flipProgress);
    updateTuningOutput();
  });

  const undo = document.createElement("button");
  undo.type = "button";
  undo.id = "tuningUndo";
  undo.textContent = "取り消し";
  undo.disabled = tuningUndoStack.length === 0;
  undo.addEventListener("click", undoTuningChange);

  const redo = document.createElement("button");
  redo.type = "button";
  redo.id = "tuningRedo";
  redo.textContent = "やり直し";
  redo.disabled = tuningRedoStack.length === 0;
  redo.addEventListener("click", redoTuningChange);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "現在リセット";
  reset.addEventListener("click", () => {
    const pair = thicknessPairForSpread(spreadPosition);
    pushTuningUndo("現在リセット");
    saveCurrentLayerTuning(defaultTuningForPairKey(pair.key));
    setupTuningPanel();
    updatePage(flipProgress);
  });

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "全コピー";
  copy.addEventListener("click", async () => {
    const text = tuningExportText();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    updateTuningOutput();
  });
  actions.append(syncAll, undo, redo, reset, copy);
  tuningPanel.append(actions);

  const output = document.createElement("textarea");
  output.className = "tuning-output";
  output.readOnly = true;
  output.id = "tuningOutput";
  tuningPanel.append(output);
  updateTuningOutput();
  updateTuningUndoRedoButtons();
}

function setupCoverTuningPanel() {
  const surfaceLabel = document.createElement("div");
  surfaceLabel.className = "tuning-pair";
  surfaceLabel.textContent = "表紙: 厚み / 背景 合成";
  tuningPanel.append(surfaceLabel);

  const grid = document.createElement("div");
  grid.className = "tuning-grid";
  tuningPanel.append(grid);

  for (const [key, label, min, max, step] of COVER_TUNING_FIELDS) {
    const row = document.createElement("label");
    row.className = "tuning-row";

    const text = document.createElement("span");
    text.textContent = label;

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(coverTuning[key]);

    const number = document.createElement("input");
    number.type = "number";
    number.min = String(min);
    number.max = String(max);
    number.step = String(step);
    number.value = String(coverTuning[key]);

    const update = (nextValue) => {
      const parsed = Number(nextValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      const nextTuning = { ...coverTuning };
      nextTuning[key] = THREE.MathUtils.clamp(parsed, min, max);
      saveCoverTuning(nextTuning);
      range.value = String(coverTuning[key]);
      number.value = String(coverTuning[key]);
      applyCoverTuning();
      updateTuningOutput();
    };

    range.addEventListener("pointerdown", () => beginTuningEdit(label));
    range.addEventListener("keydown", () => beginTuningEdit(label));
    range.addEventListener("input", () => {
      beginTuningEdit(label);
      update(range.value);
    });
    range.addEventListener("change", endTuningEdit);
    range.addEventListener("pointerup", endTuningEdit);
    range.addEventListener("blur", endTuningEdit);
    number.addEventListener("change", () => {
      pushTuningUndo(label);
      update(number.value);
    });
    row.append(text, range, number);
    grid.append(row);
  }

  const actions = document.createElement("div");
  actions.className = "tuning-actions";

  const undo = document.createElement("button");
  undo.type = "button";
  undo.id = "tuningUndo";
  undo.textContent = "取り消し";
  undo.disabled = tuningUndoStack.length === 0;
  undo.addEventListener("click", undoTuningChange);

  const redo = document.createElement("button");
  redo.type = "button";
  redo.id = "tuningRedo";
  redo.textContent = "やり直し";
  redo.disabled = tuningRedoStack.length === 0;
  redo.addEventListener("click", redoTuningChange);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "表紙リセット";
  reset.addEventListener("click", () => {
    pushTuningUndo("表紙リセット");
    saveCoverTuning(DEFAULT_COVER_TUNING);
    applyCoverTuning();
    setupTuningPanel();
  });

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "コピー";
  copy.addEventListener("click", async () => {
    const text = tuningExportText();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    updateTuningOutput();
  });

  actions.append(undo, redo, reset, copy);
  tuningPanel.append(actions);

  const output = document.createElement("textarea");
  output.className = "tuning-output";
  output.readOnly = true;
  output.id = "tuningOutput";
  tuningPanel.append(output);
  updateTuningOutput();
  updateTuningUndoRedoButtons();
}

function appendSpreadTuningRow(grid) {
  const row = document.createElement("label");
  row.className = "tuning-row";

  const text = document.createElement("span");
  text.textContent = "見開き位置";

  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = "1";
  range.step = "0.05";
  range.value = String(spreadPosition);

  const number = document.createElement("input");
  number.type = "number";
  number.min = "0";
  number.max = "1";
  number.step = "0.05";
  number.value = String(spreadPosition);

  const update = (nextValue) => {
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      return;
    }
    cancelSpreadJump();
    spreadPosition = THREE.MathUtils.clamp(parsed, 0, 1);
    range.value = String(spreadPosition);
    number.value = String(spreadPosition);
    setupTuningPanel();
    updateTuningOutput();
    updatePage(flipProgress);
    syncUrl();
  };

  range.addEventListener("pointerdown", () => beginTuningEdit("見開き位置"));
  range.addEventListener("keydown", () => beginTuningEdit("見開き位置"));
  range.addEventListener("input", () => {
    beginTuningEdit("見開き位置");
    update(range.value);
  });
  range.addEventListener("change", endTuningEdit);
  range.addEventListener("pointerup", endTuningEdit);
  range.addEventListener("blur", endTuningEdit);
  number.addEventListener("change", () => {
    pushTuningUndo("見開き位置");
    update(number.value);
  });
  row.append(text, range, number);
  grid.append(row);
}

function appendZukanTextTuningSection(parent) {
  const sectionTitle = document.createElement("div");
  sectionTitle.className = "tuning-pair";
  sectionTitle.textContent = "ずかん もじ いち";
  parent.append(sectionTitle);

  const hint = document.createElement("div");
  hint.className = "tuning-hint";
  hint.textContent = "プレビュー上の文字や絵をクリックして、ドラッグでうごかせます。";
  parent.append(hint);

  const selected = document.createElement("div");
  selected.id = "zukanTuningSelectedLabel";
  selected.className = "tuning-selected-label";
  selected.textContent = `えらんでいる: ${zukanTextTuningGroupLabel(selectedZukanTuningTargetId)}`;
  parent.append(selected);

  const targets = document.createElement("div");
  targets.className = "tuning-target-list";
  for (const group of ZUKAN_TEXT_TUNING_GROUPS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tuning-target-button";
    button.dataset.zukanTuningTarget = group.id;
    button.textContent = group.label;
    button.addEventListener("click", () => selectZukanTuningTarget(group.id, { redraw: true }));
    targets.append(button);
  }
  parent.append(targets);

  const grid = document.createElement("div");
  grid.className = "tuning-grid";
  parent.append(grid);

  for (const [key, label, min, max, step] of ZUKAN_TEXT_TUNING_FIELDS) {
    const row = document.createElement("label");
    row.className = "tuning-row";
    row.dataset.zukanTuningKey = key;

    const text = document.createElement("span");
    text.textContent = label;

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(zukanTextTuning[key]);

    const number = document.createElement("input");
    number.type = "number";
    number.min = String(min);
    number.max = String(max);
    number.step = String(step);
    number.value = String(zukanTextTuning[key]);

    const update = (nextValue) => {
      const parsed = Number(nextValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      const nextTuning = { ...zukanTextTuning };
      nextTuning[key] = THREE.MathUtils.clamp(parsed, min, max);
      saveZukanTextTuning(nextTuning);
      selectZukanTuningTarget(zukanTextTuningGroupForField(key));
      updateTuningOutput();
      refreshPageTemplateTextures();
      updatePage(flipProgress);
    };

    range.addEventListener("pointerdown", () => {
      selectZukanTuningTarget(zukanTextTuningGroupForField(key), { redraw: true });
      beginTuningEdit(label);
    });
    range.addEventListener("keydown", () => {
      selectZukanTuningTarget(zukanTextTuningGroupForField(key), { redraw: true });
      beginTuningEdit(label);
    });
    range.addEventListener("input", () => {
      beginTuningEdit(label);
      update(range.value);
    });
    range.addEventListener("change", endTuningEdit);
    range.addEventListener("pointerup", endTuningEdit);
    range.addEventListener("blur", endTuningEdit);
    number.addEventListener("change", () => {
      pushTuningUndo(label);
      update(number.value);
    });
    number.addEventListener("focus", () => selectZukanTuningTarget(zukanTextTuningGroupForField(key), { redraw: true }));
    row.append(text, range, number);
    grid.append(row);
  }

  const actions = document.createElement("div");
  actions.className = "tuning-actions";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "もじリセット";
  reset.addEventListener("click", () => {
    pushTuningUndo("もじリセット");
    saveZukanTextTuning(DEFAULT_ZUKAN_TEXT_TUNING);
    selectZukanTuningTarget("");
    setupTuningPanel();
    updateTuningOutput();
    refreshPageTemplateTextures();
    updatePage(flipProgress);
  });
  actions.append(reset);
  parent.append(actions);
  refreshZukanTextTuningControls();
}

function tuningExportText() {
  if (activeSurface === "cover") {
    return JSON.stringify(
      {
        surface: "cover",
        textureSize: "1472x1536",
        aspect: Number(PAGE_ASPECT.toFixed(6)),
        promptRatio: "23:24",
        cornerRadiusPx: 92,
        cover: coverTuning,
      },
      null,
      2,
    );
  }

  const pair = thicknessPairForSpread(spreadPosition);
  return JSON.stringify(
    {
      spread: Number(spreadPosition.toFixed(3)),
      pair: pair.key,
      leftLevel: pair.left,
      rightLevel: pair.right,
      current: getCurrentLayerTuning(),
      allPairs: layerTuningByPair,
      zukanText: activeAlbumMode === "collection" ? zukanTextTuning : undefined,
    },
    null,
    2,
  );
}

function updateTuningOutput() {
  const output = document.getElementById("tuningOutput");
  if (output) {
    output.value = tuningExportText();
  }
}

function readClampedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return THREE.MathUtils.clamp(parsed, min, max);
}

function readBooleanParam(name) {
  const value = params.get(name);
  return value === "1" || value === "true" || value === "yes";
}

function loadTexture(file) {
  return new Promise((resolve, reject) => {
    loader.load(
      `${ASSET_ROOT}${file}?v=${ASSET_VERSION}`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function ensureTexture(file) {
  if (!isTextureFileName(file)) {
    return Promise.resolve(null);
  }
  if (textureMap.has(file)) {
    return Promise.resolve(textureMap.get(file));
  }
  if (!textureLoadPromises.has(file)) {
    textureLoadPromises.set(
      file,
      loadTexture(file)
        .then((texture) => {
          textureMap.set(file, texture);
          return texture;
        })
        .finally(() => {
          textureLoadPromises.delete(file);
        }),
    );
  }
  return textureLoadPromises.get(file);
}

function ensureBookVariantTextures(bookName) {
  const files = bookVariantTextureFiles(bookName);
  return Promise.all(files.map((file) => ensureTexture(file)));
}

function getTexture(file) {
  return textureMap.get(file);
}

function assignTexture(mesh, file) {
  mesh.material.map = getTexture(file);
  mesh.material.needsUpdate = true;
}

function assignTextureObject(mesh, texture) {
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
}

function getPageTemplateTexture(side, pageNumber = pageNumberForTemplateSide(side)) {
  const safePage = THREE.MathUtils.clamp(Math.round(pageNumber) || 1, 1, editorPageCount());
  const key = `${activeBook}:${activeAlbumMode}:${side}:${safePage}`;
  if (!pageTemplateTextureMap.has(key)) {
    pageTemplateTextureMap.set(key, createPageTemplateTexture(side, activeBook, safePage));
  }
  return pageTemplateTextureMap.get(key);
}

function pageNumberForTemplateSide(side) {
  return side === "left" ? activeBookPage : rightBookPageNumber();
}

function refreshPageTemplateTextures() {
  pageTemplateTextureMap.clear();
  if (leftPageInner?.material) {
    assignTextureObject(leftPageInner, getPageTemplateTexture("left"));
  }
  if (rightPage?.material) {
    assignTextureObject(rightPage, getPageTemplateTexture("right"));
  }
  if (frontPage?.material && activeSurface === "inside") {
    assignTextureObject(frontPage, getPageTemplateTexture("right"));
  }
  if (backPage?.material && activeSurface === "inside") {
    assignTextureObject(backPage, getPageTemplateTexture("left"));
  }
  updateFlutterPageTextures();
  updateBookPageControls();
}

function createPageTemplateTexture(side, bookName, pageNumber = pageNumberForTemplateSide(side)) {
  const templateCanvas = document.createElement("canvas");
  templateCanvas.width = PAGE_TEXTURE_W;
  templateCanvas.height = PAGE_TEXTURE_H;
  const ctx = templateCanvas.getContext("2d");
  const palette = stickerBookTheme(bookName);

  if (activeAlbumMode === "collection") {
    drawPageTemplateBase(ctx, palette, side, activeAlbumMode);
    const pageDef = collectionPageDefinitions[pageNumber - 1] || null;
    const templateType = zukanTemplateTypeForSide(pageDef, side);
    if (!drawGeneratedCollectionZukanTemplate(ctx, templateType, side)) {
      drawCollectionPageTemplate(ctx, palette, side);
    }
  } else {
    if (!drawStickerImage2FreePageTemplate(ctx, bookName)) {
      drawPageTemplateBase(ctx, palette, side, activeAlbumMode);
    }
  }

  const texture = new THREE.CanvasTexture(templateCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  drawDynamicPageContent(ctx, texture, side, palette, pageNumber);
  return texture;
}

function collectionZukanUsesGeneratedTemplate(type) {
  return Boolean(getTexture(ZUKAN_PAGE_TEMPLATES[type])?.image);
}

function drawGeneratedCollectionZukanTemplate(ctx, type, side = "left") {
  const file = ZUKAN_PAGE_TEMPLATES[type] || ZUKAN_PAGE_TEMPLATES.index;
  const image = getTexture(file)?.image;
  if (!image) {
    return false;
  }
  const rect = zukanTemplatePrintRect(side, type);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  return true;
}

function zukanTemplateTypeKey(type = "index") {
  return type === "detail" ? "detail" : "index";
}

function zukanTemplatePlacementTuning(type = "index") {
  const prefix = zukanTemplateTypeKey(type);
  return {
    x: zukanTextOffset(`${prefix}TemplateX`),
    y: zukanTextOffset(`${prefix}TemplateY`),
    width: zukanTextOffset(`${prefix}TemplateW`),
    height: zukanTextOffset(`${prefix}TemplateH`),
  };
}

function zukanTemplatePrintRect(side = "left", type = "index") {
  const left = side === "right" ? ZUKAN_TEMPLATE_PRINT_INSET.inner : ZUKAN_TEMPLATE_PRINT_INSET.outer;
  const right = side === "left" ? ZUKAN_TEMPLATE_PRINT_INSET.inner : ZUKAN_TEMPLATE_PRINT_INSET.outer;
  const top = ZUKAN_TEMPLATE_PRINT_INSET.top;
  const bottom = ZUKAN_TEMPLATE_PRINT_INSET.bottom;
  const tuning = zukanTemplatePlacementTuning(type);
  const width = PAGE_TEXTURE_W - left - right + tuning.width;
  const height = PAGE_TEXTURE_H - top - bottom + tuning.height;
  return {
    x: left + tuning.x - tuning.width / 2,
    y: top + tuning.y - tuning.height / 2,
    width,
    height,
  };
}

function zukanTemplateTransformForSide(side = "left", type = "index") {
  const rect = zukanTemplatePrintRect(side, type);
  return {
    ...rect,
    scaleX: rect.width / PAGE_TEXTURE_W,
    scaleY: rect.height / PAGE_TEXTURE_H,
  };
}

function zukanTemplateTransformRect(rect, side = "left", type = "index") {
  const transform = zukanTemplateTransformForSide(side, type);
  return {
    x: transform.x + rect.x * transform.scaleX,
    y: transform.y + rect.y * transform.scaleY,
    width: rect.width * transform.scaleX,
    height: rect.height * transform.scaleY,
  };
}

function zukanTemplateTransformPoint(x, y, side = "left", type = "index") {
  const transform = zukanTemplateTransformForSide(side, type);
  return {
    x: transform.x + x * transform.scaleX,
    y: transform.y + y * transform.scaleY,
  };
}

function drawPageTemplateBase(ctx, palette, side, mode = "free") {
  const width = PAGE_TEXTURE_W;
  const height = PAGE_TEXTURE_H;
  const collectionTheme = mode === "collection" ? palette.collection : null;
  const freeTheme = mode === "collection" ? null : palette.free;
  const paperStops = collectionTheme?.paper || freeTheme?.paper || ["#fff9e4", "#fff4ce", "#f8eab9"];
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, paperStops[0]);
  bg.addColorStop(0.54, paperStops[1]);
  bg.addColorStop(1, paperStops[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  drawCanvasRoundedRect(ctx, 58, 54, width - 116, height - 108, 78);
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 255, 0.36)";
  ctx.fillRect(82, 84, width - 164, height - 168);

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 6;
  drawCanvasRoundedRect(ctx, 78, 74, width - 156, height - 148, 68);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
  ctx.lineWidth = 4;
  drawCanvasRoundedRect(ctx, 108, 106, width - 216, height - 212, 52);
  ctx.stroke();

  if (mode === "collection") {
    const foldX = side === "right" ? 82 : width - 92;
    const foldGradient = ctx.createLinearGradient(foldX - 42, 0, foldX + 42, 0);
    foldGradient.addColorStop(0, "rgba(117, 89, 36, 0.06)");
    foldGradient.addColorStop(0.5, "rgba(255,255,255,0.42)");
    foldGradient.addColorStop(1, "rgba(117, 89, 36, 0.04)");
    ctx.fillStyle = foldGradient;
    ctx.fillRect(foldX - 44, 106, 88, height - 212);
  } else {
    const stripX = side === "right" ? 90 : width - 166;
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.strokeStyle = "rgba(195, 176, 111, 0.22)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, stripX, 112, 76, height - 224, 38);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const x = stripX + 20 + i * 9;
      ctx.beginPath();
      ctx.moveTo(x, 142);
      ctx.lineTo(x, height - 142);
      ctx.strokeStyle = "rgba(211, 185, 104, 0.17)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(255,255,255,0.7)");
  shade.addColorStop(0.5, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(95,70,20,0.12)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

function drawCollectionPageTemplate(ctx, palette, side) {
  const theme = palette.collection;
  const pageTheme = theme.pages[side] || theme.pages.left;
  const x = 92;
  const y = 88;
  const width = PAGE_TEXTURE_W - 184;
  const height = PAGE_TEXTURE_H - 176;
  ctx.save();
  const innerBandW = 92;
  const innerBandX = side === "right" ? 0 : PAGE_TEXTURE_W - innerBandW;
  const innerBandGradient = ctx.createLinearGradient(innerBandX, 0, innerBandX + innerBandW, 0);
  if (side === "right") {
    innerBandGradient.addColorStop(0, "rgba(80, 64, 30, 0.1)");
    innerBandGradient.addColorStop(0.42, "rgba(232, 219, 170, 0.22)");
    innerBandGradient.addColorStop(1, "rgba(255, 252, 235, 0)");
  } else {
    innerBandGradient.addColorStop(0, "rgba(255, 252, 235, 0)");
    innerBandGradient.addColorStop(0.58, "rgba(232, 219, 170, 0.22)");
    innerBandGradient.addColorStop(1, "rgba(80, 64, 30, 0.1)");
  }
  ctx.filter = "blur(18px)";
  ctx.fillStyle = innerBandGradient;
  ctx.fillRect(innerBandX, -80, innerBandW, PAGE_TEXTURE_H + 160);
  ctx.filter = "none";

  const creaseW = 22;
  const creaseX = side === "right" ? 0 : PAGE_TEXTURE_W - creaseW;
  const creaseGradient = ctx.createLinearGradient(creaseX, 0, creaseX + creaseW, 0);
  if (side === "right") {
    creaseGradient.addColorStop(0, "rgba(77, 61, 27, 0.05)");
    creaseGradient.addColorStop(1, "rgba(255, 252, 235, 0)");
  } else {
    creaseGradient.addColorStop(0, "rgba(255, 252, 235, 0)");
    creaseGradient.addColorStop(1, "rgba(77, 61, 27, 0.05)");
  }
  ctx.filter = "blur(5px)";
  ctx.fillStyle = creaseGradient;
  ctx.fillRect(creaseX, -40, creaseW, PAGE_TEXTURE_H + 80);
  ctx.filter = "none";

  // The zukan artwork is printed on the page surface, not a separate mounted panel.
  const frameGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  frameGradient.addColorStop(0, tintColor(pageTheme.frame, 0.16));
  frameGradient.addColorStop(0.58, pageTheme.frame);
  frameGradient.addColorStop(1, pageTheme.frameDark);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = frameGradient;
  drawCanvasRoundedRect(ctx, x, y, width, height, 62);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = tintColor(pageTheme.frame, 0.14);
  ctx.lineWidth = 26;
  drawCanvasRoundedRect(ctx, x + 11, y + 11, width - 22, height - 22, 54);
  ctx.stroke();

  ctx.strokeStyle = pageTheme.frameDark;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 8;
  drawCanvasRoundedRect(ctx, x + 4, y + 4, width - 8, height - 8, 58);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 5;
  drawCanvasRoundedRect(ctx, x + 14, y + 14, width - 28, height - 28, 50);
  ctx.stroke();

  const paperX = x + 56;
  const paperY = y + 72;
  const paperW = width - 112;
  const paperH = height - 250;
  const paperGradient = ctx.createLinearGradient(0, paperY, 0, paperY + paperH);
  paperGradient.addColorStop(0, "rgba(255, 253, 240, 0.58)");
  paperGradient.addColorStop(0.68, "rgba(255, 248, 223, 0.46)");
  paperGradient.addColorStop(1, "rgba(252, 237, 192, 0.34)");
  ctx.fillStyle = paperGradient;
  drawScallopedPanelPath(ctx, paperX, paperY, paperW, paperH, 48, 28, 9);
  ctx.fill();

  ctx.strokeStyle = pageTheme.innerStroke;
  ctx.globalAlpha = 0.58;
  ctx.lineWidth = 4;
  drawScallopedPanelPath(ctx, paperX, paperY, paperW, paperH, 48, 28, 9);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = theme.pageHighlight;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, x + 36, y + 36, width - 72, height - 72, 46);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawCollectionSlotBand(ctx, theme, pageTheme, side);
  drawCollectionFrameMotifs(ctx, theme, pageTheme, side);
  ctx.restore();
}

function drawScallopedPanelPath(ctx, x, y, width, height, radius, scallopDepth, scallopCount) {
  const r = Math.min(radius, width / 2, height / 2);
  const topStart = x + r;
  const topEnd = x + width - r;
  const bottomStart = topStart;
  const bottomEnd = topEnd;
  const count = Math.max(4, scallopCount);
  const step = (topEnd - topStart) / count;

  ctx.beginPath();
  ctx.moveTo(topStart, y);
  for (let i = 0; i < count; i += 1) {
    const sx = topStart + i * step;
    const ex = i === count - 1 ? topEnd : sx + step;
    const mx = (sx + ex) / 2;
    const dip = scallopDepth * (i % 2 === 0 ? 1 : 0.78);
    ctx.quadraticCurveTo(mx, y + dip, ex, y);
  }
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, bottomEnd, y + height);
  for (let i = count - 1; i >= 0; i -= 1) {
    const ex = bottomStart + i * step;
    const sx = i === count - 1 ? bottomEnd : ex + step;
    const mx = (sx + ex) / 2;
    const dip = scallopDepth * (i % 2 === 0 ? 0.86 : 0.66);
    ctx.quadraticCurveTo(mx, y + height - dip, ex, y + height);
  }
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, topStart, y);
  ctx.closePath();
}

function drawCollectionSlotBand(ctx, theme, pageTheme, side) {
  const bandX = 98;
  const bandY = PAGE_TEXTURE_H - 164;
  const bandW = PAGE_TEXTURE_W - 196;
  const bandH = 56;
  const bandGradient = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  bandGradient.addColorStop(0, tintColor(theme.slotBand.fill, 0.18));
  bandGradient.addColorStop(0.72, theme.slotBand.fill);
  bandGradient.addColorStop(1, theme.slotBand.edge);

  ctx.save();
  ctx.fillStyle = bandGradient;
  drawCanvasRoundedRect(ctx, bandX, bandY, bandW, bandH, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.46)";
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, bandX + 8, bandY + 8, bandW - 16, bandH - 16, 22);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 248, 218, 0.44)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bandX + 46, bandY + bandH * 0.52);
  for (let i = 0; i <= 12; i += 1) {
    const x = bandX + 46 + i * ((bandW - 92) / 12);
    const y = bandY + bandH * 0.52 + Math.sin(i * 0.86) * 5;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const decoY = bandY + bandH * 0.5;
  const decoKinds = pageTheme.motifSet === "ocean"
    ? ["shell", "wave", "star", "bubble"]
    : pageTheme.motifSet === "nature"
      ? ["leaf", "flower", "star", "leaf"]
      : ["flower", "leaf", "star", "bubble"];
  for (let i = 0; i < 11; i += 1) {
    const x = bandX + 72 + i * ((bandW - 144) / 10);
    const kind = decoKinds[i % decoKinds.length];
    drawCollectionMiniMotif(ctx, kind, x, decoY + ((i % 2) - 0.5) * 9, 11 + (i % 3) * 2, pageTheme.accent, i * 0.28);
  }
  if (side === "right" && pageTheme.motifSet === "ocean") {
    drawCollectionMiniMotif(ctx, "wave", bandX + bandW - 122, bandY + 28, 15, pageTheme.accent, 0);
    drawCollectionMiniMotif(ctx, "shell", bandX + bandW - 76, bandY + 32, 13, "#fff3d0", 0);
  }
  ctx.restore();
}

function drawCollectionSlotSafeArea(ctx, bandX, bandY, bandW, bandH, slotW, slotGap, slotIndex, pageTheme) {
  const safeX = bandX + 39 + slotIndex * (slotW + slotGap);
  const safeCenterX = safeX + slotW / 2;
  const safeCenterY = bandY + bandH * 0.48;
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "rgba(255, 250, 226, 0.62)";
  ctx.beginPath();
  ctx.ellipse(safeCenterX, safeCenterY, slotW * 0.28, bandH * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  const motifKind = pageTheme.motifSet === "ocean" ? "wave" : "leaf";
  drawCollectionMiniMotif(ctx, motifKind, safeCenterX - slotW * 0.18, safeCenterY + 8, 11, pageTheme.accent, 0.2);
  drawCollectionMiniMotif(ctx, "star", safeCenterX + slotW * 0.16, safeCenterY - 6, 10, "#fff1a8", -0.1);
  ctx.restore();
}

function drawCollectionFrameMotifs(ctx, theme, pageTheme, side) {
  const motifs = collectionMotifsFor(pageTheme.motifSet, side);
  ctx.save();
  for (const motif of motifs) {
    drawCollectionMiniMotif(
      ctx,
      motif.kind,
      motif.x,
      motif.y,
      motif.size,
      motif.color || pageTheme.accent,
      motif.rotation || 0,
      theme,
    );
  }
  ctx.restore();
}

function collectionMotifsFor(setName, side) {
  const edge = side === "left" ? 1 : -1;
  if (setName === "ocean") {
    return [
      { kind: "cloud", x: 250, y: 166, size: 28, color: "#b7e4eb" },
      { kind: "star", x: 1060, y: 160, size: 16, color: "#ffdf5d" },
      { kind: "bubble", x: 1200, y: 238, size: 16, color: "#99dce8" },
      { kind: "boat", x: 232, y: 1198, size: 34, color: "#f0ad36", rotation: -0.08 },
      { kind: "wave", x: 1028, y: 1186, size: 32, color: "#4fb8d6" },
      { kind: "shell", x: 1166, y: 1190, size: 22, color: "#fff0ca" },
    ];
  }
  if (setName === "nature") {
    return [
      { kind: "leaf", x: 236, y: 164, size: 20, color: "#66b44d", rotation: -0.3 * edge },
      { kind: "cloud", x: 354, y: 190, size: 28, color: "#b9e0e1" },
      { kind: "star", x: 1060, y: 158, size: 15, color: "#ffdf5d" },
      { kind: "hill", x: 250, y: 1192, size: 44, color: "#8fc84b" },
      { kind: "flower", x: 410, y: 1194, size: 18, color: "#fff4cf" },
      { kind: "leaf", x: 1114, y: 1196, size: 21, color: "#5eb45e", rotation: 0.35 * edge },
    ];
  }
  return [
    { kind: "star", x: 248, y: 160, size: 24, color: "#f6d45a" },
    { kind: "cloud", x: 1052, y: 170, size: 30, color: "#fff8e8" },
    { kind: "bubble", x: 1166, y: 208, size: 15, color: "#91d2d1" },
    { kind: "flower", x: 260, y: 1186, size: 20, color: "#f3df6c" },
    { kind: "leaf", x: 1068, y: 1182, size: 25, color: "#75bd85", rotation: -0.25 * edge },
    { kind: "star", x: 1168, y: 1198, size: 17, color: "#f3cf5b" },
  ];
}

function drawCollectionMiniMotif(ctx, kind, x, y, size, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(76, 55, 26, 0.16)";
  ctx.shadowBlur = Math.max(2, size * 0.12);
  ctx.shadowOffsetY = Math.max(1, size * 0.06);

  if (kind === "star") {
    drawStarMotif(ctx, 0, 0, size * 0.48, size * 0.24, color);
  } else if (kind === "sparkle") {
    drawSparkleMotif(ctx, size, color);
  } else if (kind === "cloud") {
    drawCloudMotif(ctx, size, color);
  } else if (kind === "leaf") {
    drawLeafMotif(ctx, size, color);
  } else if (kind === "flower") {
    drawFlowerMotif(ctx, size, color);
  } else if (kind === "shell") {
    drawShellMotif(ctx, size, color);
  } else if (kind === "wave") {
    drawWaveMotif(ctx, size, color);
  } else if (kind === "boat") {
    drawBoatMotif(ctx, size, color);
  } else if (kind === "hill") {
    drawHillMotif(ctx, size, color);
  } else {
    drawBubbleMotif(ctx, size, color);
  }
  ctx.restore();
}

function drawStarMotif(ctx, x, y, outer, inner, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(129, 95, 34, 0.12)";
  ctx.lineWidth = Math.max(1.5, outer * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * (Math.PI / 5);
    const radius = i % 2 === 0 ? outer : inner;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSparkleMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(129, 95, 34, 0.13)";
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.quadraticCurveTo(size * 0.08, -size * 0.12, size * 0.42, 0);
  ctx.quadraticCurveTo(size * 0.08, size * 0.12, 0, size * 0.5);
  ctx.quadraticCurveTo(-size * 0.08, size * 0.12, -size * 0.42, 0);
  ctx.quadraticCurveTo(-size * 0.08, -size * 0.12, 0, -size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(size * 0.34, -size * 0.32, size * 0.09, size * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(-size * 0.38, size * 0.34, size * 0.07, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(77, 126, 137, 0.14)";
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.beginPath();
  ctx.ellipse(-size * 0.28, size * 0.05, size * 0.28, size * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(0, -size * 0.08, size * 0.34, size * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(size * 0.32, size * 0.04, size * 0.3, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawLeafMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(70, 112, 47, 0.18)";
  ctx.lineWidth = Math.max(1.4, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(-size * 0.34, size * 0.3);
  ctx.bezierCurveTo(-size * 0.48, -size * 0.16, size * 0.1, -size * 0.5, size * 0.42, -size * 0.4);
  ctx.bezierCurveTo(size * 0.36, size * 0.02, -size * 0.05, size * 0.38, -size * 0.34, size * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 220, 0.5)";
  ctx.beginPath();
  ctx.moveTo(-size * 0.24, size * 0.2);
  ctx.lineTo(size * 0.26, -size * 0.28);
  ctx.stroke();
}

function drawFlowerMotif(ctx, size, color) {
  const petalColor = color;
  ctx.fillStyle = petalColor;
  ctx.strokeStyle = "rgba(130, 92, 70, 0.12)";
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * (Math.PI * 2 / 5);
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * size * 0.22, Math.sin(angle) * size * 0.22, size * 0.18, size * 0.28, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#f5d35e";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.14, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawShellMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(116, 92, 58, 0.18)";
  ctx.lineWidth = Math.max(1.3, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, size * 0.28);
  ctx.quadraticCurveTo(0, -size * 0.48, size * 0.42, size * 0.28);
  ctx.quadraticCurveTo(0, size * 0.42, -size * 0.42, size * 0.28);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (const dx of [-0.22, 0, 0.22]) {
    ctx.moveTo(0, size * 0.28);
    ctx.quadraticCurveTo(dx * size, -size * 0.02, dx * size, -size * 0.25);
  }
  ctx.strokeStyle = "rgba(146, 112, 70, 0.2)";
  ctx.stroke();
}

function drawWaveMotif(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, size * 0.08);
  ctx.quadraticCurveTo(-size * 0.22, -size * 0.26, 0, size * 0.08);
  ctx.quadraticCurveTo(size * 0.22, size * 0.42, size * 0.5, size * 0.08);
  ctx.stroke();
}

function drawBoatMotif(ctx, size, color) {
  ctx.fillStyle = "#c98735";
  ctx.beginPath();
  ctx.moveTo(-size * 0.46, size * 0.18);
  ctx.lineTo(size * 0.42, size * 0.18);
  ctx.quadraticCurveTo(size * 0.18, size * 0.42, -size * 0.28, size * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff4d4";
  ctx.beginPath();
  ctx.moveTo(-size * 0.04, size * 0.12);
  ctx.lineTo(-size * 0.04, -size * 0.46);
  ctx.lineTo(size * 0.3, size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(-size * 0.04, -size * 0.48);
  ctx.lineTo(-size * 0.04, size * 0.18);
  ctx.stroke();
}

function drawHillMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-size * 0.7, size * 0.34);
  ctx.quadraticCurveTo(-size * 0.28, -size * 0.18, size * 0.08, size * 0.34);
  ctx.quadraticCurveTo(size * 0.34, -size * 0.04, size * 0.72, size * 0.34);
  ctx.closePath();
  ctx.fill();
}

function drawBubbleMotif(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.78;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.32, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, -size * 0.12, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeftPageTemplate(ctx, palette) {
  const startX = 170;
  const startY = 220;
  const colW = 520;
  const rowH = 118;
  ctx.save();
  ctx.fillStyle = "#334447";
  ctx.font = '800 66px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("シールいちらん", PAGE_TEXTURE_W / 2 - 46, 150);
  ctx.fillStyle = palette.sub;
  ctx.font = '800 34px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText("みつけたもの", PAGE_TEXTURE_W / 2 - 46, 196);

  for (let i = 0; i < 12; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (colW + 42);
    const y = startY + row * (rowH + 28);
    ctx.fillStyle = col % 2 === 0 ? "rgba(255,255,255,0.5)" : "rgba(224,245,245,0.52)";
    ctx.strokeStyle = "rgba(188, 151, 73, 0.46)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, x, y, colW, rowH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.sub;
    drawCanvasRoundedRect(ctx, x + 20, y + 22, 70, 38, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '800 24px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1).padStart(2, "0"), x + 55, y + 50);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(x + 142, y + 58, 52, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(74, 99, 100, 0.16)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 220, y + 43);
    ctx.lineTo(x + colW - 52, y + 43);
    ctx.moveTo(x + 220, y + 76);
    ctx.lineTo(x + colW - 132, y + 76);
    ctx.stroke();
  }
  ctx.restore();
}

function stickerFreePageFile(bookName = activeBook) {
  const bundle = BOOK_VARIANTS[bookName] || BOOK_VARIANTS.boy;
  return bundle.freePage || null;
}

function drawStickerImage2FreePageTemplate(ctx, bookName = activeBook) {
  const file = stickerFreePageFile(bookName);
  const image = file ? getTexture(file)?.image : null;
  if (!image) {
    return false;
  }
  drawImageCover(ctx, image, 0, 0, PAGE_TEXTURE_W, PAGE_TEXTURE_H);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255, 252, 232, 0.16)";
  ctx.fillRect(0, 0, PAGE_TEXTURE_W, PAGE_TEXTURE_H);
  ctx.restore();
  return true;
}

function drawImageCover(ctx, image, x, y, width, height) {
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceAspect > targetAspect) {
    sw = sourceHeight * targetAspect;
    sx = (sourceWidth - sw) / 2;
  } else if (sourceAspect < targetAspect) {
    sh = sourceWidth / targetAspect;
    sy = (sourceHeight - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawRightPageTemplate(ctx, palette) {
  if (!drawStickerImage2FreePageTemplate(ctx, activeBook)) {
    drawPageTemplateBase(ctx, palette, "right");
  }
}

function drawDynamicPageContent(ctx, texture, side, palette, pageNumber = pageNumberForTemplateSide(side)) {
  const pageDef = editorPageDefinitions[pageNumber - 1] || editorPageDefinitions[0] || null;
  if (activeAlbumMode === "collection") {
    const collectionPageDef = collectionPageDefinitions[pageNumber - 1] || collectionPageDefinitions[0] || null;
    drawCollectionAlbumPage(ctx, texture, palette, collectionPageDef, stickersForPage(pageNumber), pageNumber, side);
    return;
  }
  drawStickerCanvasPage(ctx, texture, palette, pageDef, getPagePlacements(pageNumber), pageNumber);
}

function drawCollectionAlbumPage(ctx, texture, palette, pageDef, stickers, pageNumber, side = "left") {
  if (zukanTemplateTypeForSide(pageDef, side) === "detail") {
    drawCollectionZukanDetailPage(ctx, texture, palette, pageDef, stickers[0] || null, pageNumber, side);
    return;
  }
  drawCollectionZukanIndexPage(ctx, texture, palette, pageDef, stickers, pageNumber, side);
}

function collectionZukanIndexLayout(itemCount = COLLECTION_INDEX_ITEMS_PER_PAGE, side = "left") {
  const cols = 2;
  const rows = Math.max(2, Math.min(6, Math.ceil(Math.max(1, itemCount) / cols)));
  if (collectionZukanUsesGeneratedTemplate("index") && rows <= 3) {
    const contentX = 102;
    const contentY = 286;
    const gapX = 30;
    const gapY = 36;
    const cellW = (PAGE_TEXTURE_W - contentX * 2 - gapX) / cols;
    const cellH = 300;
    return zukanTemplateTransformLayout({ contentX, contentY, cols, rows, gapX, gapY, cellW, cellH }, side, "index");
  }
  const contentX = 118;
  const contentW = PAGE_TEXTURE_W - contentX * 2;
  const slotBandTop = PAGE_TEXTURE_H - 202;
  const contentY = rows <= 3 ? 278 : 224;
  const gapX = 30;
  const gapY = rows <= 3 ? 28 : 18;
  const cellW = (contentW - gapX * (cols - 1)) / cols;
  const availableH = slotBandTop - contentY - 36;
  const sparseCellH = rows <= 2 ? 300 : rows === 3 ? 240 : Number.POSITIVE_INFINITY;
  const contentH = Math.min(sparseCellH * rows + gapY * (rows - 1), availableH);
  const cellH = (contentH - gapY * (rows - 1)) / rows;
  return { contentX, contentY, cols, rows, gapX, gapY, cellW, cellH };
}

function zukanTemplateTransformLayout(layout, side = "left", type = "index") {
  const transform = zukanTemplateTransformForSide(side, type);
  return {
    ...layout,
    contentX: transform.x + layout.contentX * transform.scaleX,
    contentY: transform.y + layout.contentY * transform.scaleY,
    gapX: layout.gapX * transform.scaleX,
    gapY: layout.gapY * transform.scaleY,
    cellW: layout.cellW * transform.scaleX,
    cellH: layout.cellH * transform.scaleY,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  };
}

function collectionZukanIndexCellRect(index, layout = collectionZukanIndexLayout()) {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  return {
    x: layout.contentX + col * (layout.cellW + layout.gapX),
    y: layout.contentY + row * (layout.cellH + layout.gapY),
    width: layout.cellW,
    height: layout.cellH,
    scaleX: zukanRectScaleX(layout),
    scaleY: zukanRectScaleY(layout),
  };
}

function collectionZukanIndexTargetsForPage(pageDef, subjects = collectionStickersForPageDefinition(pageDef)) {
  if (!pageDef) {
    return [];
  }
  if (Array.isArray(pageDef.indexTargets)) {
    return pageDef.indexTargets.filter((target) => Number.isFinite(Number(target.targetPage)));
  }
  return subjects
    .map((subject) => {
      const targetPage = pageDef.subjectId === subject.id && Number.isFinite(Number(pageDef.page))
        ? Number(pageDef.page)
        : collectionPageDefinitions.find((item) => item.type === "detail" && item.subjectId === subject.id)?.page;
      return {
        subjectId: subject.id,
        targetPage,
        categoryId: pageDef.categoryId || "",
        action: "open-zukan-detail",
      };
    })
    .filter((target) => Number.isFinite(Number(target.targetPage)));
}

function collectionZukanIndexTargetForSubject(pageDef, subjectId, subjects = collectionStickersForPageDefinition(pageDef)) {
  const target = collectionZukanIndexTargetsForPage(pageDef, subjects)
    .find((item) => item.subjectId === subjectId);
  if (!target) {
    return null;
  }
  return {
    ...target,
    categoryId: pageDef.categoryId || "",
  };
}

function zukanTuningRect(id, x, y, width, height) {
  return {
    id,
    label: zukanTextTuningGroupLabel(id),
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(PAGE_TEXTURE_W - Math.max(0, x), width),
    height: Math.min(PAGE_TEXTURE_H - Math.max(0, y), height),
  };
}

function zukanRectScaleX(rect) {
  const value = Number(rect?.scaleX);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function zukanRectScaleY(rect) {
  const value = Number(rect?.scaleY);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function zukanTextTuningTargetsForPage(pageDef, subjects = [], pageNumber = activeBookPage, side = zukanSideForPageNumber(pageNumber)) {
  if (!pageDef) {
    return [];
  }
  if (zukanTemplateTypeForSide(pageDef, side) === "detail") {
    return zukanDetailTuningTargets(pageDef, subjects[0] || null, pageNumber, side);
  }
  return zukanIndexTuningTargets(pageDef, subjects, side);
}

function zukanSideForPageNumber(pageNumber) {
  return Math.round(pageNumber) === rightBookPageNumber() ? "right" : "left";
}

function zukanIndexTuningTargets(pageDef, subjects = [], side = "left") {
  const templateRect = zukanTemplatePrintRect(side, "index");
  const titlePoint = collectionZukanUsesGeneratedTemplate("index")
    ? zukanTemplateTransformPoint(PAGE_TEXTURE_W / 2, 112, side, "index")
    : { x: PAGE_TEXTURE_W / 2, y: 112 };
  const subtitlePoint = collectionZukanUsesGeneratedTemplate("index")
    ? zukanTemplateTransformPoint(PAGE_TEXTURE_W / 2, 215, side, "index")
    : { x: PAGE_TEXTURE_W / 2, y: 215 };
  const titleW = collectionZukanUsesGeneratedTemplate("index")
    ? 780 * zukanTemplateTransformForSide(side, "index").scaleX
    : 780;
  const subtitleW = collectionZukanUsesGeneratedTemplate("index")
    ? 700 * zukanTemplateTransformForSide(side, "index").scaleX
    : 700;
  const targets = [
    zukanTuningRect("indexTemplate", templateRect.x, templateRect.y, templateRect.width, templateRect.height),
    zukanTuningRect(
      "indexTitle",
      titlePoint.x - titleW / 2 + zukanTextOffset("indexTitleX"),
      titlePoint.y + zukanTextOffset("indexTitleY"),
      titleW,
      76,
    ),
    zukanTuningRect(
      "indexSubtitle",
      subtitlePoint.x - subtitleW / 2 + zukanTextOffset("indexSubtitleX"),
      subtitlePoint.y + zukanTextOffset("indexSubtitleY"),
      subtitleW,
      48,
    ),
  ];
  const layout = collectionZukanIndexLayout(subjects.length, side);
  for (let index = 0; index < subjects.length; index += 1) {
    targets.push(...zukanIndexCardTuningTargets(collectionZukanIndexCellRect(index, layout), index));
  }
  return targets;
}

function zukanIndexCardTuningTargets(rect, slotIndex) {
  const { x, y, width, height } = rect;
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("index");
  const scaleX = zukanRectScaleX(rect);
  const scaleY = zukanRectScaleY(rect);
  const scale = Math.min(scaleX, scaleY);
  const isRoomy = height >= 220;
  const badgeX = x + (isRoomy ? 22 : 18) * scaleX + zukanIndexSlotTextOffset(slotIndex, "Badge", "X");
  const badgeY = y + (isRoomy ? 22 : 20) * scaleY + zukanIndexSlotTextOffset(slotIndex, "Badge", "Y");
  const badgeW = (isRoomy ? 84 : 72) * scaleX;
  const badgeH = (isRoomy ? 42 : 38) * scaleY;
  const roomyImageLimit = (generatedTemplate ? 198 : 164) * scale;
  const sixSlotGeneratedTemplate = generatedTemplate && height >= 280;
  const imageSize = Math.min(
    isRoomy ? roomyImageLimit : 112,
    height - (isRoomy ? (generatedTemplate ? 88 : 74) : 30),
    width * (isRoomy ? (generatedTemplate ? 0.34 : 0.32) : 0.28),
  );
  const imageBaseX = generatedTemplate ? x + 38 * scaleX : x + (isRoomy ? 48 : 108);
  const imageBaseY = generatedTemplate
    ? y + (sixSlotGeneratedTemplate ? 32 : 58) * scaleY
    : y + (height - imageSize) / 2 + (isRoomy ? 18 : 0);
  const imageX = imageBaseX + zukanIndexSlotTextOffset(slotIndex, "Image", "X");
  const imageY = imageBaseY + zukanIndexSlotTextOffset(slotIndex, "Image", "Y");
  const textX = (isRoomy ? imageBaseX + imageSize + 34 * scaleX : x + 232) + zukanIndexSlotTextOffset(slotIndex, "Text", "X");
  const titleY = (generatedTemplate ? y + (sixSlotGeneratedTemplate ? 90 : 98) * scaleY : isRoomy ? y + Math.max(106, height * 0.43) : y + 48)
    + zukanIndexSlotTextOffset(slotIndex, "Text", "Y");
  return [
    zukanTuningRect(zukanIndexSlotGroupId(slotIndex, "Badge"), badgeX - 12, badgeY - 12, badgeW + 24, badgeH + 24),
    zukanTuningRect(zukanIndexSlotGroupId(slotIndex, "Image"), imageX - 16, imageY - 16, imageSize + 32, imageSize + 32),
    zukanTuningRect(zukanIndexSlotGroupId(slotIndex, "Text"), textX - 14, titleY - 48, Math.max(220, x + width - textX - 14), 108),
  ];
}

function zukanDetailTuningTargets(pageDef, subject, pageNumber, side = zukanSideForPageNumber(pageNumber)) {
  const detail = collectionZukanDetailTemplate(pageDef, subject, pageNumber, stickerBookTheme(activeBook), side);
  const { header, image, fields, memo } = detail;
  const templateRect = zukanTemplatePrintRect(side, "detail");
  const headerScaleX = zukanRectScaleX(header);
  const headerScaleY = zukanRectScaleY(header);
  const memoScaleX = zukanRectScaleX(memo);
  const memoScaleY = zukanRectScaleY(memo);
  const targets = [
    zukanTuningRect("detailTemplate", templateRect.x, templateRect.y, templateRect.width, templateRect.height),
    zukanTuningRect(
      "detailNumber",
      header.x + 47 * headerScaleX + zukanTextOffset("detailNumberX"),
      header.y + 29 * headerScaleY + zukanTextOffset("detailNumberY"),
      120 * headerScaleX,
      54 * headerScaleY,
    ),
    zukanTuningRect(
      "detailCategory",
      header.x + header.width - 250 * headerScaleX + zukanTextOffset("detailCategoryX"),
      header.y + 29 * headerScaleY + zukanTextOffset("detailCategoryY"),
      206 * headerScaleX,
      54 * headerScaleY,
    ),
    zukanTuningRect(
      "detailName",
      header.x + 196 * headerScaleX + zukanTextOffset("detailNameX"),
      header.y + 14 * headerScaleY + zukanTextOffset("detailNameY"),
      header.width - 500 * headerScaleX,
      70 * headerScaleY,
    ),
    zukanTuningRect(
      "detailSubtitle",
      header.x + 200 * headerScaleX + zukanTextOffset("detailSubtitleX"),
      header.y + 82 * headerScaleY + zukanTextOffset("detailSubtitleY"),
      header.width - 520 * headerScaleX,
      42 * headerScaleY,
    ),
    zukanTuningRect("detailImage", image.x, image.y, image.width, image.height),
    zukanTuningRect(
      "detailMemoTitle",
      memo.x + 48 * memoScaleX + zukanTextOffset("detailMemoTitleX"),
      memo.y + 28 * memoScaleY + zukanTextOffset("detailMemoTitleY"),
      150 * memoScaleX,
      48 * memoScaleY,
    ),
    zukanTuningRect(
      "detailMemoText",
      memo.x + 24 * memoScaleX + zukanTextOffset("detailMemoTextX"),
      memo.y + 86 * memoScaleY + zukanTextOffset("detailMemoTextY"),
      memo.width - 48 * memoScaleX,
      132 * memoScaleY,
    ),
  ];
  for (const field of fields) {
    const fieldScaleX = zukanRectScaleX(field);
    const fieldScaleY = zukanRectScaleY(field);
    targets.push(
      zukanTuningRect(
        "detailFieldTitle",
        field.x + 4 * fieldScaleX + zukanTextOffset("detailFieldTitleX"),
        field.y + 28 * fieldScaleY + zukanTextOffset("detailFieldTitleY"),
        260 * fieldScaleX,
        48 * fieldScaleY,
      ),
      zukanTuningRect(
        "detailFieldText",
        field.x + 30 * fieldScaleX + zukanTextOffset("detailFieldTextX"),
        field.y + 84 * fieldScaleY + zukanTextOffset("detailFieldTextY"),
        field.width - 60 * fieldScaleX,
        92 * fieldScaleY,
      ),
    );
  }
  return targets;
}

function drawZukanTuningSelectionOverlayForPage(ctx, pageNumber) {
  if (!tuningEnabled || activeAlbumMode !== "collection" || !selectedZukanTuningTargetId) {
    return;
  }
  const pageDef = collectionPageDefinitions[pageNumber - 1] || null;
  const subjects = collectionStickersForPageDefinition(pageDef);
  drawZukanTuningSelectionOverlay(ctx, pageDef, subjects, pageNumber, zukanSideForPageNumber(pageNumber));
}

function drawZukanTuningSelectionOverlay(ctx, pageDef, subjects, pageNumber, side = zukanSideForPageNumber(pageNumber)) {
  const targets = zukanTextTuningTargetsForPage(pageDef, subjects, pageNumber, side)
    .filter((target) => target.id === selectedZukanTuningTargetId);
  if (!targets.length) {
    return;
  }
  ctx.save();
  ctx.setLineDash([14, 8]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 206, 70, 0.96)";
  ctx.fillStyle = "rgba(255, 240, 128, 0.12)";
  for (const target of targets) {
    drawCanvasRoundedRect(ctx, target.x, target.y, target.width, target.height, 18);
    ctx.fill();
    ctx.stroke();
  }
  const first = targets[0];
  ctx.setLineDash([]);
  ctx.font = '900 24px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "left";
  const label = zukanTextTuningGroupLabel(selectedZukanTuningTargetId);
  const labelW = Math.min(260, Math.max(150, ctx.measureText(label).width + 30));
  const labelX = Math.min(PAGE_TEXTURE_W - labelW - 16, Math.max(16, first.x));
  const labelY = Math.max(18, first.y - 44);
  ctx.fillStyle = "rgba(20, 43, 40, 0.82)";
  drawCanvasRoundedRect(ctx, labelX, labelY, labelW, 34, 12);
  ctx.fill();
  ctx.fillStyle = "#fff4b8";
  ctx.fillText(label, labelX + 15, labelY + 25, labelW - 30);
  ctx.restore();
}

function collectionZukanIndexTitle(pageDef) {
  const category = COLLECTION_TOC_CATEGORY_DEFS.find((definition) => definition.id === pageDef?.categoryId);
  return collectionZukanFirstText(category?.indexTitle, pageDef?.label, "ずかんもくじ");
}

function collectionZukanIndexSubtitle(pageDef) {
  const category = COLLECTION_TOC_CATEGORY_DEFS.find((definition) => definition.id === pageDef?.categoryId);
  return collectionZukanFirstText(category?.summary, pageDef?.subtitle, "きになる なかまを くわしく みよう");
}

function drawCollectionZukanIndexPage(ctx, texture, palette, pageDef, subjects, pageNumber, side = "left") {
  const theme = palette.collection;
  const layout = collectionZukanIndexLayout(subjects.length, side);
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("index");
  const sparseIndex = layout.rows <= 3;

  ctx.save();
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  if (generatedTemplate) {
    const titlePoint = zukanTemplateTransformPoint(PAGE_TEXTURE_W / 2, 166, side, "index");
    const subtitlePoint = zukanTemplateTransformPoint(PAGE_TEXTURE_W / 2, 246, side, "index");
    const scaleX = zukanTemplateTransformForSide(side, "index").scaleX;
    ctx.font = '900 46px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(
      collectionZukanIndexTitle(pageDef),
      titlePoint.x + zukanTextOffset("indexTitleX"),
      titlePoint.y + zukanTextOffset("indexTitleY"),
      760 * scaleX,
    );
    ctx.fillStyle = "rgba(51, 68, 71, 0.62)";
    ctx.font = '800 25px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(
      collectionZukanIndexSubtitle(pageDef),
      subtitlePoint.x + zukanTextOffset("indexSubtitleX"),
      subtitlePoint.y + zukanTextOffset("indexSubtitleY"),
      690 * scaleX,
    );
  } else {
    const headerOffsetY = sparseIndex ? 28 : 0;
    ctx.font = '800 50px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(pageDef?.label || "ずかんもくじ", PAGE_TEXTURE_W / 2, 112 + headerOffsetY);
    ctx.fillStyle = theme.infoAccent || palette.sub;
    ctx.font = '800 25px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(pageDef?.subtitle || "いきものや たべものを しらべよう", PAGE_TEXTURE_W / 2, 150 + headerOffsetY);
    ctx.fillStyle = "rgba(51, 68, 71, 0.58)";
    ctx.font = '700 20px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("Codexと いっしょに、きになる なかまを くわしく みよう", PAGE_TEXTURE_W / 2, 184 + headerOffsetY);
  }

  for (let i = 0; i < subjects.length; i += 1) {
    const subject = subjects[i];
    const globalIndex = collectionZukanItemNumber(subject, pageNumber, i);
    const rect = collectionZukanIndexCellRect(i, layout);
    const target = collectionZukanIndexTargetForSubject(pageDef, subject.id);
    const found = subject.unlock === "found";
    drawCollectionZukanIndexCard(ctx, texture, palette, subject, globalIndex, rect, found, pageNumber, target, i);
  }

  if (!subjects.length) {
    ctx.fillStyle = "rgba(51, 68, 71, 0.58)";
    ctx.font = '800 38px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("ずかんの なかまを じゅんびしています", PAGE_TEXTURE_W / 2, PAGE_TEXTURE_H / 2);
  }
  drawCollectionPlacementLayer(ctx, texture, pageNumber);
  drawZukanTuningSelectionOverlay(ctx, pageDef, subjects, pageNumber, side);
  ctx.restore();
  texture.needsUpdate = true;
}

function collectionZukanItemNumber(sticker, pageNumber, pageIndex) {
  const index = collectionStickerOptions.findIndex((item) => item.id === sticker?.id);
  return index >= 0 ? index + 1 : (pageNumber - 1) * COLLECTION_ALBUM_STICKERS_PER_PAGE + pageIndex + 1;
}

function drawCollectionZukanIndexCard(ctx, texture, palette, sticker, index, rect, found, pageNumber, target, slotIndex = 0) {
  const cardTheme = palette.collection.card;
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("index");
  const canShowSpecificItem = canShowSpecificCollectionSticker(sticker);
  const displayLabel = canShowSpecificItem ? sticker.label || "なにかな？" : "なにかな？";
  const displayNote = collectionZukanCardNote(sticker, found, canShowSpecificItem);
  const { x, y, width, height } = rect;
  const scaleX = zukanRectScaleX(rect);
  const scaleY = zukanRectScaleY(rect);
  const scale = Math.min(scaleX, scaleY);
  const isRoomy = height >= 220;
  const badgeX = x + (isRoomy ? 22 : 18) * scaleX + zukanIndexSlotTextOffset(slotIndex, "Badge", "X");
  const badgeY = y + (isRoomy ? 22 : 20) * scaleY + zukanIndexSlotTextOffset(slotIndex, "Badge", "Y");
  const badgeW = (isRoomy ? 84 : 72) * scaleX;
  const badgeH = (isRoomy ? 42 : 38) * scaleY;
  const badgeRadius = (isRoomy ? 15 : 14) * scale;
  const roomyImageLimit = (generatedTemplate ? 198 : 164) * scale;
  const sixSlotGeneratedTemplate = generatedTemplate && height >= 280;
  const imageSize = Math.min(
    isRoomy ? roomyImageLimit : 112,
    height - (isRoomy ? (generatedTemplate ? 88 : 74) : 30),
    width * (isRoomy ? (generatedTemplate ? 0.34 : 0.32) : 0.28)
  );
  const imageBaseX = generatedTemplate ? x + 38 * scaleX : x + (isRoomy ? 48 : 108);
  const imageBaseY = generatedTemplate
    ? y + (sixSlotGeneratedTemplate ? 32 : 58) * scaleY
    : y + (height - imageSize) / 2 + (isRoomy ? 18 : 0);
  const imageX = imageBaseX + zukanIndexSlotTextOffset(slotIndex, "Image", "X");
  const imageY = imageBaseY + zukanIndexSlotTextOffset(slotIndex, "Image", "Y");
  const textX = (isRoomy ? imageBaseX + imageSize + 34 * scaleX : x + 232) + zukanIndexSlotTextOffset(slotIndex, "Text", "X");
  const textMaxW = Math.max(220, x + width - textX - 28);
  const titleY = (generatedTemplate ? y + (sixSlotGeneratedTemplate ? 90 : 98) * scaleY : isRoomy ? y + Math.max(106, height * 0.43) : y + 48) + zukanIndexSlotTextOffset(slotIndex, "Text", "Y");
  const noteY = titleY + (isRoomy ? 42 : 31) * scaleY;
  ctx.save();
  if (!generatedTemplate) {
    ctx.fillStyle = found ? cardTheme.foundFill : cardTheme.lockedFill;
    ctx.strokeStyle = found ? cardTheme.foundStroke : cardTheme.lockedStroke;
    ctx.lineWidth = 2.5;
    drawCanvasRoundedRect(ctx, x, y, width, height, 16);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = found ? cardTheme.numberFill : "#9aa09b";
  drawCanvasRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `${isRoomy ? "800 24px" : "800 22px"} "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(String(index).padStart(2, "0"), badgeX + badgeW / 2, badgeY + badgeH - 11);

  if (!generatedTemplate) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    drawCanvasRoundedRect(ctx, imageX - 8, imageY - 8, imageSize + 16, imageSize + 16, isRoomy ? 24 : 20);
    ctx.fill();
  }
  if (canShowSpecificItem) {
    drawAsyncCollectionZukanImage(ctx, texture, sticker.assetUrl, imageX, imageY, imageSize, imageSize, found, pageNumber);
  } else {
    drawMissingStickerBadge(ctx, imageX, imageY, imageSize, imageSize);
  }

  ctx.fillStyle = found ? palette.collection.text : "rgba(51, 68, 71, 0.54)";
  ctx.font = `${isRoomy ? "800 34px" : "800 28px"} "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(displayLabel, textX, titleY, textMaxW);
  ctx.fillStyle = found ? "rgba(51, 68, 71, 0.72)" : "rgba(51, 68, 71, 0.46)";
  ctx.font = `${isRoomy ? "700 22px" : "700 19px"} "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
  ctx.fillText(displayNote, textX, noteY, textMaxW);
  ctx.restore();
}

function drawCollectionZukanDetailPage(ctx, texture, palette, pageDef, subject, pageNumber, side = "left") {
  const theme = palette.collection;
  const found = subject?.unlock === "found";
  const canShowSpecificItem = canShowSpecificCollectionSticker(subject);
  const detail = collectionZukanDetailTemplate(pageDef, subject, pageNumber, palette, side);

  ctx.save();
  drawCollectionZukanDetailHeader(ctx, palette, theme, detail.header);
  drawCollectionZukanIllustrationSlot(ctx, detail.image, found, theme);
  const imageScaleX = zukanRectScaleX(detail.image);
  const imageScaleY = zukanRectScaleY(detail.image);
  if (canShowSpecificItem) {
    drawAsyncCollectionZukanImage(
      ctx,
      texture,
      subject.assetUrl,
      detail.image.x + 58 * imageScaleX,
      detail.image.y + 66 * imageScaleY,
      detail.image.width - 116 * imageScaleX,
      detail.image.height - 132 * imageScaleY,
      found,
      pageNumber,
    );
  } else {
    drawMissingStickerBadge(
      ctx,
      detail.image.x + 132 * imageScaleX,
      detail.image.y + 122 * imageScaleY,
      detail.image.width - 264 * imageScaleX,
      detail.image.height - 244 * imageScaleY,
    );
  }

  for (const field of detail.fields) {
    drawCollectionZukanField(ctx, field.title, field.value, field.x, field.y, field.width, field.height, field.accentColor, field.scaleX, field.scaleY);
  }
  drawCollectionZukanMemoCard(ctx, palette, theme, detail.memo);
  drawCollectionPlacementLayer(ctx, texture, pageNumber);
  drawZukanTuningSelectionOverlay(ctx, pageDef, [subject].filter(Boolean), pageNumber, side);
  ctx.restore();
  texture.needsUpdate = true;
}

function collectionZukanDetailTemplate(pageDef, subject, pageNumber, palette, side = "left") {
  const theme = palette.collection;
  const subjectNumber = subject ? collectionZukanItemNumber(subject, pageNumber, 0) : pageNumber;
  const subjectName = collectionZukanFirstText(subject?.label, pageDef?.label, "ずかん");
  const kana = collectionZukanFirstText(subject?.kana);
  const subtitle = kana && kana !== subjectName
    ? kana
    : collectionZukanFirstText(pageDef?.subtitle, "みつけたものを かんさつしよう");
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("detail");
  const templateTransform = generatedTemplate ? zukanTemplateTransformForSide(side, "detail") : { scaleX: 1, scaleY: 1 };
  const attachScale = (rect) => ({
    ...rect,
    scaleX: templateTransform.scaleX,
    scaleY: templateTransform.scaleY,
  });
  const transformGeneratedRect = (rect) => attachScale(generatedTemplate ? zukanTemplateTransformRect(rect, side, "detail") : rect);
  const fieldX = generatedTemplate ? 794 : 752;
  const fieldY = generatedTemplate ? 294 : 332;
  const fieldW = generatedTemplate ? 580 : 558;
  const fieldH = generatedTemplate ? 214 : 142;
  const fieldGap = generatedTemplate ? 32 : 22;
  const headerRect = transformGeneratedRect({
    x: generatedTemplate ? 102 : 156,
    y: generatedTemplate ? 96 : 146,
    width: generatedTemplate ? 1248 : 1158,
    height: 142,
  });
  const imageRect = transformGeneratedRect({
    x: generatedTemplate ? 84 : 166,
    y: generatedTemplate ? 292 : 330,
    width: generatedTemplate ? 674 : 552,
    height: generatedTemplate ? 722 : 610,
  });
  const memoRect = transformGeneratedRect({
    x: generatedTemplate ? 84 : 166,
    y: generatedTemplate ? 1068 : 972,
    width: generatedTemplate ? 1298 : 1144,
    height: generatedTemplate ? 278 : 246,
  });
  return {
    header: {
      ...headerRect,
      number: String(subjectNumber).padStart(2, "0"),
      name: subjectName,
      subtitle,
      category: collectionZukanDetailCategoryLabel(subject, pageDef),
    },
    image: {
      ...imageRect,
      x: imageRect.x + zukanTextOffset("detailImageX"),
      y: imageRect.y + zukanTextOffset("detailImageY"),
    },
    fields: [
      {
        title: "すんでいるところ",
        value: collectionZukanCompactText(subject?.habitat, "しらべています", 30),
        ...transformGeneratedRect({ x: fieldX, y: fieldY, width: fieldW, height: fieldH }),
        accentColor: theme.infoAccent || palette.sub,
      },
      {
        title: "たべもの",
        value: collectionZukanFoodText(subject),
        ...transformGeneratedRect({ x: fieldX, y: fieldY + fieldH + fieldGap, width: fieldW, height: fieldH }),
        accentColor: theme.pages.right.accent,
      },
      {
        title: "からだ",
        value: collectionZukanBodyText(subject),
        ...transformGeneratedRect({ x: fieldX, y: fieldY + (fieldH + fieldGap) * 2, width: fieldW, height: fieldH }),
        accentColor: palette.accent,
      },
    ],
    memo: {
      ...memoRect,
      title: collectionZukanMemoTitle(subject),
      value: collectionZukanMemoText(subject),
    },
  };
}

function collectionZukanDetailCategoryLabel(subject, pageDef) {
  const categoryId = collectionZukanFirstText(subject?.categoryId, pageDef?.categoryId);
  const directCategory = COLLECTION_TOC_CATEGORY_DEFS.find((definition) => definition.id === categoryId);
  const matchedCategory = subject ? collectionZukanCategoryForSticker(subject) : null;
  return collectionZukanFirstText(directCategory?.label, matchedCategory?.label, pageDef?.subtitle, "ずかん");
}

function collectionZukanFirstText(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = collectionZukanFirstText(...value);
      if (nested) {
        return nested;
      }
      continue;
    }
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function collectionZukanCompactText(value, fallback = "しらべています", maxChars = 34) {
  const text = collectionZukanFirstText(value, fallback);
  if (text.length <= maxChars) {
    return text;
  }
  const sentenceEnd = text.search(/[。！？]/);
  if (sentenceEnd >= 0 && sentenceEnd + 1 <= maxChars + 2) {
    return text.slice(0, sentenceEnd + 1);
  }
  return `${text.slice(0, Math.max(1, maxChars - 3))}...`;
}

function collectionZukanFoodText(subject) {
  const specific = COLLECTION_ZUKAN_FOOD_TEXT_BY_ID[subject?.id || ""];
  if (specific) {
    return specific;
  }
  const direct = collectionZukanFirstText(subject?.food, subject?.foods, subject?.diet, subject?.meal, subject?.eats);
  if (direct) {
    return collectionZukanCompactText(direct, "しらべています", 28);
  }
  if (subject?.categoryId === "food") {
    return collectionZukanCompactText(subject?.group || subject?.fact, "たべもの", 28);
  }
  return collectionZukanCompactText(collectionZukanExtractFoodText(subject?.fact), "しらべています", 28);
}

const COLLECTION_ZUKAN_FOOD_TEXT_BY_ID = {
  bug_hachi: "はなの みつ",
  bug_kabutomushi: "きの じゅえき",
  bug_amenbo: "ちいさな むし",
  bug_chocho: "はなの みつ",
  animal_dog: "ドッグフードや にく",
  animal_cat: "キャットフードや さかな",
  animal_lion: "にく",
  animal_penguin: "さかな",
  animal_kuma: "きのみや さかな",
  animal_kirin: "きの はっぱ",
  animal_cheetah: "にく",
  animal_araiguma: "くだものや ちいさな いきもの",
  animal_usagi: "くさや やさい",
  animal_risu: "きのみ",
  animal_shika: "くさや はっぱ",
  animal_kitsune: "ちいさな いきものや きのみ",
  animal_karasu: "きのみや ちいさな たべもの",
  animal_harinezumi: "ちいさな むし",
  animal_fukurou: "ちいさな いきもの",
  animal_ahiru: "みずくさや こくもつ",
  sea_kujira: "プランクトンなど",
  sea_kani: "かいそうや ちいさな たべもの",
  sea_daiouika: "さかなや ちいさな いきもの",
  sea_jinbeizame: "プランクトン",
  food_onigiri: "ごはん",
  food_tamago: "たまご",
  food_karaage: "とりにくなど",
  food_broccoli: "つぼみの あつまり",
  food_wiener: "にく",
  food_ichigo: "あかい み",
};

function collectionZukanExtractFoodText(fact) {
  const source = collectionZukanFirstText(fact);
  if (!source) {
    return "";
  }
  const clauses = source
    .split(/[。！？、，]/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const clause = clauses.find((item) => /(たべ|食べ|すい|吸い|あつめ|さが)/.test(item)) || "";
  if (!clause) {
    return "";
  }
  const matched = clause.match(/(.+?)(?:など)?を\s*(?:たべ|食べ|すい|吸い|あつめ|さが)/);
  if (!matched) {
    return clause.includes("たべもの") ? "たべもの" : "";
  }
  return matched[1]
    .replace(/^.*(?:で|は)\s+/, "")
    .replace(/など$/, "など")
    .trim();
}

function collectionZukanBodyText(subject) {
  const direct = collectionZukanFirstText(subject?.body, subject?.bodyText, subject?.shape, subject?.feature, subject?.features);
  if (direct) {
    return collectionZukanCompactText(direct, "しらべています", 30);
  }
  return collectionZukanCompactText(subject?.guideText || subject?.group || subject?.fact, "しらべています", 30);
}

function collectionZukanMemoTitle(subject) {
  return subject?.guideSpeaker === "ポノ" ? "ポノメモ" : "メモ";
}

function collectionZukanMemoText(subject) {
  return collectionZukanCompactText(
    collectionZukanFirstText(subject?.memo, subject?.fact, subject?.guideText),
    "きになる ところを じっくり みてみよう。",
    64,
  );
}

function drawCollectionZukanDetailHeader(ctx, palette, theme, header) {
  const { x, y, width, height } = header;
  const scaleX = zukanRectScaleX(header);
  const scaleY = zukanRectScaleY(header);
  const pageAccent = theme.pages.right.accent;
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("detail");
  const headerGradient = ctx.createLinearGradient(0, y, 0, y + height);
  headerGradient.addColorStop(0, "rgba(255, 255, 255, 0.88)");
  headerGradient.addColorStop(1, "rgba(255, 248, 224, 0.74)");

  ctx.save();
  if (!generatedTemplate) {
    ctx.fillStyle = headerGradient;
    ctx.strokeStyle = "rgba(51, 68, 71, 0.13)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, x, y, width, height, 34);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.infoAccent || palette.sub;
    drawCanvasRoundedRect(ctx, x + 30, y + 30, 154, 58, 22);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 27px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(
    `No.${header.number}`,
    x + 107 * scaleX + zukanTextOffset("detailNumberX"),
    y + 68 * scaleY + zukanTextOffset("detailNumberY"),
  );

  if (!generatedTemplate) {
    ctx.fillStyle = pageAccent;
    drawCanvasRoundedRect(ctx, x + width - 256, y + 31, 218, 54, 22);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 25px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText(
    header.category,
    x + width - 147 * scaleX + zukanTextOffset("detailCategoryX"),
    y + 67 * scaleY + zukanTextOffset("detailCategoryY"),
    186 * scaleX,
  );

  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  ctx.font = '900 54px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText(
    header.name,
    x + 212 * scaleX + zukanTextOffset("detailNameX"),
    y + 67 * scaleY + zukanTextOffset("detailNameY"),
    width - 506 * scaleX,
  );
  ctx.fillStyle = "rgba(51, 68, 71, 0.62)";
  ctx.font = '800 25px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText(
    header.subtitle,
    x + 216 * scaleX + zukanTextOffset("detailSubtitleX"),
    y + 106 * scaleY + zukanTextOffset("detailSubtitleY"),
    width - 520 * scaleX,
  );
  ctx.restore();
}

function drawCollectionZukanIllustrationSlot(ctx, rect, found, theme) {
  const { x, y, width, height } = rect;
  if (collectionZukanUsesGeneratedTemplate("detail")) {
    return;
  }
  const slotGradient = ctx.createLinearGradient(0, y, 0, y + height);
  slotGradient.addColorStop(0, found ? "rgba(255, 255, 255, 0.78)" : "rgba(238, 239, 232, 0.72)");
  slotGradient.addColorStop(1, found ? "rgba(255, 250, 228, 0.72)" : "rgba(224, 226, 218, 0.62)");

  ctx.save();
  ctx.fillStyle = slotGradient;
  ctx.strokeStyle = found ? "rgba(94, 155, 132, 0.34)" : "rgba(116, 128, 122, 0.24)";
  ctx.lineWidth = 4;
  drawCanvasRoundedRect(ctx, x, y, width, height, 36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.44)";
  ctx.beginPath();
  ctx.ellipse(x + width * 0.5, y + height * 0.54, width * 0.34, height * 0.29, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 224, 111, 0.48)";
  ctx.beginPath();
  ctx.arc(x + width - 78, y + 82, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.infoAccentSoft || "rgba(85, 174, 184, 0.25)";
  ctx.beginPath();
  ctx.arc(x + 76, y + height - 88, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, x + 20, y + 20, width - 40, height - 40, 28);
  ctx.stroke();
  ctx.restore();
}

function drawAsyncCollectionZukanImage(ctx, texture, src, x, y, width, height, found, pageNumber) {
  loadStickerImage(src)
    .then((image) => {
      ctx.save();
      if (!found) {
        ctx.globalAlpha = 0.38;
        ctx.filter = "grayscale(1) saturate(0.18)";
      }
      drawImageContain(ctx, image, x, y, width, height);
      ctx.restore();
      queueCollectionPlacementLayer(ctx, texture, pageNumber);
      drawZukanTuningSelectionOverlayForPage(ctx, pageNumber);
      texture.needsUpdate = true;
    })
    .catch(() => {});
}

function drawCollectionZukanField(ctx, title, value, x, y, width, height, accentColor, rectScaleX = 1, rectScaleY = 1) {
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("detail");
  const scaleX = Number.isFinite(Number(rectScaleX)) && Number(rectScaleX) > 0 ? Number(rectScaleX) : 1;
  const scaleY = Number.isFinite(Number(rectScaleY)) && Number(rectScaleY) > 0 ? Number(rectScaleY) : 1;
  ctx.save();
  if (!generatedTemplate) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.strokeStyle = "rgba(51, 68, 71, 0.11)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, x, y, width, height, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor;
    drawCanvasRoundedRect(ctx, x + 24, y + 20, 230, 42, 18);
    ctx.fill();
  }
  ctx.font = `${generatedTemplate ? "900 20px" : "900 21px"} "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
  ctx.textAlign = "center";
  const titleCenterX = x + (generatedTemplate ? 112 : 139) * scaleX + zukanTextOffset("detailFieldTitleX");
  const titleBaselineY = y + (generatedTemplate ? 64 : 48) * scaleY + zukanTextOffset("detailFieldTitleY");
  const titleMaxWidth = (generatedTemplate ? 220 : 206) * scaleX;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    title,
    titleCenterX,
    titleBaselineY,
    titleMaxWidth,
  );

  ctx.fillStyle = "rgba(51, 68, 71, 0.82)";
  ctx.font = `${generatedTemplate ? "900 30px" : "900 29px"} "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
  ctx.textAlign = "left";
  drawWrappedCanvasText(
    ctx,
    value,
    x + (generatedTemplate ? 48 : 30) * scaleX + zukanTextOffset("detailFieldTextX"),
    y + (generatedTemplate ? 122 : 96) * scaleY + zukanTextOffset("detailFieldTextY"),
    width - (generatedTemplate ? 84 : 60) * scaleX,
    36 * scaleY,
    2,
  );
  ctx.restore();
}

function drawCollectionZukanMemoCard(ctx, palette, theme, memo) {
  const { x, y, width, height } = memo;
  const scaleX = zukanRectScaleX(memo);
  const scaleY = zukanRectScaleY(memo);
  const generatedTemplate = collectionZukanUsesGeneratedTemplate("detail");
  const memoGradient = ctx.createLinearGradient(0, y, 0, y + height);
  memoGradient.addColorStop(0, "rgba(255, 255, 255, 0.74)");
  memoGradient.addColorStop(1, "rgba(255, 250, 229, 0.7)");

  ctx.save();
  if (!generatedTemplate) {
    ctx.fillStyle = memoGradient;
    ctx.strokeStyle = "rgba(51, 68, 71, 0.12)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, x, y, width, height, 30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.pages.right.accent;
    drawCanvasRoundedRect(ctx, x + 34, y + 28, 178, 50, 20);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 24px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(
    memo.title,
    x + 123 * scaleX + zukanTextOffset("detailMemoTitleX"),
    y + 61 * scaleY + zukanTextOffset("detailMemoTitleY"),
    146 * scaleX,
  );

  if (!generatedTemplate) {
    ctx.fillStyle = theme.infoAccent || palette.sub;
    ctx.beginPath();
    ctx.arc(x + width - 76, y + 58, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.beginPath();
    ctx.arc(x + width - 124, y + 78, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(51, 68, 71, 0.78)";
  ctx.font = '800 30px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "left";
  drawWrappedCanvasText(
    ctx,
    memo.value,
    x + 38 * scaleX + zukanTextOffset("detailMemoTextX"),
    y + 122 * scaleY + zukanTextOffset("detailMemoTextY"),
    width - 76 * scaleX,
    40 * scaleY,
    3,
  );
  ctx.restore();
}

function drawWrappedCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const source = String(text || "");
  const words = source.includes(" ") ? source.split(/(\s+)/).filter(Boolean) : [...source];
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line}${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line.trim());
    line = word.trimStart();
    if (lines.length >= maxLines) {
      break;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line.trim());
  }
  lines.slice(0, maxLines).forEach((lineText, index) => {
    const display = index === maxLines - 1 && lines.length > maxLines ? `${lineText}...` : lineText;
    ctx.fillText(display, x, y + lineHeight * index, maxWidth);
  });
}

function drawAsyncCollectionStickerImage(ctx, texture, src, x, y, width, height, found, pageNumber) {
  loadStickerImage(src)
    .then((image) => {
      ctx.save();
      if (!found) {
        ctx.globalAlpha = 0.38;
        ctx.filter = "grayscale(1) saturate(0.15)";
      }
      drawImageContain(ctx, image, x, y, width, height);
      ctx.restore();
      queueCollectionPlacementLayer(ctx, texture, pageNumber);
      drawZukanTuningSelectionOverlayForPage(ctx, pageNumber);
      texture.needsUpdate = true;
    })
    .catch(() => {});
}

function queueCollectionPlacementLayer(ctx, texture, pageNumber) {
  if (!getCollectionPagePlacements(pageNumber).length) {
    return;
  }
  if (texture.userData.collectionPlacementTimer) {
    window.clearTimeout(texture.userData.collectionPlacementTimer);
  }
  texture.userData.collectionPlacementTimer = window.setTimeout(() => {
    texture.userData.collectionPlacementTimer = 0;
    drawCollectionPlacementLayer(ctx, texture, pageNumber);
  }, 0);
}

function drawCollectionPlacementLayer(ctx, texture, pageNumber) {
  const placements = getCollectionPagePlacements(pageNumber)
    .filter((placement) => placement.assetUrl)
    .sort((a, b) => a.z - b.z);
  for (const placement of placements) {
    drawAsyncCollectionPlacedSticker(ctx, texture, placement, pageNumber);
  }
  drawZukanTuningSelectionOverlayForPage(ctx, pageNumber);
  texture.needsUpdate = true;
}

function drawAsyncCollectionPlacedSticker(ctx, texture, placement, pageNumber) {
  loadStickerImage(placement.assetUrl)
    .then((image) => {
      const baseW = PAGE_TEXTURE_W * 0.18 * placement.scale;
      const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
      const drawW = baseW;
      const drawH = drawW / Math.max(0.2, aspect);
      const x = (placement.x / 100) * PAGE_TEXTURE_W;
      const y = (placement.y / 100) * PAGE_TEXTURE_H;
      const paddedImage = getPaddedStickerImage(image);
      const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
      const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
      const paddedDrawW = drawW * (paddedImage.width / sourceWidth);
      const paddedDrawH = drawH * (paddedImage.height / sourceHeight);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(THREE.MathUtils.degToRad(placement.rotation || 0));
      drawStickerWhiteOutline(ctx, paddedImage, -paddedDrawW / 2, -paddedDrawH / 2, paddedDrawW, paddedDrawH);
      ctx.drawImage(paddedImage, -paddedDrawW / 2, -paddedDrawH / 2, paddedDrawW, paddedDrawH);
      ctx.restore();
      drawZukanTuningSelectionOverlayForPage(ctx, pageNumber);
      texture.needsUpdate = true;
    })
    .catch(() => {});
}

function drawMissingStickerBadge(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(160, 160, 150, 0.18)";
  ctx.strokeStyle = "rgba(120, 128, 122, 0.22)";
  ctx.lineWidth = 4;
  drawCanvasRoundedRect(ctx, x + width * 0.12, y + width * 0.12, width * 0.76, height * 0.76, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(80, 88, 84, 0.36)";
  ctx.font = '900 52px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("?", x + width / 2, y + height / 2 + 18);
  ctx.restore();
}

function drawStickerListPage(ctx, texture, palette, pageDef, stickers) {
  const contentX = 148;
  const contentY = 190;
  const contentW = PAGE_TEXTURE_W - 272;
  const contentH = PAGE_TEXTURE_H - 340;
  ctx.save();
  ctx.fillStyle = "rgba(255, 250, 226, 0.94)";
  drawCanvasRoundedRect(ctx, contentX - 18, contentY - 116, contentW + 36, contentH + 172, 42);
  ctx.fill();

  ctx.fillStyle = "#334447";
  ctx.font = '800 58px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(pageDef?.label || "シール", PAGE_TEXTURE_W / 2 - 44, contentY - 54);
  ctx.fillStyle = palette.sub;
  ctx.font = '800 30px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText("シールいちらん", PAGE_TEXTURE_W / 2 - 44, contentY - 16);

  const count = stickers.length;
  const cols = count > 18 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(count / cols));
  const gapX = 24;
  const gapY = 14;
  const cellW = (contentW - gapX * (cols - 1)) / cols;
  const cellH = Math.min(96, (contentH - gapY * (rows - 1)) / rows);
  const thumb = Math.min(58, cellH - 22);
  for (let i = 0; i < count; i += 1) {
    const sticker = stickers[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = contentX + col * (cellW + gapX);
    const y = contentY + row * (cellH + gapY);
    ctx.fillStyle = col % 2 === 0 ? "rgba(255,255,255,0.62)" : "rgba(224,245,245,0.54)";
    ctx.strokeStyle = "rgba(188, 151, 73, 0.38)";
    ctx.lineWidth = 3;
    drawCanvasRoundedRect(ctx, x, y, cellW, cellH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.sub;
    drawCanvasRoundedRect(ctx, x + 14, y + 16, 56, 30, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '800 19px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1).padStart(2, "0"), x + 42, y + 38);

    const imageX = x + 84;
    const imageY = y + (cellH - thumb) / 2;
    drawStickerImagePlaceholder(ctx, imageX, imageY, thumb, thumb, sticker.label);
    drawAsyncStickerImage(ctx, texture, sticker.assetUrl, imageX, imageY, thumb, thumb);

    ctx.fillStyle = "#334447";
    ctx.font = `800 ${count > 18 ? 20 : 24}px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(sticker.label, imageX + thumb + 14, y + cellH / 2 + 8, cellW - thumb - 112);
  }

  if (!count) {
    ctx.fillStyle = "rgba(51, 68, 71, 0.58)";
    ctx.font = '800 38px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("シールは まだありません", PAGE_TEXTURE_W / 2, PAGE_TEXTURE_H / 2);
  }
  ctx.restore();
  texture.needsUpdate = true;
}

function drawStickerCanvasPage(ctx, texture, palette, pageDef, placements, pageNumber) {
  const ordered = [...placements].sort((a, b) => a.z - b.z);
  for (const placement of ordered) {
    drawAsyncPlacedSticker(ctx, texture, placement, pageNumber);
  }
  drawPageDrawingLayer(ctx, pageNumber);
  drawInlineStickerSelectionOverlay(ctx, pageNumber);
  texture.needsUpdate = true;
}

function drawPageDrawingLayer(ctx, pageNumber) {
  const strokes = getPageDrawingStrokes(pageNumber);
  if (!strokes.length) {
    return;
  }
  const layer = document.createElement("canvas");
  layer.width = PAGE_TEXTURE_W;
  layer.height = PAGE_TEXTURE_H;
  const layerCtx = layer.getContext("2d");
  drawDrawingStrokes(layerCtx, strokes, PAGE_TEXTURE_W, PAGE_TEXTURE_H);
  ctx.drawImage(layer, 0, 0);
}

function drawStickerImagePlaceholder(ctx, x, y, width, height, label) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(51,68,71,0.22)";
  ctx.font = '800 22px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText([...String(label || "?")][0] || "?", x + width / 2, y + height / 2 + 8);
  ctx.restore();
}

function drawAsyncStickerImage(ctx, texture, src, x, y, width, height) {
  loadStickerImage(src)
    .then((image) => {
      drawImageContain(ctx, image, x, y, width, height);
      texture.needsUpdate = true;
    })
    .catch(() => {});
}

function drawAsyncPlacedSticker(ctx, texture, placement, pageNumber) {
  loadStickerImage(placement.assetUrl)
    .then((image) => {
      const baseW = PAGE_TEXTURE_W * 0.18 * placement.scale;
      const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
      const drawW = baseW;
      const drawH = drawW / Math.max(0.2, aspect);
      const x = (placement.x / 100) * PAGE_TEXTURE_W;
      const y = (placement.y / 100) * PAGE_TEXTURE_H;
      const paddedImage = getPaddedStickerImage(image);
      const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
      const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
      const paddedDrawW = drawW * (paddedImage.width / sourceWidth);
      const paddedDrawH = drawH * (paddedImage.height / sourceHeight);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(THREE.MathUtils.degToRad(placement.rotation || 0));
      drawStickerWhiteOutline(ctx, paddedImage, -paddedDrawW / 2, -paddedDrawH / 2, paddedDrawW, paddedDrawH);
      ctx.drawImage(paddedImage, -paddedDrawW / 2, -paddedDrawH / 2, paddedDrawW, paddedDrawH);
      ctx.restore();
      drawPageDrawingLayer(ctx, pageNumber);
      drawInlineStickerSelectionOverlay(ctx, pageNumber);
      texture.needsUpdate = true;
    })
    .catch(() => {
      // v1650 (task 2): 失敗 Promise が stickerImageCache に永久キャッシュされると
      // 以後同じ URL の sticker が永久に描画されなくなる (低確率だが詰む)。
      // 次回 refresh で再 load を許可するために cache から削除。
      stickerImageCache.delete(placement.assetUrl);
    });
}

function drawInlineStickerSelectionOverlay(ctx, pageNumber) {
  if (
    activeAlbumMode === "collection"
    || pageNumber !== activeEditorPage
    || !selectedPlacementId
    || (stickerEditor && !stickerEditor.hidden)
  ) {
    return;
  }
  const placement = getPlacementByIdOnPage(selectedPlacementId, pageNumber);
  if (!placement) {
    return;
  }
  const bounds = placementTextureBounds(placement);
  ctx.save();
  ctx.translate(bounds.x, bounds.y);
  ctx.rotate(THREE.MathUtils.degToRad(placement.rotation || 0));
  ctx.setLineDash([16, 10]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(49,145,153,0.74)";
  ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
  ctx.restore();
}

function drawStickerWhiteOutline(ctx, image, x, y, width, height) {
  const whiteOutline = Math.max(1.25, Math.min(3.4, width * 0.007));
  const blackOutline = whiteOutline + Math.max(0.35, Math.min(0.7, width * 0.0016));
  const blackOffsets = stickerOutlineOffsets(blackOutline);
  const whiteOffsets = stickerOutlineOffsets(whiteOutline);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.filter = "brightness(0)";
  for (const [dx, dy] of blackOffsets.slice(0, 4)) {
    ctx.drawImage(image, x + dx, y + dy, width, height);
  }
  ctx.globalAlpha = 0.96;
  ctx.filter = "brightness(0) invert(1)";
  for (const [dx, dy] of whiteOffsets) {
    ctx.drawImage(image, x + dx, y + dy, width, height);
  }
  ctx.filter = "none";
  ctx.restore();
}

function getPaddedStickerImage(image) {
  if (image.__sb3dPaddedImage) {
    return image.__sb3dPaddedImage;
  }
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const pad = Math.max(18, Math.ceil(Math.max(sourceWidth, sourceHeight) * 0.1));
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth + pad * 2;
  canvas.height = sourceHeight + pad * 2;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, pad, pad, sourceWidth, sourceHeight);
  image.__sb3dPaddedImage = canvas;
  return canvas;
}

function stickerOutlineOffsets(outline) {
  return [
    [outline, 0],
    [-outline, 0],
    [0, outline],
    [0, -outline],
    [outline * 0.72, outline * 0.72],
    [-outline * 0.72, outline * 0.72],
    [outline * 0.72, -outline * 0.72],
    [-outline * 0.72, -outline * 0.72],
  ];
}

function drawImageContain(ctx, image, x, y, width, height) {
  const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
  let drawW = width;
  let drawH = drawW / Math.max(0.2, aspect);
  if (drawH > height) {
    drawH = height;
    drawW = drawH * aspect;
  }
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function loadStickerImage(src) {
  if (!src) {
    return Promise.reject(new Error("missing image src"));
  }
  if (!stickerImageCache.has(src)) {
    stickerImageCache.set(src, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
        stickerAspectCache.set(src, Math.max(0.2, aspect));
        resolve(image);
      };
      image.onerror = reject;
      image.decoding = "async";
      image.src = src;
    }));
  }
  return stickerImageCache.get(src);
}

function drawCanvasRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function tintColor(hex, amount) {
  const raw = String(hex || "").replace("#", "");
  const value = raw.length === 3
    ? raw.split("").map((char) => `${char}${char}`).join("")
    : raw.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  if (!Number.isFinite(number)) {
    return hex;
  }
  const mix = THREE.MathUtils.clamp(amount, -1, 1);
  const target = mix >= 0 ? 255 : 0;
  const weight = Math.abs(mix);
  const r = Math.round(((number >> 16) & 255) * (1 - weight) + target * weight);
  const g = Math.round(((number >> 8) & 255) * (1 - weight) + target * weight);
  const b = Math.round((number & 255) * (1 - weight) + target * weight);
  return `rgb(${r}, ${g}, ${b})`;
}

function makePlane(file, width, height, options = {}) {
  const material = options.lit
    ? new THREE.MeshStandardMaterial({
        map: getTexture(file),
        transparent: options.transparent ?? true,
        opacity: options.opacity ?? 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0.0,
      })
    : new THREE.MeshBasicMaterial({
        map: getTexture(file),
        transparent: true,
        opacity: options.opacity ?? 1,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.z = options.depth ?? 0;
  return mesh;
}

function makePageSurface(file, geometry) {
  const material = new THREE.MeshStandardMaterial({
    map: getTexture(file),
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    roughness: 0.9,
    metalness: 0.0,
  });
  return new THREE.Mesh(geometry, material);
}

function createSideTabs() {
  const group = new THREE.Group();
  const tabW = PAGE_H * (320 / 1536);
  const tabReveal = tabW * 0.28;
  const tabCenterOffset = tabW * 0.5 - tabReveal;
  const leftEdge = -PAGE_W - GUTTER / 2;
  const rightEdge = PAGE_W + GUTTER / 2;

  const baseMaterial = new THREE.MeshStandardMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.72,
    metalness: 0.0,
  });

  const leftMaterial = baseMaterial.clone();
  leftMaterial.map = getFreeSideTabsTexture(activeBook, "left");
  const left = new THREE.Mesh(new THREE.PlaneGeometry(tabW, PAGE_H), leftMaterial);
  left.position.set(leftEdge + tabCenterOffset, 0, 0);
  left.renderOrder = 42;
  group.add(left);

  const rightMaterial = baseMaterial.clone();
  rightMaterial.map = getFreeSideTabsTexture(activeBook, "right");
  const right = new THREE.Mesh(new THREE.PlaneGeometry(tabW, PAGE_H), rightMaterial);
  right.position.set(rightEdge - tabCenterOffset, 0, 0);
  right.renderOrder = 42;
  group.add(right);

  return { group, left, right, tabCenterOffset };
}

function positionSideTabs(gap = currentBookGap()) {
  const leftEdge = -PAGE_W - gap / 2;
  const rightEdge = PAGE_W + gap / 2;
  sideTabs.left.position.x = leftEdge + sideTabs.tabCenterOffset;
  sideTabs.right.position.x = rightEdge - sideTabs.tabCenterOffset;
}

function positionClosedCoverTabs() {
  const leftEdge = COVER_CLOSED_X;
  const rightEdge = COVER_CLOSED_X + PAGE_W;
  sideTabs.left.position.x = leftEdge + sideTabs.tabCenterOffset;
  sideTabs.right.position.x = rightEdge - sideTabs.tabCenterOffset;
}

function positionCoverOpeningTabs(openProgress) {
  const p = smootherstep(openProgress);
  const gap = currentBookGap();
  const openLeftEdge = -PAGE_W - gap / 2;
  const openRightEdge = PAGE_W + gap / 2;
  const closedLeftEdge = COVER_CLOSED_X;
  const closedRightEdge = COVER_CLOSED_X + PAGE_W;
  sideTabs.left.position.x = THREE.MathUtils.lerp(closedLeftEdge, openLeftEdge, p) + sideTabs.tabCenterOffset;
  sideTabs.right.position.x = THREE.MathUtils.lerp(closedRightEdge, openRightEdge, p) - sideTabs.tabCenterOffset;
  sideTabs.group.position.z = -0.04;
}

function setClosedCoverTabsVisible(visible) {
  sideTabs.group.visible = visible;
  sideTabs.left.visible = false;
  sideTabs.right.visible = visible;
  if (visible) {
    sideTabs.group.position.z = -0.04;
    positionClosedCoverTabs();
  }
}

function assignSideTabTextures() {
  if (activeAlbumMode === "collection") {
    assignTextureObject(sideTabs.left, getCollectionTabsTexture(activeBook, "left"));
    assignTextureObject(sideTabs.right, getCollectionTabsTexture(activeBook, "right"));
    return;
  }
  assignTextureObject(sideTabs.left, getFreeSideTabsTexture(activeBook, "left"));
  assignTextureObject(sideTabs.right, getFreeSideTabsTexture(activeBook, "right"));
}

function getFreeSideTabsTexture(bookName, side) {
  const key = `${bookName}:${side}`;
  if (freeSideTabsTextureMap.has(key)) {
    return freeSideTabsTextureMap.get(key);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d");
  const theme = stickerBookTheme(bookName).collection;
  const tabs = theme.tabs;
  const tabH = 166;
  const tabGap = 36;
  const startY = 108;
  const tabW = 282;
  const tabX = side === "left" ? 10 : canvas.width - tabW - 10;
  const motifX = side === "left" ? 58 : canvas.width - 58;
  const sparkleX = side === "left" ? 104 : canvas.width - 104;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i];
    const y = startY + i * (tabH + tabGap);
    const gradient = ctx.createLinearGradient(
      side === "left" ? tabX + tabW : tabX,
      0,
      side === "left" ? tabX : tabX + tabW,
      0,
    );
    gradient.addColorStop(0, tab.shadow);
    gradient.addColorStop(0.18, tab.color);
    gradient.addColorStop(0.62, tab.color);
    gradient.addColorStop(1, "#fff2c9");

    ctx.save();
    ctx.shadowColor = "rgba(55, 42, 24, 0.2)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = side === "left" ? -3 : 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = gradient;
    drawSideTabPath(ctx, tabX, y, tabW, tabH, 48, side);
    ctx.fill();

    ctx.shadowColor = "transparent";
    const gloss = ctx.createLinearGradient(0, y, 0, y + tabH);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    gloss.addColorStop(0.42, "rgba(255, 255, 255, 0.1)");
    gloss.addColorStop(1, "rgba(91, 59, 20, 0.08)");
    ctx.fillStyle = gloss;
    drawSideTabPath(ctx, tabX + 4, y + 4, tabW - 8, tabH - 8, 44, side);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.lineWidth = 5;
    drawSideTabPath(ctx, tabX + 13, y + 13, tabW - 26, tabH - 26, 36, side);
    ctx.stroke();

    ctx.setLineDash([10, 11]);
    ctx.strokeStyle = "rgba(255, 248, 220, 0.58)";
    ctx.lineWidth = 3;
    drawSideTabPath(ctx, tabX + 25, y + 27, tabW - 50, tabH - 54, 26, side);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = tab.shadow;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 4;
    drawSideTabPath(ctx, tabX + 3, y + 5, tabW - 6, tabH - 10, 44, side);
    ctx.stroke();
    ctx.globalAlpha = 1;

    drawCollectionMiniMotif(ctx, tab.motif, motifX, y + tabH / 2, 34, "rgba(255, 250, 224, 0.96)", side === "left" ? -0.12 : 0.12);
    drawCollectionMiniMotif(ctx, i % 2 === 0 ? "star" : "bubble", sparkleX, y + tabH * 0.32, 13, "rgba(255, 251, 222, 0.82)", side === "left" ? 0.22 : -0.22);
    drawCollectionMiniMotif(ctx, "sparkle", sparkleX, y + tabH * 0.7, 10, "rgba(255, 255, 255, 0.72)", 0.18);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  freeSideTabsTextureMap.set(key, texture);
  return texture;
}

function getCollectionTabsTexture(bookName, side) {
  const key = `${bookName}:${side}`;
  if (collectionTabsTextureMap.has(key)) {
    return collectionTabsTextureMap.get(key);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d");
  const theme = stickerBookTheme(bookName).collection;
  const tabs = theme.tabs;
  const tabH = 152;
  const tabGap = 32;
  const startY = 126;
  const tabW = 270;
  const tabX = side === "left" ? 8 : canvas.width - tabW - 8;
  const motifX = side === "left" ? 54 : canvas.width - 54;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i];
    const y = startY + i * (tabH + tabGap);
    ctx.save();
    ctx.shadowColor = "rgba(49, 42, 25, 0.18)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = tab.color;
    drawSideTabPath(ctx, tabX, y, tabW, tabH, 44, side);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
    ctx.lineWidth = 5;
    drawSideTabPath(ctx, tabX + 10, y + 10, tabW - 20, tabH - 20, 34, side);
    ctx.stroke();
    ctx.strokeStyle = tab.shadow;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 4;
    drawSideTabPath(ctx, tabX + 2, y + 4, tabW - 4, tabH - 8, 40, side);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawCollectionMiniMotif(ctx, tab.motif, motifX, y + tabH / 2, 32, "rgba(255, 250, 220, 0.92)", side === "left" ? -0.08 : 0.08);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  collectionTabsTextureMap.set(key, texture);
  return texture;
}

function drawSideTabPath(ctx, x, y, width, height, radius, side) {
  const r = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function createPageStacks() {
  const group = new THREE.Group();
  const left = createStackSide("left");
  const right = createStackSide("right");
  const collection = createCollectionStackBlock();
  group.add(left.group);
  group.add(right.group);
  group.add(collection.group);
  return { group, left, right, collection };
}

function createStackSide(side) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    map: getTexture(thicknessFileFor(side, "half")),
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(PAGE_W, THICKNESS_TEXTURE_H),
    material,
  );
  plane.position.z = -0.034;
  plane.renderOrder = 4;
  group.add(plane);

  const collectionMesh = new THREE.Mesh(
    createCollectionStackSideGeometry(side),
    material.clone(),
  );
  collectionMesh.visible = false;
  collectionMesh.position.z = -0.034;
  collectionMesh.renderOrder = 4;
  group.add(collectionMesh);

  const block = new THREE.Mesh(createStickerPageBlockGeometry(side), createStickerPageBlockMaterials());
  block.visible = false;
  block.renderOrder = 2;
  group.add(block);

  return { side, group, plane, collectionMesh, block, level: null, book: null };
}

function createStickerBookDepthLayer() {
  const group = new THREE.Group();
  const materials = createStickerBookDepthMaterials();
  const spineBase = new THREE.Mesh(
    new THREE.BoxGeometry(GUTTER * 0.5, PAGE_H * 0.9, STICKER_COVER_BOARD_DEPTH * 0.55, 1, 1, 1),
    materials.spineBase,
  );
  spineBase.position.set(0, 0, -STICKER_COVER_BOARD_DEPTH * 1.48);
  spineBase.renderOrder = 0;
  group.add(spineBase);

  const hingeRadius = PAGE_W * 0.0068;
  for (const side of [-1, 1]) {
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(hingeRadius, hingeRadius, PAGE_H * 0.9, 18, 1, false),
      materials.hinge,
    );
    hinge.position.set(side * GUTTER * 0.38, 0, -STICKER_COVER_BOARD_DEPTH * 1.04);
    hinge.scale.x = 0.7;
    hinge.renderOrder = 0;
    group.add(hinge);
  }

  group.visible = false;
  return { group, materials };
}

function createStickerBackCoverBoards() {
  const group = new THREE.Group();
  const materials = createStickerBackCoverMaterials();
  const geometry = createBackCoverBoardGeometry();
  const left = new THREE.Mesh(geometry, materials);
  const right = new THREE.Mesh(geometry, materials);
  left.renderOrder = 1;
  right.renderOrder = 1;
  group.add(left, right);
  group.visible = false;
  return { group, left, right, materials };
}

function createStickerBackCoverMaterials() {
  const hardware = stickerBookTheme(activeBook).coverHardware || stickerBookTheme("boy").coverHardware;
  return [
    new THREE.MeshStandardMaterial({
      color: hardware.board,
      roughness: 0.78,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
    new THREE.MeshStandardMaterial({
      color: hardware.boardShadow || hardware.spineDark,
      roughness: 0.84,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
  ];
}

function createBackCoverBoardGeometry() {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, 0, -PAGE_H / 2, PAGE_W, PAGE_H, PAGE_RADIUS);
  const geometry = createExtrudedShapeDepthGeometry(shape, STICKER_BACK_COVER_DEPTH);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function positionStickerBackCoverBoards(gap = currentBookGap()) {
  stickerBackCoverBoards.left.position.set(
    -PAGE_W - gap / 2,
    -stickerBackCoverPeekForSide("left"),
    STICKER_BACK_COVER_Z,
  );
  stickerBackCoverBoards.right.position.set(
    gap / 2,
    -stickerBackCoverPeekForSide("right"),
    STICKER_BACK_COVER_Z,
  );
}

function positionStickerBackCoverBoardForClosedCover() {
  stickerBackCoverBoards.right.position.set(
    COVER_CLOSED_X,
    -STICKER_BACK_COVER_PEEK_BY_LEVEL.full,
    STICKER_BACK_COVER_Z,
  );
}

function stickerBackCoverPeekForSide(side) {
  const pair = thicknessPairForSpread(spreadPosition);
  const level = side === "left" ? pair.left : pair.right;
  return STICKER_BACK_COVER_PEEK_BY_LEVEL[level] ?? STICKER_BACK_COVER_PEEK_BY_LEVEL.full;
}

function setStickerBackCoverVisible(visible, options = {}) {
  const enabled = visible && activeAlbumMode !== "collection";
  stickerBackCoverBoards.group.visible = enabled;
  stickerBackCoverBoards.left.visible = enabled && !options.rightOnly;
  stickerBackCoverBoards.right.visible = enabled;
}

function createStickerBookDepthMaterials() {
  const hardware = stickerBookTheme(activeBook).coverHardware || stickerBookTheme("boy").coverHardware;
  return {
    spineBase: new THREE.MeshStandardMaterial({
      color: hardware.spineDark,
      transparent: true,
      opacity: 0.36,
      roughness: 0.86,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    hinge: new THREE.MeshStandardMaterial({
      color: hardware.spine,
      transparent: true,
      opacity: 0.42,
      roughness: 0.68,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  };
}

function createStickerPageBlockMaterials() {
  const face = new THREE.MeshStandardMaterial({
    color: 0xfff4db,
    roughness: 0.96,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: 0xd9c69d,
    roughness: 0.98,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  return [face, edge];
}

function createStickerPageBlockGeometry(side) {
  const bindingSide = side === "left" ? "right" : "left";
  const shape = createStickerPageShape(bindingSide, false);
  const geometry = createExtrudedShapeDepthGeometry(shape, STICKER_PAGE_BLOCK_DEPTH);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCoverDepthLayer() {
  const group = new THREE.Group();
  const materials = createCoverDepthMaterials();
  const board = new THREE.Mesh(createCoverBoardDepthGeometry(), materials);
  board.renderOrder = 23;
  group.add(board);

  const spineLip = new THREE.Mesh(
    new THREE.CylinderGeometry(PAGE_W * 0.0105, PAGE_W * 0.0105, PAGE_H * 0.94, 24, 1, false),
    materials[1],
  );
  spineLip.position.set(PAGE_W * 0.018, 0, -STICKER_COVER_BOARD_DEPTH * 0.54);
  spineLip.scale.x = 0.72;
  spineLip.renderOrder = 24;
  group.add(spineLip);

  return { group, materials, board, spineLip };
}

function createCoverDepthMaterials() {
  const hardware = stickerBookTheme(activeBook).coverHardware || stickerBookTheme("boy").coverHardware;
  return [
    new THREE.MeshStandardMaterial({
      color: hardware.board,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
    new THREE.MeshStandardMaterial({
      color: hardware.spineDark,
      roughness: 0.72,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
  ];
}

function createCoverBoardDepthGeometry() {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, 0, -PAGE_H / 2, PAGE_W, PAGE_H, PAGE_RADIUS);
  const geometry = createExtrudedShapeDepthGeometry(shape, STICKER_COVER_BOARD_DEPTH);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createExtrudedShapeDepthGeometry(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 28,
    steps: 1,
  });
  geometry.translate(0, 0, -depth);
  geometry.computeVertexNormals();
  return geometry;
}

function createCollectionStackSideGeometry(side) {
  const xSegments = Math.max(24, COLLECTION_STACK_SEGMENTS_X);
  const ySegments = Math.max(8, COLLECTION_STACK_SEGMENTS_Y);
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
    const v = yIndex / ySegments;
    const localY = -THICKNESS_TEXTURE_H / 2 + v * THICKNESS_TEXTURE_H;
    const bottomWeight = (1 - v) ** 3.2;
    const spineVerticalDrop = 0.2 + 0.8 * (1 - v) ** 0.7;
    const depthVerticalCurve = 0.32 + 0.68 * Math.sin(v * Math.PI);

    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const u = xIndex / xSegments;
      const localX = -PAGE_W / 2 + u * PAGE_W;
      const textureU = side === "left"
        ? u * (1 - COLLECTION_STACK_INNER_U_CROP)
        : COLLECTION_STACK_INNER_U_CROP + u * (1 - COLLECTION_STACK_INNER_U_CROP);
      const spineProximity = side === "left" ? u : 1 - u;
      const spineEase = smootherstep(spineProximity);
      const innerBottomWidthStart = 1 - COLLECTION_STACK_INNER_BOTTOM_WIDTH;
      const innerBottomWidth = smootherstep(
        (spineProximity - innerBottomWidthStart) / COLLECTION_STACK_INNER_BOTTOM_WIDTH,
      );
      const innerBottomRows = smootherstep(
        (COLLECTION_STACK_INNER_BOTTOM_ROWS - v) / COLLECTION_STACK_INNER_BOTTOM_ROWS,
      );
      const innerBottomEdge = smootherstep(
        (COLLECTION_STACK_INNER_BOTTOM_EDGE_ROWS - v) / COLLECTION_STACK_INNER_BOTTOM_EDGE_ROWS,
      );
      const innerBottomRound = innerBottomWidth * innerBottomRows;
      const innerBottomEdgeBias = 0.35 + innerBottomEdge * 0.65;
      const innerSideDirection = side === "left" ? 1 : -1;
      const subtleEdgeWave =
        Math.sin(u * Math.PI * 2.15 + (side === "left" ? 0.35 : 1.05)) +
        Math.sin(u * Math.PI * 4.4 + (side === "left" ? 1.7 : 0.5)) * 0.38;
      const ribbonBow = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * PAGE_H * 0.0018;
      const yDrop = COLLECTION_STACK_SPINE_DROP * spineEase * spineVerticalDrop;
      const zSink = COLLECTION_STACK_SPINE_DEPTH * spineEase * depthVerticalCurve;
      const yWave = COLLECTION_STACK_BOTTOM_WAVE * subtleEdgeWave * bottomWeight;
      const xRound =
        innerSideDirection * COLLECTION_STACK_INNER_BOTTOM_TAPER * innerBottomRound * innerBottomEdgeBias;
      const yRound = COLLECTION_STACK_INNER_BOTTOM_LIFT * innerBottomRound * innerBottomEdgeBias;
      const zRound = COLLECTION_STACK_INNER_BOTTOM_DEPTH * innerBottomRound * innerBottomEdgeBias;

      positions.push(localX + xRound, localY - yDrop + yWave + yRound, ribbonBow - zSink - zRound);
      uvs.push(textureU, v);
    }
  }

  for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const a = yIndex * (xSegments + 1) + xIndex;
      const b = a + 1;
      const c = a + (xSegments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCoverThicknessLayer() {
  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(PAGE_W, THICKNESS_TEXTURE_H),
    new THREE.MeshBasicMaterial({
      map: getTexture(thicknessFileFor("right", "full")),
      transparent: true,
      opacity: DEFAULT_COVER_TUNING.coverStackOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  plane.position.z = -0.015;
  plane.renderOrder = 24;
  group.add(plane);

  return { group, plane, book: null };
}

function createCover3DRingLayer() {
  const group = new THREE.Group();
  const hardware = stickerBookTheme(activeBook).coverHardware;
  const materials = {
    ring: new THREE.MeshStandardMaterial({
      color: hardware.ring,
      emissive: 0x34230e,
      emissiveIntensity: 0.018,
      roughness: 0.24,
      metalness: 0.62,
      depthWrite: true,
    }),
    highlight: new THREE.MeshBasicMaterial({
      color: hardware.ringHighlight,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
    eyelet: new THREE.MeshStandardMaterial({
      color: hardware.ring,
      emissive: 0x3b2a12,
      emissiveIntensity: 0.016,
      roughness: 0.22,
      metalness: 0.58,
      depthWrite: true,
    }),
    socketWall: new THREE.MeshStandardMaterial({
      color: 0x050403,
      roughness: 0.5,
      metalness: 0.12,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
    socketBack: new THREE.MeshBasicMaterial({
      color: 0x020201,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
    eyeletShadow: new THREE.MeshBasicMaterial({
      color: 0x1a1008,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  };

  for (const pixelY of STICKER_COVER_3D_RING_PIXELS) {
    const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
    const shadow = new THREE.Mesh(createCover3DEyeletShadowGeometry(), materials.eyeletShadow);
    shadow.position.set(
      STICKER_COVER_3D_RING_ANCHOR_X + PAGE_W * 0.002,
      y - PAGE_H * 0.002,
      STICKER_COVER_3D_RING_FRONT_Z - PAGE_H * 0.0015,
    );
    shadow.renderOrder = 84;
    group.add(shadow);

    const socketWall = new THREE.Mesh(createCover3DSocketWallGeometry(), materials.socketWall);
    socketWall.position.set(STICKER_COVER_3D_RING_ANCHOR_X, y, STICKER_COVER_3D_RING_FRONT_Z - STICKER_COVER_3D_SOCKET_DEPTH * 0.32);
    socketWall.renderOrder = 85;
    group.add(socketWall);

    const socketBack = new THREE.Mesh(createCover3DSocketBackGeometry(), materials.socketBack);
    socketBack.position.set(STICKER_COVER_3D_RING_ANCHOR_X, y, STICKER_COVER_3D_RING_FRONT_Z - STICKER_COVER_3D_SOCKET_DEPTH * 0.72);
    socketBack.renderOrder = 85;
    group.add(socketBack);

    const eyelet = new THREE.Mesh(createCover3DEyeletGeometry(), materials.eyelet);
    eyelet.position.set(STICKER_COVER_3D_RING_ANCHOR_X, y, STICKER_COVER_3D_RING_FRONT_Z + PAGE_H * 0.0005);
    eyelet.renderOrder = 86;
    group.add(eyelet);

    const ring = new THREE.Mesh(createCover3DRingGeometry(), materials.ring);
    ring.position.set(STICKER_COVER_3D_RING_ANCHOR_X - STICKER_COVER_3D_RING_REACH * 0.5, y, STICKER_COVER_3D_RING_FRONT_Z);
    ring.renderOrder = 87;
    group.add(ring);

    const highlight = new THREE.Mesh(createCover3DRingHighlightGeometry(), materials.highlight);
    highlight.position.set(
      STICKER_COVER_3D_RING_ANCHOR_X - STICKER_COVER_3D_RING_REACH * 0.5,
      y + PAGE_H * 0.002,
      STICKER_COVER_3D_RING_FRONT_Z + PAGE_H * 0.006,
    );
    highlight.renderOrder = 88;
    group.add(highlight);
  }

  group.visible = false;
  return { group, materials };
}

function createCover3DEyeletGeometry() {
  const geometry = new THREE.TorusGeometry(
    STICKER_COVER_3D_EYELET_RADIUS,
    STICKER_COVER_3D_EYELET_TUBE,
    10,
    32,
  );
  return geometry;
}

function createCover3DSocketWallGeometry() {
  const geometry = new THREE.CylinderGeometry(
    STICKER_COVER_3D_EYELET_HOLE,
    STICKER_COVER_3D_EYELET_HOLE,
    STICKER_COVER_3D_SOCKET_DEPTH,
    32,
    1,
    true,
  );
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createCover3DSocketBackGeometry() {
  return new THREE.CircleGeometry(STICKER_COVER_3D_EYELET_HOLE * 0.9, 32);
}

function createCover3DEyeletShadowGeometry() {
  return new THREE.CircleGeometry(STICKER_COVER_3D_EYELET_RADIUS + STICKER_COVER_3D_EYELET_TUBE * 1.4, 32);
}

function createCover3DRingGeometry() {
  const geometry = new THREE.TorusGeometry(
    STICKER_COVER_3D_RING_REACH * 0.5,
    PAGE_W * 0.0072,
    16,
    72,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.scale(1, 1, STICKER_COVER_3D_RING_DEPTH_SCALE);
  return geometry;
}

function createCover3DRingHighlightGeometry() {
  const geometry = new THREE.TorusGeometry(
    STICKER_COVER_3D_RING_REACH * 0.5,
    PAGE_W * 0.0013,
    6,
    72,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.scale(0.94, 1, STICKER_COVER_3D_RING_DEPTH_SCALE * 0.72);
  return geometry;
}

function createCoverHardwareLayer() {
  const group = new THREE.Group();
  const hardware = stickerBookTheme(activeBook).coverHardware;
  const materials = {
    backBoard: new THREE.MeshStandardMaterial({
      color: hardware.board,
      roughness: 0.86,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
    spinePlate: new THREE.MeshStandardMaterial({
      color: hardware.spine,
      transparent: true,
      opacity: 0.78,
      roughness: 0.48,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    spineEdge: new THREE.MeshStandardMaterial({
      color: hardware.spineDark,
      roughness: 0.4,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    spineHighlight: new THREE.MeshBasicMaterial({
      color: hardware.spineHighlight,
      transparent: true,
      opacity: 0.23,
      depthWrite: false,
    }),
    ring: new THREE.MeshStandardMaterial({
      color: hardware.ring,
      emissive: 0x2e210e,
      emissiveIntensity: 0.028,
      roughness: 0.38,
      metalness: 0.0,
      depthWrite: false,
    }),
    ringHighlight: new THREE.MeshBasicMaterial({
      color: hardware.ringHighlight,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  };

  const backBoard = new THREE.Mesh(createCoverBackBoardGeometry(), materials.backBoard);
  backBoard.position.set(COVER_CLOSED_X + 0.035, -0.045, -0.05);
  backBoard.renderOrder = 20;
  group.add(backBoard);

  const spineEdge = new THREE.Mesh(
    new THREE.CylinderGeometry(PAGE_W * 0.016, PAGE_W * 0.016, PAGE_H * 0.94, 28, 1, false),
    materials.spineEdge,
  );
  spineEdge.position.set(COVER_CLOSED_X + PAGE_W * 0.004, 0, 0.108);
  spineEdge.scale.set(0.54, 1, 1.12);
  spineEdge.renderOrder = 43;
  group.add(spineEdge);

  const coverRingPixels = [218, 452, 686, 920, 1154, 1388];
  for (const pixelY of coverRingPixels) {
    const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
    const ring = new THREE.Mesh(createCoverSideRingGeometry(y), materials.ring);
    ring.renderOrder = 46;
    group.add(ring);

    const highlight = new THREE.Mesh(createCoverSideRingHighlightGeometry(y), materials.ringHighlight);
    highlight.renderOrder = 47;
    group.add(highlight);
  }

  return { group, materials };
}

function createCoverBackBoardGeometry() {
  const shape = new THREE.Shape();
  addRoundedRectPath(
    shape,
    -PAGE_W * 0.012,
    -PAGE_H / 2 - PAGE_H * 0.012,
    PAGE_W * 1.024,
    PAGE_H * 1.024,
    PAGE_RADIUS * 1.04,
  );
  const geometry = new THREE.ShapeGeometry(shape, 28);
  geometry.computeVertexNormals();
  return geometry;
}

function createCoverSpinePlateGeometry() {
  const width = PAGE_W * 0.17;
  const height = PAGE_H * 0.92;
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, -width / 2, -height / 2, width, height, width * 0.42);
  const geometry = new THREE.ShapeGeometry(shape, 20);
  geometry.computeVertexNormals();
  return geometry;
}

function createCoverSideRingGeometry(baseY) {
  const points = [];
  const anchorX = COVER_CLOSED_X + PAGE_W * 0.065;
  const reach = PAGE_W * 0.08;
  for (let i = 0; i <= 22; i += 1) {
    const t = i / 22;
    const arch = Math.sin(t * Math.PI);
    points.push(new THREE.Vector3(
      anchorX - arch * reach,
      baseY,
      0.155 + Math.cos(t * Math.PI) * 0.06,
    ));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, PAGE_W * 0.0062, 10, false);
}

function createCoverSideRingHighlightGeometry(baseY) {
  const points = [];
  const anchorX = COVER_CLOSED_X + PAGE_W * 0.064;
  const reach = PAGE_W * 0.066;
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    const arch = Math.sin(t * Math.PI);
    points.push(new THREE.Vector3(
      anchorX - arch * reach,
      baseY + PAGE_H * 0.0025,
      0.174 + Math.cos(t * Math.PI) * 0.047,
    ));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, PAGE_W * 0.0012, 6, false);
}

function createCollectionStackBlock() {
  const group = new THREE.Group();
  const width = PAGE_W * 2 + PAGE_H * 0.16;
  const height = (width / selectedZukanThickness.aspect) * ZUKAN_THICKNESS_DISPLAY_SCALE_Y;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: getTexture(selectedZukanThickness.file),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  plane.position.z = -0.038;
  plane.renderOrder = 3;
  group.add(plane);

  return { group, plane, width, height, book: null };
}

function createFlutterPages() {
  const group = new THREE.Group();
  group.visible = false;
  const pages = [];

  for (let i = 0; i < FLUTTER_PAGE_MAX_COUNT; i += 1) {
    const shell = new THREE.Group();
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: getTexture(BOOK_VARIANTS[activeBook].insideRight),
      transparent: true,
      opacity: 0,
      side: THREE.FrontSide,
      depthWrite: false,
      roughness: 0.92,
      metalness: 0.0,
    });
    const backMaterial = new THREE.MeshStandardMaterial({
      map: getTexture(SHARED_TEXTURES.pageBack),
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0.0,
    });
    const geometry = createFlutterPageGeometry();
    const front = new THREE.Mesh(geometry, frontMaterial);
    const back = new THREE.Mesh(geometry, backMaterial);
    front.position.z = 0.003;
    back.position.z = -0.003;
    front.renderOrder = 26 + i;
    back.renderOrder = 25 + i;
    shell.add(back);
    shell.add(front);
    group.add(shell);
    pages.push({ shell, geometry, frontMaterial, backMaterial });
  }

  return { group, pages };
}

function createFlutterPageGeometry() {
  const geometry = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 28, 18);
  geometry.translate(PAGE_W / 2, 0, 0);
  prepareBendGeometry(geometry);
  return geometry;
}

function prepareBendGeometry(geometry) {
  if (!geometry.userData.basePositions) {
    geometry.userData.basePositions = Float32Array.from(geometry.attributes.position.array);
  }
}

function bendPageGeometry(geometry, progress, bendAmount) {
  const positions = geometry.attributes.position;
  const base = geometry.userData.basePositions;
  if (!base) {
    return;
  }

  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const turn = Math.sin(p * Math.PI);
  const side = p < 0.5 ? 1 : -1;
  for (let i = 0; i < positions.count; i += 1) {
    const index = i * 3;
    const x = base[index];
    const y = base[index + 1];
    const z = base[index + 2];
    const u = THREE.MathUtils.clamp(x / PAGE_W, 0, 1);
    const yN = THREE.MathUtils.clamp((y + PAGE_H / 2) / PAGE_H, 0, 1) - 0.5;
    const crossCurve = Math.sin(u * Math.PI);
    const edgePull = u * (1 - u);
    const freeEdgeCurl = u * u;
    const flutterRipple = Math.sin((u * 2.6 + yN * 0.7 + p * 1.8) * Math.PI);

    positions.setXYZ(
      i,
      x - freeEdgeCurl * bendAmount * turn * 0.08,
      y + yN * edgePull * bendAmount * 0.18,
      z +
        side * crossCurve * bendAmount * turn +
        side * freeEdgeCurl * bendAmount * turn * 0.36 +
        flutterRipple * edgePull * bendAmount * 0.12,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function updateStackThickness(options = {}) {
  if (options.coverOpening) {
    hideStackThickness();
    return;
  }

  if (activeAlbumMode === "collection") {
    pageStacks.collection.group.visible = false;
    pageStacks.left.group.visible = true;
    pageStacks.right.group.visible = true;
    const pair = thicknessPairForSpread(spreadPosition);
    const tuning = visibleLayerTuning(getCurrentLayerTuning());
    positionStackSide(pageStacks.left, pair.left, tuning);
    positionStackSide(pageStacks.right, pair.right, tuning);
    return;
  }

  pageStacks.collection.group.visible = false;
  pageStacks.left.group.visible = true;
  pageStacks.right.group.visible = true;
  const pair = thicknessPairForSpread(spreadPosition);
  const tuning = visibleLayerTuning(getCurrentLayerTuning());
  positionStackSide(pageStacks.left, pair.left, tuning);
  positionStackSide(pageStacks.right, pair.right, tuning);
}

function visibleLayerTuning(tuning) {
  if (tuningEnabled) {
    return tuning;
  }
  return {
    ...tuning,
    stackLeftY: Math.min(tuning.stackLeftY, 0.68),
    stackRightY: Math.min(tuning.stackRightY, 0.68),
  };
}

function thicknessPairForSpread(spread) {
  const openedAmount = THREE.MathUtils.clamp(spread, 0, 1);
  const left = thicknessLevelForAmount(openedAmount);
  const right = thicknessLevelForAmount(1 - openedAmount);
  return {
    left,
    right,
    key: `${left}-${right}`,
  };
}

function thicknessLevelForAmount(amount) {
  if (amount < 0.08) {
    return "empty";
  }
  if (amount < 0.35) {
    return "small";
  }
  if (amount < 0.65) {
    return "half";
  }
  if (amount < 0.92) {
    return "mostly";
  }
  return "full";
}

function thicknessFileFor(side, level) {
  const assetLevel = THICKNESS_LEVEL_NAMES.includes(level) ? level : "full";
  const thicknessBook = BOOK_VARIANTS[activeBook]?.thicknessKey || activeBook;
  return `sb3d_${thicknessBook}_page_thickness_${side}_${assetLevel}.webp`;
}

function positionStackSide(stack, level, tuning) {
  if (stack.level !== level || stack.book !== activeBook) {
    const textureFile = thicknessFileFor(stack.side, level);
    assignTexture(stack.plane, textureFile);
    assignTexture(stack.collectionMesh, textureFile);
    stack.level = level;
    stack.book = activeBook;
  }

  const isCollection = activeAlbumMode === "collection";
  stack.plane.visible = !isCollection && level !== "empty";
  stack.collectionMesh.visible = isCollection && level !== "empty";
  stack.block.visible = !isCollection && level !== "empty";
  const tunePrefix = stack.side === "left" ? "stackLeft" : "stackRight";
  const scaleX = tuning[`${tunePrefix}ScaleX`];
  const scaleY = tuning[`${tunePrefix}ScaleY`];

  const isLeft = stack.side === "left";
  const stackSpineOverlap = isCollection ? 0 : STICKER_STACK_SPINE_OVERLAP;
  const stackWidthScale = (PAGE_W + stackSpineOverlap) / PAGE_W;
  const stackScaleX = scaleX * stackWidthScale;
  stack.plane.scale.set(stackScaleX, scaleY, 1);
  stack.collectionMesh.scale.set(stackScaleX, scaleY, 1);

  const gap = currentBookGap();
  const pageLeft = isLeft ? -PAGE_W - gap / 2 : gap / 2;
  const pageRight = isLeft ? -gap / 2 : PAGE_W + gap / 2;
  const pageCenter = (pageLeft + pageRight) / 2;
  const scaledTextureH = THICKNESS_TEXTURE_H * scaleY;
  const topY = -PAGE_H / 2 + THICKNESS_OVERLAP + tuning[`${tunePrefix}Y`];
  const stackCenterInset = stackSpineOverlap / 2 * (isLeft ? 1 : -1);
  const x = pageCenter + stackCenterInset + tuning[`${tunePrefix}X`];
  const y = topY - scaledTextureH / 2;
  stack.plane.position.set(x, y, -0.034);
  stack.collectionMesh.position.set(x, y, -0.034);
  const blockDepthScale = STICKER_PAGE_BLOCK_DEPTH_SCALE[level] ?? STICKER_PAGE_BLOCK_DEPTH_SCALE.full;
  stack.block.scale.set(stackWidthScale, 1, blockDepthScale);
  stack.block.position.set(pageLeft - (isLeft ? 0 : stackSpineOverlap), 0, STICKER_PAGE_BLOCK_TOP_Z);
}

function hideStackThickness() {
  pageStacks.collection.group.visible = false;
  pageStacks.left.group.visible = false;
  pageStacks.right.group.visible = false;
}

function applyCoverTuning() {
  if (coverThickness.book !== activeBook) {
    assignTexture(coverThickness.plane, thicknessFileFor("right", "full"));
    coverThickness.book = activeBook;
  }

  coverThickness.plane.visible = coverTuning.coverStackOpacity > 0;
  coverThickness.plane.material.opacity = coverTuning.coverStackOpacity;
  coverThickness.plane.scale.set(coverTuning.coverStackScaleX, coverTuning.coverStackScaleY, 1);

  const scaledTextureH = THICKNESS_TEXTURE_H * coverTuning.coverStackScaleY;
  const topY = -PAGE_H / 2 + THICKNESS_OVERLAP + coverTuning.coverStackY;
  coverThickness.plane.position.set(
    COVER_CLOSED_X + PAGE_W / 2 + coverTuning.coverStackX,
    topY - scaledTextureH / 2,
    -0.015,
  );

  coverBackground.visible = coverTuning.coverBgOpacity > 0;
  coverBackground.material.opacity = coverTuning.coverBgOpacity;
  coverBackground.scale.set(coverTuning.coverBgScaleX, coverTuning.coverBgScaleY, 1);
  coverBackground.position.set(COVER_CLOSED_X, 0, -0.08);
  coverHardware.group.visible = shouldShowCoverHardware();
  updateStickerDepthModeVisibility();
}

function applyCoverHardwareTheme() {
  const hardware = stickerBookTheme(activeBook).coverHardware || stickerBookTheme("boy").coverHardware;
  const materials = coverHardware.materials;
  materials.backBoard.color.setHex(hardware.board);
  materials.spinePlate.color.setHex(hardware.spine);
  materials.spineEdge.color.setHex(hardware.spineDark);
  materials.spineHighlight.color.setHex(hardware.spineHighlight);
  materials.ring.color.setHex(hardware.ring);
  materials.ringHighlight.color.setHex(hardware.ringHighlight);
  for (const material of Object.values(materials)) {
    material.needsUpdate = true;
  }
  coverHardware.group.visible = shouldShowCoverHardware();
  applyStickerDepthTheme(hardware);
  applyCover3DRingTheme(hardware);
  updateStickerDepthModeVisibility();
}

function applyCover3DRingTheme(hardware) {
  for (const layer of [closedCoverRings, coverTurnRings]) {
    layer.materials.ring.color.setHex(hardware.ring);
    layer.materials.ring.emissive.setHex(0x34230e);
    layer.materials.highlight.color.setHex(hardware.ringHighlight);
    layer.materials.eyelet.color.setHex(hardware.ring);
    layer.materials.eyelet.emissive.setHex(0x3b2a12);
    layer.materials.socketWall.color.setHex(0x050403);
    layer.materials.socketBack.color.setHex(0x020201);
    layer.materials.ring.needsUpdate = true;
    layer.materials.highlight.needsUpdate = true;
    layer.materials.eyelet.needsUpdate = true;
    layer.materials.socketWall.needsUpdate = true;
    layer.materials.socketBack.needsUpdate = true;
  }
}

function applyStickerDepthTheme(hardware) {
  for (const layer of [closedCoverDepth, coverTurnDepth]) {
    layer.materials[0].color.setHex(hardware.board);
    layer.materials[1].color.setHex(hardware.spineDark);
    for (const material of layer.materials) {
      material.needsUpdate = true;
    }
  }
  stickerBookDepth.materials.spineBase.color.setHex(hardware.spineDark);
  stickerBookDepth.materials.hinge.color.setHex(hardware.spine);
  stickerBookDepth.materials.spineBase.needsUpdate = true;
  stickerBookDepth.materials.hinge.needsUpdate = true;
  stickerBackCoverBoards.materials[0].color.setHex(hardware.board);
  stickerBackCoverBoards.materials[1].color.setHex(hardware.boardShadow || hardware.spineDark);
  stickerBackCoverBoards.materials[0].needsUpdate = true;
  stickerBackCoverBoards.materials[1].needsUpdate = true;
}

function updateStickerDepthModeVisibility() {
  const isStickerAlbum = activeAlbumMode !== "collection";
  closedCoverDepth.group.visible = isStickerAlbum;
  coverTurnDepth.group.visible = isStickerAlbum;
  closedCoverRings.group.visible = isStickerAlbum;
  coverTurnRings.group.visible = isStickerAlbum;
  if (!isStickerAlbum) {
    stickerBookDepth.group.visible = false;
    stickerBackCoverBoards.group.visible = false;
  }
}

function setStickerBookDepthVisible(visible) {
  updateStickerDepthModeVisibility();
  stickerBookDepth.group.visible = visible && activeAlbumMode !== "collection";
}

function positionCollectionStackBlock() {
  pageStacks.left.group.visible = false;
  pageStacks.right.group.visible = false;
  pageStacks.collection.group.visible = true;

  const topY = -PAGE_H / 2 + PAGE_H * 0.05;
  const centerY = topY - pageStacks.collection.height / 2;
  pageStacks.collection.plane.scale.set(1, 1, 1);
  pageStacks.collection.plane.position.set(0, centerY, -0.052);
}

function updateFlutterPageTextures() {
  for (const page of flutterPages.pages) {
    page.frontMaterial.map = getPageTemplateTexture("right");
    page.frontMaterial.needsUpdate = true;
    page.backMaterial.map = getPageTemplateTexture("left");
    page.backMaterial.needsUpdate = true;
  }
}

function createBendablePageSurfaceGeometry(bindingSide) {
  return createCurvedStickerPageSurfaceGeometry(bindingSide);
}

function createBendablePlainPageSurfaceGeometry() {
  const baseGeometry = createCollectionPageSurfaceGeometry("left");
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  return subdivided;
}

function createCurvedStickerPageSurfaceGeometry(bindingSide) {
  const baseGeometry = createPageSurfaceGeometry(bindingSide);
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  curveStickerPageGeometry(subdivided, bindingSide);
  return subdivided;
}

function createCurvedCollectionPageSurfaceGeometry(bindingSide) {
  const baseGeometry = createCollectionPageSurfaceGeometry(bindingSide);
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  curveCollectionPageGeometry(subdivided, bindingSide);
  return subdivided;
}

function curveStickerPageGeometry(geometry, bindingSide) {
  const positions = geometry.attributes.position;
  const sideSign = bindingSide === "right" ? -1 : 1;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const u = THREE.MathUtils.clamp(x / PAGE_W, 0, 1);
    const v = THREE.MathUtils.clamp((y + PAGE_H / 2) / PAGE_H, 0, 1);
    const middle = Math.sin(v * Math.PI);
    const verticalFade = smootherstep(v / 0.1) * smootherstep((1 - v) / 0.1);
    const verticalFold = verticalFade * (0.74 + 0.26 * Math.pow(middle, 0.7));
    const spineDistance = bindingSide === "right" ? PAGE_W - x : x;
    const freeDistance = bindingSide === "right" ? x : PAGE_W - x;
    const spineT = 1 - THREE.MathUtils.clamp(spineDistance / STICKER_PAGE_SPINE_CURVE_WIDTH, 0, 1);
    const freeT = 1 - THREE.MathUtils.clamp(freeDistance / STICKER_PAGE_FREE_CURVE_WIDTH, 0, 1);
    const spineFold = smootherstep(spineT);
    const freeLift = smootherstep(freeT) * verticalFade;
    const centerRaise =
      Math.sin(u * Math.PI) *
      Math.pow(Math.max(0, middle), 0.68) *
      verticalFade *
      STICKER_PAGE_CENTER_RAISE;
    positions.setXYZ(
      i,
      x + sideSign * spineFold * STICKER_PAGE_SPINE_PULL * verticalFold,
      y,
      z + centerRaise + freeLift * STICKER_PAGE_FREE_EDGE_LIFT - spineFold * STICKER_PAGE_SPINE_DIP * verticalFold,
    );
  }

  positions.needsUpdate = true;
  smoothGeometryNormalsByPosition(geometry);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function smoothGeometryNormalsByPosition(geometry) {
  geometry.computeVertexNormals();
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  if (!positions || !normals) {
    return;
  }

  const normalByPosition = new Map();
  for (let i = 0; i < positions.count; i += 1) {
    const key = [
      Math.round(positions.getX(i) * 10000),
      Math.round(positions.getY(i) * 10000),
      Math.round(positions.getZ(i) * 10000),
    ].join(":");
    let normal = normalByPosition.get(key);
    if (!normal) {
      normal = new THREE.Vector3();
      normalByPosition.set(key, normal);
    }
    normal.x += normals.getX(i);
    normal.y += normals.getY(i);
    normal.z += normals.getZ(i);
  }

  for (const normal of normalByPosition.values()) {
    normal.normalize();
  }
  for (let i = 0; i < positions.count; i += 1) {
    const key = [
      Math.round(positions.getX(i) * 10000),
      Math.round(positions.getY(i) * 10000),
      Math.round(positions.getZ(i) * 10000),
    ].join(":");
    const normal = normalByPosition.get(key);
    if (normal) {
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
  }
  normals.needsUpdate = true;
}

function curveCollectionPageGeometry(geometry, bindingSide) {
  const positions = geometry.attributes.position;
  const sideSign = bindingSide === "right" ? -1 : 1;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const spineDistance = bindingSide === "right" ? PAGE_W - x : x;
    const spineT = 1 - THREE.MathUtils.clamp(spineDistance / COLLECTION_PAGE_SPINE_CURVE_WIDTH, 0, 1);
    const fold = spineT * spineT * (3 - 2 * spineT);
    const v = THREE.MathUtils.clamp((y + PAGE_H / 2) / PAGE_H, 0, 1);
    const middle = Math.sin(v * Math.PI);
    const edgeFade = smootherstep(v / 0.18) * smootherstep((1 - v) / 0.1);
    const verticalFold = edgeFade * (0.78 + 0.22 * Math.pow(middle, 0.72));
    const pull = fold * COLLECTION_PAGE_SPINE_PULL * verticalFold;
    const dip = fold * COLLECTION_PAGE_SPINE_DIP * verticalFold;

    positions.setXYZ(
      i,
      x + sideSign * pull,
      y,
      z - dip,
    );
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function createCollectionFoldGeometry() {
  const width = COLLECTION_FOLD_W;
  const half = width / 2;
  const xSegments = 32;
  const ySegments = 88;
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let yi = 0; yi <= ySegments; yi += 1) {
    const v = yi / ySegments;
    const y = -PAGE_H / 2 + PAGE_H * v;
    const middle = Math.sin(v * Math.PI);
    const vertical = smootherstep(v / 0.07) * smootherstep((1 - v) / 0.07) * (0.88 + 0.12 * Math.pow(middle, 0.6));
    for (let xi = 0; xi <= xSegments; xi += 1) {
      const u = xi / xSegments;
      const x = -half + width * u;
      const normalized = Math.abs(x / half);
      const valley = smootherstep(1 - normalized);
      const shoulder = Math.pow(normalized, 1.35);
      const z = shoulder * PAGE_H * 0.006 - valley * COLLECTION_FOLD_DEPTH * vertical;
      vertices.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let yi = 0; yi < ySegments; yi += 1) {
    for (let xi = 0; xi < xSegments; xi += 1) {
      const a = yi * (xSegments + 1) + xi;
      const b = a + 1;
      const c = a + xSegments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function subdivideBendableGeometry(source) {
  const positions = source.attributes.position;
  const sourceUvs = source.attributes.uv;
  const vertices = [];
  const uvs = [];
  const indices = [];
  const maxSegment = PAGE_H / 8;
  const maxDepth = 3;

  for (let i = 0; i < positions.count; i += 3) {
    const a = readGeometryPoint(positions, sourceUvs, i);
    const b = readGeometryPoint(positions, sourceUvs, i + 1);
    const c = readGeometryPoint(positions, sourceUvs, i + 2);
    addSubdividedTriangle(vertices, uvs, indices, a, b, c, maxSegment, maxDepth);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function readGeometryPoint(positions, uvs, index) {
  return {
    position: new THREE.Vector3(positions.getX(index), positions.getY(index), positions.getZ(index)),
    uv: new THREE.Vector2(uvs.getX(index), uvs.getY(index)),
  };
}

function addSubdividedTriangle(vertices, uvs, indices, a, b, c, maxSegment, depth) {
  const maxEdge = Math.max(
    a.position.distanceTo(b.position),
    b.position.distanceTo(c.position),
    c.position.distanceTo(a.position),
  );

  if (depth <= 0 || maxEdge <= maxSegment) {
    const start = vertices.length / 3;
    for (const point of [a, b, c]) {
      vertices.push(point.position.x, point.position.y, point.position.z);
      uvs.push(point.uv.x, point.uv.y);
    }
    indices.push(start, start + 1, start + 2);
    return;
  }

  const ab = midpointGeometryPoint(a, b);
  const bc = midpointGeometryPoint(b, c);
  const ca = midpointGeometryPoint(c, a);
  addSubdividedTriangle(vertices, uvs, indices, a, ab, ca, maxSegment, depth - 1);
  addSubdividedTriangle(vertices, uvs, indices, ab, b, bc, maxSegment, depth - 1);
  addSubdividedTriangle(vertices, uvs, indices, ca, bc, c, maxSegment, depth - 1);
  addSubdividedTriangle(vertices, uvs, indices, ab, bc, ca, maxSegment, depth - 1);
}

function midpointGeometryPoint(a, b) {
  return {
    position: new THREE.Vector3().addVectors(a.position, b.position).multiplyScalar(0.5),
    uv: new THREE.Vector2().addVectors(a.uv, b.uv).multiplyScalar(0.5),
  };
}

function createStickerPageShape(bindingSide, includeHoles = true) {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, 0, -PAGE_H / 2, PAGE_W, PAGE_H, PAGE_RADIUS);

  if (includeHoles) {
    const holeX = bindingSide === "left" ? PAGE_HOLE_X : PAGE_W - PAGE_HOLE_X;
    for (const pixelY of PAGE_RING_PIXELS) {
      const hole = new THREE.Path();
      const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
      hole.absellipse(holeX, y, PAGE_HOLE_RX, PAGE_HOLE_RY, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  return shape;
}

function createPageSurfaceGeometry(bindingSide) {
  const shape = createStickerPageShape(bindingSide, false);
  const geometry = new THREE.ShapeGeometry(shape, 28);
  const positions = geometry.attributes.position;
  const uvs = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    uvs.push(x / PAGE_W, (y + PAGE_H / 2) / PAGE_H);
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createCoverSurfaceGeometry() {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, 0, -PAGE_H / 2, PAGE_W, PAGE_H, PAGE_RADIUS);
  const geometry = new THREE.ShapeGeometry(shape, 28);
  const positions = geometry.attributes.position;
  const uvs = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    uvs.push(x / PAGE_W, (y + PAGE_H / 2) / PAGE_H);
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function mirrorGeometryUvX(geometry) {
  const uv = geometry?.attributes?.uv;
  if (!uv) {
    return geometry;
  }
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, 1 - uv.getX(index));
  }
  uv.needsUpdate = true;
  return geometry;
}

function createCollectionPageSurfaceGeometry(bindingSide) {
  const shape = new THREE.Shape();
  addOuterRoundedPagePath(shape, bindingSide);
  const geometry = new THREE.ShapeGeometry(shape, 28);
  const positions = geometry.attributes.position;
  const uvs = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    uvs.push(x / PAGE_W, (y + PAGE_H / 2) / PAGE_H);
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function addOuterRoundedPagePath(shape, bindingSide) {
  const x = 0;
  const y = -PAGE_H / 2;
  const width = PAGE_W;
  const height = PAGE_H;
  const r = Math.min(PAGE_RADIUS, width / 2, height / 2);
  if (bindingSide === "left") {
    shape.moveTo(x, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x, y + height);
    shape.lineTo(x, y);
    return;
  }
  shape.moveTo(x + r, y);
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}

function addRoundedRectPath(shape, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}

function createHalfRingMeshes() {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: BINDING_RING_BODY_COLOR,
    emissive: 0x1f1c16,
    emissiveIntensity: 0.008,
    roughness: 0.66,
    metalness: 0.14,
    transparent: true,
    opacity: 0.9,
    depthTest: true,
    depthWrite: false,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff5d7,
    transparent: true,
    opacity: 0.34,
    depthTest: true,
    depthWrite: false,
  });

  for (let index = 0; index < PAGE_RING_PIXELS.length; index += 1) {
    const pixelY = PAGE_RING_PIXELS[index];
    const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
    const curveScale = bindingRingCurveScale(index);
    const ring = new THREE.Mesh(createHalfRingTubeGeometry(y, curveScale), ringMaterial);
    ring.renderOrder = 72;
    group.add(ring);

    const highlight = new THREE.Mesh(createHalfRingHighlightGeometry(y, curveScale), highlightMaterial);
    highlight.renderOrder = 73;
    group.add(highlight);
  }

  group.userData.ringMaterial = ringMaterial;
  group.userData.highlightMaterial = highlightMaterial;
  return group;
}

function bindingRingCurveScale(index) {
  return index === 0 ? 0.9 : 1;
}

function createHalfRingTubeGeometry(baseY, curveScale = 1) {
  const points = [];
  for (const [x, yOffset, z] of [
    [-BINDING_RING_ENDPOINT_X, 0, BINDING_RING_ENDPOINT_Z],
    [-BINDING_RING_HOLE_X, 0, BINDING_RING_HOLE_Z],
    [-BINDING_RING_HOLE_X * 0.68, BINDING_RING_ARCH_Y * 0.45, BINDING_RING_ARCH_Z * 0.45 * curveScale],
    [-BINDING_RING_HOLE_X * 0.42, BINDING_RING_ARCH_Y, BINDING_RING_ARCH_Z * 0.82 * curveScale],
    [0, BINDING_RING_ARCH_Y, BINDING_RING_ARCH_Z * curveScale],
    [BINDING_RING_HOLE_X * 0.42, BINDING_RING_ARCH_Y, BINDING_RING_ARCH_Z * 0.82 * curveScale],
    [BINDING_RING_HOLE_X * 0.68, BINDING_RING_ARCH_Y * 0.45, BINDING_RING_ARCH_Z * 0.45 * curveScale],
    [BINDING_RING_HOLE_X, 0, BINDING_RING_HOLE_Z],
    [BINDING_RING_ENDPOINT_X, 0, BINDING_RING_ENDPOINT_Z],
  ]) {
    points.push(new THREE.Vector3(x, baseY + yOffset, z));
  }
  const tubularSegments = 56;
  const radialSegments = 14;
  const geometry = createTaperedTubeGeometry(points, tubularSegments, BINDING_RING_TUBE_RADIUS, radialSegments, 0.2);
  return geometry;
}

function createHalfRingHighlightGeometry(baseY, curveScale = 1) {
  const points = [];
  const lift = PAGE_H * 0.0045;
  for (const [x, yOffset, z] of [
    [-BINDING_RING_HOLE_X * 0.78, lift, BINDING_RING_HOLE_Z + PAGE_H * 0.015],
    [-BINDING_RING_HOLE_X * 0.42, lift + PAGE_H * 0.004, BINDING_RING_ARCH_Z * 0.82 * curveScale],
    [0, lift + PAGE_H * 0.004, BINDING_RING_ARCH_Z * curveScale + PAGE_H * 0.012],
    [BINDING_RING_HOLE_X * 0.42, lift + PAGE_H * 0.004, BINDING_RING_ARCH_Z * 0.82 * curveScale],
    [BINDING_RING_HOLE_X * 0.78, lift, BINDING_RING_HOLE_Z + PAGE_H * 0.015],
  ]) {
    points.push(new THREE.Vector3(x, baseY + yOffset, z));
  }
  return createTaperedTubeGeometry(points, 28, PAGE_H * 0.00075, 6, 0.12);
}

function createTaperedTubeGeometry(points, tubularSegments, radius, radialSegments, taperLength) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const positions = geometry.attributes.position;
  const rowSize = radialSegments + 1;
  for (let i = 0; i <= tubularSegments; i += 1) {
    const t = i / tubularSegments;
    const edgeRatio = Math.min(1, t / taperLength, (1 - t) / taperLength);
    const scale = smootherstep(edgeRatio);
    const center = curve.getPointAt(t);
    for (let j = 0; j <= radialSegments; j += 1) {
      const index = i * rowSize + j;
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      positions.setXYZ(
        index,
        center.x + (x - center.x) * scale,
        center.y + (y - center.y) * scale,
        center.z + (z - center.z) * scale,
      );
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function applyVariantState() {
  const bundle = BOOK_VARIANTS[activeBook] || BOOK_VARIANTS.boy;
  assignTexture(leftPageOuter, bundle.coverBack);
  assignTextureObject(leftPageInner, getPageTemplateTexture("left"));
  assignTextureObject(rightPage, getPageTemplateTexture("right"));
  if (activeSurface === "inside") {
    assignTextureObject(frontPage, getPageTemplateTexture("right"));
  } else {
    assignTexture(frontPage, coverPrintFile(activeBook));
  }
  if (activeSurface === "inside") {
    assignTextureObject(backPage, getPageTemplateTexture("left"));
  } else {
    assignTexture(backPage, bundle.coverInside);
  }
  assignTexture(closedCover, coverPrintFile(activeBook));
  assignCoverTurnTextures();
  assignSpineTexture();
  assignSideTabTextures();
  applyAlbumLayout();
  applyCoverTuning();
  applyCoverHardwareTheme();
  updateFlutterPageTextures();
  slider.disabled = activeSurface === "cover";
  updateControlState();
  updatePage(flipProgress);
  syncUrl();
}

function currentBookGap() {
  return activeAlbumMode === "collection" ? COLLECTION_GUTTER : STICKER_OPEN_GAP;
}

function applyAlbumLayout() {
  const gap = currentBookGap();
  updateStickerDepthModeVisibility();
  leftPageOuter.position.x = -PAGE_W - gap / 2;
  leftPageInner.position.x = -PAGE_W - gap / 2;
  rightPage.position.x = gap / 2;
  innerLeft.position.x = -gap / 2;
  innerRight.position.x = gap / 2;
  positionSideTabs(gap);
  positionStickerBackCoverBoards(gap);

  if (activeAlbumMode === "collection") {
    if (leftPageInner.geometry !== collectionLeftPageGeometry) {
      leftPageInner.geometry = collectionLeftPageGeometry;
    }
    if (rightPage.geometry !== collectionRightPageGeometry) {
      rightPage.geometry = collectionRightPageGeometry;
    }
    if (turningPageGeometry !== collectionTurningPageGeometry) {
      turningPageGeometry = collectionTurningPageGeometry;
      frontPage.geometry = collectionTurningPageGeometry;
      backPage.geometry = collectionTurningPageGeometry;
      flipShadow.geometry = collectionFlipShadowGeometry;
    }
    return;
  }

  if (leftPageInner.geometry !== standardLeftPageGeometry) {
    leftPageInner.geometry = standardLeftPageGeometry;
  }
  if (rightPage.geometry !== standardRightPageGeometry) {
    rightPage.geometry = standardRightPageGeometry;
  }
  if (turningPageGeometry !== standardTurningPageGeometry) {
    turningPageGeometry = standardTurningPageGeometry;
    frontPage.geometry = standardTurningPageGeometry;
    backPage.geometry = standardTurningPageGeometry;
    flipShadow.geometry = standardFlipShadowGeometry;
  }
  collectionFold.visible = false;
}

function assignSpineTexture() {
  applyRingMaterialTheme();
  if (activeAlbumMode === "collection") {
    assignTextureObject(spine, getCollectionSpineTexture(activeBook));
    assignTextureObject(collectionFold, getCollectionFoldTexture(activeBook));
    spine.scale.set(0.3, PAGE_H / STICKER_SPINE_H, 1);
    spine.position.y = 0;
    spine.position.z = -0.055;
    spine.renderOrder = 6;
    spine.material.opacity = 0.52;
    return;
  }
  spine.scale.set(1, 1, 1);
  spine.position.y = -STICKER_SPINE_STACK_EXTENSION / 2 + STICKER_SPINE_TOP_LIFT;
  spine.position.z = -0.09;
  spine.renderOrder = 1;
  spine.material.opacity = 1;
  assignTextureObject(spine, getStickerSpineTexture(activeBook));
}

function applyRingMaterialTheme() {
  const ringMaterial = ringGroup?.userData?.ringMaterial;
  const highlightMaterial = ringGroup?.userData?.highlightMaterial;
  if (activeAlbumMode !== "collection") {
    const hardware = stickerBookTheme(activeBook).coverHardware || stickerBookTheme("boy").coverHardware;
    if (ringMaterial) {
      ringMaterial.color.setHex(hardware.ring);
      ringMaterial.emissive.setHex(0x2e1c07);
      ringMaterial.emissiveIntensity = 0.018;
      ringMaterial.roughness = 0.38;
      ringMaterial.metalness = 0.48;
      ringMaterial.opacity = 0.94;
      ringMaterial.needsUpdate = true;
    }
    if (highlightMaterial) {
      highlightMaterial.color.setHex(hardware.ringHighlight);
      highlightMaterial.opacity = 0.46;
      highlightMaterial.needsUpdate = true;
    }
    return;
  }

  const theme = stickerBookTheme(activeBook).collection;
  if (ringMaterial) {
    ringMaterial.color.setHex(theme.ring);
    ringMaterial.emissive.setHex(0x3b2a12);
    ringMaterial.emissiveIntensity = 0.012;
    ringMaterial.roughness = 0.86;
    ringMaterial.metalness = 0.02;
    ringMaterial.opacity = 0.58;
    ringMaterial.needsUpdate = true;
  }
  if (highlightMaterial) {
    highlightMaterial.color.setHex(theme.ringHighlight);
    highlightMaterial.opacity = 0.14;
    highlightMaterial.needsUpdate = true;
  }
}

function getStickerSpineTexture(bookName) {
  if (stickerSpineTextureMap.has(bookName)) {
    return stickerSpineTextureMap.get(bookName);
  }
  const texture = createStickerSpineTexture(bookName);
  stickerSpineTextureMap.set(bookName, texture);
  return texture;
}

function createStickerSpineTexture(bookName) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = Math.round(1536 * (STICKER_SPINE_H / PAGE_H));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const hardware = stickerBookTheme(bookName).coverHardware || stickerBookTheme("boy").coverHardware;
  const bodyX = 10;
  const bodyY = 14;
  const bodyW = canvas.width - bodyX * 2;
  const bodyH = canvas.height - bodyY - 14;
  const radius = 38;

  ctx.save();
  ctx.shadowColor = rgbaFromHexNumber(hardware.boardShadow || hardware.spineDark, 0.18);
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 7;
  const edgeGrad = ctx.createLinearGradient(bodyX, 0, bodyX + bodyW, 0);
  edgeGrad.addColorStop(0, tintHexNumber(hardware.spineDark, 0.1));
  edgeGrad.addColorStop(0.16, tintHexNumber(hardware.spine, 0.16));
  edgeGrad.addColorStop(0.48, tintHexNumber(hardware.spineHighlight, 0.08));
  edgeGrad.addColorStop(0.72, tintHexNumber(hardware.spine, 0.18));
  edgeGrad.addColorStop(1, tintHexNumber(hardware.spineDark, 0.12));
  ctx.fillStyle = edgeGrad;
  drawCanvasRoundedRect(ctx, bodyX, bodyY, bodyW, bodyH, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawCanvasRoundedRect(ctx, bodyX + 2, bodyY + 2, bodyW - 4, bodyH - 4, radius - 2);
  ctx.clip();

  for (const x of [74, 102, 154, 182]) {
    const rib = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
    rib.addColorStop(0, "rgba(255, 255, 255, 0)");
    rib.addColorStop(0.5, "rgba(255, 255, 255, 0.13)");
    rib.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rib;
    ctx.fillRect(x - 12, bodyY + 32, 24, bodyH - 64);
  }

  for (const x of [64, 116, 140, 192]) {
    const seam = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
    seam.addColorStop(0, "rgba(0, 0, 0, 0)");
    seam.addColorStop(0.5, rgbaFromHexNumber(hardware.spineDark, 0.11));
    seam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(x - 9, bodyY + 34, 18, bodyH - 68);
  }

  const topGlow = ctx.createLinearGradient(0, bodyY, 0, bodyY + 96);
  topGlow.addColorStop(0, "rgba(255, 255, 255, 0.24)");
  topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(bodyX, bodyY, bodyW, 96);

  const bottomShade = ctx.createLinearGradient(0, bodyY + bodyH - 112, 0, bodyY + bodyH);
  bottomShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  bottomShade.addColorStop(1, rgbaFromHexNumber(hardware.boardShadow || hardware.spineDark, 0.12));
  ctx.fillStyle = bottomShade;
  ctx.fillRect(bodyX, bodyY + bodyH - 112, bodyW, 112);

  ctx.strokeStyle = rgbaFromHexNumber(hardware.spineHighlight, 0.24);
  ctx.lineWidth = 2;
  drawCanvasRoundedRect(ctx, bodyX + 5, bodyY + 5, bodyW - 10, bodyH - 10, radius - 4);
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function hexNumberToCss(number) {
  return `#${Number(number || 0).toString(16).padStart(6, "0").slice(-6)}`;
}

function rgbaFromHexNumber(number, alpha) {
  const value = Number(number || 0);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function tintHexNumber(number, amount) {
  return tintColor(hexNumberToCss(number), amount);
}

function getCollectionSpineTexture(bookName) {
  if (collectionSpineTextureMap.has(bookName)) {
    return collectionSpineTextureMap.get(bookName);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const base = stickerBookTheme(bookName).collection.spine;

  ctx.save();
  const baseGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  baseGrad.addColorStop(0, "rgba(72, 59, 28, 0)");
  baseGrad.addColorStop(0.18, "rgba(72, 59, 28, 0.18)");
  baseGrad.addColorStop(0.43, base.warm);
  baseGrad.addColorStop(0.5, base.paper);
  baseGrad.addColorStop(0.57, base.warm);
  baseGrad.addColorStop(0.82, "rgba(72, 59, 28, 0.18)");
  baseGrad.addColorStop(1, "rgba(72, 59, 28, 0)");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, -90, canvas.width, canvas.height + 180);

  ctx.filter = "blur(18px)";
  ctx.fillStyle = "rgba(87, 71, 35, 0.24)";
  ctx.fillRect(24, -120, 38, canvas.height + 240);
  ctx.fillRect(canvas.width - 62, -120, 38, canvas.height + 240);
  ctx.fillStyle = "rgba(255, 255, 245, 0.42)";
  ctx.fillRect(104, -120, 48, canvas.height + 240);
  ctx.filter = "none";

  const centerGrad = ctx.createLinearGradient(80, 0, 176, 0);
  centerGrad.addColorStop(0, "rgba(106, 87, 43, 0.18)");
  centerGrad.addColorStop(0.42, "rgba(255, 252, 230, 0.42)");
  centerGrad.addColorStop(0.58, "rgba(255, 252, 230, 0.42)");
  centerGrad.addColorStop(1, "rgba(106, 87, 43, 0.18)");
  ctx.fillStyle = centerGrad;
  drawCanvasRoundedRect(ctx, 70, -40, 116, canvas.height + 80, 28);
  ctx.fill();

  ctx.strokeStyle = "rgba(95, 78, 37, 0.12)";
  ctx.lineWidth = 3;
  for (const x of [74, 95, 161, 182]) {
    ctx.beginPath();
    ctx.moveTo(x, -24);
    ctx.lineTo(x, canvas.height + 24);
    ctx.stroke();
  }

  ctx.strokeStyle = base.seam;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  for (const x of [116, 140]) {
    ctx.beginPath();
    ctx.moveTo(x, -18);
    ctx.lineTo(x, canvas.height + 18);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  collectionSpineTextureMap.set(bookName, texture);
  return texture;
}

function getCollectionFoldTexture(bookName) {
  if (collectionFoldTextureMap.has(bookName)) {
    return collectionFoldTextureMap.get(bookName);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const base = stickerBookTheme(bookName).collection.spine;

  const body = ctx.createLinearGradient(0, 0, canvas.width, 0);
  body.addColorStop(0, `rgba(${base.foldDark}, 0)`);
  body.addColorStop(0.14, `rgba(${base.foldDark}, 0.06)`);
  body.addColorStop(0.27, `rgba(${base.foldWarm}, 0.13)`);
  body.addColorStop(0.39, `rgba(${base.foldPaper}, 0.09)`);
  body.addColorStop(0.48, `rgba(${base.foldDark}, 0.2)`);
  body.addColorStop(0.5, `rgba(${base.foldDark}, 0.3)`);
  body.addColorStop(0.52, `rgba(${base.foldDark}, 0.2)`);
  body.addColorStop(0.61, `rgba(${base.foldPaper}, 0.09)`);
  body.addColorStop(0.73, `rgba(${base.foldWarm}, 0.13)`);
  body.addColorStop(0.86, `rgba(${base.foldDark}, 0.06)`);
  body.addColorStop(1, `rgba(${base.foldDark}, 0)`);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = "blur(10px)";
  ctx.fillStyle = `rgba(${base.foldDark}, 0.16)`;
  ctx.fillRect(canvas.width * 0.18, -80, 30, canvas.height + 160);
  ctx.fillRect(canvas.width * 0.76, -80, 30, canvas.height + 160);
  ctx.fillStyle = "rgba(255, 255, 244, 0.16)";
  ctx.fillRect(canvas.width * 0.34, -80, 38, canvas.height + 160);
  ctx.fillRect(canvas.width * 0.58, -80, 38, canvas.height + 160);
  ctx.filter = "none";

  const centerLine = ctx.createLinearGradient(canvas.width * 0.47, 0, canvas.width * 0.53, 0);
  centerLine.addColorStop(0, `rgba(${base.foldDark}, 0)`);
  centerLine.addColorStop(0.48, `rgba(${base.foldDark}, 0.18)`);
  centerLine.addColorStop(0.5, `rgba(${base.foldDark}, 0.26)`);
  centerLine.addColorStop(0.52, `rgba(${base.foldDark}, 0.18)`);
  centerLine.addColorStop(1, `rgba(${base.foldDark}, 0)`);
  ctx.fillStyle = centerLine;
  ctx.fillRect(canvas.width * 0.45, 0, canvas.width * 0.1, canvas.height);

  ctx.globalCompositeOperation = "destination-in";
  const sideMask = ctx.createLinearGradient(0, 0, canvas.width, 0);
  sideMask.addColorStop(0, "rgba(0, 0, 0, 0)");
  sideMask.addColorStop(0.16, "rgba(0, 0, 0, 0.88)");
  sideMask.addColorStop(0.28, "rgba(0, 0, 0, 1)");
  sideMask.addColorStop(0.72, "rgba(0, 0, 0, 1)");
  sideMask.addColorStop(0.84, "rgba(0, 0, 0, 0.88)");
  sideMask.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sideMask;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const endMask = ctx.createLinearGradient(0, 0, 0, canvas.height);
  endMask.addColorStop(0, "rgba(0, 0, 0, 0)");
  endMask.addColorStop(0.08, "rgba(0, 0, 0, 0)");
  endMask.addColorStop(0.16, "rgba(0, 0, 0, 1)");
  endMask.addColorStop(0.86, "rgba(0, 0, 0, 1)");
  endMask.addColorStop(0.95, "rgba(0, 0, 0, 0)");
  endMask.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = endMask;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  collectionFoldTextureMap.set(bookName, texture);
  return texture;
}

function assignCoverTurnTextures() {
  const bundle = BOOK_VARIANTS[activeBook];
  assignTexture(coverTurnFront, coverPrintFile(activeBook));
  if (activeAlbumMode !== "collection") {
    assignTextureObject(coverTurnBack, getPageTemplateTexture("left", activeBookPage));
  } else {
    assignTexture(coverTurnBack, bundle.coverInside);
  }
}

function updateControlState() {
  for (const button of bookButtons) {
    const active = button.dataset.book === activeBook;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const button of themeButtons) {
    const active = button.dataset.bookTheme === activeBook;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const button of surfaceButtons) {
    button.classList.toggle("is-active", button.dataset.surface === activeSurface);
  }
  updateBookThemePreview();
  updateSpreadJumpControls();
  updateBookPageControls();
  updateAlbumModeUi();
}

function updateAlbumModeUi() {
  document.body.classList.toggle("is-collection-album", activeAlbumMode === "collection");
  updateStickerEditModeUi();
  if (albumModeToggle) {
    setTopButtonLabel(albumModeToggle, activeAlbumMode === "collection" ? "ずかん" : "シールちょう");
    albumModeToggle.setAttribute(
      "aria-label",
      activeAlbumMode === "collection" ? "ずかんを ひょうじちゅう。シールちょうへ きりかえ" : "シールちょうを ひょうじちゅう。ずかんへ きりかえ",
    );
  }
  updateCollectionStickerTrayVisibility();
}

function setTopButtonLabel(button, text) {
  if (!button) {
    return;
  }
  const label = button.querySelector(".top-button-label");
  if (label) {
    label.textContent = text;
    return;
  }
  button.textContent = text;
}

function setStickerEditMode(enabled, options = {}) {
  const nextMode = Boolean(enabled) && activeAlbumMode !== "collection";
  if (stickerEditMode === nextMode) {
    updateStickerEditModeUi();
    updateCollectionStickerTrayVisibility();
    if (nextMode && options.openInside && activeSurface === "cover") {
      setBookSurface("inside", activeBookPage || 1);
    }
    return;
  }
  stickerEditMode = nextMode;
  if (stickerEditMode) {
    closeBookPageJump();
  }
  if (!stickerEditMode) {
    selectedPlacementId = null;
    stickerTrayDragState = null;
    setStickerTrayPeek(false);
    if (inlineStickerDragState) {
      cancelInlineStickerDrag();
    }
  }
  updateStickerEditModeUi();
  refreshPageTemplateTextures();
  updatePage(flipProgress);
  updateCollectionStickerTrayVisibility();
  syncUrl();
  if (stickerEditMode && options.openInside && activeSurface === "cover") {
    setBookSurface("inside", activeBookPage || 1);
  }
}

function updateStickerEditModeUi() {
  const enabled = activeAlbumMode !== "collection" && stickerEditMode;
  document.body.classList.toggle("is-sticker-edit-mode", enabled);
  if (topEditButton) {
    topEditButton.classList.toggle("is-active", enabled);
    topEditButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    setTopButtonLabel(topEditButton, enabled ? "はるモード" : "みるモード");
    topEditButton.setAttribute("aria-label", enabled ? "いま はるモード。みるモードにする" : "いま みるモード。はるモードにする");
  }
  for (const button of stickerModeButtons) {
    const active = button.dataset.stickerEditMode === (enabled ? "edit" : "view");
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (!enabled && selectedPlacementId) {
    selectedPlacementId = null;
  }
  updateInlineStickerControls();
}

function updateSpreadJumpControls() {
  if (spreadJumper) {
    spreadJumper.hidden = activeSurface === "cover";
  }
  for (const button of spreadJumpButtons) {
    const target = readClampedNumber(button.dataset.spreadTarget, 0, 0, 1);
    button.disabled = activeSurface === "cover";
    button.classList.toggle("is-active", Math.abs(target - spreadPosition) < 0.02);
  }
}

function startSpreadJump(targetSpread, options = {}) {
  const target = THREE.MathUtils.clamp(Number(targetSpread), 0, 1);
  if (activeSurface === "cover" || !Number.isFinite(target)) {
    return;
  }
  if (Math.abs(target - spreadPosition) < 0.001) {
    updateSpreadJumpControls();
    if (typeof options.onComplete === "function") {
      options.onComplete();
    }
    return;
  }

  if (options.recordUndo) {
    pushTuningUndo("見開きプリセット変更");
  }

  const distance = Math.abs(target - spreadPosition);
  const duration = options.duration ?? THREE.MathUtils.lerp(SPREAD_JUMP_MIN_DURATION, SPREAD_JUMP_MAX_DURATION, distance);
  const visiblePageCount = options.visiblePageCount ?? flutterPageCountForDistance(distance);
  const cycles = options.cycles ?? visiblePageCount;
  spreadJumpAnimation = {
    from: spreadPosition,
    to: target,
    startTime: performance.now(),
    elapsed: 0,
    duration,
    cycles,
    visiblePageCount,
    minVisiblePageCount: options.minVisiblePageCount ?? FLUTTER_PAGE_MIN_COUNT,
    onComplete: options.onComplete,
    direction: target >= spreadPosition ? 1 : -1,
  };
  isPlaying = false;
  playButton.classList.remove("playing");
  flutterPages.group.visible = true;
  clock.getDelta();
  updateSpreadJumpControls();
  updateCollectionStickerTrayVisibility();
}

function flutterPageCountForDistance(distance) {
  const d = THREE.MathUtils.clamp(distance, 0, 1);
  // Spread dots are 0.25 apart: adjacent=3, half-book=4, three-step=5, end-to-end=6.
  if (d <= 0.26) {
    return 3;
  }
  if (d <= 0.51) {
    return 4;
  }
  if (d <= 0.76) {
    return 5;
  }
  return 6;
}

function cancelSpreadJump() {
  if (!spreadJumpAnimation) {
    return;
  }
  spreadJumpAnimation = null;
  flutterPages.group.visible = false;
  for (const page of flutterPages.pages) {
    page.frontMaterial.opacity = 0;
    page.backMaterial.opacity = 0;
  }
  updateCollectionStickerTrayVisibility();
}

function updateSpreadJump() {
  if (!spreadJumpAnimation) {
    return false;
  }

  const jump = spreadJumpAnimation;
  jump.elapsed = (performance.now() - jump.startTime) / 1000;
  const rawT = THREE.MathUtils.clamp(jump.elapsed / jump.duration, 0, 1);
  const easedT = smootherstep(rawT);
  const phase = (rawT * jump.cycles) % 1;

  spreadPosition = THREE.MathUtils.lerp(jump.from, jump.to, easedT);
  flipProgress = jump.direction > 0 ? phase : 1 - phase;
  slider.value = String(flipProgress);
  updateFlutterPages(phase, jump.direction, jump.visiblePageCount, jump.minVisiblePageCount);
  updatePage(flipProgress);
  updateSpreadJumpControls();

  if (rawT >= 0.995) {
    const onComplete = jump.onComplete;
    spreadPosition = jump.to;
    flipProgress = SPREAD_JUMP_SETTLE_PROGRESS;
    slider.value = String(flipProgress);
    spreadJumpAnimation = null;
    flutterPages.group.visible = false;
    for (const page of flutterPages.pages) {
      page.frontMaterial.opacity = 0;
      page.backMaterial.opacity = 0;
    }
    if (typeof onComplete === "function") {
      onComplete();
    }
    setupTuningPanel();
    updatePage(flipProgress);
    updateSpreadJumpControls();
    updateCollectionStickerTrayVisibility();
    syncUrl();
  }

  return true;
}

function updateFlutterPages(
  basePhase,
  direction,
  visiblePageCount = FLUTTER_PAGE_MAX_COUNT,
  minVisiblePageCount = FLUTTER_PAGE_MIN_COUNT,
) {
  flutterPages.group.visible = activeSurface === "inside" && Boolean(spreadJumpAnimation);
  const safeDirection = direction >= 0 ? 1 : -1;
  const activeCount = THREE.MathUtils.clamp(
    Math.round(visiblePageCount),
    minVisiblePageCount,
    FLUTTER_PAGE_MAX_COUNT,
  );
  for (let i = 0; i < flutterPages.pages.length; i += 1) {
    const page = flutterPages.pages[i];
    if (i >= activeCount) {
      page.shell.visible = false;
      page.frontMaterial.opacity = 0;
      page.backMaterial.opacity = 0;
      continue;
    }

    const offset = (i / activeCount) * 0.82;
    const cycle = (basePhase + offset) % 1;
    const p = safeDirection > 0 ? cycle : 1 - cycle;
    const hingeTravel = smootherstep(p);
    const trailWeight = 1 - (i / Math.max(1, activeCount - 1)) * 0.38;
    const opacity = Math.sin(cycle * Math.PI) * FLUTTER_TRAIL_OPACITY * trailWeight;

    page.shell.visible = opacity > 0.018;
    const gap = currentBookGap();
    page.shell.position.x = THREE.MathUtils.lerp(gap / 2, -gap / 2, hingeTravel);
    page.shell.position.z = 0.1 + Math.sin(p * Math.PI) * 0.2 + i * 0.011;
    page.shell.rotation.y = -p * Math.PI;
    page.shell.rotation.x = Math.sin(p * Math.PI) * 0.028;
    page.shell.rotation.z = Math.sin((cycle + i * 0.07) * Math.PI * 2) * 0.012;
    bendPageGeometry(page.geometry, p, PAGE_FLUTTER_BEND * Math.sin(cycle * Math.PI));
    page.frontMaterial.opacity = opacity;
    page.backMaterial.opacity = opacity * 0.88;
  }
}

function updatePage(progress) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  if (activeSurface === "cover") {
    flipProgress = 0;
    slider.value = "0";
    isPlaying = false;
    playButton.classList.remove("playing");
    coverOnly.visible = true;
    coverTurn.visible = false;
    setOpenSpreadVisible(false);
    applyAlbumLayout();
    positionStickerBackCoverBoardForClosedCover();
    setStickerBackCoverVisible(true, { rightOnly: true });
    setClosedCoverTabsVisible(true);
    applyCoverTuning();
    applyBookFramePosition(0);
    updateSpreadJumpControls();
    return;
  }

  coverOnly.visible = false;
  coverTurn.visible = false;
  setOpenSpreadVisible(true);
  applyAlbumLayout();
  applyBookFramePosition(1);
  bendPageGeometry(turningPageGeometry, p, PAGE_TURN_BEND * Math.sin(p * Math.PI));
  bendPageGeometry(flipShadow.geometry, p, PAGE_TURN_BEND * Math.sin(p * Math.PI));
  const hingeTravel = smootherstep(p);
  const showBack = p >= 0.5;
  pageTurn.visible = p > 0.001;
  const gap = currentBookGap();
  pageTurn.position.x = THREE.MathUtils.lerp(gap / 2, -gap / 2, hingeTravel);
  pageTurn.position.z = 0.07 + Math.sin(p * Math.PI) * 0.015;
  pageTurn.rotation.y = -p * Math.PI;
  pageTurn.rotation.x = Math.sin(p * Math.PI) * 0.02;

  frontPage.visible = !showBack;
  backPage.visible = showBack;
  flipShadow.material.opacity = 0.08 + Math.sin(p * Math.PI) * 0.18;
  updateStackThickness();
  updateSpreadJumpControls();

  leftPageOuter.visible = false;
  leftPageInner.visible = true;
  rightPage.visible = true;
}

function renderCoverOpenTransition(rawProgress) {
  const raw = THREE.MathUtils.clamp(rawProgress, 0, 1);
  const p = smootherstep(raw);
  flipProgress = 0;
  slider.value = "0";
  coverOnly.visible = raw < 0.025;
  if (coverOnly.visible) {
    applyCoverTuning();
  }
  setCoverOpeningSpreadVisible(true);
  applyAlbumLayout();
  positionCoverOpeningTabs(raw);
  const gap = currentBookGap();
  const showBinding = p > 0.52;
  spine.visible = showBinding;
  setStickerBookDepthVisible(showBinding);
  setBindingRingVisible(showBinding);
  innerRight.visible = false;
  collectionFold.visible = showBinding && activeAlbumMode === "collection";
  coverTurn.visible = raw < 0.985;
  coverTurn.position.set(
    THREE.MathUtils.lerp(COVER_CLOSED_X, -gap / 2, p),
    0,
    0.18 + Math.sin(p * Math.PI) * 0.08,
  );
  coverTurn.rotation.y = -p * Math.PI;
  coverTurn.rotation.x = Math.sin(p * Math.PI) * 0.018;
  coverTurnFront.visible = p < 0.5;
  coverTurnBack.visible = p >= 0.5;
  coverTurnRings.group.visible = activeAlbumMode !== "collection" && coverTurnFront.visible;
  flipShadow.visible = raw > 0.04 && raw < 0.95;
  flipShadow.material.opacity = 0.07 + Math.sin(p * Math.PI) * 0.16;
  pageTurn.visible = false;
  updateStackThickness({ coverOpening: true });
  updateSpreadJumpControls();
  applyBookFramePosition(p);

  leftPageOuter.visible = false;
  leftPageInner.visible = p > 0.96;
  rightPage.visible = true;
}

function updateCoverOpen(delta) {
  if (!coverOpenAnimation) {
    return false;
  }
  const animation = coverOpenAnimation;
  animation.elapsed = Math.min(animation.duration, (animation.elapsed || 0) + delta);
  const elapsed = animation.elapsed;
  const t = THREE.MathUtils.clamp(elapsed / animation.duration, 0, 1);
  const isClosing = animation.direction === "close";
  const raw = isClosing ? 1 - t : t;
  renderCoverOpenTransition(raw);
  if (t >= 0.995) {
    coverOpenAnimation = null;
    coverTurn.visible = false;
    if (isClosing) {
      activeSurface = "cover";
      flipShadow.visible = false;
      slider.disabled = true;
      updateControlState();
      updatePage(0);
      updateCollectionStickerTrayVisibility();
      syncUrl();
    } else {
      flipShadow.visible = true;
      assignTextureObject(frontPage, getPageTemplateTexture("right"));
      assignTextureObject(backPage, getPageTemplateTexture("left"));
      slider.disabled = false;
      updatePage(0);
      updateCollectionStickerTrayVisibility();
      syncUrl();
      // v1650 (task 1): swing 完了直後の同フレームで is-await-cover-open を外すと、
      // leftPageInner.visible=true 確定前 (updatePage(0) 内 p=0 のとき leftPageInner は visible 化されるが
      // CSS 変数の rect 再計算は次フレーム scheduleStickerTutorialLayout 経由) に card fade-in が始まる懸念。
      // rAF 1 つ挟んで 「左ページ rect が --tutorial-leftpage-* に確定書き込み」 された後で fade-in。
      releaseStickerTutorialCardAfterCoverOpen();
    }
  }
  return true;
}

function applyBookFramePosition(openProgress) {
  const p = smootherstep(openProgress);
  book.position.x = THREE.MathUtils.lerp(BOOK_COVER_X, BOOK_INSIDE_X, p);
}

function setOpenSpreadVisible(visible) {
  setStickerBookDepthVisible(visible);
  setStickerBackCoverVisible(visible);
  sideTabs.group.visible = visible;
  sideTabs.group.position.z = -0.04;
  sideTabs.left.visible = visible;
  sideTabs.right.visible = visible;
  leftPageOuter.visible = false;
  leftPageInner.visible = visible;
  rightPage.visible = visible;
  innerLeft.visible = false;
  innerRight.visible = false;
  collectionFold.visible = false;
  pageTurn.visible = visible;
  if (!visible) {
    coverTurn.visible = false;
  }
  spine.visible = visible;
  setBindingRingVisible(visible);
  pageStacks.group.visible = visible;
  pageStacks.left.group.visible = visible;
  pageStacks.right.group.visible = visible;
  pageStacks.collection.group.visible = false;
  if (visible && activeAlbumMode === "collection") {
    sideTabs.group.visible = true;
    setBindingRingVisible(false);
    innerLeft.visible = false;
    innerRight.visible = false;
    collectionFold.visible = visible;
  }
  if (!visible) {
    flutterPages.group.visible = false;
  }
}

function setCoverOpeningSpreadVisible(visible) {
  setStickerBookDepthVisible(false);
  setStickerBackCoverVisible(visible, { rightOnly: true });
  sideTabs.group.visible = visible;
  sideTabs.group.position.z = visible ? sideTabs.group.position.z : -0.04;
  sideTabs.left.visible = false;
  sideTabs.right.visible = visible;
  leftPageOuter.visible = false;
  leftPageInner.visible = false;
  rightPage.visible = visible;
  innerLeft.visible = false;
  innerRight.visible = false;
  collectionFold.visible = false;
  pageTurn.visible = false;
  spine.visible = false;
  setBindingRingVisible(false);
  pageStacks.group.visible = visible;
  pageStacks.left.group.visible = false;
  pageStacks.right.group.visible = visible;
  pageStacks.collection.group.visible = false;
  if (visible && activeAlbumMode === "collection") {
    sideTabs.group.visible = true;
  }
  if (!visible) {
    coverTurn.visible = false;
    flutterPages.group.visible = false;
  }
}

function smootherstep(x) {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.08);
  if (updateCoverOpen(delta)) {
    renderer.render(scene, camera);
    return;
  }
  if (updateSpreadJump(delta)) {
    renderer.render(scene, camera);
    return;
  }
  if (isPlaying) {
    flipProgress += delta * 0.34;
    if (flipProgress > 1) {
      flipProgress = 0;
    }
    slider.value = String(flipProgress);
    updatePage(flipProgress);
  }
  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);

  const isCollectionLayout = activeAlbumMode === "collection";
  const viewGap = isCollectionLayout ? COLLECTION_GUTTER : GUTTER;
  const viewPadding = isCollectionLayout ? (width < 720 ? 0.48 : 0.24) : (width < 720 ? 0.68 : 0.42);
  const viewW = PAGE_W * 2 + viewGap + viewPadding;
  const viewH = PAGE_H + (isCollectionLayout ? (width < 720 ? 1.74 : 0.74) : (width < 720 ? 1.88 : 0.88));
  const aspect = width / height;
  const fov = THREE.MathUtils.degToRad(CAMERA_FOV);
  const distanceForHeight = viewH / (2 * Math.tan(fov / 2));
  const distanceForWidth = viewW / (2 * Math.tan(fov / 2) * aspect);
  const distance = Math.max(distanceForHeight, distanceForWidth) * (width < 720 ? 1.0 : 1.03);

  camera.aspect = aspect;
  camera.position.set(0, -distance * 0.18, distance);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();

  book.scale.setScalar(1);
  book.position.y = width < 720 ? 0.56 : 0.38;
  if (!coverOpenAnimation) {
    applyBookFramePosition(activeSurface === "cover" ? 0 : 1);
  }
  if (stickerEditor && !stickerEditor.hidden) {
    renderDrawingCanvas();
  }
  updateStickerTrayCounter();
  scheduleStickerTutorialLayout();
}

function syncUrl() {
  const next = new URLSearchParams(window.location.search);
  next.set("progress", String(Number(flipProgress.toFixed(3))));
  next.set("spread", String(Number(spreadPosition.toFixed(3))));
  next.set("page", String(activeBookPage));
  next.set("book", activeBook);
  next.set("surface", activeSurface);
  next.set("album", activeAlbumMode);
  if (activeAlbumMode !== "collection" && stickerEditMode) {
    next.set("edit", "1");
  } else {
    next.delete("edit");
  }
  if (isPlaying) {
    next.set("play", "1");
  } else {
    next.delete("play");
  }
  // シール帳 正本統一: grant 動線の transient query は URL に残さない。
  // firstEver は一度起動したら剥がす (R5: URL 汚染防止 + 再起動で welcome 二重表示防止)。
  next.delete("firstEver");
  next.delete("game");
  next.delete("pasteId");
  const query = next.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
