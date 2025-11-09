import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module.js';

@Module({
  imports: [TenantsModule],
})
export class AppModule {}
