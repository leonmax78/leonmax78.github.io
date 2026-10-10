"""Build equipment filters from ITEM types, local mappings and named source entries."""
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tmp/equipment-source-pages'
BASE = 'https://sites.google.com/view/szounofficial/'
TRADE = ['300級龍涉大川繼鱗武匣','299級古文明東西霸武匣','288級三分鼎鋒真王武匣','277級南辰時祿機神兵匣','266-級東明開天釋達神匣','255級萬帝天尊極武神匣','233級冥府皇統法老征匣','222級阿薩群鋒巨武神匣','200級創宇諸恆極兵神匣','199級永恆山海唯武神匣','188級鎮天聖守星武神匣','177級天尊帝宿超武神匣','168級仙儀丹曦帝武玉匣','155級奧林帕斯神兵聖櫃','145級盡宇絕兵聖箱','133級仙魔極兵聖箱','123級元極兵聖匣','111級尊佛極兵聖匣']
WEAPONS = {'SWORD','BLADE','WHISK','STAFF','HIDDEN_WEAPON','SPEAR','ROD','AXE','HAMMER','SHIELD'}
ARMOR = {'HELMET','ARMOR','BRACER','BOOT'}

class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0; self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
        if tag=='a':
            self.links.extend(urllib.parse.unquote(v) for k,v in attrs if k=='href')
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip and data.strip(): self.parts.append(data.strip())

def norm(value):
    return re.sub(r'\s+', '', value).replace('．','.').replace('‧','.')

def category(item):
    t=item.get('Type')
    return '武器' if t in WEAPONS else '防具' if t in ARMOR else '仙器' if t=='UNDER_BOOT' else '特殊飾品' if t=='ORNAMENT' else '其他道具'

def main():
    CACHE.mkdir(parents=True,exist_ok=True)
    items=json.loads((ROOT/'data/items.json').read_text(encoding='utf-8'))
    cfg=json.loads((ROOT/'data/compound_config.json').read_text(encoding='utf-8'))
    records={i['ID']:{'category':category(i),'class':i.get('Class',''),'type':i.get('Type',''),'tags':[]} for i in items}
    def tag(id,family,collection,source):
        r=records.get(str(id))
        if r is not None and not any(x['family']==family and x['collection']==collection for x in r['tags']):
            r['tags'].append({'family':family,'collection':collection,'source':source})
    for eq in cfg['equipment']:
        family=eq.get('series_grade') or eq.get('series_group') or ''
        if family and family not in ('仙器','世貿裝'):
            tag(eq['item_id'],family,'','compound_config')
    sources=[]
    for slug in TRADE:
        sources.append(('武器','世貿系列',slug.replace('-',''),'裝備/武器/世貿系列/'+slug,int(re.match(r'\d+',slug)[0])))
    for family in ['玄宙','旭品','帝星流','煌星流','仙星流']:
        sources.append(('武器',family,'','裝備/武器/'+family,None))
    sources.append(('武器','暗器','無限／職限暗器','裝備/武器/無限職限-暗器',None))
    for family in ['特殊','九日','王狼','南遼','虛化','太極','星陣','兇星','狼牙','五蛇','五鎖']:
        slug=family+'系列'
        sources.append(('仙器',family+'系列','','裝備/仙器/'+slug,None))
    for family in ['經驗','轉運']:
        sources.append(('特殊飾品',family+'加倍','','裝備/特殊飾品/'+family+'加倍',None))
    # These navigation headings are containers, not pages. Follow their actual children.
    seedfile=CACHE/(sources[0][3].replace('/','_')+'.html')
    if not seedfile.exists():
        seedfile.write_bytes(urllib.request.urlopen(BASE+urllib.parse.quote(sources[0][3],safe='/'),timeout=35).read())
    seed=Text();seed.feed(seedfile.read_text(encoding='utf-8'))
    for link in dict.fromkeys(seed.links):
        prefix='/view/szounofficial/'
        if not link.startswith(prefix): continue
        relative=link[len(prefix):];parts=relative.split('/')
        if relative.startswith('裝備/武器/聯動-nft/'):
            sources.append(('武器','聯動／NFT',parts[-1],relative,None))
        elif relative.startswith('裝備/防具/') and len(parts)>=4:
            cat='特殊飾品' if '飾品' in parts else '防具'
            sources.append((cat,parts[2],' / '.join(parts[3:]),relative,None))
        elif relative.startswith('裝備/特殊飾品/') and len(parts)>=4 and parts[2] in ['五佐天座','聖獸之心','六滅化神'] and '比較' not in parts[-1]:
            sources.append(('特殊飾品',parts[2],parts[-1],relative,None))
    audit=[]
    for cat,family,collection,relative,level in sources:
        url=BASE+urllib.parse.quote(relative,safe='/')
        file=CACHE/(relative.replace('/','_')+'.html')
        try:
            if not file.exists():
                req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
                file.write_bytes(urllib.request.urlopen(req,timeout=35).read())
            p=Text();p.feed(file.read_text(encoding='utf-8'))
            candidates=[]
            for n,part in enumerate(p.parts):
                if re.match(r'^名稱\s*[:：]?$',part) or re.match(r'^名稱\s*[:：]',part):
                    text=norm(''.join(p.parts[n:n+5]))
                    text=re.sub(r'^名稱[:：]?', '',text)
                    candidates.append(text)
            matched=[]
            for item in items:
                if category(item)!=cat or (level is not None and str(item.get('Level'))!=str(level)): continue
                name=norm(item.get('Name',''))
                if len(name)>=3 and any(c.startswith(name) and (len(c)==len(name) or c[len(name)] not in 'ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ★☆') for c in candidates):
                    tag(item['ID'],family,collection,url);matched.append(item['ID'])
            audit.append({'url':url,'family':family,'collection':collection,'nameEntries':len(candidates),'matchedIds':matched})
            print(f'{relative}: {len(matched)}',flush=True)
        except Exception as e:
            audit.append({'url':url,'error':str(e)})
            print(f'FAILED {relative}: {e}',flush=True)
    # Exact local status groups identify functional accessory families.
    statuses={s['ID']:s for s in json.loads((ROOT/'data/status.json').read_text(encoding='utf-8'))}
    for item in items:
        id=item['ID'];r=records[id]
        if r['category']=='特殊飾品':
            group=statuses.get(item.get('ExtraStatus'),{}).get('Group')
            family={'25':'經驗加倍','21':'轉運加倍'}.get(group)
            if family: tag(id,family,'','STATUS.Group='+group)
        if r['category']=='武器' and item.get('Type')=='HIDDEN_WEAPON':
            tag(id,'暗器','職業限定' if item.get('Class') else '不限職業','ITEM.Class')
        if not r['tags']:tag(id,'其他／未分類','','ITEM.Type')
    result={'version':'V580','categories':['武器','防具','仙器','特殊飾品','其他道具'],'byId':records,'sources':audit}
    (ROOT/'data/equipment-taxonomy.js').write_text('window.SZO_EQUIPMENT_TAXONOMY='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    (ROOT/'reports/equipment-taxonomy-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
