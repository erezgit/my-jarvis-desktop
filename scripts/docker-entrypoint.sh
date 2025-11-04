#!/bin/bash
set -e

# This script runs as root to fix volume permissions, then drops to non-root user (node)

# Fix ownership of mounted volume (if it exists and is owned by root)
if [ -d "/workspace" ] && [ "$(stat -c '%u' /workspace)" = "0" ]; then
    echo "[Entrypoint] Fixing /workspace permissions for node user..."
    chown -R node:node /workspace
fi

# Drop privileges to node user and execute the command
echo "[Entrypoint] Switching to node user (UID 1000) and executing: $@"

# Use gosu to switch user and execute command
# gosu properly handles argument arrays from Docker CMD
cd /workspace
exec gosu node "$@"
