const TOTAL_QUESTIONS = 5;
const DATA_URL = "../assets/data/quiz-sound-animals.json";
const STORAGE_KEYS = {
  difficulty: "pono_forestdex_difficulty_v1",
  collection: "pono_forestdex_collection_v1",
  lastTarget: "pono_forestdex_last_target_v1",
};

const EXTRA_NATURE_CHOICES = [
  { id: "mushroom", name: "きのこ", img: "../assets/images/ocean/Mushroom/Mushroom_normal_1.png", kind: "nature" },
  { id: "butterfly", name: "ちょうちょ", img: "../assets/images/ocean/Butterfly/Butterfly_normal_1.png", kind: "insect" },
  { id: "bee", name: "はち", img: "../assets/images/ocean/Bee/Bee_normal_1.png", kind: "insect" },
  { id: "ant", name: "あり", img: "../assets/images/ocean/Ant/Ant_normal_1.png", kind: "insect" },
  { id: "ladybird", name: "てんとうむし", img: "../assets/images/ocean/Ladybird/Ladybird_normal_1.png", kind: "insect" },
  { id: "cherry", name: "さくらんぼ", img: "../assets/images/ocean/Cherry/Cherry_normal_1.png", kind: "nature" },
  { id: "grapes", name: "ぶどう", img: "../assets/images/ocean/Grapes/Grapes_normal_1.png", kind: "nature" },
  { id: "lemon", name: "れもん", img: "../assets/images/ocean/Lemon/Lemon_normal_1.png", kind: "nature" },
  { id: "watermelon", name: "すいか", img: "../assets/images/ocean/Watermelon/Watermelon_normal_1.png", kind: "nature" },
];

const GROUP_BY_ID = {
  cat: "mammal",
  dog: "mammal",
  cow: "mammal",
  frog: "waterside",
  horse: "mammal",
  lion: "mammal",
  wolf: "mammal",
  pig: "mammal",
  goat: "mammal",
  sheep: "mammal",
  boar: "mammal",
  sea_lion: "waterside",
  otter: "waterside",
  crow: "bird",
  chicken: "bird",
  chick: "bird",
  pigeon: "bird",
  duck: "bird",
  sparrow: "bird",
  cuckoo: "bird",
  eagle: "bird",
  kite: "bird",
  peacock: "bird",
  heron: "bird",
  warbler: "bird",
  cicada: "insect",
  cricket: "insect",
};

const SHAPE_TEXT_BY_GROUP = {
  mammal: "まるい みみや しっぽが よくみえるよ",
  bird: "はねや くちばしの かたちが わかるよ",
  insect: "ちいさな あしや はねの かたちが みえるよ",
  waterside: "からだの まるみや ながれを みつけたよ",
  nature: "いろや かたちを よく おぼえたよ",
};

const NOTE_BY_GROUP = {
  mammal: "ポノと いっしょに もりを あるく なかまだよ。",
  bird: "もりの うえから すてきな こえを とどけてくれるよ。",
  insect: "ちいさくても もりを にぎやかに してくれるよ。",
  waterside: "みずべや しげみで こっそり くらしているよ。",
  nature: "もりの てがかりとして ずかんに のこしておこう。",
};

const QUESTION_META = {
  name: { badge: "なまえ", kicker: "なまえを みつけよう" },
  voice: { badge: "こえ", kicker: "こえを きいてみよう" },
  shape: { badge: "すがた", kicker: "かげを みてみよう" },
  choose: { badge: "おさらい", kicker: "ポノの メモを たしかめよう" },
};

