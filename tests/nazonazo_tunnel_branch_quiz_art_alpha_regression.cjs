#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const sources = Object.freeze({
  registry: read("nazonazo-tunnel/data/quiz-art.js"),
  questions: read("nazonazo-tunnel/data/questions.js"),
  game: read("nazonazo-tunnel/js/game.js"),
  css: read("nazonazo-tunnel/styles.css"),
  html: read("nazonazo-tunnel/index.html")
});

const TOKEN = "20260721-1409";
const RUNTIME_TOKEN = "20260723-1429";
const REGISTRY_VERSION = "20260721-1407";
const THREE_MIB = 3 * 1024 * 1024;
const ASSET_ROOT = "assets/images/nazonazo-tunnel/quiz-art";
const RAW_ROOT = "tmp/alpha_pending/1373-nazonazo-branch-quiz-art";
const ALPHA_ROOT = "tmp/alpha_pending/1407b-nazonazo-branch-quiz-art-alpha";
const SUPPLEMENTAL_RAW_ROOT = "tmp/alpha_pending/1407d-nazonazo-snow-fire-quiz-art";
const SUPPLEMENTAL_ALPHA_ROOT = "tmp/alpha_pending/1407e-nazonazo-snow-fire-quiz-art-alpha";

// id, exact composite key, raw basename, canonical basename, raw bytes/SHA,
// canonical width/height/bytes/SHA. These constants deliberately lock the
// accepted GPT Image 2 response lineage and the reviewed lossless-alpha bytes.
const ORIGINAL_ROWS = Object.freeze([
  ["01-dinosaur", "🦕|きょうりゅう", "01_dinosaur.png", "quiz_dinosaur_20260721.webp", 1471377, "ab69a8fe6e40e496efc1139c6b919c93b8bd16239cff7b3ce98c9233998b5634", 1154, 1180, 669052, "f3770c69b2d872749ad28bc4f21e5770448878a9585e41435a8236507994127f"],
  ["02-scorpion", "🦂|さそり", "02_scorpion.png", "quiz_scorpion_20260721.webp", 1277619, "a0b2b50a6a5b8aeebfd0f6c37b5f5d5c744a1fe88d1e159589a58140b04fa594", 1124, 990, 557766, "4a9c6404760c9d2478569ccff96774a489b01adfd1d90ae7916caba1a0237dd9"],
  ["03-lizard", "🦎|とかげ", "03_lizard.png", "quiz_lizard_20260721.webp", 1051911, "6a358233e0bf975c1f548020c4cadea4a9ac527eeb35322611feb89ac9ebcef8", 1124, 756, 432556, "cb9dc95cc65953c8c68904bafa976a13824bdbcf58c336bd65546095f2d59cde"],
  ["04-volcano", "🌋|かざん", "04_volcano.png", "quiz_volcano_20260721.webp", 1653490, "5133c0c8bb55f3a7c269cf772e1b334e5ae04f3b3be3cdd7b78dbaf0872e80dd", 1146, 1175, 743256, "3d169983d3558cd8742e4d9a53f037980ac1cf80ea227c21d9a890062d60943b"],
  ["05-dinosaur-egg", "🥚|たまご", "05_dinosaur_egg.png", "quiz_dinosaur_egg_20260721.webp", 1600313, "ac9c7887cd315cc7de0225d15770a7442c26b5ebc61229dbc683f30c8c29a732", 828, 1105, 793218, "dfaf123e95057a473b8e7556e6a3a62dc380558f4ad12f640abb0217f189277f"],
  ["06-jigsaw-puzzle", "🧩|ぱずる", "06_jigsaw_puzzle.png", "quiz_jigsaw_puzzle_20260721.webp", 1495396, "0b9ac7045a9e3f591b347c178d8b11452b34d49a6d139fa8444c3fa90ee8fb7e", 1037, 1013, 858220, "efa897a5fa8a16b92d21c1bb7ff8c239b66cecde9fa7cdf8ebc64c17407fae8f"],
  ["07-yoyo", "🪀|よーよー", "07_yoyo.png", "quiz_yoyo_20260721.webp", 1418021, "97af05c0e5f0bcf3f0c4614abbd544100b4639eb64dd719dc88d2b16012d7245", 747, 1146, 629462, "cd76356cefe321c1542421ee299390a0f95046dedfdcd74b61deba8b8fa4c19c"],
  ["08-cat", "🐱|ねこ", "08_cat.png", "quiz_cat_20260721.webp", 1745831, "d757b343884df727fe2f0198e24143accb2cb9325957b68c87f3f51b40371551", 813, 1204, 812316, "c3cb6234e2cdc258e6c4b3f445461df91f20a8fe7fcf42085f7045448304957b"],
  ["09-yarn-ball", "🧶|けいとだま", "09_yarn_ball.png", "quiz_yarn_ball_20260721.webp", 1567738, "b438b8b680a478513e6b22c9d62826cf344b3ea532e4145e64da00acf0d18472", 1017, 966, 844986, "e92f513c51748e0d0f30842d8481ae57c2acb1bc8bc166860b7c13b7ecb7473d"],
  ["10-milk", "🥛|ぎゅうにゅう", "10_milk.png", "quiz_milk_20260721.webp", 1222303, "a7b634765d371b2bcca0443b597eabe3bc9c2f3564783d9297642114060909cc", 770, 1041, 629832, "02fbbc03131685d6e542f1e677a63785125d74c2c1cd2b501aacd726ecd46269"],
  ["11-pawprints", "🐾|あしあと", "11_pawprints.png", "quiz_pawprints_20260721.webp", 983372, "f989de34ff8bc3e1a52c087e750b6591bffa0d2c6ee8c5714b847fafe0dbf409", 1021, 938, 245314, "ef48d07de008d60ef8a36fe68e295b17e35e9ad0cc024563a292613a97506a1e"],
  ["12-unicorn", "🦄|ゆにこーん", "12_unicorn.png", "quiz_unicorn_20260721.webp", 1169757, "5bdef2247643097d1323b57eb0b51f1deb6ba8a962bfa70db034132d55985235", 954, 1132, 578954, "5dc73c848ecb9fcdfcb1554cfe4fca382c848112b696cda904c494df9beab2ef"],
  ["13-rainbow", "🌈|にじ", "13_rainbow.png", "quiz_rainbow_20260721.webp", 1597147, "a37641d85619864568494af352a379f270f6e60f97dc066cf5d20b7e7cca5d1b", 1254, 800, 883046, "285b8c97a128dc87b7bba91730d606f8183fe4bc5ce48756505ce259f3524122"],
  ["14-magic-wand", "🪄|まほうのつえ", "14_magic_wand.png", "quiz_magic_wand_20260721.webp", 986664, "eb67a1c3eb4670a977ab656362b8bf0c3a75b62d6a4302501f659ffc86409f56", 828, 1128, 219110, "d6224ede99262e18e1bb057476c450ecdb2be6f8f5ca0ff09ed6506dc84e37ce"],
  ["15-fairy", "🧚|ようせい", "15_fairy.png", "quiz_fairy_20260721.webp", 1293871, "80a4e37895bc76a5286ad753086c53b3496c93e46ab0da4b6ec971fbcc173c2b", 992, 1114, 630944, "1bfd0721664cd7d9ee9ff4dd21b2dfa1dcf1600e67ee2d24ab86bc191a101f6d"],
  ["16-cloud", "☁️|くも", "16_cloud.png", "quiz_cloud_20260721.webp", 1146635, "01f3f960e76252cf2c407bc921ca135bca47539300c3eed20bb3e2b1c6825b88", 1251, 800, 535414, "b33aaeebe4d88ce841c5961e130470b6a8da4c10b9c135c59cffd52311e1a814"],
  ["17-feather", "🪶|はね", "17_feather.png", "quiz_feather_20260721.webp", 1145253, "e2d789cbb9def9465c949be9421a2cae2e908e8dcf075ce00adb3f592753836d", 923, 1078, 494700, "fecb19d2131e4561aa6066c8e338c926e476c96d0a45be15de25d0fc17d048b1"],
  ["18-parachute", "🪂|パラシュート", "18_parachute.png", "quiz_parachute_20260721.webp", 1478932, "ba5d0219d44b632e0e4e1ad89e78548cfd9131f621975526091ec2e261ee6c90", 1099, 1121, 741600, "a426e897ef39c8b4fa8aa71501b723fe574f26b5c8074e47a994246ac975e02f"],
  ["19-koinobori", "🎏|こいのぼり", "19_koinobori.png", "quiz_koinobori_20260721.webp", 1263536, "66f840b57e26a4c5d1fefdab8c8fba49ee8dd37203d562356b88eb7ea111e992", 1225, 451, 523718, "961a5ea152a3c9ebc220911f8a5cb2524c1209c948e61e44b6e2d2245591a56d"],
  ["20-wind-chime", "🎐|ふうりん", "20_furin.png", "quiz_wind_chime_20260721.webp", 954173, "1bab8382374ddbc02633658456d28d452b1eb63be5d0d93b64a2735c32fe93c2", 354, 1216, 188038, "e8e2f782d7c45f6b7c6b6c817c3ff78ac77908c0b2b477c6229ff69938df1699"],
  ["21-ancient-vase", "🏺|つぼ", "21_ancient_vase.png", "quiz_ancient_vase_20260721.webp", 1733730, "03801101bb52a41041e12054a2d89ebf13c971842f593066d96264f425c1350c", 930, 1118, 1017932, "b27f82a278ae7b488bbf26470d1a53e98d902bf5c048a5f99aab23bde7d425fa"],
  ["22-ancient-key", "🗝️|かぎ", "22_ancient_key.png", "quiz_ancient_key_20260721.webp", 946333, "c60ef646807d0c5c1d53b62e7315ac06dc6dd1aaf809a6215ec38e17ecbdf6f2", 1047, 1136, 341460, "d874328c590dd35563fc2fa4c742a72210565425ec77899ecfb9cb8638139515"],
  ["23-gem", "💎|ほうせき", "23_gem.png", "quiz_gem_20260721.webp", 1524669, "634bd13ca3243532bfec45e071ef84fff543142f0f4eb14b327efa0c708df5b9", 940, 937, 850570, "539248f921becd4985652593ae4ed14ffb47bd8b7ec7b9c78f2a0528033f90cb"],
  ["24-compass", "🧭|らしんばん", "24_compass.png", "quiz_compass_20260721.webp", 1968692, "2ad415b22def7dd455c5e834bba9d6c81290729eb1c22a7bf77ffd76e22ce93b", 1046, 1051, 1107368, "1ad7b3ca2b3a31c8263b0418c2da68e28baf6e2e957e1bf842f87ca1cf8d47c0"],
  ["25-oil-lamp", "🪔|らんぷ", "25_oil_lamp.png", "quiz_oil_lamp_20260721.webp", 1173491, "d4260e9dd3083c7dccf1059a658c751162b16611346ab6933975b3f0b27bddab", 1188, 778, 546898, "e4b679fe1cbd6fbff35414c756785f8d1dc061bed360d170a09eafce6ecce3c5"],
  ["26-legendary-dinosaur", "🦕|でんせつの きょうりゅう", "26_legendary_dinosaur.png", "quiz_legendary_dinosaur_20260721.webp", 1392669, "907e12c5473bc513cd929e0c2814eb4658c026a6881bdb9215209b79bd1d4614", 1072, 1180, 717330, "3e8aaf8c3c113b6e934530b56a021dffcb2c96e3e79406e0d7472e7bf7274b4a"],
  ["27-sparkling-teddy-bear", "🧸|きらきらの ぬいぐるみ", "27_sparkling_teddy_bear.png", "quiz_sparkling_teddy_bear_20260721.webp", 1649241, "76af31851e05777b281ac1efae6db57b5726d8c5e41aa3e6034fcb3deb8c6298", 916, 1123, 820130, "b0b4cf77264eb4ff9220abc2caef01519632dc05951529bb01f46f9b91b530b0"],
  ["28-happy-cat", "🐱|しあわせの ねこ", "28_happy_cat.png", "quiz_happy_cat_20260721.webp", 1439036, "ae5daaec3a05a2316744e202b25308f74468a9d3b5b3707934754940d12d5a1a", 777, 1212, 773784, "1a0038c95dbf5c5e2e4a24f84b4fbd2652e528c294cc256f531f0b7b8d5caee2"],
  ["29-rainbow-unicorn", "🦄|にじいろの ゆにこーん", "29_rainbow_unicorn.png", "quiz_rainbow_unicorn_20260721.webp", 1570009, "a8a76f3b6230fd30729abf085d40f30646f08c90f7b574267aa0697e482103e4", 1126, 1146, 856328, "337423553943b04f815ec572cc33e6a42eb68bdbc1bea6259e5dd9c18eeeb070"],
  ["30-golden-cloud", "☁️|きんいろの くも", "30_golden_cloud.png", "quiz_golden_cloud_20260721.webp", 1495983, "25303fdd4e2c732a79d9130f781ab9c64dc9e3dc56d753e91f9a504e4a1c92b8", 1180, 850, 818532, "03b55c8a7ee144b07a88b764dd9189fda997b1178671721fcf8f0205e481b530"],
  ["31-glowing-ancient-vase", "🏺|ひかる こだいの つぼ", "31_glowing_ancient_vase.png", "quiz_glowing_ancient_vase_20260721.webp", 1545622, "ee285d23194910c3fd5a50756c617aa0bdc11392b8171d5a4cd8e8244218982c", 822, 1163, 820050, "5385ff334305a5436756e5d8d551c774b797cf423b4f6c5ae15c2a980871fde0"]
]);

