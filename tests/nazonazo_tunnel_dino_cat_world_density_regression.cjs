#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const sources = Object.freeze({
  game: read("nazonazo-tunnel/js/game.js"),
  html: read("nazonazo-tunnel/index.html"),
  css: read("nazonazo-tunnel/styles.css"),
  sw: read("sw.js")
});

const TOKEN = "20260722-1410";
const QUIZ_ART_TOKEN = "20260721-1409";
const SW_VERSION = 2317;
const THREE_MIB = 3 * 1024 * 1024;
const STAGE_IDS = Object.freeze(["snow", "fire", "dino", "toy", "cat", "fantasy", "sky", "ruins"]);
const LAYER_KEYS = Object.freeze(["sky", "horizon", "mid", "ground", "fg", "decor"]);
const STAGE_ASSET_KEYS = Object.freeze({
  snow: LAYER_KEYS,
  fire: Object.freeze(["sky", "mid", "ground", "fg"]),
  dino: Object.freeze(["sky", "horizon", "mid", "ground", "fg", "meadow"]),
  toy: LAYER_KEYS,
  cat: LAYER_KEYS,
  fantasy: LAYER_KEYS,
  sky: LAYER_KEYS,
  ruins: LAYER_KEYS
});
const EXPECTED_VALIDATE_CHECKS = 126;
const EXPECTED_MUTATIONS = 42;

const CANONICAL = Object.freeze([
  Object.freeze({ name: "branch_dino_far_herd_cutout_20260721.webp", width: 1894, height: 367, bytes: 599190, sha256: "9217d6f0c2e59abb9c8285fa4d0d305b85d6f4e4ed4e9b1d5223c2381a1add9e", raw: "01_dino_far_herd_raw.png", rawWidth: 1942, rawHeight: 809, rawBytes: 1126084, rawSha256: "6c5446c023af876c17a76706341fa7dd58363f63cf299d2e295209be9890a78b", candidate: "dino/branch_dino_far_herd_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_dino_mid_open_cutout_loop_20260721.webp", width: 3884, height: 379, bytes: 1299604, sha256: "8967a62bcea463a528443565529b5d4550762b04178143df2cd3590d1e9a9019", raw: "02_dino_open_sparse_mid_raw.png", rawWidth: 1942, rawHeight: 809, rawBytes: 1131496, rawSha256: "245284306f0dc4f9baa67a0a0decaf88daa923aaea67af2432755aa3ec181790", candidate: "dino/branch_dino_mid_open_cutout_loop_20260721.webp" }),
  Object.freeze({ name: "branch_dino_waterhole_cutout_20260721.webp", width: 1533, height: 722, bytes: 1391088, sha256: "b87326655e514888c2bd16dd22d0fec15021790e240ba49029f94217822af760", raw: "03_dino_waterhole_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2304321, rawSha256: "63882cc1feed7a024001dda64be1cd7ccc9e20de53506144e825612d566cf9e8", candidate: "dino/branch_dino_waterhole_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_dino_stegosaurus_family_cutout_20260721.webp", width: 1448, height: 769, bytes: 1278052, sha256: "b77db471d3da2bc326a4addafbdf472979004b42c2e862828c9060dac0257948", raw: "04_dino_stegosaurus_family_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2186873, rawSha256: "766b39ce69912667e2a70cdada4720197a96a3c7a50e0e19257735f33c4804b3", candidate: "dino/branch_dino_stegosaurus_family_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_dino_parasaurolophus_herd_cutout_20260721.webp", width: 1453, height: 769, bytes: 1298290, sha256: "3c78ac818652d71218d546b1a7ad9fe1624b973e28dd8d24e628b707fdc947af", raw: "05_dino_parasaurolophus_herd_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2176609, rawSha256: "cc1f835890bd41b6b696a2c48620d80d85a844b611b2bf7fc615048ea7df2a51", candidate: "dino/branch_dino_parasaurolophus_herd_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_dino_sauropod_clearing_cutout_20260721.webp", width: 1479, height: 925, bytes: 1284156, sha256: "45f8436c443aee116b65bc4f726957119b4dacc4d202a6cef794e422c04bb942", raw: "06_dino_sauropod_clearing_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2047005, rawSha256: "5d8285bc04b6762d4453b5aac5768d0a246dab36a20ae67c9c1ef1358bfa9338", candidate: "dino/branch_dino_sauropod_clearing_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_dino_trex_glimpse_cutout_20260721.webp", width: 876, height: 544, bytes: 448860, sha256: "9aa49541e709bfeb3f42e3fed0c3a5104945902f5f0e808aeaf88c5908da2272", raw: "07_dino_trex_glimpse_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 1371936, rawSha256: "d9c5b2273e0a5f55e45cb0a343e09e546d505b84cff3207717742e0f348f7ca7", candidate: "dino/branch_dino_trex_glimpse_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_cottage_life_cutout_20260721.webp", width: 1263, height: 974, bytes: 1404818, sha256: "5784cc8b02bb91312f413b18947d0980eb93a3844d45817a685be0ef597d84e0", raw: "08_cat_cottage_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2490823, rawSha256: "cc0afa8aec6fc8665c998ef87771959bdac9d353e6879fd663d16346492c8262", candidate: "cat-scenes/branch_cat_cottage_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_garden_life_cutout_20260721.webp", width: 1463, height: 849, bytes: 1295130, sha256: "cc144caa6932004f19cdd07ef8bcdcd0e751637449a0d1dbb3f485434a6722f1", raw: "09_cat_garden_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2345067, rawSha256: "bd8278cf03980b1960acc98e18d10b743ee31d8f1cc34087c7800086190489de", candidate: "cat-scenes/branch_cat_garden_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_fence_life_cutout_20260721.webp", width: 1423, height: 944, bytes: 1152524, sha256: "42dc3b5d9393982e3ee5a4a76894f7b539f657a53387d07fb89b1d10bd46fd0e", raw: "10_cat_fence_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2282404, rawSha256: "b178e7ba26cf2d40e38e86b7cec416b3499f46bce518cbbc939c88ebd11a86b9", candidate: "cat-scenes/branch_cat_fence_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_rooftop_life_cutout_20260721.webp", width: 1204, height: 662, bytes: 823520, sha256: "acaf5c382221f6af92259b8c4ae88c5e1b0335c34a17012724336722321d8342", raw: "11_cat_rooftop_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 1968448, rawSha256: "587679157f5eeecd7faf0e7266934c9dff561298656fdba27fbdfe3d0d38b84b", candidate: "cat-scenes/branch_cat_rooftop_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_bridge_life_cutout_20260721.webp", width: 1485, height: 907, bytes: 1251734, sha256: "a9d0dfc57d76687b786fc74fa3034bf7264b592d4885c94d387c64b9091109da", raw: "12_cat_bridge_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2388439, rawSha256: "04e11104f4f09eab9634b000ee0cf0370a06e74724a5c9f4a94f5657ceb36a7f", candidate: "cat-scenes/branch_cat_bridge_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_plaza_life_cutout_20260721.webp", width: 1488, height: 780, bytes: 1242526, sha256: "7e5b38fda89918cf73b5d4dfcabcea2c4486bf009df82ec814be8f7dc0294dc2", raw: "13_cat_plaza_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2305363, rawSha256: "85795c37a336832a9e0ff63bf443733d221826652be7a9701083c036fd268655", candidate: "cat-scenes/branch_cat_plaza_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_tree_life_cutout_20260721.webp", width: 1108, height: 998, bytes: 1195960, sha256: "bf325f90a9381e026e9cea4dfb503e8c674d90ecb2804f2981ac66c347faf046", raw: "14_cat_tree_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2344724, rawSha256: "021d942a239ef30bbecf216985c6b03e30b9c8c1e16fe4ab9c87831b74a5d568", candidate: "cat-scenes/branch_cat_tree_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_lane_life_cutout_20260721.webp", width: 1366, height: 979, bytes: 1290886, sha256: "5f440f5a170757bc412f4430e5ac99d399ee46284e2b8d6115a0333c8fe6c116", raw: "15_cat_lane_raw.png", rawWidth: 1536, rawHeight: 1024, rawBytes: 2450278, rawSha256: "025892a0aef2b185dff9b98daa25fb372ee464a1d0c82282cf202ae909e19bc7", candidate: "cat-scenes/branch_cat_lane_life_cutout_20260721.webp" }),
  Object.freeze({ name: "branch_cat_foreground_no_yarn_cutout_loop_20260721.webp", width: 3884, height: 165, bytes: 549636, sha256: "50197a9ad53a6000aa65a58fe4e6f6fcabb1ea7fc9ffad26292efecc960744bd", raw: "16_cat_fg_no_yarn_raw.png", rawWidth: 1942, rawHeight: 809, rawBytes: 911463, rawSha256: "c5fedcaf202f206f576c5c1eb70ba3107f91cb86e0149520352c5a3bf333f134", candidate: "cat-loops/branch_cat_foreground_no_yarn_cutout_loop_20260721.webp" }),
  Object.freeze({ name: "branch_cat_decor_no_yarn_cutout_loop_20260721.webp", width: 3764, height: 114, bytes: 169202, sha256: "5b0d1890ceb1698b516e5fd0d6f64988b0193d15b862806bcb6884e96396d163", raw: "17_cat_decor_no_yarn_raw.png", rawWidth: 1882, rawHeight: 836, rawBytes: 680339, rawSha256: "ec7e872e2171f4303710e00a2282a444a9bb8093ffdf502a4c4b11db337a881a", candidate: "cat-loops/branch_cat_decor_no_yarn_cutout_loop_20260721.webp" })
]);

