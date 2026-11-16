"""角色機體模擬 build.

python tools/machine-sim/build.py
  → sim/machine.html + sim/machine-data.js + sim/img/（網站版，由「角色機體模擬」頁以 iframe 載入）
  → tools/machine-sim/機體模擬_修練版.html（離線版，單檔可雙擊；不會部署）
資料取自 origin/main 的 data/*.json，等級成長取自 level.ini（遊戲 setting/level.ini）。
環境變數：SZO_SITE、SZO_LEVEL_INI、SZO_SITE_OUT、SZO_OFFLINE_OUT。
"""
import json, re, pathlib, sys, os
here=pathlib.Path(__file__).parent
# Paths can be overridden for another computer: SZO_SITE (site checkout), SZO_LEVEL_INI.
# 在網站 repo 的 tools/machine-sim 執行時，網站就是上兩層；另一台電腦可用 SZO_SITE 指定網站 checkout
_repo=here.parents[1] if (here.parents[1]/'data/jiangshen.json').exists() else here.parent/'網站/leonmax78.github.io-main/leonmax78.github.io-main'
data=pathlib.Path(os.environ.get('SZO_SITE') or _repo)/'data'
import subprocess,base64
revision=subprocess.check_output(['git','-C',str(data.parent),'rev-parse',os.environ.get('SZO_REV','origin/main')],text=True).strip()
def site(path): return subprocess.check_output(['git','-C',str(data.parent),'show',revision+':'+path])
def load(n): return json.loads(site('data/'+n+'.json'))
_lv=here/'level.ini' if (here/'level.ini').exists() else here.parent/'拆包與歷史資料/1029深淵/1027/data1/setting/level.ini'
s=pathlib.Path(os.environ.get('SZO_LEVEL_INI') or _lv).read_bytes().decode('cp950','replace')
levels={}
for name,body in re.findall(r'ID\s*=\s*(CLASS_\w+)(.*?)(?=\[LEVEL\]|\Z)',s,re.S):
    rows=re.findall(r'Level(\d+)\s*=\s*\d+,(\d+),(\d+),(\d+),(\d+)',body)
    total=[0]*4
    levels[name]=[]
    for i,*vals in rows:
        assert int(i)==len(levels[name])+1
        total=[a+int(b) for a,b in zip(total,vals)]
        levels[name].append(total)
