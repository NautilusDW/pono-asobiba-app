"""
presets.py
Clean Edges Studio のパラメータプリセット保存/読込モジュール。

ファイル: scripts/Photoshop_script/clean_edges_presets.json
形式:
{
  "default": "Standard",
  "presets": {
    "Standard": {
      "mode": "auto-fake-bg",
      "border_tol": 32,
      "gray_tol": 18,
      "feather": 1.5,
      "blur": 0.5,
      "shrink": 0,
      "rembg_model": "isnet-general-use",
      "matting": true,
      "split_min_size": 20,
      "split_padding": 4,
      "split_alpha": 10,
      "split_flip_b": false
    },
    ...
  }
}
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


_HERE = Path(__file__).resolve().parent
PRESETS_PATH = _HERE / "clean_edges_presets.json"


# Built-in presets shipped on first launch
BUILTIN_PRESETS: Dict[str, Dict[str, Any]] = {
    "Standard": {
        "mode": "auto-fake-bg",
        "border_tol": 32,
        "gray_tol": 18,
        "feather": 1.5,
        "blur": 0.5,
        "shrink": 0,
        "rembg_model": "isnet-general-use",
        "matting": True,
        "split_min_size": 20,
        "split_padding": 4,
        "split_alpha": 10,
        "split_flip_b": False,
        "bg_mode": "Checker",
    },
    "Sharp edges": {
        "mode": "auto-fake-bg",
        "border_tol": 24,
        "gray_tol": 12,
        "feather": 0.5,
        "blur": 0.0,
        "shrink": 1,
        "rembg_model": "isnet-general-use",
        "matting": True,
        "split_min_size": 20,
        "split_padding": 4,
        "split_alpha": 10,
        "split_flip_b": False,
        "bg_mode": "Checker",
    },
    "Soft fringe-free": {
        "mode": "auto-fake-bg",
        "border_tol": 40,
        "gray_tol": 22,
        "feather": 3.0,
        "blur": 1.0,
        "shrink": 2,
        "rembg_model": "isnet-general-use",
        "matting": True,
        "split_min_size": 20,
        "split_padding": 4,
        "split_alpha": 10,
        "split_flip_b": False,
        "bg_mode": "Checker",
    },
    "rembg AI": {
        "mode": "rembg",
        "border_tol": 32,
        "gray_tol": 18,
        "feather": 1.5,
        "blur": 0.6,
        "shrink": 0,
        "rembg_model": "isnet-general-use",
        "matting": True,
        "split_min_size": 20,
        "split_padding": 4,
        "split_alpha": 10,
        "split_flip_b": False,
        "bg_mode": "Checker",
    },
}


def _initial_data() -> Dict[str, Any]:
    return {
        "default": "Standard",
        "presets": {k: dict(v) for k, v in BUILTIN_PRESETS.items()},
    }


def load_presets() -> Dict[str, Any]:
    """
    Load presets JSON. On first run (or corrupt file) returns built-ins.
    Always returns a dict with keys 'default' (str) and 'presets' (dict).
    """
    if PRESETS_PATH.exists():
        try:
            data = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "presets" in data and isinstance(data["presets"], dict):
                # Merge built-ins for any missing names so the user always has them
                merged_presets = {k: dict(v) for k, v in BUILTIN_PRESETS.items()}
                merged_presets.update(data["presets"])
                return {
                    "default": data.get("default") or "Standard",
                    "presets": merged_presets,
                }
        except (json.JSONDecodeError, OSError, ValueError):
            pass
    return _initial_data()


def save_presets(data: Dict[str, Any]) -> None:
    """Persist presets dict to disk."""
    PRESETS_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def get_preset(data: Dict[str, Any], name: str) -> Dict[str, Any]:
    """Look up a single preset by name. Falls back to Standard if missing."""
    presets = data.get("presets", {})
    if name in presets:
        return dict(presets[name])
    if "Standard" in presets:
        return dict(presets["Standard"])
    return dict(BUILTIN_PRESETS["Standard"])


def upsert_preset(data: Dict[str, Any], name: str, values: Dict[str, Any]) -> None:
    """Add or replace a preset. Mutates `data`."""
    if "presets" not in data:
        data["presets"] = {}
    data["presets"][name] = dict(values)


def delete_preset(data: Dict[str, Any], name: str) -> bool:
    """
    Remove a preset. Returns True if removed.
    Refuses to delete the last remaining preset.
    """
    presets = data.get("presets", {})
    if name not in presets:
        return False
    if len(presets) <= 1:
        return False
    del presets[name]
    if data.get("default") == name:
        data["default"] = next(iter(presets))
    return True


def set_default(data: Dict[str, Any], name: str) -> None:
    """Mark a preset as the startup default."""
    if name in data.get("presets", {}):
        data["default"] = name