const REPORTS = Object.freeze([
  Object.freeze({ path: "PROMOTION-MANIFEST.md", sha256: "c43eef9aac4f8e14bb95bc5bdb31e344c896eb7ca695fd618dba663f5dfdc67f" }),
  Object.freeze({ path: "dino/REPORT.md", sha256: "8b31f865fdde2ec1ee4b4a3362b27f2a9739b299b52ad5967f7567601bd2d7fd" }),
  Object.freeze({ path: "dino/manifest-dino-alpha.json", sha256: "8d59ae148bcad74078ca9fdd9c4ba16cc78ffeccb4ef8bc840eafcb55b64320e" }),
  Object.freeze({ path: "dino/process_dino_alpha.py", sha256: "d6a177ca61ce205d6e8f6d20a7db812cdece01c304695f9fdec1596aa87f3e69" }),
  Object.freeze({ path: "CAT-SCENES-ALPHA-REPORT.md", sha256: "eb8293c69abd11e9042cc0c7bfedab9f39a86c73b536aff98d02eb0b51d13bb5" }),
  Object.freeze({ path: "cat-scenes-alpha-manifest.json", sha256: "fa941aaeb0d7fd07dc58d1b3ad69328258879cce841f027398b057781ff4147f" }),
  Object.freeze({ path: "process-cat-scenes-alpha.mjs", sha256: "e7b6d1f1bfcd3b30d5626041e59fe3675cba1309787e09a37525de3655ec456d" }),
  Object.freeze({ path: "cat-loops/candidate-report.json", sha256: "6511e0667034e68ba9f56a0840010702c67fa72bab960f998a5ae3fc682e1795" }),
  Object.freeze({ path: "cat-loops/manifest.json", sha256: "dbbd92f5d7f6a096b3b1f7398b608c2e1180b5ce0783a85d4f72cd4914424148" }),
  Object.freeze({ path: "cat-loops/process-cat-loops-alpha.mjs", sha256: "2873ca5bd6f7d5e414f82ba7d7cf76a03a08225956ef04aebd62fd9aa04d9341" })
]);

const EXTRA_URLS = Object.freeze({
  snow: Object.freeze({ snowflake: "../assets/images/nazonazo-tunnel/effect_snowflake_particle_20260720.webp", diamond: "../assets/images/nazonazo-tunnel/effect_diamond_dust_particle_20260720.webp" }),
  fire: Object.freeze({
    volcano: "../assets/images/nazonazo-tunnel/branch_fire_distant_volcano_worldfix_20260721.webp",
    flame: "../assets/images/nazonazo-tunnel/effect_fire_flame_particle_a_depthfix_20260721.webp",
    ember: "../assets/images/nazonazo-tunnel/effect_fire_ember_particle_depthfix_20260721.webp"
  }),
  dino: Object.freeze({
    farHerd: "../assets/images/nazonazo-tunnel/branch_dino_far_herd_cutout_worldfix_20260721.webp",
    waterhole: "../assets/images/nazonazo-tunnel/branch_dino_waterhole_cutout_worldfix_20260721.webp",
    stegosaurus: "../assets/images/nazonazo-tunnel/branch_dino_stegosaurus_cutout_worldfix_20260721.webp",
    parasaurolophus: "../assets/images/nazonazo-tunnel/branch_dino_parasaurolophus_cutout_worldfix_20260721.webp",
    sauropod: "../assets/images/nazonazo-tunnel/branch_dino_sauropod_cutout_worldfix_20260721.webp",
    trex: "../assets/images/nazonazo-tunnel/branch_dino_trex_cutout_worldfix_20260721.webp",
    nest: "../assets/images/nazonazo-tunnel/branch_dino_fern_nest_worldfix_20260721.webp"
  }),
  cat: Object.freeze({
    cottage: "../assets/images/nazonazo-tunnel/branch_cat_cottage_life_cutout_20260721.webp",
    garden: "../assets/images/nazonazo-tunnel/branch_cat_garden_life_cutout_20260721.webp",
    fence: "../assets/images/nazonazo-tunnel/branch_cat_fence_life_cutout_20260721.webp",
    rooftop: "../assets/images/nazonazo-tunnel/branch_cat_rooftop_life_cutout_20260721.webp",
    bridge: "../assets/images/nazonazo-tunnel/branch_cat_bridge_life_cutout_20260721.webp",
    plaza: "../assets/images/nazonazo-tunnel/branch_cat_plaza_life_cutout_20260721.webp",
    tree: "../assets/images/nazonazo-tunnel/branch_cat_tree_life_cutout_20260721.webp",
    lane: "../assets/images/nazonazo-tunnel/branch_cat_lane_life_cutout_20260721.webp",
    farTownA: "../assets/images/nazonazo-tunnel/branch_cat_far_town_a_worldfix_20260721.webp",
    farTownB: "../assets/images/nazonazo-tunnel/branch_cat_far_town_b_worldfix_20260721.webp",
    midGardenA: "../assets/images/nazonazo-tunnel/branch_cat_mid_garden_a_worldfix_20260721.webp",
    midLaneB: "../assets/images/nazonazo-tunnel/branch_cat_mid_lane_b_worldfix_20260721.webp"
  })
});

const DINO_CONFIG = Object.freeze([
  Object.freeze({ asset: "waterhole", anchor: 368, width: 32, scale: .90, depth: 2, parallax: .14, sourceWidth: 1533, sourceHeight: 722, transparentBottomPx: 17, groundPlaneY: .79, groundAnchorY: .97645, occlusionPx: 0, role: "far", layer: "far" }),
  Object.freeze({ asset: "parasaurolophus", anchor: 820, width: 24, scale: .90, depth: 2, parallax: .16, sourceWidth: 1453, sourceHeight: 769, transparentBottomPx: 15, groundPlaneY: .79, groundAnchorY: .98049, occlusionPx: 0, role: "far", layer: "far" }),
  Object.freeze({ asset: "nest", anchor: 980, width: 16, scale: .90, depth: 3, parallax: .32, sourceWidth: 1350, sourceHeight: 797, transparentBottomPx: 14, groundPlaneY: .815, groundAnchorY: .98243, occlusionPx: 0, role: "mid", className: "branch-dino-nest-landmark" }),
  Object.freeze({ asset: "sauropod", anchor: 1335, width: 29, scale: .94, depth: 2, parallax: .14, sourceWidth: 1479, sourceHeight: 925, transparentBottomPx: 16, groundPlaneY: .79, groundAnchorY: .98270, occlusionPx: 0, role: "far", layer: "far" }),
  Object.freeze({ asset: "stegosaurus", anchor: 1620, width: 24, scale: .88, depth: 4, parallax: .62, sourceWidth: 1448, sourceHeight: 769, transparentBottomPx: 17, groundPlaneY: .815, groundAnchorY: .97789, occlusionPx: 0, role: "near" }),
  Object.freeze({ asset: "trex", anchor: 2050, width: 16, scale: .84, depth: 4, parallax: .70, sourceWidth: 876, sourceHeight: 544, transparentBottomPx: 16, groundPlaneY: .815, groundAnchorY: .97059, occlusionPx: 0, role: "near" })
]);

