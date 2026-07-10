#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagesDir = path.join(root, 'maze', 'imageStages');
const files = (await readdir(stagesDir)).filter((name) => name.endsWith('.json') && name !== '_index.json');
const errors = [];

function requireObstacle(file, stage, configKey, obstacleKind) {
  const cfg = stage[configKey];
  if (!cfg) return;
  const id = String(cfg.obstacleId || '');
  const target = (stage.obstacles || []).find((obstacle) => obstacle && obstacle.id === id);
  if (!id) errors.push(`${file}: ${configKey}.obstacleId is empty`);
  else if (!target) errors.push(`${file}: ${configKey}.obstacleId=${id} does not exist`);
  else if (target.kind !== obstacleKind) {
    errors.push(`${file}: ${configKey}.obstacleId=${id} is ${target.kind}, expected ${obstacleKind}`);
  }
}

for (const file of files) {
  let stage;
  try {
    stage = JSON.parse(await readFile(path.join(stagesDir, file), 'utf8'));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }
  requireObstacle(file, stage, 'waterGimmick', 'pond');
  requireObstacle(file, stage, 'strengthGimmick', 'rock');
  requireObstacle(file, stage, 'webGimmick', 'web');

  const flag = stage.flagGimmick;
  if (flag) {
    const obstacles = stage.obstacles || [];
    const entrance = obstacles.find((o) => o && o.id === flag.entranceObstacleId);
    const exit = obstacles.find((o) => o && o.id === flag.exitObstacleId);
    if (!entrance || entrance.kind !== 'hole') errors.push(`${file}: flag entrance hole is missing`);
    if (!exit || exit.kind !== 'hole') errors.push(`${file}: flag exit hole is missing`);
    if (flag.entranceObstacleId && flag.entranceObstacleId === flag.exitObstacleId) {
      errors.push(`${file}: flag entrance and exit use the same obstacle`);
    }
    if (flag.exitNodeId && !(stage.nodes || []).some((node) => node && node.id === flag.exitNodeId)) {
      errors.push(`${file}: flag exitNodeId=${flag.exitNodeId} does not exist`);
    }
  }
}

if (errors.length) {
  console.error(`Maze stage link validation failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Maze stage links OK (${files.length} JSON files)`);
