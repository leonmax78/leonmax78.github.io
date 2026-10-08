"""Build planning-only field/value inventories from the currently published ITEM data."""
import ast
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'planning/item-values'

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')

def main():
    items = json.loads((ROOT/'data/items.json').read_text(encoding='utf-8'))
    for item in items:
        if 'DamageMin' in item or 'DamageMax' in item:
            item['Damage'] = f"{item.pop('DamageMin', '')}-{item.pop('DamageMax', '')}"
    source = (ROOT/'js/data/display-dictionary.js').read_text(encoding='utf-8')
    visible = set(ast.literal_eval(re.search(r'const itemVisible=(\[.*?\]);',source).group(1)))
    if 'DamageMin' in visible or 'DamageMax' in visible:
        visible.difference_update({'DamageMin','DamageMax'})
        visible.add('Damage')
    OUT.mkdir(parents=True, exist_ok=True)
    fields = []
    statuses = {str(r['ID']):r.get('Name','') for r in json.loads((ROOT/'data/status.json').read_text(encoding='utf-8')) if 'ID' in r}
    magics = {str(r['ID']):r.get('Name','') for r in json.loads((ROOT/'data/magic.json').read_text(encoding='utf-8')) if 'ID' in r}
    for key in sorted({k for row in items for k in row}):
        counts, tokens, examples = Counter(), Counter(), {}
        rows = [r for r in items if key in r]
        for row in rows:
            value = str(row[key])
            counts[value] += 1
            if len(examples.setdefault(value,[])) < 3:
                examples[value].append({'id':row['ID'],'name':row['Name']})
            if key in ('Flag','Class','StatusParam') or key.endswith('Flag'):
                tokens.update(set(v.strip() for v in value.split(',') if v.strip()))
        sort = lambda v:(0,float(v)) if re.fullmatch(r'-?\d+(\.\d+)?',v) else (1,v)
        values = [{'raw':v,'count':counts[v],'examples':examples[v]} for v in sorted(counts,key=sort)]
        token_values = [{'raw':v,'count':tokens[v]} for v in sorted(tokens)]
        mappings = {}
        if key == 'ExtraStatus':
            for raw in counts:
                parts = re.split(r'[,\s;]+',raw)
                mappings[raw] = '、'.join(dict.fromkeys(statuses.get(str(int(p,16) if p.lower().startswith('0x') else int(p))) or magics.get(str(int(p,16) if p.lower().startswith('0x') else int(p))) or f'StatusID:{p}' for p in parts if p and re.fullmatch(r'(0x[0-9a-fA-F]+|\d+)',p)))
        write(OUT/f'field-{key}.json',{'field':key,'values':values,'tokens':token_values,'currentMappings':mappings})
        fields.append({'key':key,'present':len(rows),'distinct':len(counts),'tokens':len(tokens),'visible':key in visible,
                       'examples':values[:2],'data':f'item-values/field-{key}.json'})
    write(ROOT/'planning/item-fields.json',{'schemaVersion':1,'sourceVersion':'V577','totalItems':len(items),'fields':fields})
    print(f'Wrote {len(fields)} field inventories for {len(items)} items')

if __name__=='__main__':main()
