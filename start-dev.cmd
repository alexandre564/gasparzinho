@echo off
cd /d "%~dp0"
echo Iniciando Gasparzinho em http://localhost:3004 ...
echo.
npm run db:safe-sync
if errorlevel 1 (
  echo.
  echo Nao foi possivel atualizar o banco. Verifique a conexao e tente novamente.
  pause
  exit /b 1
)
echo.
npx next dev --port 3004
echo.
echo O servidor parou ou ocorreu um erro.
pause
