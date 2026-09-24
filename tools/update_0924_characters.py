"""Import the requested crossover characters without replacing curated data."""
import json
import shutil
from pathlib import Path
from build_data import parse_ini_records, read_text
from build_soul_data import parse_changebody

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Desktop/0924/SETTING'

def load(path):
    return json.loads((ROOT/path).read_text(encoding='utf-8'))

def write(path, data):
    (ROOT/path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def main():
    souls = load('data/soul.json')
    incoming = [r for r in parse_changebody(SOURCE/'CHANGEBODYITEM.INI') if r['ID'] in (64,65)]
    assert [(r['ID'],r['Name']) for r in incoming] == [(64,'張菁'),(65,'蘇櫻')]
    souls = sorted([r for r in souls if r['ID'] not in (64,65)] + incoming, key=lambda r:r['ID'])
    shutil.copyfile(SOURCE/'CHANGEBODYITEM.INI',ROOT/'raw/CHANGEBODYITEM.INI')
    write('data/soul.json', souls)
    (ROOT/'js/data/soul-data.js').write_text('// Updated from 0924 CHANGEBODYITEM.INI.\nwindow.SZO_SOUL_DATA = '+json.dumps(souls,ensure_ascii=False,separators=(',',':'))+';\nwindow.SOUL_DATA = window.SZO_SOUL_DATA;\n',encoding='utf-8')
    heroes = {r['ID']:r for r in parse_ini_records(read_text(SOURCE/'HERODEVELOPITEM_C.INI')) if 'ID' in r}
    groups = {r['ID']:r for r in parse_ini_records(read_text(SOURCE/'HERODEVELOPVICE.INI')) if 'ID' in r}
    data = load('data/jiangshen.json')
    fields = dict(zip(data['stats'],['Base_HP','Base_MP','Base_Con','Base_Str','Base_Int','Base_Dex','Magic_Att','Extra_Def','Magic_Def']))
    for key in ('125','126','127'):
        r = heroes[key]
        data['baseStats'][r['Name']] = {name:int(r.get(field,0)) for name,field in fields.items()}
    names = [heroes[key]['Name'] for key in ('125','126','127')]
    data['displayNames'] = data['displayNames'][:3]+names+[n for n in data['displayNames'][3:] if n not in names]
    for key in map(str,range(5,11)):
        r = groups[key]
        data['comboMembers'][r['Name']] = [heroes[r['Hero'+str(i)]]['Name'] for i in range(1,9) if r.get('Hero'+str(i)) not in (None,'0','')]
        data['comboBonuses'][r['Name']] = {name:int(r.get({'Base_HP':'Max_HP','Base_MP':'Max_MP'}.get(field,field),0)) for name,field in fields.items()}
    write('data/jiangshen.json',data)
    for filename,keys in [('base-data.js',['stats','displayNames','aliases','baseStats']),('combo-data.js',['comboMembers','comboBonuses'])]:
        part = {k:data[k] for k in keys}
        (ROOT/'js/data/jiangshen'/filename).write_text('// Generated from data/jiangshen.json.\nwindow.SZO_JIANGSHEN_DATA_PARTS = window.SZO_JIANGSHEN_DATA_PARTS || {};\nObject.assign(window.SZO_JIANGSHEN_DATA_PARTS, '+json.dumps(part,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
    write('reports/characters_0924.json',{'souls':incoming,'heroes':[heroes[k] for k in ('125','126','127')],'combos':[groups[str(k)] for k in range(5,11)],'hero128':heroes['128']['Name']})
    print('PASS: 2 souls, 3 heroes, 6 combos imported; hero 128 = '+heroes['128']['Name'])

if __name__ == '__main__':
    main()
