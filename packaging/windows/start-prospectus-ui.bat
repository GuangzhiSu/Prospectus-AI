@echo off
setlocal EnableExtensions
title Prospectus AI
cd /d "%~dp0"

echo Prospectus AI launcher folder: %CD%

if not exist "%~dp0ensure-python-venv.bat" (
  echo ERROR: Missing ensure-python-venv.bat next to this file.
  pause
  exit /b 1
)

if not defined PROSPECTUS_ROOT set "PROSPECTUS_ROOT=%~dp0"
if not defined WORKSPACE_ROOT (
  if defined LOCALAPPDATA (
    set "WORKSPACE_ROOT=%LOCALAPPDATA%\ProspectusAI\workspace"
  ) else (
    set "WORKSPACE_ROOT=%APPDATA%\ProspectusAI\workspace"
  )
)
if not exist "%WORKSPACE_ROOT%" mkdir "%WORKSPACE_ROOT%" >nul 2>&1

call "%~dp0ensure-python-venv.bat"
if errorlevel 1 (
  echo Stopped because Python setup failed.
  pause
  exit /b 1
)

set "AGENT1_PYTHON=%PROSPECTUS_ROOT%venv\Scripts\python.exe"
set "PATH=%PROSPECTUS_ROOT%venv\Scripts;%PATH%"

set "NEXT_ROOT="
if exist "%~dp0web\server.js" set "NEXT_ROOT=%~dp0web"
if not defined NEXT_ROOT if exist "%~dp0server.js" set "NEXT_ROOT=%~dp0"
if not defined NEXT_ROOT (
  echo ERROR: web\server.js not found.
  pause
  exit /b 1
)

set "HOSTNAME=127.0.0.1"
if not defined PORT (
  for /f "usebackq delims=" %%p in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($p = 3000; $p -le 3099; $p++) { $c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', $p) } catch { Write-Output $p; exit 0 } finally { $c.Close() } }; exit 1"`) do set "PORT=%%p"
)
if not defined PORT (
  echo ERROR: No free TCP port from 3000 to 3099 on 127.0.0.1.
  echo Close another Prospectus AI window or set PORT before launch, e.g. set PORT=3010
  pause
  exit /b 1
)

set "NODE_EXE="
if exist "%~dp0node\node.exe" (
  set "NODE_EXE=%~dp0node\node.exe"
) else (
  where node >nul 2>&1
  if errorlevel 1 (
    echo ERROR: node.exe not found in node\ folder and node is not on PATH.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)

echo PROSPECTUS_ROOT=%PROSPECTUS_ROOT%
echo WORKSPACE_ROOT=%WORKSPACE_ROOT%
echo Starting http://%HOSTNAME%:%PORT%/workspace
> "%~dp0prospectus-port.txt" echo %PORT%
echo Open http://127.0.0.1:%PORT%/workspace in your browser. Close this window to stop.
"%NODE_EXE%" "%NEXT_ROOT%\server.js"
echo Server stopped.
pause
endlocal
exit /b 0
