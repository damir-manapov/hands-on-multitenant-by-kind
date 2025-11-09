import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = Number.parseInt(process.env['PORT'] || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log('🚀 Multitenant Spinning App API');
  console.log('================================');
  console.log(`API is running on http://0.0.0.0:${port}/api`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /api/health');
  console.log('  POST   /api/tenants');
  console.log('  GET    /api/tenants');
  console.log('  GET    /api/tenants/:id');
}

bootstrap().catch(console.error);
