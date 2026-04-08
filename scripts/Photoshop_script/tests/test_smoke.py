"""
test_smoke.py
clean_edges + sprite_splitter + ai_namer のユニットレベル smoke test。
ネットワーク呼び出しはモックで置き換え、GUI 層は import のみ検証する。

実行:
    python scripts/Photoshop_script/tests/test_smoke.py
または
    python -m pytest scripts/Photoshop_script/tests/test_smoke.py -v
"""

from __future__ import annotations

import base64
import io
import os
import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

# Add parent dir to sys.path so we can import the scripts directly
_HERE = Path(__file__).resolve().parent
_PARENT = _HERE.parent
if str(_PARENT) not in sys.path:
    sys.path.insert(0, str(_PARENT))

import sprite_splitter  # noqa: E402
import ai_namer  # noqa: E402
import clean_edges  # noqa: E402


def _make_test_image_with_three_patches() -> Image.Image:
    """3 つの連結コンポーネントを持つ合成 RGBA 画像。"""
    img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((10, 10, 50, 50), fill=(255, 0, 0, 255))     # patch 1 (41x41)
    d.rectangle((100, 20, 150, 70), fill=(0, 255, 0, 255))   # patch 2 (51x51)
    d.ellipse((60, 120, 140, 180), fill=(0, 0, 255, 255))    # patch 3 (big)
    return img


def _make_image_with_noise() -> Image.Image:
    """大きい塊 1 個 + 小さすぎるノイズ 1 個。"""
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((20, 20, 80, 80), fill=(255, 255, 0, 255))
    d.rectangle((5, 5, 10, 10), fill=(255, 0, 255, 255))  # 6x6 ノイズ
    return img


# ---------------------------------------------------------------- sprite_splitter

class TestSpriteSplitter(unittest.TestCase):
    def test_extract_three_components(self):
        img = _make_test_image_with_three_patches()
        sprites = sprite_splitter.extract_sprites(img, min_size=10, padding=2)
        self.assertEqual(len(sprites), 3, "3 components expected")
        # 各 sprite に画像と bbox と index
        for s in sprites:
            self.assertIsNotNone(s.image)
            self.assertEqual(len(s.bbox), 4)
            self.assertGreater(s.area, 0)

    def test_extract_noise_filtered(self):
        img = _make_image_with_noise()
        sprites = sprite_splitter.extract_sprites(img, min_size=20, padding=0)
        self.assertEqual(len(sprites), 1, "noise should be filtered")
        self.assertEqual(sprites[0].index, 1)

    def test_extract_padding_applied(self):
        img = _make_test_image_with_three_patches()
        sprites = sprite_splitter.extract_sprites(img, min_size=10, padding=5)
        # 最大のスプライトは padding 込みで bbox が広い
        largest = sprites[0]
        bw = largest.bbox[2] - largest.bbox[0]
        bh = largest.bbox[3] - largest.bbox[1]
        self.assertEqual(largest.image.size, (bw, bh))

    def test_empty_image(self):
        img = Image.new("RGBA", (50, 50), (0, 0, 0, 0))
        sprites = sprite_splitter.extract_sprites(img)
        self.assertEqual(sprites, [])

    def test_sorted_by_area(self):
        img = _make_test_image_with_three_patches()
        sprites = sprite_splitter.extract_sprites(img, min_size=10)
        areas = [s.area for s in sprites]
        self.assertEqual(areas, sorted(areas, reverse=True))


# ------------------------------------------------------------------- split_sprites wrapper

class TestSplitSpritesWrapper(unittest.TestCase):
    """既存 CLI 関数 split_sprites() が後方互換で動くかの確認。"""

    def test_wrapper_saves_files(self):
        import tempfile
        import split_sprites as ss

        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "input.png")
            out_dir = os.path.join(tmp, "out")
            _make_test_image_with_three_patches().save(in_path)
            images = ss.split_sprites(in_path, out_dir, base_name="t", min_size=10, padding=2)
            self.assertEqual(len(images), 3)
            files = sorted(os.listdir(out_dir))
            self.assertEqual(len(files), 3)
            for f in files:
                self.assertTrue(f.startswith("t_"))
                self.assertTrue(f.endswith(".png"))

    def test_wrapper_flip_b(self):
        import tempfile
        import split_sprites as ss

        with tempfile.TemporaryDirectory() as tmp:
            in_path = os.path.join(tmp, "input.png")
            out_dir = os.path.join(tmp, "out")
            _make_test_image_with_three_patches().save(in_path)
            ss.split_sprites(in_path, out_dir, base_name="t", min_size=10, padding=2, flip_b=True)
            files = sorted(os.listdir(out_dir))
            self.assertEqual(len(files), 6)  # 3 sprites * 2 (A/B)
            self.assertTrue(any("_A.png" in f for f in files))
            self.assertTrue(any("_B.png" in f for f in files))


# -------------------------------------------------------------------- ai_namer

