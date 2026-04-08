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
#   gemini-2.5-flash-lite : free tier ~1000 req/day (DEFAULT, good quality + quota)
#   gemini-flash-latest   : alias to current stable flash (auto-upgrades)
#   gemini-2.5-flash      : free tier only 20 req/day — avoid for batch naming
#   gemini-2.0-flash*     : currently rate-limited (shared quota pool)
#   gemini-1.5-flash      : deprecated / not found on v1beta
# The Netlify function reads body.model and falls back to this if omitted.
GEMINI_MODEL = "gemini-2.5-flash-lite"


SPRITE_NAMING_PROMPT = """\
あなたは子供向け知育アプリの素材命名アシスタントです。
添付画像は、より大きい画像から自動分割された 1 個のスプライト (透過 PNG) です。

ユーザーからの追加コンテキスト: "{user_context}"
(空欄の場合はあなたが画像から判断してください)

既存ファイル名 (重複回避のため参考に):
{existing_names_block}

以下の JSON 1 つだけを返してください。余計な説明やマークダウンフェンスは一切付けないでください。

{{
  "base_name":          "日本語でキャラ/モチーフの種類 (例: 隠れクマの実)",
  "variant":            "表情・状態の日本語短名 (例: サプライズ)",
  "filename":           "ASCII英数+アンダースコアのファイル名 stem (.png なし、例: kuma_mi_surprise)",
  "variant_candidates": ["代替variant1", "代替variant2"],
  "confidence":         0.0,
  "needs_user_input":   false
}}

ルール:
- filename は小文字ASCIIと数字とアンダースコアのみ。日本語・空白・記号禁止
- filename には base_name と variant の両方のニュアンスを含める
- 画像だけでは表情やアニメーションのコマ順などが断定できない場合は needs_user_input を true にして variant_candidates に 3-5 個の候補を出す
- 既存ファイル名と重複する場合は末尾に _2, _3 などで区別
- confidence は 0.0-1.0 (高いほど自信あり)
"""


@dataclass
class NameResult:
    """AI 命名の結果。失敗時でも手動入力のためのフィールドが入る。"""

    base_name: str = ""
    variant: str = ""
    filename: str = ""
    variant_candidates: List[str] = field(default_factory=list)
    confidence: float = 0.0
    needs_user_input: bool = False
    raw_text: str = ""       # Gemini からの生テキスト (デバッグ用)
    error: Optional[str] = None  # 失敗時のエラー概要


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
    result.filename = _sanitize_filename(str(data.get("filename", "") or ""))

    vc = data.get("variant_candidates") or []
    if isinstance(vc, list):
        result.variant_candidates = [str(v).strip() for v in vc if str(v).strip()]

    try:
        result.confidence = float(data.get("confidence", 0.0) or 0.0)
    except (ValueError, TypeError):
        result.confidence = 0.0

    result.needs_user_input = bool(data.get("needs_user_input", False))

    # filename が空なら base_name + variant から自動生成
    if not result.filename:
        auto = f"{result.base_name}_{result.variant}"
        result.filename = _sanitize_filename(auto) or "sprite"

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


def request_sprite_name(
    img: Image.Image,
    user_context: str = "",
    existing_names: Optional[List[str]] = None,
    timeout: int = 30,
    max_retries: int = 5,
    url: str = NETLIFY_AI_NAME_URL,
) -> NameResult:
    """
    スプライト画像を Netlify 経由で Gemini に送信し、命名結果を返す。
    ネットワーク/パース失敗時も NameResult を返す (error フィールドに詳細)。

    レート制限 (429) に対しては Gemini が返す "retry in Xs" を優先して尊重し、
    それがない場合は指数バックオフ (5s, 10s, 20s, 40s, 60s) する。
    """
    existing_names = existing_names or []
    existing_block = "\n".join(f"  - {n}" for n in existing_names[:50]) or "  (なし)"
    prompt = SPRITE_NAMING_PROMPT.format(
        user_context=(user_context or "").strip() or "(指定なし)",
        existing_names_block=existing_block,
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

    backoff_schedule = [5, 10, 20, 40, 60]  # seconds per attempt on 429/503

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

        if status in (503, 429) and attempt < max_retries:
            # Prefer Gemini's suggested retry_after, else fall back to schedule
            retry_after = _parse_retry_after_seconds(body)
            if retry_after is not None:
                wait_s = max(retry_after + 1.0, 3.0)
            else:
                wait_s = backoff_schedule[min(attempt - 1, len(backoff_schedule) - 1)]
            time.sleep(wait_s)
            continue

        # Non-retryable status or max retries exceeded
        last_error = f"HTTP {status}: {body[:200]}"
        break

    fail = NameResult()
    fail.error = last_error or f"HTTP {last_status} {last_body[:200]}"
    fail.raw_text = last_body
    return fail
