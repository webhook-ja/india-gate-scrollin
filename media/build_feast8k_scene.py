"""Keep original logo + build 8K feast scene-00 still and brand assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
STILLS = ROOT / "public" / "scroll-world" / "stills"
ASSETS = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin\assets"
)

LOGO_SRC = ASSETS / (
    "c__Users_TRENDING_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    "a27f9de6da7d38250c6e1c4647aea3bb_images_logo-removebg-preview-"
    "9edfd224-6bc5-4358-9497-9b32941e6186.png"
)
FEAST_SRC = ASSETS / "feast-8k.png"


def knock_black_edges(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        if a < 40:
            return True
        return r <= 28 and g <= 28 and b <= 28

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


def thin_black_outline(im: Image.Image, radius: int = 2) -> Image.Image:
    alpha = im.split()[-1]
    pad = radius + 4
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    black = Image.new("RGBA", im.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            if 0 < dx * dx + dy * dy <= radius * radius:
                out.alpha_composite(black, (pad + dx, pad + dy))
    out.alpha_composite(im, (pad, pad))
    return out


def build_feast_still(feast: Image.Image) -> Image.Image:
    W, H = 1440, 1800
    feast = feast.convert("RGB")
    # Mild clarity without deep-fry
    feast = ImageEnhance.Sharpness(feast).enhance(1.12)
    feast = ImageEnhance.Contrast(feast).enhance(1.06)
    feast = ImageEnhance.Color(feast).enhance(1.05)

    bg = ImageOps.fit(feast, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(22))).enhance(0.45)

    # Cover-width sharp plate
    fw = W
    fh = int(feast.height * (fw / feast.width))
    fg = feast.resize((fw, fh), Image.Resampling.LANCZOS)
    if fh > H:
        top = (fh - H) // 2
        fg = fg.crop((0, top, fw, top + H))
        fh, y = H, 0
    else:
        y = (H - fh) // 2

    canvas = bg.convert("RGBA")
    fg_rgba = fg.convert("RGBA")
    mask = Image.new("L", (fw, fh), 255)
    md = ImageDraw.Draw(mask)
    fade = max(40, fh // 10)
    for i in range(fade):
        a = int(255 * (i / fade))
        md.rectangle((0, i, fw, i + 1), fill=a)
        md.rectangle((0, fh - i - 1, fw, fh - i), fill=a)
    fg_rgba.putalpha(mask)
    plate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    plate.paste(fg_rgba, (0, y), fg_rgba)
    canvas = Image.alpha_composite(canvas, plate)

    # Soft vignette / stage for logo readability
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(120):
        a = int(150 * (i / 120) ** 1.45)
        od.rectangle((0, H - 120 + i, W, H - 119 + i), fill=(10, 3, 5, a))
    for i in range(50):
        a = int(55 * (i / 50) ** 1.3)
        od.rectangle((0, i, W, i + 1), fill=(10, 3, 5, a))
    for i in range(40):
        a = int(40 * (i / 40) ** 1.3)
        od.rectangle((i, 0, i + 1, H), fill=(10, 3, 5, a))
        od.rectangle((W - i - 1, 0, W - i, H), fill=(10, 3, 5, a))
    canvas = Image.alpha_composite(canvas, overlay)
    return canvas.convert("RGB")


def main() -> None:
    assert LOGO_SRC.exists(), LOGO_SRC
    assert FEAST_SRC.exists(), FEAST_SRC

    # Original logo preserved
    logo = knock_black_edges(Image.open(LOGO_SRC))
    # Upscale original carefully for retina (no invention — LANCZOS only)
    target = 1200
    scale = target / max(logo.size)
    if scale > 1:
        logo = logo.resize(
            (int(logo.width * scale), int(logo.height * scale)),
            Image.Resampling.LANCZOS,
        )
    logo = thin_black_outline(logo, radius=2)

    BRAND.mkdir(parents=True, exist_ok=True)
    STILLS.mkdir(parents=True, exist_ok=True)
    logo.save(BRAND / "wordmark.png", optimize=True)
    logo.save(BRAND / "india-gate-logo.png", optimize=True)

    # Navbar mark = namaste crop
    nw, nh = logo.size
    top = logo.crop((0, 0, nw, int(nh * 0.5)))
    tb = top.getbbox()
    if tb:
        top = top.crop(tb)
    side = max(top.size) + 48
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(top, ((side - top.width) // 2, (side - top.height) // 2 + 4))
    sq.resize((512, 512), Image.Resampling.LANCZOS).save(BRAND / "mark.png", optimize=True)
    sq.resize((128, 128), Image.Resampling.LANCZOS).save(BRAND / "favicon.png", optimize=True)

    still = build_feast_still(Image.open(FEAST_SRC))
    still.save(STILLS / "scene-00-brand.png", quality=95)
    still.save(STILLS / "poster-dive-00.png", quality=95)
    # Keep a master feast copy in media
    media = ROOT / "media" / "classy"
    media.mkdir(parents=True, exist_ok=True)
    Image.open(FEAST_SRC).save(media / "feast-8k.png", quality=95)

    print("LOGO", logo.size, (BRAND / "wordmark.png").stat().st_size)
    print("STILL", still.size, (STILLS / "scene-00-brand.png").stat().st_size)
    print("FEAST8K_DONE")


if __name__ == "__main__":
    main()
