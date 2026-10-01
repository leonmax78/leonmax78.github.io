"""Compare exported settings by record, retaining duplicate IDs in the audit."""
from collections import defaultdict
import json
from pathlib import Path
from build_data import read_text, parse_ini_records

ROOT=Path(__file__).resolve().parents[1]
OLD=Path.home()/'Desktop/0924/SETTING'
NEW=Path.home()/'Desktop/1001/SETTING'

def indexed(path):
    result=defaultdict(list)
    for row in parse_ini_records(read_text(path)):
        result[str(row.get('ID',row.get('Name','<no ID>')))].append(row)
    return dict(result)

def main():
    report={'baseline':'2026-09-24','current':'2026-10-01','files':{}}
    for p in sorted(NEW.iterdir()):
        old=OLD/p.name
        if old.exists() and old.read_bytes()==p.read_bytes():continue
        info={'previousBytes':old.stat().st_size if old.exists() else None,'currentBytes':p.stat().st_size}
        if p.suffix.lower()=='.ini':
            a=indexed(old) if old.exists() else {};b=indexed(p)
            info.update(added={k:b[k] for k in b.keys()-a.keys()},removed={k:a[k] for k in a.keys()-b.keys()},
                        changed={k:{'old':a[k],'new':b[k]} for k in a.keys()&b.keys() if a[k]!=b[k]})
        report['files'][p.name]=info
        print(p.name, ' '.join(f'{k}={len(info[k])}' for k in ('added','removed','changed') if k in info))
    (ROOT/'reports/weekly_1001_diff.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
