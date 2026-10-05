"""Endpoints de consulta (fase 2: solo lectura)."""
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from . import models as m
from .auth import Usuario, get_db, usuario_actual

router = APIRouter(prefix="/api", tags=["consulta"])


# ------------------------------------------------------------------ utilidades
def a_dict(obj, excluir=()):
    out = {}
    for col in obj.__table__.columns:
        if col.key in excluir:
            continue
        v = getattr(obj, col.key)
        out[col.key] = float(v) if isinstance(v, Decimal) else v
    return out


def visibles(modelo, u: Usuario):
    """Regla de permisos: administrador ve todo; el resto ve su equipo y lo que tenga asignado."""
    if u.es_admin:
        return True
    campo = m.Asignacion.contrato_id if modelo is m.Contrato else m.Asignacion.convenio_id
    asignados = select(campo).where(m.Asignacion.persona_id == u.id, campo.isnot(None))
    condiciones = [modelo.id.in_(asignados)]
    if u.equipo_id is not None:
        condiciones.append(modelo.equipo_id == u.equipo_id)
    return or_(*condiciones)


def personas_por_registro(db, campo, ids):
    """{registro_id: {rol: [nombres]}} para mostrar supervisor y apoyos en listas."""
    res = {}
    if not ids:
        return res
    q = (select(campo, m.Asignacion.rol, m.Persona.nombre)
         .join(m.Persona, m.Persona.id == m.Asignacion.persona_id).where(campo.in_(ids)))
    for rid, rol, nombre in db.execute(q):
        res.setdefault(rid, {}).setdefault(rol, []).append(nombre)
    return res


def resumen_informes(db, campo, ids):
    """Informes vencidos (programados antes de hoy y sin entrega) y próximo informe por registro."""
    hoy = date.today()
    venc, prox = {}, {}
    if not ids:
        return venc, prox
    pendientes = and_(campo.in_(ids), m.Informe.fecha_efectiva.is_(None), m.Informe.fecha_programada.isnot(None))
    for rid, n in db.execute(select(campo, func.count()).where(pendientes, m.Informe.fecha_programada < hoy)
                             .group_by(campo)):
        venc[rid] = n
    for rid, f in db.execute(select(campo, func.min(m.Informe.fecha_programada))
                             .where(pendientes, m.Informe.fecha_programada >= hoy).group_by(campo)):
        prox[rid] = f
    return venc, prox


# Estados en los que ya no se esperan informes: no se marcan vencidos ni próximos
ESTADOS_CERRADOS = ("LIQUIDADO", "DESISTI", "RENUNCI", "PRECONTRACTUAL", "PROCESO JUDICIAL", "COBRO")


def cerrado(r) -> bool:
    return bool(r.estado) and any(k in r.estado.nombre.upper() for k in ESTADOS_CERRADOS)


def fila_lista(r, personas, venc, prox, es_contrato=True):
    p = personas.get(r.id, {})
    if cerrado(r):
        venc, prox = {}, {}
    d = {
        "id": r.id, "numero": r.numero, "objeto": r.objeto,
        "equipo": r.equipo.nombre if r.equipo else None,
        "estado": r.estado.nombre if r.estado else None,
        "fecha_inicio": r.fecha_inicio, "fecha_finalizacion": r.fecha_finalizacion,
        "supervisor": ", ".join(p.get("supervisor", [])) or None,
        "apoyo_tecnico": ", ".join(p.get("apoyo_tecnico", [])) or None,
        "apoyo_financiero": ", ".join(p.get("apoyo_financiero", [])) or None,
        "informes_vencidos": venc.get(r.id, 0), "proximo_informe": prox.get(r.id),
    }
    if es_contrato:
        d.update(fuente=r.fuente_financiacion, entidad=r.entidad_ejecutora,
                 avance_tecnico=float(r.avance_tecnico) if r.avance_tecnico is not None else None,
                 avance_financiero=float(r.avance_financiero) if r.avance_financiero is not None else None)
    else:
        d.update(tipo=r.tipo_convenio, valor=float(r.valor) if r.valor is not None else None)
    return d


