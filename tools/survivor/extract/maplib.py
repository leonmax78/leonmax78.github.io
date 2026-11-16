import struct,re
from pathlib import Path
from PIL import Image
import numpy as np
MAPDIR=Path('/tmp/claude-0/-home-claude/b4ae001b-90c3-5005-a8fb-7340efba5a8d/scratchpad/gx/MAP')
def find(name):
    for p in MAPDIR.iterdir():
        if p.name.lower()==name.lower(): return p
def tile_groups(tail):
    pat=[16,0,6,0,1,2,3,4];out=[]
    for i in range(0,max(0,len(tail)-8)):
        if tail[i:i+8]==pat:
            h=i+100
            if h+4>len(tail): continue
            gw,_,gh,_=tail[h:h+4];c=gw*gh
            if gw>0 and gh>0 and len(tail[h+4:h+4+c])==c: out.append((gw,gh,tail[h+4:h+4+c]))
    return out
def load_lib():
    files=[find('area01.gic')]+sorted([p for p in MAPDIR.iterdir() if re.match(r'icon\d+\.2ic$',p.name,re.I)],key=lambda p:int(re.search(r'(\d+)',p.stem).group(1)))
    tiles={};groups=[];base=0
    for f in files:
        d=f.read_bytes()
        if d[:5]!=b'IREF0': continue
        w,h,off,cnt=struct.unpack_from('<4I',d,16)
        arr=np.frombuffer(d,dtype='<u2',count=cnt*w*h,offset=off).reshape(cnt,h,w)
        for i in range(cnt): tiles[base+i+1]=arr[i]
        ts=off+cnt*w*h*2;tail=list(struct.unpack('<'+'H'*((len(d)-ts)//2),d[ts:ts+(len(d)-ts)//2*2]))
        groups+=tile_groups(tail);base+=cnt
    return tiles,groups
def res(values,i):
    t=values[i%len(values)]
    if t>48: return t
    for s in range(1,len(values)):
        c=values[(i+s)%len(values)]
        if c>48: return c
    return t
def render(stage,lib,region=None):
    tiles,groups=lib
    d=find(f'stage{stage:03d}.mpc').read_bytes()
    W,H=struct.unpack_from('<2I',d,4)
    x0,y0,x1,y1=region or (0,0,W,H)
    out=np.zeros(((y1-y0)*32,(x1-x0)*32),dtype='<u2')
    for y in range(y0,y1):
        for x in range(x0,x1):
            _,_,low,_=struct.unpack_from('<4H',d,64+(y*W+x)*8);low&=0x7fff
            if low<len(groups):
                gw,gh,v=groups[low];tid=res(v,((y%gh)*gw+((x+2)%gw))%len(v))
            else: tid=low
            t=tiles.get(tid)
            if t is not None and t.shape==(32,32): out[(y-y0)*32:(y-y0+1)*32,(x-x0)*32:(x-x0+1)*32]=t
    r=((out>>11)&31)*255//31;g=((out>>5)&63)*255//63;b=(out&31)*255//31
    return Image.fromarray(np.dstack([r,g,b]).astype('uint8'),'RGB'),(W,H)
