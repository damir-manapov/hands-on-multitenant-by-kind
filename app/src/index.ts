import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;
const TENANT_ID = process.env.TENANT_ID || 'unknown';
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';
const START_TIME = new Date().toISOString();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Tenant Application',
    tenantId: TENANT_ID,
    instanceId: INSTANCE_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    tenantId: TENANT_ID,
    instanceId: INSTANCE_ID,
    uptime: process.uptime(),
  });
});

app.get('/inspect', (req, res) => {
  res.json({
    tenantId: TENANT_ID,
    instanceId: INSTANCE_ID,
    startTime: START_TIME,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      port: PORT,
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Tenant app running on port ${PORT}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Instance ID: ${INSTANCE_ID}`);
});

