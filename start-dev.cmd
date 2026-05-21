@echo off
cd /d C:\Users\User\Documents\Codex\gasparzinho
echo Iniciando Gasparzinho em http://localhost:3000 ...
echo.
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev --port 3000
echo.
echo O servidor parou ou ocorreu um erro.
pause
