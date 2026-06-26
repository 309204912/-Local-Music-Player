@echo off
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing dependencies...
  call npm install
)
start "" wscript.exe "MusicFloat.vbs"
