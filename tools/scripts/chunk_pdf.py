#!/usr/bin/env python3
"""
PDF Chunking Script for Jarvis Knowledge Base
Chunks PDFs into manageable segments and extracts text to markdown files.
"""

import pdfplumber
import argparse
import json
from pathlib import Path

def chunk_pdf(input_path: str, output_dir: str, pages_per_chunk: int = 15):
    """
    Chunk a PDF file into segments and extract text to markdown files.

    Args:
        input_path: Path to the input PDF file
        output_dir: Directory to save chunked markdown files
        pages_per_chunk: Number of pages per chunk (default: 15)
    """
    input_file = Path(input_path)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    metadata = {
        "source_file": input_file.name,
        "total_pages": 0,
        "chunks": []
    }

    with pdfplumber.open(input_file) as pdf:
        metadata["total_pages"] = len(pdf.pages)
        total_pages = len(pdf.pages)

        chunk_num = 0
        for i in range(0, total_pages, pages_per_chunk):
            chunk_num += 1
            chunk_filename = f"chunk-{chunk_num:03d}.md"
            chunk_path = output_path / chunk_filename

            # Extract text from this chunk's pages
            chunk_text = []
            start_page = i + 1  # 1-indexed for display
            end_page = min(i + pages_per_chunk, total_pages)

            for page_num in range(i, end_page):
                page = pdf.pages[page_num]
                text = page.extract_text()
                if text:
                    chunk_text.append(f"# Page {page_num + 1}\n\n{text}")

            # Write chunk to markdown file
            with open(chunk_path, 'w', encoding='utf-8') as f:
                f.write('\n\n---\n\n'.join(chunk_text))

            # Record metadata
            metadata["chunks"].append({
                "chunk_number": chunk_num,
                "filename": chunk_filename,
                "page_range": f"{start_page}-{end_page}",
                "page_count": end_page - start_page + 1
            })

            print(f"Created {chunk_filename}: pages {start_page}-{end_page}")

    # Save metadata
    metadata_path = output_path / "metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, indent=2, fp=f)

    print(f"\nProcessing complete!")
    print(f"Total chunks: {chunk_num}")
    print(f"Metadata saved to: {metadata_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chunk PDF files for Jarvis knowledge base")
    parser.add_argument("input_path", help="Path to input PDF file")
    parser.add_argument("output_dir", help="Directory to save chunked markdown files")
    parser.add_argument("--pages-per-chunk", type=int, default=15, help="Pages per chunk (default: 15)")

    args = parser.parse_args()
    chunk_pdf(args.input_path, args.output_dir, args.pages_per_chunk)
