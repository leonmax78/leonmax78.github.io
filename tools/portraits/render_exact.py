"""Render monster portraits with the game's exact TABLE / BIAS rules (no heuristic overrides)."""
import sys, json
sys.path.insert(0, '/home/claude/work/bias')
import numpy as np
from PIL import Image
src = open('render.py').read().split("targets=json")[0]
exec(src)
import szo_bias as B

E5 = {k * 255 // 31: k for k in range(32)}
E6 = {k * 255 // 63: k for k in range(64)}
STABLES = np.frombuffer((Path(ROOT) / 'DATA1/setting/stables.dat').read_bytes(), '<u2')

def to565(img):
    a = np.asarray(img.convert('RGBA')).astype(np.int32)
    r = np.vectorize(E5.get)(a[..., 0]); g = np.vectorize(E6.get)(a[..., 1]); b = np.vectorize(E5.get)(a[..., 2])
    return (r << 11 | g << 5 | b).astype(np.uint16), a[..., 3]

def from565(c, alpha):
    c = c.astype(np.int32)
    out = np.stack([((c >> 11) & 31) * 255 // 31, ((c >> 5) & 63) * 255 // 63, (c & 31) * 255 // 31, alpha], -1)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')

def exact_recolor(frames, obj, root=None):
    if not obj: return frames
    flags = str(obj.get('Flags') or ''); misc = str(obj.get('MiscAttrib') or '').strip()
    if 'SP_ATTRIB_TABLE' in flags:
        idx = int(misc) if misc.isdigit() else int(TABLE_DEFAULT) if TABLE_DEFAULT is not None else None
        if idx is None: return frames
        fn = lambda c: STABLES[idx * 65536 + c.astype(np.int64)]
    elif 'SP_ATTRIB_BIAS' in flags and obj.get('BaseBias'):
        a, b, k = B.parse(obj['BaseBias'])
        if not a: return frames
        fn = lambda c: B.bias_565(c, a, b, k)
    else:
        return frames
    res = []
    for f in frames:
        c, al = to565(f); res.append(from565(np.where(al > 0, fn(c), c), al))
    return res

TABLE_DEFAULT = None
T.apply_object_recolor = exact_recolor

if __name__ == '__main__':
    targets = json.loads(sys.argv[1]); out = Path(sys.argv[2]); out.mkdir(exist_ok=True)
    for pic in targets:
        o = objs.get(pic)
        c = T.load_monster_portrait_candidate(ROOT, pic, o)
        if not c: print(pic, 'no sprite'); continue
        T.trim_visible(c[0]).convert('RGBA').save(out / f'm{pic}.png'); print(pic, o.get('Name'), 'ok')
