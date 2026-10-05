"""Funciones para limpiar los valores del Excel.

Regla general: si un valor no se puede interpretar con seguridad, el campo queda vacío
y se registra el problema en el reporte (el valor original sigue en `datos_originales`).
"""
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

VACIOS = {"", "NONE", "N/A", "NA", "N.A", "N.A.", "N/A.", "NO APLICA", "-", "<", "NAN"}
EXCEL_EPOCA = date(1899, 12, 30)


@dataclass
class Bitacora:
    """Acumula los problemas encontrados durante la importación."""
    problemas: list = field(default_factory=list)

    def anotar(self, hoja, fila, numero, columna, valor, problema):
        self.problemas.append({
            "hoja": hoja, "fila_excel": fila, "numero": numero,
            "columna": columna, "valor_original": str(valor)[:300], "problema": problema,
        })


def es_vacio(v) -> bool:
    if v is None:
        return True
    if not isinstance(v, str):
        return False
    compacto = re.sub(r"[\s.]", "", v.upper())
    return v.strip().upper() in VACIOS or compacto in {"", "NA", "N/A", "NOAPLICA"}


def texto(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if isinstance(v, datetime):
        v = v.date().isoformat()
    s = str(v).strip()
    return s or None


def codigo(v):
    """Identificadores numéricos (SIGP, MGI, BPIN): sin '.0' ni notación científica."""
    if v is None:
        return None
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else str(v)
    return texto(v)


def sin_tildes(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def clave(s: str) -> str:
    return re.sub(r"\s+", " ", sin_tildes(s).upper()).strip()


def fecha(v, log=None, ctx=None):
    """Devuelve date o None. ctx = (hoja, fila, numero, columna) para anotar problemas."""
    if es_vacio(v):
        return None
    d = None
    if isinstance(v, datetime):
        d = v.date()
    elif isinstance(v, date):
        d = v
    elif isinstance(v, (int, float)) and 20000 <= v <= 80000:
        d = EXCEL_EPOCA + timedelta(days=int(v))
    elif isinstance(v, str):
        s = v.strip()
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
            try:
                d = datetime.strptime(s, fmt).date()
                break
            except ValueError:
                pass
    if d is None:
        if log and ctx:
            log.anotar(*ctx, v, "fecha no reconocida")
        return None
    if not (1990 <= d.year <= 2060):
        if log and ctx:
            log.anotar(*ctx, v, f"fecha fuera de rango ({d.isoformat()})")
        return None
    return d


def monto(v, log=None, ctx=None):
    """Interpreta montos en formato colombiano ($ 1.234.567,89) o numérico."""
    if es_vacio(v):
        return None
    if isinstance(v, (int, float)):
        d = Decimal(str(v))
        if not d.is_finite() or abs(d) >= Decimal("1e18"):
            if log and ctx:
                log.anotar(*ctx, v, "monto no reconocido")
            return None
        return d.quantize(Decimal("0.01"))
    if isinstance(v, datetime):
        if log and ctx:
            log.anotar(*ctx, v, "fecha en columna de monto")
        return None
    s = str(v).strip()
    if re.fullmatch(r"\$?\s*-\s*", s):  # "$ -" = cero en formato contable
        return Decimal(0)
    if re.search(r"[A-Za-z]", s):
        if log and ctx:
            log.anotar(*ctx, v, "monto con texto (p. ej. moneda distinta o nota)")
        return None
    s = re.sub(r"[\s$]", "", s).rstrip(".,")
    if not re.fullmatch(r"-?[\d.,]+", s):
        if log and ctx:
            log.anotar(*ctx, v, "monto no reconocido")
        return None
    if "," in s and "." in s:
        dec = "," if s.rfind(",") > s.rfind(".") else "."
        mil = "." if dec == "," else ","
        s = s.replace(mil, "").replace(dec, ".")
    elif "," in s:
        partes = s.split(",")
        s = s.replace(",", ".") if len(partes) == 2 and len(partes[1]) <= 2 else s.replace(",", "")
    elif s.count(".") > 1 or re.fullmatch(r"-?\d{1,3}\.\d{3}", s):
        s = s.replace(".", "")
    try:
        return Decimal(s).quantize(Decimal("0.01"))
    except InvalidOperation:
        if log and ctx:
            log.anotar(*ctx, v, "monto no reconocido")
        return None


def porcentaje(v, log=None, ctx=None):
    if es_vacio(v):
        return None
    if isinstance(v, bool):
        if log and ctx:
            log.anotar(*ctx, v, "porcentaje no reconocido")
        return None
    s = str(v) if isinstance(v, (int, float)) else str(v).strip().replace("%", "").replace(",", ".")
    try:
        d = Decimal(s)
        if not d.is_finite() or abs(d) > 1000:
            raise InvalidOperation
        return d.quantize(Decimal("0.0001"))
    except InvalidOperation:
        if log and ctx:
            log.anotar(*ctx, v, "porcentaje no reconocido")
        return None


# Valores de las columnas de personas que no corresponden a una persona
NO_PERSONA = re.compile(r"^(N/?A\b|NA\b|POR DEFINIR|PENDIENTE|SIN ASIGNAR|NO APLICA)", re.I)


def es_persona(v) -> bool:
    return not es_vacio(v) and not NO_PERSONA.match(str(v).strip())


NUMERO_VALIDO = re.compile(r"^\d{1,5}-\d{4}$")
