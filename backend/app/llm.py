"""In-app AI layer (T11): understand the student's sentence and explain results — with a no-AI fallback that always works.

- `parse_query`  : sentence → campus, budget, housing type, distance and priorities (validated, never trusted blindly).
- `explain_areas`: short Spanish explanation that only uses numbers computed by our scoring engine.
- Provider: OpenAI Responses API over plain HTTP (httpx), model from LLM_MODEL. Any error/timeout → fallback.
- The AI is always asked first. app/demo_cache.json (DEMO_CACHE=true) only answers the pitch sentences if the AI fails.
- Before any AI call, `looks_like_language` drops keyboard mashing; off-topic sentences get understood=false.
"""
from __future__ import annotations

import json
import os
import re
import threading
import unicodedata
from collections import OrderedDict
from datetime import date
from pathlib import Path

import httpx
from dotenv import load_dotenv

from .campus_search import match_campuses
from .models import Campus, Indicator
from .prompts import EXPLAIN_INSTRUCTIONS, PARSE_INSTRUCTIONS

OPENAI_URL = "https://api.openai.com/v1/responses"
DEMO_CACHE_FILE = Path(__file__).resolve().parent / "demo_cache.json"
load_dotenv(Path(__file__).resolve().parents[2] / ".env")  # real env vars (Railway) take precedence

# ---------------------------------------------------------------- cost & speed guards (T26)
# The demo is public and uses the team's paid key: cap LLM calls per day and cache identical requests.
_lock = threading.Lock()
_usage = {"day": date.today().isoformat(), "calls": 0}
_CACHE_MAX = 256
_parse_cache: OrderedDict[str, dict] = OrderedDict()
_explain_cache: OrderedDict[str, str] = OrderedDict()


def _take_llm_budget() -> bool:
    """True if we may call the LLM now (and counts the call). Resets every day."""
    limit = int(os.getenv("LLM_DAILY_LIMIT", "1500"))
    with _lock:
        today = date.today().isoformat()
        if _usage["day"] != today:
            _usage.update(day=today, calls=0)
        if _usage["calls"] >= limit:
            return False
        _usage["calls"] += 1
        return True


def llm_status() -> dict:
    return {"llm": llm_enabled(), "llm_calls_today": _usage["calls"] if _usage["day"] == date.today().isoformat() else 0}


def _cache_get(cache: OrderedDict, key: str):
    with _lock:
        if key in cache:
            cache.move_to_end(key)
            return cache[key]
    return None


def _cache_put(cache: OrderedDict, key: str, value) -> None:
    with _lock:
        cache[key] = value
        cache.move_to_end(key)
        while len(cache) > _CACHE_MAX:
            cache.popitem(last=False)


def reset_guards() -> None:  # used by tests
    with _lock:
        _usage.update(day=date.today().isoformat(), calls=0)
        _parse_cache.clear()
        _explain_cache.clear()
DISTANCE_KEY = "distance_km"
HOUSING_TYPES = ("room", "studio", "flat")

# Words that raise a priority in the keyword fallback (accents removed, lowercase).
KEYWORDS = {
    "rent_eur_m2": ("barat", "economic", "precio", "pagar poco", "ahorrar", "low cost", "asequible"),
    DISTANCE_KEY: ("cerca", "andando", "caminando", "pie", "rapido", "cercania", "distancia"),
    "air_no2": ("aire", "contamin", "limpio", "verde", "correr", "salud", "tranquil", "respirar"),
    "transit_stops": ("metro", "bus", "transporte", "cercanias", "comunicad", "tren"),
    "services_count": ("servicio", "biblioteca", "gimnasio", "deporte", "cultura", "centro de salud", "ambiente"),
    "libraries_count": ("biblioteca", "leer", "lectura", "cultura", "ocio"),
    "sports_count": ("gimnas", "deporte", "deportiv", "polideportiv", "entren", "piscina"),
}
# Words that show the sentence is about finding somewhere to live / study (keyword topic check, no AI).
TOPIC_WORDS = (
    "piso", "habitacion", "alquil", "estudio", "apartamento", "casa", "vivienda", "vivir", "residencia", "compart",
    "barrio", "zona", "campus", "universidad", "facultad", "escuela", "carrera", "estudi", "clase", "upm", "ucm",
    "uam", "uc3m", "urjc", "ceu", "comillas", "icai", "euros", "presupuesto", "pavos", "mes", "cerca", "metro",
    "madrid", "dormir", "mudar", "erasmus", "busco", "buscar",
)
VOWELS = set("aeiouy")