const SUPPLEMENTAL_ROWS = Object.freeze([
  ["01-snowflake", "❄️|ゆき", "01_snowflake.png", "quiz_snow_20260721.webp", 1344618, "e79efa5177d67972996e9a73474d7a3ea444101b781f985a0ef77f43f097d507", 904, 1050, 563024, "73832145eccf3969e1bafe56d4ea863d71c23dd5a018fe243212edd840a7173f"],
  ["02-fire", "🔥|ひ", "02_fire.png", "quiz_fire_20260721.webp", 1222349, "570919123ce3c6bbcad5c9bb037e0ec8a7e09253ee1df7bad3388be2f9bfaefc", 823, 1088, 577866, "b677c1c403d9552bd6c1cb4c17f3f554a1de41cb5a92711bdef2ed91fb2c117e"]
]);

const ROWS = Object.freeze([...ORIGINAL_ROWS, ...SUPPLEMENTAL_ROWS]);
const EXPECTED = Object.freeze(ROWS.map((row, index) => Object.freeze({
  id: row[0], key: row[1], raw: row[2], file: row[3], rawBytes: row[4], rawSha256: row[5],
  width: row[6], height: row[7], bytes: row[8], sha256: row[9], rare: index >= 25 && index < ORIGINAL_ROWS.length,
  rawRoot: index < ORIGINAL_ROWS.length ? RAW_ROOT : SUPPLEMENTAL_RAW_ROOT,
  alphaRoot: index < ORIGINAL_ROWS.length ? ALPHA_ROOT : SUPPLEMENTAL_ALPHA_ROOT,
  candidate: index < ORIGINAL_ROWS.length ? (index < 15 ? "part-a/" : "part-b/") + row[3] : row[3],
  src: "../assets/images/nazonazo-tunnel/quiz-art/" + row[3]
})));
const ORIGINAL_NORMAL_KEYS = Object.freeze(EXPECTED.slice(0, 25).map(entry => entry.key));
const NORMAL_STAGE_KEYS = Object.freeze({
  DINO: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(0, 5)),
  TOY: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(5, 7)),
  CAT: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(7, 11)),
  FANTASY: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(11, 15)),
  SKY: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(15, 20)),
  RUINS: Object.freeze(ORIGINAL_NORMAL_KEYS.slice(20, 25))
});
const RARE_STAGE_PAIRS = Object.freeze({
  dino: ["🦕", "でんせつの きょうりゅう"],
  toy: ["🧸", "きらきらの ぬいぐるみ"],
  cat: ["🐱", "しあわせの ねこ"],
  fantasy: ["🦄", "にじいろの ゆにこーん"],
  sky: ["☁️", "きんいろの くも"],
  ruins: ["🏺", "ひかる こだいの つぼ"]
});
const SUPPLEMENTAL_BATCH_LOCKS = Object.freeze({
  "manifest.json": "846d207a7c480dcebfb8daf43574553b4d9d8351b3d7f2221c8998d905e42f8d",
  "process-alpha.mjs": "ecd7002314761617d683b39909f1fc4194bad0356c4d4843140d6bf1bb048df0",
  "run-report.json": "61aad7f64a0bbea374800a62784004902a1da4a52d42d748e18017a042f8d674"
});
const SUPPLEMENTAL_QA_LOCKS = Object.freeze({
  "❄️|ゆき": Object.freeze({
    "alpha-mask.png": "90cec8fb77626a16c3aee4161c36062d9cd883fb336eeb13805e3bf85beb88de",
    "black.png": "788e9fdf6785745514b42a4941858aace732af00bab105756bf2d3e35816522e",
    "lightblue.png": "fac33f63251472b8bb3824b0b4ce4021ed0619ee4c5d5f08cde66ab3684d2905",
    "lightpink.png": "862c59c722a16e5c26dd9a90a54277c42821df7b0a1845da60c3740e2aa6d407",
    "white.png": "c44d8a147029a603a971b672f6363a2e13a0844ec2a72e1459260c59e9c00be9"
  }),
  "🔥|ひ": Object.freeze({
    "alpha-mask.png": "6e100d9a270ac5f87307340f0feb2f6dcd5dd1a275ea867a1d7e0dcd517f47d8",
    "black.png": "45a98febd0f89000cd6464437ef9a817a51e336ec36385e31e1fbe51ba2492f4",
    "lightblue.png": "8e487249163aa8e24ff524c8cb4102e79517e2924a805c66fdc77766bc8124a1",
    "lightpink.png": "7b5ea13d7c1fca74259a3a3e7014fcd0c02d3514e199092021665576f0ed4917",
    "white.png": "5e21597408505b763f0ef759b2bad30a5faf742d755d699dff3db4cdf03ef355"
  })
});

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index], next = source[index + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === openChar) depth += 1;
    else if (char === closeChar && --depth === 0) return index;
  }
  return -1;
}

