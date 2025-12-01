# Phase 2: PDF Chunking and Text Extraction

## Status: Ready for Implementation
**Created**: 2025-10-19
**Priority**: High
**Focus**: Implement PDF chunking and markdown extraction only

---

## Objective

Create a Python script that:
1. Takes a PDF file as input
2. Breaks it into chunks of 15 pages each
3. Extracts text from each chunk
4. Saves each chunk as a markdown file

No summarization, no AI, no indexing. Just chunking and extraction.

---

## Implementation

### File Location
`/workspace/my-jarvis/projects/my-jarvis-desktop/lib/claude-webui-server/scripts/process_document.py`

### Script Implementation

```python
#!/usr/bin/env python3
"""
PDF Document Processor - Phase 2
Chunks PDFs and extracts text to markdown files
"""

import sys
import os
from pathlib import Path
import json
from datetime import datetime

# Required: pip install pdfplumber
import pdfplumber


def main(file_path, workspace_path, file_name):
    """
    Process PDF: chunk and extract text to markdown

    Args:
        file_path: Path to uploaded PDF file
        workspace_path: User's workspace directory
        file_name: Original filename (without extension)
    """
    print(f"Processing: {file_path}")
    print(f"Workspace: {workspace_path}")
    print(f"Document name: {file_name}")

    # Create knowledge base directory structure
    kb_path = create_kb_structure(workspace_path, file_name)
    print(f"Knowledge base path: {kb_path}")

    # Chunk the PDF
    chunks = chunk_pdf(file_path, pages_per_chunk=15)
    print(f"Created {len(chunks)} chunks")

    # Extract text from each chunk and save as markdown
    extract_and_save_chunks(file_path, chunks, kb_path)

    # Save metadata
    save_metadata(kb_path, file_name, file_path, len(chunks))

    print("✅ Processing complete!")


def create_kb_structure(workspace_path, file_name):
    """
    Create directory structure for knowledge base

    Returns:
        Path to document's knowledge base directory
    """
    # Remove file extension if present
    clean_name = Path(file_name).stem

    # Create: workspace/knowledge-base/document-name/
    kb_base = Path(workspace_path) / "knowledge-base" / clean_name
    kb_base.mkdir(parents=True, exist_ok=True)

    # Create chunks subdirectory
    chunks_dir = kb_base / "chunks"
    chunks_dir.mkdir(exist_ok=True)

    return kb_base


def chunk_pdf(file_path, pages_per_chunk=15):
    """
    Divide PDF into chunks by page ranges

    Args:
        file_path: Path to PDF file
        pages_per_chunk: Number of pages per chunk

    Returns:
        List of chunk definitions with start/end pages
    """
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")

        chunks = []
        chunk_num = 1

        for start_idx in range(0, total_pages, pages_per_chunk):
            end_idx = min(start_idx + pages_per_chunk, total_pages)

            chunks.append({
                'chunk_number': chunk_num,
                'start_page': start_idx + 1,  # 1-indexed for user display
                'end_page': end_idx,
                'start_idx': start_idx,       # 0-indexed for code
                'end_idx': end_idx
            })

            chunk_num += 1

        return chunks


def extract_and_save_chunks(file_path, chunks, kb_path):
    """
    Extract text from each chunk and save as markdown

    Args:
        file_path: Path to PDF file
        chunks: List of chunk definitions
        kb_path: Knowledge base directory path
    """
    with pdfplumber.open(file_path) as pdf:
        for chunk in chunks:
            print(f"Processing chunk {chunk['chunk_number']}: pages {chunk['start_page']}-{chunk['end_page']}")

            # Extract text from all pages in this chunk
            chunk_text = []

            for page_idx in range(chunk['start_idx'], chunk['end_idx']):
                page = pdf.pages[page_idx]
                text = page.extract_text()

                if text:
                    # Add page number header
                    chunk_text.append(f"## Page {page_idx + 1}\n")
                    chunk_text.append(text)
                    chunk_text.append("\n\n---\n\n")  # Page separator

            # Combine all text for this chunk
            full_text = "\n".join(chunk_text)

            # Create markdown content with metadata
            markdown = create_markdown(chunk, full_text)

            # Save to file: chunk-001.md, chunk-002.md, etc.
            chunk_file = kb_path / "chunks" / f"chunk-{chunk['chunk_number']:03d}.md"
            chunk_file.write_text(markdown, encoding='utf-8')

            print(f"  ✓ Saved: {chunk_file.name}")


def create_markdown(chunk, text):
    """
    Format extracted text as markdown with metadata

    Args:
        chunk: Chunk definition dict
        text: Extracted text content

    Returns:
        Formatted markdown string
    """
    markdown = f"""# Chunk {chunk['chunk_number']}

**Pages**: {chunk['start_page']}-{chunk['end_page']}

---

{text}
"""
    return markdown


def save_metadata(kb_path, file_name, file_path, chunk_count):
    """
    Save processing metadata as JSON

    Args:
        kb_path: Knowledge base directory
        file_name: Original filename
        file_path: Path to original file
        chunk_count: Number of chunks created
    """
    metadata = {
        'file_name': file_name,
        'original_path': str(file_path),
        'processed_at': datetime.now().isoformat(),
        'chunk_count': chunk_count,
        'pages_per_chunk': 15,
        'status': 'completed'
    }

    metadata_file = kb_path / "metadata.json"
    metadata_file.write_text(json.dumps(metadata, indent=2), encoding='utf-8')

    print(f"  ✓ Saved: metadata.json")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 process_document.py <file_path> <workspace_path> <file_name>")
        sys.exit(1)

    file_path = sys.argv[1]
    workspace_path = sys.argv[2]
    file_name = sys.argv[3]

    # Verify file exists
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    # Run processing
    try:
        main(file_path, workspace_path, file_name)
    except Exception as e:
        print(f"Error processing document: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
```

