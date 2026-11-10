"""Skill icons for the 技能查詢 page.

Usage: python tools/build_skill_icons.py <dir of rendered magic icon PNGs (m0001.png …)> <raw skills json from build_skills.py>

The icons are SHAPE/MAGIC/ICON/Mxxxx.SHP in data2.pak (new ones in update.pak), 32×32. Render them
with the SZO shape tool first; this copies only the icons the listed skills use into
assets/test-media/skill-icons/. Run tools/build_skills.py again afterwards so data/skills.json
picks them up.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(src, raw):
    out = ROOT / 'assets/test-media/skill-icons'
    out.mkdir(parents=True, exist_ok=True)
    used = {r['icon'] for r in json.loads(Path(raw).read_text(encoding='utf-8')) if r.get('icon')}
    missing = []
    for stem in sorted(used):
        f = Path(src) / f'{stem}.png'
        if f.exists(): shutil.copyfile(f, out / f.name)
        else: missing.append(stem)
    print(len(used) - len(missing), 'icons copied; missing', missing)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
