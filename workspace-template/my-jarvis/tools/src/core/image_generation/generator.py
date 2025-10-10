#!/usr/bin/env python3
"""
Core image generation functionality using OpenAI DALL-E models.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, Literal
import openai
from dotenv import load_dotenv

# Define type aliases for better documentation and type checking
ImageSize = Literal["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]
ImageQuality = Literal["standard", "hd"]
ImageStyle = Literal["vivid", "natural"]

def generate_image(
    prompt: str,
    size: ImageSize = "1024x1024",
    quality: ImageQuality = "standard",
    style: ImageStyle = "vivid",
    output_dir: Optional[str] = None,
    api_key: Optional[str] = None,
    filename_prefix: str = "",
) -> Dict[str, Any]:
    """
    Generate an image using OpenAI's DALL-E model.
    
    Args:
        prompt: Description of the desired image
        size: Size of the generated image (256x256, 512x512, 1024x1024, 1792x1024, or 1024x1792)
        quality: Quality of the generated image (standard or hd)
        style: Style of the generated image (vivid or natural)
        output_dir: Directory to save the generated image
        api_key: OpenAI API key (falls back to environment variable)
        filename_prefix: Optional prefix for the output filename
        
    Returns:
        Dictionary containing image URL and saved file path
    """
    try:
        # Load environment variables if not done already
        load_dotenv()
        
        # Set up OpenAI API key
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {
                "success": False,
                "error": "OpenAI API key not found. Please provide it as a parameter or set OPENAI_API_KEY environment variable.",
                "prompt": prompt
            }
        
        openai.api_key = api_key
        
        # Validate parameters
        valid_sizes = ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]
        valid_qualities = ["standard", "hd"]
        valid_styles = ["vivid", "natural"]
        
        if size not in valid_sizes:
            raise ValueError(f"Invalid size: {size}. Must be one of {valid_sizes}")
        
        if quality not in valid_qualities:
            raise ValueError(f"Invalid quality: {quality}. Must be one of {valid_qualities}")
            
        if style not in valid_styles:
            raise ValueError(f"Invalid style: {style}. Must be one of {valid_styles}")
        
        # Generate the image
        response = openai.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality=quality,
            style=style,
            n=1
        )
        
        # Extract image URL
        image_url = response.data[0].url
        
        # Save the image locally if output_dir is specified
        saved_path = None
        if output_dir:
            import requests
            from PIL import Image
            from io import BytesIO
            
            # Create output directory if it doesn't exist
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Generate a filename based on the timestamp and a simplified prompt
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            simplified_prompt = "".join(c for c in prompt[:30] if c.isalnum() or c.isspace()).strip().replace(" ", "_")
            
            # Use prefix if provided
            if filename_prefix:
                filename = f"{filename_prefix}_{timestamp}_{simplified_prompt}.png"
            else:
                filename = f"{timestamp}_{simplified_prompt}.png"
                
            filepath = output_path / filename
            
            # Download and save the image
            response = requests.get(image_url)
            img = Image.open(BytesIO(response.content))
            img.save(filepath)
            saved_path = str(filepath)
            
        return {
            "success": True,
            "image_url": image_url,
            "saved_path": saved_path,
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "style": style
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "prompt": prompt
        } 