# Daily Quest LS スキーマ仕様書

> Phase 2-4 の実装エージェントが参照する localStorage 構造の確定仕様。
> 既存 `common/acorns.js` の `todayKey()` (YYYY-MM-DD, 端末ローカル) と整合させる。

## 対象 LS キー

| LS Key | 用途 |
| --- | --- |
| `pono_daily_quest_v1` | 今日のお題 (1 件 / 日) の state |
| `pono_donguri_shop_v1` | どんぐりショップでの購入履歴 |

---

## 1. `pono_daily_quest_v1`

今日のお題 1 件と進行状況を保持する。

### スキーマ

```json
{
  "schemaVersion": 1,
  "date": "2026-06-25",
  "questId": "maze",
  "clearedAt": null,
  "bonusUsedAt": null
}
```

### フィールド定義

| Field | Type | 説明 |
| --- | --- | --- |
| `schemaVersion` | number | 必須。 `1` 固定。 mismatch (将来 v2 を追加した時) なら record を破棄して再選定 |
| `date` | string | JST `"YYYY-MM-DD"` (acorns.js `todayKey()` と同フォーマット)。 翌日 0:00 (JST) を跨いだら破棄して再生成 |
| `questId` | string | `"maze" \| "quizland" \| "puzzle" \| "oto" \| "bento"` のいずれか |
| `clearedAt` | string \| null | ISO8601 (例: `"2026-06-25T15:42:13+09:00"`)。 達成 timestamp。 未達成は `null` |
| `bonusUsedAt` | string \| null | ISO8601。 ガチャでボーナス枠を消費した timestamp。 未消費は `null` |

### 仕様

1. **冪等 markCleared()**
   - 同日に複数回 `markCleared()` を呼んでも `clearedAt` は最初の 1 回だけ書き込み。
   - 2 回目以降は no-op (上書きしない)。
2. **bonusUsedAt は再利用不可**
   - `bonusUsedAt !== null` なら ⭐ボーナス演出 (シール確定枠) を出さない。
   - ガチャの確定枠を消費したフラグとして使う。
3. **日付ロールオーバー**
   - 起動時に `record.date !== todayKey()` なら record 破棄 → 新 `questId` 選定。
   - 未来日付ガード: `record.date > todayKey()` (親が時計を弄った場合) も破棄して再選定。
4. **schemaVersion mismatch**
   - `record.schemaVersion !== 1` なら破棄して再生成 (将来の v2 移行時の保険)。
5. **JSON parse 失敗**
   - `try/catch` で握って record 破棄 → 再選定 (壊れた LS への自己治癒)。

### 推奨 API シグネチャ (実装エージェント向け参考)

```js
// common/daily-quest.js (新規) のイメージ
window.PonoDailyQuest = {
  getToday(): { questId, label, href, cleared, bonusUsed } | null,
  markCleared(questId): void,        // 冪等
  markBonusUsed(questId): void,      // 冪等
  isClearedToday(questId): boolean,
  isAnyClearedToday(): boolean,
};
```

---

## 2. `pono_donguri_shop_v1`

どんぐりショップでの購入履歴。 シール獲得との結合点。

### スキーマ

```json
{
  "schemaVersion": 1,
  "purchases": [
    {
      "stickerId": "maze_clear_1",
      "purchasedAt": "2026-06-25T10:30:00+09:00",
      "costAcorns": 50
    }
  ]
}
```

### フィールド定義

| Field | Type | 説明 |
| --- | --- | --- |
| `schemaVersion` | number | `1` 固定 |
| `purchases` | Array | 購入履歴。 append-only |
| `purchases[].stickerId` | string | 購入したシールの ID。 `PonoGameStickers` の sticker 定義 ID と一致 |
| `purchases[].purchasedAt` | string | ISO8601 |
| `purchases[].costAcorns` | number | 購入時に消費したどんぐり個数 (将来の値段改定に備えてスナップショット) |

### 仕様

1. **どんぐり消費**
   - `common/acorns.js` の `window.spendAcorns(cost)` を呼ぶ。
   - 戻り値 `true` (残高足りた) → 購入確定 → `pono_donguri_shop_v1.purchases` に push + シール grant。
   - 戻り値 `false` (残高不足) → 購入処理中止、 UI 側で「どんぐりが足りないよ」 表示。
   - 内部実装: `spend(n)` は `add(-cost, { reason: 'spend' })` を呼んで `pono-acorns-changed` イベントを dispatch するので、 ヘッダのどんぐり表示は自動追従。
2. **シール獲得**
   - 購入確定後に既存の `PonoGameStickers.grant({ gameId, stickerId, event: 'donguri_shop' })` を呼ぶ。
   - `gameId` は **そのシールの所属ゲーム** (例: `maze_clear_1` なら `gameId: 'maze'`)。 ショップ側で sticker→game の resolver を持つ。
3. **重複購入**
   - 同じ `stickerId` を 2 度購入できるかは UX 判断。 v1 では「購入済みは UI でグレーアウト + ボタン無効化」 で防ぐ (LS 側はチェックしない、 UI 責務)。
4. **schemaVersion mismatch**
   - `purchases` は append-only なので mismatch 時に **データ破棄しない**。 旧 schema を v1 にマイグレートして保存。

### 関連 API リファレンス (調査済み)

```js
// common/acorns.js
window.getAcorns();              // 現在残高
window.addAcorns(n, opts);       // 加算 (opts.reason 任意)
window.spendAcorns(n);           // 減算、 残高不足なら false 返却で no-op
// pono-acorns-changed イベントが dispatch される (delta/before/after)
```

```js
// 既存 (PonoGameStickers は別途実装)
window.PonoGameStickers.grant({ gameId, stickerId, event });
```

---

## 3. 既存 LS との衝突回避

| 既存 key | 用途 | 衝突懸念 |
| --- | --- | --- |
| `pono_acorns` | どんぐり残高 | なし (本仕様は read/spend のみ) |
| `pono_acorns_daily_<gameId>_<date>` | ゲーム別日次キャップ | なし |
| `pono_acorns_daily_total_<date>` | 全体日次キャップ | なし |
| `bento_sk_intro_done` | bento sk-intro 完了マーカー | なし (本仕様は read-only) |
| `bento_tutorial_done_v1` | bento 本編チュートリアル完了 | なし (本仕様は read-only) |

新規キー命名: `pono_daily_quest_v1` / `pono_donguri_shop_v1` は既存 prefix と衝突しない。

---

## 4. デバッグ / リセット

開発時のリセット (admin / DevTools) は以下を localStorage から削除:

```js
localStorage.removeItem('pono_daily_quest_v1');
localStorage.removeItem('pono_donguri_shop_v1');
```

`pono_acorns` (残高) は別管理なので一緒に消さないこと (誤って残高ゼロにすると検証ミス)。
