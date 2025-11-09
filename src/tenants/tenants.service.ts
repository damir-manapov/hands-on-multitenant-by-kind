import { Injectable } from '@nestjs/common';
import { TenantService } from '../services/tenant.js';
import { Tenant, Instance } from '../types/tenant.js';

@Injectable()
export class TenantsService {
  private readonly tenantService: TenantService;

  constructor() {
    this.tenantService = new TenantService();
  }

  async createTenant(id: string, name: string): Promise<Tenant> {
    return await this.tenantService.createTenant(id, name);
  }

  getTenant(id: string): Tenant | null {
    return this.tenantService.getTenant(id);
  }

  listTenants(): Tenant[] {
    return this.tenantService.listTenants();
  }

  async createInstance(tenantId: string, instanceId: string): Promise<Instance> {
    return await this.tenantService.createInstance(tenantId, instanceId);
  }

  async getInstance(tenantId: string, instanceId: string): Promise<Instance | null> {
    return await this.tenantService.getInstance(tenantId, instanceId);
  }

  async listInstances(tenantId: string): Promise<Instance[]> {
    return await this.tenantService.listInstances(tenantId);
  }

  async deleteInstance(tenantId: string, instanceId: string): Promise<void> {
    await this.tenantService.deleteInstance(tenantId, instanceId);
  }
}