function extractFunction(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const openAt = source.indexOf("{", start + marker.length);
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(start, end + 1) : "";
}

function extractStageObject(source, stageId) {
  const marker = '{id:"' + stageId + '",';
  const openAt = source.indexOf(marker);
  if (openAt < 0) return "";
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function evaluateRegistry(source) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "quiz-art.js", timeout: 1000 });
  return sandbox.window.PonoNazonazoQuizArt;
}

function evaluateQuestions(source) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "questions.js", timeout: 1000 });
  return sandbox.window.PonoNazonazoQuestionData;
}

function evaluateGameLiteral(source, pattern) {
  const match = pattern.exec(source);
  return match ? vm.runInNewContext(match[1], Object.create(null), { timeout: 1000 }) : null;
}

function cssRule(source, selector) {
  const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const match = rules.find(rule => rule[1].split(",").map(value => value.trim()).includes(selector));
  if (!match) return new Map();
  return new Map(match[2].split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const colon = part.indexOf(":");
    return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  }));
}

function validate(candidate) {
  const errors = [];
  let registryExport = null, questionData = null;
  try { registryExport = evaluateRegistry(candidate.registry); } catch { /* grouped check below */ }
  try { questionData = evaluateQuestions(candidate.questions); } catch { /* grouped check below */ }
  const items = registryExport && registryExport.items;
  const check = (condition, code) => { if (!condition && !errors.includes(code)) errors.push(code); };

  check(registryExport && registryExport.version === REGISTRY_VERSION, "registry-version");
  const exactMap = items && EXPECTED.every(entry => items[entry.key] === entry.src);
  const branchEntries = items ? Object.entries(items).filter(([, src]) => typeof src === "string" && /quiz_[^/?#]+_20260721\.webp(?:[?#]|$)/.test(src)) : [];
  check(exactMap && branchEntries.length === 33 && new Set(branchEntries.map(entry => entry[0])).size === 33 &&
    new Set(branchEntries.map(entry => entry[1])).size === 33, "registry-map");

  const contentPairs = new Set();
  const addPair = pair => {
    if (Array.isArray(pair) && pair.length >= 2) contentPairs.add(pair[0] + "|" + pair[1]);
  };
  if (questionData) {
    for (const bank of ["TOWN", "JUNGLE", "SEA", "FUTURE", "SPACE", "WORDPLAY", "SNOW", "FIRE", "DINO", "TOY", "CAT", "FANTASY", "SKY", "RUINS"]) {
      for (const question of questionData[bank] || []) {
        addPair(question.a);
        for (const decoy of question.d || []) addPair(decoy);
        addPair(question.pe);
      }
    }
    for (const list of ["CNT_EMO", "JLEGS", "SLEGS", "JSIZE", "SSIZE", "SPEED", "DSIZE", "TSIZE"]) {
      for (const pair of questionData[list] || []) addPair(pair);
    }
  }
  const seaDecoys = evaluateGameLiteral(candidate.game, /const SEA_DECOYS=(\[[\s\S]*?\]);/);
  const cargoThemes = evaluateGameLiteral(candidate.game, /const NUMBER_CARGO_THEMES=(\[[\s\S]*?\]);/);
  for (const pair of seaDecoys || []) addPair(pair);
  for (const theme of cargoThemes || []) addPair([theme.e, theme.name]);
  check(contentPairs.size === 202 && items && [...contentPairs].every(key => Object.hasOwn(items, key)), "content-inventory");

  const rarePairs = Object.entries(RARE_STAGE_PAIRS).map(([stageId, pair]) => {
    const object = extractStageObject(candidate.game, stageId);
    const match = object.match(/rare:\["([^"]+)","([^"]+)"\]/);
    return match && match[1] === pair[0] && match[2] === pair[1];
  });
  check(rarePairs.length === 6 && rarePairs.every(Boolean), "rare-registration");

  const answerKeys = new Set(), stageAnswerKeys = {};
  if (questionData) {
    for (const bank of ["DINO", "TOY", "CAT", "FANTASY", "SKY", "RUINS"]) {
      stageAnswerKeys[bank] = new Set();
      for (const question of questionData[bank] || []) {
        if (Array.isArray(question.a)) {
          const key = question.a[0] + "|" + question.a[1];
          answerKeys.add(key);stageAnswerKeys[bank].add(key);
        }
      }
    }
  }
  check(ORIGINAL_NORMAL_KEYS.every(key => answerKeys.has(key)) && Object.entries(NORMAL_STAGE_KEYS).every(([bank, keys]) =>
    keys.every(key => stageAnswerKeys[bank] && stageAnswerKeys[bank].has(key))), "question-registration");

  const fillArtHolder = extractFunction(candidate.game, "fillArtHolder");
  const createQuizArt = extractFunction(candidate.game, "createQuizArt");
  check(fillArtHolder.includes('fallback.textContent="?"') &&
    fillArtHolder.includes("image.hidden=true;fallback.hidden=false") &&
    createQuizArt.includes("resolveQuizArt(emoji,label)") &&
    createQuizArt.includes("fillArtHolder(holder,src,quizArtKey(emoji,label)"), "runtime-helper");
  const maybeSpawnRare = extractFunction(candidate.game, "maybeSpawnRare");
  check(maybeSpawnRare.includes('rareEl.appendChild(createQuizArt(e,t,"rare-art"));') &&
    !/(?:textContent|innerHTML)\s*=\s*e/.test(maybeSpawnRare), "runtime-rare");

  check(cssRule(candidate.css, ".quiz-art-image[hidden]").get("display") === "none!important" &&
    cssRule(candidate.css, ".quiz-art-fallback[hidden]").get("display") === "none!important", "css-hidden");
  const holderRule = cssRule(candidate.css, ".quiz-art");
  const rareRule = cssRule(candidate.css, ".rare");
  check(!holderRule.has("background") && !holderRule.has("background-color") && rareRule.get("background") === "transparent", "css-holder");

  const stylesAt = candidate.html.indexOf('href="styles.css?v=' + RUNTIME_TOKEN + '"');
  const questionsAt = candidate.html.indexOf('src="data/questions.js');
  const registryAt = candidate.html.indexOf('src="data/quiz-art.js?v=' + TOKEN + '"');
  const gameAt = candidate.html.indexOf('src="js/game.js?v=' + RUNTIME_TOKEN + '"');
  check(stylesAt >= 0 && questionsAt >= 0 && questionsAt < registryAt && registryAt < gameAt, "token-sync");
  return errors;
}

function replaceExactlyOnce(source, search, replacement) {
  const occurrences = source.split(search).length - 1;
  assert.equal(occurrences, 1, "mutation precondition must match exactly once: " + search.slice(0, 100));
  const changed = source.replace(search, replacement);
  assert.notEqual(changed, source, "mutation must change source");
  return changed;
}

async function verifyAssetsAndLineage() {
  const originalRawRoot = path.join(root, RAW_ROOT);
  const originalAlphaRoot = path.join(root, ALPHA_ROOT);
  const supplementalRawRoot = path.join(root, SUPPLEMENTAL_RAW_ROOT);
  const supplementalAlphaRoot = path.join(root, SUPPLEMENTAL_ALPHA_ROOT);
  const originalProvenance = fs.existsSync(originalRawRoot) || fs.existsSync(originalAlphaRoot);
  const supplementalProvenance = fs.existsSync(supplementalRawRoot) || fs.existsSync(supplementalAlphaRoot);
  const reports = new Map();
  if (originalProvenance) {
    assert.ok(fs.existsSync(originalRawRoot) && fs.existsSync(originalAlphaRoot), "1373/1407b lineage must be complete when either batch exists");
    const originalReports = new Map();
    for (const reportName of ["part-a/run-report.json", "part-b/candidate-report.json"]) {
      const report = JSON.parse(read(ALPHA_ROOT + "/" + reportName));
      for (const job of report.jobs) originalReports.set(job.key, job);
    }
    assert.equal(originalReports.size, 31, "1407b reports must register exactly the original 31 branch quiz jobs");
    for (const [key, report] of originalReports) reports.set(key, report);
  }
  if (supplementalProvenance) {
    assert.ok(fs.existsSync(supplementalRawRoot) && fs.existsSync(supplementalAlphaRoot), "1407d/1407e lineage must be complete when either batch exists");
    for (const [file, sha256] of Object.entries(SUPPLEMENTAL_BATCH_LOCKS)) {
      const bytes = fs.readFileSync(path.join(supplementalAlphaRoot, file));
      assert.equal(hash(bytes), sha256, "1407e " + file + " SHA-256 drifted");
    }
    const report = JSON.parse(read(SUPPLEMENTAL_ALPHA_ROOT + "/run-report.json"));
    assert.equal(report.jobs.length, 2, "1407e report must register exactly snow and fire");
    for (const job of report.jobs) {
      assert.ok(!reports.has(job.key), job.key + ": supplemental report duplicates an original key");
      reports.set(job.key, job);
    }
  }

  for (const entry of EXPECTED) {
    const canonicalPath = path.join(root, ASSET_ROOT, entry.file);
    assert.ok(fs.existsSync(canonicalPath), entry.key + ": canonical file missing");
    const bytes = fs.readFileSync(canonicalPath);
    assert.ok(bytes.length < THREE_MIB, entry.key + ": canonical exceeds 3MiB");
    assert.equal(bytes.length, entry.bytes, entry.key + ": canonical byte count drifted");
    assert.equal(hash(bytes), entry.sha256, entry.key + ": canonical SHA-256 drifted");
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", entry.key + ": RIFF signature missing");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", entry.key + ": WebP signature missing");
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, entry.key + ": RIFF is incomplete");
    assert.ok(bytes.includes(Buffer.from("VP8L")), entry.key + ": lossless VP8L chunk missing");
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha },
      { format: "webp", width: entry.width, height: entry.height, channels: 4, hasAlpha: true }, entry.key + ": decoded RGBA metadata drifted");
    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => decoded.data[(y * decoded.info.width + x) * 4 + 3];
    let transparent = 0, visible = 0, borderNonzero = 0;
    for (let y = 0; y < decoded.info.height; y += 1) {
      for (let x = 0; x < decoded.info.width; x += 1) {
        const alpha = alphaAt(x, y);
        if (alpha === 0) transparent += 1;
        else visible += 1;
        if ((x === 0 || y === 0 || x === decoded.info.width - 1 || y === decoded.info.height - 1) && alpha !== 0) borderNonzero += 1;
      }
    }
    assert.ok(transparent > 0 && visible > 0, entry.key + ": alpha must contain both background and subject");
    assert.equal(borderNonzero, 0, entry.key + ": alpha touches encoded border");
    assert.deepEqual([[0, 0], [decoded.info.width - 1, 0], [0, decoded.info.height - 1], [decoded.info.width - 1, decoded.info.height - 1]].map(point => alphaAt(point[0], point[1])),
      [0, 0, 0, 0], entry.key + ": corners are not transparent");

    const localProvenance = entry.rawRoot === RAW_ROOT ? originalProvenance : supplementalProvenance;
    if (localProvenance) {
      const rawPath = path.join(root, entry.rawRoot, entry.raw);
      const candidatePath = path.join(root, entry.alphaRoot, entry.candidate);
      assert.ok(fs.existsSync(rawPath) && fs.existsSync(candidatePath), entry.key + ": local lineage file missing");
      const raw = fs.readFileSync(rawPath), candidateBytes = fs.readFileSync(candidatePath);
      assert.equal(raw.length, entry.rawBytes, entry.key + ": raw API byte count drifted");
      assert.equal(hash(raw), entry.rawSha256, entry.key + ": raw API SHA-256 drifted");
      assert.equal(raw.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", entry.key + ": raw PNG signature missing");
      assert.deepEqual([raw.readUInt32BE(16), raw.readUInt32BE(20), raw[24], raw[25]], [1254, 1254, 8, 2], entry.key + ": raw response must remain 1254px 8-bit RGB without alpha");
      for (const marker of ["c2pa", "gpt-image", "2.0", "trainedAlgorithmicMedia", "OpenAI Media Service API"]) {
        assert.ok(raw.includes(Buffer.from(marker)), entry.key + ": raw GPT Image 2/C2PA marker missing: " + marker);
      }
      assert.ok(candidateBytes.equals(bytes), entry.key + ": candidate and canonical bytes differ");
      const report = reports.get(entry.key);
      assert.ok(report, entry.key + ": report job missing");
      assert.equal(report.raw.sha256Before, entry.rawSha256, entry.key + ": report raw SHA drifted");
      assert.equal(report.raw.unchanged, true, entry.key + ": report no longer proves untouched raw response");
      assert.equal(report.candidate.sha256, entry.sha256, entry.key + ": report candidate SHA drifted");
      assert.deepEqual(report.candidate.losslessDecodeMismatch, { alpha: 0, visibleRgb: 0 }, entry.key + ": report lossless decode proof drifted");
      assert.equal(report.candidate.alpha.borderNonzero, 0, entry.key + ": report border alpha drifted");
      assert.deepEqual(report.candidate.alpha.corners, [0, 0, 0, 0], entry.key + ": report corner alpha drifted");

      if (entry.rawRoot === SUPPLEMENTAL_RAW_ROOT) {
        const qaLocks = SUPPLEMENTAL_QA_LOCKS[entry.key];
        assert.ok(qaLocks && report.qa, entry.key + ": 1407e QA lineage missing");
        const reportQa = {
          "alpha-mask.png": report.qa.alphaMask,
          "black.png": report.qa.black,
          "lightblue.png": report.qa.lightblue,
          "lightpink.png": report.qa.lightpink,
          "white.png": report.qa.white
        };
        for (const [qaName, qaSha256] of Object.entries(qaLocks)) {
          const relativeQa = path.join(SUPPLEMENTAL_ALPHA_ROOT, "qa", entry.id, qaName);
          const qaPath = path.join(root, relativeQa);
          assert.ok(fs.existsSync(qaPath), entry.key + ": missing 1407e QA proof " + qaName);
          assert.equal(hash(fs.readFileSync(qaPath)), qaSha256, entry.key + ": 1407e QA proof drifted: " + qaName);
          assert.ok(reportQa[qaName].split(path.sep).join("/").endsWith(relativeQa.split(path.sep).join("/")), entry.key + ": report QA path drifted: " + qaName);
          const qaMetadata = await sharp(qaPath).metadata();
          assert.deepEqual([qaMetadata.width, qaMetadata.height], [entry.width, entry.height], entry.key + ": QA dimensions drifted: " + qaName);
        }
      }
    }
  }
  return originalProvenance && supplementalProvenance ? "1373/1407b+1407d/1407e-local-verified" : "embedded-locks";
}

