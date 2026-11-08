import struct
import numpy as np
from PIL import Image
def decode_t4(f,P,mode=0):
    u32=lambda o:struct.unpack_from('<I',f,o)[0];u16=lambda o:struct.unpack_from('<H',f,o)[0]
    W,H=u32(0x14),u32(0x18);img=np.zeros((H,W,4),np.uint8)
    for y in range(H):
        p=u32(0x50+4*y)
        if not p: continue
        g=0
        while g<4096:
            g+=1;n=u16(p);x=struct.unpack_from('<h',f,p+2)[0];src=u32(p+4);p+=8
            if x==-1:break
            for j in range(n):
                if x+j>=W or src+2*j+1>=len(f): continue
                b0,b1=f[src+2*j],f[src+2*j+1]
                idx,al=(b0,b1) if mode==0 else (b1,b0)
                c=P[idx];img[y,x+j]=(c[0],c[1],c[2],al)
    return Image.fromarray(img,'RGBA')

def decode_t4_full(f,P,decode_tlhs):
    u32=lambda o:struct.unpack_from('<I',f,o)[0]
    base=decode_t4(f,P,0)
    off=u32(0x34)
    if off and f[off:off+4]==b'TLHS':
        top=decode_tlhs(f[off:],P).convert('RGBA')
        if top.size==base.size: base.alpha_composite(top)
        else:
            c=Image.new('RGBA',base.size,(0,0,0,0));c.alpha_composite(top,(0,0));base.alpha_composite(c)
    return base