assert len(levels)==5 and all(len(v)==2000 for v in levels.values())
j=load('jiangshen'); c=load('compound_config'); g=load('jewels')
names={i['ID']:i['Name'] for i in load('items') if 'Name' in i}
d=dict(levels=levels,crown=load('collectbook_bonus')['rows'],gods=j['baseStats'],stars=j['starMultipliers'],train=load('training')['data'],slots=g['slots'],gems=[dict(v,name=names[k]) for k,v in g['gems'].items()],eq=[{k:e[k] for k in ('name','base_stats','type_codes','display_type')} for e in c['equipment']],recipes=c['recipes'])
d.update({k:j[k] for k in ('comboMembers','comboBonuses','aliases')})
support=site('js/features/jiangshen/support-slots-compare.js').decode()
hero=json.loads(re.search(r'const HERO_INFO = (\{.*?\});',support).group(1))
d['hero']=hero
head_ids=sorted({v[0] for v in hero.values() if len(v)<4 or not v[3]})
d['soulCost']={k:v['total'] for k,v in j['starSoulTable'].items()}
d['auraCost']={k:v['total'] for k,v in j['auraTable'].items()}
item_by_id={r['ID']:r for r in load('items')}
for e in c['equipment']:
    item=item_by_id.get(str(e['item_id']),{})
    for k,label in [('IceDef','冰抗'),('FireDef','火抗'),('LightningDef','雷抗'),('DarkDef','冥抗')]:
        if int(item.get(k,0)):
            e['base_stats'][k]=dict(label=label,value=int(item[k]))
    magic=int(item_by_id.get(str(e['item_id']),{}).get('MagicAttack',0))
    if magic and 'm_attack' not in e['base_stats']:
        e['base_stats']['m_attack']=dict(label='術法攻擊',value=magic)
    # 跟網站合成頁一樣以遊戲道具資料（items.json）為準：第Ⅴ階裝備在 compound_config 只剩耐久／重量，
    # 武觀神兵Ⅱ～Ⅳ的元素傷害種類也與遊戲不符；這裡改用道具資料重建，不改原始資料檔
    if item:
        for k in [k for k in e['base_stats'] if k.endswith(('_attack','_prob')) and k!='m_attack']: del e['base_stats'][k]
        for src,key,label in [('Con','con','體魄'),('Str','str','力量'),('Int','int','智慧'),('Dex','dex','敏捷'),('HP','hp','生命'),('MP','mp','精力'),
                              ('ExtraDef','def','物防'),('MagicDef','m_def','術防'),('Attack','attack','命中'),('AttackRange','attack_range','攻擊距離'),
                              ('IceAttack','ice_attack','冰傷'),('IceProb','ice_prob','冰傷機率'),('FireAttack','fire_attack','火傷'),('FireProb','fire_prob','火傷機率'),
                              ('LightningAttack','lightning_attack','雷傷'),('LightningProb','lightning_prob','雷傷機率'),('DarkAttack','dark_attack','冥傷'),('DarkProb','dark_prob','冥傷機率'),
                              ('ParalysisRes','paralysis_res','麻痺抗性'),('PosionRes','poison_res','中毒抗性'),('BlindRes','blind_res','盲目抗性'),('SilentRes','silent_res','封咒抗性')]:
            if int(item.get(src,0)):
                if item.get(src+'Flag')=='AFFECT_MAX_RATIO': label+='上限（%）'
                e['base_stats'][key]=dict(label=label,value=int(item[src]))
        if int(item.get('DamageMax',0)):
            e['base_stats']['damage']=dict(label='傷害',min=int(item.get('DamageMin',0)),max=int(item['DamageMax']))
    for field,label in [('HP','生命'),('MP','精力')]:
        stat=e['base_stats'].get(field.lower())
        if stat and (e.get('raw_item') or {}).get(field+'Flag')=='AFFECT_MAX_RATIO':
            stat['label']=label+'上限（%）'
# Append missing series: saved builds from earlier versions address equipment by index.
known={str(e['item_id']) for e in c['equipment']}
for entry,src in zip(d['eq'],c['equipment']):
    entry.update({k:str(src.get(k) or '') for k in ('main_category','series_group','tier')})
fields={'Con':'體魄','Str':'力量','Int':'智慧','Dex':'靈敏','ExtraDef':'物防','MagicDef':'術防','MP':'精力','HP':'生命','FireDef':'火抗','IceDef':'冰抗','LightningDef':'雷抗','DarkDef':'冥抗','ParalysisRes':'麻痺抗性','PosionRes':'中毒抗性','BlindRes':'盲目抗性','SilentRes':'封咒抗性'}
for item in load('items'):
    kind=item.get('Type')
    if kind not in ('BOOT','ORNAMENT') or item['ID'] in known or not item.get('Name','').startswith(('諾亞航令','靜月織足')): continue
    stats={}
    for k,label in fields.items():
        if k not in item: continue
        if item.get(k+'Flag')=='AFFECT_MAX_RATIO': label+='上限（%）'
        stats[k]=dict(label=label,value=int(item[k]))
    d['eq'].append(dict(name=item['Name'],display_type={'BOOT':'鞋子','ORNAMENT':'飾品'}[kind],type_codes=[kind],base_stats=stats))
# Append after legacy extras so existing saved equipment indices stay valid.
for item in item_by_id.values():
    if item['Name'].startswith('宿星銀兜') and item.get('Type')=='HELMET' and item['ID'] not in known:
        d['eq'].append(dict(name=item['Name'],display_type='頭盔',main_category='防具',series_group='特仕裝',type_codes=['HELMET'],base_stats={k:dict(label=label,value=int(item[k])) for k,label in fields.items() if k in item}))
