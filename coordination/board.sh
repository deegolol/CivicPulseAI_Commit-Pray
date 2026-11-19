#!/bin/sh
# Muestra el tablero de tareas leyendo el frontmatter de coordination/tasks/*.md
# Uso: sh coordination/board.sh            (todas)
#      sh coordination/board.sh todo       (filtra por estado)
cd "$(dirname "$0")" || exit 1
echo "== AGENTES =="
printf "%-24s %-6s %-8s %s\n" ID LANE STATUS FIRST_TASKS
for f in agents/*@*.md; do
  [ -f "$f" ] || continue
  awk '/^---$/ { n++; if (n == 2) exit; next }
       n == 1 { k=$1; sub(":", "", k); v=$0; sub(/^[^:]*:[ ]*/, "", v); sub(/[ ]+#.*$/, "", v); a[k]=v }
       END { printf "%-24s %-6s %-8s %s\n", a["id"], a["lane"], a["status"], a["first_tasks"] }' "$f"
done
echo
echo "== TAREAS =="
cd tasks || exit 1
printf "%-4s %-7s %-4s %-5s %-22s %s\n" ID STATUS PRIO LANE OWNER TITLE
printf "%-4s %-7s %-4s %-5s %-22s %s\n" ---- ------- ---- ----- ---------------------- -----
for f in T*.md; do
  awk -v filter="$1" '
    /^---$/ { n++; if (n == 2) exit; next }
    n == 1 {
      key = $1; sub(":", "", key)
      val = $0; sub(/^[^:]*:[ ]*/, "", val); sub(/[ ]+#.*$/, "", val); gsub(/"/, "", val)
      v[key] = val
    }
    END {
      if (filter != "" && v["status"] != filter) exit
      printf "%-4s %-7s %-4s %-5s %-22s %s\n", v["id"], v["status"], v["priority"], v["lane"], (v["owner"] == "" ? "-" : v["owner"]), v["title"]
    }' "$f"
done
