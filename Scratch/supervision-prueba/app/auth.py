"""Inicio de sesión con Google y sesión por cookie firmada."""
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .db import SessionLocal
from .models import Asignacion, Persona

router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE = "sesion"


def get_db():
    with SessionLocal() as s:
        yield s


@dataclass
class Usuario:
    id: int
    nombre: str
    email: Optional[str]
    rol: str
    equipo_id: Optional[int]

    @property
    def es_admin(self) -> bool:
        return self.rol == "administrador"


def _emitir(resp: Response, u: Usuario):
    payload = {
        "sub": str(u.id), "nombre": u.nombre, "email": u.email, "rol": u.rol, "equipo_id": u.equipo_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=config.HORAS_SESION),
    }
    token = jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")
    resp.set_cookie(COOKIE, token, httponly=True, samesite="lax", secure=config.COOKIE_SEGURA,
                    max_age=config.HORAS_SESION * 3600)


def usuario_actual(request: Request) -> Usuario:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Sesión no iniciada")
    try:
        p = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Sesión vencida")
    return Usuario(id=int(p["sub"]), nombre=p["nombre"], email=p.get("email"), rol=p["rol"],
                   equipo_id=p.get("equipo_id"))


@router.get("/config")
def auth_config():
    return {"google_client_id": config.GOOGLE_CLIENT_ID, "dev": config.AUTH_DEV}


class GoogleLogin(BaseModel):
    credential: str


@router.post("/google")
def login_google(datos: GoogleLogin, resp: Response, db: Session = Depends(get_db)):
    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token

    if not config.GOOGLE_CLIENT_ID:
        raise HTTPException(500, "GOOGLE_CLIENT_ID no configurado")
    try:
        info = id_token.verify_oauth2_token(datos.credential, g_requests.Request(), config.GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(401, "Token de Google inválido")
    email = (info.get("email") or "").lower()
    if not info.get("email_verified"):
        raise HTTPException(401, "Correo no verificado")
    if config.DOMINIO_PERMITIDO and info.get("hd") != config.DOMINIO_PERMITIDO:
        raise HTTPException(403, f"Solo se permiten cuentas @{config.DOMINIO_PERMITIDO}")
    p = db.scalar(select(Persona).where(Persona.email == email))
    if not p or not p.activo or not p.rol:
        raise HTTPException(403, "Tu cuenta no está registrada en la app. Pide acceso al administrador.")
    u = Usuario(id=p.id, nombre=p.nombre, email=p.email, rol=p.rol, equipo_id=p.equipo_id)
    _emitir(resp, u)
    return u.__dict__


@router.post("/salir")
def salir(resp: Response):
    resp.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/yo")
def yo(u: Usuario = Depends(usuario_actual)):
    return u.__dict__


# ------------------------------------------------------------- solo pruebas locales
class DevLogin(BaseModel):
    persona_id: int
    rol: str = "supervisor_apoyo"


@router.get("/dev/personas")
def dev_personas(db: Session = Depends(get_db)):
    if not config.AUTH_DEV:
        raise HTTPException(404)
    return [{"id": p.id, "nombre": p.nombre} for p in db.scalars(select(Persona).order_by(Persona.nombre))]


@router.post("/dev")
def login_dev(datos: DevLogin, resp: Response, db: Session = Depends(get_db)):
    if not config.AUTH_DEV:
        raise HTTPException(404)
    if datos.rol not in config.ROLES:
        raise HTTPException(400, "Rol no válido")
    p = db.get(Persona, datos.persona_id)
    if not p:
        raise HTTPException(404, "Persona no encontrada")
    equipo_id = p.equipo_id
    if equipo_id is None:  # en pruebas, se toma el equipo más frecuente de sus asignaciones
        equipos = Counter()
        for a in db.scalars(select(Asignacion).where(Asignacion.persona_id == p.id)):
            reg = a.contrato or a.convenio
            if reg and reg.equipo_id:
                equipos[reg.equipo_id] += 1
        equipo_id = equipos.most_common(1)[0][0] if equipos else None
    u = Usuario(id=p.id, nombre=p.nombre, email=p.email, rol=datos.rol, equipo_id=equipo_id)
    _emitir(resp, u)
    return u.__dict__
