# Ride Booking System - Quick Testing Guide

## API Testing with cURL

### 1. Calculate Fare
```bash
curl -X POST http://localhost:3000/api/rides/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{
    "distance": 5.5,
    "duration": 900,
    "vehicleType": "basic",
    "isPeakHour": false,
    "isRainy": false
  }'
```

### 2. Get Pricing Configuration
```bash
curl http://localhost:3000/api/rides/pricing/basic
curl http://localhost:3000/api/rides/pricing/comfort
curl http://localhost:3000/api/rides/pricing/premium
```

### 3. Find Nearby Drivers
```bash
curl 'http://localhost:3000/api/rides/find-drivers?latitude=21.0285&longitude=105.8542&radius=5&vehicleType=basic&limit=10'
```

## Mobile App Flow

### User Journey
1. **Home Screen**
   - Enter pickup location (autocomplete)
   - Enter dropoff location (autocomplete)
   - Press "Đặt xe"

2. **Route Calculation**
   - System calls OSRM to get distance/duration
   - Shows loading indicator

3. **Ride Booking Screen**
   - Display location info and trip details
   - Select vehicle type (Basic/Comfort/Premium)
   - Real-time fare calculation (updates on type change)
   - Show fare breakdown:
     - Base fare
     - Distance charge
     - Time charge
     - Surge pricing (if applicable)
     - Total fare

4. **Driver Discovery**
   - Press "Xem tài xế" button
   - Modal shows nearby drivers with:
     - Name
     - Rating (stars)
     - Distance from pickup
     - Car type
   - Sorted by distance (nearest first)

5. **Ride Confirmation**
   - Press "Đặt xe" button
   - Creates ride with calculated fares
   - Navigates to tracking screen

## Database Setup

### Create Pricing Records
```javascript
db.pricings.insertMany([
  {
    vehicleType: 'basic',
    baseFare: 10000,
    pricePerKm: 5000,
    pricePerMinute: 500,
    peakHourSurge: 30,
    rainyDaySurge: 20,
    minimumFare: 20000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vehicleType: 'comfort',
    baseFare: 15000,
    pricePerKm: 7000,
    pricePerMinute: 600,
    peakHourSurge: 30,
    rainyDaySurge: 20,
    minimumFare: 30000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vehicleType: 'premium',
    baseFare: 25000,
    pricePerKm: 10000,
    pricePerMinute: 800,
    peakHourSurge: 25,
    rainyDaySurge: 15,
    minimumFare: 50000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### Create 2dsphere Index for Driver Search
```javascript
db.drivers.createIndex({ 'location': '2dsphere' })
```

### Verify Drivers Have Location
```javascript
// Drivers must have location in this format:
{
  _id: ObjectId(...),
  name: "Driver Name",
  phone: "+84912345678",
  status: "online",
  car: {
    carType: "basic",
    licensePlate: "ABC123"
  },
  location: {
    type: "Point",
    coordinates: [105.8542, 21.0285]  // [longitude, latitude]
  },
  rating: 4.8,
  ...
}
```

## Expected Responses

### Calculate Fare Response
```json
{
  "baseFare": 10000,
  "distanceFare": 27500,
  "timeFare": 450,
  "surgeFare": 0,
  "totalFare": 37950,
  "details": {
    "distance": 5.5,
    "duration": 900,
    "pricePerKm": 5000,
    "pricePerMinute": 500,
    "peakHourSurge": 0,
    "rainyDaySurge": 0
  }
}
```

### Find Drivers Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Nguyễn Văn A",
    "phone": "+84912345678",
    "rating": 4.8,
    "carType": "basic",
    "licensePlate": "ABC123",
    "location": {
      "type": "Point",
      "coordinates": [105.8512, 21.0315]
    },
    "distance": 0.5
  },
  ...
]
```

## Screen Components

### RideBookingScreen Sections
1. **Header** - Back button, title
2. **Location Card** - Pickup and dropoff with icons
3. **Trip Info** - Distance and estimated time
4. **Vehicle Types** - 3 selectable cards with icons
5. **Fare Card** - Breakdown of all charges
6. **Action Buttons** - "Xem tài xế" and "Đặt xe"
7. **Driver Modal** - List of available drivers

## Color Scheme (Dark Theme)
- Background: #0f172a (COLORS.bg)
- Secondary BG: #1a202c (COLORS.bgSecondary)
- Primary: #FF6B00 (Orange)
- Text: #ffffff
- Border: #4a5568

## Performance Optimization Notes

1. **Geospatial Queries**: Use 2dsphere index on driver location
2. **Pricing Lookups**: Cache pricing configs in memory (don't change often)
3. **Driver Search**: Limit results to 10 by default
4. **Radius Parameter**: Default 5km, adjustable from frontend

## Troubleshooting

### No Drivers Found
- Check drivers collection has location field
- Verify 2dsphere index exists
- Ensure drivers have status: 'online'
- Check vehicle type matches filter

### Fare Calculation Errors
- Verify pricing record exists for vehicleType
- Check pricing.isActive = true
- Ensure distance > 0 and duration > 0

### Navigation Issues
- RideBooking route must be in Stack.Group
- Ensure RideBookingScreen imported in App.tsx
- Check RootStackParamList includes RideBooking

## Next Steps

1. ✅ Implement driver assignment algorithm
2. ✅ Add Socket.io for real-time location tracking
3. ✅ Create ride status updates
4. ✅ Implement payment with calculated fare
5. ✅ Add ride history with fares
6. ✅ Add rating system for trips

## Useful Links

- OSRM API: http://router.project-osrm.org
- MongoDB Geospatial: https://docs.mongodb.com/manual/geospatial-queries/
- React Native Navigation: https://reactnavigation.org/
