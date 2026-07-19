# Kumo Rescue — Donguri Bowl mini-game

## Encounter token / alias
- Primary: `donguri_bowl` (descriptive)
- Legacy alias: `web_sweep` (kept for save/state compat)
- Both resolve to `_showBowlGame` via `_GAME_STARTERS` (maze/index.html).
- `_closeEncounter` branches `'web_sweep' || 'donguri_bowl'` both detach listeners + clear `_bowlGameState`.

## v1054 strike-overhaul (2026-06-12)

### Problems fixed
1. **Pono blocked view** — bear at 28% screen-height, dead-center, covered most pins.
2. **Perspective dead** — pins bunched at y=0.70-0.90, ground only 66%-100%, sky strip wasted 34%.
3. **Arc throw → 1 pin per ball** — donguri flew arc, landed at single point, hit nearest pin only.
4. **Weak chain** — only nearest unfelled pin (1 extra) cascaded per throw.
5. **Bunched layouts** — pin spacing 0.12-0.15 normalized, lateral range 0.34-0.66 — both too narrow.

### Solution shipped
- **Pono**: shrunk to 12% height, anchored bottom-left corner (`BOWL_PONO_SIDE='left'`, x-pad=4%, y-pad=1.5%). Arm-swing is a Canvas-drawn forearm + hand-tip that extends from shoulder toward `(35% W, throw direction)` during 350ms throw window. Pono body itself never leaves the corner.
- **Perspective**: vanishing line moved up to y=8% (tiny treetop strip). Ground trapezoid spans 8%..100% — 92% of canvas is playable depth. Lane grooves fan from vanishing point to bottom corners. Side logs reposed as vertical edge-frames.
- **Throw = rolling, not arc**: `_drawBowlDonguri` removed `Math.sin(t*PI)*0.22*H` lift. Donguri now interpolates linearly along ground from pono's throw origin to `(targetX, targetY)`, scales 1.0 → 0.55 for depth, spins 6π over flight, tiny 0.8% bob for roll feel.
- **Sweep collision**: `_updateBowlPhysics` checks **every frame** for every alive donguri against every standing pin (`dist < HIT_R + 0.025`). Donguri pierces up to 2 pins (`maxHits=2`) then stops at the contact point.
- **Directional cascade**: new `_bowlFellPin(gs, pin, knockDirX, knockDirY, depth, now)`:
  - Sets pin's `knockDirX/Y` so `_drawBowlPin` rotates pin in the direction it was hit (rot = `fallProgress * (PI/2.1) * knockDirX`, yScale shrinks with `|knockDirY|`).
  - Schedules cascade at `now+80ms` (`_webGimmickSetTimeout` so cleanup catches it).
  - **Fells ALL qualifying pins** (not just nearest): `dist<0.085` AND `dot(unit(delta), knockDir) > 0.30`.
  - Each cascade child's knockDir is a fanned average: `0.4*orig + 0.6*toChild + sin(p2.id+depth)*0.15`, renormalized.
  - Bounded by `BOWL_CHAIN_MAX_DEPTH=6` — domino can ripple up to 6 hops before stopping.
- **Layouts** (BOWL_PIN_LAYOUTS): all 5 redesigned to occupy y=0.30-0.80, x=0.22-0.82.
  - `CLASSIC`: real 10-pin triangle 4-3-2-1 (head pin front, back row of 4 deep).
  - `DIAMOND`: 13 pins 1-3-5-3-1, very dense.
  - `V_SHAPE`: 7 pins, head deep, wings forward.
  - `WALL`: 8 pins single back row, pitch 0.075.
  - `DOUBLE_LINE`: 10 pins 5+5 staggered.

### Determinism
- Zero `Math.random` in bowl block. Confirmed via `Grep Math.random`.
- All jitter via `Math.sin(seed)`. Cascade jitter keyed on `pin.id + depth`.
- Layout pick via `bowlEncounterCount + creature.id` hash.
- Pin `id` assigned in `_layoutBowlPins` (idx).

### Listener hygiene
- `_detachBowlListeners(gs)` removes `pointerdown` from stageEl + `resize` from window + cancels rafId.
- Called from `_resolveBowlGame` and `_closeEncounter`'s web_sweep/donguri_bowl branch.
- Reduced-motion path skips rAF entirely — `_stepBowlReducedMotion` does one synchronous sweep + 1-pass render. No listener leaks.

### CSS
- `.bowl-game__stage` desktop aspect 1.34→**1.55/1** (wider lane).
- Mobile `min-height` 180→200px, `height: min(54dvh,210px)` → **min(58dvh, 240px)**.
- Stage background gradient changed (cdeacb green sky strip → brown earth tones) — canvas redraws the scene anyway, but the bg matches if image fails to paint.

### Reduced motion parity
- `_stepBowlReducedMotion` does line-sweep along donguri trajectory (24 samples) for the same hit logic as the rAF path.
- Calls shared `_bowlFellPin` so cascade behavior is identical (dot-gate, fan-jitter, recursion depth).

### Constants (final)
| Name | Value | Purpose |
|---|---|---|
| `BOWL_DONGURI_FLIGHT_MS` | 600 | throw duration |
| `BOWL_HIT_R_REL` | 0.055 | donguri vs pin hit radius (normalized) |
| `BOWL_CHAIN_R_REL` | 0.085 | domino reach |
| `BOWL_CHAIN_DOT_MIN` | 0.30 | directional gate cos-θ threshold |
| `BOWL_CHAIN_MAX_DEPTH` | 6 | cascade hop cap |
| `BOWL_CHAIN_DELAY_MS` | 80 | per-hop delay |
| `BOWL_TARGET_DEPTH_MIN` | 0.32 | tap-near-top maps here (deep) |
| `BOWL_TARGET_DEPTH_MAX` | 0.55 | tap-near-bottom maps here (shallow) |
| `BOWL_DONGURI_R_REL` | 0.034 | donguri visual radius (slightly > 0.032) |
| `BOWL_DONGURI_END_SCALE` | 0.55 | shrink factor at t=1 |
| `BOWL_PONO_HEIGHT_REL` | 0.12 | pono image height |
| `BOWL_PONO_X_PAD_REL` | 0.04 | left edge inset |
| `BOWL_PONO_Y_PAD_REL` | 0.015 | bottom edge inset |
| `BOWL_GROUND_HORIZON_Y` | 0.08 | top strip = treetop only |

### Risks acknowledged
- If user reports cascade chains too easily (>6 pins routinely), drop `BOWL_CHAIN_MAX_DEPTH` to 3.
- If donguri hit radius feels unfair, bump `BOWL_HIT_R_REL` to 0.07.
- Pono x-pad 4%: on devices with screen rounding, may clip — bump to 6% if reported.

### Cache
- `sw.js` CACHE_VERSION → `1054`.
