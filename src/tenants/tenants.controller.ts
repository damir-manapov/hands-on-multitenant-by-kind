import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import { CreateTenantDto } from '../dto/create-tenant.dto.js';
import { CreateInstanceDto } from '../dto/create-instance.dto.js';
import type { Tenant, Instance } from '../types/tenant.js';

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
  getTenant(@Param('id') id: string): Tenant {
    const tenant = this.tenantsService.getTenant(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  @Post(':id/instances')
  @HttpCode(HttpStatus.CREATED)
  async createInstance(
    @Param('id') tenantId: string,
    @Body() createInstanceDto: CreateInstanceDto,
  ): Promise<Instance> {
    return await this.tenantsService.createInstance(tenantId, createInstanceDto.instanceId);
  }

  @Get(':id/instances')
  async listInstances(@Param('id') tenantId: string): Promise<Instance[]> {
    return await this.tenantsService.listInstances(tenantId);
  }

  @Get(':id/instances/:instanceId')
  async getInstance(
    @Param('id') tenantId: string,
    @Param('instanceId') instanceId: string,
  ): Promise<Instance> {
    const instance = await this.tenantsService.getInstance(tenantId, instanceId);
    if (!instance) {
      throw new NotFoundException(`Instance ${instanceId} not found for tenant ${tenantId}`);
    }
    return instance;
  }

  @Delete(':id/instances/:instanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInstance(
    @Param('id') tenantId: string,
    @Param('instanceId') instanceId: string,
  ): Promise<void> {
    await this.tenantsService.deleteInstance(tenantId, instanceId);
  }
}
