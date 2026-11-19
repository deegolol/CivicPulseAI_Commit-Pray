#!/bin/sh
# SYNC: se pone al día con el repo y muestra lo que te toca.
# Uso: sh coordination/sync.sh <tu-id> <TU_CARRIL>     ej: sh coordination/sync.sh codex@diego DATA
ME="$1"; LANE="$2"
[ -z "$ME" ] || [ -z "$LANE" ] && { echo "Uso: sh coordination/sync.sh <tu-id> <TU_CARRIL>"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT" || exit 1

# 1) Traer main sin perder tu trabajo (autostash guarda y restaura tus cambios sin commitear)
git fetch -q origin
BR="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BR" = "main" ]; then
  git pull -q --rebase --autostash origin main && echo "✓ main actualizado" || echo "⚠️  No pude actualizar main: revisa 'git status' con tu humano."
else
  git rebase -q --autostash origin/main && echo "✓ rama $BR rebasada sobre origin/main" || { git rebase --abort 2>/dev/null; echo "⚠️  Conflicto al rebasar $BR: resuélvelo con tu humano."; }
fi
echo

# 2) Tablero
sh coordination/board.sh
echo

# 3) Tareas esperando revisión humana
echo "== EN REVISIÓN =="
grep -l "^status: review" coordination/tasks/T*.md 2>/dev/null | while read -r f; do
  printf "  %s  (owner: %s)\n" "$(basename "$f" .md)" "$(grep '^owner:' "$f" | sed 's/owner: *//; s/"//g')"
done
echo

# 4) Mensajes: los abiertos para mí o mi carril (hasta que se marquen resolved)
#    + los de 'all' que este agente aún no ha visto. Los de humanos, primero.
SEEN="$(git rev-parse --git-dir)/seen-$ME"; touch "$SEEN"
echo "== MENSAJES PARA $ME / $LANE / all =="
found=0
for pass in humano agente; do
  for f in coordination/inbox/[0-9]*.md; do
    [ -f "$f" ] || continue
    grep -q "^status: open" "$f" || continue
    to="$(grep -m1 '^to:' "$f" | sed 's/^to: *//; s/ *#.*$//')"
    from="$(grep -m1 '^from:' "$f" | sed 's/^from: *//')"
    case "$from" in humano@*) [ "$pass" = humano ] || continue ;; *) [ "$pass" = agente ] || continue ;; esac
    case "$to" in
      "$ME"|"$LANE") tag="para ti — responde y marca 'status: resolved'" ;;
      all|ALL) grep -qxF "$f" "$SEEN" && continue; echo "$f" >> "$SEEN"; tag="para todos — solo lectura" ;;
      *) continue ;;
    esac
    found=1
    [ "$pass" = humano ] && echo "🔴 PRIORIDAD HUMANA"
    echo "----- $f  ($tag, de $from)"
    awk 'f>=2{print} /^---$/{f++}' "$f"
    echo
  done
done
[ "$found" = 0 ] && echo "  (nada nuevo)"
echo
echo "Siguiente: responde con msg.sh, marca 'status: resolved' los que eran para ti y resume a tu humano en 3 líneas."
