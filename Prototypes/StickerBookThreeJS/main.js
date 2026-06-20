import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const ASSET_ROOT = "../../assets/_PonoSubmarine/Art/UI/StickerBook3D/";
const ASSET_VERSION = "20260620-727";
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
const PAGE_HOLE_X = PAGE_W * (16 / 1472);
const PAGE_HOLE_RX = PAGE_W * (16 / 1472);
const PAGE_HOLE_RY = PAGE_H * (18 / 1536);
const PAGE_RING_PIXELS = [170, 370, 570, 770, 970, 1170, 1370];
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
const STICKER_ASSET_PREFIX = "../../";
const EDITOR_STORAGE_KEY = "sb3d_sticker_editor_free_pages_v1";
const COLLECTION_ALBUM_PLACEMENTS_STORAGE_KEY = "sb3d_collection_album_placements_v1";
const EDITOR_STATE_VERSION = 3;
const COLLECTION_ALBUM_STATE_VERSION = 1;
const DEFAULT_CONTENT_SEED_VERSION = 1;
const STICKER_ALBUM_PAGE_COUNT = 12;
const COLLECTION_ALBUM_STICKERS_PER_PAGE = 12;
const COLLECTION_TRAY_PLACEMENT_SCALE = 0.52;
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
const DEFAULT_ZUKAN_FORMAT_INDEX = 1;
const ZUKAN_THICKNESS_DISPLAY_SCALE_Y = 1.32;

const BOOK_VARIANTS = {
  boy: {
    insideLeft: "sb3d_boy_page_left_generated.webp",
    insideRight: "sb3d_boy_page_right_generated.webp",
    coverFront: "sb3d_boy_cover_front_generated.webp",
    coverBack: "sb3d_boy_cover_back_generated.webp",
    coverInside: "sb3d_boy_cover_inside_generated.webp",
    spine: "sb3d_boy_spine_generated.webp",
    tabsLeft: "sb3d_boy_side_tabs_left_generated.webp",
    tabsRight: "sb3d_boy_side_tabs_right_generated.webp",
  },
  girl: {
    insideLeft: "sb3d_girl_page_left_generated.webp",
    insideRight: "sb3d_girl_page_right_generated.webp",
    coverFront: "sb3d_girl_cover_front_generated.webp",
    coverBack: "sb3d_girl_cover_back_generated.webp",
    coverInside: "sb3d_girl_cover_inside_generated.webp",
    spine: "sb3d_girl_spine_generated.webp",
    tabsLeft: "sb3d_girl_side_tabs_left_generated.webp",
    tabsRight: "sb3d_girl_side_tabs_right_generated.webp",
  },
};

