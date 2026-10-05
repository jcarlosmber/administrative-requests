#!/bin/bash
set -e
echo "=== 1. Actualizando repositorio en /opt/administrative-requests ==="
cd /opt/administrative-requests
git fetch origin main
git reset --hard origin/main

echo "=== 2. Compilando frontend web con Expo ==="
cd /opt/administrative-requests/frontend
npx expo export -p web

echo "=== 3. Desplegando en /var/www/administrative-requests ==="
echo '.Secjur-2026**' | sudo -S cp -r dist/* /var/www/administrative-requests/
echo '.Secjur-2026**' | sudo -S chown -R nginx:nginx /var/www/administrative-requests/

echo "=== 4. Programando reinicio del backend en PM2 ==="
cd /opt/administrative-requests/backend
# Se programa el reinicio con retardo para permitir que el script retorne la respuesta completa a la terminal web
(sleep 2 && pm2 restart all) > /dev/null 2>&1 &

echo "=== Despliegue completado con éxito ==="

