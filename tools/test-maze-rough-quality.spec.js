/**
 * 迷路ラフ ランダム生成 品質検証スクリプト (改修後動作確認用)
 * 実行方法: npx playwright test tools/test-maze-rough-quality.spec.js
 * staging URL を直接叩くため、開発サーバー起動は不要
 *
 * 目的:
 *   別エージェントが _extendDeadEnds / _braidDeadEnds / sanity check を実装した後、
 *   ステージング (Cloudflare Workers) で生成品質の回帰を確認するための再利用可能スクリプト。
 *
 * 検証フロー:
 *   1. 難易度 1, 30, 50, 60, 74, 75, 90, 100 で各 5 回ランダム生成
 *   2. 各回 #statBranches / #statDeadEnds / #statShortest / #statTiles を取得
 *   3. wide tier (d=1, d=30) は情報出力のみ、no assert
 *   4. narrow tier (d=50..74) と 2-panel tier (d=75..100) は
 *      平均行き止まり数が wide tier より大きく増えていない / 最短経路が破綻的に短くなっていない
 *      を簡易的に検証
 *
 * 既知の懸念:
 *   - ステージングのキャッシュ (Cloudflare) が古いと改修前の挙動を踏むので、
 *     必ず sw.js の CACHE_VERSION バンプ + デプロイ完了を確認してから実行すること。
 *   - 統計値は SW の bfcache に影響されないが、初回ロード時は SW 登録待ちが入るので
 *     networkidle まで待機する。
 */

const { test, expect } = require('@playwright/test');

const STAGING_URL = 'https://pono-asobiba-staging.ndw.workers.dev/tools/maze-rough.html';
const DIFFICULTIES = [1, 30, 50, 60, 74, 75, 90, 100];
const RUNS_PER_DIFF = 5;

// 後段の assert に使う tier 分類
function tierOf(d) {
  if (d <= 30) return 'wide';
  if (d <= 74) return 'narrow';
  return 'panel2';
}

