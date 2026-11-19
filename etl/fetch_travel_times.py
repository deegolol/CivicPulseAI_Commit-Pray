"""Real travel times (minutes) from every Madrid neighbourhood to every campus, by public transport and by car.

Replaces the straight-line distance. Run once (≈3–5 min); the API only reads the resulting JSON.

Public transport — official CRTM GTFS timetables (Metro, Cercanías, Metro Ligero, EMT buses, interurban buses):
  * Weekday morning peak (07:00–10:00). For every line pattern we count the departures in that window
    (stop_times or frequencies.txt) → headway; the expected wait when boarding is half the headway (max 15 min).
  * Graph: walk to a stop → wait → ride (scheduled minutes between stops) → change (walk ≤ 350 m, new wait) → walk.
    Walking: 4.8 km/h over straight line × 1.3 (street detour). Boarding rail adds 2 min (station access).
  * Dijkstra from each campus over the reversed graph gives "minutes from this stop to the campus";
    a neighbourhood takes the best stop within 1.2 km of its centroid (or plain walking if faster).
Car — OSRM (OpenStreetMap road network, routing engine table service): driving minutes without traffic.

Output: data/processed/travel_times.json
  {"generated_at", "sources", "assumptions", "campuses": {campus_id: {area_id: {"transit_min", "car_min", "car_km"}}}}
"""
from __future__ import annotations

import csv
import heapq
import io
import json
import math
import statistics
import sys
import time
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "gtfs"
PROCESSED = ROOT / "data" / "processed"
OUTPUT = PROCESSED / "travel_times.json"

# CRTM open data (datos.crtm.es) GTFS items, published on ArcGIS Online by "ConsorcioRegional".
FEEDS = {
    "M4": ("Metro de Madrid", "5c7f2951962540d69ffe8f640d94c246", True),
    "M5": ("Cercanías Madrid", "1a25440bf66f499bae2657ec7fb40144", True),
    "M10": ("Metro Ligero", "aaed26cc0ff64b0c947ac0bc3e033196", True),
    "M6": ("EMT Madrid (autobús urbano)", "868df0e58fca47e79b942902dffd7da0", False),
    "M89": ("Autobuses interurbanos", "885399f83408473c8d815e40c5e702b7", False),
}
ITEM_URL = "https://www.arcgis.com/sharing/rest/content/items/{}/data"
OSRM = "https://router.project-osrm.org/table/v1/driving/"

PEAK_START, PEAK_END = 7 * 3600, 10 * 3600
WALK_KMH, DETOUR = 4.8, 1.3
TRANSFER_M, ACCESS_M = 350, 1200
MAX_WAIT_MIN, RAIL_ACCESS_MIN = 15.0, 2.0
# Stops far outside the area we care about are dropped (keeps the interurban graph small).
BBOX = (40.15, 40.70, -4.10, -3.40)  # lat_min, lat_max, lon_min, lon_max


def walk_min(meters: float) -> float:
    return meters * DETOUR / (WALK_KMH * 1000 / 60)


def meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def secs(hms: str) -> int:
    h, m, s = hms.strip().split(":")
    return int(h) * 3600 + int(m) * 60 + int(s)


def download(feed: str, item: str) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / f"{feed}.zip"
    if not path.is_file():
        print(f"  descargando {feed}…", file=sys.stderr)
        with urllib.request.urlopen(ITEM_URL.format(item), timeout=300) as response:
            content = response.read()
        zipfile.ZipFile(io.BytesIO(content)).testzip()  # validate before caching
        path.write_bytes(content)
    return path


def rows(zf: zipfile.ZipFile, name: str):
    match = next((n for n in zf.namelist() if n.endswith(name)), None)
    if not match:
        return
    with zf.open(match) as fh:
        yield from csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8-sig"))


