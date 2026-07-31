@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "VENV_PY=%~dp0venv\Scripts\python.exe"
set "EMBED_PY=%~dp0python-embed\python.exe"
set "BOOTSTRAP_LOCK=%~dp0.venv-bootstrap.lock"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"
set "VIRTUALENV_NO_PERIODIC_UPDATE=1"

if exist "%VENV_PY%" (
  "%VENV_PY%" -c "import sys; print(sys.executable)" >nul 2>&1
  if not errorlevel 1 exit /b 0
)

call :acquire_lock
if errorlevel 2 exit /b 0
if errorlevel 1 exit /b 1

if exist "%VENV_PY%" (
  "%VENV_PY%" -c "import sys; print(sys.executable)" >nul 2>&1
  if not errorlevel 1 goto :success_ready
  echo [Prospectus AI] Existing Python venv is not usable. Rebuilding it locally...
  rmdir /s /q "%~dp0venv" >nul 2>&1
)

if exist "%~dp0venv\bin\python" (
  echo ERROR: This folder has a Linux Python environment ^(venv\bin^). It cannot run on Windows.
  echo Download the Windows bundle built with: npm run pack:windows-dist
  if not "%PROSPECTUS_NO_PAUSE%"=="1" pause
  exit /b 1
)

if exist "%EMBED_PY%" goto :use_embedded_python

where py >nul 2>&1
if errorlevel 1 (
  echo ERROR: No bundled python-embed\python.exe was found and the Windows Python launcher ^(py^) is not on PATH.
  echo Reinstall Prospectus AI from the Windows bundle, or install Python 3.10+ and reopen the app.
  if not "%PROSPECTUS_NO_PAUSE%"=="1" pause
  exit /b 1
)

echo [Prospectus AI] Creating Python environment with system Python ^(py -3^)...
py -3 -m venv "%~dp0venv"
if errorlevel 1 goto :fail_root
call "%~dp0venv\Scripts\activate.bat"
python -m pip install --upgrade pip wheel setuptools
if errorlevel 1 goto :fail_root
goto :install_requirements

:use_embedded_python
echo [Prospectus AI] Creating Python environment with bundled Python...
cd /d "%~dp0python-embed"

REM Embeddable Python needs import site enabled before pip/virtualenv can see site-packages.
for %%P in (*._pth *.pth) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p='%%~fP'; $a=Get-Content -LiteralPath $p; $b=@($a | ForEach-Object { if ($_ -match '^\s*#\s*import\s+site\s*$') { 'import site' } else { $_ } }); if ($b -notcontains 'import site') { $b += 'import site' }; Set-Content -LiteralPath $p -Value $b -Encoding ascii } catch { exit 1 }"
  if errorlevel 1 goto :fail_embed
)

"%EMBED_PY%" -c "import pip" >nul 2>&1
if errorlevel 1 (
  if not exist "%~dp0python-embed\get-pip.py" (
    echo ERROR: get-pip.py is missing from python-embed.
    goto :fail_embed
  )
  "%EMBED_PY%" "%~dp0python-embed\get-pip.py"
  if errorlevel 1 goto :fail_embed
)

"%EMBED_PY%" -m pip install --disable-pip-version-check --no-warn-script-location "virtualenv>=20.28.0"
if errorlevel 1 goto :fail_embed
cd /d "%~dp0"
"%EMBED_PY%" -m virtualenv "%~dp0venv"
if errorlevel 1 goto :fail_root
call "%~dp0venv\Scripts\activate.bat"
python -m pip install --upgrade pip wheel setuptools
if errorlevel 1 goto :fail_root

:install_requirements
echo [Prospectus AI] Installing Python packages. First launch can take 5-20 minutes...
python -m pip install "torch>=2.0.0" --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 goto :fail_root
if exist "%~dp0requirements-no-torch.txt" (
  python -m pip install -r "%~dp0requirements-no-torch.txt"
) else (
  python -m pip install -r "%~dp0requirements.txt"
)
if errorlevel 1 goto :fail_root

"%VENV_PY%" -c "import sys; print(sys.executable)" >nul 2>&1
if errorlevel 1 goto :fail_root

:success_ready
"%VENV_PY%" -c "import sys; import pandas; import langgraph; print(sys.executable)" >nul 2>&1
if errorlevel 1 goto :fail_root

echo [Prospectus AI] Python environment ready.
rmdir "%BOOTSTRAP_LOCK%" >nul 2>&1
exit /b 0

:fail_embed
cd /d "%~dp0"
:fail_root
rmdir "%BOOTSTRAP_LOCK%" >nul 2>&1
echo Setup failed. If this is the first launch, check your network connection and try again.
echo If you see a DLL error, install Microsoft Visual C++ Redistributable x64.
if not "%PROSPECTUS_NO_PAUSE%"=="1" pause
exit /b 1

:acquire_lock
if exist "%BOOTSTRAP_LOCK%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:BOOTSTRAP_LOCK; if (Test-Path -LiteralPath $p) { $age=(Get-Date)-(Get-Item -LiteralPath $p).LastWriteTime; if ($age.TotalMinutes -gt 120) { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
)
for /l %%L in (1,1,1800) do (
  mkdir "%BOOTSTRAP_LOCK%" >nul 2>&1
  if not errorlevel 1 exit /b 0
  if exist "%VENV_PY%" (
    "%VENV_PY%" -c "import sys; print(sys.executable)" >nul 2>&1
    if not errorlevel 1 exit /b 2
  )
  if %%L==1 echo [Prospectus AI] Python setup is already running. Waiting for it to finish...
  timeout /t 1 /nobreak >nul
)
echo ERROR: Another Python setup process appears to be stuck. Close Prospectus AI and delete "%BOOTSTRAP_LOCK%", then reopen the app.
exit /b 1
