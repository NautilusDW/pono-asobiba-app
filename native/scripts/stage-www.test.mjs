import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildStagePlan,
  loadContentManifest,
  parseCliArgs,
  stageContent,
  verifyOutputInventory
} from './stage-www.mjs';

const SILENT_LOGGER = () => {};

function createFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pono-stage-www-'));
  const repoRoot = path.join(root, 'repo');
  const nativeRoot = path.join(repoRoot, 'native');
  const manifestPath = path.join(nativeRoot, 'content-manifest.json');
  fs.mkdirSync(nativeRoot, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, repoRoot, nativeRoot, manifestPath };
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeManifest(fixture, entries, extra = {}) {
  fs.writeFileSync(
    fixture.manifestPath,
    JSON.stringify({ schemaVersion: 1, entries, ...extra }, null, 2),
    'utf8'
  );
}

function html(body = '') {
  return `<!doctype html><html><head><title>test</title></head><body>${body}</body></html>`;
}

function playHtml() {
  return html(
    '<main>before</main><div class="tap-intro-ad"><div><span>ad</span></div></div><main>after</main>'
  ).replace('</head>', '<link rel="manifest" href="manifest.json"></head>');
}

test('manifest build stages two play aliases and a directory transactionally', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'play.html'), playHtml());
  writeFile(path.join(fixture.repoRoot, 'game/index.html'), html('<p>game</p>'));
  writeFile(path.join(fixture.repoRoot, 'game/data.bin'), Buffer.from([0, 1, 2, 255]));
  writeManifest(fixture, [
    { source: 'play.html', destination: 'play.html', type: 'file', stripTapIntroAd: true },
    { source: 'play.html', destination: 'index.html', type: 'file', stripTapIntroAd: true },
    { source: 'game', destination: 'game', type: 'directory' }
  ]);

  writeFile(path.join(fixture.nativeRoot, 'www/stale.txt'), 'stale');
  const plan = stageContent({
    repoRoot: fixture.repoRoot,
    nativeRoot: fixture.nativeRoot,
    manifestPath: fixture.manifestPath,
    logger: SILENT_LOGGER
  });

  assert.equal(plan.totalFiles, 4);
  assert.equal(plan.htmlFiles, 3);
  assert.equal(plan.strippedAdBlocks, 2);
  assert.equal(plan.strippedWebManifestLinks, 2);
  assert.equal(fs.existsSync(path.join(fixture.nativeRoot, 'www/stale.txt')), false);

  for (const relative of ['play.html', 'index.html']) {
    const output = fs.readFileSync(path.join(fixture.nativeRoot, 'www', relative), 'utf8');
    assert.equal(output.includes('tap-intro-ad'), false);
    assert.equal(output.includes('rel="manifest"'), false);
    assert.equal((output.match(/data-pono-native-flags/g) || []).length, 1);
    assert.match(output, /<main>before<\/main>\s*<main>after<\/main>/);
  }

  const gameOutput = fs.readFileSync(path.join(fixture.nativeRoot, 'www/game/index.html'), 'utf8');
  assert.equal((gameOutput.match(/data-pono-native-flags/g) || []).length, 1);
  assert.deepEqual(
    fs.readFileSync(path.join(fixture.nativeRoot, 'www/game/data.bin')),
    Buffer.from([0, 1, 2, 255])
  );
});

test('dry run performs full preflight without creating or changing www', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'play.html'), playHtml());
  writeManifest(fixture, [
    { source: 'play.html', destination: 'index.html', type: 'file', stripTapIntroAd: true }
  ]);
  writeFile(path.join(fixture.nativeRoot, 'www/keep.txt'), 'keep');

  const before = fs.readFileSync(path.join(fixture.nativeRoot, 'www/keep.txt'), 'utf8');
  const plan = stageContent({
    repoRoot: fixture.repoRoot,
    nativeRoot: fixture.nativeRoot,
    manifestPath: fixture.manifestPath,
    dryRun: true,
    logger: SILENT_LOGGER
  });

  assert.equal(plan.totalFiles, 1);
  assert.equal(fs.readFileSync(path.join(fixture.nativeRoot, 'www/keep.txt'), 'utf8'), before);
  assert.deepEqual(
    fs.readdirSync(fixture.nativeRoot).sort(),
    ['content-manifest.json', 'www']
  );
});

test('preflight failure preserves the previous www', (t) => {
  const fixture = createFixture(t);
  writeManifest(fixture, [
    { source: 'missing.html', destination: 'index.html', type: 'file' }
  ]);
  writeFile(path.join(fixture.nativeRoot, 'www/keep.txt'), 'previous build');

  assert.throws(
    () => stageContent({
      repoRoot: fixture.repoRoot,
      nativeRoot: fixture.nativeRoot,
      manifestPath: fixture.manifestPath,
      logger: SILENT_LOGGER
    }),
    /source が存在しません/
  );
  assert.equal(
    fs.readFileSync(path.join(fixture.nativeRoot, 'www/keep.txt'), 'utf8'),
    'previous build'
  );
});