const STICKER_BOOK_THEMES = {
  boy: {
    accent: "#d79a34",
    sub: "#55aeb8",
    line: "#d3b35f",
    tab: "#f4e7b8",
    collection: {
      paper: ["#fffbe9", "#fff3cf", "#f7e8b5"],
      text: "#334447",
      pageBorder: "#f9edc8",
      pageHighlight: "rgba(255, 255, 255, 0.78)",
      frameShadow: "rgba(87, 66, 21, 0.18)",
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
          frame: "#99cc56",
          frameDark: "#77aa3a",
          accent: "#4fb8a7",
          innerStroke: "#b6d875",
          motifSet: "nature",
        },
        right: {
          frame: "#62c6dc",
          frameDark: "#3798b4",
          accent: "#f2bd33",
          innerStroke: "#8ddceb",
          motifSet: "ocean",
        },
      },
      slotBand: {
        fill: "#f5d669",
        edge: "#d9aa1d",
        slot: "rgba(255, 250, 231, 0.9)",
        stroke: "rgba(181, 130, 28, 0.32)",
      },
      card: {
        foundFill: "rgba(255, 253, 240, 0.76)",
        lockedFill: "rgba(223, 225, 215, 0.58)",
        foundStroke: "rgba(116, 170, 72, 0.38)",
        lockedStroke: "rgba(116, 128, 122, 0.24)",
        numberFill: "#3ea5ad",
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
    collection: {
      paper: ["#fffbea", "#fff4d4", "#f8eac0"],
      text: "#39434a",
      pageBorder: "#fbedd2",
      pageHighlight: "rgba(255, 255, 255, 0.82)",
      frameShadow: "rgba(88, 62, 35, 0.16)",
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
};

function stickerBookTheme(bookName) {
  return STICKER_BOOK_THEMES[bookName] || STICKER_BOOK_THEMES.boy;
}

const canvas = document.getElementById("scene");
const slider = document.getElementById("flipSlider");
const playButton = document.getElementById("playButton");
const resetButton = document.getElementById("resetButton");
const tuningPanel = document.getElementById("tuningPanel");
const spreadJumper = document.getElementById("spreadJumper");
const spreadJumpButtons = [...document.querySelectorAll("[data-spread-target]")];
const bookButtons = [...document.querySelectorAll("[data-book]")];
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
const albumModeToggle = document.getElementById("albumModeToggle");
const collectionStickerTray = document.getElementById("collectionStickerTray");
const collectionStickerTrayItems = document.getElementById("collectionStickerTrayItems");

const params = new URLSearchParams(window.location.search);
const localPreviewHostnames = new Set(["", "localhost", "127.0.0.1", "::1"]);
const isLocalPreview = localPreviewHostnames.has(window.location.hostname);
const tuningEnabled = isLocalPreview && params.get("tune") === "1";
const editorEnabled = true;
const prototypeControlsEnabled = isLocalPreview && (tuningEnabled || readBooleanParam("controls"));
let activeBook = params.get("book") === "girl" ? "girl" : "boy";
let activeAlbumMode = params.get("album") === "collection" ? "collection" : "free";
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
const clock = new THREE.Clock();
if (activeSurface === "cover") {
  flipProgress = 0;
  isPlaying = false;
}
document.body.classList.toggle("is-editor-enabled", editorEnabled);
document.body.classList.toggle("is-prototype-controls", prototypeControlsEnabled);
slider.value = String(THREE.MathUtils.clamp(flipProgress, 0, 1));
playButton.classList.toggle("playing", isPlaying);

const TUNING_STORAGE_KEY = "sb3d_layer_tuning_by_pair_v8";
const LEGACY_TUNING_STORAGE_KEY = "sb3d_layer_tuning_v1";
const COVER_TUNING_STORAGE_KEY = "sb3d_cover_tuning_v6";
const RIGHT_ONLY_PAIR_KEY = "empty-full";
const RIGHT_ONLY_SYNC_MARKER_KEY = `${TUNING_STORAGE_KEY}_right_only_seed_v1`;
const TUNING_HISTORY_LIMIT = 80;
const SPREAD_JUMP_SETTLE_PROGRESS = 0;
const SPREAD_JUMP_MIN_DURATION = 0.28;
const SPREAD_JUMP_MAX_DURATION = 0.62;
const COVER_OPEN_DURATION = 1.15;
const COVER_CLOSED_X = GUTTER / 2;
const COVER_OPEN_X = -GUTTER / 2;
const COVER_CENTER_X = COVER_CLOSED_X + PAGE_W / 2;
const BOOK_COVER_X = -COVER_CENTER_X;
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
const SPREAD_PRESETS = [
  ["empty-full", 0, "右だけ"],
  ["small-mostly", 0.25, "右多め"],
  ["half-half", 0.5, "半分"],
  ["mostly-small", 0.75, "左多め"],
  ["full-empty", 1, "左だけ"],
];
let layerTuningByPair = loadLayerTuningStore();
let coverTuning = loadCoverTuning();
let tuningUndoStack = [];
let tuningRedoStack = [];
let activeTuningEditLabel = "";
let spreadJumpAnimation = null;
let coverOpenAnimation = null;
let stickerPlan = null;
let stickerOptions = [];
let collectionStickerOptions = [];
let editorPageDefinitions = createFallbackEditorPageDefinitions();
let collectionPageDefinitions = createFallbackCollectionPageDefinitions();
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
let pendingCollectionStickerId = null;
let collectionTrayDragState = null;
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
    ...ZUKAN_THICKNESS_STRIPS.map(({ file }) => file),
    ...Object.values(BOOK_VARIANTS.boy),
    ...Object.values(BOOK_VARIANTS.girl),
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
const pageTemplateTextureMap = new Map();
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

const closedCover = makePageSurface(BOOK_VARIANTS[activeBook].coverFront, createCoverSurfaceGeometry());
closedCover.position.set(COVER_CLOSED_X, 0, 0.04);
closedCover.renderOrder = 30;
coverOnly.add(closedCover);

const coverTurn = new THREE.Group();
coverTurn.visible = false;
coverTurn.position.set(COVER_CLOSED_X, 0, 0.18);
book.add(coverTurn);

const coverTurnGeometry = createCoverSurfaceGeometry();
const coverTurnFront = new THREE.Mesh(
  coverTurnGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(BOOK_VARIANTS[activeBook].coverFront),
    transparent: false,
    side: THREE.FrontSide,
    depthWrite: true,
    roughness: 0.9,
    metalness: 0.0,
  }),
);
const coverTurnBack = new THREE.Mesh(
  coverTurnGeometry,
  new THREE.MeshStandardMaterial({
    map: getTexture(BOOK_VARIANTS[activeBook].coverInside),
    transparent: false,
    side: THREE.BackSide,
    depthWrite: true,
    roughness: 0.92,
    metalness: 0.0,
  }),
);
coverTurnFront.renderOrder = 86;
coverTurnBack.renderOrder = 85;
coverTurn.add(coverTurnBack);
coverTurn.add(coverTurnFront);

const spine = makePlane(BOOK_VARIANTS[activeBook].spine, SPINE_W, PAGE_H, { depth: -0.09, lit: true, transparent: true });
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

for (const button of bookButtons) {
  button.addEventListener("click", () => {
    const nextBook = button.dataset.book === "girl" ? "girl" : "boy";
    if (nextBook === activeBook) {
      return;
    }
    cancelSpreadJump();
    activeBook = nextBook;
    applyVariantState();
  });
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

albumModeToggle?.addEventListener("click", () => {
  setAlbumMode(activeAlbumMode === "collection" ? "free" : "collection");
});

window.addEventListener("resize", resize);
setupTuningPanel();
setupBookPageControls();
setupCollectionStickerTray();
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
  flipProgress,
  spreadPosition,
  thicknessPair: thicknessPairForSpread(spreadPosition),
  spreadJumpActive: Boolean(spreadJumpAnimation),
  spreadJumpVisiblePageCount: spreadJumpAnimation?.visiblePageCount ?? 0,
  spreadJumpCycles: spreadJumpAnimation?.cycles ?? 0,
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
  collectionTrayItemCount: availableCollectionTrayStickers().length,
  collectionTrayVisible: Boolean(collectionStickerTray && !collectionStickerTray.hidden),
  pendingCollectionStickerId,
  turnFrontTextureIsCanvas: frontPage.material.map?.image instanceof HTMLCanvasElement,
  turnBackTextureIsCanvas: backPage.material.map?.image instanceof HTMLCanvasElement,
});
animate();

function setupScenePagePicking() {
  if (!editorEnabled) {
    return;
  }
  canvas.addEventListener("pointermove", (event) => {
    if (pendingCollectionStickerId && pickCollectionAlbumPage(event)) {
      canvas.style.cursor = "copy";
      return;
    }
    canvas.style.cursor = pickEditablePage(event) ? "zoom-in" : "";
  });
  canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "";
  });
  canvas.addEventListener("click", (event) => {
    if (placePendingCollectionStickerFromEvent(event)) {
      return;
    }
    const pickedPage = pickEditablePage(event);
    if (!pickedPage) {
      return;
    }
    openStickerEditor(pageNumberForPickedPage(pickedPage));
  });
}

