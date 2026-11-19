#!/bin/sh
# Para agentes SIN trabajo: en vez de pararte, ejecuta esto. Bloquea hasta que llegue un mensaje nuevo
# para ti / tu carril / todos (o de un humano), lo imprime y termina. Luego lo atiendes y vuelves a ejecutarlo.
# Uso: sh coordination/wait.sh <tu-id> <TU_CARRIL> [max_minutos=9] [cada_segundos=15]
#   Sale con código 0 si llega un mensaje y 2 si pasan max_minutos sin nada (entonces haz SYNC y vuelve a lanzarlo).
ME="$1"; LANE="$2"; MAXMIN="${3:-9}"; EVERY="${4:-15}"
[ -z "$ME" ] || [ -z "$LANE" ] && { echo "Uso: sh coordination/wait.sh <tu-id> <TU_CARRIL> [max_minutos] [segundos]"; exit 1; }
cd "$(dirname "$0")/.." || exit 1
SEEN="$(git rev-parse --git-dir)/wait-seen-$ME"
list_msgs() { git ls-tree --name-only origin/main coordination/inbox/ 2>/dev/null | grep '/[0-9]'; }
git fetch -q origin
[ -f "$SEEN" ] || list_msgs > "$SEEN"
end=$(( $(date +%s) + MAXMIN * 60 ))
echo "⏳ $ME esperando mensajes (máx. ${MAXMIN} min, mirando cada ${EVERY}s)…"
while [ "$(date +%s)" -lt "$end" ]; do
  git fetch -q origin 2>/dev/null
  found=0
  for f in $(list_msgs); do
    grep -qxF "$f" "$SEEN" && continue
    echo "$f" >> "$SEEN"
    body="$(git show "origin/main:$f" 2>/dev/null)"
    to="$(printf '%s\n' "$body" | grep -m1 '^to:' | sed 's/^to: *//; s/ *#.*$//')"
    from="$(printf '%s\n' "$body" | grep -m1 '^from:' | sed 's/^from: *//')"
    [ "$from" = "$ME" ] && continue
    case "$to" in "$ME"|"$LANE"|all|ALL) ;; *) continue ;; esac
    echo "📨 $from → $to ($f)"; printf '%s\n' "$body" | awk 'f>=2{print} /^---$/{f++}'; echo
    found=1
  done
  [ "$found" = 1 ] && { echo "➜ Haz SYNC (sh coordination/sync.sh $ME $LANE), atiende y vuelve a lanzar wait.sh si sigues sin tareas."; exit 0; }
  sleep "$EVERY"
done
echo "⌛ ${MAXMIN} min sin mensajes. Haz SYNC por si hay tareas nuevas y vuelve a lanzar wait.sh."; exit 2
