"""
clean_edges_gui.py
clean_edges.py の tkinter GUI ラッパー。

機能:
  - 画像ファイルをボタンで開く (または起動引数で指定)
  - モード選択: auto-fake-bg / rembg
  - rembg モデル選択
  - スライダーでリアルタイムにパラメータ調整
    - Border tolerance  : 縁の色許容範囲
    - Gray tolerance    : 市松グレー許容範囲
    - Edge feather      : 距離変換によるフェザリング幅
    - Alpha blur        : 最終ガウスぼかし量
  - [Process] で処理実行 → 左:元画像 / 右:結果 を並べて表示
  - [Save As...] で保存

起動:
  python scripts/Photoshop_script/clean_edges_gui.py
  python scripts/Photoshop_script/clean_edges_gui.py path/to/image.png
"""

import sys
import traceback
from pathlib import Path

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser

from PIL import Image, ImageTk

# Same directory import
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from clean_edges import (  # noqa: E402
    process_auto_fake_bg,
    process_rembg,
    smooth_alpha,
    _light_smooth,
    checker_composite,
)


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


class CleanEdgesGUI:
    def __init__(self, root: tk.Tk, initial_path: Path = None):
        self.root = root
        self.root.title("Clean Edges - background removal")
        self.root.geometry("1600x950")
        self.root.minsize(1100, 700)
        self.root.configure(bg="#1e1e1e")

        self.input_path: Path = None
        self.original_img: Image.Image = None
        self.result_img: Image.Image = None

        self._rembg_session = None
        self._rembg_session_model = None

        # Viewport state (shared between left & right canvases so they stay in sync)
        self.zoom = 1.0  # 1.0 = fit image to canvas
        self.view_cx = None  # image-space center; None = center of image
        self.view_cy = None
        self._drag_state = None  # (start_x, start_y, initial_cx, initial_cy)

        # Result-preview background color
        self._custom_bg_color = (128, 128, 128)

        self._build_ui()

        if initial_path:
            self._load_image(Path(initial_path))

    # ------------------------------------------------------------------ UI
    def _build_ui(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass

        # -------- Top toolbar --------
        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, padx=10, pady=8)

        ttk.Button(top, text="Open Image...", command=self.on_open).pack(side=tk.LEFT)
        ttk.Button(top, text="Save Result As...", command=self.on_save).pack(side=tk.LEFT, padx=(6, 20))

        ttk.Label(top, text="Mode:").pack(side=tk.LEFT)
        self.mode_var = tk.StringVar(value="auto-fake-bg")
        ttk.Radiobutton(
            top, text="Auto Fake-BG (color-based)",
            variable=self.mode_var, value="auto-fake-bg",
            command=self._update_mode,
        ).pack(side=tk.LEFT, padx=4)
        ttk.Radiobutton(
            top, text="rembg (AI)",
            variable=self.mode_var, value="rembg",
            command=self._update_mode,
        ).pack(side=tk.LEFT, padx=4)

        ttk.Label(top, text="  Model:").pack(side=tk.LEFT, padx=(14, 2))
        self.model_var = tk.StringVar(value=REMBG_MODELS[0])
        self.model_combo = ttk.Combobox(
            top, textvariable=self.model_var, values=REMBG_MODELS,
            width=24, state="readonly",
        )
        self.model_combo.pack(side=tk.LEFT)

        self.matting_var = tk.BooleanVar(value=True)
        self.matting_chk = ttk.Checkbutton(
            top, text="alpha matting", variable=self.matting_var
        )
        self.matting_chk.pack(side=tk.LEFT, padx=(8, 0))

        ttk.Button(top, text="  Process  ", command=self.on_process).pack(side=tk.RIGHT, padx=(12, 0))

        # Preview background selector
        self.bg_mode_var = tk.StringVar(value="Checker")
        bg_combo = ttk.Combobox(
            top, textvariable=self.bg_mode_var,
            values=["Checker", "Black", "White", "Magenta", "Green", "Cyan", "Red", "Custom..."],
            width=11, state="readonly",
        )
        bg_combo.pack(side=tk.RIGHT, padx=(4, 8))
        ttk.Label(top, text="Preview BG:").pack(side=tk.RIGHT, padx=(16, 2))
        self.bg_mode_var.trace_add("write", self._on_bg_change)

        # Zoom controls (right side)
        self.zoom_label = ttk.Label(top, text="100%", width=6, anchor="e")
        self.zoom_label.pack(side=tk.RIGHT, padx=(6, 4))
        ttk.Button(top, text="Fit", width=4, command=self.on_zoom_fit).pack(side=tk.RIGHT, padx=1)
        ttk.Button(top, text="1:1", width=4, command=self.on_zoom_100).pack(side=tk.RIGHT, padx=1)
        ttk.Button(top, text="+", width=3, command=lambda: self.on_zoom_button(1.5)).pack(side=tk.RIGHT, padx=1)
        ttk.Button(top, text="−", width=3, command=lambda: self.on_zoom_button(1/1.5)).pack(side=tk.RIGHT, padx=1)
        ttk.Label(top, text="Zoom:").pack(side=tk.RIGHT, padx=(16, 4))

        # -------- Sliders --------
        sliders = ttk.LabelFrame(self.root, text="Parameters")
        sliders.pack(fill=tk.X, padx=10, pady=(0, 6))

        self.border_tol = tk.IntVar(value=32)
        self.gray_tol = tk.IntVar(value=18)
        self.feather_var = tk.DoubleVar(value=1.5)
        self.blur_var = tk.DoubleVar(value=0.5)

        self._make_slider(sliders, "Border tolerance", self.border_tol, 0, 100, 0)
        self._make_slider(sliders, "Gray tolerance", self.gray_tol, 0, 60, 1)
        self._make_slider(sliders, "Edge feather (px)", self.feather_var, 0.0, 10.0, 2, decimal=True)
        self._make_slider(sliders, "Alpha blur (px)", self.blur_var, 0.0, 5.0, 3, decimal=True)

        self.auto_process_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            sliders, text="Auto-reprocess on slider change (auto-fake-bg only)",
            variable=self.auto_process_var,
        ).grid(row=4, column=0, sticky="w", padx=8, pady=(4, 6))

        for v in (self.border_tol, self.gray_tol, self.feather_var, self.blur_var):
            v.trace_add("write", self._on_param_change)

        # -------- Image display --------
        display = ttk.Frame(self.root)
        display.pack(fill=tk.BOTH, expand=True, padx=10, pady=6)

        left_frame = ttk.LabelFrame(display, text="Original")
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
        left_inner = tk.Frame(left_frame, bg="#2a2a2a")
        left_inner.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        left_inner.pack_propagate(False)
        self.left_canvas = tk.Canvas(
            left_inner, bg="#2a2a2a", highlightthickness=0, bd=0
        )
        self.left_canvas.pack(fill=tk.BOTH, expand=True)

        right_frame = ttk.LabelFrame(display, text="Result (on checker background)")
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(5, 0))
        right_inner = tk.Frame(right_frame, bg="#2a2a2a")
        right_inner.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        right_inner.pack_propagate(False)
        self.right_canvas = tk.Canvas(
            right_inner, bg="#2a2a2a", highlightthickness=0, bd=0
        )
        self.right_canvas.pack(fill=tk.BOTH, expand=True)

        # Redraw thumbnails when canvas is resized by window resize.
        # (Canvas does NOT resize to fit its content like Label does,
        #  so no infinite shrink loop.)
        self._resize_after = None
        for cv in (self.left_canvas, self.right_canvas):
            cv.bind("<Configure>", lambda e: self._schedule_redraw())
            # Zoom: mouse wheel (Windows/Mac: <MouseWheel>, Linux: Button-4/5)
            cv.bind("<MouseWheel>", self._on_wheel)
            cv.bind("<Button-4>", lambda e: self._on_wheel_linux(e, up=True))
            cv.bind("<Button-5>", lambda e: self._on_wheel_linux(e, up=False))
            # Pan: left-drag
            cv.bind("<ButtonPress-1>", self._on_drag_start)
            cv.bind("<B1-Motion>", self._on_drag_move)
            cv.bind("<ButtonRelease-1>", self._on_drag_end)
            # Double-click to reset view
            cv.bind("<Double-Button-1>", lambda e: self.on_zoom_fit())
            # Change cursor to show it's interactive
            cv.configure(cursor="fleur")

        # Keyboard shortcuts
        self.root.bind("<KeyPress-plus>", lambda e: self.on_zoom_button(1.5))
        self.root.bind("<KeyPress-equal>", lambda e: self.on_zoom_button(1.5))
        self.root.bind("<KeyPress-minus>", lambda e: self.on_zoom_button(1 / 1.5))
        self.root.bind("<KeyPress-0>", lambda e: self.on_zoom_fit())
        self.root.bind("<KeyPress-1>", lambda e: self.on_zoom_100())

        # -------- Status bar --------
        self.status_var = tk.StringVar(value="Ready. Click 'Open Image...' to begin.")
        status = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor="w")
        status.pack(fill=tk.X, side=tk.BOTTOM)

        self._update_mode()

    def _make_slider(self, parent, label, var, mn, mx, row, decimal=False):
        ttk.Label(parent, text=label, width=20).grid(row=row, column=0, sticky="w", padx=8, pady=2)
        scale = ttk.Scale(parent, variable=var, from_=mn, to=mx, orient=tk.HORIZONTAL, length=600)
        scale.grid(row=row, column=1, sticky="ew", padx=4, pady=2)
        val_lbl = ttk.Label(parent, width=8)
        val_lbl.grid(row=row, column=2, padx=8, pady=2)
        parent.columnconfigure(1, weight=1)

        def _update(*_):
            if decimal:
                val_lbl.config(text=f"{var.get():.2f}")
            else:
                val_lbl.config(text=str(int(var.get())))

        var.trace_add("write", _update)
        _update()

    def _update_mode(self):
        is_rembg = self.mode_var.get() == "rembg"
        state = "readonly" if is_rembg else "disabled"
        self.model_combo.configure(state=state)
        if is_rembg:
            self.matting_chk.state(["!disabled"])
        else:
            self.matting_chk.state(["disabled"])

    # ----------------------------------------------------------- Actions
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
        self.status_var.set(f"Loaded: {path.name}  ({img.width}x{img.height})")
        self._refresh_previews()
        # Auto-process on load for quick feedback
        if self.mode_var.get() == "auto-fake-bg":
            self.on_process()

    def on_save(self):
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

    def on_process(self):
        if self.original_img is None:
            self.status_var.set("Open an image first.")
            return

        mode = self.mode_var.get()
        self.status_var.set(f"Processing [{mode}]...")
        self.root.update_idletasks()

        try:
            if mode == "auto-fake-bg":
                cut = process_auto_fake_bg(
                    self.original_img,
                    border_tolerance=int(self.border_tol.get()),
                    gray_tolerance=int(self.gray_tol.get()),
                    feather=float(self.feather_var.get()),
                )
                if self.blur_var.get() > 0:
                    cut = _light_smooth(cut, blur_radius=float(self.blur_var.get()))
            else:
                self._ensure_session()
                cut = process_rembg(
                    self.original_img,
                    session=self._rembg_session,
                    use_matting=bool(self.matting_var.get()),
                )
                cut = smooth_alpha(cut, blur_radius=float(self.blur_var.get()))

            self.result_img = cut
            self._refresh_previews()
            self.status_var.set(f"Done [{mode}]. Click 'Save Result As...' to export.")
        except Exception as e:
            traceback.print_exc()
            messagebox.showerror("Processing failed", str(e))
            self.status_var.set(f"Error: {e}")

    def _ensure_session(self):
        model = self.model_var.get()
        if self._rembg_session is not None and self._rembg_session_model == model:
            return
        try:
            from rembg import new_session
        except ImportError:
            raise RuntimeError(
                "rembg is not installed. Run: pip install rembg onnxruntime"
            )
        self.status_var.set(f"Loading rembg model: {model} (first use may download)...")
        self.root.update_idletasks()
        self._rembg_session = new_session(model)
        self._rembg_session_model = model

    def _on_param_change(self, *_):
        if (
            self.auto_process_var.get()
            and self.original_img is not None
            and self.mode_var.get() == "auto-fake-bg"
        ):
            # Debounce: schedule in 200ms, cancel previous
            if hasattr(self, "_debounce_id") and self._debounce_id:
                self.root.after_cancel(self._debounce_id)
            self._debounce_id = self.root.after(200, self.on_process)

    # ------------------------------------------------------- Background
    def _composite_on_bg(self, img: Image.Image) -> Image.Image:
        """Compose the RGBA image onto the user-selected preview background."""
        mode = self.bg_mode_var.get()
        if mode == "Checker":
            return checker_composite(img)
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        solid_colors = {
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
            color = solid_colors.get(mode, (128, 128, 128))
        bg = Image.new("RGB", img.size, color)
        bg.paste(img, mask=img.split()[3])
        return bg

    def _on_bg_change(self, *_):
        if self.bg_mode_var.get() == "Custom...":
            rgb, _hex = colorchooser.askcolor(
                color="#%02x%02x%02x" % self._custom_bg_color,
                title="Pick preview background color",
            )
            if rgb is None:
                # user cancelled — just leave selection as "Custom..." with previous color
                pass
            else:
                self._custom_bg_color = (int(rgb[0]), int(rgb[1]), int(rgb[2]))
        # Redraw just the right (result) canvas since only it uses bg
        if self.result_img is not None:
            self._show_in(self.right_canvas, self.result_img, checker=True)

    # --------------------------------------------------------- Preview
    def _schedule_redraw(self):
        """Debounce canvas <Configure> events while the user is resizing."""
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
        # Update zoom indicator
        self.zoom_label.config(text=f"{int(round(self._effective_zoom_percent()))}%")

    def _base_scale(self, canvas_w: int, canvas_h: int, img_w: int, img_h: int) -> float:
        """Scale that fits the whole image inside the canvas (zoom=1.0)."""
        if img_w <= 0 or img_h <= 0:
            return 1.0
        return min(canvas_w / img_w, canvas_h / img_h)

    def _effective_zoom_percent(self) -> float:
        """Show zoom as % of 1:1 (actual pixels). 100% = one image pixel per screen pixel."""
        if self.original_img is None:
            return 100.0
        w = max(self.left_canvas.winfo_width(), 10)
        h = max(self.left_canvas.winfo_height(), 10)
        img_w, img_h = self.original_img.size
        base = self._base_scale(w, h, img_w, img_h)
        return base * self.zoom * 100.0

    def _compute_viewport(self, canvas_w, canvas_h, img_w, img_h):
        """Return (crop_box, actual_scale) where crop_box is in image coords."""
        base = self._base_scale(canvas_w, canvas_h, img_w, img_h)
        actual_scale = base * self.zoom
        if actual_scale <= 0:
            actual_scale = 1.0

        # How much of the image fits in the canvas at this scale?
        view_w_img = canvas_w / actual_scale
        view_h_img = canvas_h / actual_scale

        cx = self.view_cx if self.view_cx is not None else img_w / 2
        cy = self.view_cy if self.view_cy is not None else img_h / 2

        # Clamp the view center so the viewport stays over the image (when possible)
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

        # Crop the visible region (with 1px padding for safe resize)
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

        # Resize to display size.
        # When zoomed in past 1:1, use NEAREST so the user can see actual pixel edges
        # (ideal for inspecting jaggies). Otherwise use LANCZOS for smooth thumbnails.
        disp_w = max(1, int((cr - cl) * scale))
        disp_h = max(1, int((cb - ct) * scale))
        resample = Image.NEAREST if scale > 1.2 else Image.LANCZOS
        crop = crop.resize((disp_w, disp_h), resample)

        photo = ImageTk.PhotoImage(crop)

        # Position so that the visible region's image-space (l,t) maps to (0,0) on screen
        # offset_x = (cl - l) * scale  (positive if crop started inside visible rect)
        offset_x = (cl - l) * scale
        offset_y = (ct - t) * scale
        # Center the image area in the canvas
        canvas.delete("all")
        canvas.create_image(offset_x, offset_y, image=photo, anchor=tk.NW)
        canvas.image = photo  # keep a reference

    # ------------------------------------------------------------- Zoom/Pan
    def on_zoom_fit(self):
        self.zoom = 1.0
        self.view_cx = None
        self.view_cy = None
        self._refresh_previews()

    def on_zoom_100(self):
        """Set zoom to actual-pixels (1 image pixel == 1 screen pixel)."""
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
        """
        factor: multiplicative zoom change.
        (anchor_x, anchor_y): canvas-space point that should stay under the cursor,
        or None to zoom around the view center.
        """
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

            # Point in image space under the cursor BEFORE zoom
            img_x = l + anchor_x / old_scale
            img_y = t + anchor_y / old_scale

            # Apply new zoom
            self.zoom = new_zoom

            # Compute new scale
            base = self._base_scale(w, h, img_w, img_h)
            new_scale = base * self.zoom

            # Solve for new center so that (img_x, img_y) lands back at (anchor_x, anchor_y)
            new_view_w = w / new_scale
            new_view_h = h / new_scale
            self.view_cx = img_x - (anchor_x / new_scale - new_view_w / 2)
            self.view_cy = img_y - (anchor_y / new_scale - new_view_h / 2)
        else:
            self.zoom = new_zoom

        self._refresh_previews()

    def _on_wheel(self, event):
        # Windows: event.delta is ±120 per notch
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
