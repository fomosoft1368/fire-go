# 🗺️ Setup Private OSRM Server (Vietnam Only)

This guide sets up a local OSRM server with **Vietnam-only map data** to prevent routes through Laos/Cambodia.

## Prerequisites

- Docker & Docker Compose installed
- ~2GB disk space for Vietnam OSM data
- ~5-10 minutes setup time

## Step 1: Create OSRM Data Directory

```bash
cd d:\fire-go
mkdir osrm-data
cd osrm-data
```

## Step 2: Download Vietnam OSM Data

Download Vietnam map from Geofabrik.de (free, updated weekly):

```bash
# Using PowerShell
cd osrm-data

# Download Vietnam OSM data (~200MB)
Invoke-WebRequest -Uri "https://download.geofabrik.de/asia/vietnam-latest.osm.pbf" `
  -OutFile "vietnam-latest.osm.pbf"

# Wait for download to complete...
echo "✅ Download complete!"
```

**Alternative** (if PowerShell download too slow):
- Visit: https://download.geofabrik.de/asia/vietnam-latest.osm.pbf
- Download manually to `osrm-data/` folder

## Step 3: Build OSRM Profile

Once you have `vietnam-latest.osm.pbf`, run preprocessing:

```bash
# Open PowerShell in fire-go directory
cd d:\fire-go

# Run OSRM preprocessing
docker run -t `
  -v "${PWD}/osrm-data:/data" `
  osrm/osrm-backend:v5.28.0 `
  osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf

# Partition the data
docker run -t `
  -v "${PWD}/osrm-data:/data" `
  osrm/osrm-backend:v5.28.0 `
  osrm-partition /data/vietnam-latest.osrm

# Create routing graph
docker run -t `
  -v "${PWD}/osrm-data:/data" `
  osrm/osrm-backend:v5.28.0 `
  osrm-customize /data/vietnam-latest.osrm
```

**This will create**:
- `vietnam-latest.osrm` - Main routing database
- `vietnam-latest.osrm.edges` - Edge data
- `vietnam-latest.osrm.fileIndex` - File index
- `vietnam-latest.osrm.metadata` - Metadata

⏱️ **Processing takes ~5-10 minutes** (depends on your CPU)

## Step 4: Start OSRM Server

```bash
# From fire-go directory
docker-compose -f docker-compose.osrm.yml up -d
```

Verify it's running:
```bash
# Should return: {"status": 0}
curl http://192.168.1.10:5000/status
```

## Step 5: Update Backend Configuration

### Update `.env`

```env
# Existing settings...
OSRM_BASE_URL=http://192.168.1.10:5000
```

### Backend already configured to use OSRM_BASE_URL ✅

## Step 6: Restart Backend

```bash
cd backend
npm run start:dev
```

## Testing

### Test route from Bình Dương → TP.HCM

```bash
curl "http://192.168.1.10:5000/route/v1/driving/106.6626,10.6644;106.6763,10.7743?geometries=geojson&overview=full"
```

Should return route staying **entirely within Vietnam** ✅

### Test via your app

Navigate: Bình Dương → TP.HCM → should show straight line, not routing through Laos!

## Maintenance

### Update map data (weekly)

```bash
cd osrm-data
# Delete old data
Remove-Item vietnam-latest.osm.pbf
# Download latest
Invoke-WebRequest -Uri "https://download.geofabrik.de/asia/vietnam-latest.osm.pbf" `
  -OutFile "vietnam-latest.osm.pbf"
# Rebuild OSRM profile (repeat Step 3)
```

### Monitor OSRM server

```bash
# View logs
docker logs -f fire-go-osrm

# Check server status
curl http://192.168.1.10:5000/status

# Stop server
docker-compose -f docker-compose.osrm.yml down

# Restart
docker-compose -f docker-compose.osrm.yml up -d
```

## Troubleshooting

### OSRM not starting?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Check Docker logs
docker logs fire-go-osrm
```

### Routes still going through Laos?
- Verify Vietnam OSM file is loaded: `ls osrm-data/vietnam-latest.osrm*`
- Re-run preprocessing (Step 3)
- Check if old public OSRM is still being called (check backend logs)

### Performance slow?
- MLD algorithm is enabled for speed
- Processing takes time on first request (~10s)
- Subsequent requests much faster

## Architecture

```
Frontend (RideSharing.tsx)
    ↓
combinedTripsService.getDirections()
    ↓
Backend: CombinedTripsService.getDirections()
    ↓
http://192.168.1.10:5000/route/v1/driving/...  ← Local OSRM (Vietnam only!)
    ↓
Route coordinates (always in Vietnam)
    ↓
Frontend displays on map ✅
```

## Production Deployment

For production:
1. Move `osrm-data/` to persistent volume
2. Use Docker Compose with volume mounts
3. Add load balancer if needed (Nginx)
4. Setup automatic map updates (weekly cron)

---

**Result**: Routes now ALWAYS stay in Vietnam! 🇻🇳✅
