#!/bin/bash
set -e

# This script runs as root to fix volume permissions, then drops to non-root user (node)

# Fix ownership of mounted volume (if it exists and is owned by root)
if [ -d "/home/node" ] && [ "$(stat -c '%u' /home/node)" = "0" ]; then
    echo "[Entrypoint] Fixing /home/node permissions for node user..."
    chown -R node:node /home/node
fi

# CRITICAL: Set HOME environment variable for node user
# This fixes the issue where gosu doesn't set HOME properly
export HOME=/home/node
export USER=node

# Drop privileges to node user and execute the command
echo "[Entrypoint] Switching to node user (UID 1000) with HOME=$HOME"
echo "[Entrypoint] Executing: $@"

# Use gosu to switch user and execute command
# gosu properly handles argument arrays from Docker CMD
cd /home/node
exec gosu node "$@"
