"""Aplicación FastAPI: API en /api y frontend React compilado en /."""
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .api import router as api_router
from .auth import router as auth_router

app = FastAPI(title="Supervisión de contratos y convenios", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(auth_router)
app.include_router(api_router)

dist = os.path.abspath(config.FRONTEND_DIST)
if os.path.isdir(dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist, "assets")), name="assets")

    @app.get("/{ruta:path}", include_in_schema=False)
    def spa(ruta: str):
        archivo = os.path.join(dist, ruta)
        if ruta and os.path.isfile(archivo):
            return FileResponse(archivo)
        return FileResponse(os.path.join(dist, "index.html"))
