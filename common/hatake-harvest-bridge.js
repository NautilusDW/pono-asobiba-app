// ═══════════════════════════════════════════════════════════════════
// 共通ヘルパー: はたけにっき → まちづくり 収穫キューブリッジ
// ═══════════════════════════════════════════════════════════════════
// hatake-nikki が収穫成功時にこのキューへ書き込み (enqueue)、machizukuri の
// やさいスタンドが読んで消費する (dequeueOldest) 一方向の橋渡し。
//
// 重要: machizukuri → hatake-nikki 方向の書き込みはこのファイルからは
// 一切発生しない (dequeueOldest はこの新規キュー専用の KEY のみを操作し、
// hatake-nikki 本体のセーブデータ / ずかんデータには一切触れない)。
// machizukuri 側の「room/はたけ双方に書き込みゼロ」原則を維持するための設計。
//
// localStorage キー: pono_hatake_harvest_queue_v1
//   (pono_接頭辞 + _v1 サフィックスは既存の他ゲームのセーブキーと同じ命名規約)
// 上限: MAX_QUEUE_LEN 件。超過分は古い順に間引き、無限増殖を防ぐ。
//
// データスキーマ (配列、各要素は書き込み時点で確定させた値をそのまま冷凍保存。
// img/name も enqueue 時点で解決済みの値を埋め込むので、machizukuri 側は
// hatake-nikki の CROPS テーブルを一切知らなくてよい):
//   {
//     seedId: 'tomato' | 'ninjin' | 'potato' | 'onion',
//     name: string,
//     img: string,
//     weightMultiplier: number,   // 0.4〜2.0 (hatake-nikki harvest() の返り値そのまま)
//     weight: number,             // BASE_WEIGHT(100) × weightMultiplier の丸め値
//     wiltCount: number,
//     bugsMissed: number,
//     extraDays: number,
//     ts: number                  // enqueue 時の Date.now() (デバッグ/将来のTTL用途)
//   }
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var KEY = 'pono_hatake_harvest_queue_v1';
  var MAX_QUEUE_LEN = 20;

  function _getQueue() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function _setQueue(queue) {
    try { localStorage.setItem(KEY, JSON.stringify(queue)); } catch (e) {}
  }

  /**
   * hatake-nikki 側: harvest() 成功時に呼ぶ。
   * entry をスキーマへ整形して追加し、MAX_QUEUE_LEN を超えた分は古い順に間引く。
   */
  function enqueue(entry) {
    if (!entry || typeof entry !== 'object') return;
    var queue = _getQueue();
    queue.push({
      seedId: entry.seedId || null,
      name: entry.name || '',
      img: entry.img || '',
      weightMultiplier: (typeof entry.weightMultiplier === 'number' && isFinite(entry.weightMultiplier)) ? entry.weightMultiplier : 1.0,
      weight: (typeof entry.weight === 'number' && isFinite(entry.weight)) ? entry.weight : 100,
      wiltCount: (typeof entry.wiltCount === 'number' && isFinite(entry.wiltCount)) ? entry.wiltCount : 0,
      bugsMissed: (typeof entry.bugsMissed === 'number' && isFinite(entry.bugsMissed)) ? entry.bugsMissed : 0,
      extraDays: (typeof entry.extraDays === 'number' && isFinite(entry.extraDays)) ? entry.extraDays : 0,
      ts: Date.now()
    });
    while (queue.length > MAX_QUEUE_LEN) queue.shift(); // 古い順に間引く
    _setQueue(queue);
  }

  /** machizukuri 側: 未計量の収穫が1件以上あるか。中身は消費しない。 */
  function hasPending() {
    return _getQueue().length > 0;
  }

  /** machizukuri 側: 先頭 (最古の収穫) を1件取り出してlocalStorageからも削除し返す。空ならnull。 */
  function dequeueOldest() {
    var queue = _getQueue();
    if (queue.length === 0) return null;
    var item = queue.shift();
    _setQueue(queue);
    return item;
  }

  /** デバッグ/テスト用: 中身を消費せず配列コピーを返す。 */
  function peekAll() {
    return _getQueue();
  }

  // ═══ ブラウザ / node 両対応公開 (hatake-nikki/js/logic.js と同じ規約) ═══
  var api = {
    enqueue: enqueue,
    hasPending: hasPending,
    dequeueOldest: dequeueOldest,
    peekAll: peekAll,
    KEY: KEY,
    MAX_QUEUE_LEN: MAX_QUEUE_LEN
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.HatakeHarvestBridge = api;
  }
})();
