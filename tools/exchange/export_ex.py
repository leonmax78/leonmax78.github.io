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
HIDE_MAT={'藍方募款傳單','綠方募款傳單'}   # quest hand-ins the owner removed
HIDE_NPC={'夸父幼童','巫醫','老祭司','包月長'}
npcs=[]; nidx={}; seen_rows=set()
rows=[]
for e in recipes.values():
    src_id=(f"兌換 {e['id']}（組 {e['group']}）" if e['kind']=='兌換視窗' else f"對話 {e['id']}")
    d=dec.get((e['npc'],src_id,fmt(e['rew'])))
    if not d or d['保留']!='✓' or (e['npc'],src_id) in HIDE or e['npc'] in HIDE_NPC or any(n in HIDE_MAT for n,_ in e['mat']): continue
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
    if e.get('bright'): cost.append(['靈氣',int(e['bright']),0])
    conds=[]
    for x in (e.get('cond') or '').split('；'):
        m=re.fullmatch(r'(名聲|金錢) -([\d,]+)( 兩)?',x)
        if m: cost.append([m.group(1),int(m.group(2).replace(',','')),0])
        elif x: conds.append(x)
    row['m']=cost+row['m']
    # 賞金獵人: grouped by his own top menu (特殊交易、霹靂聯動…)
    if not note and e['npc']=='賞金獵人':
        top=[x for x in (p.strip('【】 ').strip() for p in (e['menu'] or '').split(' › ')) if x and not SKIP.search(x)]
        if top: note=top[0]
    # 欽差大臣: 印信 / 快速兌換 / 龍川金選 / 銀票 (owner request)
    if not note and e['npc']=='欽差大臣':
        mn=e['menu'] or ''
        note='龍川至寶金選禮券' if '龍川' in mn else '銀票兌換' if '銀票' in mn else '快速兌換印信' if '快速' in mn else '兌換印信'
    # 侯利蒙: 奇蹟 and 聖恩 lottery under their own headings (owner request)
    if not note and e['npc']=='侯利蒙':
        names=' '.join(n for n,_ in e['mat']+e['rew'])
        note='奇蹟' if '奇蹟' in names else '聖恩' if '聖恩' in names else ''
    # 頂峰軍需官: 真元／聖鑽／以太 (owner request)
    if not note and e['npc']=='頂峰軍需官' and e['mat']:
        n0=e['mat'][0][0]
        note='真元' if '真元' in n0 else '聖鑽' if '聖鑽' in n0 else '以太' if '以太' in n0 else ''
    # 摩羅黑市高幹: 天鋼之心 and 鋼粹之心 apart (owner request)
    if not note and e['npc']=='摩羅黑市高幹' and e['rew'] and e['rew'][0][0] in ('天鋼之心','鋼粹之心','四聖諦碎片'):
        note='換'+e['rew'][0][0]
    # 無式仙者: glow on/off of the same weapon (owner: 發光消光變換)
    if not note and e['npc']=='無式仙者' and e['mat'] and e['rew'] and e['mat'][0][0]==e['rew'][0][0]:
        note='發光消光變換'
    # 天工神匠: 新星 and 無限流 apart (owner request)
    if not note and e['npc']=='天工神匠':
        mn=e['menu'] or ''
        note='無限流' if '無限流' in mn else '新星' if '新星' in mn else ''
    # 月服／免服 versions get their own heading
    srv=[x for x in conds if x in ('月服','免服')]
    if srv:
        conds=[x for x in conds if x not in srv]
        note=(note+'・' if note else '')+srv[0]
    # only the owner's own headings (神魂寶石、老手禮…) and 月服／免服 are shown; menu text is not
    # 上師藥班禪: 天藥之菁 and 藥煉之菁 are listed under their own headings (owner request)
    if not note and e['npc']=='上師藥班禪' and len(e['rew'])==1 and e['rew'][0][0] in ('天藥之菁','藥煉之菁'): note='換'+e['rew'][0][0]
    # 上師石章嘉: what 天藥之菁 / 藥煉之菁 buy, each under its own heading
    if not note and e['npc']=='上師石章嘉' and len(e['mat'])==1 and e['mat'][0][0] in ('天藥之菁','藥煉之菁'): note='用'+e['mat'][0][0]
    # 侯利祖: 麻辣月卡 is the 月服 version, the 租券 ones are 免服 (owner)
    if e['npc']=='侯利祖' and e['mat']:
        note='月服' if e['mat'][0][0]=='麻辣月卡' else '免服'
    if note: row['h']=note
    if conds: row['c']='；'.join(conds)
    lim=limit({**e,'fame':''})
    if e['kind']=='對話兌換' and len(e['mult'])>1: lim='；'.join(x for x in (lim,'可一次換 '+'／'.join(f"{m//min(e['mult'])}" for m in sorted(e['mult']))+' 份') if x)
    if lim: row['l']=lim
    dk=json.dumps(row,ensure_ascii=False,sort_keys=True)
    if dk in seen_rows: continue      # the same exchange reached by two menu routes
    seen_rows.add(dk)
    rows.append(row)
