"""Gestión de usuarios desde la terminal (hasta que exista la pantalla de administración).

Ejemplos:
  python -m app.usuarios asignar --nombre "MAILY ROMERO CONTRERAS" --email maily@entidad.gov.co \\
         --rol supervisor_apoyo --equipo "CAPACIDADES"
  python -m app.usuarios asignar --nombre "Nombre Apellido" --email admin@entidad.gov.co --rol administrador
  python -m app.usuarios listar
"""
import argparse
import sys

from sqlalchemy import select

from . import config
from .db import SessionLocal
from .models import Equipo, Persona
from importer.limpieza import clave


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("asignar", help="Crea la persona si no existe y le asigna correo, rol y equipo")
    a.add_argument("--nombre", required=True)
    a.add_argument("--email", required=True)
    a.add_argument("--rol", required=True, choices=config.ROLES)
    a.add_argument("--equipo")
    a.add_argument("--inactivo", action="store_true")
    sub.add_parser("listar")
    args = ap.parse_args()

    with SessionLocal() as s:
        if args.cmd == "listar":
            for p in s.scalars(select(Persona).where(Persona.email.isnot(None)).order_by(Persona.nombre)):
                eq = s.get(Equipo, p.equipo_id).nombre if p.equipo_id else "-"
                print(f"{p.nombre:40} {p.email:35} {p.rol or '-':18} {eq} {'' if p.activo else '(inactivo)'}")
            return
        p = s.scalar(select(Persona).where(Persona.clave == clave(args.nombre)))
        if not p:
            p = Persona(nombre=args.nombre.strip(), clave=clave(args.nombre))
            s.add(p)
            print("Persona nueva (no aparecía en el Excel)")
        if args.equipo:
            eq = s.scalar(select(Equipo).where(Equipo.nombre == args.equipo))
            if not eq:
                sys.exit("Equipo no encontrado. Opciones:\n" + "\n".join(e.nombre for e in s.scalars(select(Equipo))))
            p.equipo_id = eq.id
        p.email, p.rol, p.activo = args.email.lower(), args.rol, not args.inactivo
        s.commit()
        print(f"Listo: {p.nombre} <{p.email}> rol={p.rol}")


if __name__ == "__main__":
    main()
