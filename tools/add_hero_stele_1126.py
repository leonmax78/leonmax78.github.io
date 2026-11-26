"""2026-11-26 絕代血盟高峰決: the 英雄碑 (bronze statue 13850 銅像02(反) / 13851 銅像03, used with 絕代英雄戰旗) added to
the six 洞府 / 大營 maps.

The statue was painted into assets/test-media/stage-maps-webp/stage0xx.webp with the stage-map renderer's own rule
(tools/update_0903_stage_maps.py overlay: sprite tajo146 / tajo147 from shape/stage/taiji, scale 192/1536, anchor
from the OBD), at the MPC positions below. The 1:1 tiles on R2 predate the statue, so at 1:1 only the label shows.
This script adds the label (stage.areas, no floor → plain map label) and is safe to re-run.
Usage: python3 tools/add_hero_stele_1126.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STELE = {38: (901, 100), 39: (757, 186), 40: (1340, 100), 138: (988, 44), 139: (732, 108), 140: (764, 56)}  # site-image px (MPC x,y /16*2)
path = ROOT / 'data/stage_maps.json'
data = json.loads(path.read_text('utf-8'))
for s in data['stages']:
    if s['stageId'] in STELE:
        x, y = STELE[s['stageId']]
        areas = [a for a in s.get('areas') or [] if a.get('key') != 'hero-stele']
        # label just under the statue, kept inside the map so it is not cut off at the edge
        w = int(s['width'])
        areas.append({'key': 'hero-stele', 'name': '英雄碑', 'label': '英雄碑・插戰旗', 'x': max(60, min(w - 60, x)), 'y': y + 16})
        s['areas'] = areas
        print(s['stageId'], s['stageName'], areas[-1])
path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
