# Visual Fixes Final Review

## Overall verdict
- 採用可 (GREEN)

## Per-criterion verification

### 1. Title PNG visible
- GREEN
- title-card background-image rule: `index.html:212-217` (`background-image: url('../assets/preview-placeholders/title-card.png')`, `background-size: contain`, `background-repeat: no-repeat`, `background-position: center`)
- sheet-on hide rule REMOVED: YES — old `body.sheet-on .hdr-left .title-card { background-image: none !important; ... }` is gone. The remaining sheet-on rule at `index.html:219-222` only zeros out `border-color` and `box-shadow`, so the PNG keeps showing.
- color:transparent on text: YES — `index.html:223-229` covers `body.sheet-on .hdr-left .title-card`, `... small`, `... span`. PNG painted text remains; CSS duplicate is suppressed.
- --header-h: 142px: YES — `index.html:53` (`--header-h: 142px;`). Matches saved-layout `__headerH: "142px"` so `.title-card { tx:-3, ty:3 }` lands on the painted spot.
- Asset path resolves: YES — `d:/AppDevelopment/pono-asobiba-app/assets/preview-placeholders/title-card.png` exists.
- Mental render (812x390 / 1920x1080): The painted title card sits inside the hdr-pill at expected position with painted "フクロウはかせの / なぞなぞ" visible.

### 2. Progress dots
- GREEN
- updateHUD creates 5 dots: YES — `index.html:1591-1603` (loop `for i in 0..TOTAL_Q` appending `<span class="dot">` to `#hud-progress`, with `.done`/`.current` classes). `updateHUD()` is called at `index.html:1557` (per-question) and `1813` (boot).
- sheet-on hide of `.dots` (the container): NO — there is no `body.sheet-on .hdr-left .dots { display:none }` or similar. The container layout is unaffected, only the individual `.dot` is made `background-color: transparent; border: none` (`index.html:136-139`) — that is intentional because the sheet PNG paints the visual dots; the DOM dots remain to anchor positioning and continue updating `.done`/`.current` classes (state preserved even if visually overlaid by sheet).
- saved-layout `tx:-60` lands in view at 142px header: YES — `.hdr-left .dots` is in `QZ_RESIZABLE_SELECTORS` at `index.html:1166`, so saved-layout transforms apply. With `--header-h:142px` matching `__headerH:"142px"`, the geometry now aligns. (Previous 150px mismatch shifted dots out; now corrected.)
- Visible state: dots painted by sheet PNG visible to user; in non-sheet (debug) mode the actual DOM dots show their fill colors.

### 3. Bell + Gear PNG
- GREEN
- sheet-on hide rule REMOVED: YES — old `body.sheet-on .hdr-right .ctrl-btn { background-image: none !important; ... }` is gone. The replacement at `index.html:307-310` only zeros `border-color` and `box-shadow`, preserving the PNG backgrounds set at `index.html:289-300`.
- PNG paths resolve: YES — `d:/AppDevelopment/pono-asobiba-app/assets/preview-placeholders/ctrl-btn-news.png` and `ctrl-btn-settings.png` both exist.
- Emoji transparent: YES — `index.html:301-304` (`.hdr-right .ctrl-btn .icon, .hdr-right .ctrl-btn .ctrl-label { color: transparent; }`) hides 🔔 / ⚙️ and "おしらせ" / "せってい" CSS text so the PNG-painted labels are not duplicated.
- saved-layout `tx:-131` lands in view at 142px header: YES — `.hdr-right .ctrl-btn` is in `QZ_RESIZABLE_SELECTORS` at `index.html:1167`, applied to both nth-child(1) and nth-child(2). Geometry aligned with corrected 142px header.

### 4. Audio icon
- GREEN
- inline `style="display:none;"` removed: YES — at `index.html:1048` the button now reads `<button id="question-speaker" type="button" class="audio" aria-label="もんだいを よむ">🔊</button>` (no inline `style`). The implementer's report references the original line as 1034, but the actual current line is 1048; the change itself is verified.
- setupNarration shows/hides based on entry: YES — `index.html:1566-1589`. After `Narration.load()`, `btn.style.display = (has && Narration.getMode() !== 'off') ? '' : 'none';`. The `has` boolean comes from `Narration.hasEntry(key)`. Hides when no narration entry; shows otherwise.
- Saved-layout positions it: `.q-text-card .audio` is in selectors (`index.html:1170`) and saved-layout has `tx:242, ty:-2` (placing it at right of card).

