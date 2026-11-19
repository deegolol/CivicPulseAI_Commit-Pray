"""In-app AI layer (T11): understand the student's sentence and explain results — with a no-AI fallback that always works.

- `parse_query`  : sentence → campus, budget, housing type, distance and priorities (validated, never trusted blindly).
- `explain_areas`: short Spanish explanation that only uses numbers computed by our scoring engine.
- Provider: OpenAI Responses API over plain HTTP (httpx), model from LLM_MODEL. Any error/timeout → fallback.
- DEMO_CACHE=true: the pitch sentences are answered from app/demo_cache.json (instant and offline-proof).
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path

import httpx
from dotenv import load_dotenv

from .models import Campus, Indicator
from .prompts import EXPLAIN_INSTRUCTIONS, PARSE_INSTRUCTIONS

OPENAI_URL = "https://api.openai.com/v1/responses"
DEMO_CACHE_FILE = Path(__file__).resolve().parent / "demo_cache.json"
load_dotenv(Path(__file__).resolve().parents[2] / ".env")  # real env vars (Railway) take precedence
DISTANCE_KEY = "distance_km"
HOUSING_TYPES = ("room", "studio", "flat")

# Words that raise a priority in the keyword fallback (accents removed, lowercase).
KEYWORDS = {
    "rent_eur_m2": ("barat", "economic", "precio", "pagar poco", "ahorrar", "low cost", "asequible"),
    DISTANCE_KEY: ("cerca", "andando", "caminando", "pie", "rapido", "cercania", "distancia"),
    "air_no2": ("aire", "contamin", "limpio", "verde", "correr", "salud", "tranquil", "respirar"),
    "transit_stops": ("metro", "bus", "transporte", "cercanias", "comunicad", "tren"),
    "services_count": ("servicio", "biblioteca", "gimnasio", "deporte", "cultura", "centro de salud", "ambiente"),
}
CAMPUS_ALIASES = {
    "etsisi": ("etsisi", "campus sur", "vallecas", "sistemas informaticos", "software"),
    "etsiinf": ("etsiinf", "montegancedo", "boadilla", "fi upm", "facultad de informatica"),
}


# ---------------------------------------------------------------- helpers
def _norm(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower().strip()


def llm_enabled() -> bool:
    return os.getenv("LLM_PROVIDER", "none").lower() == "openai" and bool(os.getenv("LLM_API_KEY"))


def _call_openai(instructions: str, user_input: str, schema: dict | None = None) -> str:
    """One Responses API call. Raises on any HTTP/timeout/format problem (callers fall back)."""
    body: dict = {"model": os.getenv("LLM_MODEL", "gpt-5.6-luna"), "instructions": instructions, "input": user_input,
                  "reasoning": {"effort": os.getenv("LLM_REASONING_EFFORT", "low")}}
    if schema:
        body["text"] = {"format": {"type": "json_schema", "name": "params", "schema": schema, "strict": True}}
    timeout = float(os.getenv("LLM_TIMEOUT_S", "8"))
    r = httpx.post(OPENAI_URL, json=body, timeout=timeout,
                   headers={"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"})
    r.raise_for_status()
    data = r.json()
    text = "".join(
        c.get("text", "") for item in data.get("output", []) if item.get("type") == "message"
        for c in item.get("content", []) if c.get("type") == "output_text"
    ).strip()
    if not text:
        raise ValueError("respuesta vacía del LLM")
    return text


def _demo_cache() -> dict:
    if os.getenv("DEMO_CACHE", "true").lower() != "true" or not DEMO_CACHE_FILE.exists():
        return {}
    return json.loads(DEMO_CACHE_FILE.read_text(encoding="utf-8"))


# ---------------------------------------------------------------- parse
def parse_schema(campuses: list[Campus], keys: list[str]) -> dict:
    """Strict JSON schema built from the data we actually have (campus ids and indicator keys)."""
    num_or_null = {"type": ["number", "null"]}
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["campus_id", "budget_eur_month", "housing_type", "max_distance_km", "priorities", "interpretation"],
        "properties": {
            "campus_id": {"type": ["string", "null"], "enum": [c.id for c in campuses] + [None]},
            "budget_eur_month": num_or_null,
            "housing_type": {"type": "string", "enum": list(HOUSING_TYPES)},
            "max_distance_km": num_or_null,
            "priorities": {
                "type": "object", "additionalProperties": False, "required": keys,
                "properties": {k: {"type": "number"} for k in keys},
            },
            "interpretation": {"type": "string"},
        },
    }


def _finish(raw: dict, campuses: list[Campus], keys: list[str], default_campus: str, engine: str) -> dict:
    """Validate/clamp whatever came from the LLM or the fallback into the contract shape (CONTRACTS §4.7)."""
    campus_ids = {c.id for c in campuses}
    campus = raw.get("campus_id") if raw.get("campus_id") in campus_ids else default_campus
    budget = raw.get("budget_eur_month")
    budget = float(budget) if isinstance(budget, (int, float)) and 50 <= budget <= 10000 else None
    housing = raw.get("housing_type") if raw.get("housing_type") in HOUSING_TYPES else "room"
    dist = raw.get("max_distance_km")
    dist = float(dist) if isinstance(dist, (int, float)) and 0 < dist <= 60 else None
    prio = raw.get("priorities") or {}
    weights = {k: round(min(max(float(prio.get(k, 0.2) or 0), 0.0), 1.0), 2) for k in keys}
    return {
        "campus_id": campus,
        "weights": weights,
        "filters": {"max_rent_eur_m2": None, "max_distance_km": dist, "only_within_budget": budget is not None},
        "budget_eur_month": budget,
        "housing_type": housing,
        "interpretation": str(raw.get("interpretation") or "")[:300],
        "engine": engine,
    }


def keyword_parse(query: str, campuses: list[Campus], keys: list[str]) -> dict:
    """Offline fallback: regex + keywords. Less smart, but never fails."""
    q = _norm(query)
    campus = next((cid for cid, words in CAMPUS_ALIASES.items() if any(w in q for w in words)), None)
    m = re.search(r"(\d{2,5})(?:[.,]\d+)?\s*(?:€|eur|euros?|pavos|al mes|/mes)", q)
    budget = float(m.group(1)) if m else None
    # "Estudio en la ETSISI" is the verb, not a studio flat: require a noun-like context.
    is_studio = re.search(r"\b(un|el|busco|quiero|alquilar|alquilo)\s+estudio\b|\bestudio\s+(para|individual|solo|propio)", q)
    housing = "studio" if is_studio else "flat" if re.search(r"piso (entero|para mi|solo)|apartamento", q) else "room"
    km = re.search(r"(\d+(?:[.,]\d+)?)\s*km", q)
    priorities = {k: (1.0 if any(w in q for w in KEYWORDS.get(k, ())) else 0.2) for k in keys}
    if "rent_eur_m2" in priorities and (budget or priorities["rent_eur_m2"] < 1):
        priorities["rent_eur_m2"] = max(priorities["rent_eur_m2"], 0.6)
    parts = [f"campus {campus.upper()}" if campus else None, f"hasta {int(budget)} €/mes" if budget else None,
             {"room": "habitación", "studio": "estudio", "flat": "piso entero"}[housing],
             f"a menos de {km.group(1)} km" if km else None]
    raw = {"campus_id": campus, "budget_eur_month": budget, "housing_type": housing,
           "max_distance_km": float(km.group(1).replace(",", ".")) if km else None, "priorities": priorities,
           "interpretation": "He entendido: " + ", ".join(p for p in parts if p) + "."}
    return raw


def parse_query(query: str, campuses: list[Campus], indicators: list[Indicator], default_campus: str) -> dict:
    keys = [i.key for i in indicators] + [DISTANCE_KEY]
    cached = _demo_cache().get(_norm(query))
    if cached:
        return _finish(cached, campuses, keys, default_campus, "llm")
    if llm_enabled():
        try:
            campus_list = "; ".join(f"{c.id} = {c.name}" for c in campuses)
            text = _call_openai(PARSE_INSTRUCTIONS + f"\nCampus disponibles: {campus_list}\nCriterios: {', '.join(keys)}",
                                query, parse_schema(campuses, keys))
            return _finish(json.loads(text), campuses, keys, default_campus, "llm")
        except Exception:  # noqa: BLE001 — any failure means "use the fallback", the demo must not break
            pass
    return _finish(keyword_parse(query, campuses, keys), campuses, keys, default_campus, "keywords")


# ---------------------------------------------------------------- explain
HOUSING_ES = {"room": "una habitación", "studio": "un estudio", "flat": "un piso"}


def _fmt(n: float | None, decimals: int = 0) -> str:
    if n is None:
        return "—"
    s = f"{n:,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s


def template_explain(items: list[dict], housing_type: str) -> str:
    """Deterministic fallback explanation built only from our numbers."""
    lines = []
    for i, it in enumerate(items, 1):
        txt = f"{i}) {it['name']} ({it['district']}): a {_fmt(it['distance_km'], 1)} km del campus"
        if it.get("est_rent_eur_month") is not None:
            txt += f", ~{_fmt(it['est_rent_eur_month'])} €/mes estimados por {HOUSING_ES.get(housing_type, 'una vivienda')}"
        if it.get("fits_budget") is True:
            txt += ", dentro de tu presupuesto"
        elif it.get("fits_budget") is False:
            txt += ", algo por encima de tu presupuesto"
        lines.append(txt + ".")
    return "\n".join(lines) + "\nPrecios estimados con datos oficiales; mira los anuncios para el precio real."


def explain_areas(items: list[dict], housing_type: str, query: str | None) -> tuple[str, str]:
    """Returns (text, engine). `items` are trimmed score results (numbers only from our engine)."""
    if not items:
        return "No hay zonas que encajen con estos filtros. Prueba a subir el presupuesto o la distancia.", "keywords"
    if llm_enabled():
        try:
            payload = json.dumps({"busqueda": query or "", "tipo_vivienda": housing_type, "zonas": items}, ensure_ascii=False)
            return _call_openai(EXPLAIN_INSTRUCTIONS, payload), "llm"
        except Exception:  # noqa: BLE001
            pass
    return template_explain(items, housing_type), "keywords"
