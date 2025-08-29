import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { Injectable } from '@nestjs/common';
import { config } from '../common/config';

@Injectable()
export class ProxmoxService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.PVE_API_URL,
      headers: {
        Authorization: `PVEAPIToken=${config.PVE_TOKEN_ID}=${config.PVE_TOKEN_SECRET}`,
      },
      httpsAgent: new https.Agent({ 
        rejectUnauthorized: !config.PVE_TLS_INSECURE 
      }),
    });
  }

  async listNodes() {
    const { data } = await this.http.get('/nodes');
    return data.data;
  }

  async createVM(node: string, params: any) {
    const { data } = await this.http.post(`/nodes/${node}/qemu`, params);
    return data.data; // returns UPID
  }

  async cloneVM(node: string, sourceVmid: number, targetVmid: number, params: any) {
    const { data } = await this.http.post(
      `/nodes/${node}/qemu/${sourceVmid}/clone`,
      { newid: targetVmid, ...params }
    );
    return data.data; // returns UPID
  }

  async configVM(node: string, vmid: number, config: any) {
    const { data } = await this.http.put(`/nodes/${node}/qemu/${vmid}/config`, config);
    return data.data;
  }

  async resizeDisk(node: string, vmid: number, disk: string, size: string) {
    const { data } = await this.http.put(
      `/nodes/${node}/qemu/${vmid}/resize`,
      { disk, size }
    );
    return data.data;
  }

  async startVM(node: string, vmid: number) {
    const { data } = await this.http.post(`/nodes/${node}/qemu/${vmid}/status/start`);
    return data.data; // UPID
  }

  async stopVM(node: string, vmid: number) {
    const { data } = await this.http.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
    return data.data; // UPID
  }

  async restartVM(node: string, vmid: number) {
    const { data } = await this.http.post(`/nodes/${node}/qemu/${vmid}/status/reboot`);
    return data.data; // UPID
  }

  async getVMStatus(node: string, vmid: number) {
    const { data } = await this.http.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    return data.data;
  }

  async getTaskStatus(node: string, upid: string) {
    const { data } = await this.http.get(`/nodes/${node}/tasks/${upid}/status`);
    return data.data;
  }

  async waitForTask(node: string, upid: string, timeout: number = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus(node, upid);
      
      if (status.status === 'stopped') {
        if (status.exitstatus !== '0') {
          throw new Error(`Task ${upid} failed with exit code ${status.exitstatus}`);
        }
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Task ${upid} timed out after ${timeout}ms`);
  }

  async createSnapshot(node: string, vmid: number, snapname: string, description?: string) {
    const { data } = await this.http.post(
      `/nodes/${node}/qemu/${vmid}/snapshot`,
      { snapname, description }
    );
    return data.data; // UPID
  }

  async listSnapshots(node: string, vmid: number) {
    const { data } = await this.http.get(`/nodes/${node}/qemu/${vmid}/snapshot`);
    return data.data;
  }
}