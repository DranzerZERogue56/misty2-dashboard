@echo off
title Misty 2 Dashboard

echo.
echo  Misty 2 Dashboard
echo  ==================
echo.

:: Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found.
    echo  Please download and install Python 3.8+ from:
    echo  https://www.python.org/downloads/
    echo.
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo  Python found. Installing dependencies...
echo.

:: Install requirements
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo  [ERROR] Failed to install dependencies.
    echo  Try running: python -m pip install flask requests
    pause
    exit /b 1
)

echo.
echo  Starting dashboard...
echo  Your browser will open automatically.
echo  Press Ctrl+C to stop the server.
echo.

python app.py
pause
