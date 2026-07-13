'use strict';

// batch:1285 regression: お店モード（おねがいモード）でのり細工を新規使用不可にし、
// ごはんタブを しろごはん／うめぼし／のりべんセット の3択へ切り替える変更を守る。
//   - チュートリアル中 (tutorialState.active) は必ずバイパスし、tut2-nori-* を壊さない。
//   - 自由モード (currentRequester なし) は一切変更なし (decor タブ・のり細工は従来どおり)。
//   - のりべんセットは全7箱のご飯形状 (round/bear/cat) へマスクでフィットする。
//   - うめぼし・保存互換 (favorites/placedItems 旧データ) を壊さない。
//   - 判定 (getFreeLayoutCompletionData の栄養/採点フィルタ) は不変。
//   - sw.js CACHE_VERSION が今回のバッチ用にバンプされている。
// 既存 tests/*_regression.cjs のスタイル (node:assert/strict + node:vm + マーカー extract) を踏襲。

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'bento/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function extract(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: end marker not found`);
  return source.slice(start, end);
}

// ---------------------------------------------------------------------------
// 1. すべての classic inline script が構文的に有効。 既存の子供向け表記規約
//    (「タップ」ではなく「タッチ」で統一) も今回の変更で崩れていないこと。
// ---------------------------------------------------------------------------
let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount++;
  new vm.Script(match[1], { filename: `bento-inline-${scriptCount}.js` });
}
assert.ok(scriptCount >= 10, 'expected bento inline scripts');
assert.doesNotMatch(html, /タップ/, 'child-facing Bento copy must consistently use タッチ');

// ---------------------------------------------------------------------------
// 2. isShopNoriCraftRestricted(): tutorialState.active の早期 return が
//    currentRequester (isBentoShopMode) 判定より先にあり、tutorialState.mode を
//    参照しない (正本は currentRequester)。 実行して4シナリオを検証する。
// ---------------------------------------------------------------------------
const restrictSrc = extract(
  html,
  'function isBentoShopMode()',
  'function getDecorPaletteCatalog()',
  'isShopNoriCraftRestricted definition',
);
assert.doesNotMatch(restrictSrc, /tutorialState\.mode/, 'must not gate on tutorialState.mode');
{
  const activeCheckIdx = restrictSrc.indexOf('tutorialState.active');
  const shopModeCallIdx = restrictSrc.indexOf('return isBentoShopMode();');
  assert.ok(activeCheckIdx >= 0 && shopModeCallIdx > activeCheckIdx,
    'tutorialState.active bypass must be checked before the currentRequester-based shop-mode return');
}
function makeRestrictedApi(currentRequester, tutorialState) {
  return vm.runInNewContext(`(() => {
    ${restrictSrc}
    return { isShop: isBentoShopMode, isRestricted: isShopNoriCraftRestricted };
  })()`, { currentRequester, tutorialState });
}
{
  // 自由モード: currentRequester なし。 チュートリアル状態に関わらず一切制限されない。
  const freeApi = makeRestrictedApi(null, { active: false });
  assert.equal(freeApi.isShop(), false, 'free mode must not be shop mode');
  assert.equal(freeApi.isRestricted(), false, 'free mode must never restrict nori craft');
  const freeApiDuringSomeActiveFlag = makeRestrictedApi(null, { active: true });
  assert.equal(freeApiDuringSomeActiveFlag.isRestricted(), false,
    'free mode must stay unrestricted even if some unrelated tutorial flag is active');
}
{
  // お店モード + チュートリアル中ではない: 制限がかかる。
  const shopApi = makeRestrictedApi({ id: 'req1', name: 'テスト' }, { active: false });
  assert.equal(shopApi.isShop(), true, 'presence of currentRequester must mean shop mode');
  assert.equal(shopApi.isRestricted(), true, 'shop mode outside tutorial must restrict nori craft');
}
{
  // お店モード + チュートリアル中: バイパスされる (tut2-nori-* を壊さない)。
  const shopTutorialApi = makeRestrictedApi({ id: 'req1', name: 'テスト' }, { active: true });
  assert.equal(shopTutorialApi.isRestricted(), false, 'tutorial must bypass the shop-mode nori restriction');
}
{
  // お店モード + チュートリアル終了後: 制限が再度かかる (恒久バイパスにならない)。
  const state = { active: true };
  const api = makeRestrictedApi({ id: 'req1', name: 'テスト' }, state);
  assert.equal(api.isRestricted(), false, 'still bypassed while tutorial is active');
  state.active = false;
  assert.equal(api.isRestricted(), true, 'restriction must resume once the tutorial ends');
}
{
  // tutorialState が未定義でも例外を投げない (try/catch 経路)。
  const api = vm.runInNewContext(`(() => {
    ${restrictSrc}
    return { isRestricted: isShopNoriCraftRestricted };
  })()`, { currentRequester: { id: 'req1' } });
  assert.equal(api.isRestricted(), true, 'must not throw and must fall back to shop-mode check when tutorialState is undefined');
}

