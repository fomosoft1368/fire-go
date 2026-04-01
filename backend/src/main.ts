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
    res.send = function (data) {
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
  const corsStaticOrigins = [
    process.env.CORS_WEB_ADMIN_VITE,
    process.env.CORS_WEB_ADMIN_ALT,
    process.env.CORS_MOBILE_CUSTOMER,
    process.env.CORS_MOBILE_CUSTOMER_ALT,
    process.env.CORS_LOCAL_NETWORK_1,
    process.env.CORS_LOCAL_NETWORK_2,
    process.env.CORS_ANDROID_EMULATOR,
    process.env.CORS_WEB_ADMIN_SERVER,
  ].filter(Boolean) as string[];

  const isDev = process.env.NODE_ENV !== 'production';

  app.enableCors({
    // Dùng callback để cho phép toàn bộ IP nội bộ (192.168.x.x, 10.x.x.x) trong dev
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Cho phép requests không có origin (mobile apps, Postman, curl...)
      if (!origin) return callback(null, true);

      // Luôn cho phép các origin trong danh sách tĩnh
      if (corsStaticOrigins.includes(origin)) return callback(null, true);

      // Trong môi trường dev: cho phép toàn bộ mạng nội bộ (IP thay đổi theo WiFi)
      if (isDev) {
        const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|localhost)(:\d+)?$/;
        if (localNetworkPattern.test(origin)) return callback(null, true);

        // Cho phép exp:// protocol của Expo Go
        if (origin.startsWith('exp://')) return callback(null, true);
      }

      callback(new Error(`CORS blocked: ${origin}`));
    },
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
  const host = process.env.HOST || 'localhost';
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://${host}:${port}`);
  console.log(`API Docs: http://${host}:${port}/api/docs`);
}
bootstrap();
