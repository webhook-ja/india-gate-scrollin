"""Remove white bg from India Gate logo, HQ upscale, extract white namaste mark."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin"
    r"\assets\c__Users_TRENDING_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"a27f9de6da7d38250c6e1c4647aea3bb_images_logo-9b1e388a-522f-4401-bcb5-1e5d32126de3.png"
)
BRAND = ROOT / "public" / "brand"


def knock_white(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    colorfulness = np.max(arr[..., :3], axis=2) - np.min(arr[..., :3], axis=2)
    keep_color = colorfulness > 28
    is_white = (r > 240) & (g > 240) & (b > 240)

    alpha = a.copy()
    alpha[is_white & ~keep_color] = 0
    alpha = np.where(keep_color, np.maximum(alpha, 255), alpha)
    mask_light = (~keep_color) & (lum > 200)
    alpha = np.where(mask_light, np.clip((250 - lum) / 50.0 * 255.0, 0, 255), alpha)
    alpha[is_white & ~keep_color] = 0

    out = arr.copy()
    out[..., 3] = alpha
    out[alpha < 1, 0:3] = 0
    base = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = base.getbbox()
    return base.crop(bbox) if bbox else base


def to_white_strokes(im: Image.Image) -> Image.Image:
    narr = np.array(im.convert("RGBA")).astype(np.float32)
    nr, ng, nb, na = narr[..., 0], narr[..., 1], narr[..., 2], narr[..., 3]
    dark = (nr + ng + nb) / 3.0
    stroke_a = np.clip((180.0 - dark) / 180.0, 0.0, 1.0) * (na / 255.0)
    white = np.zeros_like(narr)
    white[..., 0] = 255
    white[..., 1] = 255
    white[..., 2] = 247
    white[..., 3] = np.clip(stroke_a * 255.0, 0, 255)
    white[white[..., 3] < 18, 3] = 0
    return Image.fromarray(white.astype(np.uint8), "RGBA")


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    cropped = knock_white(Image.open(SRC))
    pad = 48
    canvas = Image.new(
        "RGBA",
        (cropped.width + pad * 2, cropped.height + pad * 2),
        (0, 0, 0, 0),
    )
    canvas.paste(cropped, (pad, pad), cropped)

    # 4x LANCZOS for zoom headroom
    target_w = max(2000, canvas.width * 4)
    scale = target_w / canvas.width
    hq = canvas.resize(
        (int(canvas.width * scale), int(canvas.height * scale)),
        Image.Resampling.LANCZOS,
    )
    hq = hq.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=2))
    logo_path = BRAND / "brand-logo.png"
    hq.save(logo_path, "PNG", optimize=True)
    print("brand-logo", hq.size, logo_path.stat().st_size)

    # Split before saffron band
    px = np.array(hq)
    h = hq.height
    rows: list[int] = []
    for y in range(h):
        row = px[y]
        arow = row[:, 3] > 40
        if not arow.any():
            continue
        cols = row[arow]
        orange = (
            (cols[:, 0] > 180)
            & (cols[:, 1] > 60)
            & (cols[:, 1] < 200)
            & (cols[:, 2] < 120)
        ).mean()
        if orange > 0.08:
            rows.append(y)
    split_y = rows[0] - int(0.02 * h) if rows else int(h * 0.55)
    nam = hq.crop((0, 0, hq.width, max(40, split_y)))
    nb = nam.getbbox()
    if nb:
        nam = nam.crop(nb)

    nam_white = to_white_strokes(nam)
    nw, nh = nam_white.size
    side = max(nw, nh) + 40
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(nam_white, ((side - nw) // 2, (side - nh) // 2), nam_white)

    mark = sq.resize((256, 256), Image.Resampling.LANCZOS)
    mark_path = BRAND / "nav-namaste.png"
    mark.save(mark_path, "PNG", optimize=True)
    sq.resize((512, 512), Image.Resampling.LANCZOS).save(
        BRAND / "namaste-white.png", "PNG", optimize=True
    )
    print("nav-namaste", mark.size, mark_path.stat().st_size)
    print("split_y", split_y, "nam", nam.size)
    print("DONE")


if __name__ == "__main__":
    main()
