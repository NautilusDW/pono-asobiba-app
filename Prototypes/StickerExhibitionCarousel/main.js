const BASE_URL = new URL("./", window.location.href);
const CATALOG_URL = new URL("../../assets/data/game-stickers.json", BASE_URL);
const FRAME_BASE_URL = new URL("./assets/sticker-carousel-frame-base-v4.png", BASE_URL);
const STATE_KEY = "pono_game_stickers_v1";

const ROOMS = [
  { id: "creatures", label: "いきもの" },
  { id: "food", label: "たべもの" },
  { id: "sounds", label: "おと" },
  { id: "tools", label: "どうぐ" },
  { id: "characters", label: "キャラ" },
  { id: "space", label: "うちゅう" },
  { id: "special", label: "とくべつ" },
];

const FLOOR_EXITS = [
  { id: "floor2", label: "うえのかい", status: "じゅんびちゅう" },
];

const RARITY_LABEL = {
  normal: "ふつう",
  rare: "レア",
  super: "すごい",
};

const els = {
  loading: document.getElementById("loading"),
  app: document.getElementById("app"),
  backToMap: document.getElementById("backToMap"),
  homeButton: document.getElementById("homeButton"),
  mapScreen: document.getElementById("mapScreen"),
  mapNotice: document.getElementById("mapNotice"),
  screenKicker: document.getElementById("screenKicker"),
  roomTitle: document.getElementById("roomTitle"),
  roomTabs: document.getElementById("roomTabs"),
  countChip: document.getElementById("countChip"),
  carouselShell: document.getElementById("carouselShell"),
  carouselViewport: document.getElementById("carouselViewport"),
  carouselLayer: document.getElementById("carouselLayer"),
  prevButton: document.getElementById("prevButton"),
  nextButton: document.getElementById("nextButton"),
  randomButton: document.getElementById("randomButton"),
  bottomBar: document.getElementById("bottomBar"),
  positionChip: document.getElementById("positionChip"),
  progressFill: document.getElementById("progressFill"),
  detailOverlay: document.getElementById("detailOverlay"),
  detailPanel: document.querySelector(".detail-panel"),
  closeDetail: document.getElementById("closeDetail"),
  detailFrame: document.getElementById("detailFrame"),
  detailImage: document.getElementById("detailImage"),
  detailSerial: document.getElementById("detailSerial"),
  detailName: document.getElementById("detailName"),
  detailTags: document.getElementById("detailTags"),
};

const state = {
  stickers: [],
  filtered: [],
  roomId: "",
  index: 0,
  touchStartX: 0,
  touchStartY: 0,
  touchActive: false,
  lastFocus: null,
  mapNoticeTimer: 0,
};

init();

async function init() {
  try {
    const catalog = await loadCatalog();
    state.stickers = flattenCatalog(catalog);
    applyOwnership(state.stickers);
    renderMapRooms();
    wireEvents();
    const initialRoomId = readInitialRoomId();
    if (initialRoomId) showRoom(initialRoomId, { updateUrl: false });
    else showMap({ updateUrl: false });
    els.loading.hidden = true;
  } catch (error) {
    console.error(error);
    els.loading.classList.add("is-error");
    els.loading.textContent = "よみこめなかったよ";
  }
}

