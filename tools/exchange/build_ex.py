import sys,json,glob,os,re,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from exparse import *
SITE=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ex=blocks('EXCHANGE.INI','EXCHANGE')
items={r['ID'][0]:r['Name'][0] for r in blocks('ITEM.INI','ITEM') if 'ID' in r and 'Name' in r}
M=all_msgs()
# act 109 = open exchange window of a group
open_at=collections.defaultdict(set)   # group -> msg ids
for mid,d in M.items():
    for k,v in d.items():
        if k.startswith('Trigger'):
            p=parse_trigger(v[0])
            if p:
                for code,ps in p[1]:
                    if code==109 and ps: open_at[ps[0]].add(mid)
# msg -> npc: walk the raw dialogue graph from each placed NPC's Talk root (no depth cap)
npcini={r['ID'][0]:r for r in blocks('NPC.INI','NPC') if 'ID' in r}
sm=json.load(open(SITE+'/data/stage_maps.json',encoding='utf-8'))
where=collections.defaultdict(list)
for s_ in sm['stages']:
    for n in s_.get('npcs',[]):
        if isinstance(n['id'],int): where[n['id']].append((s_['stageId'],s_['stageName'],n.get('coordX'),n.get('coordY'),n['name']))
def srv_jump(d):
    """A line that sends one server elsewhere (cond 85 + jump): (server sent away, target)."""
    for k,v in d.items():
        if k.startswith('Trigger'):
            p=parse_trigger(v[0])
            if p and len(p[0])==1 and p[0][0][0]==85 and any(c==12 for c,_ in p[1]):
                return ('月服' if p[0][0][1] else '免服')
    return None
def links(mid):
    d=M.get(mid)
    if not d: return []
    away=srv_jump(d); stay={'月服':'免服','免服':'月服'}.get(away)
    out=[]
    for k,v in d.items():
        m=re.fullmatch(r'OptJump(\d+)',k)
        if m and v[0].strip().isdigit(): out.append((int(v[0]),d.get('OptStr'+m.group(1),[''])[0],stay))
        elif re.fullmatch(r'Jump\d*',k) and v[0].strip().isdigit(): out.append((int(v[0]),None,stay))
        elif k.startswith('Trigger'):
            p=parse_trigger(v[0])
            if p:
                srv=('月服' if p[0][0][1] else '免服') if len(p[0])==1 and p[0][0][0]==85 else None
                for code,ps in p[1]:
                    if code==12 and ps and ps[0].isdigit(): out.append((int(ps[0]),None,srv))
    return out
owner=collections.defaultdict(dict)   # mid -> {nid: menu path}
server={}                             # (mid, nid) -> 月服／免服 when the way there is server-only
from collections import deque
for nid in where:
    r=npcini.get(str(nid))
    if not r or not r.get('Talk',[''])[0].isdigit(): continue
    root=int(r['Talk'][0]); q=deque([(root,[],None)]); seen={root}
    while q:
        cur,path,sv=q.popleft()
        if nid not in owner[cur]:
            owner[cur][nid]=path
            if sv: server[(cur,nid)]=sv
        for j,lab,s2 in links(cur):
            if j>0 and j not in seen:
                seen.add(j); q.append((j,path+([lab] if lab else []),s2 or sv))
def menu_path(nid,mid): return owner[mid].get(nid)
def parts(r,kind):
    out=[]
    for k in r:
        m=re.fullmatch(kind+r'(\d+)',k)
        if m and r[k][0] not in ('','0'):
            out.append((items.get(r[k][0],'#'+r[k][0]),int(r.get(k+'Count',['1'])[0] or 1)))
    return out
CITY={'京城','祁州城','玄州城','鬼城'}
# 血宮寶物商 (菩提聖原): groups 3–6 have no opening line in the client files; the owner confirmed in game
# that they are his name-for-treasure lists (larger list = 免服).
FORCED={'3':(8918,'月服'),'4':(8918,'免服'),'5':(8918,'月服'),'6':(8918,'免服')}
rows=[]; orphan=[]
for r in ex:
    g=r['Group'][0]
    base={'id':int(r['ID'][0]),'group':int(g),'name':r['Name'][0],'mat':parts(r,'Material'),'rew':parts(r,'Reward'),
          'fame':r.get('Fame',[''])[0],'bright':r.get('Bright',[''])[0],'limit':r.get('Limit',[''])[0],'end':r.get('EndTime',[''])[0]}
    npcs={}
    for mid in open_at.get(g,()):
        for nid in owner.get(mid,()):
            for st in where.get(nid,[]):
                key=(st[4],st[1])
                if key not in npcs:
                    npcs[key]=dict(sid=st[0],nid=nid,npc=st[4],stage=st[1],x=st[2],y=st[3],menu=' › '.join(menu_path(nid,mid) or []),msg=M[mid].get('Msg',[''])[0],cond=server.get((mid,nid),''))
    if g in FORCED:
        nid,srv=FORCED[g]
        for st in where.get(nid,[]):
            npcs[(st[4],st[1])]=dict(sid=st[0],nid=nid,npc=st[4],stage=st[1],x=st[2],y=st[3],menu='【以名聲值交換寶物】',msg='',cond=srv)
    if npcs:
        for v in npcs.values(): rows.append({**base,**v})
    else: orphan.append({**base,'opened':bool(open_at.get(g))})
