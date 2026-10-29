"""Import the Abyss release while retaining curated data absent from client tables."""
import json
import shutil
import subprocess
from pathlib import Path
import build_data as b
from build_soul_data import parse_changebody

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Desktop/1029深淵/1029/SETTING'

def load(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text('utf-8'))

def save(name, value, bundle=False):
    b.write_json(ROOT / 'data' / (name + '.json'), value)
    if bundle:
        b.write_data_bundle_js(ROOT / 'data' / (name + '.bundle.js'), name, value)

def records(name, sections=False):
    rows = b.parse_ini_records((SOURCE / name).read_bytes().decode('cp950'))
    return rows if sections else [b.record_to_plain(r) for r in rows]

def announced_drops(monsters, items):
    groups=[
        '白骨精、修羅魔君鬼魂、蛇魔女王、神龍將、無頭將軍俑、道觀包裹、蒼狼族大汗、幻雷妖煞、西域邪神、閻羅寶箱、飛昇寶箱、天邪魎王、破壞神濕婆、六滅邪王、八歧大蛇',
        '大閻羅寶箱、神煉寶箱、大飛昇寶箱、神臨寶箱、大神臨寶箱、九天寶箱、絕對無限寶箱、絕對無限天寶箱、真天命逆轉寶箱、虛空主宰寶箱、艾濟神王寶箱',
        '傾天絕邪、拉‧荷魯斯、飛雲大將軍、真九天寶箱、真天意逆轉寶箱、真．虛空主宰寶箱、真‧艾濟神王寶箱、黃龍御命寶箱',
        '虛還西楚霸王、玉旭神龍、始祖劾龍王、真．黃龍御命寶箱、五鷹天閣寶箱、玉旭之巔寶箱、蛇眼城寶箱',
        '太淵巨咒龜、真．五鷹天閣寶箱、超．玉旭之巔寶箱、真．蛇眼城寶箱、俠隱樓寶箱',
        '真．俠隱樓寶箱']
    normalize=lambda s:s.replace('．','').replace('‧','').replace('·','').replace(' ','')
    grade={normalize(name):i+1 for i,group in enumerate(groups) for name in group.split('、')}
    removed=dict(pair.split(':') for pair in ['白骨精:靈木','修羅魔君鬼魂:真火令','蛇魔女王:萬蠱毒配方','神龍將:貝鱗甲','蒼狼族大汗:聚氣寶石','拉‧荷魯斯:通寶銀票小錢包','飛雲大將軍:仙星紀念經典福袋','黃龍御命寶箱:仙星紀念經典福袋','虛還西楚霸王:神效十二星運符','始祖劾龍王:寂滅淨元','真．黃龍御命寶箱:仙星紀念經典福袋','五鷹天閣寶箱:煌星戰憶經典福袋','玉旭之巔寶箱:機關工坊速成軸','蛇眼城寶箱:源符錦囊','真．五鷹天閣寶箱:煌星戰憶經典福袋','超．玉旭之巔寶箱:機關工坊速成軸','真．蛇眼城寶箱:源符錦囊','俠隱樓寶箱:機關工坊速成軸','真．俠隱樓寶箱:源符錦囊','陰間大法師:皇龍虹鉻','星沉鋼翼虎:皇龍虹鉻','燭懨獄鰲龍:皇龍虹鉻','驚宇鬱嶓羅:皇龍虹鉻'])
    removed={normalize(k):v for k,v in removed.items()}
    actual={r['ID']:r for r in records('MONSTER_C.INI')}
    tower_ids={str(m['id']) for s in load('stage_maps')['stages'] for m in s.get('monsters',[]) if any(int(f)%10==0 for f in m.get('tower_floors',[]))}
    pending=[]
    for row in monsters:
        name=normalize(row['Name'])
        if name not in grade and row['ID'] not in tower_ids:continue
        if b.parse_drop(b.drop_value(actual.get(row['ID'],{}))):continue
        row['DropRevision']='2026-10-29 公告已調整掉落；新版機率尚未提供。'
        row['AnnouncedDrops']=[str(32958+grade[name])] if name in grade else []
        row['RemovedDrops']=[r['ID'] for r in items if r['Name']==removed.get(name)]
        pending.append({'id':row['ID'],'name':row['Name'],'added':row['AnnouncedDrops'],'removed':row['RemovedDrops'],'tower':row['ID'] in tower_ids})
    return pending

