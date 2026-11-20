"""Resolve university, school and campus mentions against the published catalogue."""

import re
import unicodedata
from collections import defaultdict

from .models import Campus

LEGACY_ALIASES = {
    "etsisi": ("campus sur", "vallecas", "sistemas informaticos", "software"),
    "etsiinf": ("montegancedo", "boadilla", "fi upm", "facultad de informatica"),
}
SCHOOL_PREFIX = re.compile(
    r"^(?:e t s|escuela tecnica superior|escuela universitaria|facultad) "
    r"(?:(?:de|del|la|las) )*"
)


def search_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    normalized = re.sub(r"\b(?:infromatica|infomatica|informatcia)\b", "informatica", normalized)
    return " ".join(re.findall(r"[a-z0-9]+", normalized))


def match_campuses(query: str, campuses: list[Campus]) -> list[Campus]:
    """Return equally specific matches. Let the student choose when a term identifies several sites."""
    haystack = f" {search_text(query)} "

    def mentions(term: str) -> bool:
        return len(term) >= 2 and f" {term} " in haystack

    groups = defaultdict(list)
    for campus in campuses:
        if campus.acronym:
            groups[campus.acronym].append(campus)
    group_terms = {}
    for acronym, group in groups.items():
        shared = set.intersection(*(set(campus.aliases) for campus in group)) if len(group) > 1 else set()
        group_terms[acronym] = {search_text(term) for term in (acronym, group[0].university or "", *shared)}
    named_groups = {acronym for acronym, terms in group_terms.items() if any(map(mentions, terms))}

    scored = []
    for campus in campuses:
        if named_groups and campus.acronym not in named_groups:
            continue
        school = campus.name.split(" · ")[-1]
        public_id = campus.id.split("-", 1)[-1] if not campus.id.startswith("nomecalles-") else ""
        terms = {search_text(term) for term in (campus.id, school, public_id, *campus.aliases,
                                                *LEGACY_ALIASES.get(campus.id, ()))}
        terms.update(SCHOOL_PREFIX.sub("", term) for term in tuple(terms))
        if not campus.acronym:
            terms.add(search_text(campus.name.split(" · ")[0]))
        for university in group_terms.get(campus.acronym, ()):
            if mentions(university):
                terms = {term for term in terms if not term or f" {term} " not in f" {university} "}
        matched = {term for term in terms if mentions(term)}
        specific = sum(len(term.split()) * 100 + len(term) for term in matched
                       if not any(term != other and f" {term} " in f" {other} " for other in matched))
        local = search_text(campus.municipality or "")
        location = local != "madrid" and mentions(local)
        if specific or named_groups:
            scored.append(((specific, location), campus))

    best = max((score for score, _ in scored), default=None)
    return [campus for score, campus in scored if score == best]
