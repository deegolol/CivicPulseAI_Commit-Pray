#!/bin/sh
# Vigilante: mira el repo cada N segundos y avisa (texto + notificación de macOS) cuando llega
# un mensaje para ti / tu carril / todos, o una tarea pasa a "review" (lista para que un humano dé OK).
# Uso (déjalo abierto en una terminal):  sh coordination/watch.sh <tu-id> <TU_CARRIL> [segundos=15]
#   ej. humanos:  sh coordination/watch.sh codex@adrian DATA
# No modifica tu carpeta de trabajo: solo hace "git fetch" y lee origin/main.
ME="$1"; LANE="$2"; EVERY="${3:-15}"
[ -z "$ME" ] || [ -z "$LANE" ] && { echo "Uso: sh coordination/watch.sh <tu-id> <TU_CARRIL> [segundos]"; exit 1; }
cd "$(dirname "$0")/.." || exit 1
SEEN="$(git rev-parse --git-dir)/watch-seen-$ME"
notify() {  # título, texto
  printf '\a'
  command -v osascript >/dev/null 2>&1 && osascript -e "display notification \"$(printf '%s' "$2" | tr '"' "'" | cut -c1-180)\" with title \"$(printf '%s' "$1" | tr '"' "'")\" sound name \"Glass\"" >/dev/null 2>&1
}
snapshot() {  # lista de "claves" de eventos actuales en origin/main
  git ls-tree --name-only origin/main coordination/inbox/ 2>/dev/null | grep '/[0-9]' | sed 's/^/msg:/'
  for t in $(git ls-tree --name-only origin/main coordination/tasks/ 2>/dev/null | grep '/T'); do
    git show "origin/main:$t" 2>/dev/null | grep -q '^status: review' && echo "review:$t"
  done
}
git fetch -q origin
[ -f "$SEEN" ] || snapshot > "$SEEN"   # primera vez: no avisa de lo antiguo
echo "👀 Vigilando como $ME ($LANE) cada ${EVERY}s. Ctrl+C para parar."
while true; do
  git fetch -q origin 2>/dev/null
  snapshot | while read -r key; do
    grep -qxF "$key" "$SEEN" && continue
    echo "$key" >> "$SEEN"
    case "$key" in
      msg:*)
        f="${key#msg:}"; body="$(git show "origin/main:$f" 2>/dev/null)"
        to="$(printf '%s\n' "$body" | grep -m1 '^to:' | sed 's/^to: *//; s/ *#.*$//')"
        from="$(printf '%s\n' "$body" | grep -m1 '^from:' | sed 's/^from: *//')"
        case "$to" in "$ME"|"$LANE"|all|ALL) ;; *) continue ;; esac
        [ "$from" = "$ME" ] && continue
        text="$(printf '%s\n' "$body" | awk 'f>=2{print} /^---$/{f++}' | tr '\n' ' ')"
        echo; echo "📨 $(date +%H:%M:%S) $from → $to"; echo "   $text"
        echo "   ➜ dile a tu IA: SYNC"
        notify "📨 $from → $to" "$text" ;;
      review:*)
        t="$(basename "${key#review:}" .md)"
        owner="$(git show "origin/main:${key#review:}" 2>/dev/null | grep -m1 '^owner:' | sed 's/owner: *//; s/"//g')"
        echo; echo "🟡 $(date +%H:%M:%S) $t está en REVISIÓN (de $owner): su humano debe responder OK o CAMBIOS"
        notify "🟡 $t lista para revisar" "De $owner: su humano debe responder OK o CAMBIOS" ;;
    esac
  done
  sleep "$EVERY"
done
