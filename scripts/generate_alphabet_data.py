"""
Generate HanziWriter-compatible JSON data for English letters and digits
from Hershey Simplex (futural) font data.

Usage:
    python scripts/generate_alphabet_data.py
    -> prints INLINE_CHAR_DATA JavaScript object to stdout

    python scripts/generate_alphabet_data.py --embed index.html
    -> inserts data into index.html
"""

import math
import json
import sys
import os

# ===== Configuration =====
SCALE = 27.0          # Hershey units -> HanziWriter 1024 units
X_OFFSET = 512.0      # Center X in 1024 space
Y_OFFSET = 480.0      # Center Y in 1024 space (baseline ~237, ascender ~804)
HALF_WIDTH = 28.0     # Half-width of stroke outline (total width ~56 units)
RESAMPLE_SPACING = 40  # Minimum spacing between median points

# Characters to generate
TARGET_CHARS = (
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
)

# ===== JHF Parsing =====

def load_jhf(filepath):
    """Load JHF file and return list of lines."""
    with open(filepath, 'r') as f:
        return f.readlines()


def parse_jhf_line(line):
    """
    Parse a single JHF line into a list of strokes.
    Each stroke is a list of (x, y) tuples in Hershey coordinates.

    JHF format:
    - Cols 0-4: glyph ID (always "12345")
    - Cols 5-7: vertex count (including bounds pair)
    - Col 8: left boundary char
    - Col 9: right boundary char
    - Col 10+: coordinate pairs as ASCII char pairs
    - " R" = pen-up (stroke separator)
    """
    line = line.rstrip('\n\r')
    if len(line) < 10:
        return []

    # Data starts at column 10
    data = line[10:]

    strokes = []
    current_stroke = []

    i = 0
    while i < len(data):
        c1 = data[i]
        if i + 1 >= len(data):
            break
        c2 = data[i + 1]

        # Check for pen-up marker: space followed by R
        if c1 == ' ' and c2 == 'R':
            if current_stroke:
                strokes.append(current_stroke)
                current_stroke = []
            i += 2
            continue

        # Decode coordinate pair
        x = ord(c1) - ord('R')
        y = ord(c2) - ord('R')
        current_stroke.append((x, y))
        i += 2

    if current_stroke:
        strokes.append(current_stroke)

    return strokes


def get_char_line_index(char):
    """Get the 0-based line index in the JHF file for a given ASCII character."""
    return ord(char) - 32


# ===== Coordinate Transformation =====

def transform_point(x, y):
    """Convert Hershey coordinates to HanziWriter 1024x1024 space."""
    # Flip Y (Hershey Y goes down, HanziWriter Y goes up)
    # Scale and offset
    hx = round(x * SCALE + X_OFFSET)
    hy = round(-y * SCALE + Y_OFFSET)
    return (hx, hy)


# ===== Resampling =====

def resample_stroke(points, min_spacing=RESAMPLE_SPACING):
    """
    Resample a stroke to ensure points are spaced at most min_spacing apart.
    This helps HanziWriter's quiz validation work better with straight lines.
    """
    if len(points) < 2:
        return points

    resampled = [points[0]]

    for i in range(1, len(points)):
        px, py = resampled[-1]
        nx, ny = points[i]
        dist = math.hypot(nx - px, ny - py)

        if dist > min_spacing:
            # Insert intermediate points
            num_segments = max(2, int(math.ceil(dist / min_spacing)))
            for j in range(1, num_segments):
                t = j / num_segments
                ix = px + (nx - px) * t
                iy = py + (ny - py) * t
                resampled.append((round(ix), round(iy)))

        resampled.append(points[i])

    return resampled


# ===== Stroke Outline Generation =====

def generate_outline_path(points, half_w=HALF_WIDTH):
    """
    Generate a closed SVG path string representing a thick stroke
    around the given center-line points.

    Uses perpendicular offset with round end caps.
    """
    if len(points) < 2:
        # Single point: generate a circle
        cx, cy = points[0]
        r = half_w
        return (
            f"M {cx-r:.0f} {cy:.0f} "
            f"A {r:.0f} {r:.0f} 0 1 1 {cx+r:.0f} {cy:.0f} "
            f"A {r:.0f} {r:.0f} 0 1 1 {cx-r:.0f} {cy:.0f} Z"
        )

    left_side = []
    right_side = []

    for i in range(len(points)):
        px, py = points[i]

        # Compute tangent direction
        if i == 0:
            dx = points[1][0] - px
            dy = points[1][1] - py
        elif i == len(points) - 1:
            dx = px - points[-2][0]
            dy = py - points[-2][1]
        else:
            dx = points[i + 1][0] - points[i - 1][0]
            dy = points[i + 1][1] - points[i - 1][1]

        length = math.hypot(dx, dy)
        if length < 0.001:
            # Skip zero-length segments
            if left_side:
                left_side.append(left_side[-1])
                right_side.append(right_side[-1])
            continue

        # Perpendicular normal (rotate tangent 90 degrees)
        nx = -dy / length
        ny = dx / length

        left_side.append((px + nx * half_w, py + ny * half_w))
        right_side.append((px - nx * half_w, py - ny * half_w))

    if not left_side:
        return ""

    # Build SVG path: left forward, end cap arc, right backward, start cap arc
    parts = []

    # Move to first left point
    parts.append(f"M {left_side[0][0]:.0f} {left_side[0][1]:.0f}")

    # Draw left side forward
    for x, y in left_side[1:]:
        parts.append(f"L {x:.0f} {y:.0f}")

    # End cap (semicircle from last left to last right)
    parts.append(
        f"A {half_w:.0f} {half_w:.0f} 0 0 1 "
        f"{right_side[-1][0]:.0f} {right_side[-1][1]:.0f}"
    )

    # Draw right side backward
    for x, y in reversed(right_side[:-1]):
        parts.append(f"L {x:.0f} {y:.0f}")

    # Start cap (semicircle from first right back to first left)
    parts.append(
        f"A {half_w:.0f} {half_w:.0f} 0 0 1 "
        f"{left_side[0][0]:.0f} {left_side[0][1]:.0f}"
    )

    parts.append("Z")
    return " ".join(parts)


