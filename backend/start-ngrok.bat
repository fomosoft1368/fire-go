@echo off
echo ==========================================
echo  SETUP NGROK - Expose Backend Webhook
echo ==========================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ngrok chua duoc cai dat!
    echo.
    echo Cach cai dat:
    echo 1. Download: https://ngrok.com/download
    echo 2. Giai nen file ngrok.exe
    echo 3. Copy vao thu muc: C:\Windows\System32
    echo 4. Hoac chay truc tiep: ngrok.exe http 3000
    echo.
    pause
    exit /b 1
)

echo [OK] Ngrok da duoc cai dat!
echo.
echo Starting ngrok tunnel...
echo Backend URL: http://localhost:3000
echo.
echo ==========================================
echo  SAU KHI NGROK CHAY:
echo ==========================================
echo 1. Copy URL: https://xxxxx.ngrok-free.app
echo 2. Vao Sepay Dashboard: https://my.sepay.vn/
echo 3. Webhooks -^> Sua webhook "verification"
echo 4. Thay URL: https://xxxxx.ngrok-free.app/api/wallet/sepay/webhook
echo 5. Luu lai
echo ==========================================
echo.
echo Dang khoi dong ngrok...
echo.

ngrok http 3000