const CAT_STOP_ANCHORS = Object.freeze([296, 726, 1156, 1586, 2016]);
const CAT_GROUND_PLANE_Y = .85;
const CAT_FAR_PARALLAX = .14;
const CAT_MID_PARALLAX = .46;
const CAT_NEAR_PARALLAX = .74;
const CAT_MID_ANCHOR_OFFSET = 32 / CAT_MID_PARALLAX;
const CAT_NEAR_ANCHOR_OFFSET = -32 / CAT_NEAR_PARALLAX;
const CAT_FAR_CONFIG = Object.freeze([
  Object.freeze({ asset: "farTownA", anchor: 296, width: 44, scale: .94, depth: 1, parallax: CAT_FAR_PARALLAX, sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 342, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .6758, occlusionPx: 0, role: "far", stationIndex: 0, visibleCats: 5 }),
  Object.freeze({ asset: "farTownB", anchor: 726, width: 44, scale: .92, depth: 1, parallax: CAT_FAR_PARALLAX, sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 245, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .7678, occlusionPx: 0, role: "far", stationIndex: 1, visibleCats: 5, flip: true }),
  Object.freeze({ asset: "farTownA", anchor: 1156, width: 42, scale: .91, depth: 1, parallax: CAT_FAR_PARALLAX, sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 342, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .6758, occlusionPx: 0, role: "far", stationIndex: 2, visibleCats: 5, flip: true }),
  Object.freeze({ asset: "farTownB", anchor: 1586, width: 45, scale: .94, depth: 1, parallax: CAT_FAR_PARALLAX, sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 245, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .7678, occlusionPx: 0, role: "far", stationIndex: 3, visibleCats: 5 }),
  Object.freeze({ asset: "farTownA", anchor: 2016, width: 43, scale: .92, depth: 1, parallax: CAT_FAR_PARALLAX, sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 342, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .6758, occlusionPx: 0, role: "far", stationIndex: 4, visibleCats: 5 })
]);
const CAT_MID_CONFIG = Object.freeze(Array.from({ length: 9 }, (_, index) => Object.freeze({
  asset: index % 2 ? "midLaneB" : "midGardenA", anchor: index % 2 ? [619.696, 1049.696, 1479.696, 1909.696][(index - 1) / 2] : CAT_STOP_ANCHORS[0] + index * 215 + CAT_MID_ANCHOR_OFFSET, width: 34,
  scale: index % 2 ? .92 : .94, depth: 3, parallax: CAT_MID_PARALLAX,
  sourceWidth: 1568, sourceHeight: 1056, transparentBottomPx: 165, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .8436, occlusionPx: 0, role: "mid",
  stationIndex: index % 2 ? Math.floor(index / 2) : index / 2, interval: index % 2 === 1, visibleCats: 3, flip: index % 4 === 1
})));
const CAT_NEAR_CONFIG = Object.freeze([
  Object.freeze({ asset: "cottage", anchor: CAT_STOP_ANCHORS[0] + CAT_NEAR_ANCHOR_OFFSET, width: 21, scale: .92, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1263, sourceHeight: 974, transparentBottomPx: 17, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9825, occlusionPx: 0, role: "near", stationIndex: 0, visibleCats: 2 }),
  Object.freeze({ asset: "garden", anchor: 619.109, width: 20, scale: .92, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1463, sourceHeight: 849, transparentBottomPx: 16, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9811, occlusionPx: 0, role: "near", stationIndex: 0, interval: true, visibleCats: 2, flip: true }),
  Object.freeze({ asset: "fence", anchor: CAT_STOP_ANCHORS[1] + CAT_NEAR_ANCHOR_OFFSET, width: 20, scale: .90, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1423, sourceHeight: 944, transparentBottomPx: 18, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9809, occlusionPx: 0, role: "near", stationIndex: 1, visibleCats: 2 }),
  Object.freeze({ asset: "fence", anchor: 1049.109, width: 20, scale: .90, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1423, sourceHeight: 944, transparentBottomPx: 18, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9809, occlusionPx: 0, role: "near", stationIndex: 1, interval: true, visibleCats: 2, flip: true }),
  Object.freeze({ asset: "bridge", anchor: CAT_STOP_ANCHORS[2] + CAT_NEAR_ANCHOR_OFFSET, width: 22, scale: .92, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1485, sourceHeight: 907, transparentBottomPx: 12, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9868, occlusionPx: 0, role: "near", stationIndex: 2, visibleCats: 2 }),
  Object.freeze({ asset: "plaza", anchor: 1465.595, width: 22, scale: .90, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1488, sourceHeight: 780, transparentBottomPx: 12, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9846, occlusionPx: 0, role: "near", stationIndex: 2, interval: true, visibleCats: 2, flip: true }),
  Object.freeze({ asset: "tree", anchor: CAT_STOP_ANCHORS[3] + CAT_NEAR_ANCHOR_OFFSET, width: 20, scale: .90, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1108, sourceHeight: 998, transparentBottomPx: 18, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9819, occlusionPx: 0, role: "near", stationIndex: 3, visibleCats: 2 }),
  Object.freeze({ asset: "garden", anchor: 1895.595, width: 20, scale: .92, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1463, sourceHeight: 849, transparentBottomPx: 16, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9811, occlusionPx: 0, role: "near", stationIndex: 3, interval: true, visibleCats: 2 }),
  Object.freeze({ asset: "lane", anchor: CAT_STOP_ANCHORS[4] + CAT_NEAR_ANCHOR_OFFSET, width: 21, scale: .92, depth: 4, parallax: CAT_NEAR_PARALLAX, sourceWidth: 1366, sourceHeight: 979, transparentBottomPx: 19, groundPlaneY: CAT_GROUND_PLANE_Y, groundAnchorY: .9806, occlusionPx: 0, role: "near", stationIndex: 4, visibleCats: 2, flip: true })
]);

const LEGACY_RUNTIME_URLS = Object.freeze([
  "branch_dino_mid_cutout_loop_20260720.webp",
  "branch_cat_foreground_cutout_loop_20260720.webp",
  "branch_cat_decor_cutout_loop_20260720.webp",
  "branch_dino_life_landmark_cutout_20260720.webp",
  "branch_cat_cats_landmark_cutout_20260720.webp"
]);

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function scanBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
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

function extractBalancedAfter(source, marker, openChar, closeChar) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf(openChar, markerAt + marker.length);
  if (openAt < 0) return "";
  const end = scanBalanced(source, openAt, openChar, closeChar);
  return end > openAt ? source.slice(openAt, end + 1) : "";
}

function extractObjectAfter(source, marker) {
  return extractBalancedAfter(source, marker, "{", "}");
}

function extractArrayAfter(source, marker) {
  return extractBalancedAfter(source, marker, "[", "]");
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return "";
  const openAt = source.indexOf("{", markerAt + marker.length);
  const end = scanBalanced(source, openAt, "{", "}");
  return end > openAt ? source.slice(markerAt, end + 1) : "";
}

function evalLiteral(source, context = {}) {
  if (!source) return null;
  try { return vm.runInNewContext(`(${source})`, { Object, Array, Math, ...context }, { timeout: 1000 }); }
  catch { return null; }
}

function parseOwnStringEntries(objectSource) {
  return [...objectSource.matchAll(/(?:\{|,)\s*([a-zA-Z]+):"([^"]+)"/g)].map(match => [match[1], match[2]]);
}

function declarationMap(body) {
  const declarations = new Map();
  body.split(";").forEach(part => {
    const colon = part.indexOf(":");
    if (colon >= 0) declarations.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  });
  return declarations;
}

function cssRules(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selectors: match[1].replace(/\/\*[\s\S]*?\*\//g, "").split(",").map(selector => selector.trim()).filter(Boolean),
    declarations: declarationMap(match[2])
  }));
}

function firstRule(source, selector) {
  return cssRules(source).find(rule => rule.selectors.includes(selector))?.declarations || new Map();
}

function lastProperty(source, selector, property) {
  let value;
  cssRules(source).forEach(rule => {
    if (rule.selectors.includes(selector) && rule.declarations.has(property)) value = rule.declarations.get(property);
  });
  return value;
}

function sceneDirectChildIds(html) {
  const marker = '<div id="scene">';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const tokens = html.slice(start + marker.length).matchAll(/<div\b[^>]*>|<\/div\s*>/gi);
  const ids = [];
  let depth = 0;
  for (const token of tokens) {
    if (/^<\/div/i.test(token[0])) {
      if (depth === 0) break;
      depth -= 1;
    } else {
      if (depth === 0) {
        const id = token[0].match(/\bid="([^"]+)"/)?.[1];
        if (id) ids.push(id);
      }
      depth += 1;
    }
  }
  return ids;
}

function expectedBaseAsset(stageId, key) {
  const overrides = {
    "fire.mid": "../assets/images/nazonazo-tunnel/branch_fire_woodland_basalt_mid_loop_worldfix_20260721.webp",
    "fire.fg": "../assets/images/nazonazo-tunnel/branch_fire_magma_river_fg_loop_worldfix_20260721.webp",
    "dino.mid": "../assets/images/nazonazo-tunnel/branch_dino_mid_open_cutout_loop_20260721.webp",
    "dino.meadow": "../assets/images/nazonazo-tunnel/branch_dino_meadow_loop_depthfix_20260721.webp",
    "toy.mid": "../assets/images/nazonazo-tunnel/branch_toy_mid_variety_cutout_loop_20260720.webp",
    "toy.decor": "../assets/images/nazonazo-tunnel/branch_toy_decor_variety_cutout_loop_20260720.webp",
    "cat.fg": "../assets/images/nazonazo-tunnel/branch_cat_foreground_no_yarn_cutout_loop_20260721.webp",
    "cat.decor": "../assets/images/nazonazo-tunnel/branch_cat_decor_no_yarn_cutout_loop_20260721.webp",
    "fantasy.horizon": "../assets/images/nazonazo-tunnel/branch_fantasy_horizon_cutout_loop_depthfix_v4_20260721.webp",
    "fantasy.mid": "../assets/images/nazonazo-tunnel/branch_fantasy_mid_cutout_loop_depthfix_v4_20260721.webp",
    "fantasy.fg": "../assets/images/nazonazo-tunnel/branch_fantasy_foreground_cutout_loop_depthfix_20260721.webp",
    "fantasy.decor": "../assets/images/nazonazo-tunnel/branch_fantasy_decor_cutout_loop_depthfix_20260721.webp"
  };
  if (overrides[`${stageId}.${key}`]) return overrides[`${stageId}.${key}`];
  const suffix = key === "sky" ? "sky_back" : key === "horizon" ? "horizon_cutout_loop" :
    key === "mid" ? "mid_cutout_loop" : key === "ground" ? "ground_track_loop" :
      key === "fg" ? "foreground_cutout_loop" :
        ["cat", "fantasy", "sky", "ruins"].includes(stageId) ? "decor_cutout_loop" : "decor_cutout";
  return `../assets/images/nazonazo-tunnel/branch_${stageId}_${suffix}_20260720.webp`;
}

