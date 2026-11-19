# Comandos de desarrollo y comprobación desde la raíz del repositorio.
PYTHON ?= python
NPM ?= npm

.PHONY: dev data check

dev: SHELL := bash
dev:
	@backend=0; frontend=0; \
	if [ -f backend/app/main.py ]; then backend=1; \
	else echo 'Backend pendiente (backend/app/main.py).'; fi; \
	if [ -f frontend/package.json ]; then frontend=1; \
	else echo 'Frontend pendiente (frontend/package.json).'; fi; \
	case "$$backend$$frontend" in \
	  10) cd backend && exec $(PYTHON) -m uvicorn app.main:app --reload --port 8000 ;; \
	  01) cd frontend && exec $(NPM) run dev ;; \
	  11) set -m; \
	      (cd backend && exec $(PYTHON) -m uvicorn app.main:app --reload --port 8000) & api_pid=$$!; \
	      (cd frontend && exec $(NPM) run dev) & web_pid=$$!; \
	      trap 'kill -- -$$api_pid -$$web_pid 2>/dev/null || true; wait' EXIT; \
	      trap 'exit 130' INT; \
	      trap 'exit 143' TERM; \
	      wait -n "$$api_pid" "$$web_pid" ;; \
	esac

data:
	@if [ -f etl/run_all.py ]; then \
	  $(PYTHON) etl/run_all.py; \
	else \
	  echo 'ETL pendiente (etl/run_all.py).'; \
	fi

check:
	@if [ -d backend/tests ]; then \
	  cd backend && $(PYTHON) -m pytest -q; \
	else \
	  echo 'Tests de backend pendientes (backend/tests/).'; \
	fi
	@if [ -f frontend/package.json ]; then \
	  cd frontend && $(NPM) run build; \
	else \
	  echo 'Build de frontend pendiente (frontend/package.json).'; \
	fi
