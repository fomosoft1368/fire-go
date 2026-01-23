import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Request logging middleware
  app.use((req, res, next) => {
    // Log request
    if (req.path.includes('/change-password') || req.path === '/api/customers/change-password') {
      console.log('[HTTP Middleware] Request detected:', {
        method: req.method,
        path: req.path,
        url: req.url,
        authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 50)}...` : 'missing',
      });
    }
    
    // Intercept response to log it
    const originalSend = res.send;
    res.send = function(data) {
      if (req.path.includes('/change-password') || req.path === '/api/customers/change-password') {
        console.log('[HTTP Response] Response for', req.path, ':', {
          statusCode: res.statusCode,
          data: typeof data === 'string' ? data : JSON.stringify(data),
        });
      }
      return originalSend.call(this, data);
    };
    
    next();
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Increase payload size limit for file uploads (images as base64)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',   // Web Admin (Vite)
      'http://localhost:3001',   // Web Admin alternative
      'http://localhost:8081',   // Mobile Customer (Expo)
      'http://localhost:8082',   // Mobile Customer (Expo alternative)
      'http://192.168.1.16:8081', // Mobile on local network
      'http://192.168.1.16:8082', // Mobile on local network
      'http://10.0.2.2:3000',    // Android emulator
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // Cho phép tất cả các field
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port} (or your LAN IP)`);
}
bootstrap();
