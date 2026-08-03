"""Compose a sharp vector-style India Gate wordmark (no pixelation)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
ASSETS = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin\assets"
)

W, H = 2000, 2200
SAFFRON = (232, 117, 28, 255)
GREEN = (19, 136, 8, 255)
CHAKRA = (0, 70, 160, 255)
IVORY = (255, 255, 255, 255)
INK = (18, 12, 10, 255)


def knock_black(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        if a < 40:
            return True
        return r <= 30 and g <= 30 and b <= 30

    for x in range(w):
        stack += [(x, 0), (x, h - 1)]
    for y in range(h):
        stack += [(0, y), (w - 1, y)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if visited[i]:
            continue
        if not is_bg(x, y):
            continue
        visited[i] = 1
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def load_namaste() -> Image.Image:
    src = ASSETS / "namaste-line-hq.png"
    nam = knock_black(Image.open(src))
    # Keep bright figure; discard leftover muddy dark interiors in top area
    px = nam.load()
    w, h = nam.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            # Normalize near-white to pure white
            if r + g + b > 420:
                px[x, y] = (*IVORY[:3], 255)
            # Drop dark muddy fills (keep only light figure + later black stroke)
            elif r + g + b < 120:
                px[x, y] = (0, 0, 0, 0)
    nam = nam.crop(nam.getbbox())
    target_w = 980
    scale = target_w / nam.width
    nam = nam.resize((target_w, int(nam.height * scale)), Image.Resampling.LANCZOS)
    return nam


def brush_band(draw: ImageDraw.ImageDraw, y: int, color: tuple[int, int, int, int], thickness: int) -> None:
    # Organic horizontal stroke via overlapping ellipses
    cx = W // 2
    for i, (ox, oy, tw, th) in enumerate(
        [
            (-420, 0, 980, thickness),
            (-280, -8, 720, thickness + 10),
            (40, 6, 760, thickness - 4),
            (-80, -4, 880, thickness + 4),
        ]
    ):
        draw.ellipse(
            (cx + ox, y + oy, cx + ox + tw, y + oy + th),
            fill=color,
        )


def draw_chakra(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=CHAKRA, width=7)
    draw.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), outline=CHAKRA, width=3)
    draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=CHAKRA)
    for i in range(24):
        ang = math.radians(i * (360 / 24))
        x2 = cx + int((r - 14) * math.cos(ang))
        y2 = cy + int((r - 14) * math.sin(ang))
        draw.line((cx, cy, x2, y2), fill=CHAKRA, width=3)


def outline(im: Image.Image, radius: int = 4) -> Image.Image:
    alpha = im.split()[-1]
    pad = radius + 8
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    black = Image.new("RGBA", im.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    offsets = [
        (dx, dy)
        for dx in range(-radius, radius + 1)
        for dy in range(-radius, radius + 1)
        if 0 < dx * dx + dy * dy <= radius * radius
    ]
    for dx, dy in offsets:
        out.alpha_composite(black, (pad + dx, pad + dy))
    out.alpha_composite(im, (pad, pad))
    return out


def main() -> None:
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    namaste = load_namaste()
    nx = (W - namaste.width) // 2
    ny = 80
    canvas.alpha_composite(namaste, (nx, ny))

    # Flag brushes
    band_y = ny + namaste.height + 40
    brush_band(draw, band_y, SAFFRON, 78)
    brush_band(draw, band_y + 92, GREEN, 78)

    # Fonts
    script = ImageFont.truetype(r"C:\Windows\Fonts\segoescb.ttf", 168)
    try:
        script = ImageFont.truetype(r"C:\Windows\Fonts\segoesc.ttf", 172)
    except OSError:
        pass
    sans = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 42)

    # India Gate text
    left = "India"
    right = "Gate"
    gap = 130
    lb = draw.textbbox((0, 0), left, font=script)
    rb = draw.textbbox((0, 0), right, font=script)
    lw, lh = lb[2] - lb[0], lb[3] - lb[1]
    rw = rb[2] - rb[0]
    total = lw + gap + rw
    tx = (W - total) // 2
    ty = band_y + 18
    # Soft ivory fill with dark edge via double draw
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2)):
        draw.text((tx + ox, ty + oy), left, font=script, fill=(0, 0, 0, 255))
        draw.text((tx + lw + gap + ox, ty + oy), right, font=script, fill=(0, 0, 0, 255))
    draw.text((tx, ty), left, font=script, fill=IVORY)
    draw.text((tx + lw + gap, ty), right, font=script, fill=IVORY)

    # Chakra between words
    draw_chakra(draw, tx + lw + gap // 2, ty + lh // 2 + 8, 48)

    # Subtitle
    sub = "TRES HERMANOS BOADILLA"
    sb = draw.textbbox((0, 0), sub, font=sans)
    sw = sb[2] - sb[0]
    sx = (W - sw) // 2
    sy = band_y + 200
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        draw.text((sx + ox, sy + oy), sub, font=sans, fill=(0, 0, 0, 255))
    draw.text((sx, sy), sub, font=sans, fill=IVORY)

    # Crop to content + outline
    bbox = canvas.getbbox()
    assert bbox
    logo = canvas.crop(bbox)
    # pad before outline
    pad = 24
    padded = Image.new("RGBA", (logo.width + pad * 2, logo.height + pad * 2), (0, 0, 0, 0))
    padded.alpha_composite(logo, (pad, pad))
    final = outline(padded, radius=5)
    # gentle sharpen
    rgb = final.convert("RGB")
    sharp = ImageEnhance.Sharpness(rgb).enhance(1.15)
    final = Image.merge("RGBA", (*sharp.split(), final.split()[-1]))

    BRAND.mkdir(parents=True, exist_ok=True)
    final.save(BRAND / "wordmark.png", optimize=True)
    final.save(BRAND / "india-gate-logo.png", optimize=True)

    # Navbar mark from namaste
    mark_src = outline(namaste, radius=4)
    side = max(mark_src.size) + 60
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(
        mark_src,
        ((side - mark_src.width) // 2, (side - mark_src.height) // 2),
    )
    sq.resize((512, 512), Image.Resampling.LANCZOS).save(BRAND / "mark.png", optimize=True)
    sq.resize((128, 128), Image.Resampling.LANCZOS).save(BRAND / "favicon.png", optimize=True)

    print("COMPOSED", final.size, (BRAND / "wordmark.png").stat().st_size)


if __name__ == "__main__":
    main()