# 上師石章嘉: cheapest first inside each heading (owner request)
order={n:i for i,n in enumerate(['用天藥之菁','用藥煉之菁'])}
shi=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='上師石章嘉']
if shi:
    srt=sorted((rows[i] for i in shi),key=lambda r:(order.get(r.get('h'),9),r['m'][0][1] if r['m'] else 0))
    for i,r in zip(shi,srt): rows[i]=r
# 義軍資深專員: the 七年禮 swap (one 七年禮 piece + 兩百萬兩銀票 → another) is a note on the 七年禮 line
swap=[r for r in rows if npcs[r['p']]['n']=='義軍資深專員' and any(x[0]=='兩百萬兩銀票' for x in r['m'])]
if swap:
    rows[:]=[r for r in rows if r not in swap]
    for r in rows:
        if npcs[r['p']]['n']=='義軍資深專員' and r['m'] and r['m'][0][0]=='七年禮兌換券':
            r['l']='；'.join(x for x in (r.get('l'),'可用兩百萬兩銀票交換其他七年禮') if x)
# 六滅化神 tiers, lowest first (from the 無式仙者 chain and the 聖獸血魄 prices)
LM=['','真','超','絕','無','帝','終','創','星','皇','終極']
def lm_tier(r):
    for x in r['m']+r['r']:
        n=x[0]
        m=re.match(r'^(終極|[真超絕無帝終創星皇])?[‧·]?六滅化神',n)
        if m: return LM.index(m.group(1) or '')
    return 99
for who in ('侏人巧匠','無式仙者'):
    ix=[i for i,r in enumerate(rows) if npcs[r['p']]['n']==who and lm_tier(r)<99]
    if ix:
        srt=sorted((rows[i] for i in ix),key=lambda r:(lm_tier(r),0 if r['m'] and '六滅化神' in r['m'][0][0] and '‧' in r['m'][0][0] or (r['m'] and r['m'][0][0]=='六滅化神') else 1))
        for i,r in zip(ix,srt): rows[i]=r
mi=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='摩羅黑市高幹']
if mi:
    srt=sorted((rows[i] for i in mi),key=lambda r:({'換天鋼之心':0,'換鋼粹之心':1,'換四聖諦碎片':2}.get(r.get('h'),3),r['r'][0][1] if r['r'] else 0))
    for i,r in zip(mi,srt): rows[i]=r
# 無式仙者 發光消光變換: by weapon level, lowest first
_lv=lambda r:int((byid_all.get(r['m'][0][2]) or {}).get('Level') or 0) if r['m'] else 0
byid_all={int(x['ID']):x for x in it}
gi=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='無式仙者' and r.get('h')=='發光消光變換']
if gi:
    srt=sorted((rows[i] for i in gi),key=_lv)
    for i,r in zip(gi,srt): rows[i]=r
# 天工神匠: 新星 first, then 無限流 by tier (第一階…第八階), 神兵 before 防具
ZHD={c:i for i,c in enumerate('一二三四五六七八九十',1)}
def _tg(r):
    m=re.search(r'第([一二三四五六七八九十])階',r.get('g') or '')
    return ZHD.get(m.group(1),0) if m else 0
ti=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='天工神匠']
if ti:
    srt=sorted((rows[i] for i in ti),key=lambda r:({'新星':0,'無限流':1}.get(r.get('h'),2),_tg(r),0 if '神兵' in (r.get('g') or '') else 1 if '稀有' not in (r.get('g') or '') else 2))
    for i,r in zip(ti,srt): rows[i]=r
