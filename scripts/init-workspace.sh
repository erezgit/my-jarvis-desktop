#!/bin/bash

# Initialize workspace for first-time setup
echo "Initializing workspace..."

# Create workspace structure if it doesn't exist
mkdir -p /workspace/my-jarvis
mkdir -p /workspace/.claude

# Copy workspace template files if they don't exist
if [ ! -f "/workspace/my-jarvis/CLAUDE.md" ]; then
    cp -r /app/workspace-template/* /workspace/my-jarvis/ 2>/dev/null || true
fi

echo "Workspace initialized at /workspace"