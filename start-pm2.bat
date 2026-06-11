@echo off
title Start Quan Ly Ban Hang Backend

echo =====================================
echo Starting PM2 Backend...
echo =====================================

cd /d D:\botreply\quanlybanghang\app\backend

pm2 resurrect

echo.
echo PM2 status:
pm2 list

pause