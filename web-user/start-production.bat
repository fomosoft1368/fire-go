@echo off
:: ============================================================
:: FireGo Web — Windows Server Start Script (Production)
:: Chạy file này để khởi động app ở production mode
:: ============================================================

:: Đặt production environment
set NODE_ENV=production
set PORT=4000

:: ── Thay các giá trị dưới đây cho đúng với server của bạn ──
set MONGODB_URI=mongodb+srv://FireHoangLegacy:wV8ci5CqsJUG57w@firelogin.roiv7g6.mongodb.net/FireGoVN?appName=FireLogin
set NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/us/app/firego/id6761891912
set NEXT_PUBLIC_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=com.firegotech.customer
set NEXT_PUBLIC_API_URL=http://192.168.1.12:3000/api
set BACKEND_URL=http://192.168.1.12:3000

echo.
echo  ============================================
echo   FireGo Web - Production Server
echo   URL: http://localhost:%PORT%
echo   NODE_ENV: %NODE_ENV%
echo  ============================================
echo.

:: Chạy standalone server (không cần npm, không cần node_modules)
node .next\standalone\server.js

pause