def _has_word(q: str, w: str) -> bool:
    """Word-start match ("barat" → "barato"); short words must be whole ("bus" ≠ "busco", "mes" ≠ "mesa")."""
    return bool(re.search(rf"\b{re.escape(w)}" + (r"\b" if len(w) <= 4 else ""), q))


def looks_like_language(query: str) -> bool:
    """Cheap, deterministic check (no AI) that the text is made of real-looking words, not keyboard mashing.

    Rejects: mostly symbols/digits, a letter repeated 4+ times ("aaaa"), too few different letters,
    or a majority of 'words' that are impossible in Spanish (no vowel, 5+ consonants in a row, 25+ letters).
    """
    q = _norm(query)
    letters = [c for c in q if c.isalpha()]
    meaningful = [c for c in q if c.isalnum()]  # "500-600 euros" is fine: digits count as meaningful
    visible = [c for c in q if not c.isspace()]
    if len(letters) < 3 or len(meaningful) < 0.6 * len(visible):
        return False
    if re.search(r"([a-z])\1{3,}", q) or len(set(letters)) < min(5, max(3, len(letters) // 3)):
        return False
    words = re.findall(r"[a-z]+", q)
    def plausible(w: str) -> bool:
        return (len(w) <= 3 or bool(set("aeiou") & set(w))) and len(w) < 25 and not re.search(r"[^aeiou]{5,}", w)
    good = sum(plausible(w) for w in words)
    return good >= max(1, round(0.7 * len(words)))


def on_topic_by_keywords(query: str, campuses: list[Campus]) -> bool:
    q = _norm(query)
    names = [_norm(a) for c in campuses for a in (c.id, c.name, *c.aliases)]
    return (any(_has_word(q, w) for w in TOPIC_WORDS)
            or any(n and re.search(rf"\b{re.escape(n)}\b", q) for n in names)
            or bool(re.search(r"\b\d{3,4}\s*(?:euros?|eur|pavos|al mes)", q)))


# ---------------------------------------------------------------- helpers
def _norm(text: str) -> str:
    text = text.replace("€", " euros ")  # the ASCII step below would silently drop the € sign
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()).strip()


def llm_enabled() -> bool:
    return os.getenv("LLM_PROVIDER", "none").lower() == "openai" and bool(os.getenv("LLM_API_KEY"))


def _call_openai(instructions: str, user_input: str, schema: dict | None = None, timeout_env: str = "LLM_TIMEOUT_S", timeout_default: str = "8") -> str:
    """One Responses API call. Raises on any HTTP/timeout/format problem (callers fall back)."""
    if not _take_llm_budget():
        raise RuntimeError("límite diario de llamadas al LLM alcanzado")
    body: dict = {"model": os.getenv("LLM_MODEL", "gpt-5.6-luna"), "instructions": instructions, "input": user_input,
                  "reasoning": {"effort": os.getenv("LLM_REASONING_EFFORT", "low")}}
    if schema:
        body["text"] = {"format": {"type": "json_schema", "name": "params", "schema": schema, "strict": True}}
    timeout = float(os.getenv(timeout_env, timeout_default))
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
        "required": ["on_topic", "campus_id", "budget_eur_month", "housing_type", "max_distance_km", "max_travel_min",
                     "travel_mode", "priorities", "interpretation"],
        "properties": {
            "on_topic": {"type": "boolean"},
            "campus_id": {"type": ["string", "null"], "enum": [c.id for c in campuses] + [None]},
            "budget_eur_month": num_or_null,
            "housing_type": {"type": "string", "enum": list(HOUSING_TYPES)},
            "max_distance_km": num_or_null,
            "max_travel_min": num_or_null,
            "travel_mode": {"type": "string", "enum": ["transit", "car"]},
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
    minutes = raw.get("max_travel_min")
    minutes = float(minutes) if isinstance(minutes, (int, float)) and 5 <= minutes <= 180 else None
    mode = raw.get("travel_mode") if raw.get("travel_mode") in ("transit", "car") else "transit"
    prio = raw.get("priorities") or {}
    # Snap to 3 levels (poco / bastante / mucho): the AI may answer 0.8 one time and 0.9 the next for the same
    # sentence; snapping makes the same sentence + options give the same ranking.
    def snap(value: float) -> float:
        return 0.2 if value < 0.4 else 0.6 if value < 0.8 else 1.0
    weights = {k: snap(min(max(float(prio.get(k, 0.2) or 0), 0.0), 1.0)) for k in keys}
    if DISTANCE_KEY in weights:  # students commute daily: distance never drops below 0.6 (product rule, D-24)
        weights[DISTANCE_KEY] = max(weights[DISTANCE_KEY], 0.6)
    return {
        "campus_id": campus,
        "weights": weights,
        "filters": {"max_rent_eur_m2": None, "max_distance_km": dist, "max_travel_min": minutes,
                    "only_within_budget": budget is not None},
        "travel_mode": mode,
        "understood": raw.get("on_topic", True) is not False,
        "budget_eur_month": budget,
        "housing_type": housing,
        "interpretation": str(raw.get("interpretation") or "")[:300],
        "engine": engine,
    }


def keyword_parse(query: str, campuses: list[Campus], keys: list[str],
                  matches: list[Campus] | None = None) -> dict:
    """Offline fallback: regex + keywords. Less smart, but never fails."""
    q = _norm(query)
    matches = match_campuses(query, campuses) if matches is None else matches
    campus = matches[0].id if len(matches) == 1 else None
    # "1.200 €" / "1,200 euros" are thousands; "450 €" is not.
    m = re.search(r"(\d{1,3}(?:[.,]\d{3})+|\d{2,5})(?:[.,]\d{1,2})?\s*(?:euros?|eur|pavos|al mes|/mes)", q)
    budget = float(re.sub(r"[.,]", "", m.group(1))) if m else None
    # "Estudio en la ETSISI" is the verb, not a studio flat: require a noun-like context.
    is_studio = re.search(r"\b(un|el|busco|quiero|alquilar|alquilo)\s+estudio\b|\bestudio\s+(para|individual|solo|propio)", q)
    housing = "studio" if is_studio else "flat" if re.search(r"piso (entero|para mi|solo)|apartamento", q) else "room"
    km = re.search(r"(\d+(?:[.,]\d+)?)\s*km", q)
    minutes = re.search(r"(\d{1,3})\s*(?:min|minutos)", q)
    mode = "car" if re.search(r"\b(coche|carro|conduc|en moto)", q) else "transit"
    # Word-start matching: "bus" must not fire on "busco", nor "tren" on "entrenar".
    priorities = {k: (1.0 if any(_has_word(q, w) for w in KEYWORDS.get(k, ())) else 0.2) for k in keys}
    if "rent_eur_m2" in priorities and (budget or priorities["rent_eur_m2"] < 1):
        priorities["rent_eur_m2"] = max(priorities["rent_eur_m2"], 0.6)
    parts = [next((item.name for item in campuses if item.id == campus), None), f"hasta {int(budget)} €/mes" if budget else None,
             {"room": "habitación", "studio": "estudio", "flat": "piso entero"}[housing],
             f"a menos de {km.group(1)} km" if km else None,
             f"a menos de {minutes.group(1)} min" + (" en coche" if mode == "car" else " en transporte público") if minutes else None]
    raw = {"campus_id": campus, "budget_eur_month": budget, "housing_type": housing,
           "max_distance_km": float(km.group(1).replace(",", ".")) if km else None, "priorities": priorities,
           "max_travel_min": float(minutes.group(1)) if minutes else None, "travel_mode": mode,
           "on_topic": bool(matches) or on_topic_by_keywords(query, campuses),
           "interpretation": "He entendido: " + ", ".join(p for p in parts if p) + "."}
    return raw


NOT_UNDERSTOOD = {
    "gibberish": "No he entendido lo que has escrito. Cuéntame con palabras qué buscas, por ejemplo dónde estudias y cuánto puedes pagar.",
    "off_topic": "Solo puedo ayudarte a encontrar dónde vivir en Madrid. Dime dónde estudias, qué buscas y tu presupuesto.",
}


def parse_query(query: str, campuses: list[Campus], indicators: list[Indicator], default_campus: str) -> dict:
    keys = [i.key for i in indicators] + [DISTANCE_KEY]
    cache_key = json.dumps([_norm(query), keys, [c.id for c in campuses], default_campus])
    hit = _cache_get(_parse_cache, cache_key)
    if hit:
        return dict(hit)
    matches = match_campuses(query, campuses)
    if not matches and not looks_like_language(query):
        return _not_understood("gibberish", keys, default_campus)
    result = None
    if llm_enabled():
        try:
            prompt_campuses = matches if len(matches) <= 12 else []
            campus_list = "; ".join(f"{c.id} = {c.name}" for c in prompt_campuses)
            text = _call_openai(PARSE_INSTRUCTIONS + f"\nCampus disponibles: {campus_list}\nCriterios: {', '.join(keys)}",
                                query, parse_schema(prompt_campuses, keys))
            result = _finish(json.loads(text), campuses, keys, default_campus, "llm")
        except Exception:  # noqa: BLE001 — any failure means "use the fallback", the demo must not break
            result = None
    if result is None:
        cached = _demo_cache().get(_norm(query))  # pitch sentences still work offline
        # A cached pitch answer was written by the AI earlier, so it keeps the "llm" label.
        result = _finish(cached, campuses, keys, default_campus, "llm") if cached else \
            _finish(keyword_parse(query, campuses, keys, matches), campuses, keys, default_campus, "keywords")
    if result["understood"]:
        result["campus_candidates"] = [campus.id for campus in matches]
        if len(matches) == 1:
            result["campus_id"] = matches[0].id
    else:
        result = _not_understood("off_topic", keys, default_campus, result["engine"])
    _cache_put(_parse_cache, cache_key, result)
    return dict(result)


def _not_understood(reason: str, keys: list[str], default_campus: str, engine: str = "keywords") -> dict:
    out = _finish({"on_topic": False}, [], keys, default_campus, engine)
    out.update(understood=False, interpretation=NOT_UNDERSTOOD[reason])
    return out


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
        txt = f"{i}) {it['name']} ({it['district']}): "
        if it.get("distancia_en_linea_recta_km") is not None:
            txt += f"a {_fmt(it['distancia_en_linea_recta_km'], 1)} km en línea recta del campus"
        else:
            txt += (f"{_fmt(it.get('min_transporte_publico'))} min en transporte público "
                    f"y {_fmt(it.get('min_coche'))} min en coche hasta tu campus")
        if it.get("alquiler_oficial_piso_mediana") is not None:
            txt += f"; pisos del distrito: {_fmt(it['alquiler_oficial_piso_mediana'])} €/mes de alquiler mediano oficial (2024)"
        if it.get("fits_budget") is True:
            txt += ", dentro de tu presupuesto"
        elif it.get("fits_budget") is False:
            txt += ", algo por encima de tu presupuesto"
        lines.append(txt + ".")
    return "\n".join(lines) + "\nEl precio exacto de cada piso está en los anuncios enlazados."


def explain_areas(items: list[dict], housing_type: str, query: str | None) -> tuple[str, str]:
    """Returns (text, engine). `items` are trimmed score results (numbers only from our engine)."""
    if not items:
        return "No hay zonas que encajen con estos filtros. Prueba a subir el presupuesto o la distancia.", "keywords"
    if llm_enabled():
        try:
            payload = json.dumps({"busqueda": query or "", "tipo_vivienda": housing_type, "zonas": items}, ensure_ascii=False)
            hit = _cache_get(_explain_cache, payload)
            if hit:
                return hit, "llm"
            # Longer budget than parse: the UI shows results first and the explanation loads after.
            text = _call_openai(EXPLAIN_INSTRUCTIONS, payload, timeout_env="LLM_EXPLAIN_TIMEOUT_S", timeout_default="12")
            _cache_put(_explain_cache, payload, text)
            return text, "llm"
        except Exception:  # noqa: BLE001
            pass
    return template_explain(items, housing_type), "keywords"
