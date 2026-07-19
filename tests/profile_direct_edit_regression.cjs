"use strict";

// batch:1245/1246 regression: プロフィールハブの名前・姿を本体タップで編集し、
// 大きな姿と、ひとつにまとまった達成表示を保つ。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "play.html"), "utf8");

function extract(src, startMarker, endMarker, label) {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, label + ": start marker not found");
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, label + ": end marker not found");
  return src.slice(start, end);
}

// 1. 画面の主操作は、説明ボタンではなく名前とサムネイル本体の実 button。
const hub = extract(html, '<div class="modal profile-hub-modal"', '<!-- ===== Debug Board', "profile hub");
const head = extract(hub, '<div class="profile-hub-head">', '<div class="profile-hub-actions">', "profile head");
const actions = extract(hub, '<div class="profile-hub-actions">', '</div>', "profile actions");

assert.match(head, /<button class="profile-hub-avatar-button" id="profileAvatarEditBtn"[^>]*>[\s\S]*id="profileHubAvatar"/,
  "avatar thumbnail must be inside a real button");
assert.match(head, /<button class="profile-hub-name-button" id="profileHubEditBtn"[^>]*>[\s\S]*id="profileHubName"/,
  "profile name must be inside a real button");
assert.doesNotMatch(actions, /profileHubEditBtn|profileAvatarEditBtn|なまえを かえる|すがたを えらぶ/,
  "standalone name/avatar action buttons must be removed");
assert.match(actions, /profileStickerBookBtn/);
assert.match(actions, /profileAchievementsBtn/);

// 2. 名前専用パネルにはランダムと直接保存があり、既存の年齢等ウィザードへ
//    強制遷移しない。
const namePanel = extract(hub, '<div class="profile-hub-panel" id="profileNamePanel"', '<div class="profile-hub-panel" id="profileAvatarPanel"', "name panel");
assert.match(namePanel, /id="profileHubNameInput"/);
assert.match(namePanel, /id="profileHubNameRandomBtn"[^>]*>ランダム</);
assert.match(namePanel, /id="profileHubNameForm"/);
assert.match(namePanel, /type="submit">きめた</);

assert.match(html, /profileHubEditBtn\.addEventListener\('click', openProfileNameEditor\)/,
  "name button must open the dedicated name panel");
assert.match(html, /profileHubNameRandomBtn\.addEventListener\('click', \(\) => fillRandomProfileName\(profileHubNameInput\)\)/,
  "hub random button must use the shared random-name behavior");
