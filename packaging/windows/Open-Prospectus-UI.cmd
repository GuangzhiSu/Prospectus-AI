@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
del "%~dp0prospectus-port.txt" >nul 2>&1
start "Prospectus AI Server" cmd.exe /k call "%~dp0start-prospectus-ui.bat"

for /l %%i in (1,1,60) do (
  if exist "%~dp0prospectus-port.txt" (
    set /p PROSPECTUS_PORT=<"%~dp0prospectus-port.txt"
    if not "!PROSPECTUS_PORT!"=="" (
      start "" "http://127.0.0.1:!PROSPECTUS_PORT!"
      exit /b 0
    )
  )
  timeout /t 1 /nobreak >nul
)

start "" "http://127.0.0.1:3000"
exit /b 0
