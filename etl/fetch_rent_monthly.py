"""Official monthly rents (€/month) per Madrid district from SERPAVI 2024 (MIVAU), not an estimate.

SERPAVI publishes, for collective housing (VC = flats), the median and the 25th/75th percentiles of the
monthly rent actually declared in rental contracts, plus the median surface. We keep them per district.

Output: data/processed/rent_monthly.json
  {"source", "year", "districts": {"01": {"median", "p25", "p75", "m2_median", "contracts"}, ...}}
Reuses the workbook cached by fetch_rent.py (data/raw/serpavi-2024.xlsx) or downloads it.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from openpyxl import load_workbook

from fetch_rent import CACHE, fetch_district_prices

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "processed" / "rent_monthly.json"
YEAR = "24"
COLUMNS = {
    "median": f"ALQTBID12_M_VC_{YEAR}",
    "p25": f"ALQTBID12_25_VC_{YEAR}",
    "p75": f"ALQTBID12_75_VC_{YEAR}",
    "m2_median": f"SLVM2_M_VC_{YEAR}",
    "contracts": f"BI_ALVHEPCO_TVC_{YEAR}",
}


def clean(value):
    return round(value) if type(value) in (int, float) and math.isfinite(value) and value > 0 else None


def main() -> None:
    if not CACHE.is_file():
        fetch_district_prices()  # downloads and caches the official workbook
    workbook = load_workbook(CACHE, read_only=True, data_only=True)
    try:
        rows = workbook["Distritos"].iter_rows(values_only=True)
        header = next(rows)
        index = {key: header.index(col) for key, col in COLUMNS.items()}
        code_index = header.index("CUDIS")
        districts = {}
        for row in rows:
            code = str(row[code_index]).strip()
            if len(code) == 7 and code.startswith("28079"):
                districts[code[-2:]] = {key: clean(row[i]) for key, i in index.items()}
    finally:
        workbook.close()
    if len(districts) != 21:
        raise SystemExit(f"Se esperaban 21 distritos y hay {len(districts)}")
    out = {
        "source": "SERPAVI 2011–2024 (MIVAU): alquiler mensual de contratos de vivienda colectiva, mediana y percentiles 25/75",
        "year": 2024,
        "districts": districts,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"escrito {OUTPUT}: {len(districts)} distritos")


if __name__ == "__main__":
    main()
