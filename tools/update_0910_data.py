"""Import verified 0910 monster/status changes and audit the event MPC delta."""
from collections import Counter
import csv
import json
from pathlib import Path
import shutil
import struct

from build_data import parse_ini_records, read_text

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"


def records(date, name):
    return parse_ini_records(read_text(DESKTOP / date / "SETTING" / name))


def signatures(date):
    data = (DESKTOP / date / "MAP/STAGE015.MPC").read_bytes()
    start = struct.unpack_from("<I", data, 24)[0] + 2
    end = struct.unpack_from("<I", data, 32)[0]
    return Counter(
        (struct.unpack_from("<H", data, offset + 16)[0],
         *struct.unpack_from("<HH", data, offset))
        for offset in range(start, min(end, len(data) - 37), 38)
    )


def main():
    report = {"date": "2026-09-10", "baseline": "2026-09-03", "files": {}}
    # Counters preserve duplicate IDs, including the removed duplicate STATUS 206.
    for name in ("MONSTER_C.INI", "MAGIC.INI", "STATUS.INI", "STAGE.INI"):
        old, new = [Counter(json.dumps(r, ensure_ascii=False, sort_keys=True)
                            for r in records(date, name)) for date in ("0903", "0910")]
        report["files"][name] = {
            "removedRecords": [json.loads(r) for r in (old - new).elements()],
            "addedRecords": [json.loads(r) for r in (new - old).elements()],
        }
    monsters = {int(r["ID"]): r for r in records("0910", "MONSTER_C.INI") if "ID" in r}
    old, new = signatures("0903"), signatures("0910")
    added, removed = list((new - old).elements()), list((old - new).elements())
    assert {r[0] for r in added} == {18181, 18184, 18187, 18188} and len(added) == 4
    assert not removed
    maps = json.loads((ROOT / "data/stage_maps.json").read_text(encoding="utf-8"))
    stage = next(s for s in maps["stages"] if s["stageId"] == 15)
    tower = next(s for s in maps["stages"] if s["stageId"] == 348)
    assert all(any(m["id"] == r[0] for m in tower["monsters"]) for r in added)
    event = [m for m in stage["monsters"] if m.get("activity") == "虛空群魔大遊行"]
    assert len(event) == 74 and len({m["id"] for m in event}) == 74
    report["pingxi"] = {"added": [m for m in event if m["id"] in {r[0] for r in added}],
                        "removed": removed, "eventBosses": len(event),
                        "monsterPoints": len(stage["monsters"]), "npcPoints": len(stage["npcs"])}
    csv_path = ROOT / "raw/一般怪物位置.csv"
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields, rows = reader.fieldnames, list(reader)
    for mid, x, y in sorted(added):
        if any(r["StageID"] == "15" and r["怪物ID"] == str(mid) for r in rows):
            continue
        m = monsters[mid]
        rows.append(dict(zip(fields, ["15", "平西關", str(mid), m["Name"], m["Pic"],
                                     m["Level"], m["Type"], "", str(x), str(y), "1", "mpc"])))
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    for source, target in (("MONSTER_C.INI", "new/MONSTER_C.INI"), ("STATUS.INI", "STATUS.INI")):
        shutil.copyfile(DESKTOP / "0910/SETTING" / source, ROOT / "raw" / target)
    (ROOT / "reports/weekly_0910_diff.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["pingxi"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
