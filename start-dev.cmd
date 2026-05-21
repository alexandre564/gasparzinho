@echo off
cd /d "%~dp0"
echo Iniciando Gasparzinho em http://localhost:3004 ...
echo.
npm run dev -- --port 3004
echo.
echo O servidor parou ou ocorreu um erro.
pause