def active_services(zf: zipfile.ZipFile) -> set[str]:
    """Services running on a typical upcoming weekday (Tue–Thu with most service in the next 4 weeks).
    If the feed's calendar has expired, fall back to its Tuesday pattern."""
    calendar = list(rows(zf, "calendar.txt"))
    exceptions = defaultdict(list)
    for r in rows(zf, "calendar_dates.txt"):
        exceptions[r["date"]].append((r["service_id"], r["exception_type"]))
    names = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")

    def on(day: date) -> set[str]:
        key = day.strftime("%Y%m%d")
        result = {r["service_id"] for r in calendar
                  if r.get(names[day.weekday()]) == "1" and r["start_date"] <= key <= r["end_date"]}
        for sid, kind in exceptions.get(key, []):
            (result.add if kind == "1" else result.discard)(sid)
        return result

    today = date.today()
    days = [today + timedelta(d) for d in range(1, 29) if (today + timedelta(d)).weekday() in (1, 2, 3)]
    best = max((on(d) for d in days), key=len, default=set())
    return best or {r["service_id"] for r in calendar if r.get("tuesday") == "1"}


def load_feed(feed: str, rail: bool, stops: dict, patterns: list) -> None:
    """Adds this feed's stops and peak-hour line patterns (stop sequence + minutes + headway)."""
    zf = zipfile.ZipFile(download(feed, FEEDS[feed][1]))
    for r in rows(zf, "stops.txt"):
        if r.get("location_type") not in (None, "", "0"):
            continue  # entrances / stations: platforms only
        lat, lon = float(r["stop_lat"]), float(r["stop_lon"])
        if BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lon <= BBOX[3]:
            stops[f"{feed}:{r['stop_id']}"] = (lat, lon, rail)
    services = active_services(zf)
    trips = {r["trip_id"]: r["route_id"] for r in rows(zf, "trips.txt") if r["service_id"] in services}
    freqs = defaultdict(list)
    for r in rows(zf, "frequencies.txt"):
        if r["trip_id"] in trips and r.get("headway_secs"):
            freqs[r["trip_id"]].append((secs(r["start_time"]), secs(r["end_time"]), int(r["headway_secs"])))

    by_pattern: dict[tuple, dict] = {}

    def close(trip_id: str, seq: list) -> None:
        if trip_id not in trips or len(seq) < 2:
            return
        seq.sort()
        first = seq[0][1]
        if trip_id in freqs:
            departures = sum(max(0, min(e, PEAK_END) - max(s, PEAK_START)) / h for s, e, h in freqs[trip_id])
        else:
            departures = 1.0 if PEAK_START <= first < PEAK_END else 0.0
        if departures <= 0:
            return
        stop_ids = tuple(f"{feed}:{s}" for _, _, s in seq)
        key = (trips[trip_id], stop_ids)
        entry = by_pattern.setdefault(key, {"departures": 0.0, "times": [t - first for _, t, _ in seq]})
        entry["departures"] += departures

    current, seq = None, []
    for r in rows(zf, "stop_times.txt"):
        if r["trip_id"] != current:
            if current is not None:
                close(current, seq)
            current, seq = r["trip_id"], []
        if current in trips:
            seq.append((int(r["stop_sequence"]), secs(r["departure_time"] or r["arrival_time"]), r["stop_id"]))
    if current is not None:
        close(current, seq)

    window_min = (PEAK_END - PEAK_START) / 60
    for (route, stop_ids), entry in by_pattern.items():
        headway = window_min / entry["departures"]
        wait = min(max(headway / 2, 1.0), MAX_WAIT_MIN) + (RAIL_ACCESS_MIN if rail else 0.0)
        patterns.append((stop_ids, [t / 60 for t in entry["times"]], wait))
    print(f"{feed}: {len(by_pattern)} patrones en hora punta, servicios activos {len(services)}", file=sys.stderr)


