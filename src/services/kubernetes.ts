import * as k8s from '@kubernetes/client-node';
import { ResearchInstance, InstanceStatus } from '../types/tenant.js';

interface KubernetesError extends Error {
  body?: {
    reason?: string;
  };
  statusCode?: number;
}

function isKubernetesError(error: unknown): error is KubernetesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('body' in error || 'statusCode' in error)
  );
}

export class KubernetesService {
  private k8sApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async createNamespace(tenantId: string): Promise<void> {
    const namespace = {
      metadata: {
        name: `research-tenant-${tenantId}`,
        labels: {
          tenant: tenantId,
        },
      },
    };

    try {
      await this.coreApi.createNamespace(namespace);
      console.log(`Namespace created: research-tenant-${tenantId}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.body?.reason === 'AlreadyExists') {
        console.log(`Namespace already exists: research-tenant-${tenantId}`);
      } else {
        throw error;
      }
    }
  }

  async createResearchInstance(tenantId: string, instanceId: string): Promise<void> {
    const namespace = `research-tenant-${tenantId}`;

    // Create deployment
    const deployment: k8s.V1Deployment = {
      metadata: {
        name: `research-instance-${instanceId}`,
        namespace,
        labels: {
          app: 'research-instance',
          tenant: tenantId,
          instance: instanceId,
        },
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'research-instance',
            tenant: tenantId,
            instance: instanceId,
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'research-instance',
              tenant: tenantId,
              instance: instanceId,
            },
          },
          spec: {
            containers: [
              {
                name: 'research-container',
                image: 'nginx:alpine',
                ports: [{ containerPort: 80 }],
                env: [
                  { name: 'TENANT_ID', value: tenantId },
                  { name: 'INSTANCE_ID', value: instanceId },
                ],
                resources: {
                  requests: {
                    memory: '64Mi',
                    cpu: '100m',
                  },
                  limits: {
                    memory: '128Mi',
                    cpu: '200m',
                  },
                },
              },
            ],
          },
        },
      },
    };

    // Create service
    const service: k8s.V1Service = {
      metadata: {
        name: `research-instance-${instanceId}`,
        namespace,
        labels: {
          app: 'research-instance',
          tenant: tenantId,
          instance: instanceId,
        },
      },
      spec: {
        selector: {
          app: 'research-instance',
          tenant: tenantId,
          instance: instanceId,
        },
        ports: [
          {
            protocol: 'TCP',
            port: 80,
            targetPort: 80,
          },
        ],
        type: 'ClusterIP',
      },
    };

    try {
      await this.k8sApi.createNamespacedDeployment(namespace, deployment);
      console.log(`Deployment created: research-instance-${instanceId} in ${namespace}`);
      
      await this.coreApi.createNamespacedService(namespace, service);
      console.log(`Service created: research-instance-${instanceId} in ${namespace}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.body?.reason === 'AlreadyExists') {
        console.log(`Research instance already exists: ${instanceId}`);
      } else {
        throw error;
      }
    }
  }

  async getResearchInstanceStatus(
    tenantId: string,
    instanceId: string
  ): Promise<InstanceStatus> {
    const namespace = `research-tenant-${tenantId}`;

    try {
      const deployment = await this.k8sApi.readNamespacedDeployment(
        `research-instance-${instanceId}`,
        namespace
      );

      const replicas = deployment.body.spec?.replicas || 0;
      const readyReplicas = deployment.body.status?.readyReplicas || 0;

      if (readyReplicas === replicas && replicas > 0) {
        return InstanceStatus.Running;
      } else if (readyReplicas > 0) {
        return InstanceStatus.Creating;
      } else {
        return InstanceStatus.Stopped;
      }
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.statusCode === 404) {
        return InstanceStatus.Error;
      }
      throw error;
    }
  }

  async deleteResearchInstance(tenantId: string, instanceId: string): Promise<void> {
    const namespace = `research-tenant-${tenantId}`;

    try {
      await this.k8sApi.deleteNamespacedDeployment(
        `research-instance-${instanceId}`,
        namespace
      );
      console.log(`Deployment deleted: research-instance-${instanceId}`);

      await this.coreApi.deleteNamespacedService(
        `research-instance-${instanceId}`,
        namespace
      );
      console.log(`Service deleted: research-instance-${instanceId}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.statusCode === 404) {
        console.log(`Research instance not found: ${instanceId}`);
      } else {
        throw error;
      }
    }
  }

  async listResearchInstances(tenantId: string): Promise<ResearchInstance[]> {
    const namespace = `research-tenant-${tenantId}`;

    try {
      const response = await this.k8sApi.listNamespacedDeployment(namespace);
      const instances: ResearchInstance[] = [];

      for (const deployment of response.body.items) {
        const instanceId = deployment.metadata?.labels?.instance || 'unknown';
        const status = await this.getResearchInstanceStatus(tenantId, instanceId);

        instances.push({
          id: instanceId,
          tenantId,
          name: deployment.metadata?.name || instanceId,
          status,
          createdAt: deployment.metadata?.creationTimestamp
            ? new Date(deployment.metadata.creationTimestamp)
            : new Date(),
          namespace,
        });
      }

      return instances;
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }
}

