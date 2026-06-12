@echo off
cd /d "%~dp0"
call venv\Scripts\activate
echo Starting RecEasy backend from %cd%
python -c "from app.urls import frontend_base; print('FRONTEND_URL =', frontend_base())"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
