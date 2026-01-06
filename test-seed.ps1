
# Test seed endpoint and verify coordinates are saved correctly
Write-Host "Seeding test data..."
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/seed-test-data" -Method POST -ContentType "application/json" -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 201) {
    Write-Host "✓ Seed successful"
    Write-Host "Response: $($response.Content)"
} else {
    Write-Host "✗ Seed failed with status $($response.StatusCode)"
    Write-Host $response.Content
    exit 1
}

# Wait a moment for database to settle
Start-Sleep -Seconds 1

# Fetch first ride and check coordinates
Write-Host "`nFetching first ride to verify coordinates..."
$ridesResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/rides?limit=1" -Method GET
$rides = $ridesResponse.Content | ConvertFrom-Json

if ($rides.Count -gt 0) {
    $ride = $rides[0]
    Write-Host "First ride: $($ride._id)"
    Write-Host "Pickup address: $($ride.pickupAddress)"
    Write-Host "Dropoff address: $($ride.dropoffAddress)"
    
    if ($ride.pickupLocation) {
        Write-Host "Pickup location: type=$($ride.pickupLocation.type), coordinates=$($ride.pickupLocation.coordinates -join ',')"
    } else {
        Write-Host "✗ Pickup location is NULL!"
    }
    
    if ($ride.dropoffLocation) {
        Write-Host "Dropoff location: type=$($ride.dropoffLocation.type), coordinates=$($ride.dropoffLocation.coordinates -join ',')"
    } else {
        Write-Host "✗ Dropoff location is NULL!"
    }
} else {
    Write-Host "✗ No rides found in database!"
}
