@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
set "PYTHONUTF8=1"

title SZO Collectbook Source Builder

echo ========================================
echo SZO Collectbook Source Builder
echo Current folder:
echo %CD%
echo.
echo Order policy:
echo - Keep source workbook row order.
echo - Keep weapon category tab order.
echo - Newly appended official rows stay at the end.
echo ========================================
echo.

set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  echo Using Codex Python:
  echo %CODEX_PY%
  echo.
  "%CODEX_PY%" tools\build_collectbook_sources.py
  goto CHECK_RESULT
)

echo Codex Python not found.
echo Trying Windows Python launcher...
echo.

py tools\build_collectbook_sources.py
if not errorlevel 1 goto SUCCESS

echo.
echo py failed.
echo Trying normal python...
echo.

python tools\build_collectbook_sources.py
if not errorlevel 1 goto SUCCESS

echo.
echo Collectbook source build failed.
echo Please copy the error message above to Codex.
pause
exit /b 1

:CHECK_RESULT
if errorlevel 1 (
  echo.
  echo Codex Python failed.
  echo Trying Windows Python launcher...
  echo.

  py tools\build_collectbook_sources.py
  if not errorlevel 1 goto SUCCESS

  echo.
  echo py failed.
  echo Trying normal python...
  echo.

  python tools\build_collectbook_sources.py
  if not errorlevel 1 goto SUCCESS

  echo.
  echo Collectbook source build failed.
  echo Please copy the error message above to Codex.
  pause
  exit /b 1
)

:SUCCESS
echo.
echo Collectbook source build completed.
pause
exit /b 0
