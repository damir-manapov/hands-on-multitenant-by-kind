import { TenantService } from './services/tenant.js';

async function main(): Promise<void> {
  console.log('🚀 Multitenant Research Spinning App');
  console.log('=====================================\n');

  const tenantService = new TenantService();

  try {
    // Example: Create a tenant
    console.log('Creating tenant "acme"...');
    const tenant = await tenantService.createTenant('acme', 'Acme Corporation');
    console.log(`✅ Tenant created: ${tenant.id}\n`);

    // Example: Create a research instance for the tenant
    console.log('Creating research instance "instance-1" for tenant "acme"...');
    const instance = await tenantService.createResearchInstance('acme', 'instance-1');
    console.log(`✅ Research instance created: ${instance.id}\n`);

    // Wait a bit for the instance to start
    console.log('Waiting for instance to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check instance status
    const instanceStatus = await tenantService.getResearchInstance('acme', 'instance-1');
    console.log(`📊 Instance status: ${instanceStatus?.status}\n`);

    // List all instances for the tenant
    console.log('Listing all research instances for tenant "acme"...');
    const instances = await tenantService.listResearchInstances('acme');
    console.log(`📋 Found ${instances.length} instance(s):`);
    instances.forEach(inst => {
      console.log(`  - ${inst.id}: ${inst.status}`);
    });

    console.log('\n✨ Demo completed successfully!');
    console.log('\nTo interact with the cluster, use kubectl:');
    console.log('  kubectl get namespaces');
    console.log('  kubectl get deployments -n research-tenant-acme');
    console.log('  kubectl get services -n research-tenant-acme');

  } catch (error: unknown) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

