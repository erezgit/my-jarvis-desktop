#!/bin/bash

# Sync workspace files
echo "Syncing workspace files..."

# Ensure workspace directories exist
mkdir -p /workspace/my-jarvis
mkdir -p /workspace/.claude

# Sync any updates from template if needed
if [ -d "/app/workspace-template" ]; then
    rsync -av --ignore-existing /app/workspace-template/ /workspace/my-jarvis/
fi

echo "Workspace sync complete"