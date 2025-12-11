interface FlyMachine {
  id: string;
  name: string;
  state: 'created' | 'starting' | 'started' | 'stopping' | 'stopped' | 'replacing' | 'destroying' | 'destroyed';
  region: string;
  instance_id: string;
  private_ip: string;
  config: any;
  image_ref: any;
  created_at: string;
  updated_at: string;
}

interface FlyVolume {
  id: string;
  name: string;
  state: string;
  size_gb: number;
  region: string;
  encrypted: boolean;
  created_at: string;
}

interface MachineConfig {
  config: {
    image: string;
    restart: {
      policy: string;
    };
    auto_destroy: boolean;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    env: Record<string, string>;
    mounts: Array<{
      volume: string;
      path: string;
    }>;
    services: Array<{
      ports: Array<{
        port: number;
        handlers: string[];
      }>;
      protocol: string;
      internal_port: number;
    }>;
  };
  name: string;
}

interface VolumeConfig {
  name: string;
  size_gb: number;
  region: string;
}

export class SimpleFlyMachinesClient {
  private readonly baseUrl = 'https://api.machines.dev/v1';
  private readonly appName = 'my-jarvis-runtime'; // Use the runtime app for ephemeral machines
  private readonly token: string;

  constructor() {
    this.token = process.env.FLY_API_TOKEN!;
    if (!this.token) {
      throw new Error('FLY_API_TOKEN environment variable is required');
    }
  }

  async createMachine(config: MachineConfig): Promise<FlyMachine> {
    console.log(`[Fly] Creating machine with name: ${config.name}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      const machine = await response.json() as FlyMachine;
      console.log(`[Fly] Successfully created machine: ${machine.id}`);
      return machine;
    } catch (error) {
      console.error('[Fly] Error creating machine:', error);
      throw error;
    }
  }

  async getMachine(machineId: string): Promise<FlyMachine | null> {
    console.log(`[Fly] Getting machine status: ${machineId}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines/${machineId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (response.status === 404) {
        console.log(`[Fly] Machine ${machineId} not found`);
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      const machine = await response.json() as FlyMachine;
      console.log(`[Fly] Machine ${machineId} state: ${machine.state}`);
      return machine;
    } catch (error) {
      console.error(`[Fly] Error getting machine ${machineId}:`, error);
      return null;
    }
  }

  async listMachines(): Promise<FlyMachine[]> {
    console.log(`[Fly] Listing machines for app: ${this.appName}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      const machines = await response.json() as FlyMachine[];
      console.log(`[Fly] Found ${machines.length} machines`);
      return machines;
    } catch (error) {
      console.error('[Fly] Error listing machines:', error);
      throw error;
    }
  }

  async startMachine(machineId: string): Promise<void> {
    console.log(`[Fly] Starting machine: ${machineId}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines/${machineId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      console.log(`[Fly] Successfully started machine: ${machineId}`);
    } catch (error) {
      console.error(`[Fly] Error starting machine ${machineId}:`, error);
      throw error;
    }
  }

  async stopMachine(machineId: string): Promise<void> {
    console.log(`[Fly] Stopping machine: ${machineId}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines/${machineId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      console.log(`[Fly] Successfully stopped machine: ${machineId}`);
    } catch (error) {
      console.error(`[Fly] Error stopping machine ${machineId}:`, error);
      throw error;
    }
  }

  async destroyMachine(machineId: string): Promise<void> {
    console.log(`[Fly] Destroying machine: ${machineId}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/machines/${machineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      console.log(`[Fly] Successfully destroyed machine: ${machineId}`);
    } catch (error) {
      console.error(`[Fly] Error destroying machine ${machineId}:`, error);
      throw error;
    }
  }

  async createVolume(config: VolumeConfig): Promise<FlyVolume> {
    console.log(`[Fly] Creating volume with name: ${config.name}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/volumes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      const volume = await response.json() as FlyVolume;
      console.log(`[Fly] Successfully created volume: ${volume.id}`);
      return volume;
    } catch (error) {
      console.error('[Fly] Error creating volume:', error);
      throw error;
    }
  }

  async listVolumes(): Promise<FlyVolume[]> {
    console.log(`[Fly] Listing volumes for app: ${this.appName}`);

    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/volumes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
      }

      const volumes = await response.json() as FlyVolume[];
      console.log(`[Fly] Found ${volumes.length} volumes`);
      return volumes;
    } catch (error) {
      console.error('[Fly] Error listing volumes:', error);
      throw error;
    }
  }
}