assert.match(html, /profileHubNameForm\.addEventListener\('submit',[\s\S]{0,180}saveProfileNameDraft\(\)/,
  "name form must save the name draft directly");
assert.match(html, /if \(profileNamePanel\) profileNamePanel\.hidden = name !== 'name'/,
  "profile panel switcher must include the name panel");
assert.match(html, /profileAvatarEditBtn\.addEventListener\('click',[\s\S]{0,240}profileAvatarBackBtn && profileAvatarBackBtn\.focus\(\)/,
  "opening the avatar panel must move focus into the visible panel");
assert.match(html, /if \(profileAvatarBackBtn\)[\s\S]{0,320}profileAvatarEditBtn && profileAvatarEditBtn\.focus\(\)/,
  "leaving the avatar panel must restore focus to the thumbnail button");

// 3. 旧3指標を撤去し、達成数/全数・全体バー・次の具体的な項目を表示する。
assert.doesNotMatch(hub, />いちばん</);
assert.doesNotMatch(hub, />もうすぐ</);
assert.match(hub, /id="profileHubDoneCount"/);
assert.match(hub, /id="profileHubTotalCount"/);
assert.match(hub, /id="profileHubProgressBar"[^>]*role="progressbar"/);
assert.match(hub, /id="profileHubNextGoal"/);
assert.match(hub, /id="profileDetailProgressBar"[^>]*role="progressbar"/);
assert.match(hub, /id="profileDetailNextGoal"/);

// 未プレイ時の説明は独立した破線ボックスではなく、主進捗カードの先頭に置く。
const mainProgressStart = hub.indexOf('<div class="profile-progress-card" aria-label="できたこと">');
const emptyHelp = hub.indexOf('id="profileHubEmpty"');
const progressTop = hub.indexOf('class="profile-progress-card__top"', mainProgressStart);
const namePanelStart = hub.indexOf('id="profileNamePanel"');
assert.ok(mainProgressStart >= 0 && emptyHelp > mainProgressStart && emptyHelp < progressTop,
  "no-progress help must be the first item inside the main progress card");
assert.ok(progressTop < namePanelStart,
  "main progress card must close before the name editor panel");
assert.equal((hub.match(/id="profileHubEmpty"/g) || []).length, 1,
  "no-progress help must not remain as a second standalone box");

// profileProgressSummary の選定規則を、プロフィール100%に引っ張られない例で駆動。
const summarySource = extract(html, 'function profileProgressSummary()', 'function updateProfileHome', "progress summary");
const rows = [
  { goal: { profile: true, title: "なまえを きめた" }, current: 1, target: 1, pct: 100, done: true },
  { goal: { profile: false, title: "クイズ 5もん" }, current: 2, target: 5, pct: 40, done: false },
  { goal: { profile: false, title: "めいろ 4こ" }, current: 3, target: 4, pct: 75, done: false }
];
const summary = vm.runInNewContext(summarySource + "; profileProgressSummary();", {
  profileGoalRows: () => rows
});
assert.equal(summary.done, 1);
assert.equal(summary.total, 3);
assert.equal(summary.completionPct, 33);
assert.equal(summary.nextGoal.goal.title, "めいろ 4こ",
  "next goal must be the closest unfinished concrete goal, not the completed profile goal");
assert.equal(summary.hasGameProgress, true);
assert.equal("best" in summary, false, "ambiguous best percentage must be removed");
assert.equal("next" in summary, false, "ambiguous near-complete count must be removed");

const nextTextSource = extract(html, 'function profileNextGoalText(summary)', 'function renderProfileProgress', "next goal text");
const nextText = vm.runInNewContext(nextTextSource + "; profileNextGoalText(summary);", { summary });
assert.equal(nextText, "つぎは めいろ 4こ　3/4");
const allDoneText = vm.runInNewContext(nextTextSource + "; profileNextGoalText(summary);", {
  summary: { nextGoal: null }
});
assert.equal(allDoneText, "ぜんぶ できた！");

// 4. ランダムは候補が複数ある限り現在名を返さず、タップの効果が見える。
const randomSource = extract(html, 'function randomProfileName(currentName)', 'function fillRandomProfileName', "random name");
const mathMock = Object.create(Math);
mathMock.random = () => 0;
const picked = vm.runInNewContext(randomSource + '; randomProfileName("ポノ");', {
  RANDOM_NAMES: ["ポノ", "そら", "はな"],
  sanitizeProfileName: (value) => String(value || "ポノ").trim(),
  Math: mathMock
});
assert.equal(picked, "そら");

// 名前だけを保存しても、年齢・性別・姿の既存値は同じ profile object で引き継ぐ。
const saveNameSource = extract(html, 'function saveProfileNameDraft()', 'function renderProfileHub', "save name draft");
let savedProfile = null;
let shownPanel = null;
let focusReturned = false;
vm.runInNewContext(saveNameSource + "; saveProfileNameDraft();", {
  loadProfile: () => ({
    name: "ポノ",
    age: "6",
    gender: "girl",
    avatar: { preset: "fox" }
  }),
  profileHubNameInput: { value: "そら" },
  saveProfile: (profile) => { savedProfile = profile; },
  renderProfileHub: () => {},
  showProfilePanel: (name) => { shownPanel = name; },
  setTimeout: (fn) => fn(),
  profileHubEditBtn: { focus: () => { focusReturned = true; } }
});
assert.equal(savedProfile.name, "そら");
assert.equal(savedProfile.age, "6");
assert.equal(savedProfile.gender, "girl");
assert.equal(savedProfile.avatar.preset, "fox");
assert.equal(shownPanel, "main");
assert.equal(focusReturned, true);

// 5. 姿はユーザーが見比べられる204px（旧短画面68pxの3倍）を保ち、
//    直接タップ部はbutton標準挙動を使う。
assert.match(html, /\.profile-hub-name-button \{[\s\S]*?min-height: 44px;/);
assert.match(html, /\.profile-hub-head \{[\s\S]*?grid-template-columns: 204px minmax\(0, 1fr\);/,
  "wide/landscape profile must reserve a 204px avatar column");
assert.match(html, /\.profile-hub-avatar-button \{[\s\S]*?width: 204px;[\s\S]*?height: 204px;/);
assert.match(html, /\.profile-hub-avatar\.pono-mini-avatar \{[\s\S]*?width: 204px;[\s\S]*?height: 204px;/);
assert.match(html, /@media \(max-width: 480px\) \{[\s\S]*?\.profile-hub-head \{[\s\S]*?grid-template-columns: 1fr;/,
  "portrait profile must stack the large avatar instead of crushing the summary column");
assert.doesNotMatch(html, /\.profile-hub-empty\s*\{[^}]*display:\s*none;/,
  "the requested no-progress help must remain visible in short landscape");
assert.match(html, /\.profile-hub-card \.profile-hub-empty \{[\s\S]*?border-bottom:[\s\S]*?text-align: left;/,
  "integrated help must use a divider, not its former standalone card styling");
assert.match(html, /function openProfileHub\(\)[\s\S]{0,420}profileHubEditBtn && profileHubEditBtn\.focus\(\)/,
  "opening the profile hub must focus its first direct-edit control");

// 6. 編集後もすべての classic inline script が構文的に有効。
const inlineScripts = [];
const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
let match;
while ((match = scriptPattern.exec(htmlWithoutComments))) {
  const attrs = match[1] || "";
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/babel["']/.test(attrs)) continue;
  inlineScripts.push(match[2]);
}
assert.ok(inlineScripts.length >= 4, "expected multiple classic inline scripts");
inlineScripts.forEach((source, index) => {
  assert.doesNotThrow(() => new vm.Script(source, { filename: "play-inline-" + index + ".js" }),
    "classic inline script " + index + " must parse");
});

console.log("profile direct-edit regression: PASS");
