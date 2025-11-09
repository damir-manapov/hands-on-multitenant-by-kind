import * as k8s from '@kubernetes/client-node';
import { Instance, InstanceStatus } from '../types/tenant.js';

interface KubernetesError extends Error {
  body?:
    | string
    | {
        reason?: string;
      };
  statusCode?: number;
  code?: number;
}

function isKubernetesError(error: unknown): error is KubernetesError {
  return typeof error === 'object' && error !== null && ('body' in error || 'statusCode' in error);
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
    const namespace: k8s.V1Namespace = {
      metadata: {
        name: `tenant-${tenantId}`,
        labels: {
          tenant: tenantId,
        },
      },
    };

    try {
      await this.coreApi.createNamespace({ body: namespace });
      console.log(`Namespace created: tenant-${tenantId}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && (error.statusCode === 409 || error.code === 409)) {
        console.log(`Namespace already exists: tenant-${tenantId}`);
      } else {
        throw error;
      }
    }
  }

  async createInstance(tenantId: string, instanceId: string): Promise<void> {
    const namespace = `tenant-${tenantId}`;

    // Create deployment
    const deployment: k8s.V1Deployment = {
      metadata: {
        name: `instance-${instanceId}`,
        namespace,
        labels: {
          app: 'instance',
          tenant: tenantId,
          instance: instanceId,
        },
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'instance',
            tenant: tenantId,
            instance: instanceId,
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'instance',
              tenant: tenantId,
              instance: instanceId,
            },
          },
          spec: {
            containers: [
              {
                name: 'app-container',
                image: 'tenant-app:latest',
                imagePullPolicy: 'Never',
                ports: [{ containerPort: 9090 }],
                env: [
                  { name: 'TENANT_ID', value: tenantId },
                  { name: 'INSTANCE_ID', value: instanceId },
                  { name: 'PORT', value: '9090' },
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
        name: `instance-${instanceId}`,
        namespace,
        labels: {
          app: 'instance',
          tenant: tenantId,
          instance: instanceId,
        },
      },
      spec: {
        selector: {
          app: 'instance',
          tenant: tenantId,
          instance: instanceId,
        },
        ports: [
          {
            protocol: 'TCP',
            port: 9090,
            targetPort: 9090,
          },
        ],
        type: 'ClusterIP',
      },
    };

    try {
      await this.k8sApi.createNamespacedDeployment({ namespace, body: deployment });
      console.log(`Deployment created: instance-${instanceId} in ${namespace}`);

      await this.coreApi.createNamespacedService({ namespace, body: service });
      console.log(`Service created: instance-${instanceId} in ${namespace}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && (error.statusCode === 409 || error.code === 409)) {
        console.log(`Instance already exists: ${instanceId}`);
      } else {
        throw error;
      }
    }
  }

  async getInstanceStatus(tenantId: string, instanceId: string): Promise<InstanceStatus> {
    const namespace = `tenant-${tenantId}`;

    try {
      const deployment = await this.k8sApi.readNamespacedDeployment({
        name: `instance-${instanceId}`,
        namespace,
      });

      const replicas: number = deployment.spec?.replicas ?? 0;
      const readyReplicas: number = deployment.status?.readyReplicas ?? 0;

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

  async deleteInstance(tenantId: string, instanceId: string): Promise<void> {
    const namespace = `tenant-${tenantId}`;

    try {
      await this.k8sApi.deleteNamespacedDeployment({
        name: `instance-${instanceId}`,
        namespace,
      });
      console.log(`Deployment deleted: instance-${instanceId}`);

      await this.coreApi.deleteNamespacedService({
        name: `instance-${instanceId}`,
        namespace,
      });
      console.log(`Service deleted: instance-${instanceId}`);
    } catch (error: unknown) {
      if (isKubernetesError(error) && error.statusCode === 404) {
        console.log(`Instance not found: ${instanceId}`);
      } else {
        throw error;
      }
    }
  }

  async listInstances(tenantId: string): Promise<Instance[]> {
    const namespace = `tenant-${tenantId}`;

    try {
      const response = await this.k8sApi.listNamespacedDeployment({ namespace });
      const instances: Instance[] = [];

      for (const deployment of response.items) {
        const instanceId: string = deployment.metadata?.labels?.['instance'] ?? 'unknown';
        const status = await this.getInstanceStatus(tenantId, instanceId);

        const name: string = deployment.metadata?.name ?? instanceId;
        const createdAt: Date = deployment.metadata?.creationTimestamp
          ? new Date(deployment.metadata.creationTimestamp)
          : new Date();

        instances.push({
          id: instanceId,
          tenantId,
          name,
          status,
          createdAt,
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
