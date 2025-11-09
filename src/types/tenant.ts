export interface Tenant {
  id: string;
  name: string;
  namespace: string;
  createdAt: Date;
  status: TenantStatus;
}

export enum TenantStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
}

export interface Instance {
  id: string;
  tenantId: string;
  name: string;
  status: InstanceStatus;
  createdAt: Date;
  namespace: string;
}

export enum InstanceStatus {
  Creating = 'creating',
  Running = 'running',
  Stopped = 'stopped',
  Error = 'error',
}