const refs = {
  titleScreen: document.getElementById("title-screen"),
  gameScreen: document.getElementById("game-screen"),
  resultScreen: document.getElementById("result-screen"),
  startButton: document.getElementById("start-button"),
  openCollectionButton: document.getElementById("open-collection-button"),
  backToTitleButton: document.getElementById("back-to-title-button"),
  resultBackButton: document.getElementById("result-back-button"),
  titleReturnButton: document.getElementById("title-return-button"),
  playAgainButton: document.getElementById("play-again-button"),
  difficultyButtons: Array.from(document.querySelectorAll("[data-difficulty]")),
  questionCounter: document.getElementById("question-counter"),
  correctCounter: document.getElementById("correct-counter"),
  progressTrack: document.getElementById("progress-track"),
  questionTypeBadge: document.getElementById("question-type-badge"),
  questionKicker: document.getElementById("question-kicker"),
  questionText: document.getElementById("question-text"),
  choicesGrid: document.getElementById("choices-grid"),
  feedbackText: document.getElementById("feedback-text"),
  nextButton: document.getElementById("next-button"),
  pageHeroImage: document.getElementById("page-hero-image"),
  voiceStage: document.getElementById("voice-stage"),
  playSoundButton: document.getElementById("play-sound-button"),
  entryNameValue: document.getElementById("entry-name-value"),
  entryVoiceValue: document.getElementById("entry-voice-value"),
  entryShapeValue: document.getElementById("entry-shape-value"),
  memoText: document.getElementById("memo-text"),
  resultTitle: document.getElementById("result-title"),
  resultCorrectLabel: document.getElementById("result-correct-label"),
  resultCorrect: document.getElementById("result-correct"),
  resultEntryLabel: document.getElementById("result-entry-label"),
  resultEntryName: document.getElementById("result-entry-name"),
  resultHeroImage: document.getElementById("result-hero-image"),
  resultNameValue: document.getElementById("result-name-value"),
  resultVoiceValue: document.getElementById("result-voice-value"),
  resultShapeValue: document.getElementById("result-shape-value"),
  resultNote: document.getElementById("result-note"),
  collectionGrid: document.getElementById("collection-grid"),
};

const state = {
  difficulty: loadDifficulty(),
  allAnimals: [],
  filteredAnimals: [],
  collection: loadCollection(),
  currentTarget: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  correctCount: 0,
  answered: false,
  lastSelectedEntryId: null,
  discovery: makeDiscovery(),
  rewardTriggered: false,
};

let voiceAudio = null;

function makeDiscovery() {
  return {
    name: false,
    voice: false,
    shape: false,
    bonus: 0,
  };
}

function loadDifficulty() {
  try {
    return localStorage.getItem(STORAGE_KEYS.difficulty) || "easy";
  } catch (error) {
    return "easy";
  }
}

function saveDifficulty(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.difficulty, value);
  } catch (error) {
    console.warn("[forestdex] failed to save difficulty", error);
  }
}

function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.collection);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveCollection() {
  try {
    localStorage.setItem(STORAGE_KEYS.collection, JSON.stringify(state.collection));
  } catch (error) {
    console.warn("[forestdex] failed to save collection", error);
  }
}

function setLastTarget(id) {
  try {
    localStorage.setItem(STORAGE_KEYS.lastTarget, id);
  } catch (error) {
    console.warn("[forestdex] failed to save last target", error);
  }
}

