#!/usr/bin/env node

// Simplified Claude WebUI Server based on working example
// Uses child_process.fork pattern with @hono/node-server

const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { query } = require('@anthropic-ai/claude-code');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Voice interception logic removed - frontend will handle voice message processing

// Parse command line arguments
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 8081;
const claudeCliPath = process.env.CLAUDE_CLI_PATH || 'claude';

console.log('🚀 Starting Claude WebUI Server');
console.log('Port:', port);
console.log('Claude CLI Path:', claudeCliPath);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Create Hono app
const app = new Hono();

// Set environment variable to disable auto-play in voice script
process.env.JARVIS_DESKTOP_MODE = 'true';

// Request abort controllers for cancellation
const requestAbortControllers = new Map();

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port,
    claudeCliPath
  });
});

// Chat endpoint - based on Claude WebUI implementation
app.post('/api/chat', async (c) => {
  try {
    const chatRequest = await c.req.json();
    console.log('📡 Chat request received:', { message: chatRequest.message?.substring(0, 50) + '...' });

    const { message, requestId, sessionId, allowedTools, workingDirectory } = chatRequest;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    if (requestId) {
      requestAbortControllers.set(requestId, abortController);
    }

    // Stream response using Claude Code SDK
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🤖 Executing Claude query with SDK');

          for await (const sdkMessage of query({
            prompt: message,
            options: {
              abortController,
              executable: process.execPath,
              executableArgs: [],
              pathToClaudeCodeExecutable: claudeCliPath,
              ...(sessionId ? { resume: sessionId } : {}),
              ...(allowedTools ? { allowedTools } : {}),
              ...(workingDirectory ? { cwd: workingDirectory } : {}),
            },
          })) {
            // Debug logging for all SDK messages
            console.log('🔍 SDK Message:', JSON.stringify(sdkMessage, null, 2));

            // Stream ALL SDK messages as NDJSON (pure passthrough)
            const chunk = {
              type: 'claude_json',
              data: sdkMessage,
            };

            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(new TextEncoder().encode(data));
          }

          // Send completion signal
          const doneChunk = JSON.stringify({ type: 'done' }) + '\n';
          controller.enqueue(new TextEncoder().encode(doneChunk));
          controller.close();

          console.log('✅ Claude query completed');
        } catch (error) {
          console.error('❌ Claude query error:', error);

          const errorChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : String(error),
          };

          const data = JSON.stringify(errorChunk) + '\n';
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
        } finally {
          // Clean up abort controller
          if (requestId && requestAbortControllers.has(requestId)) {
            requestAbortControllers.delete(requestId);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    return c.json({
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Voice file serving endpoint - serves generated voice files
app.get('/api/voice/:filename', async (c) => {
  const filename = c.req.param('filename');

  // Validate filename for security
  if (!filename.match(/^jarvis_response_\d{8}_\d{6}_.*\.mp3$/)) {
    console.warn('❌ Invalid voice filename requested:', filename);
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const voiceFilePath = `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/tools/voice/${filename}`;

  try {
    // Check if file exists and serve it
    const fs = require('fs');
    if (!fs.existsSync(voiceFilePath)) {
      console.warn('❌ Voice file not found:', voiceFilePath);
      return c.json({ error: 'File not found' }, 404);
    }

    console.log('🎵 Serving voice file:', filename);

    // Read and serve the file
    const fileContent = fs.readFileSync(voiceFilePath);
    return new Response(fileContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileContent.length.toString(),
      }
    });
  } catch (error) {
    console.error('❌ Error serving voice file:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Voice generation endpoint
app.post('/api/voice-generate', async (c) => {
  try {
    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    console.log('🎵 Generating voice for message:', message.substring(0, 50) + '...');

    // Execute voice script
    const voiceScript = '/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/tools/jarvis_voice.sh';
    const result = execSync(`"${voiceScript}" --voice echo "${message}"`, {
      encoding: 'utf8',
      cwd: '/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop'
    });

    // Parse audio file path from output
    const audioPathMatch = result.match(/Audio generated successfully at: (.+\.mp3)/);
    const audioPath = audioPathMatch ? audioPathMatch[1] : null;

    if (!audioPath) {
      console.error('❌ Failed to extract audio path from voice script output:', result);
      return c.json({ error: 'Failed to generate voice' }, 500);
    }

    console.log('✅ Voice generated successfully at:', audioPath);

    return c.json({
      success: true,
      message,
      audioPath,
      output: result
    });
  } catch (error) {
    console.error('❌ Voice generation error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Abort request endpoint
app.post('/api/abort/:requestId', async (c) => {
  const requestId = c.req.param('requestId');

  if (requestAbortControllers.has(requestId)) {
    const abortController = requestAbortControllers.get(requestId);
    abortController.abort();
    requestAbortControllers.delete(requestId);
    console.log('🛑 Aborted request:', requestId);
    return c.json({ success: true });
  }

  return c.json({ error: 'Request not found' }, 404);
});

// Start server using @hono/node-server
const startServer = () => {
  try {
    serve({
      fetch: app.fetch,
      port,
      hostname: '127.0.0.1',
    }, () => {
      console.log(`✅ Server ready on http://127.0.0.1:${port}/`);
      console.log('🎯 Ready to handle Claude Code SDK requests');

      // Send ready message to parent process if forked
      if (process.send) {
        process.send({ type: 'server-ready', port });
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();