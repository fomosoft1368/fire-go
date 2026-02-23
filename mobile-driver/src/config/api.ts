// API Configuration for Mobile Driver App

// Sử dụng IP của máy local - thay đổi theo IP của bạn
// Android emulator: 10.0.2.2 (localhost của máy host)
// iOS simulator: localhost hoặc 127.0.0.1
// Real device: IP của máy trên mạng LAN (vd: 192.168.1.16)

export const API_URL = 'http://192.168.1.16:3000/api'

// Có thể dùng environment variable nếu cần
// export const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.16:3000/api'