function getLastTarget() {
  try {
    return localStorage.getItem(STORAGE_KEYS.lastTarget) || "";
  } catch (error) {
    return "";
  }
}

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function sample(list, count, excludeIds = new Set()) {
  const filtered = list.filter((item) => !excludeIds.has(item.id));
  return shuffle(filtered).slice(0, count);
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getGroup(id, fallbackKind = "nature") {
  return GROUP_BY_ID[id] || fallbackKind;
}

function getShapeText(entry) {
  return entry.shapeText || SHAPE_TEXT_BY_GROUP[entry.group] || "かたちを よく みつけたよ";
}

function getNoteText(entry) {
  return entry.note || NOTE_BY_GROUP[entry.group] || "ポノが みつけた たいせつな てがかりだよ。";
}

function getVoiceText(entry) {
  if (entry.voiceText) return entry.voiceText;
  return "こえを きいて おぼえたよ";
}

async function ensureAnimalsLoaded() {
  if (state.allAnimals.length) return;
  const response = await fetch(`${DATA_URL}?_=${Date.now()}`, { cache: "no-store" });
  const data = await response.json();
  const animals = Array.isArray(data.animals) ? data.animals : [];
  state.allAnimals = animals
    .filter((animal) => animal.enabled !== false && animal.sound)
    .map((animal) => ({
      id: animal.id,
      name: animal.name,
      img: `../${animal.img}`,
      sound: `../${animal.sound}`,
      kind: "animal",
      group: getGroup(animal.id, "mammal"),
      easy: animal.easy !== false,
      normal: animal.normal !== false,
      shapeText: SHAPE_TEXT_BY_GROUP[getGroup(animal.id, "mammal")],
      note: NOTE_BY_GROUP[getGroup(animal.id, "mammal")],
    }));
  applyDifficultyFilter();
}

function applyDifficultyFilter() {
  state.filteredAnimals = state.allAnimals.filter((animal) => {
    if (state.difficulty === "easy") return Boolean(animal.easy);
    return Boolean(animal.normal);
  });
}

function chooseTarget() {
  const pool = state.filteredAnimals.length ? state.filteredAnimals : state.allAnimals;
  const lastId = getLastTarget();
  let candidates = pool.filter((entry) => entry.id !== lastId);
  if (!candidates.length) candidates = pool.slice();
  const next = shuffle(candidates)[0];
  setLastTarget(next.id);
  return next;
}

function buildTextChoices(target, pool, extraPool = []) {
  const merged = uniqueById([target, ...pool, ...extraPool]);
  const others = sample(merged, 3, new Set([target.id]));
  return shuffle([target, ...others]).map((entry) => ({
    id: entry.id,
    label: entry.name,
    img: entry.img,
    type: "text",
  }));
}

function buildImageChoices(target, pool) {
  const others = sample(pool, 3, new Set([target.id]));
  return shuffle([target, ...others]).map((entry) => ({
    id: entry.id,
    label: entry.name,
    img: entry.img,
    type: "image",
  }));
}

function buildQuestionSet(target) {
  const animalPool = state.filteredAnimals.length ? state.filteredAnimals : state.allAnimals;
  const mixedTextPool = uniqueById([...animalPool, ...EXTRA_NATURE_CHOICES]);
  const harderPool = sample(animalPool, 8, new Set([target.id]));
  const reviewType = Math.random() > 0.5 ? "voice-review" : "shape-review";

  return [
    {
      id: "name",
      mode: "text",
      artMode: "image",
      reward: "name",
      badge: QUESTION_META.name.badge,
      kicker: QUESTION_META.name.kicker,
      prompt: "この なまえは どれかな？",
      memo: "えを よく みて、 なまえを えらぼう。",
      correctMemo: "「なまえ」が ずかんに かきこまれたよ！",
      wrongMemo: "ざんねん。つぎの てがかりも あつめてみよう。",
      choices: buildTextChoices(target, animalPool, EXTRA_NATURE_CHOICES),
    },
    {
      id: "voice",
      mode: "text",
      artMode: "voice",
      reward: "voice",
      badge: QUESTION_META.voice.badge,
      kicker: QUESTION_META.voice.kicker,
      prompt: "こえを きいて、 だれか あてよう。",
      memo: "みみを すませて こえを きいてみよう。",
      correctMemo: "「こえ」の らんが ひかったよ！",
      wrongMemo: "こえは つぎの チャンスで また きいてみよう。",
      choices: buildTextChoices(target, harderPool, []),
      autoPlay: true,
    },
    {
      id: "shape",
      mode: "text",
      artMode: "silhouette",
      reward: "shape",
      badge: QUESTION_META.shape.badge,
      kicker: QUESTION_META.shape.kicker,
      prompt: "かげを みて、 なまえを あてよう。",
      memo: "みみや しっぽの かたちを よく みてね。",
      correctMemo: "「すがた」の らんが ふえたよ！",
      wrongMemo: "かげは むずかしいね。つぎも しらべてみよう。",
      choices: buildTextChoices(target, animalPool, EXTRA_NATURE_CHOICES),
    },
    {
      id: "pick",
      mode: "image",
      artMode: "image",
      reward: "bonus",
      badge: QUESTION_META.choose.badge,
      kicker: QUESTION_META.choose.kicker,
      prompt: `「${target.name}」は どれかな？`,
      memo: "ポノの メモを みながら えらんでみよう。",
      correctMemo: "ページの しあげが すすんだよ！",
      wrongMemo: "もう すこしで ぴったりだったね。",
      choices: buildImageChoices(target, animalPool),
    },
    reviewType === "voice-review"
      ? {
          id: "voice-review",
          mode: "text",
          artMode: "voice",
          reward: "bonus",
          badge: QUESTION_META.voice.badge,
          kicker: "さいごの こえクイズ",
          prompt: "もう いちど こえを きいてみよう。",
          memo: "さいごの 1もん。こえで たしかめよう。",
          correctMemo: "さいごの スタンプが おされたよ！",
          wrongMemo: "ページは みつかったよ。つぎは もっと しらべよう。",
          choices: buildTextChoices(target, harderPool, []),
          autoPlay: true,
        }
      : {
          id: "shape-review",
          mode: "image",
          artMode: "silhouette",
          reward: "bonus",
          badge: QUESTION_META.shape.badge,
          kicker: "さいごの かげクイズ",
          prompt: "この かげの なかまは どれかな？",
          memo: "かげを おぼえていたら ばっちりだよ。",
          correctMemo: "さいごの スタンプが おされたよ！",
          wrongMemo: "ページは ひらいたよ。つぎも みつけよう。",
          choices: buildImageChoices(target, animalPool),
        },
  ];
}

function renderProgress() {
  refs.progressTrack.innerHTML = "";
  for (let index = 0; index < TOTAL_QUESTIONS; index += 1) {
    const dot = document.createElement("span");
    dot.className = "progress-dot";
    if (index < state.currentQuestionIndex) dot.classList.add("is-done");
    if (index === state.currentQuestionIndex) dot.classList.add("is-active");
    refs.progressTrack.appendChild(dot);
  }
}

function showScreen(name) {
  refs.titleScreen.classList.toggle("hidden", name !== "title");
  refs.gameScreen.classList.toggle("hidden", name !== "game");
  refs.resultScreen.classList.toggle("hidden", name !== "result");
}

function stopVoiceAudio() {
  if (!voiceAudio) return;
  try {
    voiceAudio.pause();
    voiceAudio.currentTime = 0;
  } catch (error) {
    console.warn("[forestdex] failed to stop voice audio", error);
  }
}

function playVoice(entry) {
  if (!entry || !entry.sound) return;
  stopVoiceAudio();
  voiceAudio = new Audio(entry.sound);
  voiceAudio.volume = 1;
  voiceAudio.play().catch(() => {});
}

function renderPageHero(question) {
  refs.pageHeroImage.classList.add("hidden");
  refs.pageHeroImage.classList.remove("is-silhouette");
  refs.voiceStage.classList.add("hidden");

  if (question.artMode === "voice") {
    refs.voiceStage.classList.remove("hidden");
    return;
  }

  refs.pageHeroImage.src = state.currentTarget.img;
  refs.pageHeroImage.alt = state.currentTarget.name;
  if (question.artMode === "silhouette") {
    refs.pageHeroImage.classList.add("is-silhouette");
  }
  refs.pageHeroImage.classList.remove("hidden");
}

function renderDiscoveryRows() {
  const rows = document.querySelectorAll(".page-row");
  rows.forEach((row) => row.classList.remove("is-filled"));

  refs.entryNameValue.textContent = state.discovery.name ? state.currentTarget.name : "???";
  refs.entryVoiceValue.textContent = state.discovery.voice ? getVoiceText(state.currentTarget) : "まだ しらべちゅう";
  refs.entryShapeValue.textContent = state.discovery.shape ? getShapeText(state.currentTarget) : "まだ しらべちゅう";

  if (state.discovery.name) rows[0].classList.add("is-filled");
  if (state.discovery.voice) rows[1].classList.add("is-filled");
  if (state.discovery.shape) rows[2].classList.add("is-filled");
}

function renderChoices(question) {
  refs.choicesGrid.innerHTML = "";
  question.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = choice.type === "image" ? "choice-card choice-card--image" : "choice-card choice-card--text";
    button.dataset.choiceId = choice.id;

    if (choice.type === "image") {
      const thumb = document.createElement("img");
      thumb.className = "choice-card__thumb";
      thumb.src = choice.img;
      thumb.alt = choice.label;
      const label = document.createElement("span");
      label.className = "choice-card__caption";
      label.textContent = choice.label;
      button.append(thumb, label);
    } else {
      const label = document.createElement("span");
      label.className = "choice-card__label";
      label.textContent = choice.label;
      button.appendChild(label);
    }

    button.addEventListener("click", () => handleChoice(question, choice));
    refs.choicesGrid.appendChild(button);
  });
}

