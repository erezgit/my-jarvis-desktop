#!/bin/bash
# Jarvis Voice Response System
# This script standardizes the process of generating voice responses from text

# Detect script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables from .env file if it exists
CONFIG_FILE="$WORKSPACE_ROOT/tools/config/.env"
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
fi

# Set variables with defaults
VOICE="nova"
MODEL="tts-1"
FORMAT="mp3"
SPEED="1.0"
OUTPUT_DIR="$WORKSPACE_ROOT/tools/voice"
MAX_LENGTH="1000"

# Function to show usage information
show_usage() {
  echo "Usage: ./jarvis_voice.sh [options] \"Your text message here\""
  echo ""
  echo "Options:"
  echo "  --voice VALUE    Set voice (alloy, echo, fable, onyx, nova, shimmer). Default: nova"
  echo "  --model VALUE    Set model (tts-1, tts-1-hd). Default: tts-1"
  echo "  --format VALUE   Set format (mp3, opus, aac, flac, wav). Default: mp3"
  echo "  --speed VALUE    Set speed (0.25 to 4.0). Default: 1.0"
  echo "  --max-length N   Maximum text length before summarization. Default: 1000"
  echo "  --help           Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./jarvis_voice.sh \"Hello, I'm Jarvis.\""
  echo "  ./jarvis_voice.sh --voice echo \"This is in a different voice.\""
  exit 1
}

# Parse command line arguments
POSITIONAL_ARGS=()
JSON_OUTPUT="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --voice)
      VOICE="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --format)
      FORMAT="$2"
      shift 2
      ;;
    --speed)
      SPEED="$2"
      shift 2
      ;;
    --max-length)
      MAX_LENGTH="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT="true"
      shift
      ;;
    --help)
      show_usage
      ;;
    -*|--*)
      echo "Unknown option $1"
      show_usage
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# Restore positional arguments
set -- "${POSITIONAL_ARGS[@]}"

# Check if text is provided
if [ $# -eq 0 ]; then
  echo "Error: No text provided for voice generation."
  show_usage
fi

# Build the command
CMD="python3 /Users/erezfern/Workspace/my-jarvis/tools/src/cli/auto_jarvis_voice.py"

# Add text (joining all remaining arguments with spaces)
TEXT="$*"
CMD="$CMD \"$TEXT\""

# Add options
CMD="$CMD --voice $VOICE"
CMD="$CMD --model $MODEL"
CMD="$CMD --format $FORMAT"
CMD="$CMD --speed $SPEED"
CMD="$CMD --max-length $MAX_LENGTH"
CMD="$CMD --output-dir $OUTPUT_DIR"

# Make sure we have the API key from environment
if [ -z "$OPENAI_API_KEY" ]; then
  ENV_FILE="/Users/erezfern/Workspace/my-jarvis/tools/config/.env"
  
  # Try to load API key from .env file again (in case it was modified)
  if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
  fi
  
  if [ -z "$OPENAI_API_KEY" ]; then
    export OPENAI_API_KEY=$(grep OPENAI_API_KEY "$ENV_FILE" | cut -d '=' -f2)
  fi
  
  if [ ! -z "$OPENAI_API_KEY" ]; then
    export OPENAI_API_KEY=$(echo "$OPENAI_API_KEY" | xargs)
    echo "API key loaded from config file."
  fi
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is not set."
  echo "Please set it in the .env file or export it as an environment variable."
  exit 1
fi

# Add API key from environment
CMD="$CMD --api-key=\"$OPENAI_API_KEY\""

if [ "$JSON_OUTPUT" = "true" ]; then
  CMD="$CMD --json-output"
fi

# Run the command (using eval to handle quotes properly)
if [ "$JSON_OUTPUT" != "true" ]; then
  echo "Generating Jarvis voice response..."
fi
eval $CMD

exit 0 