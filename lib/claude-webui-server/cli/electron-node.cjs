#!/usr/bin/env node
/**
 * Electron-compatible Node.js entry point
 *
 * Simplified approach - directly start their backend with our environment.
 */

const { execSync } = require('child_process');
const path = require('path');

// Parse command line arguments from Electron fork
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 && args[portIndex + 1] ? args[portIndex + 1] : '8081';

// Set up environment for their backend
process.env.PORT = port;
process.env.JARVIS_DESKTOP_MODE = 'true';

console.log('🚀 Starting Claude WebUI Server');
console.log('Port:', port);
console.log('Claude CLI Path:', process.env.CLAUDE_CLI_PATH || 'claude');

try {
  // Change to backend directory and run their dev script
  const backendDir = __dirname + '/..';
  const command = `cd ${backendDir} && npm run dev -- --port ${port} --host 127.0.0.1`;

  console.log('Running command:', command);
  execSync(command, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}