function pickEditablePage(event) {
  if (
    activeAlbumMode === "collection"
    || !editorEnabled
    || activeSurface !== "inside"
    || !stickerEditor
    || !stickerEditor.hidden
  ) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pageRaycaster.setFromCamera(pointerNdc, camera);
  const hits = pageRaycaster.intersectObjects([rightPage, leftPageInner], false);
  return hits[0]?.object || null;
}

function setupBookPageControls() {
  bookPrevPage?.addEventListener("click", () => {
    if (activeSurface === "inside" && activeBookPage <= 1) {
      setBookSurface("cover", activeBookPage);
      return;
    }
    setBookPage(activeBookPage - 2, { turnMode: "single" });
  });
  bookNextPage?.addEventListener("click", () => {
    if (activeSurface === "cover") {
      setBookSurface("inside", 1);
      return;
    }
    setBookPage(activeBookPage + 2, { turnMode: "single" });
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
    const button = event.target.closest("[data-collection-sticker-id]");
    if (!button || !collectionStickerTray.contains(button)) {
      return;
    }
    const sticker = collectionStickerById(button.dataset.collectionStickerId);
    if (!sticker) {
      return;
    }
    event.preventDefault();
    setPendingCollectionSticker(sticker.id);
  });
  collectionStickerTray.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-collection-sticker-id]");
    if (!button || !collectionStickerTray.contains(button) || event.pointerType === "touch") {
      return;
    }
    const sticker = collectionStickerById(button.dataset.collectionStickerId);
    if (!sticker || !canPlaceCollectionSticker()) {
      return;
    }
    event.preventDefault();
    beginCollectionTrayDrag(event, sticker);
  });
  renderCollectionStickerTray();
}

function renderCollectionStickerTray() {
  if (!collectionStickerTray || !collectionStickerTrayItems) {
    return;
  }
  const stickers = availableCollectionTrayStickers();
  const fragment = document.createDocumentFragment();
  for (const sticker of stickers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collection-tray-item";
    button.dataset.collectionStickerId = sticker.id;
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-label", sticker.label || "シール");
    button.title = sticker.label || "シール";

    const image = document.createElement("img");
    image.src = sticker.assetUrl;
    image.alt = "";
    image.draggable = false;
    image.loading = "lazy";
    button.append(image);
    fragment.append(button);
  }
  collectionStickerTrayItems.replaceChildren(fragment);
  updateCollectionTraySelection();
  updateCollectionStickerTrayVisibility();
}

function availableCollectionTrayStickers() {
  return collectionStickerOptions.filter((sticker) => Boolean(sticker.assetUrl));
}

function collectionStickerById(stickerId) {
  return availableCollectionTrayStickers().find((sticker) => sticker.id === stickerId) || null;
}

function canPlaceCollectionSticker() {
  return activeAlbumMode === "collection"
    && activeSurface === "inside"
    && !coverOpenAnimation
    && !spreadJumpAnimation
    && flipProgress <= 0.001
    && (!stickerEditor || stickerEditor.hidden);
}

function updateCollectionStickerTrayVisibility() {
  if (!collectionStickerTray) {
    return;
  }
  const visible = activeAlbumMode === "collection"
    && activeSurface === "inside"
    && !coverOpenAnimation
    && availableCollectionTrayStickers().length > 0;
  collectionStickerTray.hidden = !visible;
  document.body.classList.toggle("is-collection-tray-visible", visible);
  if (!visible) {
    pendingCollectionStickerId = null;
    updateCollectionTraySelection();
    cancelCollectionTrayDrag();
  }
}

function setPendingCollectionSticker(stickerId) {
  pendingCollectionStickerId = collectionStickerById(stickerId)?.id || null;
  updateCollectionTraySelection();
}

function clearPendingCollectionSticker() {
  pendingCollectionStickerId = null;
  updateCollectionTraySelection();
}

function updateCollectionTraySelection() {
  if (!collectionStickerTrayItems) {
    return;
  }
  collectionStickerTrayItems.querySelectorAll("[data-collection-sticker-id]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.collectionStickerId === pendingCollectionStickerId);
  });
}

function beginCollectionTrayDrag(event, sticker) {
  cancelCollectionTrayDrag();
  setPendingCollectionSticker(sticker.id);
  const ghost = document.createElement("img");
  ghost.className = "collection-tray-ghost";
  ghost.src = sticker.assetUrl;
  ghost.alt = "";
  ghost.draggable = false;
  document.body.append(ghost);
  collectionTrayDragState = {
    sticker,
    ghost,
    pointerId: event.pointerId,
  };
  updateCollectionTrayGhost(event);
  document.addEventListener("pointermove", handleCollectionTrayDragMove);
  document.addEventListener("pointerup", handleCollectionTrayDragEnd);
  document.addEventListener("pointercancel", handleCollectionTrayDragCancel);
}

function updateCollectionTrayGhost(event) {
  if (!collectionTrayDragState?.ghost) {
    return;
  }
  collectionTrayDragState.ghost.style.left = `${event.clientX}px`;
  collectionTrayDragState.ghost.style.top = `${event.clientY}px`;
}

function handleCollectionTrayDragMove(event) {
  if (!collectionTrayDragState || event.pointerId !== collectionTrayDragState.pointerId) {
    return;
  }
  event.preventDefault();
  updateCollectionTrayGhost(event);
}

function handleCollectionTrayDragEnd(event) {
  if (!collectionTrayDragState || event.pointerId !== collectionTrayDragState.pointerId) {
    return;
  }
  event.preventDefault();
  const sticker = collectionTrayDragState.sticker;
  finishCollectionTrayDrag();
  if (placeCollectionStickerFromClientPoint(sticker, event.clientX, event.clientY)) {
    clearPendingCollectionSticker();
  } else {
    setPendingCollectionSticker(sticker.id);
  }
}

function handleCollectionTrayDragCancel(event) {
  if (!collectionTrayDragState || event.pointerId !== collectionTrayDragState.pointerId) {
    return;
  }
  finishCollectionTrayDrag();
}

