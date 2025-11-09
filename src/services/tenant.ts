import { Tenant, TenantStatus, Instance, InstanceStatus } from '../types/tenant.js';
import { KubernetesService } from './kubernetes.js';

export class TenantService {
  private kubernetesService: KubernetesService;
  private tenants: Map<string, Tenant>;

  constructor() {
    this.kubernetesService = new KubernetesService();
    this.tenants = new Map();
  }

  async createTenant(id: string, name: string): Promise<Tenant> {
    const namespace = `tenant-${id}`;

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

  getTenant(id: string): Tenant | null {
    return this.tenants.get(id) ?? null;
  }

  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  async createInstance(tenantId: string, instanceId: string): Promise<Instance> {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (tenant.status !== TenantStatus.Active) {
      throw new Error(`Tenant is not active: ${tenantId}`);
    }

    await this.kubernetesService.createInstance(tenantId, instanceId);

    const instance: Instance = {
      id: instanceId,
      tenantId,
      name: `instance-${instanceId}`,
      status: InstanceStatus.Creating,
      createdAt: new Date(),
      namespace: tenant.namespace,
    };

    return instance;
  }

  async getInstance(tenantId: string, instanceId: string): Promise<Instance | null> {
    const status = await this.kubernetesService.getInstanceStatus(tenantId, instanceId);

    return {
      id: instanceId,
      tenantId,
      name: `instance-${instanceId}`,
      status,
      createdAt: new Date(), // In production, fetch from K8s metadata
      namespace: `tenant-${tenantId}`,
    };
  }

  async listInstances(tenantId: string): Promise<Instance[]> {
    return await this.kubernetesService.listInstances(tenantId);
  }

  async deleteInstance(tenantId: string, instanceId: string): Promise<void> {
    await this.kubernetesService.deleteInstance(tenantId, instanceId);
  }
}