function criticalAssetSet(swSource) {
  const start = swSource.indexOf("const CRITICAL_ASSETS_SCRIPTS = [");
  const groupMarker = "const CRITICAL_ASSET_GROUPS = [";
  const groupAt = swSource.indexOf(groupMarker, start);
  if (start < 0 || groupAt < 0) return null;
  const openAt = swSource.indexOf("[", groupAt + "const CRITICAL_ASSET_GROUPS = ".length);
  const end = scanBalanced(swSource, openAt, "[", "]");
  if (end < 0) return null;
  const context = {};
  try {
    vm.runInNewContext(`${swSource.slice(start, end + 1)};this.flat=CRITICAL_ASSET_GROUPS.flat();`, context, { timeout: 1000 });
  } catch { return null; }
  return new Set(Array.from(context.flat || []));
}

function validate(candidate) {
  const errors = [];
  let checkCount = 0;
  const check = (condition, code) => { checkCount += 1; if (!condition) errors.push(code); };
  const { game, html, css, sw } = candidate;

  const assetsSource = extractObjectAfter(game, "const ASSETS=");
  const baseUrls = [];
  STAGE_IDS.forEach(stageId => {
    const stageSource = extractObjectAfter(assetsSource, `\n ${stageId}:`);
    const entries = parseOwnStringEntries(stageSource);
    const stageKeys = STAGE_ASSET_KEYS[stageId];
    check(JSON.stringify(entries.map(entry => entry[0])) === JSON.stringify(stageKeys), "asset-urls");
    stageKeys.forEach(key => {
      const expected = expectedBaseAsset(stageId, key);
      check(entries.some(([entryKey, url]) => entryKey === key && url === expected), "asset-urls");
      baseUrls.push(expected);
    });
  });
  check(baseUrls.length === 46 && new Set(baseUrls).size === 46, "asset-urls");
  const extrasSource = extractObjectAfter(game, "const BRANCH_STAGE_POLISH_ASSETS=");
  const extraStageKeys = [...extrasSource.matchAll(/\n ([a-z]+):Object\.freeze\(/g)].map(match => match[1]);
  check(JSON.stringify(extraStageKeys) === JSON.stringify(Object.keys(EXTRA_URLS)), "asset-urls");
  Object.entries(EXTRA_URLS).forEach(([stageId, expected]) => {
    const actual = Object.fromEntries(parseOwnStringEntries(extractObjectAfter(extrasSource, `\n ${stageId}:Object.freeze(`)));
    check(JSON.stringify(actual) === JSON.stringify(expected), "asset-urls");
  });
  LEGACY_RUNTIME_URLS.forEach(url => check(![game, html, css, sw].some(source => source.includes(url)), "asset-urls"));
  check((game.match(/branch_(?:dino|cat)_[^"']+_20260721\.webp/g) || []).length === 23, "asset-urls");
  const dinoWorldfixSceneKeys = ["farHerd", "waterhole", "stegosaurus", "parasaurolophus", "sauropod", "trex"];
  check(dinoWorldfixSceneKeys.every(key => EXTRA_URLS.dino[key].includes("_worldfix_20260721.webp")) &&
    EXTRA_URLS.dino.nest.endsWith("branch_dino_fern_nest_worldfix_20260721.webp"), "dino-scenes");
  check(!Object.hasOwn(Object.fromEntries(parseOwnStringEntries(extractObjectAfter(assetsSource, "\n dino:"))), "decor") &&
    !Object.hasOwn(Object.fromEntries(parseOwnStringEntries(extractObjectAfter(assetsSource, "\n fire:"))), "horizon"), "asset-urls");

  const polishPreload = extractFunction(game, "preloadBranchStagePolish");
  const rasterPreload = extractFunction(game, "preloadBranchRasterStage");
  const applySkin = extractFunction(game, "applySkin");
  const chooseTunnelBranch = extractFunction(game, "chooseTunnelBranch");
  const preloadRefs = source => (source.match(/\bpreloadBranchStagePolish\b/g) || []).length;
  check(polishPreload.includes("const assets=st&&BRANCH_STAGE_POLISH_ASSETS[st.id]") &&
    polishPreload.includes("Object.values(assets).forEach") && !polishPreload.includes("Object.values(BRANCH_STAGE_POLISH_ASSETS)"), "preload-scope");
  check(rasterPreload.includes("BRANCH_RASTER_ASSET_KEYS.forEach") && !rasterPreload.includes("Object.values(ASSETS)"), "preload-scope");
  check(preloadRefs(polishPreload) === 1 && preloadRefs(applySkin) === 1 && preloadRefs(chooseTunnelBranch) === 1 && preloadRefs(game) === 3, "preload-scope");
  check(applySkin.includes("preloadBranchRasterStage(st);") && applySkin.includes("preloadBranchStagePolish(st);") &&
    chooseTunnelBranch.includes("preloadBranchRasterStage(target);") && chooseTunnelBranch.includes("preloadBranchStagePolish(target);"), "preload-scope");
  const expectedTotals = { snow: 8, fire: 7, dino: 13, toy: 6, cat: 18, fantasy: 6, sky: 6, ruins: 6 };
  const actualTotals = Object.fromEntries(STAGE_IDS.map(stageId => [stageId, STAGE_ASSET_KEYS[stageId].length + Object.keys(EXTRA_URLS[stageId] || {}).length]));
  check(JSON.stringify(actualTotals) === JSON.stringify(expectedTotals), "preload-scope");

  const preloadStart = game.indexOf("const BRANCH_RASTER_STAGE_IDS=");
  const preloadEnd = game.indexOf("\nfunction stageIndexById", preloadStart);
  const preloadProbe = { dino: false, dinoRepeat: false, cat: false, totals: false };
  if (preloadStart >= 0 && preloadEnd > preloadStart) {
    const made = [];
    class FakeImage {
      constructor() { made.push(this); }
      set src(value) { this._src = value; }
      get src() { return this._src; }
    }
    const context = { Image: FakeImage, Set, Map, Object };
    try {
      vm.runInNewContext(`${game.slice(preloadStart, preloadEnd)}\nthis.raster=preloadBranchRasterStage;this.polish=preloadBranchStagePolish;this.rasterCache=branchRasterImageCache;this.polishCache=branchStagePolishImageCache;`, context, { timeout: 1000 });
      const dinoBase = Object.fromEntries(STAGE_ASSET_KEYS.dino.map(key => [key, expectedBaseAsset("dino", key)]));
      const catBase = Object.fromEntries(LAYER_KEYS.map(key => [key, expectedBaseAsset("cat", key)]));
      context.raster({ id: "dino", assets: dinoBase }); context.polish({ id: "dino" });
      preloadProbe.dino = made.length === 13 && made.slice(6).every(image => image.src.includes("/branch_dino_"));
      context.raster({ id: "dino", assets: dinoBase }); context.polish({ id: "dino" });
      preloadProbe.dinoRepeat = made.length === 13;
      context.raster({ id: "cat", assets: catBase }); context.polish({ id: "cat" });
      preloadProbe.cat = made.length === 31 && made.slice(19).every(image => image.src.includes("/branch_cat_"));
      preloadProbe.totals = context.rasterCache?.size === 12 && context.polishCache?.size === 19;
    } catch { /* stable checks below report the failure */ }
  }
  check(preloadProbe.dino, "preload-scope");
  check(preloadProbe.dinoRepeat, "preload-scope");
  check(preloadProbe.cat, "preload-scope");
  check(preloadProbe.totals, "preload-scope");

  const directIds = sceneDirectChildIds(html);
  const exactWorldLayer = '<div id="branchWorldLifeLayer" aria-hidden="true"></div>';
  check((html.match(/id="branchWorldLifeLayer"/g) || []).length === 1 && html.includes(exactWorldLayer) && !html.includes("branchLandmarkLayer"), "world-life-layer");
  const follows = (left, right) => directIds.indexOf(right) === directIds.indexOf(left) + 1;
  check(follows("horizon", "branchEffectFar") && follows("branchDecorT", "branchWorldLifeLayer") &&
    follows("branchWorldLifeLayer", "branchEffectMid") && follows("fgT", "branchEffectNear"), "world-life-layer");
  const sharedLayer = firstRule(css, "#branchWorldLifeLayer");
  check(sharedLayer.get("position") === "absolute" && sharedLayer.get("inset") === "0" && sharedLayer.get("pointer-events") === "none", "world-life-layer");
  check(lastProperty(css, "#branchEffectFar", "z-index") === "1" && lastProperty(css, "#branchWorldLifeLayer", "z-index") === "4" &&
    lastProperty(css, "#branchEffectMid", "z-index") === "6" && lastProperty(css, "#branchEffectNear", "z-index") === "9", "world-life-layer");

  const dinoConfigSource = extractArrayAfter(game, "const BRANCH_DINO_WORLD_LIFE_CONFIG=Object.freeze(");
  const catFarSource = extractArrayAfter(game, "const BRANCH_CAT_FAR_CONFIG=Object.freeze(");
  const catMidCall = extractBalancedAfter(game, "const BRANCH_CAT_MID_CONFIG=Object.freeze", "(", ")");
  const catNearSource = extractArrayAfter(game, "const BRANCH_CAT_NEAR_CONFIG=Object.freeze(");
  const dinoConfig = evalLiteral(dinoConfigSource);
  const catContext = {
    BRANCH_CAT_STOP_ANCHORS: CAT_STOP_ANCHORS,
    BRANCH_CAT_GROUND_PLANE_Y: CAT_GROUND_PLANE_Y,
    BRANCH_CAT_FAR_PARALLAX: CAT_FAR_PARALLAX,
    BRANCH_CAT_MID_PARALLAX: CAT_MID_PARALLAX,
    BRANCH_CAT_NEAR_PARALLAX: CAT_NEAR_PARALLAX,
    BRANCH_CAT_MID_ANCHOR_OFFSET: CAT_MID_ANCHOR_OFFSET,
    BRANCH_CAT_NEAR_ANCHOR_OFFSET: CAT_NEAR_ANCHOR_OFFSET,
    QN: 5,
    GAP: 430
  };
  const catFar = evalLiteral(catFarSource, catContext);
  const catMid = evalLiteral(catMidCall ? `Object.freeze${catMidCall}` : "", catContext);
  const catNear = evalLiteral(catNearSource, catContext);
  const plain = value => JSON.parse(JSON.stringify(value));
  check(JSON.stringify(plain(dinoConfig)) === JSON.stringify(DINO_CONFIG), "dino-scenes");
  const dinoAssets = Array.isArray(dinoConfig) ? dinoConfig.map(config => config.asset) : [];
  const dinoAnchors = Array.isArray(dinoConfig) ? dinoConfig.map(config => config.anchor) : [];
  const dinoByRole = role => (Array.isArray(dinoConfig) ? dinoConfig.filter(config => config.role === role) : []);
  check(JSON.stringify(dinoAssets) === JSON.stringify(["waterhole", "parasaurolophus", "nest", "sauropod", "stegosaurus", "trex"]), "dino-scenes");
  check(JSON.stringify(dinoAnchors) === JSON.stringify([368, 820, 980, 1335, 1620, 2050]) &&
    new Set(dinoAnchors).size === 6 && dinoConfig.every(config => config.ratio === undefined), "dino-scenes");
  check(dinoByRole("far").length === 3 && dinoByRole("mid").length === 1 && dinoByRole("mid")[0]?.asset === "nest" &&
    dinoByRole("near").length === 2, "dino-scenes");
  check(Math.max(...dinoByRole("far").map(config => config.parallax)) < dinoByRole("mid")[0]?.parallax &&
    dinoByRole("mid")[0]?.parallax < Math.min(...dinoByRole("near").map(config => config.parallax)) &&
    dinoByRole("far").every(config => config.depth === 2) && dinoByRole("mid")[0]?.depth === 3 &&
    dinoByRole("near").every(config => config.depth === 4), "dino-scenes");
  check(game.includes("const BRANCH_DINO_MEADOW_PARALLAX=.10;") &&
    game.includes("const BRANCH_DINO_FAR_HERD_PARALLAX=.06;") &&
    game.includes("const BRANCH_DINO_FAR_HERD_SPACING_VW=115;") &&
    game.includes("const BRANCH_DINO_FAR_HERD_POOL_SIZE=3;") &&
    !game.includes("const BRANCH_LANDMARK_PROGRESS=.5;"), "dino-scenes");
  const buildDino = extractFunction(game, "buildBranchDinoWorldLife");
  check((buildDino.match(/document\.createElement\("span"\)/g) || []).length === 1 &&
    buildDino.includes('branchEffectFar.dataset.branchEffect="dino-far-herd"') &&
    buildDino.includes("for(let index=0;index<BRANCH_DINO_FAR_HERD_POOL_SIZE;index++)") &&
    buildDino.includes("branchEffectFar.appendChild(fragment);") &&
    buildDino.includes('sourceWidth:1894,sourceHeight:367,transparentBottomPx:BRANCH_DINO_FAR_HERD_GROUND.transparentBottomPx') &&
    buildDino.includes('BRANCH_DINO_WORLD_LIFE_CONFIG.forEach((config,index)=>buildBranchWorldLifeSprite("dino",assets,config,index));') &&
    !/cloneNode|while\s*\(/.test(buildDino), "dino-scenes");

  check(JSON.stringify(plain(catFar)) === JSON.stringify(CAT_FAR_CONFIG) &&
    JSON.stringify(plain(catMid)) === JSON.stringify(CAT_MID_CONFIG) &&
    JSON.stringify(plain(catNear)) === JSON.stringify(CAT_NEAR_CONFIG), "cat-scenes");
  check(catFar?.length === 5 && catMid?.length === 9 && catNear?.length === 9 &&
    !game.includes("BRANCH_CAT_WORLD_LIFE_CONFIG") && !game.includes(".04,.10,.16,.22,.28,.34,.40,.46,.52,.58,.64,.70,.76,.82"), "cat-scenes");
  const catRoles = { far: catFar || [], mid: catMid || [], near: catNear || [] };
  check(JSON.stringify(catRoles.near.map(config => config.asset)) === JSON.stringify(["cottage", "garden", "fence", "fence", "bridge", "plaza", "tree", "garden", "lane"]), "cat-scenes");
  const midIntervalAnchors = catRoles.mid.filter(config => config.interval).map(config => config.anchor);
  const nearIntervalAnchors = catRoles.near.filter(config => config.interval).map(config => config.anchor);
  const uniformlySpaced = anchors => anchors.length === 4 && anchors.every((anchor, index) => index === 0 || Math.abs(anchor - anchors[index - 1] - 430) < 1e-9);
  const pairSpaced = (anchors, index) => Math.abs(anchors[index + 1] - anchors[index] - 430) < 1e-9;
  const nearFrontOffsets = [nearIntervalAnchors[0] - 605.595, nearIntervalAnchors[1] - 1035.595];
  check(JSON.stringify(midIntervalAnchors) === JSON.stringify([619.696, 1049.696, 1479.696, 1909.696]) &&
    JSON.stringify(nearIntervalAnchors) === JSON.stringify([619.109, 1049.109, 1465.595, 1895.595]) &&
    uniformlySpaced(midIntervalAnchors) &&
    pairSpaced(nearIntervalAnchors, 0) && pairSpaced(nearIntervalAnchors, 2) &&
    nearFrontOffsets.every(offset => Math.abs(offset - 13.514) < 1e-9), "cat-scenes");
  check(JSON.stringify(catRoles.far.map(config => config.stationIndex)) === JSON.stringify([0, 1, 2, 3, 4]) &&
    JSON.stringify(catRoles.mid.filter(config => !config.interval).map(config => config.stationIndex)) === JSON.stringify([0, 1, 2, 3, 4]) &&
    catRoles.mid.filter(config => config.interval).length === 4, "cat-scenes");
  const stationDeclaration = "const BRANCH_CAT_STOP_ANCHORS=Object.freeze(Array.from({length:QN},(_,index)=>INTRO-CHECKPOINT_STOP_LEFT_VW+index*GAP));";
  check(game.includes("const QN=5, SPAN=2860, INTRO=320, GAP=430") && game.includes("const CHECKPOINT_STOP_LEFT_VW=24") &&
    game.includes(stationDeclaration), "cat-scenes");
  const project = (anchor, localWorldX, parallax) => 50 + (anchor - localWorldX) * parallax;
  const allCatScenes = Object.values(catRoles).flat();
  check(allCatScenes.length === 23 && allCatScenes.every(config => Number.isFinite(project(config.anchor, 0, config.parallax))), "cat-scenes");
  check(catRoles.far.every(config => config.visibleCats === 5) && catRoles.mid.every(config => config.visibleCats === 3) &&
    catRoles.near.every(config => config.visibleCats === 2) && 5 + 3 + 2 >= 8 && 5 + 3 + 2 <= 12, "cat-scenes");
  check(CAT_STOP_ANCHORS.every((anchor, stationIndex) =>
    catRoles.far.some(config => config.anchor === anchor && config.stationIndex === stationIndex) &&
    catRoles.mid.some(config => config.stationIndex === stationIndex && !config.interval) &&
    catRoles.near.some(config => config.stationIndex === stationIndex && !config.interval)), "cat-scenes");
  check(catRoles.far.every(config => config.parallax === .14) && catRoles.mid.every(config => config.parallax === .46) &&
    catRoles.near.every(config => config.parallax === .74) && allCatScenes.every(config =>
      config.groundPlaneY === .85 && Number.isFinite(config.groundAnchorY) && Number.isInteger(config.transparentBottomPx)), "cat-scenes");
  check(!/branch-(?:landmark|world-life)[^{]*\{[^}]*70vw/.test(css) && !css.includes("branch-landmark.is-cat"), "cat-scenes");
  const buildCat = extractFunction(game, "buildBranchCatWorldLife");
  check(buildCat.includes('BRANCH_CAT_FAR_CONFIG.forEach((config,index)=>buildBranchWorldLifeSprite("cat",assets,{...config,layer:"far"},index));') &&
    buildCat.includes('BRANCH_CAT_MID_CONFIG.forEach((config,index)=>buildBranchWorldLifeSprite("cat",assets,config,BRANCH_CAT_FAR_CONFIG.length+index));') &&
    buildCat.includes('BRANCH_CAT_NEAR_CONFIG.forEach((config,index)=>buildBranchWorldLifeSprite("cat",assets,config,BRANCH_CAT_FAR_CONFIG.length+BRANCH_CAT_MID_CONFIG.length+index));'), "cat-scenes");

  const buildLife = extractFunction(game, "buildBranchWorldLifeSprite");
  check(buildLife.includes('sprite.dataset.worldAnchor=String(config.anchor)') && buildLife.includes('sprite.dataset.depth=String(config.depth)') &&
    buildLife.includes("sprite.dataset.lifeRole=role") && buildLife.includes('sprite.style.setProperty("--life-width",config.width+"vw")') &&
    buildLife.includes("sprite.style.zIndex=String(config.depth)"), "world-life-layer");
  check(buildLife.includes('sprite.dataset.visibleCatTarget=String(config.visibleCats)') &&
    buildLife.includes('sprite.dataset.groundPlaneY=String(config.groundPlaneY)') && buildLife.includes('sprite.dataset.groundAnchorY=String(config.groundAnchorY)') &&
    !buildLife.includes("travelLimit") && !buildLife.includes("viewportX"), "cat-scenes");
  const renderPolish = extractFunction(game, "renderBranchStagePolish");
  const render = extractFunction(game, "render");
  check(renderPolish.includes("const localWorldX=worldX-o;") &&
    renderPolish.includes("branchDinoMeadow.style.backgroundPositionX=cssXFromVw(-localWorldX*BRANCH_DINO_MEADOW_PARALLAX)") &&
    renderPolish.includes("const herdWorldX=localWorldX*BRANCH_DINO_FAR_HERD_PARALLAX;") &&
    game.includes("function projectBranchWorldSpriteX(anchor,localWorldX,parallax){\n return 50+(anchor-localWorldX)*parallax;\n}") &&
    renderPolish.includes("const x=projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax);") &&
    !renderPolish.includes("clamp(travel") &&
    !/SPAN\*sprite\.ratio-worldX/.test(renderPolish), "world-lock");
  const transformAt = renderPolish.indexOf("const x=projectBranchWorldSpriteX(sprite.anchor,localWorldX,sprite.parallax);");
  const catCullStart = renderPolish.indexOf('if(sprite.stageId==="cat"){');
  const catCull = catCullStart >= 0 ? renderPolish.slice(catCullStart, renderPolish.indexOf("}else{", catCullStart)) : "";
  const cullAt = catCull.indexOf('sprite.el.dataset.visible=visible?"true":"false"');
  check(transformAt >= 0 && cullAt >= 0 && catCull.includes("const halfWidth=sprite.halfWidthVw||0,visible=x+halfWidth>-16&&x-halfWidth<116;") &&
    catCull.includes('sprite.el.style.visibility=visible?"visible":"hidden"') &&
    !renderPolish.includes("activeCatByRole") && !renderPolish.includes("if(!active)continue"), "cat-scenes");
  check(render.includes("const o=origin(stg);") && render.includes("renderBranchStagePolish(now,o);"), "world-lock");
  check(!/createElement|createDocumentFragment|appendChild|replaceChildren|cloneNode|new Image/.test(renderPolish), "render-allocation");

  const dinoCss = firstRule(css, "body.st-dino");
  check(dinoCss.get("--branch-horizon-y") === "-8.2vh" && dinoCss.get("--branch-mid-y") === "0vh" &&
    dinoCss.get("--branch-mid-height") === "56vh" && dinoCss.get("--branch-mid-bottom") === "4vh" &&
    !css.includes("21.91vh") && !css.includes("-.52vh"), "dino-visibility");
  const baseHorizon = firstRule(css, "#horizon");
  const rasterHorizon = firstRule(css, "body.branch-raster #horizon");
  const dinoHorizonHidden = cssRules(css).some(rule => rule.selectors.some(selector => selector.includes("st-dino") && selector.endsWith("#horizon")) &&
    (rule.declarations.get("display")?.includes("none") || rule.declarations.get("visibility")?.includes("hidden") || /^0(?:!important)?$/.test(rule.declarations.get("opacity") || "")));
  check(baseHorizon.get("position") === "absolute" && baseHorizon.get("top") === "0" && baseHorizon.get("bottom") === "0" &&
    rasterHorizon.get("width") === "100%" && rasterHorizon.get("overflow") === "hidden" && rasterHorizon.get("background-size") === "auto 100%" &&
    !dinoHorizonHidden, "dino-visibility");
  const rasterDefaults = firstRule(css, "body.branch-raster");
  const rasterMid = firstRule(css, "body.branch-raster #midT");
  check(rasterDefaults.get("--branch-mid-height") === "100%" && rasterDefaults.get("--branch-mid-bottom") === "0vh" &&
    rasterMid.get("top") === "auto" && rasterMid.get("bottom") === "var(--branch-mid-bottom)" && rasterMid.get("height") === "var(--branch-mid-height)", "dino-visibility");
  check(lastProperty(css, "body.st-dino:not(.tunnel-interior) #branchEffectFar", "display") === "block" &&
    lastProperty(css, "body.st-dino:not(.tunnel-interior) #branchWorldLifeLayer", "display") === "block" &&
    lastProperty(css, "body.st-dino:not(.tunnel-interior) #branchDinoMeadow", "display") === "block", "dino-visibility");
  const farCss = firstRule(css, ".branch-dino-far-herd");
  check(farCss.get("bottom") === "0" && farCss.get("visibility") === "hidden" && farCss.get("width") === "clamp(440px,60vw,900px)" && farCss.get("opacity") === ".72" &&
    farCss.get("pointer-events") === "none" && firstRule(css, ".branch-dino-far-herd img").get("height") === "auto" &&
    !firstRule(css, ".branch-dino-far-herd img").has("max-height"), "dino-visibility");
  const nestCss = firstRule(css, "body.st-dino:not(.tunnel-interior) .branch-dino-nest-landmark");
  check(!nestCss.has("bottom") && nestCss.get("width") === "var(--life-width)" &&
    (game.match(/asset:"nest"/g) || []).length === 1 && (game.match(/branch_dino_fern_nest_worldfix_20260721\.webp/g) || []).length === 1, "dino-scenes");

  check(lastProperty(css, "body.branch-raster:not(.tunnel-interior) #branchDecorT", "display") === "block" &&
    lastProperty(css, "body.st-dino:not(.tunnel-interior) #branchDecorT", "display") === "none!important" &&
    lastProperty(css, "body.st-cat:not(.tunnel-interior) #branchDecorT", "display") === "none!important", "cat-world");
  check(lastProperty(css, "body.st-cat:not(.tunnel-interior) #branchWorldLifeLayer", "display") === "block", "cat-world");
  check(!css.includes(".branch-world-life.is-cat.is-active") && !css.includes('[data-active="true"]') &&
    firstRule(css, "body.st-cat:not(.tunnel-interior) .branch-cat-population--far").get("z-index") === "1!important" &&
    firstRule(css, "body.st-cat:not(.tunnel-interior) .branch-cat-population--mid").get("z-index") === "3!important" &&
    firstRule(css, "body.st-cat:not(.tunnel-interior) .branch-cat-population--near").get("z-index") === "4!important", "cat-world");

  const ground = firstRule(css, "#groundT");
  const world = firstRule(css, "#world");
  const cars = firstRule(css, "#cars");
  const vehicle = firstRule(css, "#veh");
  const foreground = firstRule(css, "#fgT");
  check(ground.get("height") === "12vh" && ground.get("z-index") === "2" &&
    lastProperty(css, "body.branch-raster #groundT", "height") === "18vh" && world.get("z-index") === "3" &&
    cars.get("z-index") === "7" && cars.get("pointer-events") === "none" &&
    vehicle.get("bottom") === "12.5vh" && vehicle.get("width") === "clamp(120px,22vw,220px)" &&
    vehicle.get("height") === "clamp(70px,13vw,130px)" && vehicle.get("z-index") === "7" &&
    foreground.get("height") === "22vh" && foreground.get("z-index") === "8", "ground-train");

  const buildPolish = extractFunction(game, "buildBranchStagePolish");
  check(buildPolish.includes('else if(st.id==="dino")buildBranchDinoWorldLife(assets);') &&
    buildPolish.includes('else if(st.id==="cat")buildBranchCatWorldLife(assets);') &&
    buildPolish.includes("branchWorldLifeLayer.replaceChildren()") &&
    buildPolish.includes("branchDinoFarHerdSprites=[];branchWorldLifeSprites=[]"), "lifecycle");
  const syncPolish = extractFunction(game, "syncBranchStagePolishState");
  const enterTunnel = extractFunction(game, "enterTunnelInterior");
  const finishTunnel = extractFunction(game, "finishTunnelInterior");
  const ending = extractFunction(game, "ending");
  const openMap = extractFunction(game, "openMap");
  check(syncPolish.includes("playing&&!tunnelInteriorMode&&!document.hidden&&isBranchRasterStage(STAGES[stg])") &&
    enterTunnel.includes("pauseBranchStagePolish();") && finishTunnel.includes("syncBranchStagePolishState();") &&
    ending.includes("pauseBranchStagePolish();") && openMap.includes("pauseBranchStagePolish();"), "lifecycle");
  check(/visibilitychange[\s\S]{0,120}if\(document\.hidden\)\{\s*pauseBranchStagePolish\(\);/.test(game) &&
    game.includes('window.addEventListener("pageshow",syncBranchStagePolishState);') &&
    /window\.addEventListener\("pagehide",\(\)=>\{pauseBranchStagePolish\(\);clearTimeout\(branchPolishResizeTimer\);\}\);/.test(game), "lifecycle");
  check(lastProperty(css, "body.tunnel-interior #branchWorldLifeLayer", "display") === "none!important" &&
    lastProperty(css, "body.tunnel-interior .branch-stage-effect-layer", "display") === "none!important", "lifecycle");

  const reducedMotion = extractBalancedAfter(css, "@media (prefers-reduced-motion:reduce)", "{", "}");
  check(reducedMotion.includes(".branch-snow-particle{left:var(--snow-rest-left)!important;top:var(--snow-rest-top)!important;animation:none!important;") &&
    !reducedMotion.includes(".branch-fire-hotspot:not(:first-child)") &&
    reducedMotion.includes(".branch-fire-ember-field,.branch-fire-crater-ember{display:none!important}"), "motion-night");
  const branchNight = firstRule(css, "body.branch-raster.branch-night");
  check(branchNight.get("--branch-polish-brightness") === ".68" && branchNight.get("--branch-snow-opacity") === ".74", "motion-night");
  check(firstRule(css, ".branch-dino-far-herd img").get("filter")?.includes("var(--branch-polish-brightness)") &&
    firstRule(css, ".branch-world-life img").get("filter")?.includes("var(--branch-polish-brightness)"), "motion-night");

  check(html.match(/styles\.css\?v=([^"']+)/)?.[1] === TOKEN && html.match(/data\/quiz-art\.js\?v=([^"']+)/)?.[1] === QUIZ_ART_TOKEN &&
    html.match(/js\/game\.js\?v=([^"']+)/)?.[1] === TOKEN, "query-sw");
  check(new RegExp(`const CACHE_VERSION = ${SW_VERSION};`).test(sw), "query-sw");
  const critical = criticalAssetSet(sw);
  const canonicalPaths = CANONICAL.map(asset => `/assets/images/nazonazo-tunnel/${asset.name}`);
  check(critical instanceof Set && canonicalPaths.filter(assetPath => critical.has(assetPath)).length === 0, "sw-critical");

  return { errors: [...new Set(errors)], checkCount };
}

function replaceExactlyOnce(source, search, replacement) {
  const occurrences = source.split(search).length - 1;
  assert.equal(occurrences, 1, `mutation precondition must match exactly once: ${search.slice(0, 100)}`);
  const mutated = source.replace(search, replacement);
  assert.notEqual(mutated, source, "mutation must alter its source");
  return mutated;
}

function mutateFunction(source, name, search, replacement) {
  const functionSource = extractFunction(source, name);
  assert.ok(functionSource, `mutation function missing: ${name}`);
  const mutatedFunction = replaceExactlyOnce(functionSource, search, replacement);
  const at = source.indexOf(functionSource);
  return source.slice(0, at) + mutatedFunction + source.slice(at + functionSource.length);
}

async function validateCanonicalAndProvenance() {
  for (const asset of CANONICAL) {
    const relative = `assets/images/nazonazo-tunnel/${asset.name}`;
    const absolute = path.join(root, relative);
    assert.ok(fs.existsSync(absolute), `${relative}: canonical asset missing`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(bytes.length, asset.bytes, `${relative}: encoded byte length drifted`);
    assert.ok(bytes.length < THREE_MIB, `${relative}: exceeds 3MiB`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${relative}: RIFF signature missing`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${relative}: WebP signature missing`);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${relative}: incomplete RIFF`);
    assert.equal(hash(bytes), asset.sha256, `${relative}: SHA-256 drifted`);
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha },
      { format: "webp", width: asset.width, height: asset.height, channels: 4, hasAlpha: true }, `${relative}: decoded WebP contract drifted`);
    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = decoded;
    const cornerAlpha = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]
      .map(([x, y]) => data[(y * info.width + x) * 4 + 3]);
    assert.deepEqual(cornerAlpha, [0, 0, 0, 0], `${relative}: transparent corners drifted`);
  }

  const rawRoot = path.join(root, "tmp/alpha_pending/1407-nazonazo-dino-cat-world-density");
  const alphaRoot = path.join(root, "tmp/alpha_pending/1407a-nazonazo-dino-cat-world-density-alpha");
  const anyLocalProvenance = fs.existsSync(rawRoot) || fs.existsSync(alphaRoot);
  if (!anyLocalProvenance) return "embedded-only";
  assert.ok(fs.existsSync(rawRoot) && fs.existsSync(alphaRoot), "local 1407 provenance must be complete when either ignored tmp batch exists");
  const promotionManifest = read("tmp/alpha_pending/1407a-nazonazo-dino-cat-world-density-alpha/PROMOTION-MANIFEST.md");
  for (const asset of CANONICAL) {
    const rawPath = path.join(rawRoot, asset.raw);
    assert.ok(fs.existsSync(rawPath), `${asset.raw}: accepted GPT Image 2 raw missing`);
    const raw = fs.readFileSync(rawPath);
    assert.equal(raw.length, asset.rawBytes, `${asset.raw}: raw API byte count drifted`);
    assert.equal(hash(raw), asset.rawSha256, `${asset.raw}: raw API bytes drifted`);
    assert.equal(raw.subarray(1, 4).toString("ascii"), "PNG", `${asset.raw}: PNG signature missing`);
    assert.deepEqual([raw.readUInt32BE(16), raw.readUInt32BE(20), raw[25]], [asset.rawWidth, asset.rawHeight, 2], `${asset.raw}: RGB raw dimensions/type drifted`);
    for (const marker of ["c2pa", "gpt-image", "2.0", "trainedAlgorithmicMedia", "OpenAI Media Service API"]) {
      assert.ok(raw.includes(Buffer.from(marker)), `${asset.raw}: GPT Image 2/C2PA marker missing: ${marker}`);
    }
    const candidate = fs.readFileSync(path.join(alphaRoot, asset.candidate));
    const canonical = fs.readFileSync(path.join(root, "assets/images/nazonazo-tunnel", asset.name));
    assert.ok(candidate.equals(canonical), `${asset.name}: candidate-to-canonical copy is no longer byte-identical`);
    for (const literal of [asset.raw, asset.rawSha256, asset.name, asset.sha256]) {
      assert.ok(promotionManifest.includes(literal), `${asset.name}: promotion mapping lost ${literal}`);
    }
  }
  for (const report of REPORTS) {
    const bytes = fs.readFileSync(path.join(alphaRoot, report.path));
    assert.equal(hash(bytes), report.sha256, `${report.path}: provenance/report bytes drifted`);
  }
  return "local-verified";
}

const mutations = [
  { name: "old dino middle URL", expected: "asset-urls", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "branch_dino_mid_open_cutout_loop_20260721.webp", "branch_dino_mid_cutout_loop_20260720.webp") }) },
  { name: "old cat foreground yarn URL", expected: "asset-urls", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "branch_cat_foreground_no_yarn_cutout_loop_20260721.webp", "branch_cat_foreground_cutout_loop_20260720.webp") }) },
  { name: "old cat decor yarn URL", expected: "asset-urls", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "branch_cat_decor_no_yarn_cutout_loop_20260721.webp", "branch_cat_decor_cutout_loop_20260720.webp") }) },
  { name: "old cat landmark URL", expected: "asset-urls", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "branch_cat_cottage_life_cutout_20260721.webp", "branch_cat_cats_landmark_cutout_20260720.webp") }) },
  { name: "dino far herd speed too fast", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "const BRANCH_DINO_FAR_HERD_PARALLAX=.06;", "const BRANCH_DINO_FAR_HERD_PARALLAX=.35;") }) },
  { name: "dino life scene removed", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, ' Object.freeze({asset:"trex",anchor:2050,width:16,scale:.84,depth:4,parallax:.70,sourceWidth:876,sourceHeight:544,transparentBottomPx:16,groundPlaneY:.815,groundAnchorY:.97059,occlusionPx:0,role:"near"})\n', "") }) },
  { name: "dino far role becomes near", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'groundAnchorY:.97645,occlusionPx:0,role:"far",layer:"far"', 'groundAnchorY:.97645,occlusionPx:0,role:"near",layer:"far"') }) },
  { name: "dino anchors concentrated", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'asset:"sauropod",anchor:1335', 'asset:"sauropod",anchor:980') }) },
  { name: "dino far herd pool shrinks", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "const BRANCH_DINO_FAR_HERD_POOL_SIZE=3;", "const BRANCH_DINO_FAR_HERD_POOL_SIZE=2;") }) },
  { name: "dino nest duplicated", expected: "dino-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'asset:"parasaurolophus",anchor:820', 'asset:"nest",anchor:820') }) },
  { name: "absolute global worldX", expected: "world-lock", mutate: c => ({ ...c, game: mutateFunction(c.game, "renderBranchStagePolish", "const localWorldX=worldX-o;", "const localWorldX=worldX;") }) },
  { name: "cat far station removed", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, ' Object.freeze({asset:"farTownA",anchor:BRANCH_CAT_STOP_ANCHORS[4],width:43,scale:.92,depth:1,parallax:BRANCH_CAT_FAR_PARALLAX,sourceWidth:1568,sourceHeight:1056,transparentBottomPx:342,groundPlaneY:BRANCH_CAT_GROUND_PLANE_Y,groundAnchorY:.6758,occlusionPx:0,role:"far",stationIndex:4,visibleCats:5})\n', "") }) },
  { name: "cat middle interval removed", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "length:QN*2-1", "length:QN*2-2") }) },
  { name: "cat near scene removed", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, ' Object.freeze({asset:"lane",anchor:BRANCH_CAT_STOP_ANCHORS[4]+BRANCH_CAT_NEAR_ANCHOR_OFFSET,width:21,scale:.92,depth:4,parallax:BRANCH_CAT_NEAR_PARALLAX,sourceWidth:1366,sourceHeight:979,transparentBottomPx:19,groundPlaneY:BRANCH_CAT_GROUND_PLANE_Y,groundAnchorY:.9806,occlusionPx:0,role:"near",stationIndex:4,visibleCats:2,flip:true})\n', "") }) },
  { name: "cat adjacent far scene repeats", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'Object.freeze({asset:"farTownB",anchor:BRANCH_CAT_STOP_ANCHORS[1]', 'Object.freeze({asset:"farTownA",anchor:BRANCH_CAT_STOP_ANCHORS[1]') }) },
  { name: "cat density target drops", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "role:\"far\",stationIndex:0,visibleCats:5", "role:\"far\",stationIndex:0,visibleCats:4") }) },
  { name: "cat station anchor collapses", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'asset:"farTownB",anchor:BRANCH_CAT_STOP_ANCHORS[1]', 'asset:"farTownB",anchor:BRANCH_CAT_STOP_ANCHORS[0]') }) },
  { name: "cat Q3-Q4-only special interval offset returns", expected: "cat-scenes", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, 'asset:"plaza",anchor:1465.595', 'asset:"plaza",anchor:1510.595') }) },
  { name: "cat projection ignores anchor", expected: "world-lock", mutate: c => ({ ...c, game: mutateFunction(c.game, "projectBranchWorldSpriteX", "return 50+(anchor-localWorldX)*parallax;", "return 50-localWorldX*parallax;") }) },
  { name: "cat viewport culling disabled", expected: "cat-scenes", mutate: c => ({ ...c, game: mutateFunction(c.game, "renderBranchStagePolish", 'sprite.el.dataset.visible=visible?"true":"false";sprite.el.style.visibility=visible?"visible":"hidden";sprite.el.style.opacity=visible?"1":"0";', 'sprite.el.dataset.visible="false";sprite.el.style.visibility="hidden";sprite.el.style.opacity="0";') }) },
  { name: "cat projection clamp returns", expected: "world-lock", mutate: c => ({ ...c, game: mutateFunction(c.game, "projectBranchWorldSpriteX", "return 50+(anchor-localWorldX)*parallax;", "return 50+Math.max(-12,Math.min(12,(anchor-localWorldX)*parallax));") }) },
  { name: "cat ground anchor bridge removed", expected: "cat-scenes", mutate: c => ({ ...c, game: mutateFunction(c.game, "buildBranchWorldLifeSprite", "sprite.dataset.groundAnchorY=String(config.groundAnchorY);", "sprite.dataset.groundAnchorY='';") }) },
  { name: "legacy cat 70vw billboard", expected: "cat-scenes", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "\n.branch-world-life{position:absolute;", "\n.branch-world-life.is-cat{width:clamp(320px,70vw,860px)}\n.branch-world-life{position:absolute;") }) },
  { name: "dino old horizon offset", expected: "dino-visibility", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "body.st-dino{--branch-horizon-y:-8.2vh;", "body.st-dino{--branch-horizon-y:21.91vh;") }) },
  { name: "dino horizon hidden", expected: "dino-visibility", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "body.st-dino{--branch-horizon-y:-8.2vh;", "body.st-dino #horizon{display:none!important}\nbody.st-dino{--branch-horizon-y:-8.2vh;") }) },
  { name: "dino horizon opacity zero important", expected: "dino-visibility", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "body.st-dino{--branch-horizon-y:-8.2vh;", "body.st-dino #horizon{opacity:0!important}\nbody.st-dino{--branch-horizon-y:-8.2vh;") }) },
  { name: "dino middle height returns to 100", expected: "dino-visibility", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "--branch-mid-height:56vh;", "--branch-mid-height:100%;") }) },
  { name: "dino far herd returns to billboard", expected: "dino-visibility", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "width:clamp(440px,60vw,900px)", "width:70vw") }) },
  { name: "dino nest moves onto rail", expected: "dino-scenes", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, ".branch-dino-nest-landmark{width:var(--life-width)", ".branch-dino-nest-landmark{bottom:12vh;width:var(--life-width)") }) },
  { name: "dino decor shown again", expected: "cat-world", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "body.st-dino:not(.tunnel-interior) #branchDecorT,", "body.st-dino:not(.tunnel-interior) #branchDecorT_REMOVED,") }) },
  { name: "cat decor shown again", expected: "cat-world", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "body.st-cat:not(.tunnel-interior) #branchDecorT{display:none!important", "body.st-cat:not(.tunnel-interior) #branchDecorT_REMOVED{display:none!important") }) },
  { name: "cat active billboard CSS returns", expected: "cat-world", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "\n.branch-world-life{position:absolute;", "\n.branch-world-life.is-cat.is-active{opacity:1}\n.branch-world-life{position:absolute;") }) },
  { name: "world life layer z7", expected: "world-life-layer", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, "#branchEffectFar{z-index:1}#branchWorldLifeLayer{z-index:4}#branchEffectMid{z-index:6}", "#branchEffectFar{z-index:1}#branchWorldLifeLayer{z-index:7}#branchEffectMid{z-index:6}") }) },
  { name: "world life pointer becomes auto", expected: "world-life-layer", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, ".branch-stage-effect-layer,#branchWorldLifeLayer{position:absolute;inset:0;display:none;overflow:hidden;contain:layout paint;pointer-events:none}", ".branch-stage-effect-layer,#branchWorldLifeLayer{position:absolute;inset:0;display:none;overflow:hidden;contain:layout paint;pointer-events:auto}") }) },
  { name: "global critical preload", expected: "sw-critical", mutate: c => ({ ...c, sw: replaceExactlyOnce(c.sw, "const CRITICAL_ASSETS_IMAGES = [", `const CRITICAL_ASSETS_IMAGES = [\n  '/assets/images/nazonazo-tunnel/${CANONICAL[0].name}',`) }) },
  { name: "wrong dino cat polish preload", expected: "preload-scope", mutate: c => ({ ...c, game: mutateFunction(c.game, "preloadBranchStagePolish", "const assets=st&&BRANCH_STAGE_POLISH_ASSETS[st.id];", "const assets=st&&BRANCH_STAGE_POLISH_ASSETS.cat;") }) },
  { name: "extra global polish preload", expected: "preload-scope", mutate: c => ({ ...c, game: replaceExactlyOnce(c.game, "\nfunction stageIndexById", "\npreloadBranchStagePolish({id:\"cat\"});\nfunction stageIndexById") }) },
  { name: "reduced motion keeps ember field", expected: "motion-night", mutate: c => ({ ...c, css: replaceExactlyOnce(c.css, ".branch-fire-ember-field,.branch-fire-crater-ember{display:none!important}", ".branch-fire-crater-ember{display:none!important}") }) },
  { name: "render allocates DOM", expected: "render-allocation", mutate: c => ({ ...c, game: mutateFunction(c.game, "renderBranchStagePolish", " const localWorldX=worldX-o;", ' document.createElement("span");\n const localWorldX=worldX-o;') }) },
  { name: "world life DOM old id", expected: "world-life-layer", mutate: c => ({ ...c, html: replaceExactlyOnce(c.html, '<div id="branchWorldLifeLayer" aria-hidden="true"></div>', '<div id="branchLandmarkLayer" aria-hidden="true"></div>') }) },
  { name: "HTML token rolls back", expected: "query-sw", mutate: c => ({ ...c, html: replaceExactlyOnce(c.html, "styles.css?v=20260722-1410", "styles.css?v=20260721-1409") }) },
  { name: "service worker version rolls back", expected: "query-sw", mutate: c => ({ ...c, sw: replaceExactlyOnce(c.sw, "const CACHE_VERSION = 2317;", "const CACHE_VERSION = 2316;") }) }
];

async function main() {
  const provenance = await validateCanonicalAndProvenance();
  const baseline = validate(sources);
  assert.deepEqual(baseline.errors, [], "1410 dino/cat world-density baseline contract must pass");
  assert.equal(baseline.checkCount, EXPECTED_VALIDATE_CHECKS,
    `EXPECTED_VALIDATE_CHECKS must match measured static contracts (${baseline.checkCount})`);
  assert.equal(mutations.length, EXPECTED_MUTATIONS,
    `mutation inventory must remain exact (${mutations.length}/${EXPECTED_MUTATIONS})`);
  mutations.forEach(mutation => {
    const result = validate(mutation.mutate(sources));
    assert.deepEqual(result.errors, [mutation.expected],
      `${mutation.name}: expected only ${mutation.expected}, got ${result.errors.join(", ") || "PASS"}`);
  });
  console.log(`nazonazo dino/cat world density regression: PASS (17 alpha WebP, provenance ${provenance}, ${baseline.checkCount} static contracts, ${mutations.length}/${mutations.length} mutations REJECT)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