function finishCollectionTrayDrag() {
  if (!collectionTrayDragState) {
    return;
  }
  collectionTrayDragState.ghost?.remove();
  collectionTrayDragState = null;
  document.removeEventListener("pointermove", handleCollectionTrayDragMove);
  document.removeEventListener("pointerup", handleCollectionTrayDragEnd);
  document.removeEventListener("pointercancel", handleCollectionTrayDragCancel);
}

function cancelCollectionTrayDrag() {
  finishCollectionTrayDrag();
}

function placePendingCollectionStickerFromEvent(event) {
  if (!pendingCollectionStickerId || activeAlbumMode !== "collection") {
    return false;
  }
  const sticker = collectionStickerById(pendingCollectionStickerId);
  if (!sticker) {
    clearPendingCollectionSticker();
    return false;
  }
  const placed = placeCollectionStickerFromClientPoint(sticker, event.clientX, event.clientY);
  if (placed) {
    event.preventDefault();
    clearPendingCollectionSticker();
  }
  return placed;
}

function pickCollectionAlbumPage(event) {
  return pickCollectionAlbumPageAt(event.clientX, event.clientY);
}

function pickCollectionAlbumPageAt(clientX, clientY) {
  if (!canPlaceCollectionSticker()) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  pageRaycaster.setFromCamera(pointerNdc, camera);
  const hits = pageRaycaster.intersectObjects([rightPage, leftPageInner], false);
  const hit = hits.find((item) => item.uv);
  if (!hit) {
    return null;
  }
  return {
    mesh: hit.object,
    pageNumber: pageNumberForPickedPage(hit.object),
    uv: hit.uv.clone(),
  };
}

function placeCollectionStickerFromClientPoint(sticker, clientX, clientY) {
  if (document.elementFromPoint(clientX, clientY) !== canvas) {
    return false;
  }
  const pickedPage = pickCollectionAlbumPageAt(clientX, clientY);
  if (!pickedPage) {
    return false;
  }
  addCollectionStickerPlacement(sticker, pickedPage.pageNumber, pickedPage.uv);
  return true;
}

function addCollectionStickerPlacement(sticker, pageNumber, uv) {
  const placements = getCollectionPagePlacements(pageNumber);
  const placement = {
    id: createPlacementId(),
    stickerId: sticker.id,
    label: sticker.label,
    assetUrl: sticker.assetUrl,
    x: THREE.MathUtils.clamp(uv.x * 100, 6, 94),
    y: THREE.MathUtils.clamp((1 - uv.y) * 100, 6, 94),
    scale: collectionStickerPlacementScale(sticker),
    rotation: 0,
    z: nextPlacementZ(placements),
  };
  placements.push(placement);
  saveCollectionAlbumState();
  refreshPageTemplateTextures();
  return placement;
}

function collectionStickerPlacementScale(sticker) {
  return defaultStickerScale(sticker) * COLLECTION_TRAY_PLACEMENT_SCALE;
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
    const response = await fetch(`${STICKER_PLAN_URL}?v=${ASSET_VERSION}`);
    if (!response.ok) {
      throw new Error(`plan ${response.status}`);
    }
    stickerPlan = await response.json();
    collectionStickerOptions = stickerPlan.stickers
      .map((sticker) => ({
        ...sticker,
        assetUrl: sticker.assetPath ? stickerAssetUrl(sticker.assetPath) : "",
      }));
    stickerOptions = collectionStickerOptions
      .filter((sticker) => sticker.assetStatus === "existing" && sticker.assetPath)
      .map((sticker) => ({ ...sticker }));
    syncEditorPlacementsWithStickerPlan();
    syncCollectionPlacementsWithStickerPlan();
    editorPageDefinitions = buildEditorPageDefinitions();
    collectionPageDefinitions = buildCollectionPageDefinitions();
    activeBookPage = spreadStartForPage(Math.min(activeBookPage, editorPageCount()));
    activeEditorPage = THREE.MathUtils.clamp(Math.round(activeEditorPage), 1, editorPageDefinitions.length);
    if (!isLocalPreview || !params.has("spread")) {
      spreadPosition = spreadPositionForBookPage(activeBookPage);
    }
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
    syncUrl();
    window.__stickerEditorPlanLoaded = true;
  } catch (error) {
    console.warn("Sticker plan load failed", error);
    if (stickerLibrary) {
      stickerLibrary.textContent = "シールを よみこめません";
    }
  }
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
  const stickersById = new Map(availableCollectionTrayStickers().map((sticker) => [sticker.id, sticker]));
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
  return createFallbackEditorPageDefinitions();
}

function createFallbackEditorPageDefinitions() {
  return Array.from({ length: STICKER_ALBUM_PAGE_COUNT }, (_, index) => ({
    page: index + 1,
    gameId: "",
    label: `ページ ${index + 1}`,
    shelfType: "sticker_album",
  }));
}

function createFallbackCollectionPageDefinitions() {
  return [{
    page: 1,
    label: "シールアルバム",
    shelfType: "sticker_collection",
  }];
}

function buildCollectionPageDefinitions() {
  const pageCount = Math.max(1, Math.ceil(collectionStickerOptions.length / COLLECTION_ALBUM_STICKERS_PER_PAGE));
  return Array.from({ length: pageCount }, (_, index) => ({
    page: index + 1,
    label: index === 0 ? "シールアルバム" : `シール ${index + 1}`,
    shelfType: "sticker_collection",
  }));
}

function activePageDefinitions() {
  return activeAlbumMode === "collection" ? collectionPageDefinitions : editorPageDefinitions;
}