function setFeedback(text, stateName = "") {
  refs.feedbackText.textContent = text;
  refs.feedbackText.classList.toggle("is-correct", stateName === "correct");
  refs.feedbackText.classList.toggle("is-wrong", stateName === "wrong");
}

function renderQuestion() {
  state.answered = false;
  const question = state.currentQuestions[state.currentQuestionIndex];
  refs.questionCounter.textContent = `${state.currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
  refs.correctCounter.textContent = String(state.correctCount);
  refs.questionTypeBadge.textContent = question.badge;
  refs.questionKicker.textContent = question.kicker;
  refs.questionText.textContent = question.prompt;
  refs.memoText.textContent = question.memo;
  refs.nextButton.classList.add("hidden");
  renderProgress();
  renderPageHero(question);
  renderDiscoveryRows();
  renderChoices(question);
  setFeedback("こたえを えらぼう");
  stopVoiceAudio();
  if (question.autoPlay) {
    window.setTimeout(() => playVoice(state.currentTarget), 260);
  }
}

function unlockReward(question) {
  if (question.reward === "name") state.discovery.name = true;
  if (question.reward === "voice") state.discovery.voice = true;
  if (question.reward === "shape") state.discovery.shape = true;
  if (question.reward === "bonus") state.discovery.bonus += 1;
}

function handleChoice(question, choice) {
  if (state.answered) return;
  state.answered = true;
  const isCorrect = choice.id === state.currentTarget.id;
  const buttons = Array.from(refs.choicesGrid.querySelectorAll(".choice-card"));

  buttons.forEach((button) => {
    button.classList.add("is-disabled");
    button.disabled = true;
    if (button.dataset.choiceId === state.currentTarget.id) {
      button.classList.add("is-correct");
    } else if (button.dataset.choiceId === choice.id && !isCorrect) {
      button.classList.add("is-wrong");
    }
  });

  if (isCorrect) {
    state.correctCount += 1;
    unlockReward(question);
    refs.correctCounter.textContent = String(state.correctCount);
    refs.memoText.textContent = question.correctMemo;
    setFeedback("いいね！ ポノの ずかんが ひらいてきたよ。", "correct");
  } else {
    refs.memoText.textContent = question.wrongMemo;
    setFeedback(`せいかいは 「${state.currentTarget.name}」だよ。`, "wrong");
  }

  renderDiscoveryRows();
  refs.nextButton.classList.remove("hidden");
  stopVoiceAudio();
}

function buildRecord(entry) {
  return {
    id: entry.id,
    name: entry.name,
    img: entry.img,
    voice: getVoiceText(entry),
    shape: getShapeText(entry),
    note: getNoteText(entry),
    group: entry.group,
  };
}

function upsertCollectionRecord() {
  const current = state.collection[state.currentTarget.id] || {
    ...buildRecord(state.currentTarget),
    fields: { name: false, voice: false, shape: false },
    bestCorrect: 0,
    unlockedAt: Date.now(),
    seenCount: 0,
  };

  current.fields.name = current.fields.name || state.discovery.name;
  current.fields.voice = current.fields.voice || state.discovery.voice;
  current.fields.shape = current.fields.shape || state.discovery.shape;
  current.bestCorrect = Math.max(current.bestCorrect || 0, state.correctCount);
  current.seenCount = (current.seenCount || 0) + 1;
  current.unlockedAt = current.unlockedAt || Date.now();
  current.note = getNoteText(state.currentTarget);
  current.voice = getVoiceText(state.currentTarget);
  current.shape = getShapeText(state.currentTarget);
  state.collection[state.currentTarget.id] = current;
  state.lastSelectedEntryId = state.currentTarget.id;
  saveCollection();
}

function getCollectionEntries() {
  return Object.values(state.collection).sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
}

function renderCollectionGrid() {
  const entries = getCollectionEntries();
  const selectedId = state.lastSelectedEntryId || (entries[0] && entries[0].id) || "";
  refs.collectionGrid.innerHTML = "";

  entries.slice(0, 9).forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collection-card";
    if (entry.id === selectedId) button.classList.add("is-selected");
    const img = document.createElement("img");
    img.src = entry.img;
    img.alt = entry.name;
    const label = document.createElement("span");
    label.className = "collection-card__label";
    label.textContent = entry.name;
    button.append(img, label);
    button.addEventListener("click", () => {
      state.lastSelectedEntryId = entry.id;
      renderResultPage(entry.id);
    });
    refs.collectionGrid.appendChild(button);
  });

  for (let fill = entries.length; fill < 9; fill += 1) {
    const empty = document.createElement("div");
    empty.className = "collection-card is-empty";
    refs.collectionGrid.appendChild(empty);
  }
}

function renderResultPage(entryId) {
  const entries = getCollectionEntries();
  const entry = entryId ? state.collection[entryId] : entries[0];
  renderCollectionGrid();

  if (!entry) {
    refs.resultTitle.textContent = "まだ 1ページも みつかっていないよ";
    refs.resultCorrect.textContent = "0 / 5";
    refs.resultEntryName.textContent = "これから あつめよう";
    refs.resultHeroImage.classList.add("is-hidden-visual");
    refs.resultNameValue.textContent = "-";
    refs.resultVoiceValue.textContent = "-";
    refs.resultShapeValue.textContent = "-";
    refs.resultNote.textContent = "ポノと いっしょに もりへ でかけよう。";
    return;
  }

  refs.resultHeroImage.classList.remove("is-hidden-visual");
  refs.resultHeroImage.src = entry.img;
  refs.resultHeroImage.alt = entry.name;
  refs.resultEntryName.textContent = entry.name;
  refs.resultNameValue.textContent = entry.fields.name ? entry.name : "つぎに しらべよう";
  refs.resultVoiceValue.textContent = entry.fields.voice ? entry.voice : "つぎに きいてみよう";
  refs.resultShapeValue.textContent = entry.fields.shape ? entry.shape : "つぎに みてみよう";
  refs.resultNote.textContent = entry.note;
}

function maybeTriggerFirstClearReward() {
  if (state.rewardTriggered) return;
  state.rewardTriggered = true;
  if (window.triggerFirstClearReward) {
    window.triggerFirstClearReward("wordmatch", {
      onClose: null,
    }).catch(() => {});
  }
}

function showResultScreen() {
  upsertCollectionRecord();
  refs.resultTitle.textContent = "ずかんに とうろくされたよ！";
  refs.resultCorrectLabel.textContent = "せいかい";
  refs.resultCorrect.textContent = `${state.correctCount} / ${TOTAL_QUESTIONS}`;
  refs.resultEntryLabel.textContent = "みつけた なかま";
  refs.resultEntryName.textContent = state.currentTarget.name;
  showScreen("result");
  renderResultPage(state.currentTarget.id);
  maybeTriggerFirstClearReward();
}

function nextQuestion() {
  if (state.currentQuestionIndex >= TOTAL_QUESTIONS - 1) {
    showResultScreen();
    return;
  }
  state.currentQuestionIndex += 1;
  renderQuestion();
}

function resetRunState() {
  state.currentTarget = chooseTarget();
  state.currentQuestions = buildQuestionSet(state.currentTarget);
  state.currentQuestionIndex = 0;
  state.correctCount = 0;
  state.discovery = makeDiscovery();
}

async function startGame() {
  await ensureAnimalsLoaded();
  if (state.filteredAnimals.length < 4) {
    alert("あそべる なかまが まだ すくないよ。");
    return;
  }
  resetRunState();
  showScreen("game");
  renderQuestion();
}

function showCollectionOnly() {
  showScreen("result");
  refs.resultTitle.textContent = "ポノの もりずかん";
  refs.resultCorrectLabel.textContent = "ページ";
  refs.resultCorrect.textContent = `${getCollectionEntries().length}`;
  refs.resultEntryLabel.textContent = "ずかん";
  refs.resultEntryName.textContent = getCollectionEntries().length ? "あつめた なかま" : "これから あつめよう";
  renderResultPage(state.lastSelectedEntryId);
}

function bindEvents() {
  refs.startButton.addEventListener("click", startGame);
  refs.openCollectionButton.addEventListener("click", () => {
    stopVoiceAudio();
    showCollectionOnly();
  });
  refs.backToTitleButton.addEventListener("click", () => {
    stopVoiceAudio();
    showScreen("title");
  });
  refs.resultBackButton.addEventListener("click", () => {
    stopVoiceAudio();
    showScreen("title");
  });
  refs.titleReturnButton.addEventListener("click", () => {
    stopVoiceAudio();
    showScreen("title");
  });
  refs.playAgainButton.addEventListener("click", startGame);
  refs.nextButton.addEventListener("click", nextQuestion);
  refs.playSoundButton.addEventListener("click", () => playVoice(state.currentTarget));
  refs.difficultyButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.difficulty === state.difficulty);
    button.addEventListener("click", () => {
      state.difficulty = button.dataset.difficulty;
      refs.difficultyButtons.forEach((target) => {
        target.classList.toggle("is-active", target === button);
      });
      saveDifficulty(state.difficulty);
      applyDifficultyFilter();
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopVoiceAudio();
  });
}

async function init() {
  bindEvents();
  await ensureAnimalsLoaded();
}

init().catch((error) => {
  console.error("[forestdex] init failed", error);
  alert("もりずかんを よみこめませんでした。");
});
