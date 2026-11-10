"""Read NPC shop links from the game install: which shop each merchant's dialogue actually opens.

Usage: python tools/npc_shop_dialogs.py "C:/UserJoy/神州Online" [out.json]
Reads data1.pak + update.pak (OD archives), walks every MAP/*.MPC for NPC placements, follows each
NPC's Talk tree in MSG*/STGMSG* and collects TRADE (5) / TRADE2 (60) actions. Shop id 0 means the
NPC.INI default shop. Condition 85 (EVENT_COND_IS_FREE_SET) splits 免服 / 月服.
Then run tools/apply_npc_shop_dialogs.py with the output.
"""
import re, glob, json, os, sys, collections, struct, zlib, tempfile
from pathlib import Path
SITE = str(Path(__file__).resolve().parents[1])
# --- OD archive reader (same format as read_update.py) ---
def read_archive(data):
    if data[-22:-18]!=b'OD\x05\x06': raise ValueError('footer')
    footer=bytearray(data[-22:]); key=77 if footer[20:22]==b'\xef\xf2' else 91
    for i in range(4,22): footer[i]^=(3*i-key)&255
    magic,packed,c1,c2,size,offset,comment=struct.unpack('<4sIHHIIH',footer)
    comp=bytearray(data[offset+4:offset+4+packed]); comp[0]^=122
    d=zlib.decompress(comp); rows=[]; pos=0
    while pos<len(d):
        flags,method=struct.unpack_from('<HH',d,pos+8); crc,ps,rs=struct.unpack_from('<III',d,pos+16)
        nl,el,cl=struct.unpack_from('<HHH',d,pos+28); off=struct.unpack_from('<I',d,pos+42)[0]
        rows.append(dict(name=d[pos+46:pos+46+nl].decode('cp950').replace('\\','/'),flags=flags,method=method,crc=crc,packed_size=ps,raw_size=rs,offset=off))
        pos+=46+nl+el+cl
    return rows
def extract(data,row):
    b=data[row['offset']:row['offset']+row['packed_size']]
    raw=zlib.decompress(b,-15) if row['method']==8 else bytes(b)
    assert len(raw)==row['raw_size'] and zlib.crc32(raw)==row['crc'], row['name']
    return raw
# --- MPC objects/events ---
def parse_mpc(path):
    data=open(path,'rb').read()
    assert data[:4]==b'MAP\0'
    h=struct.unpack_from('<16I',data)
    start,count,end,events=h[6:10]
    objs=[struct.unpack_from('<19H',data,p) for p in range(start,end,38)]
    pos=end
    def read(n):
        nonlocal pos
        r=list(struct.unpack_from(f'<{n}I',data,pos));pos+=n*4;return r
    recs={}
    for _ in range(events):
        eid,cur,nb=read(3);br=[]
        for _ in range(nb):
            bid,contact,unk,nc,na=read(5)
            br.append(dict(id=bid,contact=contact,cond=[read(12) for _ in range(nc)],act=[read(12) for _ in range(na)]))
        recs[eid]=br
    return objs,recs

def extract_install(game, dest):
    for name in ('data1.pak', 'update.pak'):
        data = open(os.path.join(game, name), 'rb').read()
        for r in read_archive(data):
            n = r['name'].upper()
            if n.endswith('/') or not n.startswith(('MAP/', 'SETTING/')):
                continue
            p = os.path.join(dest, n); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(extract(data, r))


def _reach(msgs, t):
    acc, st = set(), [t]
    while st:
        m = st.pop()
        if m in acc or m not in msgs: continue
        acc.add(m); e = msgs[m]; st += [j for _, j in e.get('o', [])] + e.get('n', [])
    return acc

