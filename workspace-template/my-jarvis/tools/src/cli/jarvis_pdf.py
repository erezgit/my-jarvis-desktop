#!/usr/bin/env python3
"""
Jarvis PDF Generation CLI

This script provides a command-line interface for generating PDFs from various source formats.
It serves as a convenient wrapper around the document generation core functionality.
"""

import os
import sys
import argparse
from pathlib import Path

# Add the parent directory to sys.path to allow importing from core
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from core.document_generation.pdf_generator import markdown_to_pdf
except ImportError:
    print("Error: Could not import PDF generation module.")
    print("Make sure the virtual environment is activated or dependencies are installed.")
    sys.exit(1)


def main():
    """Main entry point for the Jarvis PDF CLI"""
    parser = argparse.ArgumentParser(
        description='Jarvis PDF Generator - Convert documents to PDF format',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        'source_file',
        help='Source file to convert to PDF'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='Output PDF file path (defaults to source filename with .pdf extension)'
    )
    
    parser.add_argument(
        '-t', '--title',
        help='Document title (defaults to extracted from first heading)'
    )
    
    parser.add_argument(
        '-a', '--author',
        default='Jarvis',
        help='Document author'
    )
    
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose output'
    )
    
    args = parser.parse_args()
    
    # Validate that source file exists
    if not os.path.exists(args.source_file):
        print(f"Error: Source file '{args.source_file}' not found.")
        sys.exit(1)
    
    # Currently only supporting markdown
    if not args.source_file.lower().endswith(('.md', '.markdown')):
        print(f"Warning: File '{args.source_file}' doesn't appear to be a markdown file.")
        print("Currently only markdown files are supported.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    
    try:
        if args.verbose:
            print(f"Converting '{args.source_file}' to PDF...")
            if args.output:
                print(f"Output will be saved to '{args.output}'")
            
        output_file = markdown_to_pdf(
            args.source_file,
            args.output,
            args.title,
            args.author
        )
        
        if args.verbose:
            print(f"PDF generation complete: '{output_file}'")
            
    except Exception as e:
        print(f"Error generating PDF: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 