# Keep every legacy row in place: v1 player saves reference its list index.
taxonomy=json.JSONDecoder().raw_decode(site('data/equipment-taxonomy.js').decode().split('=',1)[1])[0]['byId']
type_names={code:name for name,codes in c['type_map'].items() for code in codes}
type_names['TALISMAN']='法器'
legacy_ids=[str(e['item_id']) for e in c['equipment']]
extra_ids={i['Name']:i['ID'] for i in item_by_id.values() if i.get('Type') in ('ORNAMENT','BOOT','HELMET')}
legacy_ids.extend(extra_ids[e['name']] for e in d['eq'][len(legacy_ids):])
by_id=dict(zip(legacy_ids,d['eq']))
grades={'旭品':'玉旭','玄宙':'玄宙','仙星流':'仙星流','帝星流':'帝星流','煌星流':'煌星流'}
for ident,meta in taxonomy.items():
    item=item_by_id.get(ident)
    if not item or meta['category']=='其他道具' or item.get('Class')=='CLASS_PET': continue
    kind=item.get('Type')
    tags=meta.get('tags') or [{}]
    tag=max(tags,key=lambda t:bool(t.get('collection')))
    family=tag.get('family','')
    e=by_id.get(ident)
    if e is None:
        stats={}
        labels={**fields,'MagicAttack':'術法攻擊','Attack':'命中','AttackRange':'攻擊距離'}
        for prefix,element in [('Ice','冰'),('Fire','火'),('Lightning','雷'),('Dark','冥')]:
            labels.update({prefix+'Attack':element+'傷',prefix+'Prob':element+'傷機率'})
        for k,label in labels.items():
            if str(item.get(k,'')).strip():
                if item.get(k+'Flag')=='AFFECT_MAX_RATIO': label+='上限（%）'
                stats[k]=dict(label=label,value=int(item[k]))
        if 'DamageMin' in item or 'DamageMax' in item:
            stats['damage']=dict(label='傷害',min=int(item.get('DamageMin') or 0),max=int(item.get('DamageMax') or item.get('DamageMin') or 0))
        e=dict(name=item['Name'],display_type=type_names.get(kind,meta['category']),type_codes=[kind],base_stats=stats)
        d['eq'].append(e)
    e.update(item_id=ident,main_category=meta['category'])
    if not e.get('series_group'):
        collection=tag.get('collection','')
        e['series_group']={'特仕':'特仕裝','職業':'職業裝'}.get(collection,collection or '其他') if family in grades else family or '其他'
    e['tier']=grades.get(family) or e.get('tier') or ''
# Item icons for the equipment slots (served by the site; same rule as js/data/asset-media.js)
icon_set=set(json.loads(site('data/asset_manifest.json'))['itemIcons'])
def icon_of(item):
    try: n=int(str(item.get('Icon','')).strip())
    except ValueError: return ''
    tries=[str(n%10000).zfill(4)]
    if 20000<=n<21000:
        t=str(item.get('Type','')).upper()
        fam=[5,4,3] if t in ('BLADE','SWORD','WHISK','AXE','SHIELD','ROD','SPEAR','STAFF','HAMMER') else [3,4,5] if t in ('MATERIAL','POTION','MAGIC_FIGURE','SUMMON_TOOL','TALISMAN','PRESCRIPTION') else [4,5,3]
        tries+=[str(f*1000+n%1000).zfill(4) for f in fam]
    return next((x for x in tries if x in icon_set),'')
names_to_id={}
for i in item_by_id.values(): names_to_id.setdefault(i.get('Name'),i['ID'])
for e in d['eq']:
    item=item_by_id.get(str(e.get('item_id') or names_to_id.get(e['name'],'')))
    if item: e['icon']=icon_of(item)
    if item and item.get('Class'): e['classes']=[c.strip() for c in item['Class'].split(',')]