function ensureDefaultEditorPages() {
  for (const pageDef of editorPageDefinitions) {
    getPagePlacements(pageDef.page);
    getPageDrawingStrokes(pageDef.page);
  }
  seedDefaultEditorContentIfNeeded();
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
  if (!stickerOptions.length || hasAnyEditorContent()) {
    return;
  }
  const sortedStickers = [...stickerOptions].sort((a, b) => {
    const gameOrderA = stickerPlan?.games?.findIndex((game) => game.id === a.gameId) ?? 0;
    const gameOrderB = stickerPlan?.games?.findIndex((game) => game.id === b.gameId) ?? 0;
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
  const games = stickerPlan.games.filter((game) => activeGameIds.has(game.id));
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
  drawPageTemplateBase(ctx, palette, side);
  drawRightPageTemplate(ctx, palette);
  drawRingHoleGuides(ctx, side);
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
  if (activeSurface === "cover") {
    setBookSurface("inside", page);
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
  activeBookPage = spreadStartForPage(1);
  activeEditorPage = 1;
  spreadPosition = spreadPositionForBookPage(activeBookPage);
  flipProgress = 0;
  slider.value = "0";
  selectedPlacementId = null;
  stickerDragState = null;
  pendingCollectionStickerId = null;
  cancelCollectionTrayDrag();
  assignSpineTexture();
  assignSideTabTextures();
  applyAlbumLayout();
  refreshPageTemplateTextures();
  updateAlbumModeUi();
  updatePage(flipProgress);
  syncUrl();
}

function setBookSurface(surface, page = activeBookPage) {
  const nextSurface = surface === "cover" ? "cover" : "inside";
  cancelSpreadJump();
  if (activeSurface === "cover" && nextSurface === "inside") {
    startCoverOpen(page);
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
    pendingCollectionStickerId = null;
    cancelCollectionTrayDrag();
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
  pendingCollectionStickerId = null;
  cancelCollectionTrayDrag();
  closeBookPageJump();
  refreshPageTemplateTextures();
  updateControlState();
  assignCoverTurnTextures();
  coverOpenAnimation = {
    startTime: performance.now(),
    duration: COVER_OPEN_DURATION,
  };
  updateCollectionStickerTrayVisibility();
  renderCoverOpenTransition(0);
  syncUrl();
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
  if (activeSurface === "cover") {
    if (bookPageLabel) {
      bookPageLabel.textContent = "表紙";
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
  coverButton.textContent = "表紙";
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
    const start = (Math.max(1, Math.round(page)) - 1) * COLLECTION_ALBUM_STICKERS_PER_PAGE;
    return collectionStickerOptions.slice(start, start + COLLECTION_ALBUM_STICKERS_PER_PAGE);
  }
  const pageDef = editorPageDefinitions[page - 1];
  if (!pageDef?.gameId) {
    return stickerOptions;
  }
  return stickerOptions.filter((sticker) => sticker.gameId === pageDef.gameId);
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
  return { version: EDITOR_STATE_VERSION, pages: {}, drawings: {}, defaultContentSeedVersion: 0 };
}

function createEmptyCollectionAlbumState() {
  return { version: COLLECTION_ALBUM_STATE_VERSION, pages: {} };
}

function saveEditorState() {
  try {
    editorState.version = EDITOR_STATE_VERSION;
    if (!editorState.drawings || typeof editorState.drawings !== "object") {
      editorState.drawings = {};
    }
    editorState.defaultContentSeedVersion = editorState.defaultContentSeedVersion || 0;
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
  persistLayerTuningStore();
  persistCoverTuning();
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

  drawPageTemplateBase(ctx, palette, side, activeAlbumMode);
  if (activeAlbumMode === "collection") {
    drawCollectionPageTemplate(ctx, palette, side);
  } else {
    drawRightPageTemplate(ctx, palette);
    drawRingHoleGuides(ctx, side);
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

function drawPageTemplateBase(ctx, palette, side, mode = "free") {
  const width = PAGE_TEXTURE_W;
  const height = PAGE_TEXTURE_H;
  const collectionTheme = mode === "collection" ? palette.collection : null;
  const paperStops = collectionTheme?.paper || ["#fff9e4", "#fff4ce", "#f8eab9"];
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

  ctx.shadowColor = theme.frameShadow;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = theme.pageBorder;
  drawCanvasRoundedRect(ctx, x - 18, y - 18, width + 36, height + 36, 76);
  ctx.fill();
  ctx.shadowColor = "transparent";

  const frameGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  frameGradient.addColorStop(0, tintColor(pageTheme.frame, 0.16));
  frameGradient.addColorStop(0.58, pageTheme.frame);
  frameGradient.addColorStop(1, pageTheme.frameDark);
  ctx.fillStyle = frameGradient;
  drawCanvasRoundedRect(ctx, x, y, width, height, 62);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.62)";
  ctx.lineWidth = 8;
  drawCanvasRoundedRect(ctx, x + 14, y + 14, width - 28, height - 28, 50);
  ctx.stroke();

  const paperX = x + 56;
  const paperY = y + 72;
  const paperW = width - 112;
  const paperH = height - 250;
  const paperGradient = ctx.createLinearGradient(0, paperY, 0, paperY + paperH);
  paperGradient.addColorStop(0, "rgba(255, 253, 240, 0.98)");
  paperGradient.addColorStop(0.68, "rgba(255, 248, 223, 0.96)");
  paperGradient.addColorStop(1, "rgba(252, 237, 192, 0.92)");
  ctx.fillStyle = paperGradient;
  drawScallopedPanelPath(ctx, paperX, paperY, paperW, paperH, 48, 28, 9);
  ctx.fill();

  ctx.strokeStyle = pageTheme.innerStroke;
  ctx.lineWidth = 5;
  drawScallopedPanelPath(ctx, paperX, paperY, paperW, paperH, 48, 28, 9);
  ctx.stroke();

  ctx.strokeStyle = theme.pageHighlight;
  ctx.lineWidth = 4;
  drawCanvasRoundedRect(ctx, x + 36, y + 36, width - 72, height - 72, 46);
  ctx.stroke();

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

function drawRightPageTemplate(ctx, palette) {
  const margin = 160;
  const x = 170;
  const y = 136;
  const width = PAGE_TEXTURE_W - margin - 190;
  const height = PAGE_TEXTURE_H - 260;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 5;
  drawCanvasRoundedRect(ctx, x, y, width, height, 42);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(211, 156, 74, 0.26)";
  ctx.lineWidth = 2;
  for (let gx = x + 104; gx < x + width - 70; gx += 126) {
    ctx.beginPath();
    ctx.moveTo(gx, y + 54);
    ctx.lineTo(gx, y + height - 54);
    ctx.stroke();
  }
  for (let gy = y + 106; gy < y + height - 70; gy += 126) {
    ctx.beginPath();
    ctx.moveTo(x + 54, gy);
    ctx.lineTo(x + width - 54, gy);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.62)";
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, x + 24, y + 24, width - 48, height - 48, 34);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.ellipse(x + width * 0.72, y + height * 0.22, 210, 86, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDynamicPageContent(ctx, texture, side, palette, pageNumber = pageNumberForTemplateSide(side)) {
  const pageDef = editorPageDefinitions[pageNumber - 1] || editorPageDefinitions[0] || null;
  if (activeAlbumMode === "collection") {
    const collectionPageDef = collectionPageDefinitions[pageNumber - 1] || collectionPageDefinitions[0] || null;
    drawCollectionAlbumPage(ctx, texture, palette, collectionPageDef, stickersForPage(pageNumber), pageNumber);
    return;
  }
  drawStickerCanvasPage(ctx, texture, palette, pageDef, getPagePlacements(pageNumber), pageNumber);
}

function drawCollectionAlbumPage(ctx, texture, palette, pageDef, stickers, pageNumber) {
  const theme = palette.collection;
  const contentX = 168;
  const contentY = 210;
  const contentW = PAGE_TEXTURE_W - 336;
  const slotBandTop = PAGE_TEXTURE_H - 202;
  const contentH = slotBandTop - contentY - 26;
  const cols = 3;
  const rows = 4;
  const gapX = 28;
  const gapY = 24;
  const cellW = (contentW - gapX * (cols - 1)) / cols;
  const cellH = (contentH - gapY * (rows - 1)) / rows;

  ctx.save();
  ctx.fillStyle = theme.text;
  ctx.font = '800 50px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(pageDef?.label || "シールアルバム", PAGE_TEXTURE_W / 2, 112);
  ctx.fillStyle = palette.sub;
  ctx.font = '800 24px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillText(`${pageNumber} / ${editorPageCount()}`, PAGE_TEXTURE_W / 2, 150);

  for (let i = 0; i < stickers.length; i += 1) {
    const sticker = stickers[i];
    const globalIndex = (pageNumber - 1) * COLLECTION_ALBUM_STICKERS_PER_PAGE + i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = contentX + col * (cellW + gapX);
    const y = contentY + row * (cellH + gapY);
    const found = sticker.unlock === "found";
    drawCollectionStickerCard(ctx, texture, palette, sticker, globalIndex, x, y, cellW, cellH, found, pageNumber);
  }

  if (!stickers.length) {
    ctx.fillStyle = "rgba(51, 68, 71, 0.58)";
    ctx.font = '800 38px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("シールは まだありません", PAGE_TEXTURE_W / 2, PAGE_TEXTURE_H / 2);
  }
  drawCollectionPlacementLayer(ctx, texture, pageNumber);
  ctx.restore();
  texture.needsUpdate = true;
}

function drawCollectionStickerCard(ctx, texture, palette, sticker, index, x, y, width, height, found, pageNumber) {
  const cardTheme = palette.collection.card;
  ctx.save();
  ctx.fillStyle = found ? cardTheme.foundFill : cardTheme.lockedFill;
  ctx.strokeStyle = found ? cardTheme.foundStroke : cardTheme.lockedStroke;
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, x, y, width, height, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = found ? cardTheme.numberFill : "#9aa09b";
  drawCanvasRoundedRect(ctx, x + 14, y + 14, 68, 34, 13);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 20px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(String(index).padStart(2, "0"), x + 48, y + 38);

  const imageSize = Math.min(width - 64, height - 82, 160);
  const imageX = x + (width - imageSize) / 2;
  const imageY = y + 50;
  if (sticker.assetUrl) {
    drawAsyncCollectionStickerImage(ctx, texture, sticker.assetUrl, imageX, imageY, imageSize, imageSize, found, pageNumber);
  } else {
    drawMissingStickerBadge(ctx, imageX, imageY, imageSize, imageSize);
  }

  ctx.fillStyle = found ? palette.collection.text : "rgba(51, 68, 71, 0.54)";
  ctx.font = '800 23px "Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(sticker.label || "シール", x + width / 2, y + height - 24, width - 28);
  ctx.restore();
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
    drawAsyncCollectionPlacedSticker(ctx, texture, placement);
  }
  texture.needsUpdate = true;
}

function drawAsyncCollectionPlacedSticker(ctx, texture, placement) {
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
      texture.needsUpdate = true;
    })
    .catch(() => {});
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
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.decoding = "async";
      image.src = src;
    }));
  }
  return stickerImageCache.get(src);
}

function drawRingHoleGuides(ctx, side) {
  const x = side === "right" ? 38 : PAGE_TEXTURE_W - 38;
  ctx.save();
  for (const pixelY of PAGE_RING_PIXELS) {
    const y = pixelY;
    ctx.fillStyle = "rgba(22, 55, 60, 0.5)";
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.46)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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
  leftMaterial.map = getTexture(BOOK_VARIANTS[activeBook].tabsLeft);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(tabW, PAGE_H), leftMaterial);
  left.position.set(leftEdge + tabCenterOffset, 0, 0);
  left.renderOrder = 3;
  group.add(left);

  const rightMaterial = baseMaterial.clone();
  rightMaterial.map = getTexture(BOOK_VARIANTS[activeBook].tabsRight);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(tabW, PAGE_H), rightMaterial);
  right.position.set(rightEdge - tabCenterOffset, 0, 0);
  right.renderOrder = 3;
  group.add(right);

  return { group, left, right, tabCenterOffset };
}

