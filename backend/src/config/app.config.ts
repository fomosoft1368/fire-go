// Configuration files

import { MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * MongoDB Configuration
 */
export const mongooseConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH',
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

/**
 * JWT Configuration
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  expiresIn: process.env.JWT_EXPIRATION || '7d', // Tăng từ 24h thành 7 ngày
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
  refreshExpiresIn: '30d',
};

/**
 * CORS Configuration
 */
export const corsConfig = {
  origin: [
<<<<<<< HEAD
    'http://localhost:5173',      // Web Admin (Vite dev)
    'http://localhost:3001',      // Web Admin alternative
    'http://localhost:8081',      // Mobile Customer (Expo)
    'http://192.168.1.16:8081',    // Mobile on local network
    'http://192.168.1.16:8082',    // Mobile on local network
    'http://10.0.2.2:3000',       // Android emulator
  ],
=======
    process.env.CORS_WEB_ADMIN_VITE,
    process.env.CORS_WEB_ADMIN_ALT,
    process.env.CORS_MOBILE_CUSTOMER,
    process.env.CORS_MOBILE_CUSTOMER_ALT,
    process.env.CORS_LOCAL_NETWORK_1,
    process.env.CORS_LOCAL_NETWORK_2,
    process.env.CORS_ANDROID_EMULATOR,
  ].filter(Boolean), // Remove undefined values
>>>>>>> a157af2b83efad212d526bededc568d9cc216aeb
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/**
 * Server Configuration
 */
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
};

/**
 * File Upload Configuration
 */
export const fileConfig = {
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],
};

/**
 * Rate Limiting Configuration
 */
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
};

/**
 * Logger Configuration
 */
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'debug',
  format: 'json',
  timestamp: true,
};
