"""
ai_namer.py
Netlify Function (ai-name.js) → Gemini 2.5 Flash をプロキシ経由で叩き、
スプライト画像に最適なファイル名候補を JSON で取得するモジュール。

特徴:
- 標準ライブラリのみ使用 (urllib, base64, json, io, re)
- 503/429 は指数バックオフで最大 4 回リトライ
- JSON パースは 3 段階フォールバック (素で json.loads → フェンス剥がし → 正規表現抽出)
- filename は [a-z0-9_]+ に sanitize
- 失敗時は raw_text を NameResult に詰めて呼び出し側で手動入力にフォールバックできる

使い方:
    from ai_namer import request_sprite_name
    result = request_sprite_name(
        img=sprite_pil_image,
        user_context="隠れクマの実",
        existing_names=["kuma_mi_normal", "kuma_mi_smile"],
    )
    print(result.filename, result.variant_candidates)
"""

from __future__ import annotations

import base64
import io
import json
import re
import socket
import time
from dataclasses import dataclass, field
from typing import List, Optional

import urllib.error
import urllib.request

from PIL import Image


NETLIFY_AI_NAME_URL = (
    "https://pono-asobiba.netlify.app/.netlify/functions/ai-name"
)

# Gemini model selection (probed live 2026-04-08):
#   gemini-flash-latest   : alias to current stable flash (DEFAULT, separate quota pool)
#   gemini-2.5-flash-lite : free tier ~1000 req/day (good fallback)
#   gemini-2.5-flash      : free tier only 20 req/day — avoid for batch naming
#   gemini-2.0-flash*     : shared quota pool, often rate-limited
#   gemini-1.5-flash      : deprecated / not found on v1beta
# The Netlify function reads body.model and falls back to this if omitted.
GEMINI_MODEL = "gemini-flash-latest"


