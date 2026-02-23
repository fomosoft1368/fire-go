# ==========================================
# AUTO SETUP NGROK - Cách 2: Dùng Chocolatey
# ==========================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " SETUP NGROK VỚI CHOCOLATEY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Kiểm tra Chocolatey đã cài chưa
Write-Host "Step 1: Kiểm tra Chocolatey..." -ForegroundColor Yellow

if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Chocolatey đã được cài đặt!" -ForegroundColor Green
    choco --version
} else {
    Write-Host "[!] Chocolatey chưa được cài đặt. Đang cài đặt..." -ForegroundColor Yellow
    Write-Host ""
    
    # Cài Chocolatey
    Write-Host "Cài đặt Chocolatey (cần quyền Admin)..." -ForegroundColor Cyan
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "[OK] Chocolatey đã được cài đặt thành công!" -ForegroundColor Green
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Host "[ERROR] Không thể cài Chocolatey tự động!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Vui lòng cài thủ công:" -ForegroundColor Yellow
        Write-Host "1. Mở PowerShell AS ADMINISTRATOR" -ForegroundColor White
        Write-Host "2. Chạy lệnh:" -ForegroundColor White
        Write-Host "   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Cyan
        Write-Host "3. Sau đó chạy lại script này" -ForegroundColor White
        Write-Host ""
        pause
        exit 1
    }
}

Write-Host ""

# Bước 2: Cài Ngrok qua Chocolatey
Write-Host "Step 2: Cài đặt Ngrok..." -ForegroundColor Yellow

if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Ngrok đã được cài đặt!" -ForegroundColor Green
    ngrok version
} else {
    Write-Host "Đang cài đặt ngrok qua Chocolatey..." -ForegroundColor Cyan
    
    try {
        choco install ngrok -y
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "[OK] Ngrok đã được cài đặt thành công!" -ForegroundColor Green
        ngrok version
    } catch {
        Write-Host "[ERROR] Không thể cài ngrok!" -ForegroundColor Red
        Write-Host "Vui lòng chạy PowerShell AS ADMINISTRATOR" -ForegroundColor Yellow
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " CÀI ĐẶT HOÀN TẤT!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 3: Hỏi có muốn chạy ngrok ngay không
Write-Host "Bạn có muốn chạy ngrok ngay bây giờ? (Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host " KHỞI ĐỘNG NGROK" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backend URL: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "SAU KHI NGROK CHẠY:" -ForegroundColor Yellow
    Write-Host "1. Copy URL: https://xxxxx.ngrok-free.app" -ForegroundColor White
    Write-Host "2. Vào Sepay: https://my.sepay.vn/" -ForegroundColor White
    Write-Host "3. Webhooks -> Sửa webhook 'verification'" -ForegroundColor White
    Write-Host "4. Gọi đến: https://xxxxx.ngrok-free.app/api/wallet/sepay/webhook" -ForegroundColor White
    Write-Host "5. Lưu lại" -ForegroundColor White
    Write-Host ""
    Write-Host "Đang khởi động ngrok..." -ForegroundColor Cyan
    Write-Host ""
    
    ngrok http 3000
} else {
    Write-Host ""
    Write-Host "Để chạy ngrok sau, dùng lệnh:" -ForegroundColor Yellow
    Write-Host "  ngrok http 3000" -ForegroundColor Cyan
    Write-Host ""
}
