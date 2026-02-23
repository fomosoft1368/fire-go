# Lưu ảnh Vehicle Condition trong MongoDB (Temporary)

## Tổng quan
Hiện tại hệ thống lưu ảnh kiểm tra xe dưới dạng **base64 string** trong MongoDB. Đây là giải pháp tạm thời cho giai đoạn development, sau sẽ migrate sang Google Cloud Storage.

## ⚠️ Lưu ý quan trọng

**Ưu điểm:**
- ✅ Setup nhanh, không cần GCS
- ✅ Không tốn chi phí cloud storage
- ✅ Dễ test và debug

**Nhược điểm:**
- ❌ Tăng kích thước document MongoDB (mỗi ảnh ~500KB → ~700KB base64)
- ❌ Giới hạn 16MB/document của MongoDB (max ~20 ảnh chất lượng cao)
- ❌ Tốn bandwidth khi fetch (gửi toàn bộ base64 qua API)
- ❌ Không scalable cho production

## Cấu trúc dữ liệu

```javascript
{
  "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
  "customerId": "...",
  "driverId": "...",
  // ... other ride fields
  "vehicleCondition": {
    "preTrip": {
      "completed": true,
      "images": {
        "front": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "back": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "left": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "right": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "interior": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      },
      "capturedAt": "2026-02-07T09:00:00.000Z"
    },
    "postTrip": {
      "completed": false,
      "images": {},
      "capturedAt": null
    }
  }
}
```

## API Flow

### 1. Upload images (Mobile → Backend)

**Request:**
```http
POST /api/rides/:id/vehicle-condition/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "phase": "pre-trip",
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "pre-trip images uploaded successfully",
  "data": {
    "preTrip": {
      "completed": true,
      "images": {
        "front": "data:image/jpeg;base64,...",
        "back": "data:image/jpeg;base64,...",
        "left": "data:image/jpeg;base64,...",
        "right": "data:image/jpeg;base64,...",
        "interior": "data:image/jpeg;base64,..."
      },
      "capturedAt": "2026-02-07T09:00:00.000Z"
    },
    "postTrip": {
      "completed": false,
      "images": {},
      "capturedAt": null
    }
  }
}
```

## Cách sử dụng

### Mobile App (Driver)

```typescript
import { vehicleConditionService } from '../services/vehicleConditionService'

// Chụp ảnh
const handleTakePhoto = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8, // Giảm quality để giảm file size
  })
  
  if (!result.canceled) {
    setVehiclePhotos([...vehiclePhotos, result.assets[0].uri])
  }
}

// Upload
const handleConfirmVehicleCheck = async () => {
  const result = await vehicleConditionService.uploadVehicleCondition(
    rideId,
    'pre-trip',
    vehiclePhotos // Array of local URIs
  )
  
  console.log('Uploaded:', result.data)
}
```

### Backend

```typescript
// rides.service.ts đã tự động map images theo thứ tự:
// images[0] → front
// images[1] → back  
// images[2] → left
// images[3] → right
// images[4] → interior
```

## Performance Optimization

### 1. Giảm kích thước ảnh (Mobile)

```typescript
const result = await ImagePicker.launchCameraAsync({
  quality: 0.5,  // Giảm từ 0.8 → 0.5 (giảm ~50% size)
  aspect: [4, 3],
  allowsEditing: true,
})
```

### 2. Compress trước khi upload

```bash
npx expo install expo-image-manipulator
```

```typescript
import * as ImageManipulator from 'expo-image-manipulator'

const compressImage = async (uri: string) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }], // Resize về max-width 800px
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}
```

### 3. Lazy load ảnh khi hiển thị

```typescript
// Chỉ fetch khi cần xem
const viewVehicleCondition = async (rideId: string) => {
  const data = await vehicleConditionService.getVehicleCondition(rideId)
  // data.preTrip.images chứa base64 → hiển thị trong <Image>
}
```

## Migration Plan (GCS)

Khi ready migrate sang Google Cloud Storage:

1. **Setup GCS** theo [GOOGLE_CLOUD_STORAGE_SETUP.md](GOOGLE_CLOUD_STORAGE_SETUP.md)

2. **Update backend:**
   - Uncomment StorageService trong rides.service.ts
   - Thay đổi uploadVehicleCondition để upload file thực

3. **Update mobile:**
   - Gửi FormData thay vì JSON+base64
   - Không cần FileSystem.readAsStringAsync

4. **Migrate existing data:**
   ```javascript
   // Script migrate base64 → GCS
   const migrateVehicleImages = async () => {
     const rides = await Ride.find({ 'vehicleCondition.preTrip.completed': true })
     
     for (const ride of rides) {
       for (const [position, base64] of Object.entries(ride.vehicleCondition.preTrip.images)) {
         // Convert base64 → Buffer
         const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
         
         // Upload to GCS
         const url = await uploadToGCS(buffer, ride._id, 'pre-trip', position)
         
         // Update document
         ride.vehicleCondition.preTrip.images[position] = url
       }
       await ride.save()
     }
   }
   ```

## Testing

```bash
# Start backend
cd backend
npm run start:dev

# Start mobile app  
cd mobile-driver
npm start

# Test flow:
# 1. Vào màn hình TripActivities
# 2. Click "Kiểm tra xe"
# 3. Chụp 1-5 ảnh
# 4. Click "Xác nhận"
# 5. Kiểm tra MongoDB Compass:
#    rides collection → vehicleCondition field
```

## Ước tính Storage

**Giả định:**
- 100 rides/day
- 5 ảnh/ride (pre-trip)
- ~500 KB/ảnh gốc → ~700 KB base64 (tăng 40%)
- Total: 100 × 5 × 700 KB = 350 MB/day

**MongoDB Atlas Free Tier:** 512 MB
→ Chỉ đủ cho ~1.5 ngày ⚠️

**Giải pháp:**
1. Giảm quality ảnh (0.5) → ~250 KB base64 → 125 MB/day
2. Chỉ lưu ảnh quan trọng (front + interior) → 50 MB/day
3. **Khuyến nghị:** Migrate sang GCS càng sớm càng tốt

## Troubleshooting

### Error: "Document exceeds 16 MB"

- Giảm image quality
- Resize ảnh nhỏ hơn
- Giảm số lượng ảnh

### Upload chậm

- Compress ảnh trước khi upload
- Check network speed
- Tăng timeout

### Ảnh mờ khi hiển thị

- Tăng quality parameter
- Kiểm tra resize settings