ORDEN_CT = {"numero": m.Contrato.numero, "fecha_finalizacion": m.Contrato.fecha_finalizacion,
            "fecha_inicio": m.Contrato.fecha_inicio, "entidad": m.Contrato.entidad_ejecutora}
ORDEN_CV = {"numero": m.Convenio.numero, "fecha_finalizacion": m.Convenio.fecha_finalizacion,
            "fecha_inicio": m.Convenio.fecha_inicio}


def ordenar(q, orden, mapa):
    desc = orden.startswith("-")
    col = mapa.get(orden.lstrip("-"), next(iter(mapa.values())))
    return q.order_by(col.desc().nulls_last() if desc else col.asc().nulls_last())


def filtros_comunes(q, modelo, campo_asig, equipo_id, estado_id, persona_id, anio, fin_desde, fin_hasta):
    if equipo_id:
        q = q.where(modelo.equipo_id == equipo_id)
    if estado_id:
        q = q.where(modelo.estado_id.in_(estado_id))
    if persona_id:
        q = q.where(modelo.id.in_(select(campo_asig).where(m.Asignacion.persona_id == persona_id)))
    if anio:
        q = q.where(modelo.numero.like(f"%-{anio}"))
    if fin_desde:
        q = q.where(modelo.fecha_finalizacion >= fin_desde)
    if fin_hasta:
        q = q.where(modelo.fecha_finalizacion <= fin_hasta)
    return q


# ------------------------------------------------------------------ catálogos
@router.get("/catalogos")
def catalogos(db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual)):
    equipos = db.scalars(select(m.Equipo).order_by(m.Equipo.nombre)).all()
    if not u.es_admin:
        equipos = [e for e in equipos if e.id == u.equipo_id]
    return {
        "equipos": [{"id": e.id, "nombre": e.nombre} for e in equipos],
        "estados": [{"id": e.id, "nombre": e.nombre} for e in db.scalars(select(m.Estado).order_by(m.Estado.nombre))],
        "fuentes": [f for f in db.scalars(select(m.Contrato.fuente_financiacion).distinct()
                                          .order_by(m.Contrato.fuente_financiacion)) if f],
    }


@router.get("/personas")
def personas(q: str = "", db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual)):
    consulta = select(m.Persona).order_by(m.Persona.nombre)
    if q:
        consulta = consulta.where(m.Persona.nombre.ilike(f"%{q}%"))
    return [{"id": p.id, "nombre": p.nombre} for p in db.scalars(consulta.limit(50))]


# ------------------------------------------------------------------ mis registros
@router.get("/mis-registros")
def mis_registros(db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual)):
    hoy = date.today()
    salida = {}
    for clave, modelo, campo in (("contratos", m.Contrato, m.Asignacion.contrato_id),
                                 ("convenios", m.Convenio, m.Asignacion.convenio_id)):
        roles = {}
        for rid, rol in db.execute(select(campo, m.Asignacion.rol)
                                   .where(m.Asignacion.persona_id == u.id, campo.isnot(None))):
            roles.setdefault(rid, []).append(rol)
        regs = db.scalars(select(modelo).where(modelo.id.in_(roles.keys()))
                          .options(selectinload(modelo.equipo), selectinload(modelo.estado))).all()
        ids = [r.id for r in regs]
        pers = personas_por_registro(db, campo, ids)
        campo_inf = m.Informe.contrato_id if modelo is m.Contrato else m.Informe.convenio_id
        venc, prox = resumen_informes(db, campo_inf, ids)
        filas = []
        for r in regs:
            d = fila_lista(r, pers, venc, prox, es_contrato=modelo is m.Contrato)
            d["mis_roles"] = roles[r.id]
            d["dias_para_fin"] = (r.fecha_finalizacion - hoy).days if r.fecha_finalizacion else None
            filas.append(d)
        filas.sort(key=lambda d: (d["fecha_finalizacion"] is None, d["fecha_finalizacion"] or hoy))
        salida[clave] = filas
    return salida


