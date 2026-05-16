// js/animation-player.js
// pono-asobiba-app 共通: manifest 駆動のアニメーション再生
//
// 使い方:
//   const handle = await window.AnimationPlayer.play(imgEl, 'pono-banzai-bust', {
//     onComplete: () => { /* loop:false の最終フレームに到達したら呼ばれる */ }
//   });
//   handle?.stop();
//
// manifest 形式: /assets/animations/<animId>/manifest.json
//   {
//     "fps": 12,            // 任意。frame.duration が無い場合のデフォルト
//     "loop": false,        // true なら最終フレーム後に先頭へループ
//     "frames": [
//       { "file": "001.webp", "duration": 100 },   // duration は ms (任意)
//       { "file": "002.webp" }
//     ]
//   }
//
// manifest が存在しない / 不正な場合は null を返し、 呼び出し側で既存経路に fallback できる。
window.AnimationPlayer = {
  async play(imgEl, animId, { onComplete } = {}) {
    if (!imgEl || !animId) return null;
    const base = '/assets/animations/' + animId;
    let m;
    try {
      m = await fetch(base + '/manifest.json').then(function (r) {
        if (!r.ok) throw new Error('manifest not found');
        return r.json();
      });
    } catch (e) {
      return null;  // manifest なければ何もしない (= 既存経路に fallback できる)
    }
    if (!m || !Array.isArray(m.frames) || m.frames.length === 0) return null;

    // プリロード (= ちらつき防止)
    await Promise.all(m.frames.map(function (f) {
      return new Promise(function (res) {
        const im = new Image();
        im.onload = res;
        im.onerror = res;  // エラーも resolve (= 中断しない)
        im.src = base + '/' + f.file;
      });
    }));

    let idx = 0;
    let stopped = false;
    let timer = null;
    const fpsDuration = 1000 / (m.fps || 12);
    // フレームのネイティブ解像度が `<img>` の width/height 属性として残っていると
    // CSS の width/height よりも優先されてコンテナを突き抜けて表示される
    // ことがあるため、 src を差し替える経路では width/height 属性を必ず剥がす。
    // (フレームを自動トリミングした際の予期しない natural size 漏れ対策)
    try { imgEl.removeAttribute('width'); } catch (_e) {}
    try { imgEl.removeAttribute('height'); } catch (_e) {}
    const next = function () {
      if (stopped) return;
      const f = m.frames[idx];
      // 各フレーム切替時にも防御的にクリア (= 万一外部から再設定されても巻き戻す)
      if (imgEl.hasAttribute('width')) imgEl.removeAttribute('width');
      if (imgEl.hasAttribute('height')) imgEl.removeAttribute('height');
      imgEl.src = base + '/' + f.file;
      idx++;
      const d = f.duration || fpsDuration;
      if (idx >= m.frames.length) {
        if (m.loop) {
          idx = 0;
          timer = setTimeout(next, d);
        } else {
          if (typeof onComplete === 'function') onComplete();
        }
      } else {
        timer = setTimeout(next, d);
      }
    };
    next();
    return {
      stop: function () {
        stopped = true;
        if (timer) { clearTimeout(timer); timer = null; }
      },
      manifest: m,
    };
  },
};