const mutations = [
  { name: "registry version drift", expected: "registry-version", mutate: c => ({ ...c, registry: replaceExactlyOnce(c.registry, 'const REGISTRY_VERSION = "20260721-1407";', 'const REGISTRY_VERSION = "20260721-1406";') }) },
  { name: "normal mapping wrong", expected: "registry-map", mutate: c => ({ ...c, registry: replaceExactlyOnce(c.registry, '"🦕|きょうりゅう": branchPath("dinosaur")', '"🦕|きょうりゅう": branchPath("dinosaur_wrong")') }) },
  { name: "rare mapping wrong", expected: "registry-map", mutate: c => ({ ...c, registry: replaceExactlyOnce(c.registry, '"🏺|ひかる こだいの つぼ": branchPath("glowing_ancient_vase")', '"🏺|ひかる こだいの つぼ": branchPath("ancient_vase")') }) },
  { name: "snow and fire mappings swapped", expected: "registry-map", mutate: c => {
    let registry = replaceExactlyOnce(c.registry, '"❄️|ゆき": branchPath("snow")', '"❄️|ゆき": branchPath("__snow_fire_swap__")');
    registry = replaceExactlyOnce(registry, '"🔥|ひ": branchPath("fire")', '"🔥|ひ": branchPath("snow")');
    registry = replaceExactlyOnce(registry, '"❄️|ゆき": branchPath("__snow_fire_swap__")', '"❄️|ゆき": branchPath("fire")');
    return { ...c, registry };
  } },
  { name: "snow mapping missing", expected: ["registry-map", "content-inventory"], mutate: c => ({ ...c, registry: replaceExactlyOnce(c.registry, '"❄️|ゆき": branchPath("snow")', '"❄️|ゆき_missing": branchPath("snow")') }) },
  { name: "dated branch inventory drops from 33 to 32", expected: "registry-map", mutate: c => ({ ...c, registry: replaceExactlyOnce(c.registry, '"🔥|ひ": branchPath("fire")', '"🔥|ひ": ROOT+"quiz_fire_20260722.webp"') }) },
  { name: "rare stage registration typo", expected: "rare-registration", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'rare:["🐱","しあわせの ねこ"]', 'rare:["🐱","しあわせな ねこ"]') }) },
  { name: "normal question registration typo", expected: ["content-inventory", "question-registration"], mutate: c => ({ ...c, questions: replaceExactlyOnce(c.questions, 'a:["🦂","さそり"]', 'a:["🦂","さそりさん"]') }) },
  { name: "normal art keys swapped across stage banks", expected: "question-registration", mutate: c => {
    let questions = replaceExactlyOnce(c.questions, 'a:["🦂","さそり"]', 'a:["__swap__","__swap__"]');
    questions = replaceExactlyOnce(questions, 'a:["🧩","ぱずる"]', 'a:["🦂","さそり"]');
    questions = replaceExactlyOnce(questions, 'a:["__swap__","__swap__"]', 'a:["🧩","ぱずる"]');
    return { ...c, questions };
  } },
  { name: "quiz registry token stale", expected: "token-sync", mutate: c => ({ ...c, html: replaceExactlyOnce(c.html, 'data/quiz-art.js?v=20260721-1409', 'data/quiz-art.js?v=20260721-1408') }) },
  { name: "game token stale", expected: "token-sync", mutate: c => ({ ...c, html: replaceExactlyOnce(c.html, 'js/game.js?v=20260723-1429', 'js/game.js?v=20260723-1428') }) },
  { name: "style token stale", expected: "token-sync", mutate: c => ({ ...c, html: replaceExactlyOnce(c.html, 'styles.css?v=20260723-1429', 'styles.css?v=20260723-1428') }) },
  { name: "hidden image consumes layout", expected: "css-hidden", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, '.quiz-art-image[hidden]{display:none!important}', '.quiz-art-image[hidden]{visibility:hidden}') }) },
  { name: "quiz holder gains white tile", expected: "css-holder", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, '.quiz-art{position:relative;', '.quiz-art{background:#fff;position:relative;') }) },
  { name: "renderer bypasses exact registry", expected: "runtime-helper", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'const src=typeof srcOverride==="string"&&srcOverride?srcOverride:resolveQuizArt(emoji,label);', 'const src="";') }) },
  { name: "rare reverts to emoji text", expected: "runtime-rare", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'rareEl.appendChild(createQuizArt(e,t,"rare-art"));', 'rareEl.textContent=e;') }) }
];

