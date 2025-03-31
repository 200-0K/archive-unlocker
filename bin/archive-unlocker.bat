@echo off
set currentPath="%cd%"
cd /d "%~dp0.."
npm run start -- %*
cd /d %currentPath% 