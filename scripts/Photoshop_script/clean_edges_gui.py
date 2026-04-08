"""
clean_edges_gui.py
背景除去 → スプライト分割 → AI 命名 → 個別保存 までを一枚窓で完結させる
tkinter GUI。

主な機能:
- 左サイドバー 4 セクション (Input / Background Removal / Split / Export)
- 中央プレビュー: Notebook で "Compare" と "Sprites" を切り替え
- Compare タブ: 左右並びの原画像 / 結果、共有ズーム & パン
  - マウスホイール: カーソル位置を中心にズーム
  - 左ドラッグ: パン
  - ダブルクリック: Fit
  - ボタン / ショートカット: + - 0 1
- プレビュー背景色: Checker / 黒 / 白 / マゼンタ / 緑 / シアン / 赤 / カスタム
- Sprites タブ: 分割結果のサムネイルギャラリー
  - 各スプライトの選択 / 除外 / 個別リネーム / 個別保存
  - Gemini Vision (Netlify Function) による自動ファイル名生成
  - 画像から判別困難な属性はドロップダウンで手動選択
- rembg / auto-fake-bg 両モード対応、スライダーで調整

起動:
    python scripts/Photoshop_script/clean_edges_gui.py
    python scripts/Photoshop_script/clean_edges_gui.py path/to/image.png
"""

from __future__ import annotations

import concurrent.futures
import os
import subprocess
import sys
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import tkinter as tk
from tkinter import colorchooser, filedialog, messagebox, ttk

from PIL import Image, ImageTk

# Same-directory import
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from clean_edges import (  # noqa: E402
    _light_smooth,
    checker_composite,
    process_auto_fake_bg,
    process_rembg,
    smooth_alpha,
)
from sprite_splitter import SpriteInfo, extract_sprites, make_flipped_pair  # noqa: E402
from ai_namer import NameResult, request_sprite_name, _sanitize_filename  # noqa: E402
import presets as presets_mod  # noqa: E402


REMBG_MODELS = [
    "isnet-general-use",
    "u2net",
    "u2netp",
    "birefnet-general",
    "birefnet-general-lite",
    "isnet-anime",
    "u2net_human_seg",
    "birefnet-portrait",
]


# ============================================================================
# Theme
# ============================================================================

THEME = {
    "bg_main":     "#232327",
    "bg_panel":    "#2b2b30",
    "bg_canvas":   "#1a1a1d",
    "bg_input":    "#333338",
    "fg_main":     "#e6e6e8",
    "fg_muted":    "#9a9aa2",
    "accent":      "#4a9eff",
    "accent_hi":   "#6bb4ff",
    "warn":        "#ffb84a",
    "err":         "#ff6b6b",
    "ok":          "#4ade80",
    "border":      "#3a3a40",
}

FONT_BASE = ("Segoe UI", 10)
FONT_HEADING = ("Segoe UI", 10, "bold")
FONT_SMALL = ("Segoe UI", 9)


def _apply_theme(root: tk.Tk) -> None:
    """ttk.Style を設定して全体に暗色テーマを適用する。"""
    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except Exception:
        pass

    root.configure(bg=THEME["bg_main"])

    style.configure(".",
                    background=THEME["bg_main"],
                    foreground=THEME["fg_main"],
                    fieldbackground=THEME["bg_input"],
                    bordercolor=THEME["border"],
                    lightcolor=THEME["border"],
                    darkcolor=THEME["border"],
                    troughcolor=THEME["bg_input"],
                    font=FONT_BASE)

    style.configure("TFrame", background=THEME["bg_main"])
    style.configure("Panel.TFrame", background=THEME["bg_panel"])

    style.configure("TLabel", background=THEME["bg_main"], foreground=THEME["fg_main"])
    style.configure("Panel.TLabel", background=THEME["bg_panel"], foreground=THEME["fg_main"])
    style.configure("Muted.TLabel", background=THEME["bg_panel"], foreground=THEME["fg_muted"], font=FONT_SMALL)
    style.configure("Heading.TLabel", background=THEME["bg_panel"], foreground=THEME["fg_main"], font=FONT_HEADING)
    style.configure("Status.TLabel", background=THEME["bg_panel"], foreground=THEME["fg_muted"], font=FONT_SMALL, padding=(8, 3))

    style.configure("TLabelframe", background=THEME["bg_panel"], foreground=THEME["fg_main"], bordercolor=THEME["border"], relief="flat")
    style.configure("TLabelframe.Label", background=THEME["bg_panel"], foreground=THEME["accent"], font=FONT_HEADING)

    style.configure("TButton",
                    background=THEME["bg_input"],
                    foreground=THEME["fg_main"],
                    bordercolor=THEME["border"],
                    focusthickness=0,
                    padding=(10, 6),
                    relief="flat")
    style.map("TButton",
              background=[("active", THEME["border"]), ("pressed", THEME["border"])],
              foreground=[("disabled", THEME["fg_muted"])])

    style.configure("Accent.TButton",
                    background=THEME["accent"],
                    foreground="#ffffff",
                    padding=(12, 7),
                    font=FONT_HEADING,
                    relief="flat")
    style.map("Accent.TButton",
              background=[("active", THEME["accent_hi"]), ("pressed", THEME["accent_hi"])])

    style.configure("Toolbar.TButton", padding=(8, 4), font=FONT_SMALL)

    style.configure("TCheckbutton", background=THEME["bg_panel"], foreground=THEME["fg_main"], focuscolor=THEME["bg_panel"])
    style.map("TCheckbutton",
              background=[("active", THEME["bg_panel"])],
              foreground=[("disabled", THEME["fg_muted"])])

    style.configure("TRadiobutton", background=THEME["bg_panel"], foreground=THEME["fg_main"], focuscolor=THEME["bg_panel"])
    style.map("TRadiobutton", background=[("active", THEME["bg_panel"])])

    style.configure("TCombobox",
                    fieldbackground=THEME["bg_input"],
                    background=THEME["bg_input"],
                    foreground=THEME["fg_main"],
                    arrowcolor=THEME["fg_main"],
                    bordercolor=THEME["border"])
    root.option_add("*TCombobox*Listbox*Background", THEME["bg_input"])
    root.option_add("*TCombobox*Listbox*Foreground", THEME["fg_main"])
    root.option_add("*TCombobox*Listbox*selectBackground", THEME["accent"])

    style.configure("Horizontal.TScale", background=THEME["bg_panel"], troughcolor=THEME["bg_input"])

    style.configure("TNotebook", background=THEME["bg_main"], borderwidth=0, tabmargins=(2, 4, 2, 0))
    style.configure("TNotebook.Tab",
                    background=THEME["bg_panel"],
                    foreground=THEME["fg_muted"],
                    padding=(14, 6),
                    font=FONT_BASE)
    style.map("TNotebook.Tab",
              background=[("selected", THEME["bg_canvas"])],
              foreground=[("selected", THEME["accent"])])

    style.configure("TEntry",
                    fieldbackground=THEME["bg_input"],
                    foreground=THEME["fg_main"],
                    bordercolor=THEME["border"],
                    insertcolor=THEME["fg_main"])


# ============================================================================
# Data classes
# ============================================================================


@dataclass
class SpriteItem:
    """1 スプライトの GUI 管理用オブジェクト。"""

    info: SpriteInfo
    name_result: Optional[NameResult] = None
    manual_filename: str = ""
    selected: bool = True
    thumb_photo: Optional[ImageTk.PhotoImage] = field(default=None, repr=False)
    card_frame: Optional[tk.Frame] = field(default=None, repr=False)
    check_var: Optional[tk.BooleanVar] = field(default=None, repr=False)
    name_label: Optional[tk.Label] = field(default=None, repr=False)
    status_label: Optional[tk.Label] = field(default=None, repr=False)

    @property
    def effective_filename(self) -> str:
        """ユーザー編集 > AI 結果 > フォールバックの順に返す。"""
        if self.manual_filename:
            return self.manual_filename
        if self.name_result and self.name_result.filename:
            return self.name_result.filename
        return f"sprite_{self.info.index:03d}"

    @property
    def display_name(self) -> str:
        if self.name_result and self.name_result.base_name:
            parts = [self.name_result.base_name]
            if self.name_result.variant:
                parts.append(self.name_result.variant)
            if self.name_result.motion:
                parts.append(self.name_result.motion)
            return "  ".join(parts)
        return f"#{self.info.index}"

    def rebuild_filename_from_parts(self) -> None:
        """base_name + variant + motion から filename を再生成して name_result に反映。"""
        if self.name_result is None:
            self.name_result = NameResult()
        parts = [self.name_result.base_name, self.name_result.variant, self.name_result.motion]
        combined = "_".join(p for p in parts if p)
        fn = _sanitize_filename(combined) or f"sprite_{self.info.index:03d}"
        self.name_result.filename = fn
        self.manual_filename = fn


# ============================================================================
# Variant Picker Dialog
# ============================================================================


