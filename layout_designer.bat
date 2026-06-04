@echo off
setlocal
cd /d "%~dp0"
title SZO Layout Designer

set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  "%CODEX_PY%" tools\layout_designer.py
  goto DONE
)

py tools\layout_designer.py
if not errorlevel 1 goto DONE

python tools\layout_designer.py
if not errorlevel 1 goto DONE

echo.
echo Python could not be started.
echo Please install Python, or open this project with Codex again.
pause
exit /b 1

:DONE
exit /b 0
