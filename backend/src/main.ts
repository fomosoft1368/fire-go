import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      'http://192.168.1.19:8081', // Mobile on local network
      'http://192.168.1.19:8082', // Mobile on local network
      'http://10.0.2.2:3000',    // Android emulator
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port} (or your LAN IP)`);
}
bootstrap();
