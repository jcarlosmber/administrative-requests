"""Modelo de datos de la app de supervisión.

Las columnas que en el Excel se repiten por número (informes 1-10, desembolsos 1-6,
CDR 1-4, aliados 1-3) se guardan como filas en tablas hijas.
Cada contrato y convenio conserva la fila original del Excel en `datos_originales`
para que ningún dato se pierda en la migración.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    JSON, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

Monto = Numeric(20, 2)
Txt = Optional[str]
Fecha = Optional[date]
Dinero = Optional[Decimal]


def fk(tabla: str, nullable: bool = True):
    return mapped_column(ForeignKey(f"{tabla}.id", ondelete="CASCADE"), nullable=nullable, index=True)


# ---------------------------------------------------------------- catálogos
class Equipo(Base):
    __tablename__ = "equipos"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), unique=True)


class Estado(Base):
    __tablename__ = "estados"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, unique=True)


class Persona(Base):
    """Supervisores y apoyos. `clave` = nombre en mayúsculas, sin tildes ni dobles espacios."""
    __tablename__ = "personas"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    clave: Mapped[str] = mapped_column(String(200), unique=True)
    email: Mapped[Txt] = mapped_column(String(200), unique=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"))
    rol: Mapped[Txt] = mapped_column(Text)  # administrador | lider | supervisor_apoyo | consulta
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


# ---------------------------------------------------------------- contratos
class Contrato(Base):
    __tablename__ = "contratos"
    __table_args__ = (Index("ix_contrato_numero_fuente", "numero", "fuente_financiacion"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    fila_excel: Mapped[int] = mapped_column(Integer)
    tipo_registro: Mapped[Txt] = mapped_column(Text)  # CONTRATO / CONVENIO / PROYECTO
    numero: Mapped[Txt] = mapped_column(Text, index=True)
    fuente_financiacion: Mapped[Txt] = mapped_column(Text)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), index=True)
    estado_id: Mapped[Optional[int]] = mapped_column(ForeignKey("estados.id"), index=True)

    id_mgi: Mapped[Txt] = mapped_column(Text)
    codigo_sigp: Mapped[Txt] = mapped_column(Text)
    objeto: Mapped[Txt] = mapped_column(Text)
    entidad_ejecutora: Mapped[Txt] = mapped_column(Text)
    tipo_derivado: Mapped[Txt] = mapped_column(Text)
    fecha_inicio: Mapped[Fecha] = mapped_column(Date)
    fecha_finalizacion: Mapped[Fecha] = mapped_column(Date, index=True)
    tiempo_ejecucion: Mapped[Txt] = mapped_column(Text)
    avance_tecnico: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    avance_financiero: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))

    mecanismo: Mapped[Txt] = mapped_column(Text)
    numero_convocatoria: Mapped[Txt] = mapped_column(Text)
    titulo_convocatoria: Mapped[Txt] = mapped_column(Text)
    complemento_mecanismo: Mapped[Txt] = mapped_column(Text)
    expediente_virtual: Mapped[Txt] = mapped_column(Text)
    departamento: Mapped[Txt] = mapped_column(Text)
    municipio: Mapped[Txt] = mapped_column(String(200))
    entidades_coejecutoras: Mapped[Txt] = mapped_column(Text)
    investigador_principal: Mapped[Txt] = mapped_column(Text)
    email_investigador: Mapped[Txt] = mapped_column(Text)
    beneficiarios: Mapped[Txt] = mapped_column(Text)
    participacion_minorias: Mapped[Txt] = mapped_column(Text)
    descripcion_minorias: Mapped[Txt] = mapped_column(Text)
    fecha_legalizacion: Mapped[Fecha] = mapped_column(Date)
    fecha_vigencia_poliza: Mapped[Fecha] = mapped_column(Date)
    convenio_del_que_deriva: Mapped[Txt] = mapped_column(Text)
    fecha_vencimiento_convenio: Mapped[Fecha] = mapped_column(Date)

    monto_solicitado: Mapped[Dinero] = mapped_column(Monto)
    monto_contrapartida: Mapped[Dinero] = mapped_column(Monto)
    monto_seguimiento: Mapped[Dinero] = mapped_column(Monto)
    fecha_reintegro_seguimiento: Mapped[Fecha] = mapped_column(Date)
    costo: Mapped[Dinero] = mapped_column(Monto)
    monto_a_desembolsar: Mapped[Dinero] = mapped_column(Monto)
    desembolsos_programados: Mapped[Txt] = mapped_column(Text)
    desembolsos_realizados: Mapped[Txt] = mapped_column(Text)
    monto_desembolsado_total: Mapped[Dinero] = mapped_column(Monto)
    monto_por_desembolsar: Mapped[Dinero] = mapped_column(Monto)

    monto_reintegrar: Mapped[Dinero] = mapped_column(Monto)
    fecha_efectiva_reintegro: Mapped[Fecha] = mapped_column(Date)
    fecha_memo_liquidacion: Mapped[Fecha] = mapped_column(Date)
    radicado_memo_liquidacion: Mapped[Txt] = mapped_column(Text)
    enlace_memo_liquidacion: Mapped[Txt] = mapped_column(Text)
    fecha_acta_liquidacion: Mapped[Fecha] = mapped_column(Date)
    fecha_notificacion_liquidacion: Mapped[Fecha] = mapped_column(Date)
    observaciones: Mapped[Txt] = mapped_column(Text)
    productos_comprometidos: Mapped[Txt] = mapped_column(Text)
    productos_verificados: Mapped[Txt] = mapped_column(Text)

    datos_originales: Mapped[dict] = mapped_column(JSON)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    equipo = relationship("Equipo")
    estado = relationship("Estado")
    asignaciones = relationship("Asignacion", back_populates="contrato", cascade="all, delete-orphan")
    informes = relationship("Informe", back_populates="contrato", cascade="all, delete-orphan")
    desembolsos = relationship("Desembolso", back_populates="contrato", cascade="all, delete-orphan")
    fuentes_cdr = relationship("FuenteCDR", back_populates="contrato", cascade="all, delete-orphan")
    modificaciones = relationship("Modificacion", back_populates="contrato", cascade="all, delete-orphan")
    alertas = relationship("Alerta", back_populates="contrato", cascade="all, delete-orphan")


# ---------------------------------------------------------------- convenios
class Convenio(Base):
    __tablename__ = "convenios"
    id: Mapped[int] = mapped_column(primary_key=True)
    fila_excel: Mapped[int] = mapped_column(Integer)
    id_cv: Mapped[Txt] = mapped_column(Text)
    numero: Mapped[Txt] = mapped_column(Text, unique=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), index=True)
    estado_id: Mapped[Optional[int]] = mapped_column(ForeignKey("estados.id"), index=True)
    tipo_convenio: Mapped[Txt] = mapped_column(Text)
    objeto: Mapped[Txt] = mapped_column(Text)
    fecha_inicio: Mapped[Fecha] = mapped_column(Date)
    fecha_finalizacion: Mapped[Fecha] = mapped_column(Date, index=True)
    expediente_virtual: Mapped[Txt] = mapped_column(Text)
    bpin_1: Mapped[Txt] = mapped_column(Text)
    bpin_2: Mapped[Txt] = mapped_column(Text)
    valor: Mapped[Dinero] = mapped_column(Monto)
    monto_pagado: Mapped[Dinero] = mapped_column(Monto)
    monto_pendiente: Mapped[Dinero] = mapped_column(Monto)
    rendimientos: Mapped[Dinero] = mapped_column(Monto)
    periodicidad_informes_meses: Mapped[Txt] = mapped_column(Text)

    fecha_memo_liquidacion: Mapped[Fecha] = mapped_column(Date)
    radicado_memo_liquidacion: Mapped[Txt] = mapped_column(Text)
    enlace_memo_liquidacion: Mapped[Txt] = mapped_column(Text)
    fecha_acta_liquidacion: Mapped[Fecha] = mapped_column(Date)

    # Comités: se guardan como texto porque la hoja mezcla fechas, nombres y notas
    comite_segun_convenio: Mapped[Txt] = mapped_column(Text)
    tipo_comite_1: Mapped[Txt] = mapped_column(Text)
    delegado_comite_1: Mapped[Txt] = mapped_column(Text)
    tipo_comite_2: Mapped[Txt] = mapped_column(Text)
    delegado_comite_2: Mapped[Txt] = mapped_column(Text)
    conformacion_comite: Mapped[Txt] = mapped_column(Text)
    contacto_notificaciones: Mapped[Txt] = mapped_column(Text)
    periodicidad_comite: Mapped[Txt] = mapped_column(Text)
    fecha_ultima_reunion: Mapped[Fecha] = mapped_column(Date)
    proxima_reunion: Mapped[Txt] = mapped_column(Text)
    avance_tecnico: Mapped[Txt] = mapped_column(Text)
    fecha_evaluacion_avance_tecnico: Mapped[Txt] = mapped_column(Text)
    avance_financiero: Mapped[Txt] = mapped_column(Text)
    fecha_evaluacion_avance_financiero: Mapped[Txt] = mapped_column(Text)
    supervisor_por_minuta: Mapped[Txt] = mapped_column(Text)

    datos_originales: Mapped[dict] = mapped_column(JSON)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    equipo = relationship("Equipo")
    estado = relationship("Estado")
    aliados = relationship("ConvenioAliado", back_populates="convenio", cascade="all, delete-orphan")
    asignaciones = relationship("Asignacion", back_populates="convenio", cascade="all, delete-orphan")
    informes = relationship("Informe", back_populates="convenio", cascade="all, delete-orphan")
    modificaciones = relationship("Modificacion", back_populates="convenio", cascade="all, delete-orphan")
    alertas = relationship("Alerta", back_populates="convenio", cascade="all, delete-orphan")


class ConvenioAliado(Base):
    __tablename__ = "convenio_aliados"
    id: Mapped[int] = mapped_column(primary_key=True)
    convenio_id: Mapped[int] = fk("convenios", nullable=False)
    orden: Mapped[int] = mapped_column(Integer)
    entidad: Mapped[Txt] = mapped_column(Text)
    aporte_efectivo: Mapped[Dinero] = mapped_column(Monto)
    aporte_especie: Mapped[Dinero] = mapped_column(Monto)
    convenio = relationship("Convenio", back_populates="aliados")


# ---------------------------------------------------------------- tablas hijas compartidas
def _uno_de(tabla: str):
    return CheckConstraint(
        "(contrato_id IS NOT NULL) <> (convenio_id IS NOT NULL)", name=f"ck_{tabla}_un_padre"
    )


class Asignacion(Base):
    __tablename__ = "asignaciones"
    __table_args__ = (_uno_de("asignaciones"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = fk("personas", nullable=False)
    contrato_id: Mapped[Optional[int]] = fk("contratos")
    convenio_id: Mapped[Optional[int]] = fk("convenios")
    rol: Mapped[str] = mapped_column(Text)  # supervisor | apoyo_tecnico | apoyo_financiero
    texto_original: Mapped[Txt] = mapped_column(Text)
    persona = relationship("Persona")
    contrato = relationship("Contrato", back_populates="asignaciones")
    convenio = relationship("Convenio", back_populates="asignaciones")


class Informe(Base):
    __tablename__ = "informes"
    __table_args__ = (_uno_de("informes"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[Optional[int]] = fk("contratos")
    convenio_id: Mapped[Optional[int]] = fk("convenios")
    tipo: Mapped[str] = mapped_column(Text)  # avance | final | final_ajustado
    numero: Mapped[int] = mapped_column(Integer)  # 1..10 para avance; 1..2 para ajustado; 1 para final
    fecha_programada: Mapped[Fecha] = mapped_column(Date, index=True)
    fecha_efectiva: Mapped[Fecha] = mapped_column(Date)
    fecha_generacion_tecnico: Mapped[Fecha] = mapped_column(Date)
    fecha_generacion_financiero: Mapped[Fecha] = mapped_column(Date)
    fecha_generacion_integral: Mapped[Fecha] = mapped_column(Date)
    fecha_supervision: Mapped[Fecha] = mapped_column(Date)  # en el final: fecha concepto evaluación
    radicado: Mapped[Txt] = mapped_column(Text)
    monto_aprobado: Mapped[Dinero] = mapped_column(Monto)
    enlace: Mapped[Txt] = mapped_column(Text)
    observacion: Mapped[Txt] = mapped_column(Text)
    contrato = relationship("Contrato", back_populates="informes")
    convenio = relationship("Convenio", back_populates="informes")


class Desembolso(Base):
    __tablename__ = "desembolsos"
    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = fk("contratos", nullable=False)
    numero: Mapped[int] = mapped_column(Integer)
    monto: Mapped[Dinero] = mapped_column(Monto)
    fecha_programada: Mapped[Fecha] = mapped_column(Date)
    fecha_efectiva: Mapped[Fecha] = mapped_column(Date)
    contrato = relationship("Contrato", back_populates="desembolsos")


class FuenteCDR(Base):
    __tablename__ = "fuentes_cdr"
    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = fk("contratos", nullable=False)
    orden: Mapped[int] = mapped_column(Integer)
    convenio: Mapped[Txt] = mapped_column(Text)
    cdr: Mapped[Txt] = mapped_column(Text)
    valor: Mapped[Dinero] = mapped_column(Monto)
    contrato = relationship("Contrato", back_populates="fuentes_cdr")


class Modificacion(Base):
    __tablename__ = "modificaciones"
    __table_args__ = (_uno_de("modificaciones"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[Optional[int]] = fk("contratos")
    convenio_id: Mapped[Optional[int]] = fk("convenios")
    fecha_solicitud_entidad: Mapped[Fecha] = mapped_column(Date)
    fecha_solicitud_area_tecnica: Mapped[Fecha] = mapped_column(Date)
    condicion_otrosi: Mapped[Txt] = mapped_column(Text)
    tiempo_adicion: Mapped[Txt] = mapped_column(Text)
    fecha_legalizacion: Mapped[Fecha] = mapped_column(Date)
    numero_modificaciones: Mapped[Txt] = mapped_column(Text)
    contrato = relationship("Contrato", back_populates="modificaciones")
    convenio = relationship("Convenio", back_populates="modificaciones")


class Alerta(Base):
    __tablename__ = "alertas"
    __table_args__ = (_uno_de("alertas"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[Optional[int]] = fk("contratos")
    convenio_id: Mapped[Optional[int]] = fk("convenios")
    tipo: Mapped[Txt] = mapped_column(Text)
    observacion: Mapped[Txt] = mapped_column(Text)
    abierta: Mapped[bool] = mapped_column(Boolean, default=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    contrato = relationship("Contrato", back_populates="alertas")
    convenio = relationship("Convenio", back_populates="alertas")


class Historial(Base):
    """Cada cambio hecho desde la app (se llena a partir de la fase 3)."""
    __tablename__ = "historial"
    id: Mapped[int] = mapped_column(primary_key=True)
    tabla: Mapped[str] = mapped_column(Text)
    registro_id: Mapped[int] = mapped_column(Integer, index=True)
    campo: Mapped[str] = mapped_column(Text)
    valor_anterior: Mapped[Txt] = mapped_column(Text)
    valor_nuevo: Mapped[Txt] = mapped_column(Text)
    persona_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personas.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
