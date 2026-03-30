// API Configuration for Mobile Driver App

// 🌐 Đọc từ .env file: REACT_APP_API_URL=http://<YOUR_LAN_IP>:3000/api
// Android emulator: REACT_APP_API_URL=http://10.0.2.2:3000/api
// iOS simulator:    REACT_APP_API_URL=http://localhost:3000/api
// Real device:      REACT_APP_API_URL=http://<YOUR_LAN_IP>:3000/api
// Xem .env.example để biết thêm chi tiết

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
