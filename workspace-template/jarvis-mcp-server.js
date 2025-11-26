#!/usr/bin/env node

// Standalone MCP server for JARVIS voice generation
// This bridges Claude Code to the Python voice generation system

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MCP Server implementation
const server = new Server(
  {
    name: 'jarvis-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Voice generation tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'voice_generate',
        description: 'Generate voice message with text-to-speech using JARVIS voice system',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Text to convert to speech'
            },
            voice: {
              type: 'string',
              enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
              default: 'nova',
              description: 'Voice model to use'
            },
            speed: {
              type: 'number',
              minimum: 0.25,
              maximum: 4.0,
              default: 1.0,
              description: 'Speech speed (0.25 to 4.0)'
            }
          },
          required: ['message']
        }
      }
    ]
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'voice_generate') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { message, voice = 'nova', speed = 1.0 } = request.params.arguments;

  try {
    // Call Python voice generation script
    const baseDir = process.env.WORKSPACE_DIR || '/home/node';
    const pythonScript = join(baseDir, 'tools/src/cli/auto_jarvis_voice.py');
    const outputDir = join(baseDir, 'tools/voice');

    const args = [
      pythonScript,
      message,
      '--voice', voice,
      '--model', 'tts-1',
      '--format', 'mp3',
      '--speed', speed.toString(),
      '--max-length', '1000',
      '--output-dir', outputDir,
      '--json-output'
    ];

    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', args, {
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY
        },
        cwd: baseDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.success && result.saved_path) {
              // Generate web-compatible URL
              const filename = result.saved_path.split('/').pop();
              const audioUrl = `/api/voice/${filename}`;

              resolve({
                success: true,
                audioPath: audioUrl,
                message,
                voice,
                speed,
                timestamp: Date.now()
              });
            } else {
              reject(new Error(result.error || 'Voice generation failed'));
            }
          } catch (parseError) {
            // Try legacy format
            const audioPathMatch = stdout.match(/Audio generated successfully at: (.+\.mp3)/);
            if (audioPathMatch) {
              const filename = audioPathMatch[1].split('/').pop();
              const audioUrl = `/api/voice/${filename}`;
              resolve({
                success: true,
                audioPath: audioUrl,
                message,
                voice,
                speed,
                timestamp: Date.now()
              });
            } else {
              reject(new Error(`Failed to parse output: ${parseError.message}`));
            }
          }
        } else {
          reject(new Error(`Process failed with code ${code}. Error: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start process: ${error.message}`));
      });
    });

    return {
      content: [
        {
          type: 'text',
          text: `🔊 Voice message generated successfully!

**Message:** ${message}
**Voice:** ${voice}
**Speed:** ${speed}x
**Audio URL:** ${result.audioPath}

VOICE_DATA:${JSON.stringify({
  audioUrl: result.audioPath,
  voiceType: voice,
  speed: speed,
  timestamp: result.timestamp
})}

The voice file has been created and is ready for playback.`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `🔊 Voice generation failed: ${error.message}

**Requested:** ${message}
**Voice:** ${voice}
**Speed:** ${speed}x

Please check the OpenAI API key and try again.`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JARVIS MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server failed:', error);
  process.exit(1);
});