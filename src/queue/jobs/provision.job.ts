import { ProxmoxService } from '../../proxmox/proxmox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { config } from '../../common/config';

export const createProvisionJob = (deps: { 
  pve: ProxmoxService; 
  prisma: PrismaService; 
}) => async (job: any) => {
  const { 
    orderId, vmid, hostname, node, cpu, ramMb, diskGb, vlan, ip, planId, userId 
  } = job.data;

  console.log(`Starting VM provisioning for order ${orderId}, VMID ${vmid}`);

  try {
    // Clone from template and configure
    const cloneUpid = await deps.pve.cloneVM(
      node,
      config.PVE_TEMPLATE_VMID,
      vmid,
      {
        name: hostname,
        full: 1, // Full clone
      }
    );

    // Wait for clone to complete
    await deps.pve.waitForTask(node, cloneUpid);

    // Configure VM resources
    await deps.pve.configVM(node, vmid, {
      cores: cpu,
      memory: ramMb,
      net0: `virtio,bridge=${config.PVE_DEFAULT_BRIDGE}${vlan ? `,tag=${vlan}` : ''}`,
      ipconfig0: ip ? `ip=${ip}/24,gw=${ip.split('.').slice(0,3).join('.')}.1` : 'ip=dhcp',
      ciuser: config.PVE_CI_USER,
      sshkeys: config.PVE_SSH_KEYS ? encodeURIComponent(config.PVE_SSH_KEYS) : undefined,
    });

    // Resize disk if needed
    const targetDiskSize = `${diskGb}G`;
    await deps.pve.resizeDisk(node, vmid, 'scsi0', targetDiskSize);

    // Start VM
    const startUpid = await deps.pve.startVM(node, vmid);
    await deps.pve.waitForTask(node, startUpid);

    // Create VM record in database
    await deps.prisma.vMInstance.create({
      data: {
        vmid,
        node,
        hostname,
        vlan,
        ip,
        userId,
        planId,
        state: 'RUNNING',
      },
    });

    console.log(`VM ${vmid} provisioned successfully for order ${orderId}`);

  } catch (error) {
    console.error(`Provisioning failed for order ${orderId}:`, error);
    
    // Update any VM records to error state
    await deps.prisma.vMInstance.updateMany({
      where: { vmid, node },
      data: { state: 'ERROR' },
    });

    throw error;
  }
};