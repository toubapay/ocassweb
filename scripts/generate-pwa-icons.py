#!/usr/bin/env python3
"""Generates the PWA/favicon icon set from scratch (no source logo file
exists in this repo). Draws a simple rounded-square monogram matching the
brand green already used for theme-color/primary.main (#0FAE58, from
src/theme/theme.js) and the Ecommerce module tile. Re-run this after
changing the brand color or wordmark - it's a build-time asset generator,
not something imported at runtime.
"""
from PIL import Image, ImageDraw, ImageFont

BRAND_GREEN = (15, 174, 88, 255)  # #0FAE58
WHITE = (255, 255, 255, 255)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def rounded_icon(size, corner_ratio=0.22, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if maskable:
        # Maskable icons get cropped to a circle by the OS - keep the
        # background a full bleed square (no rounded corners/transparency)
        # and the glyph within the safe zone (inner ~80%).
        draw.rectangle([0, 0, size, size], fill=BRAND_GREEN)
        glyph_scale = 0.5
    else:
        radius = int(size * corner_ratio)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BRAND_GREEN)
        glyph_scale = 0.58

    font_size = int(size * glyph_scale)
    font = ImageFont.truetype(FONT_PATH, font_size)
    text = "O"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]),
        text,
        font=font,
        fill=WHITE,
    )
    return img


def main():
    sizes = {
        "public/icons/icon-192.png": (192, False),
        "public/icons/icon-512.png": (512, False),
        "public/icons/maskable-icon-512.png": (512, True),
        "public/apple-touch-icon.png": (180, False),
    }
    for path, (size, maskable) in sizes.items():
        icon = rounded_icon(size, maskable=maskable)
        icon.save(path)
        print(f"wrote {path} ({size}x{size}{', maskable' if maskable else ''})")

    # favicon.ico: a multi-resolution ICO built from a few small PNG sizes.
    favicon_sizes = [16, 32, 48]
    base = rounded_icon(256)
    base.save(
        "public/favicon.ico",
        sizes=[(s, s) for s in favicon_sizes],
    )
    print("wrote public/favicon.ico")


if __name__ == "__main__":
    main()
