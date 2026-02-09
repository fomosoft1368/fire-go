# Google Cloud Storage Setup Guide

## Tổng quan
Hệ thống lưu trữ ảnh vehicle condition (kiểm tra tình trạng xe) sử dụng Google Cloud Storage.

## Backend Dependencies

Thêm các package sau vào `backend/package.json`:

```bash
cd backend
npm install @google-cloud/storage uuid
npm install --save-dev @types/uuid @types/multer
```

## Google Cloud Storage Setup

### 1. Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Enable Cloud Storage API:
   - Vào **APIs & Services** > **Library**
   - Tìm "Cloud Storage API"
   - Click **Enable**

### 2. Tạo Service Account

1. Vào **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Đặt tên: `fire-go-storage-service`
4. Grant role: **Storage Admin**
5. Click **Done**

### 3. Tạo Key File

1. Click vào service account vừa tạo
2. Vào tab **Keys**
3. Click **Add Key** > **Create new key**
4. Chọn **JSON**
5. Download file JSON về máy
6. Đổi tên file thành `fire-go-gcs-key.json`
7. Copy vào folder `backend/` (cùng cấp với `src/`)

**⚠️ QUAN TRỌNG**: Thêm vào `.gitignore`:
```
fire-go-gcs-key.json
```

### 4. Tạo Cloud Storage Bucket

1. Vào **Cloud Storage** > **Buckets**
2. Click **Create Bucket**
3. Bucket name: `fire-go-vehicle-images` (hoặc tên khác)
4. Location type: **Region** (chọn region gần Vietnam, vd: `asia-southeast1`)
5. Storage class: **Standard**
6. Access control: **Uniform**
7. Click **Create**

### 5. Cấu hình Backend

Thêm vào `backend/.env`:

```env
# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=fire-go-vehicle-images
GCS_KEY_FILE=./fire-go-gcs-key.json
```

**Lấy PROJECT_ID**: 
- Vào Google Cloud Console
- Xem ở góc trên cùng bên trái, bên cạnh tên project

## Cấu trúc lưu trữ

```
fire-go-vehicle-images/
└── vehicle-condition/
    └── {rideId}/
        ├── pre-trip/
        │   ├── front.jpg
        │   ├── back.jpg
        │   ├── left.jpg
        │   ├── right.jpg
        │   └── interior.jpg
        └── post-trip/
            ├── front.jpg
            ├── back.jpg
            ├── left.jpg
            ├── right.jpg
            └── interior.jpg
```

## Mobile App Dependencies

```bash
cd mobile-driver
npx expo install expo-image-picker
```

## API Endpoints

### 1. Upload vehicle condition images
```
POST /api/rides/:id/vehicle-condition/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- phase: 'pre-trip' | 'post-trip'
- images: File[] (max 5 images)
```

Response:
```json
{
  "success": true,
  "message": "pre-trip images uploaded successfully",
  "data": {
    "preTrip": {
      "completed": true,
      "images": {
        "front": "https://storage.googleapis.com/fire-go-vehicle-images/vehicle-condition/123/pre-trip/front.jpg",
        "back": "https://storage.googleapis.com/fire-go-vehicle-images/vehicle-condition/123/pre-trip/back.jpg",
        "left": "https://storage.googleapis.com/fire-go-vehicle-images/vehicle-condition/123/pre-trip/left.jpg",
        "right": "https://storage.googleapis.com/fire-go-vehicle-images/vehicle-condition/123/pre-trip/right.jpg",
        "interior": "https://storage.googleapis.com/fire-go-vehicle-images/vehicle-condition/123/pre-trip/interior.jpg"
      },
      "capturedAt": "2026-02-07T09:00:00Z"
    },
    "postTrip": {
      "completed": false,
      "images": {},
      "capturedAt": null
    }
  }
}
```

### 2. Get vehicle condition
```
GET /api/rides/:id/vehicle-condition
Authorization: Bearer {token}
```

## Alternative: Local Storage (Development)

Nếu chưa setup GCS, có thể lưu tạm local:

1. Comment StorageService trong `rides.service.ts`
2. Lưu base64 string vào MongoDB thay vì URL:

```typescript
// Trong handleConfirmVehicleCheck
const base64Images = await Promise.all(
  vehiclePhotos.map(async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  })
);
```

**⚠️ Lưu ý**: Không nên lưu base64 vào DB cho production (file size lớn).

## Testing

### Test upload từ mobile app:

1. Start backend: `cd backend && npm run start:dev`
2. Start mobile app: `cd mobile-driver && npm start`
3. Vào màn hình TripActivities
4. Click "Kiểm tra xe"
5. Chụp 1-5 ảnh
6. Click "Xác nhận"
7. Kiểm tra console logs và MongoDB

### Kiểm tra trên GCS:

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Cloud Storage > Buckets
3. Click vào bucket `fire-go-vehicle-images`
4. Xem folder `vehicle-condition/{rideId}/pre-trip/`

## Pricing

**Google Cloud Storage** (Standard class, Southeast Asia):
- Storage: $0.020 per GB/month
- Class A operations (upload): $0.05 per 10,000 operations
- Class B operations (read): $0.004 per 10,000 operations
- Network egress: $0.12 per GB (đến Vietnam)

**Ước tính chi phí** (100 rides/day, 5 ảnh/ride, 500KB/ảnh):
- Storage: ~250 MB/day = 7.5 GB/month = $0.15/month
- Upload ops: 500 uploads/day = $0.075/month
- **Total: ~$0.30/month** cho storage + upload

Network egress (khi user xem ảnh) sẽ tốn thêm phí.

## Security Best Practices

1. **Không commit key file** vào Git
2. **Sử dụng IAM roles** hạn chế quyền truy cập
3. **Enable CORS** nếu cần truy cập từ web:
   ```bash
   gsutil cors set cors.json gs://fire-go-vehicle-images
   ```
   
   `cors.json`:
   ```json
   [
     {
       "origin": ["https://yourapp.com"],
       "method": ["GET"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

4. **Set lifecycle policy** để tự động xóa ảnh cũ:
   ```json
   {
     "lifecycle": {
       "rule": [
         {
           "action": { "type": "Delete" },
           "condition": {
             "age": 90
           }
         }
       ]
     }
   }
   ```

## Troubleshooting

### Error: "Could not load the default credentials"

- Kiểm tra `GCS_KEY_FILE` path trong `.env`
- Đảm bảo file JSON tồn tại
- Kiểm tra quyền đọc file

### Error: "Permission denied"

- Kiểm tra Service Account có role **Storage Admin**
- Kiểm tra bucket name đúng

### Upload timeout

- Tăng timeout trong Multer config
- Kiểm tra network connection
- Giảm kích thước ảnh (quality trong ImagePicker)

### Images không hiển thị

- Kiểm tra ảnh đã public chưa (`blob.makePublic()`)
- Kiểm tra URL trả về
- Test URL trực tiếp trên browser
