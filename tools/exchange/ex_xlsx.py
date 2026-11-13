import json,sys,collections,math,re
from functools import reduce
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
d=json.load(open(sys.argv[1],encoding='utf-8')); out=sys.argv[2]
# carry over what the user already filled in (保留／類別／資料片／備註), keyed by 來源ID + 獲得
prev={}; prev_orphan={}
if len(sys.argv)>3:
    from openpyxl import load_workbook
    import warnings; warnings.simplefilter('ignore')
    pw=load_workbook(sys.argv[3])
    for n in pw.sheetnames:
        ws_=pw[n]; h=[c.value for c in ws_[1]]
        if '來源ID' not in h: continue
        for r in ws_.iter_rows(min_row=2,values_only=True):
            r=dict(zip(h,r))
            if not r.get('來源ID'): continue
            if n=='未接上NPC': prev_orphan[str(r['來源ID'])]=r
            else: prev[(str(r['來源ID']),r.get('獲得'))]=r
TODAY='2026-11-13'
F='Arial'; head_fill=PatternFill('solid',fgColor='1F3A5F'); grp_fill=PatternFill('solid',fgColor='E8EEF6'); edit_fill=PatternFill('solid',fgColor='FFF7D6'); thin=Side(style='thin',color='C9D3E0')
def fmt(lst):
    acc=collections.OrderedDict()
    for n,c in lst: acc[n]=acc.get(n,0)+c
    lst=list(acc.items())
    return ' ＋ '.join(f"{n} ×{c:,}" if c!=1 else n for n,c in lst)
def kind_of(r):
    last=(r.get('menu') or '').split(' › ')[-1]
    t=(r.get('name') or '')+' '+last
    if re.search(r'拆解|磨碎|分解|粉碎|化為',t): return '拆解'
    if re.search(r'升級|升階|升第|晉升|精製|進化|強化|提升',t): return '升級'
    return '兌換'
def limit(r):
    bits=[]
    if r.get('fame'): bits.append(f"名聲 {int(r['fame']):,}")
    if r.get('limit'): bits.append(f"限換 {r['limit']} 次")
    if r.get('end'): bits.append(('已過期 ' if r['end'][:10]<TODAY else '期限至 ')+r['end'])
    return '；'.join(bits)
