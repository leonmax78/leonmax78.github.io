from lib import *
import struct,json,re
from PIL import Image
OUT='/home/claude/leonmax78.github.io/games/sv/fx/'
d,ns=pak('d2');low={n.lower():n for n in ns}
def get(folder,name):
    for k in ('d2','up','d8'):
        dd,nn=pak(k);lw={n.lower():n for n in nn} if k!='d2' else low
        key=f'shape/magic/{folder}/{name}.shp'.lower()
        if key in lw:
            b=extract(dd,nn[lw[key]]);im=T.decode_tlhs(b);ax,ay=struct.unpack_from('<2i',b,0x1C);return im,ax,ay
    return None
R=lambda a,b:range(a,b+1)
S={ # skill: (folder, mode, data, blend)
 '旋氣斬':('084','dir',(['s8401','s8402','s8403'],16,2)),
 '地裂波':('091','dir',(['11801'],8,1)),
 '幻象刀':('090','seq',[f'124000{i}' for i in R(1,6)]),
 '震衝錘':('085','seq',['s85017','s85027','s85037']),
 '御劍術':('096','dir',(['05b01','05b02','05b03'],32,2)),
 '劍氣波':('095','dir',(['s9501','s9502','s9503'],8,1)),
 '萬劍歸宗':('096','seq',['05b0125','05b0225','05b0325']),
 '殘影劍':('089','dir',(['s8208'],8,1)),
 '雙星趕月':('072','dir',([f'a010{f}01' for f in R(1,6)],32,2)),
 '天女散花':('072','dir',([f'a010{f}01' for f in R(1,6)],32,2)),
 '毒煙術':('052','seq',[f'52b{i:04d}' for i in R(1,12)]),
 '雷箭術':('124','seq',['lightning-01','lightning-02','lightning-03']),
 '護身輪':('039','seq',[f's39000{i}' for i in R(1,4)]),
 '聖火輪':('s40','seq',[f'35b000{i}' for i in R(1,6)]),
 '梵天火輪':('034','seq',[f'34c000{i}' for i in R(1,8)]),
 '佛法無邊':('s29','seq',[f's29000{i}' for i in R(1,6)]),
 '天雷術':('s14','seq',[f'09a{i}' for i in R(1,5)]),
 '玄冰術':('012','seq',[f'07a-{i}' for i in R(1,4)]),
 '三昧真火':('s13','seq',[f'08b000{i}' for i in R(1,7)]),
 '天師隕石術':('134','seq',[f'ws0{i}' for i in R(0,8)]),
 '天問三誓':('258/swordlight','seq',[f'swordlight_{i:02d}' for i in R(4,10)]),
 '怒火燒盡九重天':('259/pillar','seq',[f'firepillar{i:02d}' for i in R(0,10)]),
 '蒼龍一吼破雲關':('260/dragon','dir',([f'dragon00{f}' for f in R(1,8)],8,1)),
 '天地根':('261/mountain','seq',[f'mountain_{i:02d}' for i in R(0,9)]),
 '君子風':('262/tornado','seq',[f'tornado{i:02d}' for i in R(0,13)]),
 '大梵聖掌':('263/hand','dir',([f'hand0{f}' for f in R(1,8)],8,1)),
 '一氣動山河':('264/shockwave','seq',[f'sw{i:02d}' for i in R(0,12)]),
 '笑盡英雄':('265/exp','seq',[f'exp00{i}' for i in R(0,8)]),
 '天龍吼':('266/dragon','seq',[f'dragon{i:02d}' for i in R(1,10)]),
 '天關雙煉‧夜武一擊':('267/fireball/add_r_ball','seq',[f'add_r_ball_{i:02d}' for i in R(0,12)]),
 '蓮華聖路開天光':('268/laser','seq',[f'laser_{i:02d}' for i in R(4,13)]),
 '天劍三絕':('269/f_lightpillar','seq',[f'p_{i:02d}' for i in R(0,9)]),
 '心劍':('270/sword','dir',([f'sword{f}' for f in R(1,9)],8,1)),
 '般若懺':('271/lightball','seq',[f'lightball0{f}7' for f in R(1,6)]),
 '劍以創生':('272/swordlight','seq',[f'swordlight_{i:02d}' for i in R(6,13)]),
 '刀以毀滅':('273/swordlight','seq',[f'swordlight_{i:02d}' for i in R(16,27)]),
}
MAX=200
meta={}
for i,(sk,(folder,mode,data)) in enumerate(S.items()):
    frames=[];idx={}
    def add(name):
        if name in idx: return idx[name]
        r=get(folder,name)
        if not r: return -1
        im,ax,ay=r;s=min(1,MAX/max(im.size))
        if s<1: im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS);ax=int(ax*s);ay=int(ay*s)
        frames.append((im,ax,ay));idx[name]=len(frames)-1;return idx[name]
    if mode=='seq': a=[add(n) for n in data]; a=[x for x in a if x>=0]
    else:
        pre,D,dig=data; a=[[add(p+str(dd).zfill(dig)) for dd in R(1,D)] for p in pre]
    if not frames: print('MISSING',sk);continue
    W=1024;x=y=rh=0;rects=[]
    for im,ax,ay in frames:
        if x+im.width>W: x=0;y+=rh+1;rh=0
        rects.append((x,y,im.width,im.height,ax,ay));x+=im.width+1;rh=max(rh,im.height)
    sh=Image.new('RGBA',(W if y else max(r[0]+r[2] for r in rects),y+rh),(0,0,0,0))
    for (im,_,_),r in zip(frames,rects): sh.paste(im,(r[0],r[1]))
    fn=f'fx{i:02d}.webp';sh.save(OUT+fn,'WEBP',quality=85,method=6)
    meta[sk]={'f':fn,'m':mode,'r':rects,'a':a}
    print(sk,mode,len(frames),sh.size,sum(1 for z in (a if mode=='seq' else sum(a,[])) if z<0),'missing')
json.dump(meta,open(OUT+'../fx.json','w'),ensure_ascii=False,separators=(',',':'))