if __name__ == '__main__':
    tmp = tempfile.mkdtemp()
    extract_install(sys.argv[1], tmp)
    CUR = tmp

    def blocks(path,tag):
        t=open(path,'rb').read().decode('cp950','replace')
        out=[]
        for b in re.split(r'^\['+tag+r'\]\s*$',t,flags=re.M)[1:]:
            d=collections.defaultdict(list)
            # [ \t]* (not \s*): an empty value ("OptJump2 = ") must not swallow the next line.
            for k,v in re.findall(r'^[ \t]*([A-Za-z_]+\d*)[ \t]*=[ \t]*(.*?)[ \t\r]*$',b,re.M): d[k].append(v)
            out.append(d)
        return out
    npcs={int(d['ID'][0]):d for d in blocks(f'{CUR}/SETTING/NPC.INI','NPC') if d.get('ID') and d['ID'][0].isdigit()}
    def load_msgs(files):
        m={}
        for f in files:
            for d in blocks(f,'MSG'):
                if d.get('ID') and d['ID'][0].lstrip('-').isdigit(): m[int(d['ID'][0])]=d
        return m
    base=load_msgs(sorted(glob.glob(f'{CUR}/SETTING/MSG[0-9]*.INI'),key=lambda p:int(re.search(r'MSG(\d+)',p).group(1))))
    legacy=load_msgs([f'{CUR}/SETTING/MSG.INI'])
    stg={int(re.search(r'STGMSG(\d+)',p).group(1)):load_msgs([p]) for p in glob.glob(f'{CUR}/SETTING/STGMSG*.INI')}
    ALL=dict(base)
    for _k in sorted(stg): ALL.update(stg[_k])
    def parse_trigger(s):
        t=[x.strip() for x in s.split(',')];i=0
        def nxt():
            nonlocal i;v=t[i];i+=1;return v
        try:
            nc=int(nxt());conds=[]
            for _ in range(nc):
                code=int(nxt());neg=nxt();n=int(nxt());conds.append((code,neg,[nxt() for _ in range(n)]))
            na=int(nxt());acts=[]
            for _ in range(na):
                code=int(nxt());n=int(nxt());acts.append((code,[nxt() for _ in range(n)]))
            return conds,acts
        except Exception: return None
    def shops_for(talk,stage,default):
        msgs=ALL
        seen=set();todo=[talk];found=collections.OrderedDict();bad=[]
        while todo:
            mid=todo.pop(0)
            if mid in seen or mid<=0: continue
            seen.add(mid);d=msgs.get(mid) or legacy.get(mid)
            if not d: continue
            for k in d:
                if k=='Jump' or k.startswith('OptJump'):
                    for v in d[k]:
                        if v.strip().lstrip('-').isdigit(): todo.append(int(v))
                if k.startswith('Trigger'):
                    for v in d[k]:
                        p=parse_trigger(v)
                        if not p: bad.append((mid,v));continue
                        for code,ps in p[1]:
                            if code==12 and ps and ps[0].isdigit(): todo.append(int(ps[0]))
                            if code in (5,60):
                                sid=int(ps[0]) if ps and ps[0].lstrip('-').isdigit() else None
                                sid=default if sid==0 else sid
                                found.setdefault(sid,[]).append(mid)
        return found,bad
    import json,collections

    def paths(talk,default):
        """yield (shopId, [conds]) where conds = list of (code,neg,params)"""
        out=[]
        def rec(mid,conds,seen):
            if mid in seen or mid<=0 or len(seen)>40: return
            seen=seen|{mid}
            d=ALL.get(mid) or legacy.get(mid)
            if not d: return
            prev=[]
            trig=[(k,v) for k in d if k.startswith('Trigger') for v in d[k]]
            trig.sort(key=lambda kv:int(kv[0][7:] or 0))
            for k,v in trig:
                p=parse_trigger(v)
                if not p: continue
                cs=[(c,neg=='True',ps) for c,neg,ps in p[0]]
                # earlier siblings that had a single condition become negated context
                here=conds+[(c,not n,ps,'else') for pc in prev if len(pc)==1 for (c,n,ps) in pc]+cs
                for code,ps in p[1]:
                    if code in (5,60):
                        sid=int(ps[0]) if ps and ps[0].lstrip('-').isdigit() else 0
                        out.append((default if sid==0 else sid,here,mid))
                    if code==12 and ps and ps[0].isdigit(): rec(int(ps[0]),here,seen)
                if cs: prev.append(cs)
            for k in d:
                if k=='Jump' or k.startswith('OptJump'):
                    lab=None
                    if k.startswith('OptJump'):
                        lab=(d.get('OptStr'+k[7:]) or [''])[0]
                    for v in d[k]:
                        if v.strip().isdigit(): rec(int(v),conds+([('opt',False,[lab])] if lab else []),seen)
        rec(talk,[],frozenset())
        return out

    mis={int(d['ID'][0]):d['Name'][0] for d in blocks(f'{CUR}/SETTING/MISSION.INI','MISSION') if d.get('ID') and d['ID'][0].isdigit() and d.get('Name')}
    items={str(i['ID']):i.get('Name','') for i in json.load(open(f'{SITE}/data/items.json'))}
    CLS={1:'勇士',2:'劍俠',4:'道人',8:'僧侶',16:'術者'}
    OPS={'0':'=','1':'>','2':'<','3':'≤','4':'≥','5':'≠'}
    NEG={'=':'≠','≠':'=','>':'≤','≤':'>','<':'≥','≥':'<'}
    def label(c):
        code,neg,ps=c[0],c[1],c[2]
        is_else=len(c)>3
        if is_else and code not in (2,85,37): return None
        if code==37: return '平時' if neg else '事件期間'
        if code=='opt': return f'選項「{ps[0]}」' if ps and ps[0] and '下一頁' not in ps[0] else None
        if code==11: return None
        if code==85: return None
        if code==2 and len(ps)>=2:
            op=OPS.get(ps[0],'=');op=NEG[op] if neg else op
            names='、'.join(v for k,v in CLS.items() if int(ps[1])&k)
            return ('限' if op=='=' else '非')+names
        if code==4 and len(ps)>=2:
            op=OPS.get(ps[0],'?');op=NEG.get(op,op) if neg else op
            return f'等級 {op} {ps[1]}'
        if code==31 and ps:
            n=items.get(ps[0],'#'+ps[0]);return ('沒有' if neg else '持有')+f'「{n}」'
        if code in (27,28,29,30) and ps:
            q=mis.get(int(ps[0]));qn=f'「{q}」' if q else f'#{ps[0]}'
            kind={27:'任務',28:'任務進度',29:'任務時限',30:'任務期限'}[code]
            return None if neg else f'{kind}{qn}'
        if code==37: return '戰事狀態'
        if code==42: return '官階條件'
        if code==73: return '武功突破狀態'
        if code==48: return None
        if code in (49,50): return '限佔領此洞府的幫會'
        return f'條件 {code}'
    def server(cs):
        for c in cs:
            if c[0]==85: return 'month' if c[1] else 'free'
        return 'both'
    def shops_of(nid,default):
        d=npcs[nid];talk=int(d['Talk'][0]) if d.get('Talk') and d['Talk'][0].isdigit() else 0
        res=collections.OrderedDict()
        notes={}
        for sid,cs,mid in paths(talk,default):
            if not sid: continue
            key=(sid,server(cs));labs=tuple(sorted(set(l for l in map(label,cs) if l)))
            res.setdefault(key,set()).add(labs)
            m=ALL.get(mid) or legacy.get(mid)
            if m and m.get('Msg'): notes.setdefault(key,m['Msg'][0])
        out=[]
        for (sid,sv),labset in res.items():
            conds=[] if () in labset else sorted(labset,key=len)[0]
            # if all paths share common labels, keep the common subset
            common=set.intersection(*[set(l) for l in labset]) if labset else set()
            conds=sorted(common) if () not in labset else []
            if '事件期間' in conds and '平時' in conds: conds.remove('平時')
            out.append(dict(id=sid,server=sv,conds=list(conds),note=notes.get((sid,sv),'')))
        ids={x['id'] for x in out if x['server']=='both'}
        out=[x for x in out if x['server']=='both' or x['id'] not in ids]
        # one shop per server needs no note; several (event tiers) keep the NPC line
        for sv in ('month','free'):
            here=[x for x in out if x['server'] in (sv,'both')]
            if len(here)<=1:
                for x in here: x['note']=''
        order={'平時':0}
        out.sort(key=lambda x:({'both':0,'month':1,'free':2}[x['server']],0 if '平時' in x['conds'] or not x['conds'] else 1,x['id']))
        return out

    place=collections.defaultdict(set)
    for p in glob.glob(f'{CUR}/MAP/STAGE*.MPC'):
        sid=int(re.search(r'STAGE(\d+)',p).group(1))
        try: objs,_=parse_mpc(p)
        except Exception as e: continue
        for o in objs:
            for nid in (o[7],o[9]):
                if nid in npcs: place[sid].add(nid)
    site=json.load(open(f'{SITE}/data/stage_maps.json'))
    shopset={s['shopId'] for s in json.load(open(f'{SITE}/data/shop_all.json'))['shops']}
    rows=[]
    sitemap=collections.defaultdict(dict)
    for st in site['stages']:
        for n in st.get('npcs',[]): sitemap[st['stageId']].setdefault(n['id'],set()).add(str(n.get('shop') or ''))
    names={st['stageId']:st['stageName'] for st in site['stages']}
    for sid in sorted(place):
        for nid in sorted(place[sid]):
            d=npcs[nid];default=int(d['Shop'][0]) if d.get('Shop') and d['Shop'][0].isdigit() else None
            talk=int(d['Talk'][0]) if d.get('Talk') and d['Talk'][0].isdigit() else 0
            found,bad=shops_for(talk,sid,default)
            game=sorted(k for k in found if k)
            siteshop=sitemap.get(sid,{}).get(nid)
            if not game and not default and not (siteshop and siteshop-{''}): continue
            rows.append(dict(stage=sid,stageName=names.get(sid,''),npc=nid,name=d['Name'][0] if d.get('Name') else '',
                npcIniShop=default,dialogShops=game,site=sorted(siteshop) if siteshop else None,
                onSite=sid in sitemap,missingShopIds=[g for g in game if g not in shopset]))


    out = {f"{r['stage']}:{r['npc']}": shops_of(r['npc'], r['npcIniShop']) for r in rows}
    out = {k: v for k, v in out.items() if v}
    target = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SITE, 'tools/data/npc_shop_dialogs.json')
    Path(target).write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print(len(rows), 'merchant placements ->', target)

    # NPC dialogue trees for the map's NPC panel: data/npc-talk/n{id}.json
    site=json.load(open(f'{SITE}/data/stage_maps.json'))
    ids=sorted({n['id'] for s in site['stages'] for n in s.get('npcs',[]) if isinstance(n['id'],int)})
    INTERNAL=('檢查','接檢查','判斷','事件對話','事件買賣')
    msgs={};npcout={}
    def cond_label(code, neg, ps):
        if code == 11 and len(ps) >= 2:
            op = OPS.get(ps[0], '?'); op = NEG.get(op, op) if neg else op
            return f'名聲 {op} {ps[1]}'
        if code == 85:
            return '月服' if neg else '免服'
        return label((code, neg, ps))
    def num(v):
        try: return int(v)
        except Exception: return 0
    def item_name(i): return items.get(str(i), f'#{i}')
    def act_label(code, ps):
        v = [num(x) for x in ps]
        if code == 8 and v: return f'獲得「{item_name(v[0])}」×{max(1, v[1] if len(v) > 1 else 1)}'
        if code == 37 and v: return f'交出「{item_name(v[0])}」×{max(1, v[1] if len(v) > 1 else 1)}'
        if code == 27 and v: return f'經驗 {(v[-1] if len(v) > 1 and v[0] == 0 else v[0]):+,}'
        if code == 13 and len(v) > 1 and v[1] == 15: return f'完成任務「{mis.get(v[0], v[0])}」'
        if code == 30 and v: return f'金錢 {v[0]:+,} 兩'
        if code in (29, 101) and v: return f'名聲 {v[0]:+,}'
        if code in (23, 24, 25, 26) and v: return {23: '力量', 24: '智慧', 25: '敏捷', 26: '體魄'}[code] + f' {v[0]:+}'
        if code in (19, 20) and v: return ('生命' if code == 19 else '精力') + f' {v[0]:+,}'
        if code in (21, 22) and v: return ('生命上限' if code == 21 else '精力上限') + f' {v[0]:+,}'
        if code == 33 and v: return f'接下任務「{mis.get(v[0], v[0])}」'
        if code == 38 and v: return f'任務「{mis.get(v[0], v[0])}」結束'
        if code == 34 and v: return f'取消任務「{mis.get(v[0], v[0])}」'
        if code == 28: return '學會技能'
        if code == 45: return '學會配方'
        if code in (3, 9, 69, 74): return '傳送'
        if code == 41: return '開啟倉庫'
        if code == 43: return '開啟合成'
        if code == 49 and v: return f'等級設為 {v[0]}'
        if code == 106: return '隨機獲得物品'
        if code == 108: return '領取禮物'
        if code == 94: return '兌換獎章'
        if code == 93: return '延長期限'
        if code == 95: return '擴充倉庫'
        return None
    def walk(mid,depth):
        if mid in msgs or mid<=0 or depth>14: return
        d=ALL.get(mid) or legacy.get(mid)
        if not d: return
        e={'m':d.get('Msg',[''])[0].replace('\\n','\n')}
        if e['m'].startswith(INTERNAL): e['x']=1
        elif not d.get('Face') and re.search(r'（\d+）.*接|接.*（\d+）|^(完成|檢查|判斷|事件|接)', e['m']): e['x']=1
        elif not d.get('Face'): e['p']=1
        if d.get('Face') and str(d['Face'][0]).strip().isdigit() and not e.get('x'): e['f']=int(d['Face'][0])
        opts=[]
        for i in range(1,10):
            lab=(d.get(f'OptStr{i}') or [''])[0]; j=(d.get(f'OptJump{i}') or [''])[0]
            if lab: opts.append([lab,int(j) if j.strip().isdigit() else 0])
        nxt=[];shops=[]
        for k in d:
            if k=='Jump':
                for v in d[k]:
                    if v.strip().isdigit(): nxt.append(int(v))
            if k.startswith('Trigger'):
                for v in d[k]:
                    p=parse_trigger(v)
                    if not p: continue
                    for c,ps in p[1]:
                        if c==12 and ps and ps[0].isdigit(): nxt.append(int(ps[0]))
                        if c in (5,60): shops.append(int(ps[0]) if ps and ps[0].lstrip('-').isdigit() else 0)
        tr=[]
        for k in sorted((k for k in d if k.startswith('Trigger')), key=lambda k: int(k[7:] or 0)):
            for v in d[k]:
                p=parse_trigger(v)
                if not p: continue
                cs=[l for l in (cond_label(c, neg == 'True', ps) for c, neg, ps in p[0]) if l]
                acts=[l for l in (act_label(c, ps) for c, ps in p[1]) if l]
                j=next((int(ps[0]) for c, ps in p[1] if c == 12 and ps and ps[0].isdigit()), 0)
                if acts or (j and cs):
                    t={}
                    if cs: t['c']=cs
                    if acts: t['a']=acts
                    if j: t['j']=j
                    tr.append(t)
        if tr: e['tr']=tr
        if opts: e['o']=opts
        if nxt: e['n']=list(dict.fromkeys(nxt))
        if shops: e['s']=sorted(set(shops))
        msgs[mid]=e
        for _,j in opts: walk(j,depth+1)
        for j in nxt: walk(j,depth+1)
    for i in ids:
        d=npcs.get(i)
        if not d: continue
        t=int(d['Talk'][0]) if d.get('Talk') and d['Talk'][0].isdigit() else 0
        npcout[i]={'n':d['Name'][0] if d.get('Name') else '','t':t}
        if d.get('Describe'): npcout[i]['d']=d['Describe'][0]
        walk(t,0)


    talk_dir = Path(SITE) / 'data/npc-talk'
    talk_dir.mkdir(parents=True, exist_ok=True)
    for old in talk_dir.glob('n*.json'):
        old.unlink()
    for i, info in npcout.items():
        part = dict(info); part['msgs'] = {m: msgs[m] for m in sorted(_reach(msgs, info['t']))}
        (talk_dir / f'n{i}.json').write_text(json.dumps(part, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(len(npcout), 'npc talk files ->', talk_dir)
