# Step C クラウド同期 — KV / secret セットアップ手順書

> このファイルの作業は **wrangler CLI の対話が必要** なので、 実装エージェントではなく
> ユーザー (または orchestrator) が実行する。 完了するまで `/api/savedata` は **503**
> (`savedata_not_configured` / `savedata_secret_missing`) を返す = 既存機能は無傷。

対象 env: **App staging (`staging-app`)** と **production**。
LP (`env.staging`) には不要 (savedata を使わない)。

---

## 1. KV namespace を作成

```bash
# App staging 用
wrangler kv namespace create SAVEDATA_KV --env staging-app

# production 用 (top-level 設定を使うので --env 無し)
wrangler kv namespace create SAVEDATA_KV
```

それぞれ次のような出力が出る:

```
🌀 Creating namespace with title "pono-asobiba-app-staging-SAVEDATA_KV"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "SAVEDATA_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 2. wrangler.toml に id を貼ってコメント解除

`wrangler.toml` の該当ブロック (`REPLACE_WITH_..._SAVEDATA_KV_ID`) を、
上で得た **id** に差し替え、 先頭の `#` を外す。

- production: top-level の `[[kv_namespaces]] binding = "SAVEDATA_KV"` ブロック
- staging-app: `[[env.staging-app.kv_namespaces]] binding = "SAVEDATA_KV"` ブロック

> staging と production は **別 namespace** にすること (同 key の相互上書きを避ける)。

## 3. HMAC secret を登録

合言葉 → KV キー導出に使う HMAC-SHA-256 の秘密鍵。 **env ごとに別値** を推奨。

```bash
# ランダムな 32byte 以上の値を用意 (例):
openssl rand -base64 48

wrangler secret put PASSCODE_HMAC_SECRET --env staging-app
wrangler secret put PASSCODE_HMAC_SECRET            # production
```

(任意) IP ハッシュ用 salt。 未設定なら HMAC secret を流用する:

```bash
wrangler secret put RL_IP_SALT --env staging-app
wrangler secret put RL_IP_SALT
```

## 4. (任意) 純正 Rate Limiting binding

KV counter だけでも動作するが、 厳密な IP レート制限を足したい場合は
`wrangler.toml` の `[[...unsafe.bindings]]` (type=ratelimit) ブロックを
コメント解除する。 `namespace_id` は env 内でユニークな整数を割り当てる。
これは beta 機能なので、 有効化後は必ず staging で 429 が返ることを確認すること。

## 5. secret rotation (将来)

`src/api/passcode.js` 冒頭のコメント参照。 概要:

```bash
# 新 secret を NEXT として追加 (既存合言葉は無効化されない)
wrangler secret put PASSCODE_HMAC_SECRET_NEXT --env staging-app
# 併存期間ののち PREV へ退避 / NEXT を昇格。 180日 (絶対上限) 経過後 PREV 削除。
```

---

## 検証 (セットアップ後)

App staging (`https://pono-asobiba-app-staging.ndw.workers.dev`) で:

```bash
# 保存 (合言葉が返る)
curl -sS -X POST https://pono-asobiba-app-staging.ndw.workers.dev/api/savedata \
  -H 'Content-Type: application/json' \
  -d '{"schema_version":1,"app_version":1968,"data":{"pono_profile_name":"てすと","pono_acorns":"12"}}'
# -> {"ok":true,"passcode":"さくら-もり-ほし-2417","expires_at":"..."}

# 取得 (合言葉で復元)
curl -sS https://pono-asobiba-app-staging.ndw.workers.dev/api/savedata/さくら-もり-ほし-2417
# -> {"ok":true,"schema_version":1,...,"data":{"pono_profile_name":"てすと","pono_acorns":"12"}}

# 不正形式 (KV を引かず 400)
curl -sS https://pono-asobiba-app-staging.ndw.workers.dev/api/savedata/abc
# -> 400 invalid_passcode

# denylist 確認: pono_premium 等を送っても保存/返却されないこと
```