# ------------------------------------------------------------------ contratos
@router.get("/contratos")
def listar_contratos(
    q: str = "", equipo_id: Optional[int] = None, estado_id: list[int] = Query(default=[]),
    fuente: Optional[str] = None, persona_id: Optional[int] = None, anio: Optional[str] = None,
    fin_desde: Optional[date] = None, fin_hasta: Optional[date] = None,
    orden: str = "-fecha_finalizacion", pagina: int = 1, tamano: int = Query(50, le=200),
    db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual),
):
    c = m.Contrato
    consulta = select(c).where(visibles(c, u))
    if q:
        t = f"%{q.strip()}%"
        consulta = consulta.where(or_(c.numero.ilike(t), c.entidad_ejecutora.ilike(t), c.codigo_sigp.ilike(t),
                                      c.expediente_virtual.ilike(t), c.id_mgi.ilike(t),
                                      c.investigador_principal.ilike(t), c.objeto.ilike(t)))
    consulta = filtros_comunes(consulta, c, m.Asignacion.contrato_id, equipo_id, estado_id, persona_id,
                               anio, fin_desde, fin_hasta)
    if fuente:
        consulta = consulta.where(c.fuente_financiacion == fuente)
    total = db.scalar(select(func.count()).select_from(consulta.subquery()))
    consulta = ordenar(consulta, orden, ORDEN_CT).offset((pagina - 1) * tamano).limit(tamano)
    regs = db.scalars(consulta.options(selectinload(c.equipo), selectinload(c.estado))).all()
    ids = [r.id for r in regs]
    pers = personas_por_registro(db, m.Asignacion.contrato_id, ids)
    venc, prox = resumen_informes(db, m.Informe.contrato_id, ids)
    return {"total": total, "pagina": pagina, "tamano": tamano,
            "items": [fila_lista(r, pers, venc, prox) for r in regs]}


def detalle_comun(r, campo_otro_registro=None):
    d = a_dict(r, excluir=("datos_originales",))
    d["equipo"] = r.equipo.nombre if r.equipo else None
    d["estado"] = r.estado.nombre if r.estado else None
    d["asignaciones"] = [{"rol": a.rol, "persona_id": a.persona_id, "nombre": a.persona.nombre,
                          "email": a.persona.email} for a in r.asignaciones]
    orden_tipo = {"avance": 0, "final": 1, "final_ajustado": 2}
    d["informes"] = [a_dict(i) for i in sorted(r.informes, key=lambda i: (orden_tipo[i.tipo], i.numero))]
    d["modificaciones"] = [a_dict(x) for x in r.modificaciones]
    d["alertas"] = [a_dict(x) for x in r.alertas]
    d["datos_originales"] = r.datos_originales
    return d


@router.get("/contratos/{cid}")
def ver_contrato(cid: int, db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual)):
    c = m.Contrato
    r = db.scalar(select(c).where(c.id == cid, visibles(c, u)).options(
        selectinload(c.asignaciones).selectinload(m.Asignacion.persona), selectinload(c.informes),
        selectinload(c.desembolsos), selectinload(c.fuentes_cdr), selectinload(c.modificaciones),
        selectinload(c.alertas), selectinload(c.equipo), selectinload(c.estado)))
    if not r:
        raise HTTPException(404, "Contrato no encontrado o sin permiso")
    d = detalle_comun(r)
    d["desembolsos"] = [a_dict(x) for x in sorted(r.desembolsos, key=lambda x: x.numero)]
    d["fuentes_cdr"] = [a_dict(x) for x in sorted(r.fuentes_cdr, key=lambda x: x.orden)]
    # Otros registros con el mismo número (otra fuente de financiación)
    d["mismo_numero"] = []
    if r.numero and re.fullmatch(r"\d{1,5}-\d{4}", r.numero):
        d["mismo_numero"] = [{"id": o.id, "fuente": o.fuente_financiacion}
                             for o in db.scalars(select(c).where(c.numero == r.numero, c.id != r.id, visibles(c, u)))]
    # Convenios de la hoja Convenios que aparecen en "convenio del que deriva" o en los CDR
    textos = " ".join(filter(None, [r.convenio_del_que_deriva] + [f.convenio for f in r.fuentes_cdr]))
    d["convenios_relacionados"] = [
        {"id": cv.id, "numero": cv.numero} for cv in
        db.scalars(select(m.Convenio).where(m.Convenio.numero.isnot(None), visibles(m.Convenio, u)))
        if cv.numero and re.search(rf"(?<!\d){re.escape(cv.numero)}(?!\d)", textos)]
    return d


