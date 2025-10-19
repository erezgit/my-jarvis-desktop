#!/usr/bin/env python3
"""
PDF Generator module for converting markdown and other formats to PDF

This module provides functionality to generate professionally styled PDFs
from various source formats, primarily markdown.
"""

import os
import sys
import argparse
from datetime import datetime

try:
    import markdown
    from weasyprint import HTML, CSS
except ImportError:
    print("Required packages not found. Install with:")
    print("pip install markdown weasyprint")
    sys.exit(1)

def markdown_to_pdf(markdown_file, output_file=None, title=None, author="Jarvis"):
    """
    Convert a markdown file to a professionally styled PDF
    
    Args:
        markdown_file (str): Path to the markdown file to convert
        output_file (str, optional): Path to save the output PDF. Defaults to same filename with .pdf extension.
        title (str, optional): Title to use in the PDF. Defaults to None (extracted from markdown).
        author (str, optional): Author name for the footer. Defaults to "Jarvis".
        
    Returns:
        str: Path to the generated PDF file
    """
    # If no output file specified, use the markdown filename with .pdf extension
    if not output_file:
        output_file = os.path.splitext(markdown_file)[0] + '.pdf'
    
    # Read markdown content
    with open(markdown_file, 'r') as f:
        markdown_content = f.read()
    
    # Check if markdown starts with H1 heading
    lines = markdown_content.split('\n')
    starts_with_h1 = False
    for line in lines:
        if line.strip():  # First non-empty line
            if line.startswith('# '):
                starts_with_h1 = True
                if not title:
                    title = line.replace('# ', '')
            break
    
    if not title:
        title = os.path.basename(os.path.splitext(markdown_file)[0]).replace('_', ' ').title()
    
    # Convert markdown to HTML
    html_content = markdown.markdown(
        markdown_content, 
        extensions=['tables', 'fenced_code', 'codehilite', 'nl2br']
    )
    
    # Add some CSS for better styling
    css = CSS(string='''
        @page {
            margin: 2cm;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
        }
        h1 {
            color: #1a1a1a;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.5em;
            margin-bottom: 1em;
        }
        h2 {
            color: #333;
            margin-top: 1.5em;
            border-bottom: 1px solid #eee;
        }
        h3 {
            color: #444;
            margin-top: 1.2em;
        }
        ul, ol {
            margin-bottom: 1.5em;
        }
        li {
            margin-bottom: 0.5em;
        }
        p {
            margin-bottom: 1.2em;
        }
        strong {
            color: #000;
        }
        code {
            background-color: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f5f5f5;
            padding: 1em;
            border-radius: 3px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 1em;
            color: #666;
            margin-left: 0;
        }
        table {
            border-collapse: collapse;
            margin: 1em 0;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 2em;
        }
        .footer {
            margin-top: 2em;
            font-size: 0.8em;
            color: #888;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 1em;
        }
    ''')
    
    # Add header, footer, and wrap in proper HTML structure
    current_date = datetime.now().strftime("%B %d, %Y")
    
    # Only add header with title if markdown doesn't start with H1
    header_section = ""
    if not starts_with_h1:
        header_section = f"""
        <div class="header">
            <h1>{title}</h1>
        </div>
        """
    
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
    </head>
    <body>
        {header_section}
        
        {html_content}
        
        <div class="footer">
            Generated on {current_date} by {author}
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    HTML(string=full_html).write_pdf(output_file, stylesheets=[css])
    
    print(f"PDF successfully created at: {output_file}")
    return output_file


def main():
    """Command line interface for the PDF generator"""
    parser = argparse.ArgumentParser(description='Convert markdown to PDF')
    parser.add_argument('input_file', help='The markdown file to convert')
    parser.add_argument('-o', '--output', help='Output PDF file path')
    parser.add_argument('-t', '--title', help='Document title')
    parser.add_argument('-a', '--author', default='Jarvis', help='Document author')
    
    args = parser.parse_args()
    
    try:
        markdown_to_pdf(args.input_file, args.output, args.title, args.author)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 