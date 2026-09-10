"""Apply owner-confirmed tower boss floors without changing spawn coordinates."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FLOORS = {18181: 173, 18184: 176}


def correct(value):
    if isinstance(value, dict):
        mid = value.get("id")
        if mid in FLOORS and "tower_floors" in value:
            floor = FLOORS[mid]
            value.update(floor=floor, tower_floors=[floor], areaName=f"終末之塔第{floor}層")
        for child in value.values():
            correct(child)
    elif isinstance(value, list):
        for child in value:
            correct(child)


def main():
    for name in ("data/stage_maps.json", "reports/weekly_0910_diff.json"):
        path = ROOT / name
        value = json.loads(path.read_text(encoding="utf-8"))
        correct(value)
        if name.startswith("data/"):
            value["version"] = "stage-map-0910-boss-floor-fix"
            text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        else:
            text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        path.write_text(text, encoding="utf-8")
    path = ROOT / "raw/一般怪物位置.csv"
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields, rows = reader.fieldnames, list(reader)
    for row in rows:
        mid = int(row["怪物ID"]) if row["怪物ID"].isdigit() else 0
        if mid in FLOORS and row["StageID"] == "348":
            row["終末樓層"] = f"{FLOORS[mid]}層"
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
