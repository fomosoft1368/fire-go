# Location Setup Guide for Driver App

## 🌍 Geolocation Configuration

### What's Configured:

✅ **Google Maps API Key** (in app.json)
- Key: `AIzaSyDhotUKj8pth1cdRwUu3rgN7xn5t-P2y8A`
- Android config: Already configured in app.json

✅ **Location Permissions** (in app.json)
- `ACCESS_FINE_LOCATION` - For precise GPS
- `ACCESS_COARSE_LOCATION` - Fallback coarse location
- Expo Location plugin auto-requests permissions on first app use

✅ **Environment Variables** (in .env)
- `REACT_APP_API_URL=http://192.168.1.14:3000/api`
- `GOOGLE_MAPS_API_KEY=AIzaSyDhotUKj8pth1cdRwUu3rgN7xn5t-P2y8A`

### How Location Tracking Works:

**On App Start (ActiveRideScreen.tsx):**
1. Requests foreground location permission
2. Gets initial driver position using `Location.getCurrentPositionAsync()`
3. Starts continuous watch using `Location.watchPositionAsync()` 
4. Updates every 2 seconds or 10 meters movement
5. Map animates to show driver position

**Console Logs to Check:**
```
🔍 Starting location tracking...
📍 Location permission status: granted
✅ Location permission granted, getting location...
📍 Initial driver location obtained: { latitude, longitude }
✅ Setting initial location: { latitude, longitude }
✅ Location watch started: <watchId>
📍 Location watch update: { latitude, longitude }
```

### Troubleshooting:

**If location not working:**

1. **Check Android/Device:**
   - Enable GPS on physical device or emulator
   - Settings > Apps > Permissions > Location = Allow
   - For emulator: use Android Emulator controls to simulate location

2. **Check Logs:**
   - Look for "⚠️ Location permission denied" → Grant permission
   - Look for "❌ Error getting location" → Check device GPS

3. **Test Location:**
   - Use Android Emulator: Extended controls > Location > Enter coords
   - Physical device: Go outside or enable mock location in dev settings

4. **Rebuild App:**
   - `npm start -- --clear` (clear cache)
   - Rebuild APK: `npm run android` or `expo prebuild --clean`

### Map Display:

**Markers on Map:**
- 🔵 **Blue** = Driver location (real GPS)
- 🟢 **Green** = Customer pickup location
- 🔴 **Red** = Customer dropoff location
- 📍 **Line** = Route from driver to customer

**Zoom Controls:**
- **-** button: Zoom out
- **+** button: Zoom in  
- **📐** button: Fit driver + customer on screen

## Files Modified:

1. **app.json** - Added location permissions + expo-location plugin
2. **.env** - Added API config (create from .env.example if missing)
3. **ActiveRideScreen.tsx** - Enhanced geolocation tracking with detailed logging

## Next Steps:

1. Ensure device location is enabled
2. Run app: `npm start`
3. Grant location permission when prompted
4. Check console logs to confirm location is being tracked
5. Map should center on driver location automatically
