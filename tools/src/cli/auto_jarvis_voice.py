#!/usr/bin/env python3
"""
Jarvis Voice Generator Script

This script generates audio from text using OpenAI's text-to-speech API.
It's used by the jarvis_voice.sh script.

Required environment variables:
- OPENAI_API_KEY: Your OpenAI API key
"""

import argparse
import os
import sys
import time
import subprocess
import json
from pathlib import Path

# Add the src directory to sys.path to enable imports
SRC_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(SRC_ROOT))

from core.voice_generation.generator import generate_voice

# NOTE: play_audio function removed - audio playback is handled by frontend only
# Backend generates audio files but never plays them

def main():
    """Main function to generate audio from text using OpenAI's TTS API."""
    parser = argparse.ArgumentParser(description="Generate audio from text using OpenAI's TTS API")
    
    # Required parameter
    parser.add_argument("text", help="Text to convert to speech")
    
    # Optional parameters
    parser.add_argument("--voice", default="nova", 
                        choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                        help="Voice to use (default: nova)")
    parser.add_argument("--model", default="tts-1", 
                        choices=["tts-1", "tts-1-hd"], 
                        help="Model to use (default: tts-1)")
    parser.add_argument("--format", default="mp3", 
                        choices=["mp3", "opus", "aac", "flac", "wav"],
                        help="Audio format (default: mp3)")
    parser.add_argument("--speed", default=1.0, type=float,
                        help="Speech speed, 0.25 to 4.0 (default: 1.0)")
    parser.add_argument("--max-length", default=1000, type=int,
                        help="Maximum text length (default: 1000)")
    parser.add_argument("--output-dir", default="workspace/generated_audio",
                        help="Directory to save audio file (default: workspace/generated_audio)")
    parser.add_argument("--api-key",
                        help="OpenAI API key (overrides environment variable)")
    parser.add_argument("--json-output", action="store_true",
                        help="Output in JSON format")
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Process the text (only print if not JSON output)
    if not args.json_output:
        print(f"Processing response ({len(args.text)} chars, voiced as {len(args.text)} chars)")
    
    # Generate output filename based on content
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    words = args.text[:40].replace(" ", "_").replace("'", "").replace("\"", "")
    words = ''.join(c if c.isalnum() or c == '_' else '' for c in words)
    filename = f"jarvis_response_{timestamp}_{words}"
    
    # Generate the audio using the core generator
    result = generate_voice(
        text=args.text,
        voice=args.voice,
        model=args.model,
        output_dir=args.output_dir,
        api_key=args.api_key,
        response_format=args.format,
        speed=args.speed,
        filename_prefix="jarvis_response"
    )
    
    if result["success"]:
        if args.json_output:
            # Output JSON format with transcript and audio path
            output = {
                "type": "voice",
                "transcript": args.text,
                "audioPath": result['saved_path'],
                "filename": os.path.basename(result['saved_path'])
            }
            print(json.dumps(output))
        else:
            print(f"Audio generated successfully at: {result['saved_path']}")

        # NOTE: Auto-play is handled by the frontend VoiceMessage component
        # Backend should NEVER auto-play audio files
    else:
        print(f"Error generating audio: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    main() 