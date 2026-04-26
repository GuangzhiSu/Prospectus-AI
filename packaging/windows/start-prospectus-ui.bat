@echo off
REM Double-click launcher: set PROSPECTUS_ROOT to the folder that contains agent1.py, then start Next standalone.
REM Adjust WEBROOT if your standalone output layout differs (check apps\web\.next\standalone after `npm run build`).

setlocal
cd /d "%~dp0"

REM Install root must contain agent1.py and prospectus_kg_output\ (for crosswalk).
if not defined PROSPECTUS_ROOT set "PROSPECTUS_ROOT=%~dp0"
set "PATH=%~dp0python\Scripts;%~dp0python;%PATH%"

REM Next 16 monorepo standalone: server may live here or under web\
if exist "%~dp0web\server.js" (
  set "NEXT_ROOT=%~dp0web"
) else if exist "%~dp0server.js" (
  set "NEXT_ROOT=%~dp0"
) else (
  echo ERROR: server.js not found. Run packaging/windows/build.ps1 or npm run build in apps/web.
  pause
  exit /b 1
)

set "PORT=3000"
echo PROSPECTUS_ROOT=%PROSPECTUS_ROOT%
echo Starting Next on port %PORT% ...
node "%NEXT_ROOT%\server.js"
pause
