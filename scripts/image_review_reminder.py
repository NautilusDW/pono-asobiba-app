#!/usr/bin/env python3
"""image_review_reminder.py - 画像レビュー必須リマインダー (UserPromptSubmit hook)

このプロジェクト (pono-asobiba-app) は PNG 等の画像のやり取りが中心。
Claude Code がテキスト/ファイル名/メタデータだけで画像に関する判断をしてしまう
エラーを防ぐため、ユーザーメッセージに画像関連キーワードまたは attachment が
含まれる場合に system-reminder を JSON で注入する。

仕様:
  - stdin: UserPromptSubmit hook の payload (JSON)
  - 画像関連 (IMAGE_NOUNS hit / attachment hit) があれば
    { "hookSpecificOutput": { "hookEventName": "UserPromptSubmit",
                              "additionalContext": "..." } }
    を stdout に出力する (既存 autonomous-trigger.py / skill-suggester.py と同形式)
  - JUDGE_VERBS のみで IMAGE_NOUNS が無い場合は誤検出を避けるため何も出力しない
  - 一致しなければ何も出力しない (transparent pass-through)
  - 例外は握り潰してユーザー体験を壊さない
"""
from __future__ import annotations

import json
import sys

# Windows コンソールは既定 cp932 で日本語 print が UnicodeEncodeError を投げる
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# 画像名詞 (これだけで trigger 可)
IMAGE_NOUNS = [
    "画像", "イメージ", "image", "picture", "photo",
    "PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG",
    "絵", "写真", "イラスト", "アイコン", "icon",
    "サムネ", "thumbnail", "スクショ", "スクリーンショット", "screenshot",
    "アセット", "asset", "スプライト", "sprite", "キャラ", "character",
    "背景", "background", "バナー", "banner", "ファビコン", "favicon",
    "差し替え", "差替え", "差替", "プレビュー", "preview", "フレーム",
    "素材",
]

# 判断動詞 (画像名詞と co-occur したときだけ trigger)
# 注: 現状ロジックでは画像名詞が hit すれば即 trigger するため
#     judge verbs の単独 hit はスキップされる。誤検出 (例: 「コミット確認」
#     「コードレビュー」「パフォーマンス比較」) を避けるためのバケット分離。
JUDGE_VERBS = [
    "確認", "判断", "レビュー", "review", "比較", "compare",
    "見て", "どう?", "どう？", "これって", "これは",
    "合ってる", "あってる", "おかしい", "どっち",
]


def _contains_any(text: str, words: list[str]) -> bool:
    if not text:
        return False
    lowered = text.lower()
    for kw in words:
        if kw.lower() in lowered:
            return True
    return False


def _has_image_noun(text: str) -> bool:
    return _contains_any(text, IMAGE_NOUNS)


def _has_judge_verb(text: str) -> bool:
    return _contains_any(text, JUDGE_VERBS)


def _has_image_attachment(payload: dict) -> bool:
    # 直接 attachments
    attachments = payload.get("attachments")
    if isinstance(attachments, list):
        for a in attachments:
            if isinstance(a, dict):
                t = str(a.get("type", "")).lower()
                if "image" in t or "png" in t or "jpg" in t or "jpeg" in t:
                    return True
                # type 不明でも path/url が画像拡張子なら ON
                for key in ("path", "url", "file_path", "name"):
                    v = str(a.get(key, "")).lower()
                    if v.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")):
                        return True
    # message 配下にある可能性 (念のため)
    msg = payload.get("message")
    if isinstance(msg, dict):
        if _has_image_attachment(msg):
            return True
    return False


REMINDER = (
    "<system-reminder>\n"
    "## 画像レビュー必須\n"
    "\n"
    "このプロジェクト (pono-asobiba-app) は画像中心です。"
    "画像に関する判断を行う前に、必ず Read tool で実物を visually view してください。"
    "テキスト/ファイル名/メタデータだけでの判断は禁止。\n"
    "</system-reminder>"
)


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return 0
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            return 0

        # prompt フィールドの抽出 (Claude Code 仕様: prompt または user_message)
        prompt = ""
        for key in ("prompt", "user_message", "message", "text"):
            v = payload.get(key)
            if isinstance(v, str):
                prompt = v
                break
            if isinstance(v, dict):
                inner = v.get("content") or v.get("text") or ""
                if isinstance(inner, str):
                    prompt = inner
                    break

        noun_hit = _has_image_noun(prompt)
        attach_hit = _has_image_attachment(payload)

        # 画像名詞 hit OR attachment hit のみで trigger。
        # judge verbs 単独 (画像名詞無し) は誤検出回避のためスキップ。
        if not (noun_hit or attach_hit):
            return 0

        output = {
            "hookSpecificOutput": {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": REMINDER,
            }
        }
        print(json.dumps(output, ensure_ascii=False))
    except Exception:
        # 例外はユーザー体験を壊さないため握り潰す
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