const mime = Object.freeze({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png" });

async function startStaticServer() {
  if (process.env.NAZONAZO_BASE_URL) return { base: process.env.NAZONAZO_BASE_URL.replace(/\/$/, ""), close: async () => {} };
  const server = http.createServer((request, response) => {
    const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = rawPath.endsWith("/") ? rawPath + "index.html" : rawPath;
    const full = path.resolve(root, "." + relative);
    if (full !== root && !full.startsWith(root + path.sep)) { response.writeHead(403).end("forbidden"); return; }
    fs.readFile(full, (error, body) => {
      if (error) { response.writeHead(error.code === "ENOENT" ? 404 : 500).end("not found"); return; }
      response.writeHead(200, { "content-type": mime[path.extname(full)] || "application/octet-stream", "cache-control": "no-store" });
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { base: "http://127.0.0.1:" + server.address().port, close: () => new Promise(resolve => server.close(resolve)) };
}

async function runBrowserAudit(base, browserName) {
  const { chromium, webkit } = require("playwright");
  const browserType = browserName.startsWith("webkit") ? webkit : chromium;
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const launchOptions = browserName === "chromium" && fs.existsSync(chromePath) ? { headless: true, executablePath: chromePath } : { headless: true };
  const browser = await browserType.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.addInitScript(() => { window.__APP_BUILD__ = 1; });
  await page.goto(base + "/nazonazo-tunnel/?weather=clear#fast", { waitUntil: "domcontentloaded" });
  const helperSource = ["quizArtKey", "quizArtItems", "resolveQuizArt", "fillArtHolder", "createQuizArt"].map(name => extractFunction(sources.game, name)).join("\n");
  const result = await page.evaluate(async input => {
    (0, eval)(input.helperSource + "\nwindow.__branchQuizArtFactory=createQuizArt;");
    const host = document.createElement("div");
    host.id = "branchQuizArtAudit";
    Object.assign(host.style, { position: "fixed", left: "0", top: "0", width: "844px", minHeight: "390px", zIndex: "99999", background: "transparent", display: "flex", flexWrap: "wrap" });
    document.body.appendChild(host);
    const records = [];
    for (const entry of input.entries) {
      const split = entry.key.split("|");
      const holder = window.__branchQuizArtFactory(split[0], split.slice(1).join("|"), entry.rare ? "rare-art" : "audit-normal");
      Object.assign(holder.style, { width: "72px", height: "72px" });
      host.appendChild(holder);
      const image = holder.querySelector("img"), fallback = holder.querySelector(".quiz-art-fallback");
      await image.decode();
      const imageRect = image.getBoundingClientRect(), holderStyle = getComputedStyle(holder);
      records.push({
        key: entry.key, currentSrc: image.currentSrc, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
        imageWidth: imageRect.width, imageHeight: imageRect.height, imageHidden: image.hidden,
        fallbackHidden: fallback.hidden, fallbackText: fallback.textContent, fallbackWidth: fallback.getBoundingClientRect().width,
        holderBackground: holderStyle.backgroundColor, holderIsFallback: holder.classList.contains("is-fallback")
      });
    }
    const rareButton = document.createElement("button");
    rareButton.className = "rare";
    const rareEntry = input.entries.find(entry => entry.rare);
    const rareSplit = rareEntry.key.split("|");
    rareButton.appendChild(window.__branchQuizArtFactory(rareSplit[0], rareSplit.slice(1).join("|"), "rare-art"));
    host.appendChild(rareButton);
    const rareImage = rareButton.querySelector("img");
    await rareImage.decode();
    const hiddenHolder = window.__branchQuizArtFactory("🦕", "きょうりゅう", "hidden-audit");
    Object.assign(hiddenHolder.style, { width: "72px", height: "72px" });
    host.appendChild(hiddenHolder);
    const hiddenImage = hiddenHolder.querySelector("img");
    await hiddenImage.decode();
    hiddenImage.hidden = true;
    const hiddenRect = hiddenImage.getBoundingClientRect();
    return { records, rareBackground: getComputedStyle(rareButton).backgroundColor, hiddenRect: { width: hiddenRect.width, height: hiddenRect.height } };
  }, { helperSource, entries: EXPECTED.map(entry => ({ key: entry.key, file: entry.file, rare: entry.rare })) });

  assert.equal(result.records.length, 33, browserName + ": browser did not instantiate all 33 images");
  for (const record of result.records) {
    const expected = EXPECTED.find(entry => entry.key === record.key);
    assert.ok(record.currentSrc.endsWith("/" + expected.file), browserName + ": wrong decoded URL for " + record.key);
    assert.deepEqual([record.naturalWidth, record.naturalHeight], [expected.width, expected.height], browserName + ": decoded dimensions drifted for " + record.key);
    assert.ok(record.imageWidth > 0 && record.imageHeight > 0 && !record.imageHidden, browserName + ": mapped image is not visible for " + record.key);
    assert.equal(record.fallbackHidden, true, browserName + ": fallback became visible for " + record.key);
    assert.equal(record.fallbackText, "?", browserName + ": fallback contains an emoji for " + record.key);
    assert.equal(record.fallbackWidth, 0, browserName + ": hidden fallback consumes layout for " + record.key);
    assert.equal(record.holderIsFallback, false, browserName + ": mapped art entered fallback state for " + record.key);
    assert.equal(record.holderBackground, "rgba(0, 0, 0, 0)", browserName + ": quiz holder gained a white/colored tile for " + record.key);
  }
  assert.equal(result.rareBackground, "rgba(0, 0, 0, 0)", browserName + ": rare button gained a white/colored tile");
  assert.deepEqual(result.hiddenRect, { width: 0, height: 0 }, browserName + ": hidden quiz img still occupies a box");
  await browser.close();
}

async function main() {
  assert.equal(ORIGINAL_ROWS.length, 31, "original 1373/1407b inventory must remain exactly 31");
  assert.equal(SUPPLEMENTAL_ROWS.length, 2, "1407d/1407e inventory must remain exactly snow and fire");
  assert.equal(EXPECTED.length, 33, "dated branch inventory must remain exactly 33");
  assert.equal(ORIGINAL_NORMAL_KEYS.length, 25, "original normal branch inventory must remain 25");
  assert.equal(EXPECTED.filter(entry => entry.rare).length, 6, "rare branch inventory must remain 6");
  const baseline = validate(sources);
  assert.deepEqual(baseline, [], "branch quiz-art baseline contract must pass");
  for (const mutation of mutations) {
    const result = validate(mutation.mutate(sources));
    const expectedErrors = Array.isArray(mutation.expected) ? mutation.expected : [mutation.expected];
    assert.deepEqual(result, expectedErrors, mutation.name + ": expected only " + expectedErrors.join(", ") + ", got " + (result.join(", ") || "PASS"));
  }
  const provenance = await verifyAssetsAndLineage();
  let browserRuns = 0;
  if (process.env.NAZONAZO_BROWSER) {
    const server = await startStaticServer();
    try {
      for (const browserName of process.env.NAZONAZO_BROWSER.split(",").map(value => value.trim()).filter(Boolean)) {
        await runBrowserAudit(server.base, browserName);
        browserRuns += 1;
      }
    } finally { await server.close(); }
  }
  console.log("nazonazo branch quiz-art alpha regression: PASS (33 exact mappings, original 25 normal + 6 rare + supplemental snow/fire, full inventory 202, provenance " + provenance + ", " + mutations.length + "/" + mutations.length + " mutations REJECT, browser " + browserRuns + ")");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
