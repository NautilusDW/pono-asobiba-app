#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const assetRoot = path.join(root, "assets/images/nazonazo-tunnel");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const runtimeSources = `${game}\n${css}`;

// Each clear point is inside a formerly opaque, near-neutral white component
// (RGB >= 235, chroma <= 22, alpha >= 128) which was disconnected from the
// image border. Keep points protect intentional white flowers and highlights.
const assets = [
  {
    current: "town_mid_layer_whiteback_20260713_v3.webp",
    legacy: "town_mid_layer_whiteback_20260712_v2.webp",
    width: 1774,
    height: 887,
    clear: [
      [400,628],[217,585],[1552,623],[1596,612],[176,572],[1479,684],
      [833,641],[445,610],[1610,681],[1620,603],[427,608],[1527,684],
      [649,714],[1517,616],[1553,683],[467,602],[850,639],[249,578],
      [458,595],[1663,677],[1640,678],[1636,605],[816,637],[1571,590]
    ],
    keep: [[938,700]]
  },
  {
    current: "town_station_line_trees_20260713_v2.webp",
    legacy: "town_station_line_trees_20260706.webp",
    width: 2129,
    height: 564,
    clear: [
      [1041,277],[618,460],[675,459],[248,306],[1449,350],[769,460],
      [688,492],[1928,347],[1893,320],[202,301],[1856,313],[997,262],
      [228,289],[1078,277],[1418,339],[1676,443],[1698,442],[721,489],
      [501,463],[1930,296],[1018,252],[766,489],[1470,346],[270,302],
      [1018,409]
    ],
    keep: [[1997,498]]
  },
  {
    current: "jungle_station_checkpoint_20260713_v2.webp",
    legacy: "jungle_station_checkpoint_20260706.webp",
    width: 1909,
    height: 710,
    clear: [
      [573,408],[1433,398],[160,321],[1548,373],[1283,424],[1777,312],
      [1808,307],[406,369],[318,387],[1667,359],[1286,361],[1782,402],
      [122,392],[707,123],[401,434],[397,412],[696,354],[1325,354],
      [478,356],[1653,395],[305,406],[478,447]
    ],
    keep: [[1499,89],[291,350]]
  },
  {
    current: "jungle_station_line_trees_20260713_v2.webp",
    legacy: "jungle_station_line_trees_20260706.webp",
    width: 2133,
    height: 628,
    clear: [
      [1148,417],[1636,268],[989,464],[767,236],[180,411],[1067,440],
      [1970,466],[1057,428],[1874,450],[1921,483],[432,470],[1025,435],
      [762,258],[1890,458],[799,444],[1863,468],[1625,306],[1048,407],
      [192,401],[722,382],[1826,497],[1138,457],[1643,324],[1297,446],
      [214,414],[1291,464],[206,401],[713,438],[1286,455],[710,412],
      [1899,475],[1689,420],[1901,500],[974,484],[1112,477],[1628,409],
      [687,372],[1990,490],[2015,501],[2020,489],[1592,429],[2013,478],
      [1614,434],[1966,479],[1080,373]
    ],
    keep: [[572,534],[1208,430]]
  },
  {
    current: "number_room_decor_20260713_v2.webp",
    legacy: "number_room_decor_20260707.webp",
    width: 2400,
    height: 620,
    clear: [
      [1664,271],[1647,160],[663,351],[663,293],[663,235],
      [663,176],[709,410],[467,215],[1595,404],[944,403]
    ],
    keep: [[1118,159],[1400,337]]
  },
  {
    current: "future_city_station_line_decor_20260713_v2.webp",
    legacy: "future_city_station_line_decor_20260707.webp",
    width: 2400,
    height: 635,
    clear: [
      [1271,547],[1101,540],[1337,545],[674,281],[737,260],[1750,237],
      [964,359],[1726,214],[887,605],[788,244],[1543,609],[543,572],
      [1692,178],[991,354],[616,426],[878,616],[1632,302],[1588,447],
      [1025,444],[581,442],[1444,621],[1465,620],[564,452],[1894,616]
    ],
    keep: [[620,514],[1604,525]]
  }
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    maxBuffer: 128 * 1024 * 1024,
    ...options
  });
  assert.equal(
    result.status,
    0,
    `${command} failed for ${args.at(-1)}: ${(result.stderr || Buffer.alloc(0)).toString("utf8")}`
  );
  return result.stdout;
}

function decodeRgba(absolute, expected) {
  const probe = JSON.parse(run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,pix_fmt",
    "-of", "json",
    absolute
  ], { encoding: "utf8" }));
  const stream = probe.streams?.[0];
  assert.ok(stream, `${expected.current}: ffprobe found no image stream`);
  assert.equal(stream.width, expected.width, `${expected.current}: width changed`);
  assert.equal(stream.height, expected.height, `${expected.current}: height changed`);
  assert.match(stream.pix_fmt, /a/i, `${expected.current}: ffmpeg reports no alpha plane`);

  const rgba = run("ffmpeg", [
    "-v", "error",
    "-i", absolute,
    "-frames:v", "1",
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "pipe:1"
  ]);
  assert.equal(
    rgba.length,
    expected.width * expected.height * 4,
    `${expected.current}: incomplete ffmpeg RGBA decode`
  );
  return rgba;
}

function alphaAt(rgba, width, x, y) {
  return rgba[(y * width + x) * 4 + 3];
}

for (const expected of assets) {
  assert.ok(
    runtimeSources.includes(expected.current),
    `${expected.current}: game.js/styles.css does not reference the cleaned asset`
  );
  assert.ok(
    !runtimeSources.includes(expected.legacy),
    `${expected.legacy}: legacy white-background asset is still referenced`
  );

  const absolute = path.join(assetRoot, expected.current);
  assert.ok(fs.existsSync(absolute), `${expected.current}: cleaned asset missing`);
  const bytes = fs.statSync(absolute).size;
  assert.ok(bytes > 0, `${expected.current}: cleaned asset is empty`);
  assert.ok(bytes < 3 * 1024 * 1024, `${expected.current}: exceeds the 3MB repository limit`);

  const rgba = decodeRgba(absolute, expected);
  for (const [x, y] of expected.clear) {
    assert.equal(
      alphaAt(rgba, expected.width, x, y),
      0,
      `${expected.current}: internal white remains visible at (${x},${y})`
    );
  }
  for (const [x, y] of expected.keep) {
    assert.ok(
      alphaAt(rgba, expected.width, x, y) > 0,
      `${expected.current}: intentional flower/highlight was erased at (${x},${y})`
    );
  }
}

console.log("nazonazo internal alpha regression: PASS");
