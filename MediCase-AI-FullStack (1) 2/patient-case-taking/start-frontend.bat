@echo off
echo Starting MediCase Frontend...
cd /d "%~dp0"
npm install
npm run dev
pause