function positionSideTabs(gap = currentBookGap()) {
  const leftEdge = -PAGE_W - gap / 2;
  const rightEdge = PAGE_W + gap / 2;
  sideTabs.left.position.x = leftEdge + sideTabs.tabCenterOffset;
  sideTabs.right.position.x = rightEdge - sideTabs.tabCenterOffset;
}

function assignSideTabTextures() {
  const bundle = BOOK_VARIANTS[activeBook];
  if (activeAlbumMode === "collection") {
    assignTextureObject(sideTabs.left, getCollectionTabsTexture(activeBook, "left"));
    assignTextureObject(sideTabs.right, getCollectionTabsTexture(activeBook, "right"));
    return;
  }
  assignTexture(sideTabs.left, bundle.tabsLeft);
  assignTexture(sideTabs.right, bundle.tabsRight);
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

  return { side, group, plane, collectionMesh, level: null, book: null };
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
  return `sb3d_${activeBook}_page_thickness_${side}_${assetLevel}.webp`;
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
  const tunePrefix = stack.side === "left" ? "stackLeft" : "stackRight";
  const scaleX = tuning[`${tunePrefix}ScaleX`];
  const scaleY = tuning[`${tunePrefix}ScaleY`];
  stack.plane.scale.set(scaleX, scaleY, 1);
  stack.collectionMesh.scale.set(scaleX, scaleY, 1);

  const isLeft = stack.side === "left";
  const gap = currentBookGap();
  const pageLeft = isLeft ? -PAGE_W - gap / 2 : gap / 2;
  const pageRight = isLeft ? -gap / 2 : PAGE_W + gap / 2;
  const pageCenter = (pageLeft + pageRight) / 2;
  const scaledTextureH = THICKNESS_TEXTURE_H * scaleY;
  const topY = -PAGE_H / 2 + THICKNESS_OVERLAP + tuning[`${tunePrefix}Y`];
  const x = pageCenter + tuning[`${tunePrefix}X`];
  const y = topY - scaledTextureH / 2;
  stack.plane.position.set(x, y, -0.034);
  stack.collectionMesh.position.set(x, y, -0.034);
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
  const baseGeometry = createPageSurfaceGeometry(bindingSide);
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  return subdivided;
}

