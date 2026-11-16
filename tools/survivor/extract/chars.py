from lib import *
import struct,json
from PIL import Image
OUT='/home/claude/leonmax78.github.io/games/sv/'
d,ns=pak('d2');low={n.lower():n for n in ns}
ACT={'wait':('wa',[1,2,3,4,4,3,2]),'walk':('ra',[1,2,3,4,5,6,7,8]),'cast':('m1',[1,2,3,4])}
meta={}
for f in ['p1','p2','p3','p4','p5','p6','p7','p8','p9','pa']:
    cache={};frames=[];anims={}
    def get(code,fr,di):
        key=f'shape/char1n/{f}/{f}1{code}0{fr}{di}.shp'
        if key in cache: return cache[key]
        b=extract(d,ns[low[key]]);ax,ay=struct.unpack_from('<2i',b,0x1C)
        open(TMP,'wb').write(b);im=T.decode_tlhs(b)
        frames.append((im,ax,ay));cache[key]=len(frames)-1;return cache[key]
    for a,(code,seq) in ACT.items():
        anims[a]=[[get(code,fr,di) for fr in seq] for di in range(1,9)]
    # shelf pack
    W=1024;x=y=rowh=0;rects=[]
    for im,ax,ay in frames:
        if x+im.width>W: x=0;y+=rowh+1;rowh=0
        rects.append((x,y,im.width,im.height,ax,ay));x+=im.width+1;rowh=max(rowh,im.height)
    sheet=Image.new('RGBA',(W,y+rowh),(0,0,0,0))
    for (im,_,_),r in zip(frames,rects): sheet.paste(im,(r[0],r[1]))
    sheet.save(OUT+f'char_{f}.webp','WEBP',lossless=True,quality=100,method=6)
    meta[f]={'r':rects,'a':anims}
    print(f,len(frames),sheet.size)
json.dump(meta,open(OUT+'char.json','w'),separators=(',',':'))