SPRITE_NAMING_PROMPT = """\
あなたは子供向け知育アプリの素材命名アシスタントです。
添付画像は、より大きい画像から自動分割された 1 個のスプライト (透過 PNG) です。

ユーザーからの追加コンテキスト: "{user_context}"
(空欄の場合はあなたが画像から判断してください)

スプライト 1 個ごとに 6 つのフィールドを返します:
  【日本語 (人間が読む表示用)】
    base_name    モチーフの種類       例: 蝶々魚
    variant      表情・状態           例: 驚き
    motion       動き・ポーズ         例: 歩行1 (該当なしなら空文字)
  【ASCII slug (ファイル名用)】
    base_slug    base_name の slug    例: chouchouuo
    variant_slug variant の slug      例: surprise
    motion_slug  motion の slug       例: walk1 (motion が空なら空)

ファイル名は base_slug + "_" + variant_slug (+ "_" + motion_slug) と
我々が組み立てるので、filename フィールドは返さなくてよい。

===== 既出の語彙 (絶対に再利用、新しい言い換えを発明しない) =====

base (種類):
{existing_bases_block}

variant (表情):
{existing_variants_block}

motion (動き):
{existing_motions_block}

===== 語彙統一ルール (最優先) =====

1. 上の既出語彙のうち、このスプライトと意味的に同じものがあれば、
   その base_name と base_slug をそのまま再利用する。
   variant / motion も同様。新しい言い換えを作らない。
2. slug は小文字 ASCII (a-z) + 数字 + アンダースコアのみ。
3. base_slug の表記スタイルはバッチ全体で統一する:
   - 既出に romaji 系 (chouchouuo) があれば romaji を続ける
   - 既出に英訳系 (butterflyfish) があれば英訳を続ける
   - 何もない初回はどちらでもよいが、以降はそれを守る
4. variant_slug は英語短名: normal / smile / surprise / confused / angry / sad / wink
5. motion_slug は英語短名: stand / walk1 / walk2 / jump / idle / attack (空欄可)
6. variant の日本語推奨: 通常 / 笑顔 / 驚き / 困惑 / 怒り / 悲しみ / ウィンク
7. motion の日本語推奨: 静止 / 歩行1 / 歩行2 / ジャンプ / 待機 / 攻撃

===== 漠然ラベル禁止ルール =====

種類を "さかな" / "魚" / "動物" / "モンスター" / "キャラ" のような
漠然とした総称で片付けないこと。正確な種名が分からなくても、
**色・模様・形・目立つ特徴** を base_name に含めて区別可能にすること。

悪い例 (NG):
  base_name: さかな     base_slug: sakana
  base_name: 魚         base_slug: fish
  base_name: 動物       base_slug: animal

良い例 (OK):
  base_name: 青い丸魚            base_slug: aoi_marusakana
  base_name: 縞模様の黄色い魚    base_slug: shima_kiiro_sakana
  base_name: 赤いタコ            base_slug: aka_tako
  base_name: 紫の星型魚          base_slug: murasaki_hoshi_sakana
  base_name: 緑のカエル          base_slug: midori_kaeru

ルール:
- 特定の種名 (熱帯魚, 蝶々魚, クマノミ, ドラえもん) が分かるならそれを使う
- 分からないときは、色 + 形/模様 + 大分類 を組み合わせて造語する
- 同じ画像に似た別個体があっても区別できる命名を目指す
- 単に "sakana" や "fish" で終わらせない

===== 出力形式 =====

以下の JSON 1 つだけを返してください。マークダウンフェンス禁止。

{{
  "base_name":          "種類 (日本語)",
  "base_slug":          "種類 (ASCII slug)",
  "variant":            "表情 (日本語)",
  "variant_slug":       "表情 (ASCII slug)",
  "motion":             "動き (日本語、なければ空文字)",
  "motion_slug":        "動き (ASCII slug、なければ空文字)",
  "variant_candidates": ["代替variant候補1", "代替variant候補2"],
  "confidence":         0.0,
  "needs_user_input":   false
}}

細則:
- 画像だけでは表情・動きが断定困難なら needs_user_input を true に。
- variant_candidates には 3-5 個の代替候補。
- confidence は 0.0-1.0 (高いほど自信あり)。
"""


@dataclass
class NameResult:
    """AI 命名の結果。失敗時でも手動入力のためのフィールドが入る。"""

    base_name: str = ""
    variant: str = ""
    motion: str = ""  # pose / animation frame (may be empty)
    base_slug: str = ""      # ASCII slug for base_name
    variant_slug: str = ""   # ASCII slug for variant
    motion_slug: str = ""    # ASCII slug for motion (may be empty)
    filename: str = ""       # composed from slugs (kept for backward compat)
    variant_candidates: List[str] = field(default_factory=list)
    confidence: float = 0.0
    needs_user_input: bool = False
    raw_text: str = ""       # Gemini からの生テキスト (デバッグ用)
    error: Optional[str] = None  # 失敗時のエラー概要

    def compose_filename(self) -> str:
        """
        Build the canonical filename stem from the 3 slugs.
        Always: {base_slug}_{variant_slug}[_{motion_slug}]
        Falls back to a sanitized join of the Japanese names if slugs missing.
        """
        parts = [self.base_slug, self.variant_slug, self.motion_slug]
        parts = [p for p in parts if p]
        if parts:
            return "_".join(parts)
        # Fallback: derive from Japanese fields
        jp_parts = [self.base_name, self.variant, self.motion]
        return _sanitize_filename("_".join(p for p in jp_parts if p)) or "sprite"


