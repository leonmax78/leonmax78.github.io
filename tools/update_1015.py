"""Import the October 15 snapshot without replacing curated website data."""
import json
import shutil
from pathlib import Path
import build_data

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Desktop/1015/SETTING'

def main():
    latest = ROOT / 'raw/latest_setting'
    latest.mkdir(exist_ok=True)
    for file in SOURCE.iterdir():
        if file.is_file():
            shutil.copy2(file, latest / file.name)
    for name, dest in [('ITEM.INI','ITEM.INI'), ('MAGIC.INI','MAGIC.INI'), ('STATUS.INI','STATUS.INI'), ('MONSTER_C.INI','new/MONSTER_C.INI')]:
        shutil.copy2(SOURCE / name, ROOT / 'raw' / dest)
    original_read = build_data.read_text
    source_paths = {ROOT/'raw'/p for p in ['ITEM.INI','MAGIC.INI','STATUS.INI','new/MONSTER_C.INI']}
    build_data.read_text = lambda path: path.read_bytes().decode('cp950', errors='replace') if path in source_paths else original_read(path)
    build_data.main()
    # Stage flags changed, but map images and NPC pixel positions did not.
    stages = {int(r['ID']): r for r in build_data.parse_ini_records((SOURCE/'STAGE.INI').read_bytes().decode('cp950', errors='replace')) if 'ID' in r}
    path = ROOT / 'data/stage_maps.json'
    maps = json.loads(path.read_text(encoding='utf-8'))
    for stage in maps['stages']:
        raw = stages.get(stage['stageId'], {})
        if 'STAGE_FLAG_ForbidGive' in raw.get('Flag', '').split(','):
            stage['flags'] = raw['Flag'].split(',')
    path.write_text(json.dumps(maps, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

if __name__ == '__main__':
    main()