function createBendablePlainPageSurfaceGeometry() {
  const baseGeometry = createCollectionPageSurfaceGeometry("left");
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  return subdivided;
}

function createCurvedCollectionPageSurfaceGeometry(bindingSide) {
  const baseGeometry = createCollectionPageSurfaceGeometry(bindingSide);
  const source = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry;
  const subdivided = subdivideBendableGeometry(source);
  curveCollectionPageGeometry(subdivided, bindingSide);
  return subdivided;
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

function createPageSurfaceGeometry(bindingSide) {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, 0, -PAGE_H / 2, PAGE_W, PAGE_H, PAGE_RADIUS);

  const holeX = bindingSide === "left" ? PAGE_HOLE_X : PAGE_W - PAGE_HOLE_X;
  for (const pixelY of PAGE_RING_PIXELS) {
    const hole = new THREE.Path();
    const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
    hole.absellipse(holeX, y, PAGE_HOLE_RX, PAGE_HOLE_RY, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

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
    color: 0xcbb783,
    emissive: 0x3b2a12,
    emissiveIntensity: 0.025,
    roughness: 0.76,
    metalness: 0.0,
    transparent: true,
    opacity: 1,
    depthTest: true,
    depthWrite: false,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff5d7,
    transparent: true,
    opacity: 0.2,
    depthTest: true,
    depthWrite: false,
  });

  for (const pixelY of PAGE_RING_PIXELS) {
    const y = PAGE_H / 2 - (pixelY / 1536) * PAGE_H;
    const ring = new THREE.Mesh(createHalfRingTubeGeometry(y), ringMaterial);
    ring.renderOrder = 72;
    group.add(ring);

    const highlight = new THREE.Mesh(createHalfRingHighlightGeometry(y), highlightMaterial);
    highlight.renderOrder = 73;
    group.add(highlight);
  }

  group.userData.ringMaterial = ringMaterial;
  group.userData.highlightMaterial = highlightMaterial;
  return group;
}

function createHalfRingTubeGeometry(baseY) {
  const points = [];
  const span = 0.78;
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const arch = Math.sin(t * Math.PI);
    points.push(
      new THREE.Vector3(
        THREE.MathUtils.lerp(-span / 2, span / 2, t),
        baseY + arch * 0.034,
        0.12 + arch * 0.34,
      ),
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.064, 16, false);
}

function createHalfRingHighlightGeometry(baseY) {
  const points = [];
  const span = 0.62;
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const arch = Math.sin(t * Math.PI);
    points.push(
      new THREE.Vector3(
        THREE.MathUtils.lerp(-span / 2, span / 2, t),
        baseY + 0.026 + arch * 0.03,
        0.16 + arch * 0.33,
      ),
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.007, 6, false);
}

function applyVariantState() {
  const bundle = BOOK_VARIANTS[activeBook];
  assignTexture(leftPageOuter, bundle.coverBack);
  assignTextureObject(leftPageInner, getPageTemplateTexture("left"));
  assignTextureObject(rightPage, getPageTemplateTexture("right"));
  if (activeSurface === "inside") {
    assignTextureObject(frontPage, getPageTemplateTexture("right"));
  } else {
    assignTexture(frontPage, bundle.coverFront);
  }
  if (activeSurface === "inside") {
    assignTextureObject(backPage, getPageTemplateTexture("left"));
  } else {
    assignTexture(backPage, bundle.coverInside);
  }
  assignTexture(closedCover, bundle.coverFront);
  assignCoverTurnTextures();
  assignSpineTexture();
  assignSideTabTextures();
  applyAlbumLayout();
  applyCoverTuning();
  updateFlutterPageTextures();
  slider.disabled = activeSurface === "cover";
  updateControlState();
  updatePage(flipProgress);
  syncUrl();
}

