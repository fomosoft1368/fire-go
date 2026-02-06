#!/usr/bin/env pwsh
# 🗺️ Quick Setup Script for Private OSRM Server (Vietnam)
# Run this from project root: .\setup-osrm.ps1

Write-Host "🗺️ FireGo - Setting up Private OSRM Server (Vietnam Only)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create osrm-data directory
Write-Host "📁 Step 1: Creating osrm-data directory..." -ForegroundColor Yellow
if (-not (Test-Path "osrm-data")) {
    New-Item -ItemType Directory -Path "osrm-data" | Out-Null
    Write-Host "✅ Created osrm-data/" -ForegroundColor Green
} else {
    Write-Host "✅ osrm-data/ already exists" -ForegroundColor Green
}

Write-Host ""

# Step 2: Download Vietnam OSM data
Write-Host "📥 Step 2: Downloading Vietnam OSM data..." -ForegroundColor Yellow
Write-Host "   This is ~200MB, may take 2-5 minutes..." -ForegroundColor Gray

$osmFile = "osrm-data/vietnam-latest.osm.pbf"
$osmUrl = "https://download.geofabrik.de/asia/vietnam-latest.osm.pbf"

if (-not (Test-Path $osmFile)) {
    try {
        Write-Host "   Downloading from: $osmUrl" -ForegroundColor Gray
        $ProgressPreference = 'SilentlyContinue'  # Suppress progress bar for cleaner output
        Invoke-WebRequest -Uri $osmUrl -OutFile $osmFile -TimeoutSec 600
        $ProgressPreference = 'Continue'
        Write-Host "✅ Downloaded: $osmFile" -ForegroundColor Green
    } catch {
        Write-Host "❌ Download failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  Manual download required:" -ForegroundColor Yellow
        Write-Host "   1. Visit: https://download.geofabrik.de/asia/vietnam-latest.osm.pbf" -ForegroundColor Gray
        Write-Host "   2. Save to: osrm-data/vietnam-latest.osm.pbf" -ForegroundColor Gray
        Write-Host "   3. Then run: docker-compose -f docker-compose.osrm.yml run osrm bash" -ForegroundColor Gray
        exit 1
    }
} else {
    Write-Host "✅ OSM file already exists: $osmFile" -ForegroundColor Green
}

Write-Host ""

# Step 3: Build OSRM profile
Write-Host "🔨 Step 3: Building OSRM profile (this takes 5-10 minutes)..." -ForegroundColor Yellow
Write-Host "   Processing Vietnam OSM data..." -ForegroundColor Gray

try {
    # Extract
    Write-Host "   [1/3] Extracting..." -ForegroundColor Gray
    docker run -t `
        -v "$((Get-Location).Path)/osrm-data:/data" `
        osrm/osrm-backend:v5.28.0 `
        osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf
    
    # Partition
    Write-Host "   [2/3] Partitioning..." -ForegroundColor Gray
    docker run -t `
        -v "$((Get-Location).Path)/osrm-data:/data" `
        osrm/osrm-backend:v5.28.0 `
        osrm-partition /data/vietnam-latest.osrm
    
    # Customize
    Write-Host "   [3/3] Customizing routing graph..." -ForegroundColor Gray
    docker run -t `
        -v "$((Get-Location).Path)/osrm-data:/data" `
        osrm/osrm-backend:v5.28.0 `
        osrm-customize /data/vietnam-latest.osrm
    
    Write-Host "✅ OSRM profile built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Start OSRM server
Write-Host "🚀 Step 4: Starting OSRM server..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.osrm.yml up -d
    Write-Host "✅ OSRM server started" -ForegroundColor Green
    Write-Host "   Port: http://localhost:5000" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to start server: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Wait a bit for server to fully start
Write-Host "⏳ Waiting for OSRM server to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 5: Verify
Write-Host "🔍 Step 5: Testing OSRM server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/status" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ OSRM server is running and healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Server not ready yet. It may take a few more seconds..." -ForegroundColor Yellow
    Write-Host "   Check status manually: curl http://localhost:5000/status" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              ✅ OSRM Setup Complete!                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Backend .env already has: OSRM_BASE_URL=http://localhost:5000" -ForegroundColor Gray
Write-Host "  2. Restart backend:" -ForegroundColor Gray
Write-Host "     cd backend && npm run start:dev" -ForegroundColor Gray
Write-Host "  3. Test in your app: Bình Dương → TP.HCM should show correct route" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 Useful commands:" -ForegroundColor Yellow
Write-Host "   Stop server:     docker-compose -f docker-compose.osrm.yml down" -ForegroundColor Gray
Write-Host "   View logs:       docker logs -f fire-go-osrm" -ForegroundColor Gray
Write-Host "   Test endpoint:   curl 'http://localhost:5000/route/v1/driving/106.6626,10.6644;106.6763,10.7743?geometries=geojson'" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Full documentation: see OSRM_SETUP.md" -ForegroundColor Gray
