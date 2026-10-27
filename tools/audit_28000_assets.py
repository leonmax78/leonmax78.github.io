"""Read-only installer archive resource inventory; never launches the game."""
import json
import mmap
import struct
import sys
import zlib
from pathlib import Path
from build_data import parse_ini_records, read_text

ROOT=Path(__file__).resolve().parents[1]
game=Path(sys.argv[1])
setting=Path(sys.argv[2])
paths={}
for pak in sorted(game.glob('*.pak')):
    with pak.open('rb') as f, mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as data:
        footer=bytearray(data[-22:])
        assert footer[:4]==b'OD\x05\x06'
        key=0x4d if footer[20:22]==b'\xef\xf2' else 0x5b
        for i in range(4,22):footer[i]^=(3*i-key)&255
        magic,packed,count,count2,size,offset,comment=struct.unpack('<4sIHHIIH',footer)
        assert count2 in (0,count) and not comment and offset+packed+26==len(data)
        assert data[offset:offset+4]==magic
        block=bytearray(data[offset+4:offset+4+packed]);block[0]^=0x7a
        directory=zlib.decompress(block)
        assert len(directory)==size
        pos=0;found=0
        while pos<len(directory):
            assert directory[pos:pos+4] in (b'OD\x01\x02',b'PK\x01\x02')
            n,e,c=struct.unpack_from('<HHH',directory,pos+28)
            name=directory[pos+46:pos+46+n].decode('cp950').replace('\\','/').lower().lstrip('/')
            if not name.endswith('/'):paths[name]=pak.name
            pos+=46+n+e+c;found+=1
        assert found==count

effects=parse_ini_records(read_text(setting/'effect.obd'))
chars=parse_ini_records(read_text(setting/'char3.obd'))
skills=parse_ini_records(read_text(setting/'magic.ini'))
result={'game':str(game),'files':len(paths),'skills':[],'souls':[]}
for skill in skills:
    if not 418<=int(skill.get('ID','0'))<=433:continue
    effect=skill['Effect']
    prefix='shape/magic/'+effect+'/'
    files=[p for p in paths if p.startswith(prefix)]
    definitions=[r for r in effects if ('/magic/'+effect+'/') in (r.get('Directory','').replace('\\','/')+'/')]
    result['skills'].append({'id':skill['ID'],'name':skill['Name'],'effect':effect,'definitions':len(definitions),'files':len(files),'archives':sorted({paths[p] for p in files}),'examples':files[:3]})
for name in ['邀月','憐星','RSKD','小蝦米','張君寶','顏玉書','程雁華','燕南天零']:
    forms=[r for r in chars if name in str(r.get('Name',''))]
    directories=sorted({r.get('Directory','').replace('\\','/').strip('/').lower() for r in forms})
    files=[p for p in paths if any(p.startswith('shape/'+d+'/') for d in directories)]
    sprites=set()
    for r in forms:
        values=r.get('SpriteFile',[])
        if isinstance(values,str):values=[values]
        for v in values:sprites.add(v.split(',',1)[1].strip().lower())
    missing=[s for s in sprites if not any(p.endswith('/'+s) for p in paths)]
    result['souls'].append({'name':name,'forms':[r['Name'] for r in forms],'directories':directories,'files':len(files),'archives':sorted({paths[p] for p in files}),'spriteReferences':len(sprites),'missingSpriteReferences':missing,'examples':files[:3]})
(ROOT/'reports/28000-animation-assets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
print(json.dumps({'skills':[{k:r[k] for k in ['name','files','archives']} for r in result['skills']], 'souls':[{k:r[k] for k in ['name','files','archives','missingSpriteReferences']} for r in result['souls']]},ensure_ascii=False,indent=2))
