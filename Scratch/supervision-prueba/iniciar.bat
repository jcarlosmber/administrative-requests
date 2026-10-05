@echo off
title Supervision de contratos - prueba local
cd /d "%~dp0"

rem --- Buscar Python (primero Anaconda) ---
set "PY="
if exist "%USERPROFILE%\anaconda3\python.exe" set "PY=%USERPROFILE%\anaconda3\python.exe"
if not defined PY if exist "%ProgramData%\anaconda3\python.exe" set "PY=%ProgramData%\anaconda3\python.exe"
if not defined PY if exist "%USERPROFILE%\miniconda3\python.exe" set "PY=%USERPROFILE%\miniconda3\python.exe"
if not defined PY if exist "%LOCALAPPDATA%\anaconda3\python.exe" set "PY=%LOCALAPPDATA%\anaconda3\python.exe"
if not defined PY (where py >nul 2>nul && set "PY=py")
if not defined PY (where python >nul 2>nul && set "PY=python")
if not defined PY (
  echo No se encontro Python. Instalalo desde https://www.python.org y vuelve a intentar.
  pause
  exit /b 1
)

rem --- Primera vez: crear entorno e instalar dependencias ---
if not exist ".venv\Scripts\python.exe" (
  echo Preparando el entorno por primera vez, puede tardar 1-2 minutos...
  "%PY%" -m venv .venv || goto error
  ".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
  ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt || goto error
)

set AUTH_DEV=1
set SECRET_KEY=prueba-local-solo-en-este-computador-12345
set DATABASE_URL=sqlite:///supervision.db
set FRONTEND_DIST=static

echo.
echo  La app abre en http://localhost:8000
echo  Para detenerla, cierra esta ventana.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:8000"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
exit /b 0

:error
echo.
echo Hubo un error preparando el entorno. Copia el mensaje de arriba y envialo.
pause
exit /b 1