async function loadCatalog() {
  const response = await fetch(`${CATALOG_URL.href}?_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
  return response.json();
}

function flattenCatalog(catalog) {
  const pages = catalog && catalog.pages ? catalog.pages : {};
  const stickers = [];

  Object.entries(pages).forEach(([pageId, page]) => {
    const pageStickers = Array.isArray(page.stickers) ? page.stickers : [];
    pageStickers.forEach((sticker) => {
      if (!sticker || !sticker.id) return;
      const serial = Number.parseInt(sticker.serial || "0", 10) || 0;
      const item = {
        ...sticker,
        serial,
        pageId,
        pageTitle: page.title || "シール",
        imageUrl: resolveAsset(sticker.img),
      };
      item.roomId = assignRoom(item);
      stickers.push(item);
    });
  });

  return stickers.sort((a, b) => a.serial - b.serial);
}

function resolveAsset(path) {
  if (!path) return "";
  if (/^(https?:|data:|\/|\.\.?\/)/.test(path)) return path;
  return new URL(`../../${path}`, BASE_URL).href;
}

function applyOwnership(stickers) {
  const owned = readOwnedIds();
  const useDemo = owned.size === 0;
  stickers.forEach((sticker) => {
    sticker.owned = useDemo ? demoOwned(sticker) : owned.has(sticker.id);
  });
}

function readOwnedIds() {
  const ids = new Set();
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const pages = parsed && parsed.pages && typeof parsed.pages === "object" ? parsed.pages : {};
    Object.values(pages).forEach((page) => {
      const owned = page && page.owned && typeof page.owned === "object" ? page.owned : {};
      Object.entries(owned).forEach(([id, record]) => {
        const count = record && typeof record === "object" ? Number(record.count || 0) : Number(record || 0);
        if (count > 0) ids.add(id);
      });
    });
  } catch (_) {
    return ids;
  }
  return ids;
}

function demoOwned(sticker) {
  if (sticker.pageId === "book-bonus") return sticker.serial % 2 === 0;
  if (sticker.rarity === "super") return sticker.serial % 3 === 0;
  return sticker.serial % 4 !== 0;
}

function renderMapRooms() {
  if (!els.mapScreen) return;
  els.mapScreen.querySelectorAll("[data-room-id]").forEach((button) => {
    const room = ROOMS.find((item) => item.id === button.dataset.roomId);
    if (!room) return;
    const list = state.stickers.filter((sticker) => sticker.roomId === room.id);
    const owned = list.filter((sticker) => sticker.owned).length;
    button.setAttribute("aria-label", `${room.label}のへや`);
    button.replaceChildren(createMapLabel(room.label, `${owned} / ${list.length}`));
  });
  renderMapExits();
}

function renderMapExits() {
  els.mapScreen.querySelectorAll("[data-floor-id]").forEach((button) => {
    const exit = FLOOR_EXITS.find((item) => item.id === button.dataset.floorId);
    if (!exit) return;
    button.setAttribute("aria-label", `${exit.label} ${exit.status}`);
    button.replaceChildren(createMapLabel(exit.label, exit.status));
  });
}

function createSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function createMapLabel(name, count) {
  const label = document.createElement("span");
  label.className = "map-room__label";
  label.append(
    createSpan("map-room__name", name),
    createSpan("map-room__count", count)
  );
  return label;
}

function renderRoomTabs() {
  if (!els.roomTabs) return;
  els.roomTabs.replaceChildren();
  ROOMS.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-tab";
    button.dataset.roomId = room.id;
    button.textContent = room.label;
    button.setAttribute("aria-label", `${room.label}のへや`);
    els.roomTabs.appendChild(button);
  });
}

function selectRoom(roomId) {
  const room = ROOMS.find((item) => item.id === roomId) || ROOMS[0];
  state.roomId = room.id;
  state.filtered = state.stickers.filter((sticker) => sticker.roomId === room.id);
  state.index = firstOwnedIndex(state.filtered);

  els.roomTitle.textContent = room.label;
  document.querySelectorAll(".room-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.roomId === room.id);
    tab.setAttribute("aria-selected", tab.dataset.roomId === room.id ? "true" : "false");
  });

  renderCarousel();
  updateStatus();
}

function showMap({ updateUrl = true } = {}) {
  state.roomId = "";
  state.filtered = [];
  els.app.classList.add("is-map");
  els.app.classList.remove("is-room");
  els.mapScreen.hidden = false;
  els.carouselShell.hidden = true;
  els.bottomBar.hidden = true;
  els.backToMap.hidden = true;
  els.countChip.hidden = true;
  els.screenKicker.textContent = "マップ";
  els.roomTitle.textContent = "シールてんじしつ";
  closeDetail();
  hideMapNotice();
  renderMapRooms();
  if (updateUrl) setRoomUrl("");
}

function showRoom(roomId, { updateUrl = true } = {}) {
  const room = ROOMS.find((item) => item.id === roomId) || ROOMS[0];
  selectRoom(room.id);
  els.app.classList.remove("is-map");
  els.app.classList.add("is-room");
  els.mapScreen.hidden = true;
  els.carouselShell.hidden = false;
  els.bottomBar.hidden = false;
  els.backToMap.hidden = false;
  els.countChip.hidden = false;
  els.screenKicker.textContent = "シールてんじしつ";
  if (updateUrl) setRoomUrl(room.id);
  requestAnimationFrame(updateCarouselLayout);
}

function setRoomUrl(roomId) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.pushState({ roomId }, "", url);
}

function firstOwnedIndex(list) {
  const found = list.findIndex((sticker) => sticker.owned);
  return found >= 0 ? found : 0;
}

function renderCarousel() {
  els.carouselLayer.replaceChildren();
  const list = state.filtered;
  list.forEach((sticker, index) => {
    const item = createCarouselItem(sticker, index);
    els.carouselLayer.appendChild(item);
  });
  updateCarouselLayout();
}

function createCarouselItem(sticker, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "carousel-item";
  button.dataset.index = String(index);
  button.dataset.stickerId = sticker.id;
  if (!sticker.owned) button.classList.add("is-locked");
  button.setAttribute("aria-label", sticker.owned ? sticker.name : "まだ");

  const frame = document.createElement("span");
  frame.className = "display-frame";

  const frameImage = document.createElement("img");
  frameImage.className = "frame-base-image";
  frameImage.src = FRAME_BASE_URL.href;
  frameImage.alt = "";
  frameImage.draggable = false;
  frameImage.loading = "eager";

  const stickerWrap = document.createElement("span");
  stickerWrap.className = "sticker-wrap";

  const img = document.createElement("img");
  img.src = sticker.imageUrl;
  img.alt = sticker.owned ? sticker.name : "";
  img.draggable = false;
  img.loading = "lazy";
  stickerWrap.appendChild(img);

  if (!sticker.owned) {
    const lock = document.createElement("span");
    lock.className = "lock-dot";
    lock.textContent = "?";
    stickerWrap.appendChild(lock);
  }

  frame.append(frameImage, stickerWrap);

  const label = document.createElement("span");
  label.className = "frame-label";
  label.textContent = sticker.owned ? sticker.name : "まだ";

  button.append(frame, label);
  return button;
}

function updateCarouselLayout() {
  const list = state.filtered;
  const total = list.length;
  const viewportWidth = els.carouselViewport.clientWidth || window.innerWidth;
  const step = clamp(viewportWidth * 0.24, 126, 268);

  Array.from(els.carouselLayer.children).forEach((item) => {
    const index = Number(item.dataset.index || 0);
    const offset = wrappedOffset(index, state.index, total);
    const distance = Math.abs(offset);
    const active = offset === 0;
    const visible = distance <= 3;
    const scale = active ? 1 : distance === 1 ? 0.82 : distance === 2 ? 0.68 : 0.54;
    const opacity = visible ? (active ? 1 : distance === 1 ? 0.86 : distance === 2 ? 0.52 : 0.18) : 0;
    const blur = visible ? (distance >= 3 ? 1.8 : 0) : 3;

    item.classList.toggle("is-active", active);
    item.classList.toggle("is-far", !visible);
    item.style.setProperty("--item-x", `${offset * step}px`);
    item.style.setProperty("--item-scale", String(scale));
    item.style.setProperty("--item-opacity", String(opacity));
    item.style.setProperty("--item-blur", `${blur}px`);
    item.style.setProperty("--item-events", visible ? "auto" : "none");
    item.style.zIndex = String(50 - distance);
    item.tabIndex = active ? 0 : -1;
    item.setAttribute("aria-hidden", visible ? "false" : "true");
  });
}

function wrappedOffset(index, activeIndex, total) {
  if (total <= 0) return 0;
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function updateStatus() {
  const list = state.filtered;
  const total = list.length;
  const owned = list.filter((sticker) => sticker.owned).length;
  els.countChip.textContent = `${owned} / ${total}`;
  els.positionChip.textContent = total ? `${state.index + 1} / ${total}` : "0 / 0";
  els.progressFill.style.width = total ? `${((state.index + 1) / total) * 100}%` : "0%";
}

function goTo(index) {
  const total = state.filtered.length;
  if (!total) return;
  state.index = (index + total) % total;
  updateCarouselLayout();
  updateStatus();
}

function next() {
  goTo(state.index + 1);
}

function prev() {
  goTo(state.index - 1);
}

function openDetail(sticker) {
  state.lastFocus = document.activeElement;
  els.detailOverlay.hidden = false;
  els.detailPanel.classList.toggle("is-locked", !sticker.owned);
  els.detailImage.src = sticker.imageUrl;
  els.detailImage.alt = sticker.owned ? sticker.name : "";
  els.detailSerial.textContent = String(sticker.serial || 0).padStart(3, "0");
  els.detailName.textContent = sticker.owned ? sticker.name : "まだ";
  els.detailTags.replaceChildren(
    createTag(sticker.owned ? "あつめた" : "まだ", true),
    createTag(RARITY_LABEL[sticker.rarity] || "ふつう"),
    createTag(roomLabel(sticker.roomId)),
    createTag(sticker.pageTitle || "シール")
  );
  els.closeDetail.focus();
}

function closeDetail() {
  const wasHidden = els.detailOverlay.hidden;
  els.detailOverlay.hidden = true;
  if (!wasHidden && state.lastFocus && typeof state.lastFocus.focus === "function") {
    state.lastFocus.focus();
  }
}

function createTag(text, hot = false) {
  const tag = document.createElement("span");
  tag.className = hot ? "tag is-hot" : "tag";
  tag.textContent = text;
  return tag;
}

function roomLabel(roomId) {
  const room = ROOMS.find((item) => item.id === roomId);
  return room ? room.label : "シール";
}

function wireEvents() {
  els.mapScreen.addEventListener("click", (event) => {
    const button = event.target.closest("[data-room-id]");
    if (button) {
      showRoom(button.dataset.roomId);
      return;
    }
    const floorButton = event.target.closest("[data-floor-id]");
    if (!floorButton) return;
    const exit = FLOOR_EXITS.find((item) => item.id === floorButton.dataset.floorId);
    showMapNotice(exit ? `${exit.label}は ${exit.status}` : "じゅんびちゅう");
  });

  els.backToMap.addEventListener("click", () => {
    showMap();
  });

  els.homeButton.addEventListener("click", () => {
    window.location.assign(new URL("../../play.html", BASE_URL).href);
  });

  if (els.roomTabs) {
    els.roomTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-room-id]");
      if (!button) return;
      showRoom(button.dataset.roomId);
    });
  }

  els.carouselLayer.addEventListener("click", (event) => {
    const button = event.target.closest(".carousel-item");
    if (!button) return;
    const index = Number(button.dataset.index || 0);
    if (index !== state.index) {
      goTo(index);
      return;
    }
    const sticker = state.filtered[state.index];
    if (sticker) openDetail(sticker);
  });

  els.prevButton.addEventListener("click", prev);
  els.nextButton.addEventListener("click", next);
  els.randomButton.addEventListener("click", () => {
    const total = state.filtered.length;
    if (!total) return;
    const nextIndex = Math.floor(Math.random() * total);
    goTo(nextIndex === state.index ? nextIndex + 1 : nextIndex);
  });

  els.carouselViewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const sticker = state.filtered[state.index];
      if (sticker) openDetail(sticker);
    }
  });

  els.carouselViewport.addEventListener("pointerdown", (event) => {
    state.touchStartX = event.clientX;
    state.touchStartY = event.clientY;
    state.touchActive = true;
  });

  els.carouselViewport.addEventListener("pointerup", (event) => {
    if (!state.touchActive) return;
    state.touchActive = false;
    const dx = event.clientX - state.touchStartX;
    const dy = event.clientY - state.touchStartY;
    if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) next();
    else prev();
  });

  els.carouselViewport.addEventListener("pointercancel", () => {
    state.touchActive = false;
  });

  els.closeDetail.addEventListener("click", closeDetail);
  els.detailOverlay.addEventListener("click", (event) => {
    if (event.target === els.detailOverlay) closeDetail();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.detailOverlay.hidden) closeDetail();
  });

  window.addEventListener("popstate", () => {
    const roomId = readInitialRoomId();
    if (roomId) showRoom(roomId, { updateUrl: false });
    else showMap({ updateUrl: false });
  });

  window.addEventListener("resize", updateCarouselLayout);
}

function showMapNotice(message) {
  if (!els.mapNotice) return;
  window.clearTimeout(state.mapNoticeTimer);
  els.mapNotice.textContent = message;
  els.mapNotice.classList.add("is-visible");
  state.mapNoticeTimer = window.setTimeout(hideMapNotice, 1800);
}

function hideMapNotice() {
  if (!els.mapNotice) return;
  window.clearTimeout(state.mapNoticeTimer);
  state.mapNoticeTimer = 0;
  els.mapNotice.classList.remove("is-visible");
}

function assignRoom(sticker) {
  const text = `${sticker.id} ${sticker.name || ""} ${sticker.pageId}`.toLowerCase();

  if (sticker.pageId === "book-bonus") return "special";
  if (sticker.pageId === "starparodier" || hasAny(text, ["rocket", "ロケット", "うちゅう", "わくせい", "スター", "star", "planet", "space", "drone"])) return "space";
  if (sticker.pageId === "oto" || sticker.pageId === "quiz-sound" || hasAny(text, ["おんぷ", "ベル", "たいこ", "ボタン", "おみみ", "うたう", "メガホン", "voice", "ear", "bell", "taiko"])) return "sounds";
  if (hasAny(text, ["ごはん", "たまご", "からあげ", "ブロッコリー", "ウインナー", "いちご", "ランチ", "べんとう", "おかし", "キノコ", "food", "rice", "tamago", "karaage", "broccoli", "wiener", "strawberry", "lunch", "cookie", "mushroom"])) return "food";
  if (hasAny(text, ["スタンプ", "メダル", "バッジ", "はなまる", "badge", "medal", "stamp"])) return "special";
  if (hasAny(text, ["かぎ", "カギ", "はしご", "ランタン", "どんぐりぶくろ", "グローブ", "ピック", "カップ", "メモ", "たて", "しんじゅ", "かい", "すなだま", "あわ", "ふたば", "あのもじ", "key", "ladder", "lantern", "glove", "pick", "cup", "memo", "shield", "pearl", "shell", "sandball", "bubble", "sprout"])) return "tools";
  if (hasAny(text, ["ポノ", "ぽの", "はかせ", "スタッフ", "ミルマル", "ネジ", "ケロッチ", "ガオーン", "ブレイン", "メカ", "ドローン", "おんなのこ", "おとこのこ", "pono", "hakase", "staff", "milmaru", "robot", "gaohn", "brain", "mecha"])) return "characters";
  if (hasAny(text, ["ムシ", "むし", "バッタ", "ちょうちょ", "カニ", "うさぎ", "くじら", "アメンボ", "カブト", "ハチ", "しか", "アライグマ", "わん", "ねこ", "りす", "あひる", "ことり", "カエル", "ヤドカリ", "イソギンチャク", "エビ", "ヒトデ", "マンタ", "ウミガメ", "カブトガニ", "クマノミ", "イカ", "ジンベエ", "タコ", "いぬ", "キリン", "ライオン", "ペンギン", "キツネ", "リス", "こじか", "アヒル", "ハリネズミ", "batta", "chocho", "kani", "rabbit", "kujira", "amenbo", "kabuto", "hachi", "shika", "raccoon", "dog", "cat", "squirrel", "duck", "bird", "frog", "crab", "anemone", "shrimp", "starfish", "manta", "turtle", "fish", "squid", "whale", "octopus", "giraffe", "lion", "penguin", "fox", "hedgehog"])) return "creatures";
  if (sticker.pageId === "puzzle" || sticker.pageId === "writing-mori") return "characters";
  return "tools";
}

function readInitialRoomId() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("room") || params.get("category") || window.location.hash.replace("#", "");
  if (ROOMS.some((room) => room.id === requested)) return requested;
  return "";
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(String(needle).toLowerCase()));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