json.dump({'rows':rows,'orphan':orphan},open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False)
print(len(rows),'rows',len({(r['npc'],r['stage']) for r in rows}),'npc-places',len(orphan),'orphan', len({r['group'] for r in orphan}),'orphan groups')

# ---- dialogue exchanges: one trigger that takes items (act 37) and gives items (act 8 / 106) ----
CLS={1:'勇士',2:'劍俠',4:'道人',8:'僧侶',16:'術者'}
OPS={'0':'=','1':'<','2':'>','3':'≤','4':'≥','5':'≠'}
def cond_text(code,neg,ps):
    v=ps
    if code==31 and len(v)>=2: return None   # held items are listed as materials
    if code==4 and len(v)>=2: return f"等級 {OPS.get(v[0],'?')} {v[1]}"
    if code==11 and len(v)>=2: return f"名聲 {OPS.get(v[0],'?')} {v[1]}"
    if code==2 and len(v)>=2:
        m=int(v[1]) if v[1].lstrip('-').isdigit() else 0
        names='、'.join(n for b,n in CLS.items() if m&b)
        return ('限' if v[0]=='0' else '非')+names
    if code==85: return '月服' if neg else '免服'
    if code==42 and v: return f"{int(v[-1])+1} 轉以上" if v[-1].isdigit() else None
    return None
QUEST_ACTS={13,33,38,34,35,36}
HERO={r['ID'][0]:r['Name'][0] for r in blocks('HERODEVELOPDROUP.INI','LIST') if 'ID' in r and 'Name' in r}
dial=[]
for nid in where:
    pass
reach=collections.defaultdict(set)
for mid,own in owner.items():
    for nid in own: reach[nid].add(mid)
seen=set()
def num(x): return int(x) if x.lstrip('-').isdigit() else 0
def mats_of(acts): return [(items.get(ps[0],'#'+ps[0]),max(1,num(ps[1]) if len(ps)>1 else 1)) for c,ps in acts if c==37 and ps]
def rews_of(acts):
    rew=[(items.get(ps[0],'#'+ps[0]),max(1,num(ps[1]) if len(ps)>1 else 1)) for c,ps in acts if c==8 and ps]
    for c,ps in acts:
        n=[num(x) for x in ps]
        if c==106: rew.append(('隨機寶物',1))
        if c==102 and len(n)>=2: rew.append((f"降神魂魄「{HERO.get(str(n[0]),n[0])}」",n[1]))
        if c==103 and n: rew.append(('靈氣',n[0]))
        if c==27 and n: rew.append(('經驗',n[0]+(n[1]*100_000_000 if len(n)>1 else 0)))
        if c in (29,101) and n and n[0]>0: rew.append(('名聲',n[0]))
    return rew
def costs_of(acts):
    out=[]
    for c,ps in acts:
        n=[num(x) for x in ps]
        if c==30 and n and n[0]<0: out.append(f"金錢 {n[0]:,} 兩")
        if c in (29,101) and n and n[0]<0: out.append(f"名聲 {n[0]:,}")
    return out
for nid,mids in reach.items():
    for mid in mids:
        d=M.get(mid)
        if not d: continue
        trig=[p for k,v in d.items() if k.startswith('Trigger') for p in [parse_trigger(v[0])] if p]
        # the game runs every trigger of the line; jumps (act 12) are checks, the rest are effects
        effects=[(conds,acts) for conds,acts in trig if not any(c==12 for c,_ in acts) or any(c==37 for c,_ in acts)]
        allacts=[a for _,acts in effects for a in acts]
        codes={c for c,_ in allacts}
        if 37 not in codes: continue
        # a trigger that both takes and gives is a complete exchange on its own (older NPCs)
        whole=[(conds,acts) for conds,acts in effects if any(c==37 for c,_ in acts) and rews_of(acts)]
        if whole:
            base=[]; variants=whole
        else:
            base=[a for conds,acts in effects if not conds for a in acts]
            variants=[(conds,acts) for conds,acts in effects if conds and rews_of(acts)] or [([],[])]
        for conds,acts in variants:
            all_=base+acts
            if any(c in QUEST_ACTS for c,_ in all_) or any(c in (27,28) for c,_,_ in conds): continue
            mat=mats_of(all_); rew=rews_of(all_)
            if not mat or not rew or sorted(map(tuple,mat))==sorted(map(tuple,rew)): continue
            cs=[x for x in (cond_text(*c) for c in conds) if x]
            for st in where.get(nid,[]):
                key=(st[4],st[1],mid,tuple(map(tuple,rew)),tuple(cs))
                if key in seen: continue
                seen.add(key)
                dial.append(dict(kind='對話兌換',sid=st[0],nid=nid,id=mid,group='',name='',mat=mat,rew=rew,fame='',limit='',end='',npc=st[4],stage=st[1],x=st[2],y=st[3],
                                 menu=' › '.join(owner[mid][nid]),msg=d.get('Msg',[''])[0],cond='；'.join(cs+([server[(mid,nid)]] if (mid,nid) in server and not any(x in ('月服','免服') for x in cs) else [])+costs_of(all_))))
for r in rows: r['kind']='兌換視窗'
out=json.load(open(sys.argv[1],encoding='utf-8')); out['dialog']=dial
json.dump(out,open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False)
print(len(dial),'dialogue exchange rows', len({(r['npc'],r['stage']) for r in dial}),'npc-places')
