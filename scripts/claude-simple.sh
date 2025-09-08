#!/bin/bash
# Simple Claude wrapper that disables interactive UI

# Check if we're in a non-interactive terminal
if [ ! -t 0 ] || [ "$TERM" = "dumb" ]; then
    echo "Claude cannot run in non-interactive mode"
    exit 1
fi

# Try to run Claude with simplified output
export TERM=dumb
export NO_COLOR=1
claude "$@"