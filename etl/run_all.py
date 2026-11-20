"""Run geometry, available source fetchers and the indicator merge in order."""

import argparse
import subprocess
import sys
from pathlib import Path

ETL = Path(__file__).resolve().parent
PROCESSED = ETL.parent / "data" / "processed"
SOURCE_SCRIPTS = ("rent", "air", "transit", "services", "residences")


def run(script):
    subprocess.run([sys.executable, str(script)], cwd=ETL.parent, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Reuse processed geometry and source parts.")
    args = parser.parse_args()

    if args.offline:
        for filename in ("barrios.geojson", "campuses.json"):
            if not (PROCESSED / filename).is_file():
                parser.error(f"--offline requires data/processed/{filename}")
    else:
        run(ETL / "fetch_geometry.py")
        run(ETL / "fetch_universities.py")
        for source in SOURCE_SCRIPTS:
            script = ETL / f"fetch_{source}.py"
            if script.is_file():
                run(script)
    run(ETL / "build_indicators.py")


if __name__ == "__main__":
    main()
