from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).with_name("green_bean_cut_pieces_alpha.png")
DEST = ROOT / "assets/images/bento/cooking/ninjin_ingen/pieces"


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value >= 12 else 0).getbbox()
    if bbox is None:
        raise RuntimeError("No visible green-bean pixels found in sheet cell")
    return bbox


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    cell_width = sheet.width / 2
    cell_height = sheet.height / 5
    DEST.mkdir(parents=True, exist_ok=True)

    index = 1
    for row in range(5):
        for column in range(2):
            cell = sheet.crop((
                round(column * cell_width),
                round(row * cell_height),
                round((column + 1) * cell_width),
                round((row + 1) * cell_height),
            ))
            left, top, right, bottom = alpha_bbox(cell)
            padding = 6
            piece = cell.crop((
                max(0, left - padding),
                max(0, top - padding),
                min(cell.width, right + padding),
                min(cell.height, bottom + padding),
            ))
            if piece.width > 264:
                height = max(1, round(piece.height * 264 / piece.width))
                piece = piece.resize((264, height), Image.Resampling.LANCZOS)
            framed = Image.new("RGBA", (piece.width + 8, piece.height + 8), (0, 0, 0, 0))
            framed.alpha_composite(piece, (4, 4))
            output = DEST / f"green_bean_piece_{index:02d}.png"
            framed.save(output, optimize=True)
            index += 1


if __name__ == "__main__":
    main()