def main():
    report = {}
    tables = {}
    for key, filename in [('items','ITEM.INI'),('monsters','MONSTER_C.INI'),('magic','MAGIC.INI'),('status','STATUS.INI')]:
        baseline=json.loads(subprocess.check_output(['git','show',f'1b2e11f2:data/{key}.json'],cwd=ROOT))
        old = {r['ID']: r for r in baseline}
        incoming = records(filename)
        added, changed, preserved = [], [], []
        for row in incoming:
            if key in ('items','monsters') and not b.is_real_named_row(row):
                continue
            previous = old.get(row['ID'])
            if key == 'monsters' and previous and not b.parse_drop(b.drop_value(row)) and previous.get('DropItem'):
                row['DropItem'] = previous['DropItem']
                preserved.append(row['ID'])
            if previous is None:
                added.append(row['ID'])
            elif row != previous:
                changed.append({'id':row['ID'],'name':row.get('Name'), 'fields':[k for k in set(row)|set(previous) if row.get(k)!=previous.get(k)]})
            old[row['ID']] = row
        tables[key] = list(old.values())
        report[key] = {'added':added,'changed':changed,'retainedLegacyDrops':preserved}
        save(key, tables[key], True)
    # COMPOUND repeats IDs in recipe and material sections; never key it by ID alone.
    compound = records('COMPOUND.INI')
    save('compound', compound)
    jewels = records('JEWEL_C.INI', True)
    gemdata = {'version':'1029','gems':{r['ID']:b.record_to_plain(r) for r in jewels if r.get('_section')=='LIST'},
               'slots':[b.record_to_plain(r) for r in jewels if r.get('_section')=='SLOT']}
    save('jewels', gemdata)
    (ROOT/'data/jewels.js').write_text('window.SZO_JEWELS='+json.dumps(gemdata,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    save('exchange', records('EXCHANGE.INI'))
    save('famous', records('FAMOUS.INI'))
    report['pendingDrops']=announced_drops(tables['monsters'],tables['items'])
    save('monsters',tables['monsters'],True)
    reverse = b.build_drop_reverse(tables['monsters'])
    for row in tables['monsters']:
        if not row.get('DropRevision'):continue
        for iid, entries in reverse.items():
            entries[:]=[e for e in entries if not (str(e['monsterId'])==row['ID'] and iid in row['RemovedDrops'])]
            for entry in entries:
                if str(entry['monsterId'])==row['ID']:entry.update(rate=None,revision=row['DropRevision'])
        for iid in row['AnnouncedDrops']:
            if not any(str(e['monsterId'])==row['ID'] for e in reverse.get(iid,[])):
                reverse.setdefault(iid,[]).append({'monsterId':row['ID'],'monsterName':row['Name'],'rate':None,'weight':None,'revision':row['DropRevision']})
    save('drop_reverse', reverse, True)
    b.write_drop_reverse_shards(reverse)
    search = {'items':[{'id':r['ID'],'name':r['Name'],'type':r.get('Type',''),'level':r.get('Level','')} for r in tables['items']],
              'monsters':[{'id':r['ID'],'name':r['Name'],'level':r.get('Level',''),'type':r.get('Type',''),'subType':r.get('SubType',''),'exp':r.get('DropExp','')} for r in tables['monsters']]}
    save('search_index', search, True)
    for kind in ('items','monsters'):
        b.write_data_bundle_js(ROOT/f'data/search_{kind}.bundle.js',f'search_{kind}',{kind:search[kind]})
    b.write_runtime_data_js(ROOT/'data/runtime-data.js',{**tables,'locations':load('locations')})
    souls = parse_changebody(SOURCE/'CHANGEBODYITEM.INI')
    save('soul',souls)
    (ROOT/'js/data/soul-data.js').write_text('window.SZO_SOUL_DATA='+json.dumps(souls,ensure_ascii=False,separators=(',',':'))+';window.SOUL_DATA=window.SZO_SOUL_DATA;\n',encoding='utf-8')
    data = load('jiangshen')
    fields = dict(zip(data['stats'],['Base_HP','Base_MP','Base_Con','Base_Str','Base_Int','Base_Dex','Magic_Att','Extra_Def','Magic_Def']))
    heroes = {r['ID']:r for r in records('HERODEVELOPITEM_C.INI')}
    for row in heroes.values():
        name = row['Name']
        if name.upper() in ('UNKNOWN','NULL'):
            continue
        data['baseStats'][name] = {k:int(row.get(v,0)) for k,v in fields.items()}
        if name not in data['displayNames']:
            data['displayNames'].append(name)
    for row in records('HERODEVELOPVICE.INI'):
        if not row.get('Name'):
            continue
        data['comboMembers'][row['Name']] = [heroes[row['Hero'+str(i)]]['Name'] for i in range(1,9) if row.get('Hero'+str(i)) in heroes]
        data['comboBonuses'][row['Name']] = {k:int(row.get({'Base_HP':'Max_HP','Base_MP':'Max_MP'}.get(v,v),0)) for k,v in fields.items()}
    save('jiangshen',data)
    for filename,keys in [('base-data.js',['stats','displayNames','aliases','baseStats']),('combo-data.js',['comboMembers','comboBonuses'])]:
        (ROOT/'js/data/jiangshen'/filename).write_text('window.SZO_JIANGSHEN_DATA_PARTS=window.SZO_JIANGSHEN_DATA_PARTS||{};Object.assign(window.SZO_JIANGSHEN_DATA_PARTS,'+json.dumps({k:data[k] for k in keys},ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
    # Preserve NPC/shop metadata, replacing only the inventory supplied by SHOP.INI.
    shops = load('shop_all')
    index = {str(r['shopId']):r for r in shops['shops']}
    items = {r['ID']:r for r in tables['items']}
    for row in records('SHOP.INI'):
        if not row.get('ID'):
            continue
        entries = {}
        for mode in ('Sell','Buy'):
            values = row.get(mode,[])
            if isinstance(values,str): values=[values]
            for value in values:
                parts=value.split(',')
                if len(parts)<2: continue
                iid=parts[0].strip();item=items.get(iid)
                if not item: continue
                entry=entries.setdefault(iid,{'itemId':int(iid),'name':item['Name'],'icon':item.get('Icon',''),'type':item.get('Type',''),'value':int(item.get('Value') or 0),'sellPercent':None,'sellPrice':None,'buyPercent':None,'buyPrice':None})
                percent=float(parts[1]);entry[mode.lower()+'Percent']=percent
                entry[mode.lower()+'Price']=round(entry['value']*percent/100)
        index[row['ID']]={**index.get(row['ID'],{}),'shopId':int(row['ID']),'items':list(entries.values())}
    shops['shops']=list(index.values());shops['version']='shop-1029'
    save('shop_all',shops)
    latest=ROOT/'raw/latest_setting';latest.mkdir(exist_ok=True)
    for path in SOURCE.iterdir():
        if path.is_file():shutil.copy2(path,latest/path.name)
    for name,dest in [('ITEM.INI','ITEM.INI'),('MAGIC.INI','MAGIC.INI'),('STATUS.INI','STATUS.INI'),('COMPOUND.INI','COMPOUN.INI'),('CHANGEBODYITEM.INI','CHANGEBODYITEM.INI'),('MONSTER_C.INI','new/MONSTER_C.INI'),('JEWEL_C.INI','JEWEL_C.INI')]:
        shutil.copy2(SOURCE/name,ROOT/'raw'/dest)
    (ROOT/'raw/SHOP.INI').write_text((SOURCE/'SHOP.INI').read_bytes().decode('cp950').replace('\r\n','\n'),encoding='utf-8',newline='\n')
    b.write_json(ROOT/'reports/update_1029_data.json',report)
    print({k:{'added':len(v['added']),'changed':len(v['changed']),'preservedDrops':len(v['retainedLegacyDrops'])} for k,v in report.items() if isinstance(v,dict)})
    print('Pending revised probabilities:',len(report['pendingDrops']))

if __name__=='__main__':main()