class VariantPickerDialog(tk.Toplevel):
    """
    スプライトの命名を編集するダイアログ。
    3 フィールド (Species / Expression / Motion) + 一括適用チェックボックス。
    """

    def __init__(
        self,
        parent: tk.Tk,
        sprite: SpriteItem,
        all_sprites: List["SpriteItem"],
        known_base_names: List[str],
        known_variants: List[str],
        known_motions: List[str],
    ):
        super().__init__(parent)
        self.title(f"Edit sprite  #{sprite.info.index}")
        self.configure(bg=THEME["bg_panel"])
        self.transient(parent)
        self.grab_set()
        self.result_applied = False
        self.bulk_apply_species = False  # set True if user checks the box
        self.original_base_name = (sprite.name_result.base_name if sprite.name_result else "")

        self._sprite = sprite
        self._all_sprites = all_sprites
        self._known_base_names = sorted(set(n for n in known_base_names if n))
        self._known_variants = sorted(set(v for v in known_variants if v))
        self._known_motions = sorted(set(m for m in known_motions if m))

        self._build_ui()

        self.update_idletasks()
        px = parent.winfo_rootx() + parent.winfo_width() // 2 - self.winfo_width() // 2
        py = parent.winfo_rooty() + parent.winfo_height() // 2 - self.winfo_height() // 2
        self.geometry(f"+{max(0, px)}+{max(0, py)}")

    def _build_ui(self):
        s = self._sprite

        # --- Thumbnail ---
        thumb = s.info.image.copy()
        thumb.thumbnail((220, 220), Image.LANCZOS)
        bg = checker_composite(thumb)
        self._photo = ImageTk.PhotoImage(bg)
        tk.Label(self, image=self._photo, bg=THEME["bg_panel"]).pack(padx=16, pady=(16, 8))

        # --- Form ---
        form = ttk.Frame(self, style="Panel.TFrame")
        form.pack(fill=tk.X, padx=16, pady=4)

        row = 0

        # 1. Species (base_name)
        ttk.Label(form, text="1. 種類 (Species)",
                  style="Heading.TLabel").grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 2))
        row += 1
        ttk.Label(form, text="例: 熱帯魚", style="Muted.TLabel").grid(row=row, column=0, columnspan=2, sticky="w")
        row += 1
        self.base_var = tk.StringVar(value=(s.name_result.base_name if s.name_result else ""))
        self.base_combo = ttk.Combobox(
            form, textvariable=self.base_var, values=self._known_base_names, width=36,
        )
        self.base_combo.grid(row=row, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        row += 1

        # 2. Expression (variant)
        ttk.Label(form, text="2. 表情 (Expression)",
                  style="Heading.TLabel").grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 2))
        row += 1
        ttk.Label(form, text="例: 通常 / 笑顔 / 驚き / 困惑",
                  style="Muted.TLabel").grid(row=row, column=0, columnspan=2, sticky="w")
        row += 1
        self.variant_var = tk.StringVar(value=(s.name_result.variant if s.name_result else ""))
        # Combine AI candidates with known vocab from other sprites
        ai_candidates = s.name_result.variant_candidates if s.name_result else []
        variant_choices = sorted(set(list(ai_candidates) + self._known_variants + [
            "通常", "笑顔", "驚き", "困惑", "怒り", "悲しみ", "ウィンク"
        ]))
        self.variant_combo = ttk.Combobox(
            form, textvariable=self.variant_var, values=variant_choices, width=36,
        )
        self.variant_combo.grid(row=row, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        row += 1

        # 3. Motion
        ttk.Label(form, text="3. 動き (Motion)",
                  style="Heading.TLabel").grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 2))
        row += 1
        ttk.Label(form, text="例: 静止 / 歩行1 / 歩行2 / ジャンプ (該当なければ空欄)",
                  style="Muted.TLabel").grid(row=row, column=0, columnspan=2, sticky="w")
        row += 1
        self.motion_var = tk.StringVar(value=(s.name_result.motion if s.name_result else ""))
        motion_choices = sorted(set(self._known_motions + [
            "", "静止", "歩行1", "歩行2", "ジャンプ", "待機", "攻撃"
        ]))
        self.motion_combo = ttk.Combobox(
            form, textvariable=self.motion_var, values=motion_choices, width=36,
        )
        self.motion_combo.grid(row=row, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        row += 1

        # 4. Filename (auto-generated, user-editable)
        ttk.Label(form, text="4. ファイル名 (Filename)",
                  style="Heading.TLabel").grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 2))
        row += 1
        self.filename_var = tk.StringVar(value=s.effective_filename)
        fn_row = ttk.Frame(form, style="Panel.TFrame")
        fn_row.grid(row=row, column=0, columnspan=2, sticky="ew", pady=(2, 8))
        ttk.Entry(fn_row, textvariable=self.filename_var, width=28).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(fn_row, text="🔄 Auto", command=self._regenerate_filename,
                   style="Toolbar.TButton").pack(side=tk.LEFT, padx=(4, 0))
        row += 1

        # Auto-regenerate filename when any of the 3 fields changes
        self._auto_regenerate = True
        for var in (self.base_var, self.variant_var, self.motion_var):
            var.trace_add("write", self._on_field_change)

        # --- Bulk apply checkbox (only meaningful if base_name changes) ---
        self.bulk_var = tk.BooleanVar(value=False)
        matching_count = self._count_matching_species()
        if matching_count > 1:
            ttk.Checkbutton(
                form,
                text=f"☑ この種類 ({matching_count} 個) の base_name をまとめて更新",
                variable=self.bulk_var,
            ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(4, 4))
            row += 1

        form.columnconfigure(0, weight=1)
        form.columnconfigure(1, weight=1)

        # --- AI raw text (on error) ---
        if s.name_result and s.name_result.raw_text and s.name_result.error:
            raw_frame = ttk.LabelFrame(self, text=" AI error / raw response ")
            raw_frame.pack(fill=tk.X, padx=16, pady=(6, 0))
            text = tk.Text(raw_frame, height=4, wrap="word",
                           bg=THEME["bg_input"], fg=THEME["fg_muted"],
                           borderwidth=0, font=FONT_SMALL)
            err_msg = s.name_result.error or ""
            text.insert("1.0", f"{err_msg}\n\n{s.name_result.raw_text[:500]}")
            text.configure(state="disabled")
            text.pack(fill=tk.X, padx=4, pady=4)

        # --- Buttons ---
        btns = ttk.Frame(self, style="Panel.TFrame")
        btns.pack(fill=tk.X, padx=16, pady=(12, 16))
        ttk.Button(btns, text="Cancel", command=self._cancel).pack(side=tk.RIGHT, padx=(6, 0))
        ttk.Button(btns, text="Apply", command=self._apply, style="Accent.TButton").pack(side=tk.RIGHT)

        self.bind("<Return>", lambda e: self._apply())
        self.bind("<Escape>", lambda e: self._cancel())

    def _count_matching_species(self) -> int:
        """このスプライトと同じ base_name を持つ (自分を含む) 個数。"""
        if not self.original_base_name:
            return 0
        return sum(
            1 for s in self._all_sprites
            if s.name_result and s.name_result.base_name == self.original_base_name
        )

    def _on_field_change(self, *_):
        if self._auto_regenerate:
            self._regenerate_filename()

    def _regenerate_filename(self):
        base = self.base_var.get().strip()
        variant = self.variant_var.get().strip()
        motion = self.motion_var.get().strip()
        combined = "_".join(p for p in (base, variant, motion) if p)
        fn = _sanitize_filename(combined) or f"sprite_{self._sprite.info.index:03d}"
        self._auto_regenerate = False
        self.filename_var.set(fn)
        self._auto_regenerate = True

    def _apply(self):
        base = self.base_var.get().strip()
        variant = self.variant_var.get().strip()
        motion = self.motion_var.get().strip()
        filename = _sanitize_filename(self.filename_var.get())
        if not filename:
            filename = f"sprite_{self._sprite.info.index:03d}"

        if self._sprite.name_result is None:
            self._sprite.name_result = NameResult()
        self._sprite.name_result.base_name = base
        self._sprite.name_result.variant = variant
        self._sprite.name_result.motion = motion
        self._sprite.name_result.filename = filename
        self._sprite.name_result.needs_user_input = False
        self._sprite.name_result.error = None  # clear stale errors after manual edit
        self._sprite.manual_filename = filename

        self.bulk_apply_species = bool(self.bulk_var.get())
        self.result_applied = True
        self.destroy()

    def _cancel(self):
        self.destroy()


# ============================================================================
# Main GUI
# ============================================================================


