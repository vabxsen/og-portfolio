@echo off
rem Double-click to preview the site at http://localhost:5500 (needs Python). Close this window to stop.
cd /d "%~dp0"
start "" http://localhost:5500
python -m http.server 5500
