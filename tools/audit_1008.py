"""Audit October 8 exports against October 1 without treating omitted files as deleted."""
import hashlib
import json
from collections import Counter
from pathlib import Path
import audit_1001

ROOT=Path(__file__).resolve().parents[1]
OLD=Path.home()/'Desktop/1001'
NEW=Path.home()/'Desktop/1008'
def main():
    audit_1001.OLD=OLD/'SETTING';audit_1001.NEW=NEW/'SETTING'
    files=[]
    for p in sorted(NEW.rglob('*')):
        if not p.is_file():continue
        rel=p.relative_to(NEW);prior=OLD/rel
        same=prior.exists() and hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(prior.read_bytes()).digest()
        entry={'path':rel.as_posix(),'status':'unchanged' if same else 'changed' if prior.exists() else 'not_in_baseline'}
        if not same and p.suffix.lower()=='.ini' and rel.parts[0]=='SETTING':
            a=audit_1001.indexed(prior) if prior.exists() else {};b=audit_1001.indexed(p)
            entry.update(added={k:b[k] for k in b.keys()-a.keys()},removed={k:a[k] for k in a.keys()-b.keys()},
                         changed={k:{'old':a[k],'new':b[k]} for k in a.keys()&b.keys() if a[k]!=b[k]})
        files.append(entry)
    report={'baseline':'2026-10-01','current':'2026-10-08','counts':dict(Counter(r['status'] for r in files)),'files':files}
    (ROOT/'reports/weekly_1008_diff.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(report['counts'])
    for r in files:
        if r['status']=='unchanged':continue
        print(r['path'],r['status'],' '.join(f'{k}={len(r[k])}' for k in ('added','removed','changed') if k in r))

if __name__=='__main__':main()
