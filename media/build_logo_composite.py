"""Build HQ transparent India Gate wordmark + convert logo2.ply center splat."""
from __future__ import annotations

import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
ASSETS = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin\assets"
)
SRC_LOGO = ASSETS / (
    "c__Users_TRENDING_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    "a27f9de6da7d38250c6e1c4647aea3bb_images_india_gate_logo-6897b847-be19-47b0-ae82-758093a376fa.png"
)
PLY = Path(r"c:\Users\TRENDING PC\Documents\servicios\indiagate\logo2.ply")
SH_C0 = 0.28209479177387814
ROW_OUT = 32


def knock_white(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    color = np.max(arr[..., :3], axis=2) - np.min(arr[..., :3], axis=2)
    keep = (color > 18) | (lum < 210)
    alpha = np.where(keep, np.maximum(a, 255), 0).astype(np.float32)
    # soft fringe for near-white
    near = (~keep) & (lum > 200)
    alpha = np.where(near, np.clip((245 - lum) / 40.0 * 255.0, 0, 255), alpha)
    out = arr.copy()
    out[..., 3] = alpha
    out[alpha < 1, 0:3] = 0
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def punch_center_circle(im: Image.Image, radius_ratio: float = 0.13) -> Image.Image:
    """Cut a soft hole where the Ashoka Chakra sits so 3D shows through."""
    w, h = im.size
    cx, cy = w // 2, int(h * 0.52)
    radius = int(min(w, h) * radius_ratio * (w / h) * 0.55)
    # Use wider radius based on width — chakra is ~12-16% of logo width
    radius = int(w * 0.085)
    mask = Image.new("L", (w, h), 255)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(2, radius // 10)))
    out = im.copy()
    a = out.getchannel("A")
    a = ImageChops_multiply(a, mask)
    out.putalpha(a)
    return out, (cx, cy, radius)


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    aa = np.array(a).astype(np.float32)
    bb = np.array(b).astype(np.float32) / 255.0
    return Image.fromarray(np.clip(aa * bb, 0, 255).astype(np.uint8), "L")


def build_wordmark() -> None:
    base = knock_white(Image.open(SRC_LOGO))
    # Upscale to ~8k width for crisp zoom
    target_w = 7680
    scale = target_w / base.width
    hq = base.resize(
        (target_w, max(1, int(base.height * scale))),
        Image.Resampling.LANCZOS,
    )
    hq = hq.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))
    punched, hole = punch_center_circle(hq)
    out = BRAND / "wordmark-base.png"
    punched.save(out, "PNG", optimize=True)
    # Also a display-sized version for faster first paint
    display = punched.resize((1600, max(1, int(1600 * punched.height / punched.width))), Image.Resampling.LANCZOS)
    display.save(BRAND / "wordmark-base-display.png", "PNG", optimize=True)
    print("wordmark", punched.size, out.stat().st_size, "hole", hole)


def convert_ply(src: Path, dest: Path) -> None:
    raw = src.read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[:end].decode("ascii", errors="replace")
    n = int(next(l.split()[-1] for l in header.splitlines() if l.startswith("element vertex")))
    props: dict[str, int] = {}
    off = 0
    for line in header.splitlines():
        if line.startswith("property "):
            _, typ, name = line.split()
            assert typ == "float"
            props[name] = off
            off += 4
    row = off
    data = np.frombuffer(raw, dtype=np.uint8, offset=end + len(b"end_header\n"), count=n * row).reshape(n, row)

    def col(name: str) -> np.ndarray:
        o = props[name]
        return data[:, o : o + 4].view("<f4").reshape(n)

    x, y, z = col("x"), col("y"), col("z")
    s0, s1, s2 = np.exp(col("scale_0")), np.exp(col("scale_1")), np.exp(col("scale_2"))
    r0, r1, r2, r3 = col("rot_0"), col("rot_1"), col("rot_2"), col("rot_3")
    f0, f1, f2 = col("f_dc_0"), col("f_dc_1"), col("f_dc_2")
    opacity = 1.0 / (1.0 + np.exp(-col("opacity")))
    importance = s0 * s1 * s2 * opacity
    order = np.argsort(importance)[::-1]

    rgba = np.clip((0.5 + SH_C0 * np.stack([f0, f1, f2], axis=1)) * 255.0, 0, 255).astype(np.uint8)
    a = np.clip(opacity * 255.0, 0, 255).astype(np.uint8)
    qlen = np.maximum(np.sqrt(r0 * r0 + r1 * r1 + r2 * r2 + r3 * r3), 1e-8)
    rot = np.stack(
        [
            np.clip((r0 / qlen) * 128 + 128, 0, 255),
            np.clip((r1 / qlen) * 128 + 128, 0, 255),
            np.clip((r2 / qlen) * 128 + 128, 0, 255),
            np.clip((r3 / qlen) * 128 + 128, 0, 255),
        ],
        axis=1,
    ).astype(np.uint8)

    out = bytearray(n * ROW_OUT)
    for j, i in enumerate(order):
        base = j * ROW_OUT
        out[base : base + 12] = struct.pack("<3f", float(x[i]), float(y[i]), float(z[i]))
        out[base + 12 : base + 24] = struct.pack("<3f", float(s0[i]), float(s1[i]), float(s2[i]))
        out[base + 24 : base + 28] = bytes([int(rgba[i, 0]), int(rgba[i, 1]), int(rgba[i, 2]), int(a[i])])
        out[base + 28 : base + 32] = bytes(rot[i].tolist())

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(out)
    print("splat", dest, f"{dest.stat().st_size/1e6:.2f}MB", "bbox", float(x.min()), float(x.max()), float(y.min()), float(y.max()), float(z.min()), float(z.max()))


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    build_wordmark()
    convert_ply(PLY, BRAND / "logo-center.splat")
    print("DONE")


if __name__ == "__main__":
    main()