# ------------------------------------------------------------------ convenios
@router.get("/convenios")
def listar_convenios(
    q: str = "", equipo_id: Optional[int] = None, estado_id: list[int] = Query(default=[]),
    persona_id: Optional[int] = None, anio: Optional[str] = None,
    fin_desde: Optional[date] = None, fin_hasta: Optional[date] = None,
    orden: str = "-fecha_finalizacion", pagina: int = 1, tamano: int = Query(50, le=200),
    db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual),
):
    c = m.Convenio
    consulta = select(c).where(visibles(c, u))
    if q:
        t = f"%{q.strip()}%"
        consulta = consulta.where(or_(c.numero.ilike(t), c.objeto.ilike(t), c.expediente_virtual.ilike(t),
                                      c.id.in_(select(m.ConvenioAliado.convenio_id)
                                               .where(m.ConvenioAliado.entidad.ilike(t)))))
    consulta = filtros_comunes(consulta, c, m.Asignacion.convenio_id, equipo_id, estado_id, persona_id,
                               anio, fin_desde, fin_hasta)
    total = db.scalar(select(func.count()).select_from(consulta.subquery()))
    consulta = ordenar(consulta, orden, ORDEN_CV).offset((pagina - 1) * tamano).limit(tamano)
    regs = db.scalars(consulta.options(selectinload(c.equipo), selectinload(c.estado))).all()
    ids = [r.id for r in regs]
    pers = personas_por_registro(db, m.Asignacion.convenio_id, ids)
    venc, prox = resumen_informes(db, m.Informe.convenio_id, ids)
    return {"total": total, "pagina": pagina, "tamano": tamano,
            "items": [fila_lista(r, pers, venc, prox, es_contrato=False) for r in regs]}


@router.get("/convenios/{cid}")
def ver_convenio(cid: int, db: Session = Depends(get_db), u: Usuario = Depends(usuario_actual)):
    c = m.Convenio
    r = db.scalar(select(c).where(c.id == cid, visibles(c, u)).options(
        selectinload(c.asignaciones).selectinload(m.Asignacion.persona), selectinload(c.informes),
        selectinload(c.aliados), selectinload(c.modificaciones), selectinload(c.alertas),
        selectinload(c.equipo), selectinload(c.estado)))
    if not r:
        raise HTTPException(404, "Convenio no encontrado o sin permiso")
    d = detalle_comun(r)
    d["aliados"] = [a_dict(x) for x in sorted(r.aliados, key=lambda x: x.orden)]
    # Contratos derivados: los que mencionan este número en "convenio del que deriva" o en sus CDR
    if r.numero:
        t = rf"(^|[^0-9]){re.escape(r.numero)}([^0-9]|$)"
        derivados = db.scalars(
            select(m.Contrato).where(visibles(m.Contrato, u), or_(
                m.Contrato.convenio_del_que_deriva.regexp_match(t),
                m.Contrato.id.in_(select(m.FuenteCDR.contrato_id).where(m.FuenteCDR.convenio.regexp_match(t)))))
            .options(selectinload(m.Contrato.estado)).order_by(m.Contrato.numero)).all()
        d["contratos_derivados"] = [{"id": x.id, "numero": x.numero, "fuente": x.fuente_financiacion,
                                     "entidad": x.entidad_ejecutora,
                                     "estado": x.estado.nombre if x.estado else None} for x in derivados]
    return d
