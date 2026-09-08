@echo off
echo Starting MediCase Backend...
cd /d "%~dp0"
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pause
