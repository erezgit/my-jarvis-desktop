#!/usr/bin/env python3
"""
CLI tool for generating images using OpenAI DALL-E models.

This script provides a command-line interface to the core image generation functionality.
"""
import os
import sys
import json
import argparse
from pathlib import Path

# Add the parent directory to sys.path to enable imports from core
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.core.image_generation.generator import generate_image

def main():
    """
    Main entry point for the image generation CLI tool.
    """
    parser = argparse.ArgumentParser(description="Generate an image using OpenAI's DALL-E model")
    parser.add_argument("prompt", help="Description of the desired image")
    parser.add_argument("--size", choices=["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"], 
                        default="1024x1024", help="Size of the generated image")
    parser.add_argument("--quality", choices=["standard", "hd"], default="standard", 
                        help="Quality of the generated image")
    parser.add_argument("--style", choices=["vivid", "natural"], default="vivid", 
                        help="Style of the generated image")
    parser.add_argument("--output-dir", help="Directory to save the generated image")
    parser.add_argument("--api-key", help="OpenAI API key (defaults to OPENAI_API_KEY environment variable)")
    parser.add_argument("--prefix", help="Prefix for the output filename", default="")
    parser.add_argument("--format", choices=["json", "text"], default="json", 
                        help="Output format (json or text)")
    
    args = parser.parse_args()
    
    # Call the core function
    result = generate_image(
        prompt=args.prompt,
        size=args.size,
        quality=args.quality,
        style=args.style,
        output_dir=args.output_dir,
        api_key=args.api_key,
        filename_prefix=args.prefix
    )
    
    # Format and output the result
    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        # Text format
        if result["success"]:
            print(f"Image generated successfully!")
            print(f"Prompt: {result['prompt']}")
            print(f"Image URL: {result['image_url']}")
            
            if result["saved_path"]:
                print(f"Image saved to: {result['saved_path']}")
        else:
            print(f"Error generating image: {result['error']}")
            print(f"Prompt: {result['prompt']}")

if __name__ == "__main__":
    main() 