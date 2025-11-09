import { Tenant, TenantStatus, ResearchInstance, InstanceStatus } from '../types/tenant.js';
import { KubernetesService } from './kubernetes.js';

export class TenantService {
  private kubernetesService: KubernetesService;
  private tenants: Map<string, Tenant>;

  constructor() {
    this.kubernetesService = new KubernetesService();
    this.tenants = new Map();
  }

  async createTenant(id: string, name: string): Promise<Tenant> {
    const namespace = `research-tenant-${id}`;
    
    // Create namespace in Kubernetes
    await this.kubernetesService.createNamespace(id);

    const tenant: Tenant = {
      id,
      name,
      namespace,
      createdAt: new Date(),
      status: TenantStatus.Active,
    };

    this.tenants.set(id, tenant);
    console.log(`Tenant created: ${id} (${name})`);
    
    return tenant;
  }

  async getTenant(id: string): Promise<Tenant | null> {
    return this.tenants.get(id) || null;
  }

  async listTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async createResearchInstance(tenantId: string, instanceId: string): Promise<ResearchInstance> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (tenant.status !== TenantStatus.Active) {
      throw new Error(`Tenant is not active: ${tenantId}`);
    }

    await this.kubernetesService.createResearchInstance(tenantId, instanceId);

    const instance: ResearchInstance = {
      id: instanceId,
      tenantId,
      name: `research-instance-${instanceId}`,
      status: InstanceStatus.Creating,
      createdAt: new Date(),
      namespace: tenant.namespace,
    };

    return instance;
  }

  async getResearchInstance(tenantId: string, instanceId: string): Promise<ResearchInstance | null> {
    const status = await this.kubernetesService.getResearchInstanceStatus(tenantId, instanceId);
    
    return {
      id: instanceId,
      tenantId,
      name: `research-instance-${instanceId}`,
      status,
      createdAt: new Date(), // In production, fetch from K8s metadata
      namespace: `research-tenant-${tenantId}`,
    };
  }

  async listResearchInstances(tenantId: string): Promise<ResearchInstance[]> {
    return await this.kubernetesService.listResearchInstances(tenantId);
  }

  async deleteResearchInstance(tenantId: string, instanceId: string): Promise<void> {
    await this.kubernetesService.deleteResearchInstance(tenantId, instanceId);
  }
}