# 無忌大仙: 無限元石 → 無限天印 → 大無限天印, smaller amounts first
_wj=lambda r:({'無限元石':0,'無限天印':1,'大無限天印':2}.get(r['m'][0][0],3) if r['m'] else 3, r['m'][0][1] if r['m'] else 0)
wi=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='無忌大仙']
if wi:
    srt=sorted((rows[i] for i in wi),key=_wj)
    for i,r in zip(wi,srt): rows[i]=r
DF=['真元','聖鑽','以太']
di=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='頂峰軍需官']
if di:
    srt=sorted((rows[i] for i in di),key=lambda r:DF.index(r['h']) if r.get('h') in DF else 9)
    for i,r in zip(di,srt): rows[i]=r
QC=['兌換印信','快速兌換印信','龍川至寶金選禮券','銀票兌換']
qi=[i for i,r in enumerate(rows) if npcs[r['p']]['n']=='欽差大臣']
if qi:
    srt=sorted((rows[i] for i in qi),key=lambda r:QC.index(r['h']) if r.get('h') in QC else 9)
    for i,r in zip(qi,srt): rows[i]=r
# an NPC's rows with no heading take the owner's heading when all its other rows share one
byp=collections.defaultdict(list)
for r in rows: byp[r['p']].append(r)
for lst in byp.values():
    hs={r.get('h') for r in lst if r.get('h')}
    miss=[r for r in lst if not r.get('h')]
    if len(hs)==1 and miss and len(miss)<=len(lst)//4:
        for r in miss: r['h']=next(iter(hs))
# 義軍資深專員 sits next to 義軍補給員 (both hand out 老手禮)
def _move_after(a,b):
    ia=[i for i,r in enumerate(rows) if npcs[r['p']]['n']==a]; ib=[i for i,r in enumerate(rows) if npcs[r['p']]['n']==b]
    if not ia or not ib: return
    moving=[rows[i] for i in ia]; rest=[r for i,r in enumerate(rows) if i not in set(ia)]
    last=max(i for i,r in enumerate(rest) if npcs[r['p']]['n']==b)
    rows[:]=rest[:last+1]+moving+rest[last+1:]
_move_after('義軍資深專員','義軍補給員')
MATS=['皇龍虹鉻','皇龍純金','皇龍星銀','皇龍至鋼','鋼粹之心','天鋼之心','藥煉之菁','天藥之菁','寂滅淨元','同花大聖鑽']
vers=[v for v in ORDER+['中原（常駐）','節慶活動','不確定'] if any(r['v']==v for r in rows)]
vers=[v for v in ['中原（常駐）'] if v in vers]+[v for v in vers if v!='中原（常駐）']
WEAPON={'SWORD','BLADE','HIDDEN_WEAPON','WHISK','STAFF','ROD','SPEAR','HAMMER','AXE','SHIELD'}
EQUIP=WEAPON|{'ARMOR','HELMET','BOOT','BRACER','ORNAMENT','UNDER_BOOT','MAGIC_FIGURE'}
byid={int(x['ID']):x for x in it}
# level / kind of the first material, so a set reads as 「新星裝備」「222級武器」 on the page
iv={}
for r in rows:
    for x in r['m'][:1]:
        t=byid.get(x[2])
        if t and t.get('Type') in EQUIP: iv[x[2]]=[int(t.get('Level') or 0),2 if t['Type'] in ('MAGIC_FIGURE','UNDER_BOOT') else 1 if t['Type'] in WEAPON else 0]   # 2 = 仙器
# NPCs whose order is set here; the page keeps it instead of re-sorting by amount
KEEP=['無忌大仙','天工神匠','侏人巧匠','無式仙者','摩羅黑市高幹','頂峰軍需官','欽差大臣','上師石章嘉']
data={'version':'exchange-1112','keep':[i for i,n in enumerate(npcs) if n['n'] in KEEP],'iv':iv,'vers':vers,'mats':[[m,iid.get(m,0)] for m in MATS],'npcs':npcs,'rows':rows}
json.dump(data,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,separators=(',',':'))
print(len(rows),'rows',len(npcs),'npcs',collections.Counter(r['v'] for r in rows).most_common(), 'mats rows',sum(any(x[0] in MATS for x in r['r']) for r in rows))
