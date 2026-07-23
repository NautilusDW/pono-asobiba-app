// ── machizukuri/js/parts.js ──
// ポノのまちづくり: SVG パーツ図鑑 + 区画レイアウト + テーマ配色 (DOM 非依存)。
// 描画・保存・購入判定は js/game.js (DOM) と js/logic.js (状態) が担当し、
// ここは完全に自己完結した inline SVG 文字列とレイアウト座標のみを持つ
// 純データ/マークアップモジュール。DOM操作・他ファイル依存は一切行わない。
//
// クロスファイル契約に関する注意 (このファイル単体では検証できない非自明な制約):
// - LOTS[].id / FLOWER_SLOTS の並び順は js/logic.js 側の state.lots / state.flowers
//   の並び順とインデックスで対応させる想定 (js/game.js が両者を橋渡しする)。
//   このファイルは ws-a (logic.js) を一切 require/参照しないため、実際の
//   突合せは game.js の実装時に行われる。HOUSE_LOT_ID / TREE_LOT_ID は
//   その橋渡しを楽にするための命名規約の目印であり、強制力はない。
// - BG_SCENE / パーツSVG中の var(--machi-*, フォールバック値) は、CSS側
//   (styles.css) で同名カスタムプロパティが未定義でも必ずデイ配色で
//   描画できるよう、フォールバック値に DAY_TINT と同じ値を埋め込んである。
//   sceneTint(true) / sceneTint(false) が返す値を game.js 側でステージ
//   要素の style に setProperty すると夕方⇄昼が切り替わる。
'use strict';

