import { sign } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { SimpleFlyMachinesClient } from './fly-machines-client';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Fly.io Machines client
const flyClient = new SimpleFlyMachinesClient();

interface EphemeralInstance {
  machineId: string;
  url: string;
  status: string;
}

export async function getOrCreateEphemeralInstance(userId: string, sessionId: string): Promise<EphemeralInstance> {
  console.log(`[Ephemeral] Getting or creating instance for user ${userId}, session ${sessionId}`);

  try {
    // Check if we have an existing active session
    const { data: existingSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('[Ephemeral] Session query error:', sessionError);
    }

    // If we have an existing session with a machine, check if it's still running
    if (existingSession?.machine_id) {
      try {
        const machineStatus = await flyClient.getMachine(existingSession.machine_id);
        if (machineStatus?.state === 'started') {
          console.log(`[Ephemeral] Reusing existing machine ${existingSession.machine_id}`);
          return {
            machineId: existingSession.machine_id,
            url: `https://${existingSession.machine_id}.my-jarvis-runtime.fly.dev`,
            status: 'started'
          };
        }
      } catch (error) {
        console.log(`[Ephemeral] Machine ${existingSession.machine_id} not found or stopped, creating new one`);
      }
    }

    // Check for any running machines for this user (from other sessions)
    const { data: userSessions } = await supabase
      .from('user_sessions')
      .select('machine_id')
      .eq('user_id', userId)
      .not('machine_id', 'is', null);

    for (const session of userSessions || []) {
      try {
        const machineStatus = await flyClient.getMachine(session.machine_id);
        if (machineStatus?.state === 'started') {
          console.log(`[Ephemeral] Reusing user machine ${session.machine_id} for new session`);
          // Update current session to point to this machine
          await storeContainerSession(userId, sessionId, session.machine_id, null);
          return {
            machineId: session.machine_id,
            url: `https://${session.machine_id}.my-jarvis-runtime.fly.dev`,
            status: 'started'
          };
        }
      } catch (error) {
        console.log(`[Ephemeral] Machine ${session.machine_id} not accessible`);
      }
    }

    // Create new ephemeral machine
    const machineId = await createEphemeralAgent(userId, sessionId);

    return {
      machineId,
      url: `https://${machineId}.my-jarvis-runtime.fly.dev`,
      status: 'started'
    };

  } catch (error) {
    console.error('[Ephemeral] Error in getOrCreateEphemeralInstance:', error);
    throw error;
  }
}

export async function createEphemeralAgent(userId: string, sessionId: string): Promise<string> {
  console.log(`[Ephemeral] Creating new agent for user ${userId}, session ${sessionId}`);

  try {
    // Get or create user volume
    const volumeId = await getOrCreateUserVolume(userId);

    // Create machine configuration
    const machineConfig = {
      config: {
        image: 'registry.fly.io/my-jarvis-erez:latest',
        restart: {
          policy: 'no'
        },
        auto_destroy: true,
        guest: {
          cpu_kind: 'shared',
          cpus: 1,
          memory_mb: 2048
        },
        env: {
          NODE_ENV: 'production',
          PORT: '10000',
          WORKSPACE_DIR: '/home/node',
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          DEPLOYMENT_MODE: 'ephemeral'
        },
        mounts: [
          {
            volume: volumeId,
            path: '/home/node'
          }
        ],
        services: [
          {
            ports: [
              {
                port: 443,
                handlers: ['tls', 'http']
              },
              {
                port: 80,
                handlers: ['http']
              }
            ],
            protocol: 'tcp',
            internal_port: 10000
          }
        ]
      },
      name: `ephemeral-${userId}-${Date.now()}`
    };

    const machine = await flyClient.createMachine(machineConfig);

    if (!machine?.id) {
      throw new Error('Failed to create machine - no ID returned');
    }

    // Store session information
    await storeContainerSession(userId, sessionId, machine.id, volumeId);

    console.log(`[Ephemeral] Created machine ${machine.id} for user ${userId}`);
    return machine.id;

  } catch (error) {
    console.error('[Ephemeral] Error creating ephemeral agent:', error);
    throw error;
  }
}

async function getOrCreateUserVolume(userId: string): Promise<string> {
  console.log(`[Volume] Getting or creating volume for user ${userId}`);

  try {
    // Check if user already has a volume
    const { data: existingVolumes } = await supabase
      .from('user_sessions')
      .select('volume_id')
      .eq('user_id', userId)
      .not('volume_id', 'is', null)
      .limit(1);

    if (existingVolumes && existingVolumes.length > 0 && existingVolumes[0].volume_id) {
      const volumeId = existingVolumes[0].volume_id;
      console.log(`[Volume] Using existing volume ${volumeId} for user ${userId}`);
      return volumeId;
    }

    // Create new volume
    const volumeConfig = {
      name: `user-${userId}-${Date.now()}`,
      size_gb: 10,
      region: 'sjc'
    };

    const volume = await flyClient.createVolume(volumeConfig);

    if (!volume?.id) {
      throw new Error('Failed to create volume - no ID returned');
    }

    console.log(`[Volume] Created new volume ${volume.id} for user ${userId}`);
    return volume.id;

  } catch (error) {
    console.error('[Volume] Error getting or creating volume:', error);
    throw error;
  }
}

export async function storeContainerSession(
  userId: string,
  sessionId: string,
  machineId: string,
  volumeId: string | null
): Promise<void> {
  console.log(`[Session] Storing session: user=${userId}, session=${sessionId}, machine=${machineId}, volume=${volumeId}`);

  try {
    const { error } = await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        machine_id: machineId,
        volume_id: volumeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_id'
      });

    if (error) {
      console.error('[Session] Error storing session:', error);
      throw error;
    }

    console.log(`[Session] Successfully stored session for ${userId}`);
  } catch (error) {
    console.error('[Session] Error in storeContainerSession:', error);
    throw error;
  }
}

export function generateEphemeralToken(userId: string, machineId: string): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';

  return sign(
    {
      userId,
      machineId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    secret
  );
}