@echo off
setlocal EnableExtensions
title Prospectus AI
cd /d "%~dp0"
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p=(Join-Path '%CD%' 'launcher-debug-581cd2.ndjson'); $j=@{sessionId='581cd2';runId='verify';hypothesisId='H1';location='start-prospectus-ui.bat:after_cd';message='cwd_ok';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{cwd='%CD%'}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
echo Prospectus AI launcher folder: %CD%
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p=(Join-Path '%CD%' 'launcher-debug-581cd2.ndjson'); $j=@{sessionId='581cd2';runId='verify';hypothesisId='H2';location='start-prospectus-ui.bat:after_folder_echo';message='passed_folder_line';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
if not exist "%~dp0ensure-python-venv.bat" (
  echo ERROR: Missing ensure-python-venv.bat next to this file.
  pause
  exit /b 1
)
if not defined PROSPECTUS_ROOT set "PROSPECTUS_ROOT=%~dp0"
call "%~dp0ensure-python-venv.bat"
if errorlevel 1 (
  echo Stopped because Python setup failed.
  pause
  exit /b 1
)
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p=(Join-Path '%CD%' 'launcher-debug-581cd2.ndjson'); $j=@{sessionId='581cd2';runId='verify';hypothesisId='H3';location='start-prospectus-ui.bat:after_ensure';message='venv_ok';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
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
  echo Close another Prospectus AI console or whatever is using that range, or set PORT before launch, e.g. set PORT=3010
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
echo Starting http://%HOSTNAME%:%PORT%
echo Open http://127.0.0.1:%PORT% in your browser. Close this window to stop.
REM #region agent log
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p=(Join-Path '%CD%' 'launcher-debug-581cd2.ndjson'); $j=@{sessionId='581cd2';runId='verify';hypothesisId='H4';location='start-prospectus-ui.bat:before_node';message='starting_node';timestamp=[int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());data=@{next_root='%NEXT_ROOT%';port='%PORT%'}}|ConvertTo-Json -Compress; Add-Content -LiteralPath $p -Value $j -Encoding utf8 } catch {}" 2>nul
REM #endregion
"%NODE_EXE%" "%NEXT_ROOT%\server.js"
echo Server stopped.
pause
endlocal
exit /b 0
