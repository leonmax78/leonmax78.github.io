# SZO BIAS recolour (decoded from online.dat, 2026-11-05)
- OBD parse 0x57de42: BaseBias a->obj+0x40 (dword), b->+0x44 (word), k->+0x46 (byte)
- Draw: if Flags&0x1000 TABLE(MiscAttrib) elif Flags&0x2000 -> setbias(0,a,b,k) @0x583b50
- 0x4000 flag: low byte of a replaced by time%63 (animated hue cycle)
- Tables @0x588d60: TO_HSV[c565] = V5<<11|S5<<6|H6 ; TO_RGB inverse; float HSV 0..255, round half up
- Pixel @0x591df4: H in [hue(b)-w, hue(b)+w] (w=k&0x3f, wrap 64) -> H'= (k>=128 ? a&0xff : (H+a)&63),
  S'=clamp(S+int8(a>>8)), V'=clamp(V+int8(a>>16)) -> TO_RGB
- Impl: /home/claude/work/bias/szo_bias.py ; renderer /home/claude/work/render/render2.py (also exact 565 inverse; Codex rgb_to_565 floors)
- Verified by names: 8983 紅變 red, 8987 實紅變 red, 8522 red-brown.
- TODO: stage wait+attack1 spr for all TABLE/BIAS site pics (inventory.json: 663 bias, 393 table, 37 table-noidx), re-render, compare, PR.

## 2026-11-08 full regeneration
- Palette: every .spr carries a full 256-entry RGB565 palette at header 0x10 (512 bytes). The value at 0x18 is NOT the
  palette length; truncating to it and borrowing the tail from sibling files caused holes / wrong colours.
- Frames with TLHS subtype 4 are raw RGBA (palette not used); those 24 Pics keep the previous site portraits.
- Draw modes (online.dat 0x50c5ca): WHITELIGHT 0x4 additive, DARKLIGHT 0x8 subtractive, ALPHA 0x1, MIXER 0x2 (level obj+0x48);
  MIXER2 0x800 sets half transparency. Portraits: WHITELIGHT -> rgb+60, alpha = 0.32+0.35*max(rgb)/255 (x0.85 with MIXER2),
  MIXER2 only -> 50% alpha; DARKLIGHT kept opaque.
- TABLE without MiscAttrib uses table 0 (object field zero-initialised).
- render_exact.py runs with SZOAssetTool (palette fix applied) + szo_bias.py; it is kept here for reference.
- Subtype 4 frames (24 Pics, e.g. 水母/年獸/大黑天): rows point to 2-byte pixels (palette index, alpha) using the
  container palette, plus an opaque subtype-2 TLHS embedded at header offset 0x34 drawn on top (t4_decode.py).
