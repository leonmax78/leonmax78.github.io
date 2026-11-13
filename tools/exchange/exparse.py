import re,json,glob,collections
import os
G=os.environ.get('SZO_SETTING','tmp/game/SETTING').rstrip('/')+'/'
def blocks(fn,tag):
    t=open(G+fn,encoding='cp950',errors='ignore').read()
    out=[]
    for b in t.split(f'[{tag}]')[1:]:
        d=collections.OrderedDict()
        for l in b.splitlines():
            m=re.match(r'\s*([A-Za-z_0-9]+)\s*=\s*(.*)',l)
            if m: d.setdefault(m.group(1),[]).append(m.group(2).strip())
        out.append(d)
    return out

def parse_trigger(s):
    v=[x.strip() for x in s.split(',')]
    i=0
    def nxt():
        nonlocal i
        x=v[i] if i<len(v) else ''; i+=1; return x
    try:
        nc=int(nxt()); conds=[]
        for _ in range(nc):
            code=int(nxt()); neg=nxt()=='True'; n=int(nxt()); conds.append((code,neg,[nxt() for _ in range(n)]))
        na=int(nxt()); acts=[]
        for _ in range(na):
            code=int(nxt()); n=int(nxt()); acts.append((code,[nxt() for _ in range(n)]))
        return conds,acts
    except Exception: return None
def all_msgs():
    out={}
    import os
    for f in sorted(glob.glob(G+'MSG*.INI'))+sorted(glob.glob(G+'STGMSG*.INI')):
        for d in blocks(os.path.basename(f),'MSG'):
            if 'ID' in d:
                try: out[int(d['ID'][0])]=d
                except: pass
    return out
