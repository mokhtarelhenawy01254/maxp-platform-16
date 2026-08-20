@echo off
chcp 65001 >nul
title MaxP Tasks

echo ========================================
echo    MaxP - ┘à┘ç╪º┘à ╪º┘ä┘ü╪▒┘è┘é
echo ========================================
echo.

where python >nul 2>&1
if %errorlevel% == 0 (
    echo Starting with Python...
    python "%~dp0main.py"
    goto :end
)

echo Python not found. Looking for exe...
if exist "%~dp0dist\MaxP Tasks\MaxP Tasks.exe" (
    echo Starting exe...
    start "" "%~dp0dist\MaxP Tasks\MaxP Tasks.exe"
    goto :end
)

echo.
echo ERROR: No Python or exe found.
echo.
echo Options:
echo   1. Install Python and run: pip install -r requirements.txt
echo   2. Run the .exe from dist\MaxP Tasks\
echo.
pause

:end