test.describe('maze-rough ランダム生成 品質検証', () => {
  test.setTimeout(180_000); // 8 難易度 × 5 回 × ページ遷移含めるため余裕を持って 3 分

  test('全 difficulty で生成して統計を収集 + 回帰チェック', async ({ page }) => {
    // 集計バケツ
    const results = {}; // { [d]: [{ branches, deadEnds, shortest, tiles }, ...] }

    // staging を開く
    await page.goto(STAGING_URL, { waitUntil: 'networkidle' });

    // 必須要素が現れるまで待つ
    await page.waitForSelector('#generateBtn', { state: 'visible', timeout: 15_000 });
    await page.waitForSelector('#diffInput',   { state: 'visible', timeout: 15_000 });
    await page.waitForSelector('#statBranches',{ state: 'attached', timeout: 15_000 });
    await page.waitForSelector('#statDeadEnds',{ state: 'attached', timeout: 15_000 });

    for (const d of DIFFICULTIES) {
      results[d] = [];

      for (let i = 1; i <= RUNS_PER_DIFF; i++) {
        // 難易度を set
        // #diffInput (number) と #diffSlider (range) は input イベント連動なので、
        // 確実性を取って両方とも JS から value を更新 + input イベントを発火させる。
        await page.evaluate((val) => {
          const inp = document.getElementById('diffInput');
          const sld = document.getElementById('diffSlider');
          if (inp) {
            inp.value = String(val);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (sld) {
            sld.value = String(val);
            sld.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, d);

        // 生成ボタン押下
        await page.click('#generateBtn');

        // 同期処理だが念のため DOM 反映を待つ
        await page.waitForTimeout(200);

        // 統計を取得
        const stats = await page.evaluate(() => {
          const txt = (id) => {
            const el = document.getElementById(id);
            return el ? el.textContent.trim() : '';
          };
          const num = (id) => {
            const t = txt(id);
            const n = parseInt(t.replace(/[^\d-]/g, ''), 10);
            return Number.isFinite(n) ? n : null;
          };
          return {
            branches: num('statBranches'),
            deadEnds: num('statDeadEnds'),
            shortest: num('statShortest'),
            tiles:    num('statTiles'),
            connRaw:  txt('statConn'),
          };
        });

        // 想定外なら fail
        if (stats.branches === null || stats.deadEnds === null) {
          throw new Error(
            `[d=${d} 試行${i}] 統計取得に失敗: ${JSON.stringify(stats)} ` +
            `(セレクタ #statBranches / #statDeadEnds が見つからない可能性)`
          );
        }

        results[d].push(stats);
        // 仕様通りのログ出力
        console.log(
          `d=${d}, 試行${i}: 分岐数=${stats.branches}, 行き止まり=${stats.deadEnds}` +
          ` (最短=${stats.shortest ?? '—'}, 道タイル=${stats.tiles ?? '—'})`
        );
      }
    }

    // 集計 (平均) を出す
    const avg = {};
    for (const d of DIFFICULTIES) {
      const arr = results[d];
      const n = arr.length || 1;
      const sum = arr.reduce(
        (a, r) => ({
          branches: a.branches + (r.branches ?? 0),
          deadEnds: a.deadEnds + (r.deadEnds ?? 0),
          shortest: a.shortest + (r.shortest ?? 0),
          tiles:    a.tiles    + (r.tiles    ?? 0),
        }),
        { branches: 0, deadEnds: 0, shortest: 0, tiles: 0 }
      );
      avg[d] = {
        branches: +(sum.branches / n).toFixed(2),
        deadEnds: +(sum.deadEnds / n).toFixed(2),
        shortest: +(sum.shortest / n).toFixed(2),
        tiles:    +(sum.tiles    / n).toFixed(2),
        tier: tierOf(d),
      };
    }

    console.log('\n===== 平均 (difficulty 別) =====');
    for (const d of DIFFICULTIES) {
      const a = avg[d];
      console.log(
        `d=${d.toString().padStart(3)} [${a.tier.padEnd(6)}] ` +
        `分岐=${a.branches.toString().padStart(5)}  ` +
        `行止=${a.deadEnds.toString().padStart(5)}  ` +
        `最短=${a.shortest.toString().padStart(6)}  ` +
        `道=${a.tiles.toString().padStart(5)}`
      );
    }

    // 回帰チェック (情報出力のみのものは assert しない)
    //
    // narrow tier (d=50..74) と 2-panel tier (d=75..100) について、
    // 改修前 (旧コード) と比べて行き止まり数が極端に増えていないことを確認したい。
    // ただし「旧の baseline」を test 側に持たないので、ここでは tier 内比較 / 相対比較で行う。
    //
    // 簡易ルール:
    //   (A) narrow の平均 deadEnds は wide (d=30) の平均 deadEnds の 2.0 倍以下
    //       (= dead-end が爆発的に増えていないこと。 _extendDeadEnds / _braidDeadEnds で
    //          delete されたあとの値なので、wide より大幅増は退行のサイン)
    //   (B) panel2 の平均 deadEnds も wide (d=30) の 2.5 倍以下 (キャンバス 2 倍だが密度比較)
    //   (C) 全 tier で平均 shortest が 4 以上 (= BFS 解が破綻的に短くなっていないこと)
    //
    // この閾値はあくまでも回帰検出用のヒューリスティック。 後で memory に基づき調整する。
    const wideBaseDeadEnds = avg[30].deadEnds;

    for (const d of DIFFICULTIES) {
      const a = avg[d];

      // (C) 共通: 最短経路が異常に短くないか
      expect(a.shortest, `d=${d}: 平均最短経路が短すぎる (${a.shortest})`).toBeGreaterThanOrEqual(4);

      if (a.tier === 'narrow') {
        // (A)
        const maxAllowed = Math.max(wideBaseDeadEnds * 2.0, 5);
        expect(
          a.deadEnds,
          `d=${d} (narrow): 平均行き止まり ${a.deadEnds} が wide (d=30) の ${wideBaseDeadEnds} の 2.0 倍 (${maxAllowed.toFixed(1)}) を超えている`
        ).toBeLessThanOrEqual(maxAllowed);
      } else if (a.tier === 'panel2') {
        // (B)
        const maxAllowed = Math.max(wideBaseDeadEnds * 2.5, 6);
        expect(
          a.deadEnds,
          `d=${d} (panel2): 平均行き止まり ${a.deadEnds} が wide (d=30) の ${wideBaseDeadEnds} の 2.5 倍 (${maxAllowed.toFixed(1)}) を超えている`
        ).toBeLessThanOrEqual(maxAllowed);
      }
      // wide (d=1, d=30) は情報出力のみ — assert しない
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 注意: 実行前に必ず sw.js の CACHE_VERSION バンプ + Cloudflare デプロイ完了を
// 確認すること。 staging に旧 SW がキャッシュされていると改修前の挙動を踏み、
// 統計値が古い値で返ってきて assert が誤判定する。
// ─────────────────────────────────────────────────────────────────────────