(function () {

  var STAGE_VIEWBOX = '0 0 1600 900';

  var HOUSE_LOT_ID = 'lot1';
  var TREE_LOT_ID = 'lot2';

  // ═══ 区画レイアウト (12区画、道を挟んで奥列/手前列) ═══════════════
  // 奥列 (y=360, scale小さめ) は空側、手前列 (y=700, scale大きめ) に
  // いえ (lot1) と き (lot2) を先頭配置。x/y は STAGE_VIEWBOX 座標系。
  var LOTS = [
    { id: 'lot1', x: 800, y: 700, scale: 1.2 },
    { id: 'lot2', x: 1020, y: 700, scale: 1.0 },
    { id: 'lot3', x: 140, y: 700, scale: 1.05 },
    { id: 'lot4', x: 360, y: 700, scale: 1.05 },
    { id: 'lot5', x: 580, y: 700, scale: 1.05 },
    { id: 'lot6', x: 1240, y: 700, scale: 1.05 },
    { id: 'lot7', x: 140, y: 360, scale: 0.8 },
    { id: 'lot8', x: 360, y: 360, scale: 0.8 },
    { id: 'lot9', x: 580, y: 360, scale: 0.8 },
    { id: 'lot10', x: 800, y: 360, scale: 0.8 },
    { id: 'lot11', x: 1020, y: 360, scale: 0.8 },
    { id: 'lot12', x: 1240, y: 360, scale: 0.8 }
  ];

  // ═══ はなクラスター用 道ばた micro-slot (16箇所) ═══════════════════
  // 道の上ふち (y=412) と下ふち (y=638) にそれぞれ8箇所ずつ。
  var FLOWER_SLOTS = [
    { id: 'flower1', x: 180, y: 412 },
    { id: 'flower2', x: 360, y: 412 },
    { id: 'flower3', x: 540, y: 412 },
    { id: 'flower4', x: 720, y: 412 },
    { id: 'flower5', x: 900, y: 412 },
    { id: 'flower6', x: 1080, y: 412 },
    { id: 'flower7', x: 1260, y: 412 },
    { id: 'flower8', x: 1440, y: 412 },
    { id: 'flower9', x: 180, y: 638 },
    { id: 'flower10', x: 360, y: 638 },
    { id: 'flower11', x: 540, y: 638 },
    { id: 'flower12', x: 720, y: 638 },
    { id: 'flower13', x: 900, y: 638 },
    { id: 'flower14', x: 1080, y: 638 },
    { id: 'flower15', x: 1260, y: 638 },
    { id: 'flower16', x: 1440, y: 638 }
  ];

  // ═══ 背景 (そら/おか/みち/かわ)。day/evening は CSS カスタムプロパティで切替 ═══
  var BG_SCENE =
    '<svg viewBox="' + STAGE_VIEWBOX + '" xmlns="http://www.w3.org/2000/svg" class="machi-bg-scene" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' +
        '<linearGradient id="machiSkyGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--machi-sky-top, #bfe6ff)"/>' +
          '<stop offset="100%" stop-color="var(--machi-sky-bottom, #eef8ff)"/>' +
        '</linearGradient>' +
        '<linearGradient id="machiRiverGrad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="var(--machi-river-highlight, #d8f3ff)"/>' +
          '<stop offset="100%" stop-color="var(--machi-river, #9fd8ee)"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="1600" height="900" fill="url(#machiSkyGrad)"/>' +
      '<ellipse cx="230" cy="300" rx="260" ry="110" fill="var(--machi-hill-far, #bfe3c9)"/>' +
      '<ellipse cx="720" cy="290" rx="300" ry="120" fill="var(--machi-hill-far, #bfe3c9)"/>' +
      '<ellipse cx="1260" cy="300" rx="280" ry="110" fill="var(--machi-hill-far, #bfe3c9)"/>' +
      '<ellipse cx="420" cy="330" rx="240" ry="90" fill="var(--machi-hill-near, #9ed6ae)"/>' +
      '<ellipse cx="1050" cy="325" rx="260" ry="95" fill="var(--machi-hill-near, #9ed6ae)"/>' +
      '<ellipse cx="300" cy="120" rx="70" ry="26" fill="#ffffff" opacity="0.75"/>' +
      '<ellipse cx="360" cy="104" rx="50" ry="20" fill="#ffffff" opacity="0.75"/>' +
      '<ellipse cx="1220" cy="150" rx="80" ry="28" fill="#ffffff" opacity="0.7"/>' +
      '<rect x="0" y="260" width="1600" height="170" fill="var(--machi-grass, #b8e6a8)"/>' +
      '<rect x="0" y="430" width="1600" height="190" fill="var(--machi-road, #e8d9b8)"/>' +
      '<line x1="40" y1="525" x2="1560" y2="525" stroke="var(--machi-road-line, #ffffff)" stroke-width="10" stroke-linecap="round" stroke-dasharray="60 46"/>' +
      '<rect x="0" y="620" width="1600" height="280" fill="var(--machi-grass, #b8e6a8)"/>' +
      '<path d="M1600,900 L1600,700 C1500,720 1440,760 1420,810 C1400,860 1440,890 1600,900 Z" fill="url(#machiRiverGrad)"/>' +
      '<path d="M1600,900 L1600,760 C1540,775 1500,800 1490,830 C1480,858 1520,880 1600,900 Z" fill="var(--machi-river-highlight, #d8f3ff)" opacity="0.45"/>' +
    '</svg>';

  // ═══ ちょうちょ (アンビエント、配置不可) ═══════════════════════════
  var BUTTERFLIES = [
    {
      id: 'butterfly_a',
      idleAnimClass: 'machi-anim-fly-a',
      svg:
        '<svg viewBox="0 0 60 46" xmlns="http://www.w3.org/2000/svg" class="machi-butterfly machi-butterfly-a">' +
          '<ellipse cx="30" cy="23" rx="2.6" ry="10" fill="#7a5230"/>' +
          '<path d="M30,16 C18,4 4,8 6,20 C7,28 20,26 30,20 Z" fill="#ffcf6b"/>' +
          '<path d="M30,16 C42,4 56,8 54,20 C53,28 40,26 30,20 Z" fill="#ffb84d"/>' +
          '<path d="M30,24 C20,30 10,32 9,26 C8,20 20,20 30,24 Z" fill="#ffe19a"/>' +
          '<path d="M30,24 C40,30 50,32 51,26 C52,20 40,20 30,24 Z" fill="#ffcf6b"/>' +
        '</svg>'
    },
    {
      id: 'butterfly_b',
      idleAnimClass: 'machi-anim-fly-b',
      svg:
        '<svg viewBox="0 0 60 46" xmlns="http://www.w3.org/2000/svg" class="machi-butterfly machi-butterfly-b">' +
          '<ellipse cx="30" cy="23" rx="2.6" ry="10" fill="#5a4468"/>' +
          '<path d="M30,16 C18,4 4,8 6,20 C7,28 20,26 30,20 Z" fill="#d9a6e8"/>' +
          '<path d="M30,16 C42,4 56,8 54,20 C53,28 40,26 30,20 Z" fill="#c688dd"/>' +
          '<path d="M30,24 C20,30 10,32 9,26 C8,20 20,20 30,24 Z" fill="#efc9f2"/>' +
          '<path d="M30,24 C40,30 50,32 51,26 C52,20 40,20 30,24 Z" fill="#d9a6e8"/>' +
        '</svg>'
    }
  ];

  // ═══ 配置パーツ図鑑 (asset_parts_list 準拠、bg_scene/butterfly を除く12点) ═══
  var PARTS = [
    {
      id: 'pono_house',
      name: 'ポノの いえ',
      cost: 0,
      buyable: false,
      repeatable: false,
      sizeClass: 'lg',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-house">' +
          '<rect x="26" y="96" width="148" height="112" rx="14" fill="#fff6e4"/>' +
          '<path d="M14,104 L100,30 L186,104 C186,112 178,116 170,110 L100,54 L30,110 C22,116 14,112 14,104 Z" fill="var(--machi-house-roof, #7fb3e8)"/>' +
          '<rect x="126" y="38" width="18" height="34" rx="6" fill="var(--machi-house-roof, #7fb3e8)"/>' +
          '<rect x="44" y="118" width="34" height="34" rx="8" fill="#eaf6ff"/>' +
          '<rect x="44" y="118" width="34" height="34" rx="8" fill="none" stroke="#ffffff" stroke-width="4"/>' +
          '<line x1="61" y1="118" x2="61" y2="152" stroke="#ffffff" stroke-width="4"/>' +
          '<line x1="44" y1="135" x2="78" y2="135" stroke="#ffffff" stroke-width="4"/>' +
          '<rect x="122" y="118" width="34" height="34" rx="8" fill="#eaf6ff"/>' +
          '<rect x="122" y="118" width="34" height="34" rx="8" fill="none" stroke="#ffffff" stroke-width="4"/>' +
          '<line x1="139" y1="118" x2="139" y2="152" stroke="#ffffff" stroke-width="4"/>' +
          '<line x1="122" y1="135" x2="156" y2="135" stroke="#ffffff" stroke-width="4"/>' +
          '<path d="M84,208 L84,164 C84,150 92,142 100,142 C108,142 116,150 116,164 L116,208 Z" fill="var(--machi-house-door, #4f8fd1)"/>' +
          '<circle cx="108" cy="178" r="3.4" fill="#fff6e4"/>' +
        '</svg>'
    },
    {
      id: 'cottage_akane',
      name: 'あかねの こや',
      cost: 3,
      buyable: true,
      repeatable: false,
      sizeClass: 'md',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 180 190" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-cottage-akane">' +
          '<rect x="20" y="86" width="140" height="98" rx="14" fill="#fff2e6"/>' +
          '<path d="M10,92 L90,26 L170,92 C170,100 162,104 154,98 L90,48 L26,98 C18,104 10,100 10,92 Z" fill="#e2694f"/>' +
          '<rect x="66" y="112" width="30" height="30" rx="7" fill="#ffe9d6"/>' +
          '<line x1="81" y1="112" x2="81" y2="142" stroke="#ffffff" stroke-width="3.4"/>' +
          '<line x1="66" y1="127" x2="96" y2="127" stroke="#ffffff" stroke-width="3.4"/>' +
          '<path d="M112,184 L112,150 C112,138 120,132 128,132 C136,132 144,138 144,150 L144,184 Z" fill="#c94b39"/>' +
          '<circle cx="135" cy="160" r="3" fill="#fff2e6"/>' +
        '</svg>'
    },
    {
      id: 'cottage_aoi',
      name: 'あおいの こや',
      cost: 3,
      buyable: true,
      repeatable: false,
      sizeClass: 'md',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 180 190" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-cottage-aoi">' +
          '<rect x="20" y="86" width="140" height="98" rx="14" fill="#eaf2ff"/>' +
          '<path d="M10,92 L90,26 L170,92 C170,100 162,104 154,98 L90,48 L26,98 C18,104 10,100 10,92 Z" fill="#4f7fc9"/>' +
          '<rect x="66" y="112" width="30" height="30" rx="7" fill="#dcebff"/>' +
          '<line x1="81" y1="112" x2="81" y2="142" stroke="#ffffff" stroke-width="3.4"/>' +
          '<line x1="66" y1="127" x2="96" y2="127" stroke="#ffffff" stroke-width="3.4"/>' +
          '<path d="M112,184 L112,150 C112,138 120,132 128,132 C136,132 144,138 144,150 L144,184 Z" fill="#3a63a6"/>' +
          '<circle cx="135" cy="160" r="3" fill="#eaf2ff"/>' +
        '</svg>'
    },
    {
      id: 'tree_maru',
      name: 'まるい き',
      cost: 1,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: 'machi-anim-sway',
      svg:
        '<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-tree">' +
          '<rect x="66" y="128" width="18" height="62" rx="7" fill="#a9734a"/>' +
          '<circle cx="75" cy="92" r="66" fill="#8fd4a0"/>' +
          '<circle cx="52" cy="70" r="30" fill="#a3e0af" opacity="0.7"/>' +
          '<circle cx="100" cy="112" r="26" fill="#7ec292" opacity="0.6"/>' +
        '</svg>'
    },
    {
      id: 'well',
      name: 'いど',
      cost: 2,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-well">' +
          '<ellipse cx="70" cy="140" rx="52" ry="16" fill="#c9a26a"/>' +
          '<rect x="24" y="96" width="92" height="46" rx="14" fill="#d9b788"/>' +
          '<rect x="24" y="96" width="92" height="14" rx="7" fill="#e8cba0"/>' +
          '<rect x="10" y="46" width="14" height="70" rx="6" fill="#a9734a"/>' +
          '<rect x="116" y="46" width="14" height="70" rx="6" fill="#a9734a"/>' +
          '<path d="M10,50 C10,32 130,32 130,50" fill="none" stroke="#a9734a" stroke-width="10" stroke-linecap="round"/>' +
          '<rect x="66" y="60" width="8" height="46" fill="#8a8a8a"/>' +
          '<rect x="54" y="100" width="32" height="24" rx="5" fill="#7d6a52"/>' +
        '</svg>'
    },
    {
      id: 'bench',
      name: 'べんち',
      cost: 1,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-bench">' +
          '<rect x="18" y="60" width="14" height="40" rx="5" fill="#a9734a"/>' +
          '<rect x="168" y="60" width="14" height="40" rx="5" fill="#a9734a"/>' +
          '<rect x="10" y="48" width="180" height="16" rx="8" fill="#c98f5c"/>' +
          '<rect x="10" y="18" width="16" height="34" rx="6" fill="#a9734a"/>' +
          '<rect x="174" y="18" width="16" height="34" rx="6" fill="#a9734a"/>' +
          '<rect x="18" y="20" width="164" height="12" rx="6" fill="#c98f5c"/>' +
        '</svg>'
    },
    {
      id: 'fence',
      name: 'さく',
      cost: 1,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 220 100" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-fence">' +
          '<rect x="0" y="56" width="220" height="10" rx="5" fill="#e8cba0"/>' +
          '<rect x="8" y="30" width="20" height="60" rx="8" fill="#f2dcb8"/>' +
          '<path d="M8,30 L18,12 L28,30 Z" fill="#f2dcb8"/>' +
          '<rect x="54" y="30" width="20" height="60" rx="8" fill="#f2dcb8"/>' +
          '<path d="M54,30 L64,12 L74,30 Z" fill="#f2dcb8"/>' +
          '<rect x="100" y="30" width="20" height="60" rx="8" fill="#f2dcb8"/>' +
          '<path d="M100,30 L110,12 L120,30 Z" fill="#f2dcb8"/>' +
          '<rect x="146" y="30" width="20" height="60" rx="8" fill="#f2dcb8"/>' +
          '<path d="M146,30 L156,12 L166,30 Z" fill="#f2dcb8"/>' +
          '<rect x="192" y="30" width="20" height="60" rx="8" fill="#f2dcb8"/>' +
          '<path d="M192,30 L202,12 L212,30 Z" fill="#f2dcb8"/>' +
        '</svg>'
    },
    {
      id: 'flowerbed',
      name: 'かだん',
      cost: 1,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-flowerbed">' +
          '<ellipse cx="80" cy="104" rx="70" ry="20" fill="#8a5a3c"/>' +
          '<ellipse cx="80" cy="98" rx="66" ry="17" fill="#6f9a55"/>' +
          '<circle cx="42" cy="82" r="14" fill="#ff9fc0"/>' +
          '<circle cx="42" cy="82" r="5" fill="#ffe27a"/>' +
          '<circle cx="80" cy="70" r="16" fill="#ff8fae"/>' +
          '<circle cx="80" cy="70" r="5.6" fill="#ffe27a"/>' +
          '<circle cx="118" cy="82" r="14" fill="#ffc06a"/>' +
          '<circle cx="118" cy="82" r="5" fill="#fff3d0"/>' +
        '</svg>'
    },
    {
      id: 'streetlamp',
      name: 'がいとう',
      cost: 2,
      buyable: true,
      repeatable: false,
      sizeClass: 'sm',
      idleAnimClass: 'machi-anim-lamp-glow',
      svg:
        '<svg viewBox="0 0 90 220" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-streetlamp">' +
          '<ellipse cx="45" cy="206" rx="26" ry="9" fill="#c9c2b0"/>' +
          '<rect x="39" y="76" width="12" height="126" rx="6" fill="#7a7364"/>' +
          '<circle cx="45" cy="56" r="34" fill="var(--machi-lamp-glow, #ffe9a8)" opacity="var(--machi-lamp-glow-opacity, 0)"/>' +
          '<rect x="26" y="30" width="38" height="46" rx="14" fill="#8a8272"/>' +
          '<ellipse cx="45" cy="50" rx="18" ry="20" fill="#fff6d8"/>' +
          '<path d="M22,30 C22,16 68,16 68,30 Z" fill="#7a7364"/>' +
        '</svg>'
    },
    {
      id: 'pond_bridge',
      name: 'いけの はし',
      cost: 3,
      buyable: true,
      repeatable: false,
      sizeClass: 'md',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-pond-bridge">' +
          '<ellipse cx="110" cy="100" rx="100" ry="40" fill="#9fd8ee"/>' +
          '<ellipse cx="80" cy="90" rx="30" ry="10" fill="#d8f3ff" opacity="0.6"/>' +
          '<path d="M40,90 C70,50 150,50 180,90" fill="none" stroke="#c98f5c" stroke-width="14" stroke-linecap="round"/>' +
          '<path d="M40,98 C70,58 150,58 180,98" fill="none" stroke="#e0b382" stroke-width="8" stroke-linecap="round"/>' +
          '<rect x="34" y="86" width="10" height="26" rx="4" fill="#a9734a"/>' +
          '<rect x="176" y="86" width="10" height="26" rx="4" fill="#a9734a"/>' +
        '</svg>'
    },
    {
      id: 'yasai_stand',
      name: 'やさいすたんど',
      cost: 2,
      buyable: true,
      repeatable: false,
      sizeClass: 'md',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 180 190" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-yasai-stand">' +
          '<rect x="26" y="98" width="128" height="66" rx="10" fill="#e8cba0"/>' +
          '<rect x="18" y="60" width="144" height="20" rx="10" fill="#e2694f"/>' +
          '<path d="M18,60 L34,30 L146,30 L162,60 Z" fill="#f2896f"/>' +
          '<rect x="10" y="56" width="20" height="10" rx="5" fill="#e2694f"/>' +
          '<rect x="150" y="56" width="20" height="10" rx="5" fill="#e2694f"/>' +
          '<circle cx="60" cy="118" r="14" fill="#ff8a5c"/>' +
          '<rect x="58" y="102" width="4" height="10" fill="#6f9a55"/>' +
          '<circle cx="90" cy="122" r="12" fill="#e2694f"/>' +
          '<circle cx="120" cy="116" r="13" fill="#f2a33e"/>' +
        '</svg>'
    },
    {
      id: 'flower_cluster',
      name: 'おはな',
      cost: 1,
      buyable: true,
      repeatable: true,
      sizeClass: 'sm',
      idleAnimClass: '',
      svg:
        '<svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" class="machi-part machi-part-flower-cluster">' +
          '<path d="M35,58 C33,44 33,34 35,24" fill="none" stroke="#6f9a55" stroke-width="4" stroke-linecap="round"/>' +
          '<circle cx="24" cy="40" r="9" fill="#ff9fc0"/>' +
          '<circle cx="24" cy="40" r="3.4" fill="#ffe27a"/>' +
          '<circle cx="46" cy="34" r="10" fill="#ffc06a"/>' +
          '<circle cx="46" cy="34" r="3.8" fill="#fff3d0"/>' +
          '<circle cx="35" cy="18" r="9" fill="#c69bea"/>' +
          '<circle cx="35" cy="18" r="3.4" fill="#ffe27a"/>' +
        '</svg>'
    }
  ];

  // ═══ 昼/夕方 配色 (CSS カスタムプロパティ値のペア) ═══════════════════
  var DAY_TINT = {
    '--machi-sky-top': '#bfe6ff',
    '--machi-sky-bottom': '#eef8ff',
    '--machi-hill-far': '#bfe3c9',
    '--machi-hill-near': '#9ed6ae',
    '--machi-grass': '#b8e6a8',
    '--machi-road': '#e8d9b8',
    '--machi-road-line': '#ffffff',
    '--machi-river': '#9fd8ee',
    '--machi-river-highlight': '#d8f3ff',
    '--machi-lamp-glow': '#ffe9a8',
    '--machi-lamp-glow-opacity': '0'
  };

  var EVENING_TINT = {
    '--machi-sky-top': '#46508a',
    '--machi-sky-bottom': '#f0a875',
    '--machi-hill-far': '#5d7a72',
    '--machi-hill-near': '#4c6b56',
    '--machi-grass': '#5f8a5a',
    '--machi-road': '#c9b98f',
    '--machi-road-line': '#fff6e0',
    '--machi-river': '#3f6f8f',
    '--machi-river-highlight': '#7fb8d6',
    '--machi-lamp-glow': '#ffe9a8',
    '--machi-lamp-glow-opacity': '1'
  };

  /** evening===true なら夕方配色、それ以外は昼配色の CSS カスタムプロパティ map を返す。 */
  function sceneTint(evening) {
    return evening ? EVENING_TINT : DAY_TINT;
  }

  /** pono_room_theme ('boy'|'girl'、既定'boy') から いえ の屋根/ドア配色 CSS カスタムプロパティ map を返す。 */
  function houseThemeTint(theme) {
    if (theme === 'girl') {
      return {
        '--machi-house-roof': '#f2a6c6',
        '--machi-house-door': '#e8789f'
      };
    }
    return {
      '--machi-house-roof': '#7fb3e8',
      '--machi-house-door': '#4f8fd1'
    };
  }

  var api = {
    STAGE_VIEWBOX: STAGE_VIEWBOX,
    HOUSE_LOT_ID: HOUSE_LOT_ID,
    TREE_LOT_ID: TREE_LOT_ID,
    LOTS: LOTS,
    FLOWER_SLOTS: FLOWER_SLOTS,
    BG_SCENE: BG_SCENE,
    BUTTERFLIES: BUTTERFLIES,
    PARTS: PARTS,
    DAY_TINT: DAY_TINT,
    EVENING_TINT: EVENING_TINT,
    sceneTint: sceneTint,
    houseThemeTint: houseThemeTint
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MachiParts = api;
  }
})();
