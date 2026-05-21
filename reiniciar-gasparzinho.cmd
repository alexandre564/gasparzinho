@echo off
cd /d "%~dp0"
echo Reiniciando Gasparzinho em http://localhost:3004 ...
echo.
echo Fechando servidor antigo da porta 3004, se existir...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":3004 .*LISTENING"') do (
  echo Encerrando processo %%a...
  taskkill /F /PID %%a >nul 2>nul
)
timeout /t 2 /nobreak >nul
echo.
echo Limpando cache visual do Next...
if exist .next rmdir /s /q .next
echo.
echo Abrindo novamente em http://localhost:3004 ...
npm run dev -- --port 3004
echo.
echo O servidor parou ou ocorreu um erro.
pause
