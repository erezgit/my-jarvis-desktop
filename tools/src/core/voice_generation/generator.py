#!/usr/bin/env python3
"""
Core voice generation functionality using OpenAI text-to-speech models.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, Literal
import openai
import traceback
from dotenv import load_dotenv

# Define type aliases for better documentation and type checking
VoiceType = Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
AudioFormat = Literal["mp3", "opus", "aac", "flac", "wav"]

def generate_voice(
    text: str,
    voice: VoiceType = "nova",
    model: str = "tts-1",
    output_dir: Optional[str] = None,
    api_key: Optional[str] = None,
    response_format: AudioFormat = "mp3",
    speed: float = 1.0,
    filename_prefix: str = "",
) -> Dict[str, Any]:
    """
    Generate audio from text using OpenAI's text-to-speech model.
    
    Args:
        text: The text to convert to speech
        voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
        model: TTS model to use (tts-1, tts-1-hd)
        output_dir: Directory to save the generated audio
        api_key: OpenAI API key (falls back to environment variable)
        response_format: Audio format (mp3, opus, aac, flac, wav)
        speed: Speed of the generated audio (0.25 to 4.0)
        filename_prefix: Optional prefix for the output filename
        
    Returns:
        Dictionary containing status and file path
    """
    try:
        # Load environment variables if not done already
        load_dotenv()
        
        # Set up OpenAI API key - IMPORTANT: strip any whitespace
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if api_key:
            api_key = api_key.strip()
        
        if not api_key:
            return {
                "success": False,
                "error": "OpenAI API key not found. Please provide it as a parameter or set OPENAI_API_KEY environment variable.",
                "text": text[:100] + "..." if len(text) > 100 else text
            }
        
        client = openai.OpenAI(api_key=api_key)
        
        # Validate parameters
        valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        valid_models = ["tts-1", "tts-1-hd"]
        valid_formats = ["mp3", "opus", "aac", "flac", "wav"]
        
        if voice not in valid_voices:
            raise ValueError(f"Invalid voice: {voice}. Must be one of {valid_voices}")
        
        if model not in valid_models:
            raise ValueError(f"Invalid model: {model}. Must be one of {valid_models}")
            
        if response_format not in valid_formats:
            raise ValueError(f"Invalid format: {response_format}. Must be one of {valid_formats}")
            
        if speed < 0.25 or speed > 4.0:
            raise ValueError(f"Invalid speed: {speed}. Must be between 0.25 and 4.0")
        
        # Generate the audio
        response = client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format=response_format,
            speed=speed
        )
        
        # Save the audio locally if output_dir is specified
        saved_path = None
        if output_dir:
            # Create output directory if it doesn't exist
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Generate a filename based on the timestamp and a simplified text
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            simplified_text = "".join(c for c in text[:30] if c.isalnum() or c.isspace()).strip().replace(" ", "_")
            
            # Use prefix if provided
            if filename_prefix:
                filename = f"{filename_prefix}_{timestamp}_{simplified_text}.{response_format}"
            else:
                filename = f"{timestamp}_{simplified_text}.{response_format}"
                
            filepath = output_path / filename
            
            # Save the audio
            with open(filepath, "wb") as f:
                f.write(response.read())
            saved_path = str(filepath)
            
        return {
            "success": True,
            "saved_path": saved_path,
            "text": text[:100] + "..." if len(text) > 100 else text,
            "voice": voice,
            "model": model,
            "format": response_format,
            "speed": speed
        }
        
    except Exception as e:
        error_details = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error in generate_voice: {error_details}")
        return {
            "success": False,
            "error": str(e),
            "error_details": error_details,
            "text": text[:100] + "..." if len(text) > 100 else text
        }