for g in d['gems']:
    item=item_by_id.get(str(g['ID']))
    if item: g['icon']=icon_of(item)
raw=(data.parent/'raw/CHANGEBODYITEM.INI').read_bytes()
try: soul_text=raw.decode('utf-8-sig')
except UnicodeDecodeError: soul_text=raw.decode('cp950',errors='replace')
d['souls']=[]
for block in soul_text.split('[LIST]')[1:]:
    row=dict((k.strip(),v.strip()) for k,v in re.findall(r'^\s*(\w+)\s*=([^\r\n]*)',block,re.M))
    if row.get('Name') and int(row.get('ID',0))>0: d['souls'].append(row)
assert d['souls'] and d['souls'][0]['Name']=='素還真'
import base64
def b64(raw,mime): return 'data:'+mime+';base64,'+base64.b64encode(raw).decode()
ui=here/'ui'
gem_files=sorted((ui/'gem').glob('Gem_*.png'))
template=(here/'template.html').read_text('utf8')
def render(mode,data_tag,urls):
    out=template
    for k,v in urls.items(): out=out.replace(k,v)
    return out.replace('<script>const D=__DATA__;',data_tag)
def data_json(heads):
    return json.dumps({**d,'heads':heads},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')

# 1) 離線版：一個檔案內嵌全部資料與圖（雙擊即可開）
offline=pathlib.Path(os.environ.get('SZO_OFFLINE_OUT') or here/'機體模擬_修練版.html')
heads={str(h):b64(site(f'assets/test-media/jiangshen-heads/h{h}.webp'),'image/webp') for h in head_ids}
offline.write_text(render('offline','<script>const D='+data_json(heads)+';',{
    '__LOGO__':b64((data.parent/'assets/title_logo_desktop_white.webp').read_bytes(),'image/webp'),
    '__INK__':b64((data.parent/'assets/header_bg_desktop_fast.webp').read_bytes(),'image/webp'),
    '__PANEL__':b64((ui/'panel.png').read_bytes(),'image/png'),
    '__GODPANEL__':b64((ui/'god_panel.png').read_bytes(),'image/png'),
    '__GEMART__':json.dumps({f.stem:b64(f.read_bytes(),'image/png') for f in gem_files}),
    '__ICONBASE__':'https://leonmax78.github.io/assets/test-media/item-icons/i',
    '<!--__SITE__-->':''}),encoding='utf8')
print('offline',offline)

# 2) 網站版：sim/machine.html＋machine-data.js，圖檔另存，由網站「角色機體模擬」頁載入
site_dir=os.environ.get('SZO_SITE_OUT') or (data.parent/'sim' if here.parent.name=='tools' else None)
if site_dir:
    import shutil,hashlib
    out=pathlib.Path(site_dir); (out/'img/gem').mkdir(parents=True,exist_ok=True)
    for f in ['panel.png','god_panel.png']: shutil.copyfile(ui/f,out/'img'/f)
    for f in gem_files: shutil.copyfile(f,out/'img/gem'/f.name)
    js='window.SZO_SIM_DATA='+data_json({str(h):f'../assets/test-media/jiangshen-heads/h{h}.webp' for h in head_ids})+';\n'
    (out/'machine-data.js').write_text(js,encoding='utf8')
    ver=hashlib.sha1(js.encode()).hexdigest()[:10]
    (out/'machine.html').write_text(render('site',f'<script src="machine-data.js?v={ver}"></script>\n<script>const D=window.SZO_SIM_DATA;',{
        '__LOGO__':'../assets/title_logo_desktop_white.webp','__INK__':'../assets/header_bg_desktop_fast.webp',
        '__PANEL__':'img/panel.png','__GODPANEL__':'img/god_panel.png',
        '__GEMART__':json.dumps({f.stem:'img/gem/'+f.name for f in gem_files}),
        '__ICONBASE__':'../assets/test-media/item-icons/i',
        '<!--__SITE__-->':(here/'site_embed.html').read_text('utf8')}),encoding='utf8')
    print('site',out)