def _encode_png(img: Image.Image) -> str:
    """PIL 画像を base64 PNG 文字列に変換 (data URL プレフィックスなし)。"""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _sanitize_filename(name: str) -> str:
    """日本語や記号を含む filename を [a-z0-9_] だけに整形。"""
    if not name:
        return ""
    name = name.strip().lower()
    # よくある拡張子を剥がす
    name = re.sub(r"\.(png|jpg|jpeg|webp|bmp)$", "", name)
    # 非許容文字をアンダースコアに
    name = re.sub(r"[^a-z0-9_]+", "_", name)
    # 連続アンダースコアを 1 つに
    name = re.sub(r"_+", "_", name)
    # 前後のアンダースコア削除
    name = name.strip("_")
    # 先頭が数字なら s_ を付加 (保存時の安全のため)
    if name and name[0].isdigit():
        name = "s_" + name
    return name


def parse_response(text: str) -> NameResult:
    """
    Gemini の応答テキストから NameResult を構築する。
    3 段階フォールバックで頑健にパースする。
    """
    result = NameResult(raw_text=text)
    if not text:
        result.error = "empty response"
        return result

    candidates = []

    # 1) 素で JSON
    candidates.append(text.strip())

    # 2) ```json ... ``` フェンス除去
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        candidates.append(fenced.group(1).strip())

    # 3) 最初の { ... } を貪欲でない抽出 (ネスト考慮のため多段階)
    # シンプルに最初の { から最後の } までを取る
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])

    data = None
    for cand in candidates:
        try:
            data = json.loads(cand)
            break
        except (json.JSONDecodeError, ValueError):
            continue

    if not isinstance(data, dict):
        result.error = "JSON parse failed"
        return result

    result.base_name = str(data.get("base_name", "") or "").strip()
    result.variant = str(data.get("variant", "") or "").strip()
    result.motion = str(data.get("motion", "") or "").strip()

    # Slugs go through sanitization to enforce ASCII-only
    result.base_slug = _sanitize_filename(str(data.get("base_slug", "") or ""))
    result.variant_slug = _sanitize_filename(str(data.get("variant_slug", "") or ""))
    result.motion_slug = _sanitize_filename(str(data.get("motion_slug", "") or ""))

    # Old "filename" field accepted for backward compat, but slug-based
    # composition takes precedence.
    legacy_fn = _sanitize_filename(str(data.get("filename", "") or ""))

    vc = data.get("variant_candidates") or []
    if isinstance(vc, list):
        result.variant_candidates = [str(v).strip() for v in vc if str(v).strip()]

    try:
        result.confidence = float(data.get("confidence", 0.0) or 0.0)
    except (ValueError, TypeError):
        result.confidence = 0.0

    result.needs_user_input = bool(data.get("needs_user_input", False))

    # Build the canonical filename from slugs.
    composed = result.compose_filename()
    if composed and composed != "sprite":
        result.filename = composed
    elif legacy_fn:
        result.filename = legacy_fn
    else:
        result.filename = "sprite"

    return result


def _post_json(url: str, payload: dict, timeout: int = 30) -> tuple:
    """
    urllib で POST してレスポンス (status_code, body_text) を返す。
    HTTPError も status_code を取るためにこの関数に吸収する。
    """
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return e.code, body
    except (urllib.error.URLError, socket.timeout) as e:
        # ネットワーク系エラーは status 0 で返す
        return 0, f"network error: {e}"


_RETRY_AFTER_RE = re.compile(r"retry in\s+([\d.]+)\s*s", re.IGNORECASE)


def _parse_retry_after_seconds(body: str) -> Optional[float]:
    """
    Gemini の 429 レスポンスから "Please retry in 3.5s" 的な秒数を取り出す。
    見つからなければ None。
    """
    if not body:
        return None
    m = _RETRY_AFTER_RE.search(body)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _is_daily_quota_error(body: str) -> bool:
    """
    429 のうち、リトライしても解消しない 1 日制限系エラーを検出する。
    "PerDay" / "RequestsPerDay" を含むなら True。
    """
    if not body:
        return False
    return ("PerDay" in body) or ("RequestsPerDay" in body)


