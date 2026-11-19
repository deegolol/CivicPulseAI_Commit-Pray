# PrimeraLlave — single container for Railway: builds the React frontend (if present) and serves it + the API with FastAPI.
# Railway sets $PORT (the public domain targets 8080).

# ---------- 1) Frontend build ----------
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/ ./
RUN if [ -f package.json ]; then \
      (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && npm run build; \
    else \
      echo "frontend/ sin package.json todavía: se despliega solo la API"; mkdir -p dist; \
    fi

# ---------- 2) Backend runtime ----------
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY data/ data/
COPY --from=web /app/frontend/dist frontend/dist
WORKDIR /app/backend
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
