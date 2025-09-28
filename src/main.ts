import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  // Add request logging middleware
  app.use((req, res, next) => {
    if (req.url.startsWith('/v1/auth/')) {
      console.log('🌐 Auth request:', req.method, req.url, req.headers.origin);
    }
    next();
  });

  // CORS configuration for cookie-based auth
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [
          process.env.WEB_URL,
          process.env.APP_URL,
          'https://streami-frontend.vercel.app',
          'https://streami-frontend.vercel.app/',
        ].filter(Boolean)
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://localhost:3001',
          'http://localhost:8080',
          'https://streami-frontend.vercel.app',
        ];

  app.enableCors({
    origin: allowedOrigins.filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('Streami API')
    .setDescription('Streami Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('tokens', 'Token management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('at', {
      type: 'apiKey',
      in: 'cookie',
      name: 'at',
      description: 'Access token cookie (httpOnly)',
    })
    .addCookieAuth('rt', {
      type: 'apiKey',
      in: 'cookie',
      name: 'rt',
      description: 'Refresh token cookie (httpOnly)',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Streami API Docs',
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Web Server ${process.env.WEB_URL}`);
  console.log(
    `Swagger Documentation: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
