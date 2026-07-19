// src/api/passcode.js
// -----------------------------------------------------------------------------
// 合言葉の生成と、 KV キー導出 (HMAC-SHA-256)。 Web Crypto API のみ使用
// (Cloudflare Workers / Node 20+ webcrypto 互換、 外部依存ゼロ)。
//
// 合言葉フォーマット:  ひらがな3語 + 4桁数字  例) さくら-もり-ほし-2417
//   各語は wordlist.js の UNION から暗号乱数で独立抽出 (重複可)。
//   実効エントロピー = 3*log2(WORDS.length) + 4*log2(10) ≈ 41bit (CRITICAL-1)。
//
// KV キー:  savedata:v1:{HMAC-SHA-256(passcode, SECRET) の hex}
//   合言葉そのものを KV キーにしない。 KV dump が漏れても合言葉が復元されないよう
//   HMAC で不可逆化する。
//
// ----------------------------------------------------------------------------
// HMAC secret rotation 手順 (HIGH-2):
//   1. 新 secret を  wrangler secret put PASSCODE_HMAC_SECRET_NEXT --env <env>  で登録
//   2. デプロイ (コード変更なし)。 GET は現行(PASSCODE_HMAC_SECRET) と
//      PASSCODE_HMAC_SECRET_PREV/NEXT の両方でキーを引く (hmacKeyNames が複数返す)
//   3. しばらく併存させ、 新規 POST を新 secret で書きたいときは
//        現 SECRET -> PASSCODE_HMAC_SECRET_PREV へ退避
//        NEXT -> PASSCODE_HMAC_SECRET へ昇格
//      と付け替える (両方 GET で引けるので既存合言葉は無効化されない)
//   4. 旧データの絶対有効期限 (180日) が過ぎたら PREV を削除して rotation 完了
//   ※ secret を即時入れ替えると既存の全合言葉が無効化されるので、 必ず併存期間を置く。
// -----------------------------------------------------------------------------

import { WORDS, WORD_SET } from './wordlist.js';

export const WORDS_PER_PASSCODE = 3;
export const DIGIT_COUNT = 4;
export const KEY_PREFIX = 'savedata:v1:';

// 合言葉のエントロピー (bit)。 tests / 運用監査で 41bit 以上を確認するために公開。
export function passcodeEntropyBits(poolSize = WORDS.length) {
  return WORDS_PER_PASSCODE * Math.log2(poolSize) + DIGIT_COUNT * Math.log2(10);
}

// ---- 暗号乱数ヘルパ (バイアスなし) ----
function randUint32() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

// [0, n) の一様乱数。 rejection sampling で剰余バイアスを排除。
function randInt(n) {
  if (n <= 0) return 0;
  const limit = Math.floor(0x100000000 / n) * n; // 4294967296 = 2^32
  let x;
  do {
    x = randUint32();
  } while (x >= limit);
  return x % n;
}

function pickWord() {
  return WORDS[randInt(WORDS.length)];
}

function pickDigits() {
  return String(randInt(Math.pow(10, DIGIT_COUNT))).padStart(DIGIT_COUNT, '0');
}

// 合言葉を1つ生成。 例) 'さくら-もり-ほし-2417'
export function generatePasscode() {
  const parts = [];
  for (let i = 0; i < WORDS_PER_PASSCODE; i++) parts.push(pickWord());
  parts.push(pickDigits());
  return parts.join('-');
}

// ---- 形式検証 (KV アクセス前の一次ゲート: 不正形式は即 400) ----
// ひらがな (小書き含む) 語 x3 + 4桁数字。 U+3041..U+3096 + 長音を除く。
const PASSCODE_FORMAT = /^[ぁ-ゖ]{1,12}-[ぁ-ゖ]{1,12}-[ぁ-ゖ]{1,12}-[0-9]{4}$/;

export function isValidPasscodeFormat(pc) {
  return typeof pc === 'string' && PASSCODE_FORMAT.test(pc);
}

// 形式 + 語彙メンバーシップまで検証 (未知語を含む合言葉は KV を引かず reject)。
export function isKnownPasscode(pc) {
  if (!isValidPasscodeFormat(pc)) return false;
  const parts = pc.split('-');
  if (parts.length !== WORDS_PER_PASSCODE + 1) return false;
  for (let i = 0; i < WORDS_PER_PASSCODE; i++) {
    if (!WORD_SET.has(parts[i])) return false;
  }
  return /^[0-9]{4}$/.test(parts[WORDS_PER_PASSCODE]);
}

// ---- HMAC-SHA-256 -> KV キー名 ----
function toHex(buf) {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function hmacHex(passcode, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(passcode));
  return toHex(sig);
}

// 現行 secret での KV キー名 (書き込み・読み出しの主キー)。
export async function hmacKeyName(passcode, secret) {
  return KEY_PREFIX + (await hmacHex(passcode, secret));
}

// GET 用: rotation を考慮し、 現行 + PREV/NEXT secret 全てのキー名を返す。
// 先頭が現行キー。 env から secret を集める。
export async function hmacKeyNames(passcode, env) {
  const secrets = [];
  if (env.PASSCODE_HMAC_SECRET) secrets.push(env.PASSCODE_HMAC_SECRET);
  if (env.PASSCODE_HMAC_SECRET_PREV) secrets.push(env.PASSCODE_HMAC_SECRET_PREV);
  if (env.PASSCODE_HMAC_SECRET_NEXT) secrets.push(env.PASSCODE_HMAC_SECRET_NEXT);
  const names = [];
  for (const s of secrets) {
    if (!s) continue;
    names.push(KEY_PREFIX + (await hmacHex(passcode, s)));
  }
  return names;
}