# merge places; collapse dialogue rows that only differ by a multiplier (×1/×10/×100)
for r in d['rows']: r['kind']='兌換視窗'
recipes=collections.OrderedDict()
for r in d['rows']+d['dialog']:
    if r['kind']=='兌換視窗': key=(r['npc'],'W',r['id'])
    else:
        counts=[c for _,c in r['mat']+r['rew']]
        g=reduce(math.gcd,counts) or 1
        key=(r['npc'],'D',tuple((n,c//g) for n,c in r['mat']),tuple((n,c//g) for n,c in r['rew']),r['cond'])
    e=recipes.get(key)
    if e is None:
        recipes[key]=e={**r,'places':[],'pls':[],'mult':set()}
    elif r['kind']=='對話兌換' and sum(c for _,c in r['mat'])<sum(c for _,c in e['mat']):
        keep=e['places'],e['mult']; e.update(r); e['places'],e['mult']=keep
    pl=f"{r['stage']}({r['x']},{r['y']})"
    if pl not in e['places']:
        e['places'].append(pl); e.setdefault('pls',[]).append([r.get('sid'),r.get('nid'),r['stage'],r['x'],r['y']])
    if r['kind']=='對話兌換': e['mult'].add(sum(c for _,c in r['mat']))
CITIES=['京城','祁州城','玄州城','鬼城']
ORDER=['深淵','龍川事變','六宇浮上','神州20 II','神州20','赤膽征長疆','武俠神域','天罪','唯我頂天','勝者為王','俠者無敵','問頂仙途','十字聖戰','波斯聖域','五派頂峰','無間煉獄','梵天劫','決戰東瀛','西域傳奇','地火神兵','蒼狼劫','古墓秘境','東海龍宮','桃花仙境','修羅境','終末之塔','虛空大秘境','七寶','通寶花園','聯動']
MAPG=json.load(open(sys.path[0]+'/map_group.json',encoding='utf-8'))
def version_of(e):
    # 資料片 from the site's own map classification (data/map-taxonomy.js)
    st=list(dict.fromkeys(p.split('(')[0] for p in e['places']))
    gs=[MAPG.get(s) for s in st]
    if sum(s in CITIES for s in st)>=2: return '中原（常駐）'
    exp=[g for g in gs if g and g!='中原地圖']
    if exp: return min(exp,key=lambda g: ORDER.index(g) if g in ORDER else 99)   # newest expansion wins
    return '中原（常駐）' if gs and all(g=='中原地圖' for g in gs) else None
def area(e):
    st=[p.split('(')[0] for p in e['places']]
    cs=[c for c in CITIES if c in st]
    if len(cs)>=2: return '三城共通'
    if cs: return cs[0]
    return '其他地圖'
HEAD=['保留','類別','資料片','地圖','NPC','座標（所有地點）','對話選單','方式','兌換名稱','需求材料','其他條件','獲得','限制／期限','備註（請填）','來源ID']
WID=[6,7,14,12,14,26,40,10,22,46,16,40,20,20,9]
NEW=[]
def sheet(wb,title,ents,by_stage=False):
    NEW.clear()
    ws=wb.create_sheet(title); ws.append(HEAD)
    for i,h in enumerate(HEAD,1):
        c=ws.cell(1,i); c.font=Font(name=F,bold=True,color='FFFFFF'); c.fill=head_fill; c.alignment=Alignment(horizontal='center',vertical='center',wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width=WID[i-1]
    ws.freeze_panes='F2'
    vv=DataValidation(type='list',formula1=VLIST,allow_blank=True); ws.add_data_validation(vv)
    dv=DataValidation(type='list',formula1='"✓,✗"',allow_blank=True); ws.add_data_validation(dv)
    groups=collections.OrderedDict()
    for e in ents: groups.setdefault((e['places'][0].split('(')[0] if by_stage else '', e['npc']),[]).append(e)
    for (stg,npc),lst in sorted(groups.items(),key=lambda kv:(kv[0][0],kv[0][1])):
        ws.append([None,None,None,stg or None,f"【{npc}】 {len(lst)} 項"]); rr=ws.max_row
        for i in range(1,len(HEAD)+1): ws.cell(rr,i).fill=grp_fill; ws.cell(rr,i).font=Font(name=F,bold=True)
        lst.sort(key=lambda e:(e['menu'],e['kind'],e['id']))
        for e in lst:
            note=''
            if e['kind']=='對話兌換' and len(e['mult'])>1: note='可一次換多份（'+'／'.join(f"×{m//min(e['mult'])}" for m in sorted(e['mult']))+'）'
            ws.append(['✓',kind_of(e),version_of(e),'、'.join(dict.fromkeys(p.split('(')[0] for p in e['places'])),e['npc'],'、'.join(e['places']),e['menu'],e['kind'],e.get('name') or '',
                       fmt(e['mat']),e.get('cond',''),fmt(e['rew']),'；'.join(x for x in (limit(e),note) if x),None,(f"兌換 {e['id']}（組 {e['group']}）" if e['kind']=='兌換視窗' else f"對話 {e['id']}")])
            rr=ws.max_row; dv.add(ws.cell(rr,1)); vv.add(ws.cell(rr,3))
            p=prev.get((str(ws.cell(rr,15).value),ws.cell(rr,12).value))
            if p:
                for col,k in ((1,'保留'),(2,'類別'),(3,'資料片'),(14,'備註（請填）')):
                    if p.get(k) not in (None,''): ws.cell(rr,col).value=p[k]
            else: NEW.append(rr)
            for i in range(1,len(HEAD)+1):
                c=ws.cell(rr,i); c.font=Font(name=F,size=10); c.alignment=Alignment(vertical='top',wrap_text=i in (6,7,9,10,12,13)); c.border=Border(bottom=thin)
            for i in (1,2,3,14): ws.cell(rr,i).fill=edit_fill
            ws.cell(rr,1).alignment=Alignment(horizontal='center',vertical='top')
    if prev:
        for rr in NEW: ws.cell(rr,15).fill=PatternFill('solid',fgColor='D9F2D9'); ws.cell(rr,15).value=str(ws.cell(rr,15).value)+' 新增'
    ws.auto_filter.ref=f'A1:{get_column_letter(len(HEAD))}{ws.max_row}'
    return ws
VERS=['深淵','龍川事變','六宇浮上','神州20 II','神州20','赤膽征長疆','武俠神域','天罪','唯我頂天','勝者為王','俠者無敵','問頂仙途','十字聖戰','波斯聖域','五派頂峰','無間煉獄','梵天劫','西域傳奇','地火神兵','決戰東瀛','桃花仙境','蒼狼劫','古墓秘境','東海龍宮','修羅境','中原（常駐）','虛空大秘境','終末之塔','七寶','通寶花園','聯動','節慶活動','不確定']
wb=Workbook(); info=wb.active; info.title='說明'
lst=wb.create_sheet('資料片清單')
lst.append(['資料片（可自行增刪，下拉選單會跟著變）']); lst.cell(1,1).font=Font(name=F,bold=True); lst.column_dimensions['A'].width=40
for v in VERS: lst.append([v])
VLIST="'資料片清單'!$A$2:$A$60"
ents=list(recipes.values())
by=collections.defaultdict(list)
for e in ents: by[area(e)].append(e)
lines=[('兌換清單確認表（2026-11-12 版遊戲檔）',True),
('資料來源：EXCHANGE.INI（NPC 開啟的兌換視窗）＋ 各 NPC 對話裡「交出道具 → 獲得道具」的兌換。任務流程中的交付不列入。',False),
('NPC 與座標取自網站地圖上有擺放的 NPC；同一個 NPC 在多個地圖都有時，座標欄會全部列出。',False),('',False),
('要你確認的欄位（淡黃色）：',True),
('A「保留」：✓ 放上網站、✗ 不要。B「類別」：兌換／升級／拆解，依名稱自動判斷，分錯直接改。C「資料片」：下拉選單選擇（清單在「資料片清單」分頁，可自行增刪）。N「備註」：想改的地方寫給我。',False),('',False),
('分頁：',True),
('京城／祁州城／玄州城／鬼城：只在該城出現的 NPC。',False),
('三城共通：兩個以上主城都有的 NPC（賞金獵人、錢莊理事、寶石交易商、神州小福星…）。',False),
('其他地圖：主城以外（虛空大秘境、龍川府、四聖祭台…），依地圖排序。',False),
('未接上NPC：遊戲檔裡有、但目前地圖上沒有 NPC 會開啟的兌換（多為舊活動、舊季晶幣、聯動舊版），請看要不要保留。',False),('',False),
('說明：「方式」= 兌換視窗（選單打開的兌換表）或 對話兌換（點選項直接換）。降神之魂使用、魂魄化為靈氣這類也算在小福星的對話兌換裡。',False),
('對話兌換的 ×1／×10／×100 只列一筆，於「限制／期限」註明可一次換多份。',False),
('資料片：依網站地圖分類（地圖頁的資料片分組）自動帶入，NPC 在兩個以上主城出現的算「中原（常駐）」；有錯直接用下拉選單改。',False),
('第二版：補上「交出」和「給予」寫在不同指令裡的對話兌換（例如吐蕃集鎮 上師石章嘉、秘宗表揚使、鋼粹神匠，頂峰軍需官、侯利頌等）。這次新增的列，來源ID 會標綠色並寫「新增」；你上一版填的 ✓／✗、類別、資料片、備註都已保留。',False),
('沒有機率資料：隨機寶物只寫「隨機寶物」，不附掉率。',False)]
for t,b in lines: info.append([t]); info.cell(info.max_row,1).font=Font(name=F,bold=b,size=12 if b else 11)
info.column_dimensions['A'].width=120
for name in CITIES+['三城共通']:
    if by[name]: sheet(wb,name,by[name])
sheet(wb,'其他地圖',by['其他地圖'],by_stage=True)
# orphans
ws=wb.create_sheet('未接上NPC'); oh=['保留','資料片','組','兌換名稱','需求材料','獲得','限制／期限','遊戲裡有開啟對話','備註（請填）','來源ID']
ws.append(oh)
for i,h in enumerate(oh,1):
    c=ws.cell(1,i); c.font=Font(name=F,bold=True,color='FFFFFF'); c.fill=head_fill
    ws.column_dimensions[get_column_letter(i)].width=[6,14,6,24,46,40,24,12,20,9][i-1]
dv=DataValidation(type='list',formula1='"✓,✗"',allow_blank=True); ws.add_data_validation(dv)
vv=DataValidation(type='list',formula1=VLIST,allow_blank=True); ws.add_data_validation(vv)
for r in sorted(d['orphan'],key=lambda r:(r['group'],r['id'])):
    ws.append(['✗',None,r['group'],r['name'],fmt(r['mat']),fmt(r['rew']),limit(r),'有' if r['opened'] else '無',None,r['id']])
    rr=ws.max_row; dv.add(ws.cell(rr,1)); vv.add(ws.cell(rr,2))
    p=prev_orphan.get(str(r['id']))
    if p:
        for col,k in ((1,'保留'),(2,'資料片'),(9,'備註（請填）')):
            if p.get(k) not in (None,''): ws.cell(rr,col).value=p[k]
    for i in range(1,len(oh)+1): c=ws.cell(rr,i); c.font=Font(name=F,size=10); c.alignment=Alignment(vertical='top',wrap_text=i in (4,5,6))
    for i in (1,2,9): ws.cell(rr,i).fill=edit_fill
ws.freeze_panes='D2'; ws.auto_filter.ref=f'A1:J{ws.max_row}'
wb.move_sheet('資料片清單', offset=len(wb.sheetnames))
wb.save(out)
print({k:len(v) for k,v in by.items()}, 'orphan',len(d['orphan']))