test('destination collisions are rejected case-insensitively', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'one.txt'), 'one');
  writeFile(path.join(fixture.repoRoot, 'two.txt'), 'two');
  writeManifest(fixture, [
    { source: 'one.txt', destination: 'Assets/Card.png', type: 'file' },
    { source: 'two.txt', destination: 'assets/card.png', type: 'file' }
  ]);

  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /衝突/
  );

  writeManifest(fixture, [
    { source: 'one.txt', destination: 'Assets/one.png', type: 'file' },
    { source: 'two.txt', destination: 'assets/two.png', type: 'file' }
  ]);
  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /directory.*衝突/
  );
});

test('file-list copies only the explicitly named files and fails on a missing item', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'art/keep.webp'), 'keep');
  writeFile(path.join(fixture.repoRoot, 'art/source.png'), 'do not ship');
  writeManifest(fixture, [
    {
      source: 'art',
      destination: 'assets/art',
      type: 'file-list',
      files: ['keep.webp']
    }
  ]);

  stageContent({
    repoRoot: fixture.repoRoot,
    nativeRoot: fixture.nativeRoot,
    manifestPath: fixture.manifestPath,
    logger: SILENT_LOGGER
  });
  assert.equal(fs.readFileSync(path.join(fixture.nativeRoot, 'www/assets/art/keep.webp'), 'utf8'), 'keep');
  assert.equal(fs.existsSync(path.join(fixture.nativeRoot, 'www/assets/art/source.png')), false);

  writeManifest(fixture, [
    {
      source: 'art',
      destination: 'assets/art',
      type: 'file-list',
      files: ['missing.webp']
    }
  ]);
  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /source が存在しません/
  );
});

test('inventory verification detects same-size content tampering', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'asset.bin'), 'abcd');
  writeManifest(fixture, [
    { source: 'asset.bin', destination: 'asset.bin', type: 'file' }
  ]);
  const plan = stageContent({
    repoRoot: fixture.repoRoot,
    nativeRoot: fixture.nativeRoot,
    manifestPath: fixture.manifestPath,
    logger: SILENT_LOGGER
  });

  fs.writeFileSync(path.join(fixture.nativeRoot, 'www/asset.bin'), 'wxyz');
  assert.throws(
    () => verifyOutputInventory(path.join(fixture.nativeRoot, 'www'), plan),
    /内容が.*一致しません/
  );
});

test('directory symlinks and hidden descendants fail closed', async (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'outside.txt'), 'outside');
  fs.mkdirSync(path.join(fixture.repoRoot, 'game'), { recursive: true });
  fs.symlinkSync('../outside.txt', path.join(fixture.repoRoot, 'game/link.txt'));
  writeManifest(fixture, [
    { source: 'game', destination: 'game', type: 'directory' }
  ]);

  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /symlink/
  );

  fs.rmSync(path.join(fixture.repoRoot, 'game/link.txt'));
  writeFile(path.join(fixture.repoRoot, 'game/.env'), 'secret');
  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /隠し項目/
  );
});

test('invalid schema, paths, transforms, and CLI options are rejected', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'plain.txt'), 'plain');

  writeManifest(fixture, [
    { source: '../plain.txt', destination: 'plain.txt', type: 'file' }
  ]);
  assert.throws(() => loadContentManifest(fixture.manifestPath), /正規化済み相対パス/);

  writeManifest(fixture, [
    { source: 'plain.txt', destination: 'plain.txt', type: 'file', stripTapIntroAd: true }
  ]);
  assert.throws(() => loadContentManifest(fixture.manifestPath), /HTML file/);

  writeManifest(fixture, [
    { source: 'plain.txt', destination: 'plain.txt', type: 'file', typo: true }
  ]);
  assert.throws(() => loadContentManifest(fixture.manifestPath), /未知のフィールド/);

  assert.throws(() => parseCliArgs(['--dryrun']), /未知のオプション/);
  assert.deepEqual(parseCliArgs(['--dry-run', '--verbose']), { dryRun: true, verbose: true });
});

test('HTML without a real head and duplicate ad blocks fail before writes', (t) => {
  const fixture = createFixture(t);
  writeFile(path.join(fixture.repoRoot, 'fragment.html'), '<div>fragment</div>');
  writeManifest(fixture, [
    { source: 'fragment.html', destination: 'fragment.html', type: 'file' }
  ]);
  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /<head>/
  );

  writeFile(
    path.join(fixture.repoRoot, 'play.html'),
    html('<div class="tap-intro-ad"></div><div class="tap-intro-ad"></div>')
  );
  writeManifest(fixture, [
    { source: 'play.html', destination: 'index.html', type: 'file', stripTapIntroAd: true }
  ]);
  assert.throws(
    () => buildStagePlan({ repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath }),
    /複数/
  );
});
