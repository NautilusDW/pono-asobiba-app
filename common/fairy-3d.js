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
  if (rect.width < 4 || rect.height < 4) {
    if (onDone) setTimeout(onDone, 50);
    return;
  }
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  // 前回インスタンスがまだ生きていたら先に片付け、WebGL コンテキストの積み増しを防ぐ
  if (mountEl._fairy3dCleanup) {
    try { mountEl._fairy3dCleanup(); } catch (e) { /* ignore */ }
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;'
    + 'pointer-events:none;z-index:20;';
  canvas.setAttribute('aria-hidden', 'true');

  // WebGLRenderer 構築は稀に失敗する (context 上限、ドライバクラッシュ等)。
  // 先にレンダラを作ってから DOM に append することで、失敗時に孤立 canvas を残さない。
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    if (onDone) setTimeout(onDone, 50);
    throw err;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  const prevPos = mountEl.style.position;
  if (getComputedStyle(mountEl).position === 'static') {
    mountEl.style.position = 'relative';
  }
  mountEl.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 3, 4);
  scene.add(dir);

  // 衝撃点から放射状の亀裂 + 同心リングで破片ポリゴンを生成 (ガラス割れ風)
  const totalSize = 3.2;
  const halfSize = totalSize / 2;
  const depth = 0.18;
  const palette = [0xFFB3D1, 0xC4A8F5, 0xFFE58F, 0xB4F0B4, 0xFFC2A0];
  const fragments = [];
  const boxGroup = new THREE.Group();
  scene.add(boxGroup);

  // 衝撃点 = 中心付近をわずかにずらす
  const impactX = (Math.random() - 0.5) * totalSize * 0.25;
  const impactY = (Math.random() - 0.5) * totalSize * 0.25;

  // 放射線 (楔) を 9〜13 本、角度をジッター付きで配置
  const numWedges = 9 + Math.floor(Math.random() * 5);
  const angles = [];
  for (let i = 0; i < numWedges; i++) {
    const base = (i / numWedges) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * (Math.PI * 2 / numWedges) * 0.7;
    angles.push(base + jitter);
  }
  angles.sort((a, b) => a - b);

  // 亀裂が箱の対角まで届くように十分な最大半径
  const maxRadius = Math.hypot(halfSize, halfSize) * 1.1;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clipToBox(x, y) {
    return { x: clamp(x, -halfSize, halfSize), y: clamp(y, -halfSize, halfSize) };
  }

  for (let w = 0; w < numWedges; w++) {
    const a1 = angles[w];
    const a2 = (w + 1 < numWedges) ? angles[w + 1] : angles[0] + Math.PI * 2;

    // 同心リングを 2〜4 本、半径は非線形にばらつかせて「内側細かく・外側大きく」
    const numRings = 2 + Math.floor(Math.random() * 3);
    const radii = [0];
    for (let r = 0; r < numRings; r++) {
      const t = Math.pow((r + 1) / numRings, 1.4);
      radii.push(maxRadius * t * (0.75 + Math.random() * 0.3));
    }

    for (let r = 0; r < numRings; r++) {
      const r1 = radii[r];
      const r2 = radii[r + 1];

      // ポリゴン頂点 (中心は衝撃点)
      const poly = [];
      if (r1 < 0.01) {
        // 最内ring = 三角形 (衝撃点 → 外周2点)
        poly.push({ x: impactX, y: impactY });
      } else {
        poly.push(clipToBox(impactX + r1 * Math.cos(a1), impactY + r1 * Math.sin(a1)));
      }
      poly.push(clipToBox(impactX + r2 * Math.cos(a1), impactY + r2 * Math.sin(a1)));
      poly.push(clipToBox(impactX + r2 * Math.cos(a2), impactY + r2 * Math.sin(a2)));
      if (r1 >= 0.01) {
        poly.push(clipToBox(impactX + r1 * Math.cos(a2), impactY + r1 * Math.sin(a2)));
      }

      // ポリゴン重心
      let cx = 0, cy = 0;
      for (const p of poly) { cx += p.x; cy += p.y; }
      cx /= poly.length; cy /= poly.length;

      // Shape は重心を原点に置く (mesh.position で 3D 空間に配置)
      const shape = new THREE.Shape();
      shape.moveTo(poly[0].x - cx, poly[0].y - cy);
      for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i].x - cx, poly[i].y - cy);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
      geo.translate(0, 0, -depth / 2);

      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.08,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, cy, 0);
      boxGroup.add(mesh);

      // 衝撃点から外向きに速度、距離に比例して加速
      const dx = cx - impactX;
      const dy = cy - impactY;
      const dist = Math.hypot(dx, dy) || 0.001;
      const spread = 2.6 + Math.random() * 1.4;
      fragments.push({
        mesh, mat, geo,
        velocity: new THREE.Vector3(
          (dx / dist) * spread * (0.6 + dist * 0.6),
          (dy / dist) * spread * (0.6 + dist * 0.6) + 1.1,
          (Math.random() - 0.25) * 2.8
        ),
        angular: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
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
    if (mountEl._fairy3dCleanup === cleanup) mountEl._fairy3dCleanup = null;
    if (onDone) { try { onDone(); } catch (e) { /* ignore */ } }
  }
  mountEl._fairy3dCleanup = cleanup;

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
