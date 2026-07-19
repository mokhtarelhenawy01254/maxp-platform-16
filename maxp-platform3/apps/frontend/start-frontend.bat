@echo off
echo Starting Frontend Server...
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Running: npm run dev
cmd /c npm run dev
pause