// ---------------------------------------------------------------------------
// 3. getFreeGuideTabs(): デフォルト分岐 (ガイドなし/tier3Prompt以外) が decor タブを
//    isShopNoriCraftRestricted() で除外する。 box/rice 単一ステップの早期 return は
//    ガードなしのまま (guide 中は palette 側/setFreeGuideStep 側で制御する設計)。
//    decor 単一ステップの早期 return だけは、undo/redo (restoreFreeHistoryState) が
//    setFreeGuideStep を経由せず freeGuideStep='decor' を直接復元しうる経路の防御として
//    isShopNoriCraftRestricted() 中は decor タブを出さない (fix: cross-review blocking issue)。
// ---------------------------------------------------------------------------
const guideTabsSrc = extract(html, 'function getFreeGuideTabs() {', 'function normalizeFreeGuideTab()', 'getFreeGuideTabs');
assert.match(guideTabsSrc, /return FREE_TABS\.filter\(t => !\(t\.id === 'decor' && isShopNoriCraftRestricted\(\)\)\);\s*\}\s*$/,
  'the trailing default branch must filter out the decor tab when isShopNoriCraftRestricted()');
assert.match(guideTabsSrc, /if \(freeGuideStep === 'box'\) return FREE_TABS\.filter\(t => t\.id === 'box'\);/);
assert.match(guideTabsSrc, /if \(freeGuideStep === 'decor'\) \{[\s\S]*?isShopNoriCraftRestricted\(\)[\s\S]*?\}/,
  'the decor early-return branch must also consult isShopNoriCraftRestricted() (undo/redo defense-in-depth)');
{
  const decorBranchIdx = guideTabsSrc.indexOf("if (freeGuideStep === 'decor')");
  const decorBranchSrc = guideTabsSrc.slice(decorBranchIdx, guideTabsSrc.indexOf('if (isOkazuGuideStep())', decorBranchIdx));
  assert.doesNotMatch(decorBranchSrc, /return FREE_TABS\.filter\(t => t\.id === 'decor'\);\s*$/,
    'decor branch must not unconditionally return the decor tab (must be gated on isShopNoriCraftRestricted)');
}

// ---------------------------------------------------------------------------
// 3b. restoreFreeHistoryState(): undo/redo が state.freeGuideStep を直接代入する際、
//     'decor' かつ isShopNoriCraftRestricted() なら 'tier2Main' へリマップする
//     (setFreeGuideStep と同じ着地。これが今回の cross-review blocking issue の主修正)。
// ---------------------------------------------------------------------------
const restoreSrc = extract(html, 'function restoreFreeHistoryState(state) {', 'function undoFreeHistory(', 'restoreFreeHistoryState');
assert.match(restoreSrc, /freeGuideStep = state\.freeGuideStep \|\| freeGuideStep;/);
assert.match(restoreSrc,
  /if \(freeGuideStep === 'decor' && isShopNoriCraftRestricted\(\)\) freeGuideStep = 'tier2Main';/,
  'restoreFreeHistoryState must sanitize a restored decor step when nori craft is shop-restricted');
{
  const assignIdx = restoreSrc.indexOf('freeGuideStep = state.freeGuideStep || freeGuideStep;');
  const sanitizeIdx = restoreSrc.indexOf("if (freeGuideStep === 'decor' && isShopNoriCraftRestricted())");
  assert.ok(assignIdx >= 0 && sanitizeIdx > assignIdx, 'the sanitize check must run right after the raw assignment');
}

// ---------------------------------------------------------------------------
// 4. setFreeGuideStep(): 'decor' ステップは isShopNoriCraftRestricted() 中は
//    'tier2Main' へリマップされ、ガイド付きフローがのり細工工程を完全に飛ばす。
// ---------------------------------------------------------------------------
const setStepSrc = extract(html, 'function setFreeGuideStep(step, opts = {}) {', 'function getFreePaletteItems(tabId) {', 'setFreeGuideStep');
assert.match(setStepSrc, /if \(step === 'decor' && isShopNoriCraftRestricted\(\)\) step = 'tier2Main';/,
  'decor step must remap to tier2Main when nori craft is restricted');
{
  const remapIdx = setStepSrc.indexOf("if (step === 'decor' && isShopNoriCraftRestricted())");
  const assignIdx = setStepSrc.indexOf('freeGuideStep = step;');
  assert.ok(remapIdx >= 0 && assignIdx > remapIdx, 'the remap must happen before freeGuideStep is assigned');
}