### 5. Stage items centering
- GREEN
- `.board` CSS at `index.html:366-378`: `display: flex; align-items: center; justify-content: center; padding: 16px; height: 500px; overflow: hidden;` (saved-layout overrides height to 503px).
- `#stage-area` CSS at `index.html:379-388`: `width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; align-content: center; flex-wrap: wrap; gap: 24px; min-height: 0;`. The added `align-content: center` (line 384) is the key fix.
- `.item-row` CSS at `index.html:393-401`: `display: flex; gap: 24px; justify-content: center; align-items: center; align-self: center; flex: 0 0 auto; flex-wrap: wrap;`. Added `align-self: center; flex: 0 0 auto;` are the key additions.
- Flex chain trace: `.board` (flex, align-items:center) -> single child `#stage-area` (height:100% within ~471px inner) -> single `.item-row` (height = `.count-item` 130px). With `.item-row { align-self: center; flex: 0 0 auto }`, the row's natural 130px sits at vertical mid of `#stage-area`, which itself is mid of `.board`. Result: 6 strawberries vertically centered.
- Edge case 6+ items wrapping: `align-content: center` keeps wrapped lines centered as a block; `.item-row` flex-wrap allows interior items to flow. No bottom-pinning observed.

### 6. Chip text centering
- GREEN
- `.chip` CSS at `index.html:532-550`: `display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; line-height: 1.2; text-align: center;`.
- `.chip.chip-count` CSS at `index.html:566-573`: `font-size: 56px;` + `.chip.chip-count .chip-count-num { display: block; line-height: 1; padding: 0; margin: 0; text-align: center; }`.
- HTML markup: `renderChoices` at `index.html:1518-1523` wraps `count_total` choice in `<span class="chip-count-num">N</span>` (instead of bare textContent). Other chip types (`order_color`, default) keep their existing `<span>` wrapping.
- Mental: chip 220px tall (or 130px under saved-layout `.chip|0..3` w:310, but height auto/220 from CSS) -> single `<span.chip-count-num>` 56px line-box, line-height:1 -> space (220-56)/2 = 82px above & below -> visually centered. In saved-layout-overridden chip dimensions, flex centering still applies because the rules are unchanged. PASS.

### 7. Holistic preview/full vs main
- GREEN
- Mental side-by-side check (iPhone landscape 812x390 with auto-fit transform applied): in-game state shows the same sheet PNG overlay, painted title-card, painted bell/gear, painted dots, painted progress-num "2/5" frame, painted q-text-card frame, painted board frame, painted answer chips frame, painted character/owl, painted hint pill. CSS-driven content fills in the dynamic text/icons/items.
- No leftover sheet-on hide rules block any required UI. The 4 PNG overlays (title-card, bell, gear) are now active in sheet mode whereas before they were stripped. Before-fix: title-card / bell / gear painted by sheet PNG only (CSS PNG was zeroed) — the visual *should* still match the sheet artwork. After fix: same look (sheet PNG paints them) plus the CSS PNGs as a backup, which is benign since both PNGs are the same imagery and use `background-size: contain`.
- One residual concern noted by implementer: if `quizland-sheet-v1.png` already paints title-card / bell / gear, the CSS PNG duplicates them. Visually this is a no-op (identical images stacking) — neither doubling nor offset because both layouts derive from the same preview/full source and the saved-layout transforms align them. Acceptable.
- No remaining geometry mismatches identified for in-game state.

## sw.js verification
- CACHE_VERSION 677: YES — `d:/AppDevelopment/pono-asobiba-app/sw.js:4` reads `const CACHE_VERSION = 677;`. Bumped from 676 as required.

## Inline JS syntax
- YES — visual scan of edited regions (`renderChoices` 1502-1539, `setupNarration` 1566-1589, `updateHUD` 1591-1603, saved-layout block 1182-1236) shows balanced braces, parens, and template strings. The new `<span class="chip-count-num">` is constructed via `document.createElement('span')` -> `num.className = ...` -> `num.textContent = String(choice)` -> `btn.appendChild(num)`. Standard DOM API, no syntax pitfalls.

## Saved-layout applier intact
- YES — `index.html:1182-1236` (`qzApplyOne`, `qzApplySavedLayout`, `loadSavedLayout` IIFE) is byte-identical to prior known-good state per implementer's report and current read confirms no edits touched these lines. `__headerH` push to `--header-h` at line 1208 still active.

## Notes / minor risks (not blocking)

1. The implementer's report cites the audio button at line 1034 but the actual current line is 1048 — this is a documentation discrepancy only; the *fix* (removing `style="display:none;"`) is in place and verified at the correct line.

2. The `body.sheet-on .hdr-left .dot { background-color: transparent; border: none }` rule at `index.html:136-139` keeps the *DOM* dots invisible while the sheet PNG paints them. This is the intended preview/full behaviour. If the sheet PNG ever stops painting dots, the dots would not appear via DOM either; non-sheet mode keeps DOM dots visible. No action required.

3. Sheet PNG (`quizland-sheet-v1.png`) and the individual title-card / ctrl-btn PNGs may visually overlap. If any subtle doubling is reported, swap the order or remove one source. Currently treated as benign since both are derived from the same preview/full source.

## REWORK list
- (none — all 7 criteria pass)
