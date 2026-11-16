"""技能特效：照 EFFECT.OBD 的定義抽主體動畫（m）與命中／爆炸動畫（h）。
每層記錄影格順序與 #n 影格延遲（d，遊戲 tick）。發光特效做「黑轉透明」，實心特效只去掉純黑底。
輸出 games/sv/fx/fxNN.webp 與 games/sv/fx.json：
  {技能: {f, m, r, a, d, h:{m, a, d}}}   m='seq' 時 a 是影格索引陣列；m='dir' 時 a[影格][方向]
"""
from lib import *
import struct,json
import numpy as np
from PIL import Image
OUT='/home/claude/leonmax78.github.io/games/sv/fx/'
_low={}
def get(folder,name):
    for k in ('d2','up','d8'):
        dd,nn=pak(k)
        if k not in _low: _low[k]={n.lower():n for n in nn}
        key=f'shape/magic/{folder}/{name}.shp'.lower()
        if key in _low[k]:
            b=extract(dd,nn[_low[k][key]]);im=T.decode_tlhs(b);ax,ay=struct.unpack_from('<2i',b,0x1C);return im.convert('RGBA'),ax,ay
    return None
R=lambda a,b:range(a,b+1)
def seq(folder,names,d): return (folder,'seq',names,d)
def dirs(folder,pres,D,dig,d): return (folder,'dir',(pres,D,dig),d)
# 依 EFFECT.OBD：Sprite = Wait, #延遲, 影格...；Bomb 觸發的命中物件另列為 h
S={
 # 勇士
 '旋氣斬':{'m':dirs('084',['s8401','s8402','s8403'],16,2,4),'h':seq('084b',[f'n04000{i}' for i in R(1,7)],4)},
 '地裂波':{'m':dirs('091',['11801'],8,1,4)},
 '幻象刀':{'m':seq('090',[f'124000{i}' for i in R(1,6)]+['1330003','1330004'],2),'h':seq('072b',[f'a01030{i}' for i in R(1,6)],4)},
 '震衝錘':{'m':dirs('085',['s8501','s8502','s8503'],8,1,3),'h':seq('085b',[f'n01a000{i}' for i in R(0,8)],4)},
 # 劍俠
 '御劍術':{'m':dirs('096',['05b01','05b02','05b03'],32,2,2),'h':dirs('096b',[f's960{f}' for f in R(1,8)],4,1,1)},
 '劍氣波':{'m':dirs('095',['s9501','s9502','s9503'],8,1,4)},
 '萬劍歸宗':{'m':dirs('096',['05b01','05b02','05b03'],32,2,4),'h':dirs('096b',[f's960{f}' for f in R(1,8)],4,1,1)},
 '殘影劍':{'m':dirs('089',['s8208'],8,1,5)},
 # 術者
 '雙星趕月':{'m':dirs('072',[f'a010{f}01' for f in R(1,6)],32,2,1),'h':seq('072b',[f'a01030{i}' for i in R(1,6)],4)},
 '天女散花':{'m':dirs('072',[f'a010{f}01' for f in R(1,6)],32,2,3),'h':seq('072b',[f'a01030{i}' for i in R(1,6)],4)},
 '毒煙術':{'m':seq('052',[f'52b{i:04d}' for i in R(1,12)],6),'h':seq('052',[f'52a{i:04d}' for i in R(1,10)],4)},
 '雷箭術':{'m':seq('124',['lightning-01','lightning-02','lightning-03'],6)},
 # 僧侶
 '護身輪':{'m':seq('039',[f's39000{i}' for i in R(1,4)],4),'h':seq('039',[f's39a0{i}' for i in R(0,7)],3)},
 '聖火輪':{'m':seq('s40',[f'35b000{i}' for i in R(1,6)],6)},
 '梵天火輪':{'m':seq('034',[f'34c000{i}' for i in R(1,8)],8)},
 '佛法無邊':{'m':seq('s29',[f's29000{i}' for i in R(1,6)],6)},
 # 道人
 '天雷術':{'m':seq('s14',['09a4','09a3','09a2'],5),'h':seq('s14',['09b1'],12)},
 '玄冰術':{'m':seq('012',[f'07a-{i}' for i in R(1,4)],1),'h':seq('012',[f'07b-{i}' for i in R(1,4)]+[f'07c-{i}' for i in R(1,4)],2)},
 '三昧真火':{'m':seq('s13',[f'08b000{i}' for i in R(1,6)],3),'h':seq('s13',[f'08c000{i}' for i in R(1,6)],3)},
 '天師隕石術':{'m':seq('134',[f'f00{i}' for i in R(1,8)],3),'h':seq('134',[f'ws0{i}' for i in R(0,8)],4)},
 # 霹靂聯動
 '天問三誓':{'m':seq('258/swordlight',[f'swordlight_{i:02d}' for i in R(4,10)],6),'h':seq('258/hit',[f'hit00{i}' for i in R(1,9)],6)},
 '怒火燒盡九重天':{'m':seq('259/pillar',[f'firepillar{i:02d}' for i in R(2,9)],3),'h':seq('259/exp',[f'exp000{i}' for i in R(0,7)],4)},
 '蒼龍一吼破雲關':{'m':dirs('260/dragon',[f'dragon00{f}' for f in R(1,8)],8,1,4),'h':seq('260/blue_exp',[f'exp0{i}' for i in R(1,7)],4)},
 '天地根':{'m':seq('261/mountain',[f'mountain_{i:02d}' for i in R(0,9)],2),'h':seq('261/stone',[f'stone0{i}' for i in R(0,8)],4)},
 '君子風':{'m':seq('262/tornado',[f'tornado{i:02d}' for i in R(0,13)],6),'h':seq('262/dust',[f'dust{i:02d}' for i in R(0,10)],5)},
 '大梵聖掌':{'m':dirs('263/hand',[f'hand0{f}' for f in R(1,8)],8,1,4),'h':seq('263/hit',[f'hit_{i}' for i in R(1,7)],4)},
 '一氣動山河':{'m':seq('264/shockwave',[f'sw{i:02d}' for i in R(0,12)],4),'h':seq('264/exp',[f'exp0{i}' for i in R(1,9)],3)},
 '笑盡英雄':{'m':seq('265/exp',[f'exp00{i}' for i in R(0,8)],3),'h':seq('265/hit',[f'hit_0{i}' for i in R(0,5)],3)},
 '天龍吼':{'m':seq('266/dragon',[f'dragon{i:02d}' for i in R(1,10)],5),'h':seq('266/explose',[f'explose0000{i}' for i in R(0,7)],5)},
 '天關雙煉‧夜武一擊':{'m':seq('267/fireball/add_r_ball',[f'add_r_ball_{i:02d}' for i in R(0,12)],5),'h':seq('267/explode',[f'explode{i}' for i in R(15,22)],4)},
 '蓮華聖路開天光':{'m':seq('268/laser',[f'laser_{i:02d}' for i in R(4,13)],6),'h':seq('268/exp',[f'exp_{i}' for i in R(10,15)],6)},
 '天劍三絕':{'m':seq('269/f_lightpillar',[f'p_{i:02d}' for i in R(0,9)],3),'h':seq('269/explose',[f'explose0000{i}' for i in R(0,7)],4)},
 '心劍':{'m':dirs('270/sword',[f'sword{f}' for f in R(1,9)],8,1,5),'h':seq('270/hit',[f'hit_0{i}' for i in R(0,8)],5)},
 '般若懺':{'m':seq('271/lightball',[f'lightball0{f}7' for f in R(1,6)],4)},
 '劍以創生':{'m':seq('272/swordlight',[f'swordlight_{i:02d}' for i in R(6,13)],5),'h':seq('272/hitadd',[f'add_sw0{i}' for i in R(0,6)],5)},
 '刀以毀滅':{'m':seq('273/swordlight',[f'swordlight_{i:02d}' for i in R(16,27)],4),'h':seq('273/flar',[f'flar_{i:02d}' for i in R(0,9)],4)},
}
# 遊戲裡不是加亮混色的特效：只去掉純黑底，不做黑轉透明
SOLID={'天地根','大梵聖掌','玄冰術','地裂波','君子風','毒煙術'}
def unblack(im,solid):
    a=np.array(im).astype(np.float32);rgb=a[...,:3];al=a[...,3]
    mx=rgb.max(-1)
    if solid: al[mx<12]=0
    else:
        k=np.clip(mx/255,0,1); al=np.minimum(al,k*255)
        sc=np.where(mx>0,255/np.maximum(mx,1),0)[...,None]; a[...,:3]=np.clip(rgb*sc,0,255)
    a[...,3]=al
    return Image.fromarray(a.astype(np.uint8),'RGBA')
