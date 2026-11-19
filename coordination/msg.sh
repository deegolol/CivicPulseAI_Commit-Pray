#!/bin/sh
# Envía un mensaje a otro agente/carril: crea el fichero en el inbox, commit y push a main (con reintento).
# Uso: sh coordination/msg.sh <de> <para> <Txx|-> "<asunto corto>" "<texto>"
#   <para>: all | DATA | API | WEB | SHIP | <id-agente>
#   Mensajes de personas: <de> = humano@<nombre>  (tienen prioridad máxima)
FROM="$1"; TO="$2"; TASK="$3"; SUBJ="$4"; BODY="$5"
[ -z "$BODY" ] && { echo 'Uso: sh coordination/msg.sh <de> <para> <Txx|-> "<asunto>" "<texto>"'; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT" || exit 1
SLUG="$(printf '%s' "$SUBJ" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | tr -d "'\`^~\"" | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//' | cut -c1-40)"
F="coordination/inbox/$(date +%H%M%S)_${FROM}_to_${TO}_${SLUG:-msg}.md"
printf -- '---\nfrom: %s\nto: %s\nstatus: open\ntask: %s\n---\n%s\n' "$FROM" "$TO" "$TASK" "$BODY" > "$F"
# Commit en main aunque estés en una rama de tarea (worktree temporal, no toca tu rama)
BR="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BR" = "main" ] && [ -z "$(git status --porcelain -- . ':!'"$F")" ]; then
  git add "$F" && git commit -q -m "chore(inbox): $FROM → $TO: $SUBJ" || exit 1
  for i in 1 2 3; do git fetch -q origin && git rebase -q origin/main && git push -q origin HEAD:main && { echo "✓ enviado: $F"; exit 0; }; sleep 2; done
else
  TMP="$(mktemp -d)"; git fetch -q origin && git worktree add -q "$TMP" origin/main 2>/dev/null || { echo "⚠️  no pude crear worktree temporal"; exit 1; }
  mkdir -p "$TMP/coordination/inbox" && mv "$F" "$TMP/$F"
  ( cd "$TMP" && git add "$F" && git commit -q -m "chore(inbox): $FROM → $TO: $SUBJ" && \
    for i in 1 2 3; do git fetch -q origin && git rebase -q origin/main && git push -q origin HEAD:main && exit 0; sleep 2; done; exit 1 )
  ok=$?; git worktree remove --force "$TMP"; git fetch -q origin
  [ $ok = 0 ] && { echo "✓ enviado: $F (directo a main; tu rama $BR no se ha tocado)"; exit 0; }
fi
echo "⚠️  No se pudo hacer push del mensaje. Revisa la conexión y reintenta."; exit 1
