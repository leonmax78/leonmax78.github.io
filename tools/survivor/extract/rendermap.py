from lib import *
from maplib import *
import struct,glob,sys,numpy as np
from PIL import Image,ImageChops
UP=Path('/mnt/user-data/uploads/神州專案/拆包與歷史資料/SZO/0702/DATA5/shape')
objs={}
for f in glob.glob('../gx/SETTING/*'):
    n=f.split('/')[-1].lower()
    if n.startswith(('raser','object','server','wlight')) and n.endswith('.obd'):
        for o in T.parse_obd_objects(Path(f)):
            s=str(o.get('Sequence','')).strip()
            if s.isdigit(): objs.setdefault(int(s),o)
d2,ns2=pak('d2');low2={n.lower():n for n in ns2}
cache={}
def sprite(ob):
    dirn=str(ob.get('Directory','')).strip('\\').replace('\\','/').lower()
    names=T.sprite_names_for_action(ob,'wait')
    if not names: return None
    nm=names[0]
    key=(dirn,nm)
    if key in cache: return cache[key]
    b=None
    p=UP/dirn/(nm+'.SHP')
    if p.exists(): b=p.read_bytes()
    else:
        k=f'shape/{dirn}/{nm}.shp'.lower()
        if k in low2: b=extract(d2,ns2[low2[k]])
    r=None
    if b and b[:4]==b'TLHS':
        try:
            im=T.decode_tlhs(b);ax,ay=struct.unpack_from('<2i',b,0x1C);r=(im,ax,ay)
        except Exception as e: pass
    cache[key]=r;return r
def render_full(stage):
    lib=load_lib()
    ground,(W,H)=render(stage,lib)
    canvas=ground.convert('RGBA')
    d=find(f'stage{stage:03d}.mpc').read_bytes()
    ts,te=struct.unpack_from('<I',d,24)[0],struct.unpack_from('<I',d,32)[0]
    rows=[struct.unpack_from('<19H',d,o) for o in range(ts,min(te,len(d)-37),38)]
    rows.sort(key=lambda v:(v[2],v[1]))
    miss=0;drawn=0
    for v in rows:
        seq=v[0];ob=objs.get(seq)
        if not ob or 16<=seq<=23 or seq==10001: continue
        if 'serv' in str(ob.get('Directory','')).lower(): continue
        sp=sprite(ob)
        if not sp: miss+=1;continue
        im,ax,ay=sp
        s=(v[4] or 192)/192
        if abs(s-1)>0.01: im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS);ax=int(ax*s);ay=int(ay*s)
        flags=str(ob.get('Flags',''))
        x,y=v[1]-ax,v[2]-ay
        if 'WHITELIGHT' in flags:
            # additive light
            box=(x,y,x+im.width,y+im.height)
            if x<0 or y<0 or box[2]>canvas.width or box[3]>canvas.height: continue
            reg=canvas.crop(box).convert('RGB');src=Image.new('RGB',im.size);src.paste(im,mask=im.split()[3])
            canvas.paste(ImageChops.add(reg,src).convert('RGBA'),box[:2])
        else:
            if 'ALPHA' in flags.replace('SP_ATTRIB_ALPHA','ALPHA') and 'SP_ATTRIB_ALPHA' in flags:
                a=im.split()[3].point(lambda p:p*0.55);im=im.copy();im.putalpha(a)
            canvas.alpha_composite(im,(max(0,x),max(0,y)),(max(0,-x),max(0,-y)))
        drawn+=1
    print(stage,'objects drawn',drawn,'missing',miss,canvas.size)
    return canvas
if __name__=='__main__':
    st=int(sys.argv[1]);im=render_full(st)
    im.save(f'full{st}.png');im.resize((im.width//8,im.height//8),Image.LANCZOS).save(f'prev{st}.png')
