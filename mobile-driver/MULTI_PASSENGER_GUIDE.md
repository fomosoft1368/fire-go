# Multi-Passenger Management Guide

## 📍 How Map & Status Updates Work

### 1️⃣ Driver Location Display
- **Always visible** as 🔵 **blue marker**
- Updates in real-time from device GPS
- Driver location is center point for route calculations

### 2️⃣ Customer Location Display (Based on Status)

**PENDING** ⏱️ (Customer waiting for pickup)
- 🟢 Green marker = Customer pickup location
- 📍 Blue line = Route from driver to pickup
- Button: "Đang đến điểm đón" (En route)

**ARRIVED_AT_PICKUP** 🚩 (Driver at pickup)
- 🟡 Yellow marker = Pickup location
- Button: "Bắt đầu chuyến" (Start journey)

**IN_PROGRESS** 🚗 (Currently transporting customer)
- 🟢 Green marker = Pickup location (arrived point)
- 🔴 Red marker = Dropoff destination
- 📍 Blue line = Route to dropoff
- Button: "Hoàn thành chuyến đi" (Complete journey)

**COMPLETED** ✅ (Customer dropped off)
- No active route shown
- Button: "Đã hoàn thành" (Completed - disabled)

### 3️⃣ Multiple Passengers

**When Ride Has Multiple Customers:**
1. Horizontal carousel shows all passengers
2. **Swipe left/right** to switch between customers
3. **On each swipe:**
   - Map automatically centers on that customer's pickup location
   - Status buttons update to show that customer's current status
   - Address info updates below map
   - Markers update based on that customer's journey status

**Example Flow:**
```
Ride has 2 customers: Anh Minh, Chị Linh

1. Viewing Anh Minh (PENDING)
   - Map shows: Green marker at his pickup
   - Button: "Đang đến điểm đón"
   
2. Swipe → Now viewing Chị Linh (IN_PROGRESS)
   - Map updates: Green at her pickup, Red at her dropoff
   - Button: "Hoàn thành chuyến đi"
   - Address info changes to her addresses
```

### 4️⃣ Action Buttons

Each customer has their own status button based on current journey state:

| Status | Button Label | Action |
|--------|-------------|--------|
| **pending** | Đang đến điểm đón | Mark driver arrived at pickup |
| **arrived_at_pickup** | Bắt đầu chuyến | Start transporting customer |
| **in_progress** | Hoàn thành chuyến đi | Mark customer as dropped off |
| **completed** | Đã hoàn thành | (Disabled - journey complete) |

### 5️⃣ Technical Details

**Console Logs to Monitor:**

```javascript
🔄 Passenger changed, updating map to: {
  name: "Anh Minh",
  pickup: [105.8234, 21.0456],
  dropoff: [105.8567, 21.0789],
  status: "in_progress"
}

🔄 Passenger swipe detected, new index: 1
```

**Map Update Flow:**
1. User swipes in passenger carousel
2. `currentPassengerIndex` changes
3. `currentPassenger` updates (derived from ride.customerId[index])
4. useEffect triggers on index/passenger change
5. Map animates to new customer's pickup location
6. Markers refresh based on new customer's status

### 6️⃣ Try It Out

1. **Multiple Passengers:** Create a ride with 2+ customers
2. **Start App:** Open driver app and go to active ride
3. **Watch Map:** See first customer's location
4. **Swipe Carousel:** Left/right on passenger cards
5. **Map Updates:** Observe location and markers change automatically
6. **Press Status Button:** Changes that customer's status
7. **Swipe Again:** See the updated status for next customer

### Files Modified:
- **ActiveRideScreen.tsx**
  - Added useEffect for passenger switching (line ~208)
  - Enhanced FlatList carousel logging (line ~832)
  - Map shows context-aware markers (status-based)