---

## Backend Integration

### Update Upload Handler

**File**: `/workspace/my-jarvis/projects/my-jarvis-desktop/lib/claude-webui-server/handlers/upload.ts`

Add Python script execution after file upload:

```typescript
import { spawn } from 'child_process';
import path from 'path';

// After successful file upload, trigger processing
async function processUploadedDocument(
  filePath: string,
  workspacePath: string,
  fileName: string
) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'process_document.py');

  return new Promise((resolve, reject) => {
    const process = spawn('python3', [
      scriptPath,
      filePath,
      workspacePath,
      fileName
    ]);

    process.stdout.on('data', (data) => {
      console.log(`[Python] ${data.toString()}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`[Python Error] ${data.toString()}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('Document processing completed successfully');
        resolve({ success: true });
      } else {
        reject(new Error(`Processing failed with code ${code}`));
      }
    });
  });
}

// In the upload handler:
app.post('/api/upload-document', upload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workspacePath = '/workspace'; // or get from user context
    const fileName = file.originalname;

    // Trigger background processing
    processUploadedDocument(file.path, workspacePath, fileName)
      .then(() => console.log('Processing complete'))
      .catch(err => console.error('Processing error:', err));

    // Return immediately (processing happens in background)
    res.json({
      success: true,
      message: 'File uploaded successfully. Processing in background.',
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

---

## Installation

### Install Python Dependencies

```bash
cd /workspace/my-jarvis/projects/my-jarvis-desktop
pip3 install pdfplumber
```

Or add to requirements.txt:
```
pdfplumber==0.10.3
```

---

## Testing

### Test Script Manually

```bash
# 1. Create test PDF or use existing one
cd /workspace/my-jarvis/projects/my-jarvis-desktop

# 2. Run script directly
python3 lib/claude-webui-server/scripts/process_document.py \
  /path/to/test.pdf \
  /workspace \
  test-document

# 3. Verify output
ls -la /workspace/knowledge-base/test-document/
ls -la /workspace/knowledge-base/test-document/chunks/

# 4. Check a chunk file
cat /workspace/knowledge-base/test-document/chunks/chunk-001.md
```

### Test Through Upload API

```bash
# Upload a PDF through the API
curl -X POST http://localhost:10000/api/upload-document \
  -F "document=@/path/to/test.pdf"

# Check processing output in server logs
# Verify files created in workspace/knowledge-base/
```

---

## Expected Output Structure

```
workspace/knowledge-base/
└── document-name/
    ├── metadata.json              # Processing metadata
    └── chunks/
        ├── chunk-001.md          # Pages 1-15
        ├── chunk-002.md          # Pages 16-30
        ├── chunk-003.md          # Pages 31-45
        └── ...
```

### Example metadata.json
```json
{
  "file_name": "example.pdf",
  "original_path": "/workspace/uploads/documents/example.pdf",
  "processed_at": "2025-10-19T08:15:30.123456",
  "chunk_count": 20,
  "pages_per_chunk": 15,
  "status": "completed"
}
```

### Example chunk-001.md
```markdown
# Chunk 1

**Pages**: 1-15

---

## Page 1

[Extracted text from page 1...]

---

## Page 2

[Extracted text from page 2...]

---

...
```

---

## Success Criteria

- [x] Script creates correct directory structure
- [x] PDF is chunked into 15-page segments
- [x] Each chunk saved as separate markdown file
- [x] Text extraction preserves content accurately
- [x] Metadata JSON file created with correct info
- [x] Script runs successfully from backend
- [x] Can process 300-page PDF without errors

---

## Next Steps (Future Phases)

After this phase is complete and tested:
- Phase 3: Add Claude API summarization
- Phase 4: Conversation integration
- Phase 5: UI polish

But for now: **Just chunking and extraction.**
