FROM node:20

# Install system dependencies for Claude Agent SDK and voice generation
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install Python dependencies for voice generation
RUN pip3 install --break-system-packages openai python-dotenv

# Create workspace directory for persistent storage
RUN mkdir -p /workspace

# Copy workspace template (will be copied to persistent /workspace on first startup)
COPY workspace-template /app/workspace-template
COPY scripts/init-workspace.sh /app/scripts/init-workspace.sh
RUN chmod +x /app/scripts/init-workspace.sh

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application source code (only web-needed directories)
COPY app ./app
COPY lib/claude-webui-server ./lib/claude-webui-server
COPY vite.web.config.mts ./
COPY tsconfig*.json ./

# Build React app for production using web-only Vite config
ENV NODE_ENV=production
ENV VITE_API_URL=
ENV VITE_WORKING_DIRECTORY=/workspace
RUN npx vite build --config vite.web.config.mts

# Build the backend server (skip frontend copy since we already built it)
WORKDIR /app/lib/claude-webui-server

# Generate version.ts file (auto-generated, not in git)
RUN printf '// Auto-generated file\nexport const VERSION = "%s";\n' "$(node -p "require('./package.json').version")" > cli/version.ts

RUN npm install && npm run build:clean && npm run build:bundle

# Copy the built React app to where the backend expects it
RUN mkdir -p dist/static && cp -r /app/out/renderer/* dist/static/

# Return to app root
WORKDIR /app

# Expose port 10000 (Render default)
EXPOSE 10000

# Set environment variables
ENV PORT=10000
ENV NODE_ENV=production
ENV WORKSPACE_DIR=/workspace
ENV ANTHROPIC_CONFIG_PATH=/workspace/.claude
ENV CLAUDE_CONFIG_DIR=/workspace/.claude

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Start the backend server with workspace root as working directory
WORKDIR /workspace

# Initialize workspace on startup, then start server
CMD ["/bin/bash", "-c", "/app/scripts/init-workspace.sh && node /app/lib/claude-webui-server/dist/cli/node.js --port 10000 --host 0.0.0.0"]
