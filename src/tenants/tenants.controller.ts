import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import { CreateTenantDto } from '../dto/create-tenant.dto.js';
import type { Tenant } from '../types/tenant.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return await this.tenantsService.createTenant(createTenantDto.id, createTenantDto.name);
  }

  @Get()
  listTenants(): Tenant[] {
    return this.tenantsService.listTenants();
  }

  @Get(':id')
  async getTenant(@Param('id') id: string): Promise<Tenant> {
    const tenant = await this.tenantsService.getTenant(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }
}