# ===== Main Generation =====

def build_character_data(char, jhf_lines):
    """Build HanziWriter JSON data for a single character."""
    line_idx = get_char_line_index(char)
    if line_idx < 0 or line_idx >= len(jhf_lines):
        return None

    raw_strokes = parse_jhf_line(jhf_lines[line_idx])
    if not raw_strokes:
        return None

    strokes_svg = []
    medians_data = []

    for raw_pts in raw_strokes:
        if not raw_pts:
            continue

        # Transform to HanziWriter coordinates
        hw_pts = [transform_point(x, y) for x, y in raw_pts]

        # Resample for better quiz validation
        hw_pts_resampled = resample_stroke(hw_pts)

        # Generate median (center-line points as [[x,y], ...])
        median = [[p[0], p[1]] for p in hw_pts_resampled]
        medians_data.append(median)

        # Generate stroke outline SVG path
        stroke_svg = generate_outline_path(hw_pts_resampled)
        strokes_svg.append(stroke_svg)

    if not strokes_svg:
        return None

    return {
        "strokes": strokes_svg,
        "medians": medians_data
    }


def generate_all(jhf_filepath):
    """Generate data for all target characters."""
    jhf_lines = load_jhf(jhf_filepath)

    result = {}
    for char in TARGET_CHARS:
        data = build_character_data(char, jhf_lines)
        if data:
            result[char] = data
        else:
            print(f"WARNING: No data for '{char}'", file=sys.stderr)

    return result


def output_js(data):
    """Output as JavaScript variable assignment."""
    print("const INLINE_CHAR_DATA = {")
    items = list(data.items())
    for i, (char, char_data) in enumerate(items):
        # Escape the character for JS string key
        key = json.dumps(char)
        val = json.dumps(char_data, separators=(',', ':'))
        comma = ',' if i < len(items) - 1 else ''
        print(f"  {key}: {val}{comma}")
    print("};")


def embed_in_html(data, html_path):
    """Insert INLINE_CHAR_DATA into index.html before CATEGORIES definition."""
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Generate JS block
    lines = ["// ===== Inline Character Data for Alphabet & Numbers ====="]
    lines.append("const INLINE_CHAR_DATA = {")
    items = list(data.items())
    for i, (char, char_data) in enumerate(items):
        key = json.dumps(char)
        val = json.dumps(char_data, separators=(',', ':'))
        comma = ',' if i < len(items) - 1 else ''
        lines.append(f"  {key}: {val}{comma}")
    lines.append("};")
    lines.append("")
    js_block = '\n'.join(lines)

    # Find insertion point: before "// ===== Character data =====" or "const CATEGORIES"
    marker = "// ===== Character data ====="
    if marker not in html:
        marker = "const CATEGORIES"

    if marker not in html:
        print("ERROR: Could not find insertion point in HTML", file=sys.stderr)
        sys.exit(1)

    # Check if already embedded
    if "INLINE_CHAR_DATA" in html:
        # Replace existing block
        import re
        html = re.sub(
            r'// ===== Inline Character Data.*?^};$\n\n',
            js_block + '\n',
            html,
            flags=re.MULTILINE | re.DOTALL
        )
    else:
        # Insert before marker
        html = html.replace(marker, js_block + '\n' + marker)

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Embedded {len(data)} characters into {html_path}", file=sys.stderr)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    jhf_path = os.path.join(script_dir, 'futural.jhf')

    if not os.path.exists(jhf_path):
        print(f"ERROR: {jhf_path} not found. Download it first:", file=sys.stderr)
        print("  curl -sL https://raw.githubusercontent.com/kamalmostafa/hershey-fonts/master/hershey-fonts/futural.jhf -o scripts/futural.jhf", file=sys.stderr)
        sys.exit(1)

    data = generate_all(jhf_path)
    print(f"Generated data for {len(data)} characters", file=sys.stderr)

    if len(sys.argv) > 2 and sys.argv[1] == '--embed':
        embed_in_html(data, sys.argv[2])
    else:
        output_js(data)


if __name__ == '__main__':
    main()
