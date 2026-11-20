"""Build the offline university catalogue from the two official NOMECALLES layers."""

import json
import re
import ssl
from pathlib import Path
from urllib.request import urlopen

import certifi
from shapely.geometry import shape

from fetch_geometry import CAMPUSES

ROOT = Path(__file__).resolve().parents[1]
SERVICE = (
    "https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/"
    "Centros_educativos_de_la_Comunidad_de_Madrid_WFL1/FeatureServer"
)
LAYERS = (
    (2, "centros-universitarios.geojson", "centro"),
    (6, "campus-universitarios.geojson", "campus"),
)
# Keep existing IDs and positions, including their precomputed travel times.
CENTRE_IDS = {175: "upm-arquitectura", 176: "upm-industriales", 181: "etsiinf",
              187: "etsisi", 199: "comillas-icai"}
CAMPUS_IDS = {3: "urjc-alcorcon", 4: "etsiinf", 7: "urjc-fuenlabrada",
              8: "uc3m-getafe", 14: "comillas-icai", 17: "uc3m-leganes",
              25: "upm-arquitectura", 27: "urjc-vicalvaro", 28: "ceu-moncloa",
              32: "uam-cantoblanco", 33: "upm-industriales"}
LEGACY_ACRONYMS = {
    "etsisi": "UPM", "etsiinf": "UPM", "comillas-icai": "UPCO", "ceu-moncloa": "CEU",
}
UNIVERSITY_ALIASES = {
    "UAM": ["Autónoma de Madrid"],
    "UCM": ["Complutense"],
    "UPM": ["Politécnica de Madrid"],
    "URJC": ["Rey Juan Carlos"],
    "UAH": ["Universidad de Alcalá de Henares", "Universidad Alcalá de Henares"],
    "UC3M": ["Universidad Carlos III de Madrid", "Carlos III"],
    "UAN": ["Universidad Nebrija", "Nebrija"],
    "UAX": ["Alfonso X el Sabio"],
    "UEM": ["Universidad Europea"],
    "UPCO": ["Universidad Pontificia Comillas", "Comillas"],
    "CEU": ["Universidad CEU San Pablo", "CEU San Pablo"],
    "UIV": ["Universidad Internacional Villanueva", "Universidad Villanueva"],
}
# The addresses of both UDIT campuses come from udit.es; coordinates are from IGN CartoCiudad.
UDIT_CAMPUSES = (
    ("diseno", "Campus de Diseño e Industrias Creativas", [-3.6674173, 40.4571071], ["Alfonso XIII"]),
    ("tecnologia", "Campus de Tecnología, Innovación y Ciencias Aplicadas", [-3.6271881, 40.4405310],
     ["Campus de Alcalá", "Calle de Alcalá"]),
)
COMPUTING_LOCATIONS = {"uc3m-leganes", "nomecalles-campus-6"}
SCHOOL_ACRONYMS = {
    "Ingenieros de Minas y Energía": "ETSIME",
    "Ingenieros Navales": "ETSIN",
    "Ingenieros Telecomunicación": "ETSIT",
    "Ingeniería Aeronáutica y del Espacio": "ETSIAE",
    "Ingeniería y Diseño Industrial": "ETSIDI",
    "Ingeniería y Sistemas Telecomunicación": "ETSIST",
}


def features(layer, filename):
    local = ROOT / "data" / "raw" / filename
    if local.is_file():
        payload = local.read_bytes()
    else:
        url = f"{SERVICE}/{layer}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
        with urlopen(url, timeout=30, context=ssl.create_default_context(cafile=certifi.where())) as response:
            payload = response.read()
    data = json.loads(payload)
    if data.get("type") != "FeatureCollection" or not data.get("features"):
        raise ValueError(f"Invalid university feature collection: {filename}")
    return data["features"]


def build_catalogue():
    catalogue = {entry["id"]: {**entry, "aliases": list(entry["aliases"])} for entry in CAMPUSES}
    names = {}
    centres = features(*LAYERS[0][:2])
    for feature in centres:
        props = feature["properties"]
        acr = props["UNI"].strip("()")
        # NOMECALLES assigns UAN to one UAM-affiliated centre.
        if props["NUNIV"] == "Universidad Autónoma de Madrid":
            acr = "UAM"
        names[acr] = props["NUNIV"]

    for campus in catalogue.values():
        campus_id = campus["id"]
        acr = LEGACY_ACRONYMS.get(campus_id, campus_id.split("-")[0].upper())
        campus.update(university=names[acr], acronym=acr)
        campus["aliases"].extend(UNIVERSITY_ALIASES.get(acr, []))

    for layer, filename, kind in LAYERS:
        records = centres if kind == "centro" else features(layer, filename)
        for feature in records:
            props = feature["properties"]
            oid = props["OBJECTID"]
            label = " ".join(props["ETIQUETA"].split())
            if kind == "centro":
                acr = "UAM" if props["NUNIV"] == names["UAM"] else props["UNI"].strip("()")
                municipality = props["MUNICIPIO"]
                existing = CENTRE_IDS.get(oid)
            else:
                acr, label = re.fullmatch(r"Campus (\w+)\s*\((.+)\)", label).groups()
                label = f"Campus {label}"
                municipality = None
                existing = CAMPUS_IDS.get(oid)

            aliases = [label, *UNIVERSITY_ALIASES.get(acr, [])]
            if ". Campus " in label:
                aliases.append(label.split(". Campus ", 1)[1])
                aliases.append("Campus " + aliases[-1])
            if kind == "campus":
                aliases.append(label.removeprefix("Campus "))
            aliases.extend(abbreviation for title, abbreviation in SCHOOL_ACRONYMS.items() if title in label)
            aliases.extend(re.findall(r"\(([A-Z][A-Z0-9]{2,})\)", label))
            if re.search(r"informátic", label, re.IGNORECASE):
                aliases.extend(("Informática", "Ingeniería Informática"))
            if existing:
                campus = catalogue[existing]
                campus["aliases"].extend(aliases)
                if municipality:
                    campus["municipality"] = municipality
                continue
            point = shape(feature["geometry"]).representative_point()
            campus_id = f"nomecalles-{kind}-{oid}"
            catalogue[campus_id] = {
                "id": campus_id,
                "name": f"{acr} · {label}",
                "coords": [round(point.x, 7), round(point.y, 7)],
                "university": names[acr],
                "acronym": acr,
                "aliases": aliases,
                **({"municipality": municipality} if municipality else {}),
            }

    for suffix, label, coords, aliases in UDIT_CAMPUSES:
        campus_id = f"udit-{suffix}"
        catalogue[campus_id] = {
            "id": campus_id, "name": f"UDIT · {label}", "coords": coords,
            "university": "Universidad de Diseño, Innovación y Tecnología",
            "acronym": "UDIT", "municipality": "Madrid", "aliases": [label, *aliases],
        }
    for campus in catalogue.values():
        if campus["id"] in COMPUTING_LOCATIONS:
            campus["aliases"].extend(("Informática", "Ingeniería Informática"))
        campus["aliases"] = list(dict.fromkeys(campus["aliases"]))
    return list(catalogue.values())


if __name__ == "__main__":
    catalogue = build_catalogue()
    output = ROOT / "data" / "processed" / "universities.json"
    output.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(catalogue)} university locations")
