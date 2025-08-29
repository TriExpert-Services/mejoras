import { ProxmoxService } from '../../proxmox/proxmox.service';
import { PrismaService } from '../../prisma/prisma.service';

export const createSnapshotJob = (deps: { 
  pve: ProxmoxService; 
  prisma: PrismaService; 
}) => async (job: any) => {
  const { vmInstanceId, snapshotName, description } = job.data;

  const vmInstance = await deps.prisma.vMInstance.findUnique({
    where: { id: vmInstanceId },
  });

  if (!vmInstance) {
    throw new Error(`VM instance ${vmInstanceId} not found`);
  }

  console.log(`Creating snapshot ${snapshotName} for VM ${vmInstance.vmid}`);

  const upid = await deps.pve.createSnapshot(
    vmInstance.node,
    vmInstance.vmid,
    snapshotName,
    description
  );

  // Wait for snapshot creation to complete
  await deps.pve.waitForTask(vmInstance.node, upid);

  console.log(`Snapshot ${snapshotName} created for VM ${vmInstance.vmid}`);
};