class Grid:
    """Tiny spatial hash for 'stops within N metres'."""

    def __init__(self, points: dict, cell: float = 0.01):
        self.cell, self.points, self.cells = cell, points, defaultdict(list)
        for key, (lat, lon, *_) in points.items():
            self.cells[(int(lat / cell), int(lon / cell))].append(key)

    def near(self, lat: float, lon: float, radius_m: float):
        span = int(radius_m / 1100 / self.cell) + 1
        cy, cx = int(lat / self.cell), int(lon / self.cell)
        for dy in range(-span, span + 1):
            for dx in range(-span, span + 1):
                for key in self.cells.get((cy + dy, cx + dx), ()):
                    p = self.points[key]
                    d = meters(lat, lon, p[0], p[1])
                    if d <= radius_m:
                        yield key, d


def build_reverse_graph(stops: dict, patterns: list):
    """Nodes: stop ids and (pattern, index) ride nodes. Returns reversed adjacency {v: [(u, minutes)]}."""
    rev = defaultdict(list)
    for p, (stop_ids, times, wait) in enumerate(patterns):
        for i, sid in enumerate(stop_ids):
            if sid not in stops:
                continue
            node = (p, i)
            rev[node].append((sid, wait))            # board: stop → ride node (wait)
            rev[sid].append((node, 0.0))             # alight: ride node → stop
            if i + 1 < len(stop_ids) and stop_ids[i + 1] in stops:
                rev[(p, i + 1)].append((node, max(times[i + 1] - times[i], 0.3)))  # ride
    grid = Grid(stops)
    for sid, (lat, lon, _) in stops.items():
        for other, d in grid.near(lat, lon, TRANSFER_M):
            if other != sid:
                rev[other].append((sid, walk_min(d)))
    return rev, grid


def dijkstra(rev, sources: dict) -> dict:
    dist = dict(sources)
    heap = [(d, i, n) for i, (n, d) in enumerate(sources.items())]
    heapq.heapify(heap)
    counter = len(heap)
    while heap:
        d, _, node = heapq.heappop(heap)
        if d > dist.get(node, math.inf):
            continue
        for prev, w in rev.get(node, ()):
            nd = d + w
            if nd < dist.get(prev, math.inf):
                dist[prev] = nd
                counter += 1
                heapq.heappush(heap, (nd, counter, prev))
    return dist


def centroids() -> dict[str, tuple[float, float]]:
    """Area id → (lat, lon): the centroid the scoring API already uses (indicators.json)."""
    data = json.loads((PROCESSED / "indicators.json").read_text(encoding="utf-8"))
    return {a["id"]: (a["centroid"][1], a["centroid"][0]) for a in data["areas"]}


def inside(lat: float, lon: float, rings: list) -> bool:
    """Ray casting point-in-polygon (outer ring minus holes); rings are [[lon, lat], ...]."""
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def sample_points(grid: "Grid") -> dict[str, list[tuple[float, float]]]:
    """Where people actually live in each barrio: points every ~300 m inside the polygon that have a
    public transport stop within 400 m (parks, forests and motorways drop out). Falls back to the centroid."""
    geo = json.loads((PROCESSED / "barrios.geojson").read_text(encoding="utf-8"))
    cents = centroids()
    result = {}
    for feature in geo["features"]:
        area_id, geom = feature["properties"]["id"], feature["geometry"]
        polygons = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        points = []
        for rings in polygons:
            lons = [x for x, _ in rings[0]]
            lats = [y for _, y in rings[0]]
            lat = min(lats)
            while lat <= max(lats):
                lon = min(lons)
                while lon <= max(lons):
                    if inside(lat, lon, rings) and next(grid.near(lat, lon, 400), None):
                        points.append((lat, lon))
                    lon += 0.0036
                lat += 0.0027
        result[area_id] = points or [cents[area_id]]
    return result


