"""FastAPI entry point: mounts the /api routers and, in production, serves the built frontend (frontend/dist).

Run locally:  cd backend && uvicorn app.main:app --reload --port 8000
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

from .data import REPO_ROOT
from .routers import ai, areas, meta, score

load_dotenv(REPO_ROOT / ".env")  # LLM_* settings; real env vars (Railway) take precedence

app = FastAPI(title="PrimeraLlave API", version="0.1.0", description="Dónde buscar piso en Madrid para estudiantes, con datos abiertos.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (meta.router, areas.router, score.router, ai.router):
    app.include_router(r, prefix="/api")

# Production: serve the React build from the same origin (single Railway service, see T15).
DIST = REPO_ROOT / "frontend" / "dist"
if not (DIST / "index.html").exists():
    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:  # no frontend built yet: show the API docs instead of a 404
        return RedirectResponse("/docs")
else:
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file = (DIST / path).resolve()
        if path and file.is_file() and DIST.resolve() in file.parents:
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