// ---------------------------------------------------------------------------
// 5. addSimpleFreePaletteItem(): decor 分岐の冒頭に shop ガードがあり、既存の
//    tut2-nori-undo/edit/ok の直接ガード (置換防止) より先に評価される
//    (defense-in-depth: パレット非表示が第一防衛線、これは第二防衛線)。
// ---------------------------------------------------------------------------
const paletteAddSrc = extract(html, 'function addSimpleFreePaletteItem(def) {', 'function beginFreePaletteDrag(e, def) {', 'addSimpleFreePaletteItem');
assert.match(paletteAddSrc, /if \(def\.type === 'decor'\) \{/, 'must branch on decor type');
assert.match(paletteAddSrc, /if \(isShopNoriCraftRestricted\(\)\) \{[\s\S]*?おみせの おべんとうには のりの かざりは つかわないよ[\s\S]*?return null;\s*\}/,
  'shop-mode guard must block new decor placement with the expected child-facing message');
{
  const decorBranchIdx = paletteAddSrc.indexOf("if (def.type === 'decor') {");
  const shopGuardIdx = paletteAddSrc.indexOf('isShopNoriCraftRestricted()', decorBranchIdx);
  const tut2UndoGuardIdx = paletteAddSrc.indexOf("tutorialState.step === 'tut2-nori-undo'", decorBranchIdx);
  assert.ok(decorBranchIdx >= 0 && shopGuardIdx > decorBranchIdx && tut2UndoGuardIdx > shopGuardIdx,
    'the shop-mode guard must run before the tut2-nori-undo/edit/ok replace-guard');
}

// ---------------------------------------------------------------------------
// 6. getFreePaletteItems('rice'): 自由/チュートリアル中は従来どおり1択のまま。
//    お店モード制限中のみ isBentoDecorUnlocked 条件付きで3択 (しろごはん/うめぼし/のりべんセット)。
// ---------------------------------------------------------------------------
const paletteItemsSrc = extract(html, 'function getFreePaletteItems(tabId) {', 'function getAutoRicePaletteItem() {', 'getFreePaletteItems');
const riceBranch = extract(paletteItemsSrc, "if (tabId === 'rice') {", "if (tabId === 'food') {", 'rice palette branch');
assert.match(riceBranch, /const riceItems = \[getAutoRicePaletteItem\(\)\];/, 'base case must remain a single-item array');
assert.match(riceBranch, /if \(isShopNoriCraftRestricted\(\)\) \{/, 'the 3-choice expansion must be gated on isShopNoriCraftRestricted');
{
  const gateIdx = riceBranch.indexOf('if (isShopNoriCraftRestricted()) {');
  const renameIdx = riceBranch.indexOf("riceItems[0] = { ...riceItems[0], name: 'しろごはん' };");
  const umeIdx = riceBranch.indexOf('getUmeboshiRicePaletteItem()');
  const noribenIdx = riceBranch.indexOf('getNoribenRicePaletteItem()');
  assert.ok(gateIdx >= 0 && renameIdx > gateIdx && umeIdx > renameIdx && noribenIdx > umeIdx,
    'inside the shop-mode gate: rename to しろごはん, then push umeboshi, then push noriben preset, in order');
  const umeGuardMatch = riceBranch.match(/const umeDef = decorItems\.find\(d => d\.id === 'decor_umeboshi'\);\s*\n\s*if \(umeDef && isBentoDecorUnlocked\(umeDef\)\) riceItems\.push\(getUmeboshiRicePaletteItem\(\)\);/);
  assert.ok(umeGuardMatch, 'umeboshi preset must be pushed only when isBentoDecorUnlocked(umeDef)');
  const sheetGuardMatch = riceBranch.match(/const sheetDef = decorItems\.find\(d => d\.id === 'nori_bento_sheet'\);\s*\n\s*if \(sheetDef && isBentoDecorUnlocked\(sheetDef\)\) riceItems\.push\(getNoribenRicePaletteItem\(\)\);/);
  assert.ok(sheetGuardMatch, 'noriben preset must be pushed only when isBentoDecorUnlocked(sheetDef)');
}

// ---------------------------------------------------------------------------
// 7. NORIBEN_RICE_MASK_ASPECT は round/bear/cat の3キーを持つ。
// ---------------------------------------------------------------------------
const noribenDefsSrc = extract(
  html,
  '// batch:1285: お店モード ごはん3択プリセット。',
  'function getBoxCenterSpot(box) {',
  'noriben preset builders',
);
const aspectMatch = noribenDefsSrc.match(/const NORIBEN_RICE_MASK_ASPECT = \{\s*rice_base_round:\s*[\d./ ]+,\s*rice_base_bear:\s*[\d./ ]+,\s*rice_base_cat:\s*[\d./ ]+\s*\};/);
assert.ok(aspectMatch, 'NORIBEN_RICE_MASK_ASPECT must define exactly round/bear/cat aspect ratios');

// ---------------------------------------------------------------------------
// 8. getNoribenSetItemDef(): id は 'nori_bento_set' (nori_ prefix)。
//    riceMaskImage と、nori_bento_sheet.png を3枚使う clusterImages を持つ。
// ---------------------------------------------------------------------------
assert.match(noribenDefsSrc, /id: 'nori_bento_set',[\s\S]*?type: 'decor'/, 'noriben set item must use the nori_ prefixed id nori_bento_set with type decor');
assert.match(noribenDefsSrc, /riceMaskImage: base\.image, riceMaskAspect: NORIBEN_RICE_MASK_ASPECT\[base\.id\]/,
  'noriben set item must carry a riceMaskImage + riceMaskAspect derived from the selected box base rice');
{
  const stripsMatch = noribenDefsSrc.match(/const NORIBEN_STRIPS = \[([\s\S]*?)\];/);
  assert.ok(stripsMatch, 'NORIBEN_STRIPS must be defined');
  const stripCount = (stripsMatch[1].match(/\{ y:/g) || []).length;
  assert.equal(stripCount, 3, 'noriben set must render exactly 3 nori strips');
  const clusterImagesMatch = noribenDefsSrc.match(/clusterImages: NORIBEN_STRIPS\.map\(s => \(\{ img: FREE_ASSET \+ 'nori_bento_sheet\.png'/);
  assert.ok(clusterImagesMatch, 'getNoribenSetItemDef clusterImages must be built from NORIBEN_STRIPS using nori_bento_sheet.png');
}
// id-prefix ベースで「のり禁止」判定してはいけない、という運用コメントが明記されていること
// (自己参照バグの再発防止)。
assert.match(noribenDefsSrc, /のり禁止.*isShopNoriCraftRestricted \+ decor パレット経路で行うこと/);

// ---------------------------------------------------------------------------
// 9. addFreeLayoutItem(): item リテラルが def.riceMaskImage/riceMaskAspect を
//    安全なデフォルト付きでコピーする (旧保存データ互換)。
// ---------------------------------------------------------------------------
const addItemSrc = extract(html, 'function addFreeLayoutItem(def, opts = {}) {', 'function getSimpleRequiredRemovalRole(item) {', 'addFreeLayoutItem');
assert.match(addItemSrc, /riceMaskImage: def\.riceMaskImage \|\| '',/, 'item literal must copy riceMaskImage with a safe empty-string fallback');
assert.match(addItemSrc, /riceMaskAspect: def\.riceMaskAspect \|\| 0,/, 'item literal must copy riceMaskAspect with a safe 0 fallback');

// ---------------------------------------------------------------------------
// 10. createFreeVisual(): riceMaskImage 分岐が既存の clusterImages 分岐より前に
//     評価され、-webkit-mask-image / mask-image を item.riceMaskImage から設定する。
// ---------------------------------------------------------------------------
const visualSrc = extract(html, 'function createFreeVisual(item) {', 'function createFreePlacedElement(item, interactive) {', 'createFreeVisual');
{
  const maskBranchIdx = visualSrc.indexOf('item.riceMaskImage');
  const genericClusterBranchIdx = visualSrc.indexOf("wrap.className = 'free-cluster-item';");
  assert.ok(maskBranchIdx >= 0 && genericClusterBranchIdx > maskBranchIdx,
    'the riceMaskImage mask branch must be checked before the generic clusterImages branch');
}
assert.match(visualSrc, /maskBox\.style\.setProperty\('-webkit-mask-image', maskUrl\);/);
assert.match(visualSrc, /maskBox\.style\.setProperty\('mask-image', maskUrl\);/);
assert.match(visualSrc, /const maskUrl = `url\("\$\{item\.riceMaskImage\}"\)`;/);
assert.match(visualSrc, /maskBox\.style\.aspectRatio = String\(item\.riceMaskAspect \|\| \(343 \/ 303\)\);/);

// CSS: .free-noriben-mask block must exist ahead of the pre-existing .free-cluster-item rule.
{
  const maskCssIdx = html.indexOf('.free-noriben-mask {');
  const clusterCssIdx = html.indexOf('.free-cluster-item {');
  assert.ok(maskCssIdx >= 0 && clusterCssIdx > maskCssIdx, '.free-noriben-mask CSS must be declared before .free-cluster-item');
}

// createFreePlacedElement: noriben-set items are non-interactive (fixed to parent rice position).
const placedElSrc = extract(html, 'function createFreePlacedElement(item, interactive) {', 'function getFreeControlIconName(label) {', 'createFreePlacedElement');
assert.match(placedElSrc, /if \(interactive && !item\.riceMaskImage[\s\S]{0,40}&& !freeBrushStampDef && !simpleLeafArmedDef && !leafReference\) \{/,
  'items with riceMaskImage must skip the interactive pointerdown handler branch');

// ---------------------------------------------------------------------------
// 11. showShopOpening(): 橋渡しカードは !options.skipIntro ゲート内でのみ追加され、
//     voice キーを持たず (無音)、『おねがいどおりに』を含み、一人称 (わたし/ぼく) を含まない。
// ---------------------------------------------------------------------------
const bridgeSrc = extract(
  html,
  '// batch:1285: お店モード初回',
  "const steps = options.skipIntro ? allSteps.slice(1) : allSteps;",
  'shop opening bridging card',
);
assert.match(bridgeSrc, /if \(!options\.skipIntro\) \{/, 'bridging card must be gated on !options.skipIntro');
{
  const pushMatch = bridgeSrc.match(/allSteps\.push\(\{([\s\S]*?)\}\);/);
  assert.ok(pushMatch, 'bridging card object literal must exist');
  const cardBody = pushMatch[1];
  assert.doesNotMatch(cardBody, /voice\s*:/, 'bridging card must not carry a voice key (silent, no new TTS)');
  assert.match(cardBody, /おねがいどおりに/, "bridging card copy must include 「おねがいどおりに」");
  assert.doesNotMatch(cardBody, /わたし|ぼく/, 'bridging card must stay third-person narrator style with no character first-person voice');
}

// ---------------------------------------------------------------------------
// 12. getFreeLayoutCompletionData(): nutritionItems フィルタが type food/rice のまま
//     (decor を含まない) = のり弁/うめぼし追加が採点・栄養バランスに影響しないことの静的証明。
// ---------------------------------------------------------------------------
const completionSrc = extract(html, 'function getFreeLayoutCompletionData() {', 'function syncFreeLayoutSelectionState() {', 'getFreeLayoutCompletionData');
assert.match(completionSrc, /const nutritionItems = placedItems\.filter\(i => i\.type === 'food' \|\| i\.type === 'rice'\);/,
  'nutritionItems filter must remain food/rice only (decor items like nori_bento_set/decor_umeboshi must stay excluded)');
assert.doesNotMatch(completionSrc, /'decor'/, 'completion/scoring data must not reference decor type at all');

// decor_umeboshi と nori_bento_set (via getNoribenSetItemDef) は共に type: 'decor' なので
// 上記フィルタから機械的に除外される、という前提そのものを確認する。
assert.match(html, /id: 'decor_umeboshi', type: 'decor'/, 'decor_umeboshi must be type decor (excluded from nutrition scoring)');
assert.match(noribenDefsSrc, /type: 'decor', name: 'のりべん'/, 'nori_bento_set must be type decor (excluded from nutrition scoring)');

// ---------------------------------------------------------------------------
// 13. addShopRicePresetTopping(): うめぼし/のりべんセットは rice の子として追加され、
//     removeRiceOnTier の既存 parentId カスケード削除経路に自動的に乗る。
// ---------------------------------------------------------------------------
const toppingSrc = extract(html, 'function addShopRicePresetTopping(kind, rice) {', 'function resetSimpleBentoBuildForBoxChange() {', 'addShopRicePresetTopping');
assert.match(toppingSrc, /parentId: rice\.uid,/g, 'both umeboshi and noriben presets must be parented to the rice item for cascade-delete compatibility');
assert.match(toppingSrc, /skipTutorialPlace: true,/g, 'preset toppings must not fire tutorial item-placed hooks (only the rice placement itself should)');

// ---------------------------------------------------------------------------
// 14. sw.js: CACHE_VERSION が今回のバッチ用にバンプされ、履歴コメントに batch:1285 が残る。
// ---------------------------------------------------------------------------
assert.match(sw, /const CACHE_VERSION = 2168;/, 'CACHE_VERSION must be bumped to 2168 for this batch');
assert.match(sw, /\/\/ v2168:[\s\S]{0,400}batch:1285/, 'the v2168 history comment must reference batch:1285');

console.log('bento shop nori restriction regression: PASS');
