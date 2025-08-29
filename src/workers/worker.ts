import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';
import { createProvisionJob } from '../queue/jobs/provision.job';
import { createPowerJob } from '../queue/jobs/power.job';
import { createSnapshotJob } from '../queue/jobs/snapshot.job';
import { config } from '../common/config';

async function startWorkers() {
  const connection = new IORedis(config.REDIS_URL);
  const pve = new ProxmoxService();
  const prisma = new PrismaService();

  // Initialize Prisma connection
  await prisma.$connect();

  // Create workers
  const provisionWorker = new Worker(
    'provision',
    createProvisionJob({ pve, prisma }),
    {
      connection,
      concurrency: 3,
    }
  );

  const powerWorker = new Worker(
    'power',
    createPowerJob({ pve, prisma }),
    {
      connection,
      concurrency: 5,
    }
  );

  const snapshotWorker = new Worker(
    'snapshot',
    createSnapshotJob({ pve, prisma }),
    {
      connection,
      concurrency: 2,
    }
  );

  // Error handling
  [provisionWorker, powerWorker, snapshotWorker].forEach((worker) => {
    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed in queue ${worker.name}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed in queue ${worker.name}:`, err);
    });

    worker.on('error', (err) => {
      console.error(`🚨 Worker error in ${worker.name}:`, err);
    });
  });

  console.log('🔧 Workers started:');
  console.log('  - provision (concurrency: 3)');
  console.log('  - power (concurrency: 5)');
  console.log('  - snapshot (concurrency: 2)');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down workers...');
    await Promise.all([
      provisionWorker.close(),
      powerWorker.close(),
      snapshotWorker.close(),
    ]);
    await prisma.$disconnect();
    process.exit(0);
  });
}

startWorkers().catch((error) => {
  console.error('Failed to start workers:', error);
  process.exit(1);
});