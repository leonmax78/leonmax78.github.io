@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
set "PYTHONUTF8=1"

title SZO Data Builder

echo ========================================
echo SZO Data Builder
echo Current folder:
echo %CD%
echo ========================================
echo.

set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  echo Using Codex Python:
  echo %CODEX_PY%
  echo.
  "%CODEX_PY%" tools\build_data.py
  goto CHECK_RESULT
)

echo Codex Python not found.
echo Trying Windows Python launcher...
echo.

py tools\build_data.py
if not errorlevel 1 goto SUCCESS

echo.
echo py failed.
echo Trying normal python...
echo.

python tools\build_data.py
if not errorlevel 1 goto SUCCESS

echo.
echo Data build failed.
echo Please copy the error message above to Codex.
pause
exit /b 1

:CHECK_RESULT
if errorlevel 1 (
  echo.
  echo Codex Python failed.
  echo Trying Windows Python launcher...
  echo.

  py tools\build_data.py
  if not errorlevel 1 goto SUCCESS

  echo.
  echo py failed.
  echo Trying normal python...
  echo.

  python tools\build_data.py
  if not errorlevel 1 goto SUCCESS

  echo.
  echo Data build failed.
  echo Please copy the error message above to Codex.
  pause
  exit /b 1
)

:SUCCESS
echo.
echo Data build completed.
pause
exit /b 0
