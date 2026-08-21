@echo off
setlocal

set "PYTHON=%LocalAppData%\Programs\Python\Python312\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

"%PYTHON%" --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or is not available on PATH.
    echo Install Python 3.12, then run this file again.
    pause
    exit /b 1
)

pushd "%~dp0sbom-tool"
"%PYTHON%" app.py
popd
pause
