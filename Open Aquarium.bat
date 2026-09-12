@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing app dependencies...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo Opening Aquarium desktop app...
call npm run desktop
if errorlevel 1 (
  pause
  exit /b 1
)
