#!/usr/bin/env python3
"""Generate PWA icon PNGs for SafeLink India.

Produces 192x192 and 512x512 icons with saffron (#FF9933) background
and white "SL" text. Uses Pillow if available, otherwise falls back
to a stdlib-only PNG writer (struct + zlib).
"""

import os
import sys

ICON_SIZES = [192, 512]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
BG_COLOR = (255, 153, 51)       # #FF9933 saffron orange
TEXT_COLOR = (255, 255, 255)     # white

# Hardcoded 5x7 bitmap glyphs for S and L
GLYPH_S = [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
]

GLYPH_L = [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
]


def generate_with_pillow(size, output_path):
    """Generate icon using Pillow for better quality."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Try to use a built-in font at appropriate size
    font_size = int(size * 0.45)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            # Fall back to default font scaled up
            font = ImageFont.load_default()

    text = "SL"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]
    draw.text((x, y), text, fill=TEXT_COLOR, font=font)

    img.save(output_path, "PNG")


def generate_with_stdlib(size, output_path):
    """Generate icon using only Python stdlib (struct + zlib)."""
    import struct
    import zlib

    # Determine scale factor for glyphs
    # Glyphs are 5 wide x 7 tall. Two glyphs + 1 col gap = 11 cols, 7 rows.
    # We want text to occupy roughly 50% of the icon.
    text_area = int(size * 0.5)
    scale = max(1, text_area // 11)  # scale per glyph pixel

    glyph_w = 5 * scale
    glyph_h = 7 * scale
    gap = 1 * scale  # gap between S and L

    total_text_w = glyph_w + gap + glyph_w
    total_text_h = glyph_h

    # Starting position to center text
    start_x = (size - total_text_w) // 2
    start_y = (size - total_text_h) // 2

    # Build pixel data
    width = size
    height = size

    # Create flat pixel array (row-major, RGB)
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            # Check if pixel is in glyph area
            color = BG_COLOR
            # S glyph
            gx = x - start_x
            gy = y - start_y
            if 0 <= gx < glyph_w and 0 <= gy < glyph_h:
                cx = gx // scale
                cy = gy // scale
                if GLYPH_S[cy][cx]:
                    color = TEXT_COLOR
            # L glyph
            lx = x - (start_x + glyph_w + gap)
            ly = y - start_y
            if 0 <= lx < glyph_w and 0 <= ly < glyph_h:
                cx = lx // scale
                cy = ly // scale
                if GLYPH_L[cy][cx]:
                    color = TEXT_COLOR
            row.append(color)
        pixels.append(row)

    # Build PNG file
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + chunk + crc

    # PNG signature
    signature = b"\x89PNG\r\n\x1a\n"

    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b"IHDR", ihdr_data)

    # IDAT - build raw scanlines
    raw_data = bytearray()
    for row in pixels:
        raw_data.append(0)  # filter byte: None
        for r, g, b in row:
            raw_data.append(r)
            raw_data.append(g)
            raw_data.append(b)

    compressed = zlib.compress(bytes(raw_data), 9)
    idat = make_chunk(b"IDAT", compressed)

    # IEND
    iend = make_chunk(b"IEND", b"")

    with open(output_path, "wb") as f:
        f.write(signature + ihdr + idat + iend)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Check if Pillow is available
    try:
        import PIL  # noqa: F401
        use_pillow = True
        print("Using Pillow for icon generation")
    except ImportError:
        use_pillow = False
        print("Pillow not available, using stdlib PNG writer")

    for size in ICON_SIZES:
        output_path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")
        if use_pillow:
            generate_with_pillow(size, output_path)
        else:
            generate_with_stdlib(size, output_path)
        file_size = os.path.getsize(output_path)
        print(f"Generated {output_path} ({size}x{size}, {file_size} bytes)")

    print("Done.")


if __name__ == "__main__":
    main()
