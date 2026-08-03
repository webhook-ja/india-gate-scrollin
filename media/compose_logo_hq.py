"""Build sharp India Gate wordmark: HQ namaste + crisp vector text/flag."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
ASSETS = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin\assets"
)


def knock_black(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a < 40 or (r <= 28 and g <= 28 and b <= 28)

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


def outline(im: Image.Image, radius: int = 3) -> Image.Image:
    alpha = im.split()[-1]
    pad = radius + 6
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    black = Image.new("RGBA", im.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            if 0 < dx * dx + dy * dy <= radius * radius:
                out.alpha_composite(black, (pad + dx, pad + dy))
    out.alpha_composite(im, (pad, pad))
    return out


def main() -> None:
    nam = knock_black(Image.open(ASSETS / "namaste-wire-hq.png"))
    nam = outline(nam, radius=4)
    nam = nam.resize(
        (1100, int(1100 * nam.height / nam.width)),
        Image.Resampling.LANCZOS,
    )

    W, H = 1800, 1960
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(nam, ((W - nam.width) // 2, 40))
    d = ImageDraw.Draw(canvas)

    def band(y: int, color: tuple[int, int, int, int], t: int) -> None:
        cx = W // 2
        for ox, oy, tw, th in (
            (-520, -6, 1100, t),
            (-360, 8, 900, t + 12),
            (40, -4, 980, t),
            (-120, 4, 1000, t + 6),
        ):
            d.ellipse((cx + ox, y + oy, cx + ox + tw, y + oy + th), fill=color)

    band(1180, (232, 117, 28, 255), 90)
    band(1300, (19, 136, 8, 255), 90)

    script = ImageFont.truetype(r"C:\Windows\Fonts\segoesc.ttf", 150)
    sans = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 44)

    left, right = "India", "Gate"
    lb = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), left, font=script)
    rb = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), right, font=script)
    lw, rw = lb[2] - lb[0], rb[2] - rb[0]
    gap = 160
    total = lw + gap + rw
    tx = (W - total) // 2
    ty = 1200

    for ox, oy in ((-3, 0), (3, 0), (0, -3), (0, 3)):
        d.text((tx + ox, ty + oy), left, font=script, fill=(0, 0, 0, 255))
        d.text((tx + lw + gap + ox, ty + oy), right, font=script, fill=(0, 0, 0, 255))
    d.text((tx, ty), left, font=script, fill=(247, 241, 230, 255))
    d.text((tx + lw + gap, ty), right, font=script, fill=(247, 241, 230, 255))

    cx = tx + lw + gap // 2
    cy = ty + (lb[3] - lb[1]) // 2 + 8
    r = 52
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(0, 70, 160, 255), width=8)
    d.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=(0, 70, 160, 255))
    for i in range(24):
        a = math.radians(i * 15)
        d.line(
            (
                cx,
                cy,
                cx + int((r - 14) * math.cos(a)),
                cy + int((r - 14) * math.sin(a)),
            ),
            fill=(0, 70, 160, 255),
            width=3,
        )

    sub = "TRES HERMANOS BOADILLA"
    bb = d.textbbox((0, 0), sub, font=sans)
    sx = (W - (bb[2] - bb[0])) // 2
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        d.text((sx + ox, 1460 + oy), sub, font=sans, fill=(0, 0, 0, 255))
    d.text((sx, 1460), sub, font=sans, fill=(247, 241, 230, 255))

    final = outline(canvas.crop(canvas.getbbox()), radius=4)
    BRAND.mkdir(parents=True, exist_ok=True)
    final.save(BRAND / "wordmark.png", optimize=True)
    final.save(BRAND / "india-gate-logo.png", optimize=True)

    top = final.crop((0, 0, final.width, int(final.height * 0.55)))
    tb = top.getbbox()
    if tb:
        top = top.crop(tb)
    side = max(top.size) + 70
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(top, ((side - top.width) // 2, (side - top.height) // 2))
    sq.resize((512, 512), Image.Resampling.LANCZOS).save(BRAND / "mark.png", optimize=True)
    sq.resize((128, 128), Image.Resampling.LANCZOS).save(BRAND / "favicon.png", optimize=True)

    # Also ship SVG text mark for infinite sharpness of wordmark zone
    (BRAND / "wordmark.svg").write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" role="img" aria-label="India Gate">
  <defs>
    <filter id="s" x="-10%" y="-10%" width="120%" height="120%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.8" result="d"/>
      <feFlood flood-color="#000"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#s)">
    <path d="M70 110c90-34 190-40 300-18 85 16 160 8 250-14 45-10 80-6 100 8-40 28-110 42-205 36-105-6-210 10-295 24-48 8-85 2-150-12z" fill="#E8751C"/>
    <path d="M75 190c95-28 195-36 310-16 90 16 170 6 255-14 40-8 75-4 95 10-42 26-115 40-210 34-110-6-215 12-300 22-50 6-88 0-150-14z" fill="#138808"/>
    <g transform="translate(450 158)">
      <circle r="34" fill="none" stroke="#0047A0" stroke-width="5"/>
      <circle r="8" fill="#0047A0"/>
    </g>
    <text x="250" y="175" text-anchor="middle" fill="#F7F1E6" font-family="Georgia, serif" font-size="78" font-style="italic" font-weight="700">India</text>
    <text x="650" y="175" text-anchor="middle" fill="#F7F1E6" font-family="Georgia, serif" font-size="78" font-style="italic" font-weight="700">Gate</text>
    <text x="450" y="280" text-anchor="middle" fill="#F7F1E6" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="7">TRES HERMANOS BOADILLA</text>
  </g>
</svg>
""",
        encoding="utf-8",
    )
    print("OK", final.size, (BRAND / "wordmark.png").stat().st_size)


if __name__ == "__main__":
    main()
