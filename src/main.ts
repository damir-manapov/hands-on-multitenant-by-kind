import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(3000);
  console.log('🚀 Multitenant Spinning App API');
  console.log('================================');
  console.log('API is running on http://localhost:3000/api');
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/tenants');
  console.log('  GET    /api/tenants');
  console.log('  GET    /api/tenants/:id');
}

bootstrap().catch(console.error);
