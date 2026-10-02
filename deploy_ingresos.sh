#!/bin/bash
set -e
echo "=== 1. Actualizando repositorio en /opt/administrative-requests ==="
cd /opt/administrative-requests
git fetch origin main
git reset --hard origin/main

echo "=== 2. Reiniciando backend en PM2 ==="
cd /opt/administrative-requests/backend
pm2 restart backend-solicitudes || pm2 restart all || true
if [ -n "$SUDO_USER" ]; then
  su - $SUDO_USER -c "pm2 restart backend-solicitudes || pm2 restart all" || true
fi
pm2 save || true

echo "=== 3. Compilando frontend web con Expo ==="
cd /opt/administrative-requests/frontend
npx expo export -p web

echo "=== 4. Desplegando en /var/www/administrative-requests ==="
sudo cp -r dist/* /var/www/administrative-requests/

echo "=== 5. Estado de servicios ==="
pm2 list || pm2 status
echo "=== Despliegue completado con éxito ==="