function currentBookGap() {
  return activeAlbumMode === "collection" ? COLLECTION_GUTTER : GUTTER;
}

function applyAlbumLayout() {
  const gap = currentBookGap();
  leftPageOuter.position.x = -PAGE_W - gap / 2;
  leftPageInner.position.x = -PAGE_W - gap / 2;
  rightPage.position.x = gap / 2;
  innerLeft.position.x = -gap / 2;
  innerRight.position.x = gap / 2;
  positionSideTabs(gap);

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
    spine.scale.set(0.3, 1, 1);
    spine.position.y = 0;
    spine.position.z = -0.055;
    spine.renderOrder = 6;
    spine.material.opacity = 0.52;
    return;
  }
  spine.scale.set(1, 1, 1);
  spine.position.y = 0;
  spine.position.z = -0.09;
  spine.renderOrder = 1;
  spine.material.opacity = 1;
  assignTexture(spine, BOOK_VARIANTS[activeBook].spine);
}

function applyRingMaterialTheme() {
  const ringMaterial = ringGroup?.userData?.ringMaterial;
  const highlightMaterial = ringGroup?.userData?.highlightMaterial;
  if (activeAlbumMode !== "collection") {
    if (ringMaterial) {
      ringMaterial.color.setHex(0xcbb783);
      ringMaterial.emissive.setHex(0x3b2a12);
      ringMaterial.emissiveIntensity = 0.025;
      ringMaterial.roughness = 0.76;
      ringMaterial.metalness = 0.0;
      ringMaterial.opacity = 1;
      ringMaterial.needsUpdate = true;
    }
    if (highlightMaterial) {
      highlightMaterial.color.setHex(0xfff5d7);
      highlightMaterial.opacity = 0.2;
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
  for (const pixelY of PAGE_RING_PIXELS) {
    ctx.fillStyle = "rgba(255, 255, 240, 0.32)";
    ctx.beginPath();
    ctx.ellipse(128, pixelY, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(70, 56, 24, 0.16)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(128, pixelY, 54, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
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
  assignTexture(coverTurnFront, bundle.coverFront);
  assignTexture(coverTurnBack, bundle.coverInside);
}

function updateControlState() {
  for (const button of bookButtons) {
    button.classList.toggle("is-active", button.dataset.book === activeBook);
  }
  for (const button of surfaceButtons) {
    button.classList.toggle("is-active", button.dataset.surface === activeSurface);
  }
  updateSpreadJumpControls();
  updateBookPageControls();
  updateAlbumModeUi();
}

function updateAlbumModeUi() {
  document.body.classList.toggle("is-collection-album", activeAlbumMode === "collection");
  if (albumModeToggle) {
    albumModeToggle.textContent = activeAlbumMode === "collection" ? "シールちょう" : "シールアルバム";
    albumModeToggle.setAttribute(
      "aria-label",
      activeAlbumMode === "collection" ? "シールちょうをひらく" : "シールアルバムをひらく",
    );
  }
  updateCollectionStickerTrayVisibility();
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
  const gap = currentBookGap();
  const showBinding = p > 0.52;
  spine.visible = showBinding;
  ringGroup.visible = showBinding;
  innerRight.visible = showBinding && activeAlbumMode !== "collection";
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
  const elapsed = (performance.now() - animation.startTime) / 1000;
  const raw = THREE.MathUtils.clamp(elapsed / animation.duration, 0, 1);
  renderCoverOpenTransition(raw);
  if (raw >= 0.995) {
    coverOpenAnimation = null;
    coverTurn.visible = false;
    flipShadow.visible = true;
    assignTextureObject(frontPage, getPageTemplateTexture("right"));
    assignTextureObject(backPage, getPageTemplateTexture("left"));
    slider.disabled = false;
    updatePage(0);
    updateCollectionStickerTrayVisibility();
    syncUrl();
  }
  return true;
}

function applyBookFramePosition(openProgress) {
  const p = smootherstep(openProgress);
  book.position.x = THREE.MathUtils.lerp(BOOK_COVER_X, BOOK_INSIDE_X, p);
}

function setOpenSpreadVisible(visible) {
  sideTabs.group.visible = visible;
  sideTabs.left.visible = visible;
  sideTabs.right.visible = visible;
  leftPageOuter.visible = false;
  leftPageInner.visible = visible;
  rightPage.visible = visible;
  innerLeft.visible = visible;
  innerRight.visible = visible;
  collectionFold.visible = false;
  pageTurn.visible = visible;
  if (!visible) {
    coverTurn.visible = false;
  }
  spine.visible = visible;
  ringGroup.visible = visible;
  pageStacks.group.visible = visible;
  pageStacks.left.group.visible = visible;
  pageStacks.right.group.visible = visible;
  pageStacks.collection.group.visible = false;
  if (visible && activeAlbumMode === "collection") {
    sideTabs.group.visible = true;
    ringGroup.visible = true;
    innerLeft.visible = false;
    innerRight.visible = false;
    collectionFold.visible = visible;
  }
  if (!visible) {
    flutterPages.group.visible = false;
  }
}

function setCoverOpeningSpreadVisible(visible) {
  sideTabs.group.visible = visible;
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
  ringGroup.visible = false;
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

  const viewW = PAGE_W * 2 + GUTTER + (width < 720 ? 0.68 : 0.42);
  const viewH = PAGE_H + (width < 720 ? 1.88 : 0.88);
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
}

function syncUrl() {
  const next = new URLSearchParams(window.location.search);
  next.set("progress", String(Number(flipProgress.toFixed(3))));
  next.set("spread", String(Number(spreadPosition.toFixed(3))));
  next.set("page", String(activeBookPage));
  next.set("book", activeBook);
  next.set("surface", activeSurface);
  next.set("album", activeAlbumMode);
  if (isPlaying) {
    next.set("play", "1");
  } else {
    next.delete("play");
  }
  const query = next.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