def request_sprite_name(
    img: Image.Image,
    user_context: str = "",
    existing_names: Optional[List[str]] = None,  # legacy, ignored
    existing_bases: Optional[List[tuple]] = None,    # list of (jp_name, slug)
    existing_variants: Optional[List[tuple]] = None,
    existing_motions: Optional[List[tuple]] = None,
    timeout: int = 30,
    max_retries: int = 3,
    url: str = NETLIFY_AI_NAME_URL,
) -> NameResult:
    """
    スプライト画像を Netlify 経由で Gemini に送信し、命名結果を返す。

    既出の語彙は (日本語, slug) のタプルのリストで渡し、
    プロンプト内で "日本語 = slug" の形で AI に提示する。
    こうすることで AI は同じ意味のフィールドに対して必ず同じ slug を返す。
    """
    existing_bases = existing_bases or []
    existing_variants = existing_variants or []
    existing_motions = existing_motions or []

    def _fmt_pair_block(pairs):
        # Deduplicate by (jp, slug)
        seen = set()
        out = []
        for jp, slug in pairs:
            if not jp and not slug:
                continue
            key = (jp, slug)
            if key in seen:
                continue
            seen.add(key)
            if slug:
                out.append(f"  - {jp} = {slug}")
            else:
                out.append(f"  - {jp}")
        if not out:
            return "  (まだなし — 新規に命名してよい)"
        return "\n".join(sorted(out))

    prompt = SPRITE_NAMING_PROMPT.format(
        user_context=(user_context or "").strip() or "(指定なし)",
        existing_bases_block=_fmt_pair_block(existing_bases),
        existing_variants_block=_fmt_pair_block(existing_variants),
        existing_motions_block=_fmt_pair_block(existing_motions),
    )

    try:
        b64 = _encode_png(img)
    except Exception as e:
        r = NameResult()
        r.error = f"encode failed: {e}"
        return r

    payload = {
        "image": b64,
        "mimeType": "image/png",
        "prompt": prompt,
        "model": GEMINI_MODEL,
    }

    # Shorter, more user-friendly backoff. Long backoffs make a stuck batch
    # feel frozen — better to fail fast and let the user retry.
    backoff_schedule = [3, 6, 12]  # seconds per attempt

    last_error = ""
    last_status = 0
    last_body = ""
    for attempt in range(1, max_retries + 1):
        status, body = _post_json(url, payload, timeout=timeout)
        last_status = status
        last_body = body

        if status == 200:
            try:
                data = json.loads(body)
            except (json.JSONDecodeError, ValueError):
                last_error = f"non-JSON 200 response: {body[:200]}"
                break
            text = data.get("text", "") if isinstance(data, dict) else ""
            result = parse_response(text)
            return result

        # 429 with a daily quota error: retrying within the same day is
        # pointless. Fail fast so the batch doesn't waste time.
        if status == 429 and _is_daily_quota_error(body):
            last_error = "daily quota exceeded (try again after Gemini quota reset)"
            break

        if status in (503, 429) and attempt < max_retries:
            # Prefer Gemini's suggested retry_after, else fall back to schedule.
            # Cap retry_after at 15s — anything longer means wait until tomorrow.
            retry_after = _parse_retry_after_seconds(body)
            if retry_after is not None and retry_after <= 15:
                wait_s = max(retry_after + 1.0, 3.0)
            else:
                wait_s = backoff_schedule[min(attempt - 1, len(backoff_schedule) - 1)]
            time.sleep(wait_s)
            continue

        if status == 0 and attempt < max_retries:
            # Network blip — short retry
            time.sleep(min(2 + attempt, 6))
            continue

        # Non-retryable status or max retries exceeded
        if status == 0:
            last_error = f"network error: {body[:200]}"
        else:
            last_error = f"HTTP {status}: {body[:200]}"
        break

    fail = NameResult()
    fail.error = last_error or f"HTTP {last_status} {last_body[:200]}"
    fail.raw_text = last_body
    return fail