class TestAiNamer(unittest.TestCase):
    def test_parse_valid_json(self):
        text = (
            '{"base_name":"隠れクマの実","variant":"サプライズ",'
            '"filename":"kuma_mi_surprise","variant_candidates":["笑顔","驚き"],'
            '"confidence":0.8,"needs_user_input":false}'
        )
        r = ai_namer.parse_response(text)
        self.assertEqual(r.base_name, "隠れクマの実")
        self.assertEqual(r.variant, "サプライズ")
        self.assertEqual(r.filename, "kuma_mi_surprise")
        self.assertEqual(r.variant_candidates, ["笑顔", "驚き"])
        self.assertAlmostEqual(r.confidence, 0.8)
        self.assertFalse(r.needs_user_input)
        self.assertIsNone(r.error)

    def test_parse_fenced_json(self):
        text = '```json\n{"base_name":"a","variant":"b","filename":"a_b","confidence":0.5}\n```'
        r = ai_namer.parse_response(text)
        self.assertEqual(r.base_name, "a")
        self.assertEqual(r.filename, "a_b")

    def test_parse_surrounded_text(self):
        text = 'Sure! Here you go:\n{"base_name":"x","variant":"y","filename":"x_y"}\nDone.'
        r = ai_namer.parse_response(text)
        self.assertEqual(r.filename, "x_y")

    def test_parse_garbage(self):
        r = ai_namer.parse_response("this is not json at all")
        self.assertIsNotNone(r.error)
        self.assertEqual(r.raw_text, "this is not json at all")

    def test_parse_empty(self):
        r = ai_namer.parse_response("")
        self.assertIsNotNone(r.error)

    def test_filename_sanitize_japanese(self):
        # filename が日本語でも sanitize されて ascii に
        text = '{"base_name":"クマ","variant":"驚き","filename":"クマ 驚き!!","confidence":0.4}'
        r = ai_namer.parse_response(text)
        self.assertTrue(all(c.isascii() for c in r.filename), f"got: {r.filename}")
        # 空にはならない
        self.assertTrue(len(r.filename) > 0)

    def test_filename_empty_falls_back_to_base_variant(self):
        text = '{"base_name":"kuma","variant":"smile","filename":""}'
        r = ai_namer.parse_response(text)
        self.assertEqual(r.filename, "kuma_smile")

    def test_encode_png_roundtrip(self):
        img = Image.new("RGBA", (10, 10), (255, 0, 0, 255))
        b64 = ai_namer._encode_png(img)
        decoded = base64.b64decode(b64)
        back = Image.open(io.BytesIO(decoded))
        self.assertEqual(back.size, (10, 10))

    def test_request_retries_on_503(self):
        """_post_json をモック化して、503 後に 200 を返した時の挙動を確認。"""
        calls = []

        def fake_post(url, payload, timeout):
            calls.append(1)
            if len(calls) < 2:
                return 503, '{"error":"busy"}'
            return 200, '{"text":"{\\"base_name\\":\\"ok\\",\\"variant\\":\\"go\\",\\"filename\\":\\"ok_go\\"}"}'

        orig = ai_namer._post_json
        ai_namer._post_json = fake_post
        try:
            img = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
            # 0 秒の sleep のためにモック patch: 指数バックオフの sleep もスキップ
            import time as _time
            orig_sleep = _time.sleep
            _time.sleep = lambda s: None
            try:
                r = ai_namer.request_sprite_name(img, max_retries=3)
            finally:
                _time.sleep = orig_sleep
        finally:
            ai_namer._post_json = orig

        self.assertEqual(len(calls), 2)
        self.assertEqual(r.base_name, "ok")
        self.assertEqual(r.filename, "ok_go")

    def test_request_network_error(self):
        def fake_post(url, payload, timeout):
            return 0, "network error: ..."

        orig = ai_namer._post_json
        ai_namer._post_json = fake_post
        try:
            img = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
            import time as _time
            orig_sleep = _time.sleep
            _time.sleep = lambda s: None
            try:
                r = ai_namer.request_sprite_name(img, max_retries=2)
            finally:
                _time.sleep = orig_sleep
        finally:
            ai_namer._post_json = orig

        self.assertIsNotNone(r.error)


# -------------------------------------------------------------------- clean_edges

class TestCleanEdges(unittest.TestCase):
    def test_imports(self):
        self.assertTrue(hasattr(clean_edges, "process_auto_fake_bg"))
        self.assertTrue(hasattr(clean_edges, "process_rembg"))
        self.assertTrue(hasattr(clean_edges, "smooth_alpha"))
        self.assertTrue(hasattr(clean_edges, "_light_smooth"))
        self.assertTrue(hasattr(clean_edges, "checker_composite"))

    def test_auto_fake_bg_basic(self):
        img = Image.new("RGBA", (100, 100), (255, 0, 0, 255))
        d = ImageDraw.Draw(img)
        d.ellipse((30, 30, 70, 70), fill=(0, 0, 255, 255))
        d.ellipse((45, 45, 55, 55), fill=(255, 255, 255, 255))  # eye
        result = clean_edges.process_auto_fake_bg(img)
        import numpy as np
        arr = np.array(result)
        self.assertGreater(arr[50, 50, 3], 200)  # eye preserved
        self.assertEqual(arr[5, 5, 3], 0)        # corner removed
        self.assertGreater(arr[40, 50, 3], 200)  # fish body


# -------------------------------------------------------------------- GUI imports

class TestGuiImports(unittest.TestCase):
    def test_gui_module_imports(self):
        # GUI モジュールを import するだけ (tk.Tk() 作成なし)
        try:
            import clean_edges_gui  # noqa: F401
        except ImportError as e:
            self.skipTest(f"GUI import failed: {e}")
        except Exception as e:
            self.fail(f"unexpected error importing GUI: {e}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
