"""Configuración por variables de entorno (ver .env.ejemplo)."""
import os


def _bool(nombre: str) -> bool:
    return os.getenv(nombre, "").lower() in ("1", "true", "si", "sí", "yes")


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
# Dominio de las cuentas institucionales que pueden entrar (p. ej. entidad.gov.co)
DOMINIO_PERMITIDO = os.getenv("DOMINIO_PERMITIDO", "")
SECRET_KEY = os.getenv("SECRET_KEY", "cambiar-en-produccion")
HORAS_SESION = int(os.getenv("HORAS_SESION", "10"))
# Solo para pruebas locales: permite entrar eligiendo una persona, sin Google
AUTH_DEV = _bool("AUTH_DEV")
COOKIE_SEGURA = _bool("COOKIE_SEGURA")  # True cuando el sitio esté en HTTPS
FRONTEND_DIST = os.getenv("FRONTEND_DIST", os.path.join(os.path.dirname(__file__), "..", "static"))

ROLES = ("administrador", "lider", "supervisor_apoyo", "consulta")
