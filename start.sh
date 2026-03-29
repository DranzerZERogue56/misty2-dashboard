#!/usr/bin/env bash
set -e

echo ""
echo " Misty 2 Dashboard"
echo " =================="
echo ""

# Find python3
if command -v python3 &>/dev/null; then
    PYTHON=python3
    PIP=pip3
elif command -v python &>/dev/null; then
    PYTHON=python
    PIP=pip
else
    echo " [ERROR] Python not found."
    echo " Please install Python 3.8+ from:"
    echo " https://www.python.org/downloads/"
    exit 1
fi

echo " Python found: $($PYTHON --version)"
echo " Installing dependencies..."
echo ""

$PIP install -r requirements.txt --quiet

echo ""
echo " Starting dashboard..."
echo " Your browser will open automatically."
echo " Press Ctrl+C to stop."
echo ""

$PYTHON app.py
