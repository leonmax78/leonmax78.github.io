"""Add a compact NPC list to data/stage_map_index.json for the header search suggestions.

Rows: [name, stageId, npcId, hasShop(0/1), stageName], one per NPC per map.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def main():
    maps = json.loads((ROOT / 'data/stage_maps.json').read_text(encoding='utf-8'))
    rows = {}
    for stage in maps['stages']:
        for npc in stage.get('npcs', []):
            name = str(npc.get('name') or '').strip()
            if not name:
                continue
            key = (name, stage['stageId'])
            shop = 1 if npc.get('shop') else 0
            if key not in rows or shop > rows[key][3]:
                rows[key] = [name, stage['stageId'], npc['id'], shop, stage['stageName']]
    path = ROOT / 'data/stage_map_index.json'
    index = json.loads(path.read_text(encoding='utf-8'))
    index['npcs'] = sorted(rows.values(), key=lambda r: (r[1], -r[3], r[0]))
    path.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('npcs', len(index['npcs']))

if __name__ == '__main__':
    main()
