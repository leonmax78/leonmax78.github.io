"""Exact SP_ATTRIB_BIAS recolour, reimplemented from the game client (online.dat 0x583b50 / 0x591df4 / 0x588d60)."""
import numpy as np

def _ftol(x): return int(x)  # x87 truncation after +0.5 (values are non-negative)

def rgb2hsv(r, g, b):  # 0x5924b0, ints 0..255 in and out
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    v = _ftol(mx * 255 + 0.5)
    s = _ftol((mx - mn) * 255 / mx + 0.5) if mx != 0 else 0
    if s == 0:
        return 0, 0, v
    d = mx - mn
    if r == mx: h = (g - b) / d
    elif g == mx: h = 2 + (b - r) / d
    else: h = 4 + (r - g) / d
    h /= 6
    if h < 0: h += 1
    return _ftol(h * 255 + 0.5), s, v

def hsv2rgb(h, s, v):  # 0x5926b0
    if v == 0: return 0, 0, 0
    if h == 1: h = 0
    hf, sf, vf = h / 255.0, s / 255.0, v / 255.0
    i = int(hf * 6)
    if s == 0:
        x = _ftol(vf * 255 + 0.5); return x, x, x
    f = hf * 6 - i
    p = _ftol((1 - sf) * vf * 255 + 0.5)
    q = _ftol((1 - f * sf) * vf * 255 + 0.5)
    t = _ftol((1 - (1 - f) * sf) * vf * 255 + 0.5)
    w = _ftol(vf * 255 + 0.5)
    return [(w, t, p), (q, w, p), (p, w, t), (p, q, w), (t, p, w), (w, p, q)][i]

def _build():
    to_hsv = np.zeros(65536, np.uint16)
    for c in range(65536):
        r, g, b = (c >> 8) & 0xF8, (c >> 3) & 0xFC, (c << 3) & 0xFF
        h, s, v = rgb2hsv(r, g, b)
        to_hsv[c] = ((v & 0xFFF8) << 5 | (s & 0xFFF8)) << 3 | (h >> 2)
    to_rgb = np.zeros(65536, np.uint16)
    for H in range(64):
        for S in range(32):
            for V in range(32):
                r, g, b = hsv2rgb(H * 4, S * 8, V * 8)
                to_rgb[(V << 5 | S) << 6 | H] = ((r & 0xF8) << 5 | (g & 0xFC)) << 3 | ((b >> 3) & 0x1F)
    return to_hsv, to_rgb

TO_HSV, TO_RGB = _build()

def parse(base_bias):
    a, b, k = [int(x.strip(), 0) for x in str(base_bias).split(',')]
    return a, b, k

def bias_565(colors, a, b, k):
    """colors: uint16 array of RGB565 pixels -> recoloured RGB565 (game rule)."""
    absolute = (k & 0xFF) >> 7
    w = k & 0x3F
    hb = int(TO_HSV[b & 0xFFFF]) & 0x3F
    lo, hi = hb - w, hb + w
    if lo < 0: lo += 64; hi += 64
    hsv = TO_HSV[colors].astype(np.int32)
    H, S, V = hsv & 0x3F, (hsv >> 6) & 0x1F, (hsv >> 11) & 0x1F
    sel = ((H >= lo) & (H <= hi)) | ((H + 64 >= lo) & (H + 64 <= hi))
    Hn = np.full_like(H, a & 0xFF) if absolute else (H + a) & 0x3F
    ds = ((a >> 8) & 0xFF); ds = ds - 256 if ds > 127 else ds
    dv = ((a >> 16) & 0xFF); dv = dv - 256 if dv > 127 else dv
    Sn = np.clip(S + ds, 0, 31); Vn = np.clip(V + dv, 0, 31)
    out = TO_RGB[((Vn << 5 | Sn) << 6) | Hn]
    return np.where(sel, out, colors).astype(np.uint16)
