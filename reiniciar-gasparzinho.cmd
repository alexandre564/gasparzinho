@echo off
cd /d C:\Users\User\Documents\Codex\gasparzinho
echo Reiniciando Gasparzinho em http://localhost:3000 ...
echo.
echo Fechando servidor antigo da porta 3000, se existir...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  echo Encerrando processo %%a...
  taskkill /F /PID %%a >nul 2>nul
)
timeout /t 2 /nobreak >nul
echo.
echo Limpando cache visual do Next...
if exist .next rmdir /s /q .next
echo.
echo Abrindo novamente em http://localhost:3000 ...
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev --port 3000
echo.
echo O servidor parou ou ocorreu um erro.
pause