# Hướng dẫn cài đặt Google Maps cho React Native (Expo)

## 📦 Cài đặt package

```bash
cd mobile-customer
npx expo install react-native-maps
```

## 🔑 Cấu hình Google Maps API Key

### 1. Cập nhật app.json

Thêm Google Maps API key vào file `app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyAai1d44WZ45BaJdj-LCldBozmjconjRos"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSyAai1d44WZ45BaJdj-LCldBozmjconjRos"
      }
    }
  }
}
```

### 2. Rebuild app (nếu dùng Expo Go)

```bash
# Dừng app hiện tại (Ctrl+C)
npx expo start -c
```

## 🎯 Kiểm tra

Sau khi cài đặt, bạn sẽ thấy:
- ✅ Bản đồ Google Maps thật thay vì placeholder
- ✅ Có thể zoom, pan, xem vị trí hiện tại
- ✅ Click vào bản đồ để chọn địa điểm

## ⚠️ Lưu ý quan trọng

### Nếu dùng Expo Go:
- **react-native-maps** được hỗ trợ sẵn trong Expo Go
- Chỉ cần cấu hình API key trong `app.json`

### Nếu dùng bare React Native:
- Cần cấu hình thêm cho Android/iOS native
- Xem: https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md

## 🔧 Troubleshooting

### Bản đồ không hiển thị:
1. Kiểm tra API key đã enable **Maps SDK for Android/iOS**
2. Restart app: `npx expo start -c`
3. Kiểm tra console có lỗi không

### Blank map (bản đồ trắng):
1. Enable **Maps SDK** trên Google Cloud Console
2. Chờ vài phút để API key có hiệu lực
3. Clear cache và rebuild

## 📚 Tài liệu

- [Expo Maps](https://docs.expo.dev/versions/latest/sdk/map-view/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
