FROM node:20

# Install system dependencies for Claude Agent SDK, voice generation, and node-pty compilation
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    build-essential \
    make \
    g++ \
    rsync \
    gosu \
    jq \
    && rm -rf /var/lib/apt/lists/*

# CACHE BUST: Claude CLI upgrade to 2.0.42 for thinking support - 2025-11-15-16:30
# Force Docker cache invalidation to ensure Claude CLI update
ARG CLAUDE_VERSION_BUST=2025-11-15-16:30
# Uninstall old version and install latest Claude CLI globally (for terminal interface)
RUN npm uninstall -g @anthropic-ai/claude-code || true && \
    npm install -g @anthropic-ai/claude-code@2.0.42

# Install Python dependencies for voice generation and PDF processing
RUN pip3 install --break-system-packages --no-cache-dir \
    openai>=2.7.1 \
    python-dotenv==1.0.0 \
    pdfplumber==0.7.6 \
    pdf2image==1.16.3 \
    PyMuPDF==1.23.8 \
    Pillow==10.1.0 \
    python-docx==1.1.0 \
    openpyxl==3.1.2 \
    requests==2.31.0 \
    beautifulsoup4==4.12.2 \
    pytesseract==0.3.10

# Node.js official image already includes 'node' user with UID/GID 1000
# No SSH server configuration - use Fly.io's native SSH access
# Environment configuration moved to ENTRYPOINT script for proper SSH session handling

# Set HOME environment variable for node user (for container runtime)
ENV HOME=/home/node

# Note: /home/node will be provided by the mounted volume
# No need to create it here

# Copy workspace template and scripts (available for manual execution)
COPY workspace-template /app/workspace-template
COPY scripts/setup-new-app.sh /app/scripts/setup-new-app.sh
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
COPY scripts/migrate-to-home-node.sh /app/scripts/migrate-to-home-node.sh
# Copy legacy fixes for backwards compatibility (existing deployments only)
COPY scripts/legacy-fixes /app/scripts/legacy-fixes
RUN chmod +x /app/scripts/*.sh /app/scripts/legacy-fixes/*.sh

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install Node.js dependencies (use --legacy-peer-deps for use-resize-observer compatibility)
RUN npm install --legacy-peer-deps

# Rebuild native modules for the Docker Node.js version
RUN npm rebuild node-pty

# Copy application source code (only web-needed directories)
COPY app ./app
COPY public ./public
COPY lib/claude-webui-server ./lib/claude-webui-server
COPY lib/terminal ./lib/terminal
COPY vite.web.config.mts ./
COPY tsconfig*.json ./


# Build React app for production using web-only Vite config
ENV NODE_ENV=production
ENV VITE_API_URL=
ENV VITE_WORKING_DIRECTORY=/home/node
RUN npx vite build --config vite.web.config.mts

# Build the backend server (skip frontend copy since we already built it)
WORKDIR /app/lib/claude-webui-server

# Generate version.ts file (auto-generated, not in git)
RUN printf '// Auto-generated file\nexport const VERSION = "%s";\n' "$(node -p "require('./package.json').version")" > cli/version.ts

# Install backend dependencies and rebuild native modules
RUN npm install && npm rebuild node-pty

# Build backend bundle
RUN npm run build:clean && npm run build:bundle

# Copy the built React app to where the backend expects it
RUN mkdir -p dist/static && cp -r /app/out/renderer/* dist/static/

# Return to app root and set ownership of application files
WORKDIR /app
RUN chown -R root:node /app && \
    chmod -R 750 /app

# Expose ports
EXPOSE 10000
EXPOSE 3001

# Set environment variables
ENV PORT=10000
ENV TERMINAL_WS_PORT=3001
ENV NODE_ENV=production
ENV WORKSPACE_DIR=/home/node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Copy entrypoint script to system location
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use entrypoint to fix volume permissions and drop to non-root user
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the backend server with home directory as working directory
WORKDIR /home/node

# NOTE: Keep root user for entrypoint to fix permissions
# SSH will be handled by configuring the SSH daemon

# DEPLOYMENT MODE: Initialize Claude config then start server
# Entrypoint will drop to node user before executing this CMD
# Claude config initialization happens on every container start (idempotent)
# For new apps: SSH in and run: /app/scripts/setup-new-app.sh
CMD ["node", "/app/lib/claude-webui-server/dist/cli/node.js", "--port", "10000", "--host", "0.0.0.0"]
