@echo off
set currentPath="%cd%"
cd /d "%~dp0.."
npm run start -- --work-dir "%currentPath%" %*
cd /d %currentPath%  