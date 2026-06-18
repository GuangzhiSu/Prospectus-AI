@echo off
setlocal EnableExtensions
cd /d "%~dp0"
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p=(Join-Path '%CD%' 'launcher-debug-581cd2.ndjson'); $j=@{sessionId='581cd2';runId='post-parens-fix';hypothesisId='H5';location='ensure-python-venv.bat:entry';message='ensure_entered';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
if exist "venv\Scripts\python.exe" exit /b 0
if exist "venv\bin\python" (
  echo ERROR: This folder has a Linux Python environment ^(venv\bin^). It cannot run on Windows.
  echo Download the Windows bundle built with: npm run pack:windows-dist
  pause
  exit /b 1
)
if not exist "python-embed\python.exe" (
  where py >nul 2>&1
  if errorlevel 1 (
    echo ERROR: Missing python-embed\python.exe ^(folder incomplete or wrong zip^).
    echo Also no Python launcher py on PATH.
    pause
    exit /b 1
  )
  echo [Prospectus AI] Using system Python ^(py -3^) to create venv...
  py -3 -m venv venv
  if errorlevel 1 goto :fail_root
  call venv\Scripts\activate.bat
  pip install --upgrade pip
  pip install "torch>=2.0.0" --index-url https://download.pytorch.org/whl/cpu
  if errorlevel 1 goto :fail_root
  if exist "requirements-no-torch.txt" (pip install -r requirements-no-torch.txt) else (pip install -r requirements.txt)
  if errorlevel 1 goto :fail_root
  echo [Prospectus AI] Python environment ready.
  exit /b 0
)
echo [Prospectus AI] First launch: installing Python packages ^(5-15 minutes^). Please wait...
cd /d "%~dp0python-embed"
REM Embeddable python won't load Lib\site-packages until "import site" is enabled.
REM Official zips ship pythonXY._pth — "*.pth" never matches; must include *._pth
for %%P in (*._pth *.pth) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p='%%~fP'; $a=Get-Content -LiteralPath $p; $b=@($a | ForEach-Object { if ($_ -match '^\s*#\s*import\s+site\s*$') { 'import site' } else { $_ } }); Set-Content -LiteralPath $p -Value $b -Encoding ascii } catch {}" 2>nul
)
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $root=(Resolve-Path '%~dp0.').Path; $p=Join-Path $root 'launcher-debug-581cd2.ndjson'; $j=@{sessionId='581cd2';runId='embed-site';hypothesisId='H6';location='ensure-python-venv.bat:after_pth';message='embed_import_site';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
python -c "import pip" >nul 2>&1
if errorlevel 1 (
  if not exist "get-pip.py" (
    echo ERROR: get-pip.py is missing from python-embed folder.
    cd /d "%~dp0"
    goto :fail_root
  )
  python get-pip.py
  if errorlevel 1 goto :fail_embed
)
python -m pip install --upgrade pip
if errorlevel 1 goto :fail_embed
python -m pip install "virtualenv>=20.28.0"
if errorlevel 1 goto :fail_embed
cd /d "%~dp0"
python-embed\python.exe -m virtualenv venv
if errorlevel 1 goto :fail_root
call venv\Scripts\activate.bat
pip install "torch>=2.0.0" --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 goto :fail_root
if exist "requirements-no-torch.txt" (
  pip install -r requirements-no-torch.txt
) else (
  pip install -r requirements.txt
)
if errorlevel 1 goto :fail_root
echo [Prospectus AI] Python environment ready.
exit /b 0
:fail_embed
cd /d "%~dp0"
:fail_root
echo Setup failed. Install Microsoft Visual C++ Redistributable x64 if you see a DLL error.
pause
exit /b 1
