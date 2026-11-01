"""Derive tower floor memberships from MPC walkable components and transfer tags."""
import json
import struct
from collections import deque, Counter
from pathlib import Path
from audit_mpc_transfers import ROOT, BASE, TOWER, parse


def components(path):
    raw=path.read_bytes();header=struct.unpack_from('<16I',raw)
    w,h=header[1:3]
    cells=list(struct.iter_unpack('<4H',raw[64:64+w*h*8]))
    labels=[-1]*len(cells);regions=[]
    for i,cell in enumerate(cells):
        if cell[0]!=0 or labels[i]>=0:continue
        group=len(regions);queue=deque([i]);labels[i]=group;points=[]
        while queue:
            p=queue.popleft();points.append((p%w,p//w))
            x,y=p%w,p//w
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h:
                    n=ny*w+nx
                    if cells[n][0]==0 and labels[n]<0:labels[n]=group;queue.append(n)
        regions.append(points)
    def locate(rawx,rawy):
        x,y=int(rawx//32),int(rawy//32)
        if 0<=x<w and 0<=y<h and labels[y*w+x]>=0:return labels[y*w+x]
        for r in range(1,9):
            found=set()
            for ny in range(max(0,y-r),min(h,y+r+1)):
                for nx in range(max(0,x-r),min(w,x+r+1)):
                    label=labels[ny*w+nx]
                    if label>=0 and len(regions[label])>=30:found.add(label)
            if len(found)==1:return found.pop()
            if len(found)>1:return None
        return None
    return regions,locate


def build():
    data=json.loads((ROOT/'data/stage_maps.json').read_text('utf-8'))
    report=[]
    for index,sid in enumerate(TOWER):
        stage=next(s for s in data['stages'] if s['stageId']==sid)
        parsed=parse(BASE/f'map/stage{sid}.mpc')
        regions,locate=components(BASE/f'map/stage{sid}.mpc')
        order=[42,43,45,46,47,48,49,50,52,51] if sid==284 else [41,42,43,45,46,47,48,49,50,51]
        membership={}
        for o in parsed['objects']:
            if o[0]==10002 and o[5] in order:
                region=locate(o[1],o[2]);floor=index*10+order.index(o[5])+1
                if region is None:raise ValueError((sid,o[5],'no region'))
                if region in membership and membership[region]!=floor:raise ValueError((sid,region,'overlap'))
                membership[region]=floor
        unresolved=[]
        stage['mapCategory']='tower'
        stage['areas']=[]
        for floor in range(index*10+1,index*10+11):
            points=[p for r,f in membership.items() if f==floor for p in regions[r]]
            assert points,(sid,floor)
            cx=sum(x for x,y in points)/len(points);cy=sum(y for x,y in points)/len(points)
            x,y=min(points,key=lambda p:(p[0]-cx)**2+(p[1]-cy)**2)
            stage['areas'].append({'key':f'tower-floor-{floor}','floor':floor,'label':f'{floor}樓','name':f'{floor}樓','x':x*4,'y':y*4,
                'bounds':[min(p[0] for p in points)*4,min(p[1] for p in points)*4,(max(p[0] for p in points)+1)*4,(max(p[1] for p in points)+1)*4]})
        for kind in ('monsters','npcs','chests'):
            for marker in stage.get(kind,[]):
                region=locate(marker.get('rawX',marker['x']*8),marker.get('rawY',marker['y']*8))
                floor=membership.get(region)
                for key in ('floor','tower_floors','areaKey','areaName','areaLabel'):marker.pop(key,None)
                if floor is not None:
                    marker.update(floor=floor,areaKey=f'tower-floor-{floor}',areaName=f'{floor}樓',areaLabel=f'{floor}樓')
                else:
                    # Waiting/entry islands have no numbered floor; never guess by nearest landing.
                    marker.update(areaKey='tower-entry',areaName='候塔區',areaLabel='候塔區')
                    if kind=='monsters':unresolved.append({'id':marker['id'],'name':marker['name'],'region':region})
        unexpected=[m for m in unresolved if not(sid==284 and m['id']==15723)]
        if unexpected:raise ValueError((sid,unexpected))
        report.append({'stage':sid,'regions':membership,'entryMonsters':unresolved,'floors':[
            {'floor':a['floor'],'monsters':sorted({m['name'] for m in stage['monsters'] if m.get('floor')==a['floor']})} for a in stage['areas']]})
    (ROOT/'data/stage_maps.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    (ROOT/'reports/tower-floor-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Updated {len(report)} tower maps / 180 floors; only 3 entry-island monster points are unnumbered.')


if __name__=='__main__':
    build()