MAX=200
meta={}
for i,(sk,spec) in enumerate(S.items()):
    frames=[];idx={}
    def add(folder,name):
        key=folder+'/'+name
        if key in idx: return idx[key]
        r=get(folder,name)
        if not r: return -1
        im,ax,ay=r;s=min(1,MAX/max(im.size))
        if s<1: im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS);ax=int(ax*s);ay=int(ay*s)
        frames.append((unblack(im,sk in SOLID),ax,ay));idx[key]=len(frames)-1;return idx[key]
    layers={}
    for ln,(folder,mode,data,d) in spec.items():
        if mode=='seq': a=[x for x in (add(folder,n) for n in data) if x>=0]
        else:
            pre,D,dig=data;a=[[add(folder,p+str(dd).zfill(dig)) for dd in R(1,D)] for p in pre]
            a=[row for row in a if all(x>=0 for x in row)]
        if not a: print('MISSING',sk,ln);continue
        layers[ln]={'m':mode,'a':a,'d':d}
    W=1024;x=y=rh=0;rects=[]
    for im,ax,ay in frames:
        if x+im.width>W: x=0;y+=rh+1;rh=0
        rects.append((x,y,im.width,im.height,ax,ay));x+=im.width+1;rh=max(rh,im.height)
    sh=Image.new('RGBA',(W if y else max(r[0]+r[2] for r in rects),y+rh),(0,0,0,0))
    for (im,_,_),r in zip(frames,rects): sh.paste(im,(r[0],r[1]))
    fn=f'fx{i:02d}.webp';sh.save(OUT+fn,'WEBP',quality=85,method=6)
    m=layers['m'];meta[sk]={'f':fn,'m':m['m'],'r':rects,'a':m['a'],'d':m['d']}
    if 'h' in layers: meta[sk]['h']=layers['h']
    print(sk,len(frames),sh.size,{k:(v['m'],len(v['a'])) for k,v in layers.items()})
json.dump(meta,open(OUT+'../fx.json','w'),ensure_ascii=False,separators=(',',':'))
