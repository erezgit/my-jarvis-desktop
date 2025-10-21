#!/bin/bash
# Jarvis PDF Export System
# This script triggers PDF export from presentations via API call

# Detect script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# API endpoint (dynamically detect based on environment)
API_URL="${PDF_EXPORT_API_URL:-http://localhost:3245}"

# Function to show usage information
show_usage() {
  echo "Usage: ./jarvis_pdf_export.sh [options] \"path/to/presentation.tsx\""
  echo ""
  echo "Options:"
  echo "  --filename VALUE    Set output filename (default: presentation.pdf)"
  echo "  --help              Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./jarvis_pdf_export.sh \"/workspace/my-jarvis/tickets/002/app.tsx\""
  echo "  ./jarvis_pdf_export.sh --filename \"demo.pdf\" \"my-jarvis/tickets/002/app.tsx\""
  exit 1
}

# Parse command line arguments
FILENAME="presentation.pdf"
FILE_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --filename)
      FILENAME="$2"
      shift 2
      ;;
    --help)
      show_usage
      ;;
    *)
      FILE_PATH="$1"
      shift
      ;;
  esac
done

# Validate file path
if [ -z "$FILE_PATH" ]; then
  echo "Error: File path is required"
  show_usage
fi

# Make path absolute if relative
if [[ ! "$FILE_PATH" = /* ]]; then
  FILE_PATH="$WORKSPACE_ROOT/$FILE_PATH"
fi

# Verify file exists
if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

# Trigger PDF export via frontend message injection
# The frontend will receive this as a special message and trigger the export
echo "Triggering PDF export for: $FILE_PATH"
echo "Output filename: $FILENAME"
echo ""
echo "PDF_EXPORT_TRIGGER"
echo "FILE_PATH:$FILE_PATH"
echo "FILENAME:$FILENAME"
echo "PDF export triggered successfully. The PDF will be generated in the browser and saved to the workspace."
