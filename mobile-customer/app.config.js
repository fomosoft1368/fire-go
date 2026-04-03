// app.config.js — đọc .env và inject vào Constants.expoConfig.extra
// Expo CLI tự load .env trước khi chạy file này (Node context)
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.12:3000/api'
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

console.log('[app.config.js] 🌐 API_URL from .env:', API_URL)
console.log('[app.config.js] 🗺️ GOOGLE_MAPS_API_KEY: được quản lý trong DB (remoteConfig sẽ fetch khi app khởi động)')

const appJson = require('./app.json')

module.exports = {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  extra: {
    ...appJson.expo.extra,
    apiUrl: API_URL,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  },
}