def transit_times(campuses: list) -> tuple[dict, dict]:
    stops, patterns = {}, []
    for feed, (_, _, rail) in FEEDS.items():
        load_feed(feed, rail, stops, patterns)
    rev, grid = build_reverse_graph(stops, patterns)
    print(f"grafo: {len(stops)} paradas, {len(patterns)} patrones", file=sys.stderr)
    samples = sample_points(grid)
    result = {}
    for campus in campuses:
        clon, clat = campus["coords"]
        sources = {sid: walk_min(d) for sid, d in grid.near(clat, clon, ACCESS_M)}
        dist = dijkstra(rev, sources)
        per_area = {}
        for area_id, points in samples.items():
            times = []
            for lat, lon in points:
                best = walk_min(meters(lat, lon, clat, clon))
                near = list(grid.near(lat, lon, ACCESS_M)) or sorted(grid.near(lat, lon, 3000), key=lambda x: x[1])[:5]
                for sid, d in near:
                    best = min(best, walk_min(d) + dist.get(sid, math.inf))
                times.append(best)
            per_area[area_id] = round(statistics.median(times))
        result[campus["id"]] = per_area
        print(f"  {campus['id']}: transporte público listo", file=sys.stderr)
    # Car origin: the populated sample point closest to the centroid (avoids centroids in the middle of a park).
    cents = centroids()
    origins = {aid: min(pts, key=lambda p: meters(p[0], p[1], *cents[aid])) for aid, pts in samples.items()}
    return result, origins


def car_times(campuses: list, areas: dict) -> dict:
    ids = list(areas)
    result = {}
    for campus in campuses:
        per_area = {}
        for start in range(0, len(ids), 80):
            chunk = ids[start:start + 80]
            coords = ";".join([f"{campus['coords'][0]},{campus['coords'][1]}"] +
                              [f"{areas[a][1]},{areas[a][0]}" for a in chunk])
            url = f"{OSRM}{coords}?destinations=0&annotations=duration,distance"
            for attempt in range(4):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "PrimeraLlave-ETL/1.0"})
                    with urllib.request.urlopen(req, timeout=60) as response:
                        data = json.load(response)
                    break
                except Exception as exc:  # noqa: BLE001 - public demo server: retry politely
                    print(f"  OSRM error ({exc}); reintento", file=sys.stderr)
                    time.sleep(5 * (attempt + 1))
            else:
                raise SystemExit("OSRM no responde")
            for i, area_id in enumerate(chunk, start=1):
                seconds, metres = data["durations"][i][0], data["distances"][i][0]
                per_area[area_id] = (None if seconds is None else round(seconds / 60),
                                     None if metres is None else round(metres / 1000, 1))
            time.sleep(1)
        result[campus["id"]] = per_area
        print(f"  {campus['id']}: coche listo", file=sys.stderr)
    return result


def main() -> None:
    campuses = json.loads((PROCESSED / "campuses.json").read_text(encoding="utf-8"))
    transit, areas = transit_times(campuses)
    car = car_times(campuses, areas)
    out = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "sources": {
            "transit": "CRTM · GTFS Metro, Cercanías, Metro Ligero, EMT e interurbanos (datos.crtm.es). Powered by CRTM.",
            "car": "OSRM sobre OpenStreetMap (© OpenStreetMap contributors, ODbL)",
        },
        "assumptions": {
            "transit": "Día laborable, hora punta 07:00–10:00. Espera = mitad de la frecuencia (máx. 15 min); "
                       "andando 4,8 km/h con desvío ×1,3; transbordos a pie ≤ 350 m; +2 min de acceso en Metro/Cercanías.",
            "car": "Tiempo de conducción sin tráfico ni aparcamiento (red viaria de OpenStreetMap).",
            "origin": "Mediana de puntos habitados del barrio (cada ~300 m, con parada a ≤ 400 m) → punto del campus.",
        },
        "campuses": {
            cid: {aid: {"transit_min": transit[cid][aid], "car_min": car[cid][aid][0], "car_km": car[cid][aid][1]}
                  for aid in areas}
            for cid in transit
        },
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"escrito {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
