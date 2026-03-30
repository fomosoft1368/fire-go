# FireGo - Rideshare Platform

Nền tảng ghép xe hiện đại với các ứng dụng toàn diện:
- **Backend API**: NestJS + MongoDB
- **Web Admin Dashboard**: React + Vite + TypeScript
- **Mobile Driver App**: React Native
- **Mobile Customer App**: React Native

## 📋 Cấu trúc Dự án

```
fire-go/
├── backend/              # NestJS API Server
├── web-admin/            # React Admin Dashboard
├── mobile-driver/        # React Native Driver App
├── mobile-customer/      # React Native Customer App
├── docs/                 # API & Database Documentation
├── docker-compose.yml    # Docker Configuration
├── package.json          # Monorepo Configuration
└── README.md
```

## 🔧 Yêu cầu

- **Node.js** >= 20.x
- **npm** >= 10.x hoặc **yarn**
- **Docker** & **Docker Compose** (để chạy MongoDB)
- **Android Studio** (cho development Android)
- **Xcode** (cho development iOS)
- **Git**

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd fire-go

# 2. Install all dependencies
npm install

# 3. Start MongoDB with Docker
docker-compose up -d

# 4. Setup environment files
cp backend/.env.example backend/.env
cp web-admin/.env.example web-admin/.env

# 5. Start development servers
npm run dev
```

**Truy cập:**
<<<<<<< Updated upstream
- 🚀 Backend API: http://192.168.1.10:3000/api
- 💼 Web Admin: http://192.168.1.10:5173
- 📊 API Docs: http://192.168.1.10:3000/api/docs
=======
- 🚀 Backend API: http://192.168.1.14:3000/api
- 💼 Web Admin: http://192.168.1.14:5173
- 📊 API Docs: http://192.168.1.14:3000/api/docs
>>>>>>> Stashed changes

## 📖 Cài đặt Chi tiết

### 1. Backend (NestJS)

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

<<<<<<< Updated upstream
**Server:** http://192.168.1.10:3000  
**API Docs:** http://192.168.1.10:3000/api/docs
=======
**Server:** http://192.168.1.14:3000  
**API Docs:** http://192.168.1.14:3000/api/docs
>>>>>>> Stashed changes

### 2. Web Admin (React)

```bash
cd web-admin
npm install
cp .env.example .env
npm run dev
```

<<<<<<< Updated upstream
**Dashboard:** http://192.168.1.10:5173
=======
**Dashboard:** http://192.168.1.14:5173
>>>>>>> Stashed changes

### 3. Mobile Driver App

```bash
cd mobile-driver
npm install

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios
```

### 4. Mobile Customer App

```bash
cd mobile-customer
npm install

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios
```

## 📝 Scripts NPM

### Monorepo Commands
```bash
npm run install:all      # Cài đặt tất cả dependencies
npm run dev              # Dev: Backend + Web Admin
npm run dev:full         # Dev: Backend + Web Admin + Mobile Customer
npm run build            # Build: Backend + Web Admin
npm run lint             # Kiểm tra code style
npm run test             # Chạy tests
npm run docker:up        # Khởi động Docker containers
npm run docker:down      # Dừng Docker containers
npm run docker:logs      # Xem Docker logs
```

### Backend Commands
```bash
npm run start:dev        # Development mode
npm run build            # Build for production
npm run lint             # Kiểm tra code style
npm test                 # Chạy tests
npm run typeorm:migration:create   # Tạo migration mới
```

### Web Admin Commands
```bash
npm run dev              # Development server
npm run build            # Build for production
npm run lint             # Kiểm tra code style
npm run type-check       # TypeScript type checking
```

### Mobile Apps Commands
```bash
npm run android          # Chạy trên Android
npm run ios              # Chạy trên iOS
npm run lint             # Kiểm tra code style
```

## 🛠️ Công nghệ Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL Database
- **Mongoose** - MongoDB Object Modeling
- **JWT** - Token-based Authentication
- **Passport.js** - Authentication Middleware
- **Class Validator** - Data Validation
- **TypeScript** - Type Safety

### Web Admin
- **React 18** - UI Library
- **Vite** - Lightning-fast build tool
- **TypeScript** - Type Safety
- **React Router v6** - Client-side Routing
- **Ant Design** - Enterprise UI Components
- **Zustand** - State Management
- **Axios** - HTTP Client
- **TailwindCSS** - Utility-first CSS

### Mobile Apps
- **React Native** - Cross-platform Mobile Framework
- **React Navigation** - Routing & Navigation
- **Redux Toolkit** - State Management
- **Axios** - HTTP Client
- **React Native Maps** - Maps Integration
- **TypeScript** - Type Safety

## 💾 Database

FireGo sử dụng **MongoDB** cho data storage.

**Default Connection:**
<<<<<<< Updated upstream
- **Host:** 192.168.1.10
=======
- **Host:** 192.168.1.14
>>>>>>> Stashed changes
- **Port:** 27017
- **Username:** admin
- **Password:** password123
- **Database:** dat_xe

Xem chi tiết schema tại [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

## 📚 Documentation

- [Backend Setup Guide](docs/BACKEND_SETUP.md)
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🆘 Troubleshooting

### MongoDB Connection Error
```bash
# Khởi động MongoDB bằng Docker
docker-compose up -d mongodb

# Hoặc kiểm tra MongoDB đang chạy
docker ps | grep mongodb
```

### Port Already in Use
Thay đổi port trong file `.env` hoặc `docker-compose.yml`

### Dependencies Issues
```bash
# Xóa node_modules và reinstall
npm run install:all
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📂 Project Structure Standards

- **Components** nên trong folder `components/`
- **Screens/Pages** nên trong folder `screens/` hoặc `pages/`
- **Services** (API calls) nên trong folder `services/`
- **Redux slices** nên trong folder `redux/slices/`
- **Utilities** nên trong folder `utils/`
- **Types/Interfaces** nên trong folder `types/`

## 📄 License

UNLICENSED - Private Project

## 📞 Contact & Support

- **Email:** support@firego.com
- **Issues:** GitHub Issues
- **Documentation:** See `docs/` folder
