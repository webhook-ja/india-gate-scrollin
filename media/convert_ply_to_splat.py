"""Convert 3DGS PLY -> antimatter15 .splat for @react-three/drei <Splat />."""
from __future__ import annotations

import struct
from pathlib import Path

import numpy as np

SRC = Path(r"c:\Users\TRENDING PC\Documents\servicios\indiagate\logo 3d.ply")
OUT = Path(
    r"c:\Users\TRENDING PC\Documents\servicios\Web_central\Web_test_scrollin"
    r"\public\brand\logo-3d.splat"
)
SH_C0 = 0.28209479177387814
ROW_OUT = 32  # 3f pos + 3f scale + 4B rgba + 4B rot


def parse_header(buf: bytes) -> tuple[int, int, dict[str, tuple[str, int]]]:
    end = buf.find(b"end_header\n")
    if end < 0:
        raise ValueError("PLY header missing")
    header = buf[:end].decode("ascii", errors="replace")
    vertex_count = None
    props: dict[str, tuple[str, int]] = {}
    offset = 0
    type_map = {
        "float": ("f", 4),
        "double": ("d", 8),
        "int": ("i", 4),
        "uint": ("I", 4),
        "short": ("h", 2),
        "ushort": ("H", 2),
        "uchar": ("B", 1),
    }
    for line in header.splitlines():
        if line.startswith("element vertex"):
            vertex_count = int(line.split()[-1])
        elif line.startswith("property "):
            _, typ, name = line.split()
            fmt, size = type_map[typ]
            props[name] = (fmt, offset)
            offset += size
    if vertex_count is None:
        raise ValueError("No vertex count")
    return vertex_count, end + len(b"end_header\n"), props


def main() -> None:
    raw = SRC.read_bytes()
    n, data_off, props = parse_header(raw)
    row = max(off + (4 if fmt == "f" else struct.calcsize(fmt)) for fmt, off in props.values())
    # recompute row from last prop
    last_name = max(props.items(), key=lambda kv: kv[1][1])
    last_fmt, last_off = last_name[1]
    row = last_off + struct.calcsize(last_fmt)

    print(f"vertices={n} row={row} bytes={n * row}")
    data = np.frombuffer(raw, dtype=np.uint8, offset=data_off, count=n * row).reshape(n, row)

    def col_f(name: str) -> np.ndarray:
        _, off = props[name]
        return data[:, off : off + 4].view("<f4").reshape(n)

    x, y, z = col_f("x"), col_f("y"), col_f("z")
    s0 = np.exp(col_f("scale_0"))
    s1 = np.exp(col_f("scale_1"))
    s2 = np.exp(col_f("scale_2"))
    r0, r1, r2, r3 = col_f("rot_0"), col_f("rot_1"), col_f("rot_2"), col_f("rot_3")
    f0, f1, f2 = col_f("f_dc_0"), col_f("f_dc_1"), col_f("f_dc_2")
    opacity = 1.0 / (1.0 + np.exp(-col_f("opacity")))

    importance = s0 * s1 * s2 * opacity
    order = np.argsort(importance)[::-1]

    rgba = np.clip((0.5 + SH_C0 * np.stack([f0, f1, f2], axis=1)) * 255.0, 0, 255).astype(
        np.uint8
    )
    a = np.clip(opacity * 255.0, 0, 255).astype(np.uint8)

    qlen = np.sqrt(r0 * r0 + r1 * r1 + r2 * r2 + r3 * r3)
    qlen = np.maximum(qlen, 1e-8)
    rot = np.stack(
        [
            np.clip((r0 / qlen) * 128.0 + 128.0, 0, 255),
            np.clip((r1 / qlen) * 128.0 + 128.0, 0, 255),
            np.clip((r2 / qlen) * 128.0 + 128.0, 0, 255),
            np.clip((r3 / qlen) * 128.0 + 128.0, 0, 255),
        ],
        axis=1,
    ).astype(np.uint8)

    out = bytearray(n * ROW_OUT)
    for j, row_i in enumerate(order):
        base = j * ROW_OUT
        out[base : base + 12] = struct.pack("<3f", float(x[row_i]), float(y[row_i]), float(z[row_i]))
        out[base + 12 : base + 24] = struct.pack(
            "<3f", float(s0[row_i]), float(s1[row_i]), float(s2[row_i])
        )
        out[base + 24 : base + 28] = bytes(
            [int(rgba[row_i, 0]), int(rgba[row_i, 1]), int(rgba[row_i, 2]), int(a[row_i])]
        )
        out[base + 28 : base + 32] = bytes(rot[row_i].tolist())

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(out)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
