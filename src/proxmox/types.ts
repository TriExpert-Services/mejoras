export interface ProxmoxNode {
  node: string;
  status: 'online' | 'offline';
  maxcpu: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
}

export interface ProxmoxVM {
  vmid: number;
  name: string;
  status: 'running' | 'stopped' | 'suspended';
  maxcpu: number;
  maxmem: number;
  maxdisk: number;
  uptime?: number;
  cpu?: number;
  mem?: number;
  disk?: number;
}

export interface ProxmoxTask {
  upid: string;
  type: string;
  id: string;
  user: string;
  node: string;
  pid: number;
  pstart: number;
  starttime: number;
  status: 'running' | 'stopped';
  exitstatus?: string;
}

export interface CreateVMParams {
  vmid: number;
  name: string;
  cores: number;
  memory: number;
  scsi0?: string;
  ide2?: string;
  boot?: string;
  agent?: number;
  net0?: string;
  ipconfig0?: string;
  sshkeys?: string;
  ciuser?: string;
  ostype?: string;
}