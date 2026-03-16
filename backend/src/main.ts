import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

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
  const corsOrigins = [
    process.env.CORS_WEB_ADMIN_VITE,
    process.env.CORS_WEB_ADMIN_ALT,
    process.env.CORS_MOBILE_CUSTOMER,
    process.env.CORS_MOBILE_CUSTOMER_ALT,
    process.env.CORS_LOCAL_NETWORK_1,
    process.env.CORS_LOCAL_NETWORK_2,
    process.env.CORS_ANDROID_EMULATOR,
  ].filter(Boolean); // Remove undefined values

  app.enableCors({
    origin: corsOrigins,
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
