"""Export the owner-approved exchange list (兌換清單 workbook) to data/exchanges.json for the site."""
import os
import sys,json,re,collections,warnings
warnings.simplefilter('ignore')
here=sys.path[0]
rows_json,approved,OUT=sys.argv[1:4]
sys.argv=[sys.argv[0],rows_json,'/dev/null']
src=open(here+'/ex_xlsx.py',encoding='utf-8').read().split('\nHEAD=')[0]
exec(src)
from openpyxl import load_workbook
wb=load_workbook(approved)
dec={}
for n in wb.sheetnames:
    ws=wb[n]; h=[c.value for c in ws[1]]
    if '來源ID' not in h or n=='未接上NPC': continue
    for r in ws.iter_rows(min_row=2,values_only=True):
        r=dict(zip(h,r))
        if r.get('保留'): dec[(r['NPC'],str(r['來源ID']).replace(' 新增',''),r['獲得'])]=r
it=json.load(open(os.path.join(os.path.dirname(os.path.dirname(here)),'data/items.json'),encoding='utf-8'))
it=it if isinstance(it,list) else list(it.values())
iid={}
for x in it: iid.setdefault(x['Name'],int(x['ID']))
SKIP=re.compile(r'看下一頁|下一頁|換下一頁|上一頁|回上頁|重新選擇|^(同意|我同意|換吧|看看無妨|確定交換|當然要換|是的|好的?|換一張。?|換十張。?)[！!。]?$')
def label(menu):
    parts=[x for x in (p.strip('【】 ').strip() for p in (menu or '').split(' › ')) if x and not SKIP.search(x)]
    last=parts[-1] if parts else ''
    return re.sub(r'^以(.+?)進行(交換|交易)$',r'\1',last)
def q(lst):
    acc=collections.OrderedDict()
    for n,c in lst: acc[n]=acc.get(n,0)+c
    return [[n,c,iid.get(n,0)] for n,c in acc.items()]
# rows the owner asked to hide after the review (2026-11-13)
HIDE={('伙計','對話 7539')}
HIDE_NPC={'夸父幼童','巫醫','老祭司'}
npcs=[]; nidx={}
rows=[]
for e in recipes.values():
    src_id=(f"兌換 {e['id']}（組 {e['group']}）" if e['kind']=='兌換視窗' else f"對話 {e['id']}")
    d=dec.get((e['npc'],src_id,fmt(e['rew'])))
    if not d or d['保留']!='✓' or (e['npc'],src_id) in HIDE or e['npc'] in HIDE_NPC: continue
    places=tuple(tuple(p) for p in e['pls'])
    key=(e['npc'],places)
    if key not in nidx:
        nidx[key]=len(npcs); npcs.append({'n':e['npc'],'p':[list(p) for p in places]})
    note=(d.get('備註（請填）') or '').strip()
    g=label(e['menu'])
    row={'v':d.get('資料片') or '不確定','k':d.get('類別') or '兌換','p':nidx[key],'g':g,'m':q(e['mat']),'r':q(e['rew'])}
    # 名聲／金錢 paid for the exchange read as the first material, not as a note at the end
    cost=[]
    if e.get('fame'): cost.append(['名聲',int(e['fame']),0])
    conds=[]
    for x in (e.get('cond') or '').split('；'):
        m=re.fullmatch(r'(名聲|金錢) -([\d,]+)( 兩)?',x)
        if m: cost.append([m.group(1),int(m.group(2).replace(',','')),0])
        elif x: conds.append(x)
    row['m']=cost+row['m']
    # 月服／免服 versions get their own heading
    srv=[x for x in conds if x in ('月服','免服')]
    if srv:
        conds=[x for x in conds if x not in srv]
        note=(note+'・' if note else '')+srv[0]
    # only the owner's own headings (神魂寶石、老手禮…) and 月服／免服 are shown; menu text is not
    if note: row['h']=note
    if conds: row['c']='；'.join(conds)
    lim=limit({**e,'fame':''})
    if e['kind']=='對話兌換' and len(e['mult'])>1: lim='；'.join(x for x in (lim,'可一次換 '+'／'.join(f"{m//min(e['mult'])}" for m in sorted(e['mult']))+' 份') if x)
    if lim: row['l']=lim
    rows.append(row)
MATS=['皇龍虹鉻','皇龍純金','皇龍星銀','皇龍至鋼','鋼粹之心','天鋼之心','藥煉之菁','天藥之菁','寂滅淨元','同花大聖鑽']
vers=[v for v in ORDER+['中原（常駐）','節慶活動','不確定'] if any(r['v']==v for r in rows)]
vers=[v for v in ['中原（常駐）'] if v in vers]+[v for v in vers if v!='中原（常駐）']
data={'version':'exchange-1112','vers':vers,'mats':[[m,iid.get(m,0)] for m in MATS],'npcs':npcs,'rows':rows}
json.dump(data,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,separators=(',',':'))
print(len(rows),'rows',len(npcs),'npcs',collections.Counter(r['v'] for r in rows).most_common(), 'mats rows',sum(any(x[0] in MATS for x in r['r']) for r in rows))
