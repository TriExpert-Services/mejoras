import { ProxmoxService } from '../../proxmox/proxmox.service';
import { PrismaService } from '../../prisma/prisma.service';

export const createPowerJob = (deps: { 
  pve: ProxmoxService; 
  prisma: PrismaService; 
}) => async (job: any) => {
  const { vmInstanceId, action } = job.data;

  const vmInstance = await deps.prisma.vMInstance.findUnique({
    where: { id: vmInstanceId },
  });

  if (!vmInstance) {
    throw new Error(`VM instance ${vmInstanceId} not found`);
  }

  console.log(`Executing ${action} on VM ${vmInstance.vmid}`);

  let upid: string;
  let newState: string;

  switch (action) {
    case 'start':
      upid = await deps.pve.startVM(vmInstance.node, vmInstance.vmid);
      newState = 'RUNNING';
      break;
    case 'stop':
      upid = await deps.pve.stopVM(vmInstance.node, vmInstance.vmid);
      newState = 'STOPPED';
      break;
    case 'restart':
      upid = await deps.pve.restartVM(vmInstance.node, vmInstance.vmid);
      newState = 'RUNNING';
      break;
    default:
      throw new Error(`Unknown power action: ${action}`);
  }

  // Wait for task completion
  await deps.pve.waitForTask(vmInstance.node, upid);

  // Update VM state
  await deps.prisma.vMInstance.update({
    where: { id: vmInstanceId },
    data: { state: newState as any },
  });

  console.log(`Power action ${action} completed for VM ${vmInstance.vmid}`);
};