class CleanEdgesGUI:
    def __init__(self, root: tk.Tk, initial_path: Optional[Path] = None):
        self.root = root
        self.root.title("Clean Edges Studio — background / split / AI naming")
        self.root.geometry("1680x980")
        self.root.minsize(1280, 780)

        _apply_theme(root)

        # -------- State --------
        self.input_path: Optional[Path] = None
        self.original_img: Optional[Image.Image] = None
        self.result_img: Optional[Image.Image] = None

        self._rembg_session = None
        self._rembg_session_model = None

        # Viewport (shared between left & right canvases)
        self.zoom = 1.0
        self.view_cx: Optional[float] = None
        self.view_cy: Optional[float] = None
        self._drag_state = None

        self._custom_bg_color = (128, 128, 128)
        self._resize_after = None
        self._debounce_id = None

        # Sprites
        self.sprites: List[SpriteItem] = []
        self._ai_executor: Optional[concurrent.futures.ThreadPoolExecutor] = None
        self._ai_generation = 0  # monotonic counter; stale callbacks are discarded

        # Presets (load from JSON, will be applied after _build_ui)
        self._presets_data = presets_mod.load_presets()
        self._suppress_preset_apply = False  # used to avoid recursive apply

        # -------- Build UI --------
        self._build_ui()

        # Apply default preset (after vars exist)
        default_name = self._presets_data.get("default", "Standard")
        self._apply_preset(default_name)

        if initial_path:
            self._load_image(Path(initial_path))

    # ==================================================================== UI

    def _build_ui(self):
        # Top toolbar
        self.toolbar = ttk.Frame(self.root, style="Panel.TFrame", padding=(12, 8))
        self.toolbar.pack(side=tk.TOP, fill=tk.X)
        self._build_toolbar(self.toolbar)

        # Status bar (at bottom) — more prominent: larger, with progressbar
        self.status_var = tk.StringVar(value="Ready. Open an image to begin.")
        status_frame = tk.Frame(self.root, bg=THEME["bg_panel"], height=32)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        status_frame.pack_propagate(False)

        self.status_icon_var = tk.StringVar(value="●")
        self.status_icon = tk.Label(
            status_frame, textvariable=self.status_icon_var,
            bg=THEME["bg_panel"], fg=THEME["ok"],
            font=("Segoe UI", 11, "bold"), padx=10,
        )
        self.status_icon.pack(side=tk.LEFT)

        self.status_label = tk.Label(
            status_frame, textvariable=self.status_var,
            bg=THEME["bg_panel"], fg=THEME["fg_main"],
            font=("Segoe UI", 10), anchor="w",
        )
        self.status_label.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.progress_bar = ttk.Progressbar(
            status_frame, mode="indeterminate", length=240,
        )
        # Packed/unpacked dynamically via _set_busy / _clear_busy

        self._busy = False

        # Main split: sidebar + preview area
        body = ttk.Frame(self.root)
        body.pack(fill=tk.BOTH, expand=True)

        # Sidebar (fixed width)
        self.sidebar_outer = ttk.Frame(body, style="Panel.TFrame", width=300)
        self.sidebar_outer.pack(side=tk.LEFT, fill=tk.Y, padx=(10, 5), pady=10)
        self.sidebar_outer.pack_propagate(False)

        # Scrollable sidebar interior
        self._build_sidebar(self.sidebar_outer)

        # Preview area (Notebook)
        preview_container = ttk.Frame(body)
        preview_container.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(5, 10), pady=10)
        self._build_preview_area(preview_container)

        self._update_mode()

    # -------- Toolbar --------
    def _build_toolbar(self, parent):
        ttk.Button(parent, text="Open Image...", command=self.on_open, style="Toolbar.TButton").pack(side=tk.LEFT)
        ttk.Button(parent, text="Process", command=self.on_process, style="Accent.TButton").pack(side=tk.LEFT, padx=(8, 4))
        ttk.Button(parent, text="Split Sprites", command=self.on_split_sprites, style="Toolbar.TButton").pack(side=tk.LEFT, padx=4)
        ttk.Button(parent, text="Save Result As...", command=self.on_save_result, style="Toolbar.TButton").pack(side=tk.LEFT, padx=4)

        # Zoom
        self.zoom_label = ttk.Label(parent, text="100%", width=6, anchor="e", style="Panel.TLabel")
        self.zoom_label.pack(side=tk.RIGHT, padx=(6, 4))
        ttk.Button(parent, text="Fit", width=4, command=self.on_zoom_fit, style="Toolbar.TButton").pack(side=tk.RIGHT, padx=1)
        ttk.Button(parent, text="1:1", width=4, command=self.on_zoom_100, style="Toolbar.TButton").pack(side=tk.RIGHT, padx=1)
        ttk.Button(parent, text="+", width=3, command=lambda: self.on_zoom_button(1.5), style="Toolbar.TButton").pack(side=tk.RIGHT, padx=1)
        ttk.Button(parent, text="−", width=3, command=lambda: self.on_zoom_button(1 / 1.5), style="Toolbar.TButton").pack(side=tk.RIGHT, padx=1)
        ttk.Label(parent, text="Zoom:", style="Panel.TLabel").pack(side=tk.RIGHT, padx=(16, 4))

    # -------- Sidebar --------
    def _build_sidebar(self, parent):
        # 0. Presets (top — affects everything below)
        sec_preset = ttk.LabelFrame(parent, text=" Preset ", padding=(10, 6))
        sec_preset.pack(fill=tk.X, padx=8, pady=(8, 4))

        self.preset_name_var = tk.StringVar(value=self._presets_data.get("default", "Standard"))
        self.preset_combo = ttk.Combobox(
            sec_preset, textvariable=self.preset_name_var,
            values=self._preset_names(), state="readonly",
        )
        self.preset_combo.pack(fill=tk.X, pady=(0, 4))
        self.preset_combo.bind("<<ComboboxSelected>>", self._on_preset_selected)

        btn_row = ttk.Frame(sec_preset, style="Panel.TFrame")
        btn_row.pack(fill=tk.X)
        ttk.Button(btn_row, text="💾 Save", command=self._on_preset_save_or_overwrite,
                   style="Toolbar.TButton", width=8).pack(side=tk.LEFT, padx=(0, 2))
        ttk.Button(btn_row, text="＋ New",  command=self._on_preset_save_as,
                   style="Toolbar.TButton", width=7).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_row, text="⭐ Default", command=self._on_preset_set_default,
                   style="Toolbar.TButton", width=9).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_row, text="🗑", command=self._on_preset_delete,
                   style="Toolbar.TButton", width=3).pack(side=tk.LEFT, padx=(2, 0))

        self.preset_default_label_var = tk.StringVar(value="")
        ttk.Label(sec_preset, textvariable=self.preset_default_label_var,
                  style="Muted.TLabel").pack(fill=tk.X, pady=(4, 0))
        self._refresh_preset_default_label()

        # 1. Input section
        sec_input = ttk.LabelFrame(parent, text=" 1. Input ", padding=(10, 6))
        sec_input.pack(fill=tk.X, padx=8, pady=(4, 4))
        self.input_path_var = tk.StringVar(value="(no file)")
        ttk.Label(sec_input, textvariable=self.input_path_var, style="Muted.TLabel", wraplength=260).pack(fill=tk.X)
        self.input_dim_var = tk.StringVar(value="")
        ttk.Label(sec_input, textvariable=self.input_dim_var, style="Muted.TLabel").pack(fill=tk.X, pady=(2, 0))

        # 2. Background removal section
        sec_bg = ttk.LabelFrame(parent, text=" 2. Background Removal ", padding=(10, 6))
        sec_bg.pack(fill=tk.X, padx=8, pady=4)

        self.mode_var = tk.StringVar(value="auto-fake-bg")
        ttk.Radiobutton(sec_bg, text="Auto Fake-BG (color)", variable=self.mode_var,
                        value="auto-fake-bg", command=self._update_mode).pack(anchor="w")
        ttk.Radiobutton(sec_bg, text="rembg (AI)", variable=self.mode_var,
                        value="rembg", command=self._update_mode).pack(anchor="w")

        ttk.Label(sec_bg, text="Model:", style="Panel.TLabel").pack(anchor="w", pady=(6, 0))
        self.model_var = tk.StringVar(value=REMBG_MODELS[0])
        self.model_combo = ttk.Combobox(sec_bg, textvariable=self.model_var, values=REMBG_MODELS,
                                        state="readonly")
        self.model_combo.pack(fill=tk.X, pady=(2, 2))

        self.matting_var = tk.BooleanVar(value=True)
        self.matting_chk = ttk.Checkbutton(sec_bg, text="alpha matting", variable=self.matting_var)
        self.matting_chk.pack(anchor="w", pady=(2, 6))

        # Sliders
        self.border_tol = tk.IntVar(value=32)
        self.gray_tol = tk.IntVar(value=18)
        self.feather_var = tk.DoubleVar(value=1.5)
        self.blur_var = tk.DoubleVar(value=0.5)
        self.shrink_var = tk.DoubleVar(value=0.0)

        self._slider_widgets = []  # for enable/disable
        self._slider_widgets.append(self._make_slider(sec_bg, "Border tol",   self.border_tol,  0, 100,  decimal=False, step=1))
        self._slider_widgets.append(self._make_slider(sec_bg, "Gray tol",     self.gray_tol,    0, 60,   decimal=False, step=1))
        self._slider_widgets.append(self._make_slider(sec_bg, "Edge feather", self.feather_var, 0, 10.0, decimal=True,  step=0.1))
        self._slider_widgets.append(self._make_slider(sec_bg, "Alpha shrink", self.shrink_var,  0, 8.0,  decimal=True,  step=0.1))
        self._slider_widgets.append(self._make_slider(sec_bg, "Alpha blur",   self.blur_var,    0, 5.0,  decimal=True,  step=0.1))

        self.auto_process_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(sec_bg, text="Auto-reprocess on slider change",
                        variable=self.auto_process_var).pack(anchor="w", pady=(4, 2))

        for v in (self.border_tol, self.gray_tol, self.feather_var, self.blur_var, self.shrink_var):
            v.trace_add("write", self._on_param_change)

        # 3. Split section
        sec_split = ttk.LabelFrame(parent, text=" 3. Split ", padding=(10, 6))
        sec_split.pack(fill=tk.X, padx=8, pady=4)

        self.split_min_size_var = tk.IntVar(value=20)
        self.split_padding_var = tk.IntVar(value=4)
        self.split_alpha_var = tk.IntVar(value=10)
        self.split_flip_b_var = tk.BooleanVar(value=False)

        for label, var, frm, to in (
            ("Min size (px)", self.split_min_size_var, 1, 200),
            ("Padding (px)", self.split_padding_var, 0, 40),
            ("Alpha threshold", self.split_alpha_var, 0, 250),
        ):
            row = ttk.Frame(sec_split, style="Panel.TFrame")
            row.pack(fill=tk.X, pady=1)
            ttk.Label(row, text=label, width=15, style="Panel.TLabel").pack(side=tk.LEFT)
            spin = tk.Spinbox(row, from_=frm, to=to, textvariable=var, width=6,
                              bg=THEME["bg_input"], fg=THEME["fg_main"],
                              buttonbackground=THEME["bg_input"],
                              insertbackground=THEME["fg_main"],
                              highlightthickness=0, relief="flat")
            spin.pack(side=tk.RIGHT)

        ttk.Checkbutton(sec_split, text="Also output A/B flipped pair",
                        variable=self.split_flip_b_var).pack(anchor="w", pady=(4, 2))
        ttk.Button(sec_split, text="Split Sprites →", command=self.on_split_sprites).pack(fill=tk.X, pady=(4, 2))

        # 4. Export section
        sec_export = ttk.LabelFrame(parent, text=" 4. Export ", padding=(10, 6))
        sec_export.pack(fill=tk.X, padx=8, pady=4)

        ttk.Label(sec_export, text="Output folder:", style="Panel.TLabel").pack(anchor="w")
        folder_row = ttk.Frame(sec_export, style="Panel.TFrame")
        folder_row.pack(fill=tk.X, pady=(2, 4))
        self.export_folder_var = tk.StringVar(value="")
        ttk.Entry(folder_row, textvariable=self.export_folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(folder_row, text="…", width=3, command=self.on_pick_folder, style="Toolbar.TButton").pack(side=tk.LEFT, padx=(4, 0))

        self.ai_enabled_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(sec_export, text="AI auto-naming (Gemini Vision)",
                        variable=self.ai_enabled_var).pack(anchor="w", pady=(2, 2))

        ttk.Label(sec_export, text="Context hint (ex: 隠れクマの実):", style="Panel.TLabel").pack(anchor="w", pady=(4, 0))
        self.ai_context_var = tk.StringVar(value="")
        ttk.Entry(sec_export, textvariable=self.ai_context_var).pack(fill=tk.X, pady=(2, 6))

        ttk.Button(sec_export, text="Name All with AI", command=self.on_name_all_ai,
                   style="Toolbar.TButton").pack(fill=tk.X, pady=2)
        ttk.Button(sec_export, text="Save Selected Sprites", command=self.on_save_selected_sprites,
                   style="Accent.TButton").pack(fill=tk.X, pady=(4, 2))

    def _make_slider(self, parent, label, var, mn, mx, decimal=False, step=None):
        """
        Create a row with: label + slider + spinbox.
        The spinbox lets the user click and type a precise value, and also
        provides up/down arrows. Slider and spinbox share the same Var,
        so changing one updates the other automatically.
        """
        row = ttk.Frame(parent, style="Panel.TFrame")
        row.pack(fill=tk.X, pady=1)
        ttk.Label(row, text=label, width=12, style="Panel.TLabel").pack(side=tk.LEFT)
        scale = ttk.Scale(row, variable=var, from_=mn, to=mx, orient=tk.HORIZONTAL)
        scale.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 4))

        if step is None:
            step = 0.1 if decimal else 1

        # Tk Spinbox only accepts float-style formats (%.Nf), not %d.
        # For integers we omit the format option entirely; tk will display
        # the IntVar value as-is without trailing zeros.
        spin_kwargs = dict(
            textvariable=var,
            from_=mn, to=mx, increment=step,
            width=6,
            bg=THEME["bg_input"], fg=THEME["fg_main"],
            buttonbackground=THEME["bg_input"],
            insertbackground=THEME["fg_main"],
            highlightthickness=1,
            highlightbackground=THEME["border"],
            highlightcolor=THEME["accent"],
            relief="flat",
            bd=0,
            justify="right",
        )
        if decimal:
            spin_kwargs["format"] = "%.2f"
        spin = tk.Spinbox(row, **spin_kwargs)
        spin.pack(side=tk.LEFT)
        # Return the slider for state-toggle (enable/disable). The spinbox
        # state is tracked separately because it's a tk widget (not ttk).
        scale._companion_spinbox = spin  # type: ignore[attr-defined]
        return scale

    def _update_mode(self):
        is_rembg = self.mode_var.get() == "rembg"
        self.model_combo.configure(state=("readonly" if is_rembg else "disabled"))
        if is_rembg:
            self.matting_chk.state(["!disabled"])
        else:
            self.matting_chk.state(["disabled"])
        # Slider indices (matches creation order):
        #   0=Border tol, 1=Gray tol, 2=Edge feather (auto-fake-bg only)
        #   3=Alpha shrink, 4=Alpha blur (apply to both modes)
        for i, scale in enumerate(self._slider_widgets):
            new_state = "disabled" if (is_rembg and i < 3) else "normal"
            scale.configure(state=new_state)
            spin = getattr(scale, "_companion_spinbox", None)
            if spin is not None:
                spin.configure(state=new_state)

    # -------- Preview area (Notebook) --------
    def _build_preview_area(self, parent):
        self.notebook = ttk.Notebook(parent)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # Compare tab
        self.compare_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.compare_tab, text="  Compare  ")
        self._build_compare_tab(self.compare_tab)

        # Sprites tab
        self.sprites_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.sprites_tab, text="  Sprites (0)  ")
        self._build_sprites_tab(self.sprites_tab)

    def _build_compare_tab(self, parent):
        # Top row: BG selector
        top = ttk.Frame(parent, style="Panel.TFrame", padding=(8, 6))
        top.pack(fill=tk.X)
        ttk.Label(top, text="Result Preview BG:", style="Panel.TLabel").pack(side=tk.LEFT)
        self.bg_mode_var = tk.StringVar(value="Checker")
        bg_combo = ttk.Combobox(
            top, textvariable=self.bg_mode_var,
            values=["Checker", "Black", "White", "Magenta", "Green", "Cyan", "Red", "Custom..."],
            width=12, state="readonly",
        )
        bg_combo.pack(side=tk.LEFT, padx=(6, 0))
        self.bg_mode_var.trace_add("write", self._on_bg_change)

        # Canvas split
        canvas_row = ttk.Frame(parent)
        canvas_row.pack(fill=tk.BOTH, expand=True, padx=6, pady=(0, 6))

        left_frame = ttk.LabelFrame(canvas_row, text=" Original ", padding=2)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 3))
        left_inner = tk.Frame(left_frame, bg=THEME["bg_canvas"])
        left_inner.pack(fill=tk.BOTH, expand=True)
        left_inner.pack_propagate(False)
        self.left_canvas = tk.Canvas(left_inner, bg=THEME["bg_canvas"], highlightthickness=0, bd=0)
        self.left_canvas.pack(fill=tk.BOTH, expand=True)

        right_frame = ttk.LabelFrame(canvas_row, text=" Result ", padding=2)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(3, 0))
        right_inner = tk.Frame(right_frame, bg=THEME["bg_canvas"])
        right_inner.pack(fill=tk.BOTH, expand=True)
        right_inner.pack_propagate(False)
        self.right_canvas = tk.Canvas(right_inner, bg=THEME["bg_canvas"], highlightthickness=0, bd=0)
        self.right_canvas.pack(fill=tk.BOTH, expand=True)

        # Bind events
        for cv in (self.left_canvas, self.right_canvas):
            cv.bind("<Configure>", lambda e: self._schedule_redraw())
            cv.bind("<MouseWheel>", self._on_wheel)
            cv.bind("<Button-4>", lambda e: self._on_wheel_linux(e, up=True))
            cv.bind("<Button-5>", lambda e: self._on_wheel_linux(e, up=False))
            cv.bind("<ButtonPress-1>", self._on_drag_start)
            cv.bind("<B1-Motion>", self._on_drag_move)
            cv.bind("<ButtonRelease-1>", self._on_drag_end)
            cv.bind("<Double-Button-1>", lambda e: self.on_zoom_fit())
            cv.configure(cursor="fleur")

        self.root.bind("<KeyPress-plus>", lambda e: self.on_zoom_button(1.5))
        self.root.bind("<KeyPress-equal>", lambda e: self.on_zoom_button(1.5))
        self.root.bind("<KeyPress-minus>", lambda e: self.on_zoom_button(1 / 1.5))
        self.root.bind("<KeyPress-0>", lambda e: self.on_zoom_fit())
        self.root.bind("<KeyPress-1>", lambda e: self.on_zoom_100())

    def _build_sprites_tab(self, parent):
        # Toolbar
        bar = ttk.Frame(parent, style="Panel.TFrame", padding=(8, 6))
        bar.pack(fill=tk.X)
        ttk.Button(bar, text="Select All", command=self._sprites_select_all, style="Toolbar.TButton").pack(side=tk.LEFT, padx=2)
        ttk.Button(bar, text="Deselect All", command=self._sprites_deselect_all, style="Toolbar.TButton").pack(side=tk.LEFT, padx=2)
        ttk.Button(bar, text="Name All with AI", command=self.on_name_all_ai, style="Toolbar.TButton").pack(side=tk.LEFT, padx=2)
        ttk.Button(bar, text="Save Selected", command=self.on_save_selected_sprites, style="Accent.TButton").pack(side=tk.LEFT, padx=2)

        self.sprites_summary_var = tk.StringVar(value="No sprites yet. Click [Split Sprites] first.")
        ttk.Label(bar, textvariable=self.sprites_summary_var, style="Muted.TLabel").pack(side=tk.RIGHT, padx=6)

        # Scrollable gallery
        gallery_wrap = tk.Frame(parent, bg=THEME["bg_main"])
        gallery_wrap.pack(fill=tk.BOTH, expand=True, padx=6, pady=(0, 6))

        self.sprites_canvas = tk.Canvas(gallery_wrap, bg=THEME["bg_canvas"], highlightthickness=0, bd=0)
        vs = ttk.Scrollbar(gallery_wrap, orient="vertical", command=self.sprites_canvas.yview)
        self.sprites_canvas.configure(yscrollcommand=vs.set)
        vs.pack(side=tk.RIGHT, fill=tk.Y)
        self.sprites_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.sprites_frame = tk.Frame(self.sprites_canvas, bg=THEME["bg_canvas"])
        self._sprites_window_id = self.sprites_canvas.create_window((0, 0), window=self.sprites_frame, anchor="nw")

        def _on_frame_configure(_e):
            self.sprites_canvas.configure(scrollregion=self.sprites_canvas.bbox("all"))

        def _on_canvas_configure(e):
            self.sprites_canvas.itemconfigure(self._sprites_window_id, width=e.width)
            self._relayout_sprite_cards()

        self.sprites_frame.bind("<Configure>", _on_frame_configure)
        self.sprites_canvas.bind("<Configure>", _on_canvas_configure)

        # Mouse wheel scroll in gallery
        def _on_wheel(e):
            self.sprites_canvas.yview_scroll(-1 if e.delta > 0 else 1, "units")
        self.sprites_canvas.bind("<MouseWheel>", _on_wheel)
        self.sprites_frame.bind("<MouseWheel>", _on_wheel)

    # ==================================================================== Presets

    def _preset_names(self) -> List[str]:
        return sorted(self._presets_data.get("presets", {}).keys())

    def _refresh_preset_combo(self):
        names = self._preset_names()
        self.preset_combo.configure(values=names)
        if self.preset_name_var.get() not in names and names:
            self.preset_name_var.set(names[0])
        self._refresh_preset_default_label()

    def _refresh_preset_default_label(self):
        default = self._presets_data.get("default", "Standard")
        current = self.preset_name_var.get()
        if current == default:
            self.preset_default_label_var.set(f"⭐ '{default}' is the startup default")
        else:
            self.preset_default_label_var.set(f"(startup default: ⭐ {default})")

    def _current_settings_dict(self) -> dict:
        return {
            "mode": self.mode_var.get(),
            "border_tol": int(self.border_tol.get()),
            "gray_tol": int(self.gray_tol.get()),
            "feather": float(self.feather_var.get()),
            "blur": float(self.blur_var.get()),
            "shrink": float(self.shrink_var.get()),
            "rembg_model": self.model_var.get(),
            "matting": bool(self.matting_var.get()),
            "split_min_size": int(self.split_min_size_var.get()),
            "split_padding": int(self.split_padding_var.get()),
            "split_alpha": int(self.split_alpha_var.get()),
            "split_flip_b": bool(self.split_flip_b_var.get()),
            "bg_mode": (self.bg_mode_var.get() if hasattr(self, "bg_mode_var") else "Checker"),
            "bg_custom_color": list(self._custom_bg_color),
        }

    def _apply_preset(self, name: str):
        """Load a preset's values into all the GUI Vars."""
        p = presets_mod.get_preset(self._presets_data, name)
        self._suppress_preset_apply = True
        try:
            self.mode_var.set(p.get("mode", "auto-fake-bg"))
            self.border_tol.set(int(p.get("border_tol", 32)))
            self.gray_tol.set(int(p.get("gray_tol", 18)))
            self.feather_var.set(float(p.get("feather", 1.5)))
            self.blur_var.set(float(p.get("blur", 0.5)))
            self.shrink_var.set(float(p.get("shrink", 0.0)))
            self.model_var.set(p.get("rembg_model", "isnet-general-use"))
            self.matting_var.set(bool(p.get("matting", True)))
            self.split_min_size_var.set(int(p.get("split_min_size", 20)))
            self.split_padding_var.set(int(p.get("split_padding", 4)))
            self.split_alpha_var.set(int(p.get("split_alpha", 10)))
            self.split_flip_b_var.set(bool(p.get("split_flip_b", False)))
            # Restore custom color BEFORE setting bg_mode so that when bg_mode_var
            # trace fires, it sees the right color.
            custom = p.get("bg_custom_color")
            if isinstance(custom, (list, tuple)) and len(custom) == 3:
                try:
                    self._custom_bg_color = (int(custom[0]), int(custom[1]), int(custom[2]))
                except (TypeError, ValueError):
                    pass
            if hasattr(self, "bg_mode_var"):
                self.bg_mode_var.set(p.get("bg_mode", "Checker"))
        finally:
            self._suppress_preset_apply = False
        self._update_mode()
        self._refresh_preset_default_label()
        # Reprocess if image is loaded
        if self.original_img is not None:
            self.on_process()

    def _on_preset_selected(self, _event=None):
        if self._suppress_preset_apply:
            return
        name = self.preset_name_var.get()
        self._apply_preset(name)
        self.status_var.set(f"Applied preset: {name}")

    def _on_preset_save_or_overwrite(self):
        """Save current values into the currently selected preset (overwrite)."""
        name = self.preset_name_var.get()
        if not name:
            return
        if not messagebox.askyesno(
            "Overwrite preset",
            f"Save current settings into preset '{name}'? "
            "This will overwrite the existing values.",
        ):
            return
        presets_mod.upsert_preset(self._presets_data, name, self._current_settings_dict())
        try:
            presets_mod.save_presets(self._presets_data)
            self.status_var.set(f"Saved preset: {name}")
        except Exception as e:
            messagebox.showerror("Save failed", str(e))

    def _on_preset_save_as(self):
        """Save current values as a NEW preset (prompts for name)."""
        from tkinter import simpledialog
        name = simpledialog.askstring(
            "New preset",
            "Preset name:",
            parent=self.root,
        )
        if not name:
            return
        name = name.strip()
        if not name:
            return
        if name in self._presets_data.get("presets", {}):
            if not messagebox.askyesno(
                "Overwrite",
                f"Preset '{name}' already exists. Overwrite?",
            ):
                return
        presets_mod.upsert_preset(self._presets_data, name, self._current_settings_dict())
        try:
            presets_mod.save_presets(self._presets_data)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return
        self._suppress_preset_apply = True
        self.preset_name_var.set(name)
        self._suppress_preset_apply = False
        self._refresh_preset_combo()
        self.status_var.set(f"Created preset: {name}")

    def _on_preset_set_default(self):
        name = self.preset_name_var.get()
        if not name:
            return
        presets_mod.set_default(self._presets_data, name)
        try:
            presets_mod.save_presets(self._presets_data)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return
        self._refresh_preset_default_label()
        self.status_var.set(f"'{name}' is now the startup default")

    def _on_preset_delete(self):
        name = self.preset_name_var.get()
        if not name:
            return
        if not messagebox.askyesno(
            "Delete preset",
            f"Delete preset '{name}'?",
        ):
            return
        if not presets_mod.delete_preset(self._presets_data, name):
            messagebox.showinfo("Cannot delete", "Cannot delete the last remaining preset.")
            return
        try:
            presets_mod.save_presets(self._presets_data)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return
        self._refresh_preset_combo()
        self.status_var.set(f"Deleted preset: {name}")

    # ==================================================================== Busy state

    def _set_busy(self, message: str, determinate_max: Optional[int] = None, icon_color: str = None):
        """
        Enter busy state: show progressbar + status icon goes yellow.
        If determinate_max given, progressbar shows value/max; else indeterminate.
        """
        self._busy = True
        self.status_var.set(message)
        self.status_icon.config(fg=icon_color or THEME["warn"])
        self.status_icon_var.set("⏳")
        self.status_label.config(fg=THEME["warn"])

        try:
            self.progress_bar.stop()
        except Exception:
            pass

        if determinate_max is not None and determinate_max > 0:
            self.progress_bar.configure(mode="determinate", maximum=determinate_max, value=0)
        else:
            self.progress_bar.configure(mode="indeterminate")
            self.progress_bar.start(12)

        # Pack if not already packed
        if not self.progress_bar.winfo_ismapped():
            self.progress_bar.pack(side=tk.RIGHT, padx=10, pady=6)

        self.root.update_idletasks()

    def _set_progress(self, value: int, message: Optional[str] = None):
        """Update determinate progress (and optionally status text)."""
        if message:
            self.status_var.set(message)
        try:
            self.progress_bar["value"] = value
        except Exception:
            pass
        self.root.update_idletasks()

    def _clear_busy(self, final_message: str = "Ready.", icon_color: str = None):
        """Exit busy state: hide progressbar + status icon goes green (or given color)."""
        self._busy = False
        try:
            self.progress_bar.stop()
        except Exception:
            pass
        if self.progress_bar.winfo_ismapped():
            self.progress_bar.pack_forget()

        self.status_icon.config(fg=icon_color or THEME["ok"])
        self.status_icon_var.set("●")
        self.status_label.config(fg=THEME["fg_main"])
        self.status_var.set(final_message)
        self.root.update_idletasks()

    # ==================================================================== File ops

    def on_open(self):
        path = filedialog.askopenfilename(
            title="Select image",
            filetypes=[
                ("Images", "*.png *.jpg *.jpeg *.webp *.bmp *.tiff *.tif"),
                ("All files", "*.*"),
            ],
        )
        if path:
            self._load_image(Path(path))

    def _load_image(self, path: Path):
        try:
            img = Image.open(path).convert("RGBA")
        except Exception as e:
            messagebox.showerror("Open failed", f"Could not open image:\n{e}")
            return
        self.input_path = path
        self.original_img = img
        self.result_img = None
        self._clear_sprites()
        self.input_path_var.set(path.name)
        self.input_dim_var.set(f"{img.width} × {img.height} px")
        if not self.export_folder_var.get():
            self.export_folder_var.set(str(path.parent / "sprites"))
        self.status_var.set(f"Loaded: {path.name}")
        self._refresh_previews()
        if self.mode_var.get() == "auto-fake-bg":
            self.on_process()

    def on_pick_folder(self):
        initial = self.export_folder_var.get() or (str(self.input_path.parent) if self.input_path else ".")
        folder = filedialog.askdirectory(title="Select output folder", initialdir=initial)
        if folder:
            self.export_folder_var.set(folder)

    def on_save_result(self):
        if self.result_img is None:
            messagebox.showwarning("No result", "Process an image first.")
            return
        default = (self.input_path.stem + "_clean.png") if self.input_path else "clean.png"
        initial_dir = str(self.input_path.parent) if self.input_path else "."
        path = filedialog.asksaveasfilename(
            title="Save result",
            defaultextension=".png",
            initialdir=initial_dir,
            initialfile=default,
            filetypes=[("PNG", "*.png")],
        )
        if not path:
            return
        try:
            self.result_img.save(path, "PNG")
            self.status_var.set(f"Saved: {path}")
        except Exception as e:
            messagebox.showerror("Save failed", str(e))

    # ==================================================================== Process

    def on_process(self):
        if self.original_img is None:
            self.status_var.set("Open an image first.")
            return

        mode = self.mode_var.get()
        self._set_busy(f"Processing [{mode}]... (this may take a few seconds)")

        try:
            shrink_px = int(self.shrink_var.get())
            if mode == "auto-fake-bg":
                cut = process_auto_fake_bg(
                    self.original_img,
                    border_tolerance=int(self.border_tol.get()),
                    gray_tolerance=int(self.gray_tol.get()),
                    feather=float(self.feather_var.get()),
                )
                if self.blur_var.get() > 0 or shrink_px > 0:
                    cut = _light_smooth(
                        cut,
                        blur_radius=float(self.blur_var.get()),
                        shrink_px=shrink_px,
                    )
            else:
                self._ensure_session()
                cut = process_rembg(self.original_img, session=self._rembg_session,
                                    use_matting=bool(self.matting_var.get()))
                cut = smooth_alpha(
                    cut,
                    blur_radius=float(self.blur_var.get()),
                    shrink_px=shrink_px,
                )

            self.result_img = cut
            self._refresh_previews()
            self._clear_busy(f"Done [{mode}]. Ready to split or save.")
        except Exception as e:
            traceback.print_exc()
            self._clear_busy(f"Error: {e}", icon_color=THEME["err"])
            messagebox.showerror("Processing failed", str(e))

    def _ensure_session(self):
        model = self.model_var.get()
        if self._rembg_session is not None and self._rembg_session_model == model:
            return
        try:
            from rembg import new_session
        except ImportError:
            raise RuntimeError("rembg is not installed. Run: pip install rembg onnxruntime")
        self.status_var.set(f"Loading rembg model: {model} (first use may download)...")
        self.root.update_idletasks()
        self._rembg_session = new_session(model)
        self._rembg_session_model = model

    def _on_param_change(self, *_):
        if (self.auto_process_var.get()
                and self.original_img is not None
                and self.mode_var.get() == "auto-fake-bg"):
            if self._debounce_id:
                try:
                    self.root.after_cancel(self._debounce_id)
                except Exception:
                    pass
            self._debounce_id = self.root.after(200, self.on_process)

    # ==================================================================== Sprites

    def on_split_sprites(self):
        if self.result_img is None:
            if self.original_img is None:
                messagebox.showwarning("No image", "Open and process an image first.")
                return
            # auto-process on the fly
            self.on_process()
            if self.result_img is None:
                return

        self._set_busy("Splitting sprites... (scanning connected components)")
        try:
            infos = extract_sprites(
                self.result_img,
                min_size=int(self.split_min_size_var.get()),
                padding=int(self.split_padding_var.get()),
                alpha_threshold=int(self.split_alpha_var.get()),
            )
        except Exception as e:
            traceback.print_exc()
            self._clear_busy(f"Split error: {e}", icon_color=THEME["err"])
            messagebox.showerror("Split failed", str(e))
            return

        self._clear_sprites()
        for info in infos:
            self.sprites.append(SpriteItem(info=info))
        self._rebuild_sprite_cards()
        self.notebook.select(self.sprites_tab)
        self.sprites_summary_var.set(f"{len(self.sprites)} sprites")
        tab_index = self.notebook.index(self.sprites_tab)
        self.notebook.tab(tab_index, text=f"  Sprites ({len(self.sprites)})  ")
        self._clear_busy(f"Split complete: {len(self.sprites)} sprite(s) found. Click [Name All with AI] next.")

    def _clear_sprites(self):
        for s in self.sprites:
            if s.card_frame is not None:
                s.card_frame.destroy()
        self.sprites = []
        if hasattr(self, "sprites_frame"):
            for child in self.sprites_frame.winfo_children():
                child.destroy()
        if hasattr(self, "sprites_summary_var"):
            self.sprites_summary_var.set("No sprites yet. Click [Split Sprites] first.")
        if hasattr(self, "notebook") and hasattr(self, "sprites_tab"):
            try:
                tab_index = self.notebook.index(self.sprites_tab)
                self.notebook.tab(tab_index, text="  Sprites (0)  ")
            except Exception:
                pass

    def _rebuild_sprite_cards(self):
        for child in self.sprites_frame.winfo_children():
            child.destroy()
        for s in self.sprites:
            self._create_sprite_card(s)
        self._relayout_sprite_cards()

    def _create_sprite_card(self, s: SpriteItem):
        card = tk.Frame(self.sprites_frame, bg=THEME["bg_panel"], bd=1, relief="flat",
                        highlightthickness=1, highlightbackground=THEME["border"])
        s.card_frame = card

        # Thumbnail
        thumb = s.info.image.copy()
        thumb.thumbnail((140, 140), Image.LANCZOS)
        composite = checker_composite(thumb)
        s.thumb_photo = ImageTk.PhotoImage(composite)
        thumb_lbl = tk.Label(card, image=s.thumb_photo, bg=THEME["bg_panel"], cursor="hand2")
        thumb_lbl.pack(padx=6, pady=(6, 2))

        # Checkbox + index
        row = tk.Frame(card, bg=THEME["bg_panel"])
        row.pack(fill=tk.X, padx=6)
        s.check_var = tk.BooleanVar(value=s.selected)

        def _on_check():
            s.selected = bool(s.check_var.get())
            self._update_selection_count()

        tk.Checkbutton(row, variable=s.check_var, command=_on_check,
                       bg=THEME["bg_panel"], fg=THEME["fg_main"],
                       activebackground=THEME["bg_panel"],
                       selectcolor=THEME["bg_input"],
                       borderwidth=0, highlightthickness=0).pack(side=tk.LEFT)
        tk.Label(row, text=f"#{s.info.index}  {s.info.image.width}×{s.info.image.height}",
                 bg=THEME["bg_panel"], fg=THEME["fg_muted"], font=FONT_SMALL).pack(side=tk.LEFT)

        # Name label
        s.name_label = tk.Label(card, text=s.display_name,
                                bg=THEME["bg_panel"], fg=THEME["fg_main"],
                                font=FONT_BASE, wraplength=150, justify="center", cursor="hand2")
        s.name_label.pack(fill=tk.X, padx=6, pady=(2, 0))

        # Filename label
        s.status_label = tk.Label(card, text=s.effective_filename + ".png",
                                  bg=THEME["bg_panel"], fg=THEME["accent"],
                                  font=FONT_SMALL, wraplength=150, justify="center", cursor="hand2")
        s.status_label.pack(fill=tk.X, padx=6, pady=(0, 6))

        # Bind double-click to OPEN edit dialog on every part of the card.
        # Also bind single-click on the name/filename labels (not the thumbnail
        # — thumbnail single-click toggles selection for quick deselection).
        def _open_edit(event=None, sp=s):
            self._open_variant_dialog(sp)

        def _toggle(event=None, sp=s):
            self._toggle_sprite(sp)

        # Thumbnail: single-click toggles selection, double-click edits
        thumb_lbl.bind("<Button-1>", _toggle)
        thumb_lbl.bind("<Double-Button-1>", _open_edit)

        # Card frame, name label, filename label: any click opens edit
        for w in (card, s.name_label, s.status_label):
            w.bind("<Double-Button-1>", _open_edit)
        # Single click on the name/filename also opens edit (more discoverable)
        s.name_label.bind("<Button-1>", _open_edit)
        s.status_label.bind("<Button-1>", _open_edit)

    def _relayout_sprite_cards(self):
        """Re-grid cards based on current canvas width."""
        if not self.sprites:
            return
        canvas_w = max(self.sprites_canvas.winfo_width(), 200)
        card_w = 170  # approximate card width + padding
        cols = max(1, canvas_w // card_w)
        for idx, s in enumerate(self.sprites):
            if s.card_frame is None:
                continue
            r = idx // cols
            c = idx % cols
            s.card_frame.grid(row=r, column=c, padx=6, pady=6, sticky="n")

    def _sprites_select_all(self):
        for s in self.sprites:
            s.selected = True
            if s.check_var:
                s.check_var.set(True)
        self._update_selection_count()

    def _sprites_deselect_all(self):
        for s in self.sprites:
            s.selected = False
            if s.check_var:
                s.check_var.set(False)
        self._update_selection_count()

    def _toggle_sprite(self, s: SpriteItem):
        s.selected = not s.selected
        if s.check_var:
            s.check_var.set(s.selected)
        self._update_selection_count()

    def _update_selection_count(self):
        n = sum(1 for s in self.sprites if s.selected)
        self.sprites_summary_var.set(f"{n} / {len(self.sprites)} selected")

    def _update_sprite_card_labels(self, s: SpriteItem):
        if s.name_label is not None:
            s.name_label.config(text=s.display_name)
        if s.status_label is not None:
            if s.name_result and s.name_result.error:
                # Show compact error hint on the card
                err = s.name_result.error or ""
                if "429" in err or "quota" in err.lower():
                    short = "❌ rate limit"
                elif "network" in err.lower() or "HTTP 0" in err:
                    short = "❌ network blip"
                elif "HTTP" in err:
                    short = f"❌ {err.split(':')[0]}"
                else:
                    short = "❌ AI failed"
                s.status_label.config(text=short, fg=THEME["err"])
            else:
                s.status_label.config(text=s.effective_filename + ".png", fg=THEME["accent"])

        if s.name_result is None:
            self._set_card_state(s, "idle")
        elif s.name_result.error:
            self._set_card_state(s, "err")
        elif s.name_result.needs_user_input:
            self._set_card_state(s, "warn")
        else:
            self._set_card_state(s, "ok")

    def _open_variant_dialog(self, s: SpriteItem):
        # Snapshot vocabulary BEFORE the dialog so we can detect a base_name change
        original_base_name = (s.name_result.base_name if s.name_result else "")
        base_names, variants, motions = self._collect_known_vocabulary()

        dialog = VariantPickerDialog(
            self.root, s,
            all_sprites=self.sprites,
            known_base_names=base_names,
            known_variants=variants,
            known_motions=motions,
        )
        self.root.wait_window(dialog)
        if not dialog.result_applied:
            return

        new_base = (s.name_result.base_name if s.name_result else "")
        new_variant = (s.name_result.variant if s.name_result else "")
        new_motion = (s.name_result.motion if s.name_result else "")

        # Bulk apply: rewrite base_name on all sprites with the original name
        if dialog.bulk_apply_species and original_base_name and new_base and new_base != original_base_name:
            updated = 0
            for other in self.sprites:
                if other is s:
                    continue
                if (other.name_result
                        and other.name_result.base_name == original_base_name):
                    other.name_result.base_name = new_base
                    other.rebuild_filename_from_parts()
                    self._update_sprite_card_labels(other)
                    updated += 1
            self.status_var.set(
                f"Updated species '{original_base_name}' → '{new_base}' on {updated + 1} sprite(s)."
            )

        self._update_sprite_card_labels(s)

    # ==================================================================== AI naming

    def on_name_all_ai(self):
        if not self.sprites:
            messagebox.showinfo("No sprites", "Split sprites first.")
            return
        if not self.ai_enabled_var.get():
            messagebox.showinfo("AI disabled", "Enable 'AI auto-naming' in the Export section.")
            return

        targets = [s for s in self.sprites if s.selected]
        if not targets:
            messagebox.showinfo("No selection", "Select at least one sprite.")
            return

        # Increment generation to invalidate any stale callbacks
        self._ai_generation += 1
        gen = self._ai_generation

        if self._ai_executor is not None:
            self._ai_executor.shutdown(wait=False)
        self._ai_executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

        # Mark all target cards as "pending" (blue border + ⏳ label) upfront
        for s in targets:
            self._set_card_state(s, "pending")

        self._ai_queue = list(targets)  # popped from front
        self._ai_total = len(targets)
        self._ai_counts = {"n": 0, "ok": 0, "fail": 0, "consecutive_fail": 0}
        self._ai_aborted_reason = None

        self._set_busy(
            f"Naming with AI  0/{self._ai_total}  (vocabulary unified across batch)",
            determinate_max=self._ai_total,
        )
        self._submit_next_ai(gen)

    def _collect_known_vocabulary(self) -> tuple:
        """現在までに確定している base_name / variant / motion の一覧を返す。"""
        base_names = [
            s.name_result.base_name for s in self.sprites
            if s.name_result and s.name_result.base_name and not s.name_result.error
        ]
        variants = [
            s.name_result.variant for s in self.sprites
            if s.name_result and s.name_result.variant and not s.name_result.error
        ]
        motions = [
            s.name_result.motion for s in self.sprites
            if s.name_result and s.name_result.motion and not s.name_result.error
        ]
        return base_names, variants, motions

    def _submit_next_ai(self, gen: int):
        """
        1 件だけ submit する。前のスプライトの結果が適用されてから呼ばれるので、
        既に確定した語彙 (base_name/variant/motion) をプロンプトに乗せられる。
        """
        if gen != self._ai_generation:
            return
        if not self._ai_queue:
            self._finalize_ai_batch(gen)
            return

        sprite = self._ai_queue.pop(0)
        context = self.ai_context_var.get().strip()
        existing_base_names, existing_variants, existing_motions = self._collect_known_vocabulary()
        existing_filenames = [
            s.effective_filename for s in self.sprites
            if s is not sprite and s.name_result and not s.name_result.error
        ]

        def worker():
            if gen != self._ai_generation:
                return None
            try:
                return request_sprite_name(
                    sprite.info.image,
                    user_context=context,
                    existing_names=existing_filenames,
                    existing_base_names=existing_base_names,
                    existing_variants=existing_variants,
                    existing_motions=existing_motions,
                )
            except Exception as e:
                r = NameResult()
                r.error = f"unexpected: {e}"
                return r

        def on_done(fut):
            if gen != self._ai_generation:
                return
            try:
                result = fut.result()
            except Exception as e:
                traceback.print_exc()
                result = NameResult()
                result.error = str(e)
            self.root.after(0, self._apply_ai_result_chained, sprite, result, gen)

        fut = self._ai_executor.submit(worker)
        fut.add_done_callback(on_done)

    def _apply_ai_result_chained(self, sprite: SpriteItem, result: Optional[NameResult], gen: int):
        """
        main thread 上で 1 件の結果を反映し、次の sprite を submit する。
        連続失敗が一定回数を超えたらバッチ全体を中断 (quota 枯渇等)。
        """
        if gen != self._ai_generation:
            return

        self._ai_counts["n"] += 1
        if result is not None:
            sprite.name_result = result
            if result.error:
                self._ai_counts["fail"] += 1
                self._ai_counts["consecutive_fail"] += 1
                # Detect quota errors → abort whole batch immediately
                err = result.error or ""
                if "daily quota" in err.lower() or "PerDay" in err or "RequestsPerDay" in err:
                    self._ai_aborted_reason = "daily_quota"
            else:
                self._ai_counts["ok"] += 1
                self._ai_counts["consecutive_fail"] = 0
                # De-dup filename across the whole batch
                if result.filename:
                    used = {
                        s.effective_filename for s in self.sprites
                        if s is not sprite and s.name_result and not s.name_result.error
                    }
                    base_fn = result.filename
                    fn = base_fn
                    suf = 2
                    while fn in used:
                        fn = f"{base_fn}_{suf}"
                        suf += 1
                    result.filename = fn
            self._update_sprite_card_labels(sprite)

        # Early abort: if 3 in a row failed, stop wasting time
        if self._ai_counts["consecutive_fail"] >= 3 and self._ai_aborted_reason is None:
            self._ai_aborted_reason = "consecutive_failures"

        self._set_progress(
            self._ai_counts["n"],
            message=(
                f"Naming with AI  {self._ai_counts['n']}/{self._ai_total}  "
                f"(ok:{self._ai_counts['ok']}  fail:{self._ai_counts['fail']})"
            ),
        )

        if self._ai_aborted_reason is not None:
            # Mark remaining sprites as skipped/idle and finalize
            remaining = len(self._ai_queue)
            self._ai_queue = []
            for s in self.sprites:
                if s.selected and s.name_result is None:
                    # Reset card visual back to idle
                    self._set_card_state(s, "idle")
            self._finalize_ai_batch(gen, skipped=remaining)
            return

        # Submit next
        self._submit_next_ai(gen)

    def _finalize_ai_batch(self, gen: int, skipped: int = 0):
        if gen != self._ai_generation:
            return
        ok = self._ai_counts["ok"]
        fail = self._ai_counts["fail"]
        total = self._ai_total
        reason = self._ai_aborted_reason

        if reason == "daily_quota":
            self._clear_busy(
                f"Aborted: Gemini daily quota exhausted. ok:{ok} fail:{fail} skipped:{skipped}",
                icon_color=THEME["err"],
            )
            messagebox.showerror(
                "Gemini daily quota exhausted",
                "Gemini AI's free-tier daily request limit has been reached.\n\n"
                f"Naming was aborted to avoid wasted retries.\n"
                f"  ok: {ok}\n  failed: {fail}\n  skipped: {skipped}\n\n"
                "The quota resets at 09:00 JST (00:00 UTC). Until then, "
                "double-click each sprite card to enter names manually.",
            )
        elif reason == "consecutive_failures":
            self._clear_busy(
                f"Aborted after 3 consecutive failures. ok:{ok} fail:{fail} skipped:{skipped}",
                icon_color=THEME["err"],
            )
            first_error = next(
                (s.name_result.error for s in self.sprites
                 if s.name_result and s.name_result.error),
                "(unknown)",
            )
            messagebox.showwarning(
                "AI naming aborted",
                f"Aborted after 3 consecutive failures to avoid waiting.\n\n"
                f"  ok: {ok}\n  failed: {fail}\n  skipped: {skipped}\n\n"
                f"First error:\n{first_error[:400]}",
            )
        elif fail == 0:
            self._clear_busy(f"AI naming complete: {ok}/{total} succeeded")
        else:
            self._clear_busy(
                f"AI naming finished: {ok} ok, {fail} failed. Double-click failed cards for details.",
                icon_color=THEME["warn"],
            )
            first_error = next(
                (s.name_result.error for s in self.sprites
                 if s.name_result and s.name_result.error),
                None,
            )
            if first_error:
                messagebox.showwarning(
                    "Some sprites failed",
                    f"{fail} sprite(s) could not be named.\n\n"
                    f"First error:\n{first_error[:400]}",
                )

    def _set_card_state(self, s: SpriteItem, state: str):
        """
        Visually mark a sprite card as one of:
          "idle"    — default gray border
          "pending" — blue accent border + ⏳ label (AI in progress)
          "ok"      — green border (AI named successfully)
          "warn"    — yellow border (needs user input)
          "err"     — red border (AI failed)
        """
        if s.card_frame is None:
            return
        colors = {
            "idle":    (THEME["border"], 1),
            "pending": (THEME["accent"], 2),
            "ok":      (THEME["ok"], 2),
            "warn":    (THEME["warn"], 2),
            "err":     (THEME["err"], 2),
        }
        color, width = colors.get(state, (THEME["border"], 1))
        s.card_frame.config(highlightbackground=color, highlightthickness=width)

        if state == "pending" and s.status_label is not None:
            s.status_label.config(text="⏳  naming...", fg=THEME["accent"])

    # ==================================================================== Save sprites

    def on_save_selected_sprites(self):
        if not self.sprites:
            messagebox.showinfo("No sprites", "Split sprites first.")
            return
        selected = [s for s in self.sprites if s.selected]
        if not selected:
            messagebox.showwarning("No selection", "Select at least one sprite to save.")
            return

        folder = self.export_folder_var.get().strip()
        if not folder:
            messagebox.showwarning("No folder", "Choose an output folder in the Export section.")
            return

        try:
            os.makedirs(folder, exist_ok=True)
        except Exception as e:
            messagebox.showerror("Folder error", f"Cannot create folder:\n{e}")
            return

        used_names = set()
        saved = 0
        errors = []
        flip_b = bool(self.split_flip_b_var.get())

        for s in selected:
            stem = s.effective_filename or f"sprite_{s.info.index:03d}"
            base = stem
            idx = 2
            while stem in used_names:
                stem = f"{base}_{idx}"
                idx += 1
            used_names.add(stem)

            try:
                if flip_b:
                    a_img, b_img = make_flipped_pair(s.info.image)
                    a_path = os.path.join(folder, f"{stem}_A.png")
                    b_path = os.path.join(folder, f"{stem}_B.png")
                    a_img.save(a_path, "PNG")
                    b_img.save(b_path, "PNG")
                    saved += 2
                else:
                    path = os.path.join(folder, f"{stem}.png")
                    s.info.image.save(path, "PNG")
                    saved += 1
            except Exception as e:
                errors.append(f"{stem}: {e}")

        if errors:
            messagebox.showerror("Save errors", "\n".join(errors[:10]))

        self.status_var.set(f"Saved {saved} file(s) to {folder}")
        if messagebox.askyesno("Done", f"Saved {saved} file(s).\n\nOpen output folder?"):
            self._open_folder_in_os(folder)

    def _open_folder_in_os(self, path: str):
        try:
            if sys.platform.startswith("win"):
                os.startfile(path)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception as e:
            messagebox.showwarning("Open folder", f"Could not open folder:\n{e}")

    # ==================================================================== Preview render (shared)

    def _composite_on_bg(self, img: Image.Image) -> Image.Image:
        mode = self.bg_mode_var.get()
        if mode == "Checker":
            return checker_composite(img)
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        colors = {
            "Black":   (0, 0, 0),
            "White":   (255, 255, 255),
            "Magenta": (255, 0, 255),
            "Green":   (0, 255, 0),
            "Cyan":    (0, 255, 255),
            "Red":     (255, 0, 0),
        }
        if mode == "Custom...":
            color = self._custom_bg_color
        else:
            color = colors.get(mode, (128, 128, 128))
        bg = Image.new("RGB", img.size, color)
        bg.paste(img, mask=img.split()[3])
        return bg

    def _on_bg_change(self, *_):
        # Skip the color picker when a preset is being loaded — the preset
        # already restored the custom color via _apply_preset.
        if self.bg_mode_var.get() == "Custom..." and not self._suppress_preset_apply:
            rgb, _hex = colorchooser.askcolor(
                color="#%02x%02x%02x" % self._custom_bg_color,
                title="Pick preview background color",
            )
            if rgb is not None:
                self._custom_bg_color = (int(rgb[0]), int(rgb[1]), int(rgb[2]))
        if self.result_img is not None:
            self._show_in(self.right_canvas, self.result_img, checker=True)

    def _schedule_redraw(self):
        if self._resize_after is not None:
            try:
                self.root.after_cancel(self._resize_after)
            except Exception:
                pass
        self._resize_after = self.root.after(60, self._refresh_previews)

    def _refresh_previews(self):
        self._resize_after = None
        if self.original_img is not None:
            self._show_in(self.left_canvas, self.original_img, checker=False)
        if self.result_img is not None:
            self._show_in(self.right_canvas, self.result_img, checker=True)
        if hasattr(self, "zoom_label"):
            self.zoom_label.config(text=f"{int(round(self._effective_zoom_percent()))}%")

    def _base_scale(self, canvas_w, canvas_h, img_w, img_h):
        if img_w <= 0 or img_h <= 0:
            return 1.0
        return min(canvas_w / img_w, canvas_h / img_h)

    def _effective_zoom_percent(self):
        if self.original_img is None:
            return 100.0
        w = max(self.left_canvas.winfo_width(), 10)
        h = max(self.left_canvas.winfo_height(), 10)
        img_w, img_h = self.original_img.size
        base = self._base_scale(w, h, img_w, img_h)
        return base * self.zoom * 100.0

    def _compute_viewport(self, canvas_w, canvas_h, img_w, img_h):
        base = self._base_scale(canvas_w, canvas_h, img_w, img_h)
        actual_scale = base * self.zoom
        if actual_scale <= 0:
            actual_scale = 1.0
        view_w_img = canvas_w / actual_scale
        view_h_img = canvas_h / actual_scale
        cx = self.view_cx if self.view_cx is not None else img_w / 2
        cy = self.view_cy if self.view_cy is not None else img_h / 2
        if view_w_img < img_w:
            half = view_w_img / 2
            cx = max(half, min(img_w - half, cx))
        else:
            cx = img_w / 2
        if view_h_img < img_h:
            half = view_h_img / 2
            cy = max(half, min(img_h - half, cy))
        else:
            cy = img_h / 2
        self.view_cx = cx
        self.view_cy = cy
        left = cx - view_w_img / 2
        top = cy - view_h_img / 2
        right = left + view_w_img
        bottom = top + view_h_img
        return (left, top, right, bottom), actual_scale

    def _show_in(self, canvas: tk.Canvas, img: Image.Image, checker: bool):
        canvas.update_idletasks()
        w = canvas.winfo_width()
        h = canvas.winfo_height()
        if w < 10 or h < 10:
            self.root.after(50, lambda: self._show_in(canvas, img, checker))
            return
        img_w, img_h = img.size
        (l, t, r, b), scale = self._compute_viewport(w, h, img_w, img_h)
        cl = max(0, int(l))
        ct = max(0, int(t))
        cr = min(img_w, int(r) + 1)
        cb = min(img_h, int(b) + 1)
        if cr <= cl or cb <= ct:
            canvas.delete("all")
            return
        crop = img.crop((cl, ct, cr, cb))
        if checker:
            crop = self._composite_on_bg(crop)
        else:
            crop = crop.convert("RGBA")
        disp_w = max(1, int((cr - cl) * scale))
        disp_h = max(1, int((cb - ct) * scale))
        resample = Image.NEAREST if scale > 1.2 else Image.LANCZOS
        crop = crop.resize((disp_w, disp_h), resample)
        photo = ImageTk.PhotoImage(crop)
        offset_x = (cl - l) * scale
        offset_y = (ct - t) * scale
        canvas.delete("all")
        canvas.create_image(offset_x, offset_y, image=photo, anchor=tk.NW)
        canvas.image = photo

    # ------------------------------------------------------ Zoom / Pan
    def on_zoom_fit(self):
        self.zoom = 1.0
        self.view_cx = None
        self.view_cy = None
        self._refresh_previews()

    def on_zoom_100(self):
        if self.original_img is None:
            return
        w = max(self.left_canvas.winfo_width(), 10)
        h = max(self.left_canvas.winfo_height(), 10)
        img_w, img_h = self.original_img.size
        base = self._base_scale(w, h, img_w, img_h)
        self.zoom = 1.0 / base if base > 0 else 1.0
        self._refresh_previews()

    def on_zoom_button(self, factor: float):
        self._apply_zoom(factor, anchor_x=None, anchor_y=None, canvas=None)

    def _apply_zoom(self, factor: float, anchor_x, anchor_y, canvas):
        if self.original_img is None:
            return
        new_zoom = max(0.1, min(64.0, self.zoom * factor))
        if new_zoom == self.zoom:
            return
        if anchor_x is not None and anchor_y is not None and canvas is not None:
            w = max(canvas.winfo_width(), 10)
            h = max(canvas.winfo_height(), 10)
            img_w, img_h = self.original_img.size
            (l, t, r, b), old_scale = self._compute_viewport(w, h, img_w, img_h)
            img_x = l + anchor_x / old_scale
            img_y = t + anchor_y / old_scale
            self.zoom = new_zoom
            base = self._base_scale(w, h, img_w, img_h)
            new_scale = base * self.zoom
            new_view_w = w / new_scale
            new_view_h = h / new_scale
            self.view_cx = img_x - (anchor_x / new_scale - new_view_w / 2)
            self.view_cy = img_y - (anchor_y / new_scale - new_view_h / 2)
        else:
            self.zoom = new_zoom
        self._refresh_previews()

    def _on_wheel(self, event):
        factor = 1.25 if event.delta > 0 else 1 / 1.25
        self._apply_zoom(factor, event.x, event.y, event.widget)

    def _on_wheel_linux(self, event, up: bool):
        factor = 1.25 if up else 1 / 1.25
        self._apply_zoom(factor, event.x, event.y, event.widget)

    def _on_drag_start(self, event):
        if self.original_img is None:
            return
        self._drag_state = (
            event.x, event.y,
            self.view_cx if self.view_cx is not None else self.original_img.width / 2,
            self.view_cy if self.view_cy is not None else self.original_img.height / 2,
        )
        event.widget.configure(cursor="hand2")

    def _on_drag_move(self, event):
        if self._drag_state is None or self.original_img is None:
            return
        sx, sy, cx0, cy0 = self._drag_state
        canvas = event.widget
        w = max(canvas.winfo_width(), 10)
        h = max(canvas.winfo_height(), 10)
        img_w, img_h = self.original_img.size
        base = self._base_scale(w, h, img_w, img_h)
        actual_scale = base * self.zoom
        if actual_scale <= 0:
            return
        dx = (event.x - sx) / actual_scale
        dy = (event.y - sy) / actual_scale
        self.view_cx = cx0 - dx
        self.view_cy = cy0 - dy
        self._refresh_previews()

    def _on_drag_end(self, event):
        self._drag_state = None
        event.widget.configure(cursor="fleur")


def main():
    root = tk.Tk()
    initial = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    CleanEdgesGUI(root, initial_path=initial)
    root.mainloop()


if __name__ == "__main__":
    main()
