// common/fairy-3d.js
// Three.js による 3D ボックス破壊演出 (ひらがな完成時のプロトタイプ)
// エントリ: playFairyBreak3D({ mountEl, durationMs, onDone })
// - mountEl: position:relative の要素 (canvasContainer を想定)
// - durationMs: 演出全体の長さ(ms)。省略時は 1400
// - onDone: 演出完了時のコールバック
// WebGL 非対応 / prefers-reduced-motion 時は即 onDone

import * as THREE from 'three';

export async function playFairyBreak3D(opts) {
  const { mountEl, durationMs = 1400, onDone } = opts || {};
  if (!mountEl) throw new Error('fairy-3d: mountEl required');
  if (!window.WebGLRenderingContext) throw new Error('fairy-3d: no WebGL');

  const reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    if (onDone) setTimeout(onDone, 50);
    return;
  }

  const rect = mountEl.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;'
    + 'pointer-events:none;z-index:20;';
  canvas.setAttribute('aria-hidden', 'true');

  const prevPos = mountEl.style.position;
  if (getComputedStyle(mountEl).position === 'static') {
    mountEl.style.position = 'relative';
  }
  mountEl.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 3, 4);
  scene.add(dir);

  // 3x3 の小箱 9 個で 1 つの箱を構成
  const N = 3;
  const totalSize = 3.2;
  const cellSize = totalSize / N;
  const depth = 0.4;
  const palette = [0xFFB3D1, 0xC4A8F5, 0xFFE58F, 0xB4F0B4, 0xFFC2A0];
  const fragments = [];
  const boxGroup = new THREE.Group();
  scene.add(boxGroup);

  const allMaterials = [];

  for (let ix = 0; ix < N; ix++) {
    for (let iy = 0; iy < N; iy++) {
      const geo = new THREE.BoxGeometry(cellSize * 0.94, cellSize * 0.94, depth);
      const color = palette[(ix * N + iy) % palette.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 1,
      });
      allMaterials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      const x = (ix - (N - 1) / 2) * cellSize;
      const y = (iy - (N - 1) / 2) * cellSize;
      mesh.position.set(x, y, 0);
      boxGroup.add(mesh);

      const spreadX = x * 2.4 + (Math.random() - 0.5) * 1.2;
      const spreadY = y * 2.4 + 1.5 + Math.random() * 1.5;
      const spreadZ = (Math.random() - 0.2) * 2.8;
      fragments.push({
        mesh,
        mat,
        geo,
        velocity: new THREE.Vector3(spreadX, spreadY, spreadZ),
        angular: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 9
        ),
      });
    }
  }

  // キラキラ粒子
  const sparkleCount = 50;
  const spPosArr = new Float32Array(sparkleCount * 3);
  const spVel = [];
  for (let i = 0; i < sparkleCount; i++) {
    const th = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.5;
    spPosArr[i * 3] = Math.cos(th) * r;
    spPosArr[i * 3 + 1] = Math.sin(th) * r;
    spPosArr[i * 3 + 2] = 0;
    spVel.push(new THREE.Vector3(
      Math.cos(th) * (0.8 + Math.random() * 2),
      Math.sin(th) * (0.8 + Math.random() * 2) + 1.8,
      (Math.random() - 0.3) * 2
    ));
  }
  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(spPosArr, 3));
  const sparkleMat = new THREE.PointsMaterial({
    color: 0xFFF3AA,
    size: 0.18,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  scene.add(sparkles);

  const SHAKE_MS = 320;
  let startTs = null;
  let raf = 0;
  let disposed = false;
  let lastTs = null;

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    try {
      for (const f of fragments) {
        f.geo.dispose();
        f.mat.dispose();
      }
      sparkleGeo.dispose();
      sparkleMat.dispose();
      renderer.dispose();
    } catch (e) { /* ignore */ }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (prevPos !== undefined) mountEl.style.position = prevPos;
    if (onDone) { try { onDone(); } catch (e) { /* ignore */ } }
  }

  function frame(ts) {
    if (disposed) return;
    if (startTs === null) { startTs = ts; lastTs = ts; }
    const elapsed = ts - startTs;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (elapsed < SHAKE_MS) {
      const amp = 0.045;
      boxGroup.position.set(
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp,
        0
      );
    } else {
      boxGroup.position.set(0, 0, 0);
      const shatterT = elapsed - SHAKE_MS;
      const shatterDur = Math.max(1, durationMs - SHAKE_MS);
      for (const f of fragments) {
        f.velocity.y -= 5.5 * dt;
        f.mesh.position.addScaledVector(f.velocity, dt);
        f.mesh.rotation.x += f.angular.x * dt;
        f.mesh.rotation.y += f.angular.y * dt;
        f.mesh.rotation.z += f.angular.z * dt;
        const fade = Math.max(0, 1 - shatterT / shatterDur);
        f.mat.opacity = fade;
      }
      const posAttr = sparkleGeo.attributes.position;
      for (let i = 0; i < sparkleCount; i++) {
        posAttr.array[i * 3]     += spVel[i].x * dt;
        posAttr.array[i * 3 + 1] += spVel[i].y * dt;
        posAttr.array[i * 3 + 2] += spVel[i].z * dt;
        spVel[i].y += 0.8 * dt;
      }
      posAttr.needsUpdate = true;
      sparkleMat.opacity = Math.max(0, 0.95 * (1 - shatterT / shatterDur * 1.1));
    }

    renderer.render(scene, camera);

    if (elapsed >= durationMs) {
      cleanup();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
}
