# Knowledge Base Guide

## Overview

The Knowledge Base system automatically processes uploaded PDF documents by:
1. Breaking them into manageable chunks (5 pages per chunk)
2. Extracting text from each chunk
3. Saving each chunk as a markdown file for easy access

This creates a searchable, structured knowledge base from your documents.

---

## How It Works

### Automatic Processing

When you upload a PDF file through the web interface:

1. **Upload**: File is saved to `my-jarvis/docs/`
2. **Processing**: Python script automatically processes the PDF
3. **Chunking**: Document is divided into 5-page chunks
4. **Extraction**: Text is extracted and saved as markdown
5. **Storage**: Chunks are saved in `my-jarvis/knowledge-base/`

### Directory Structure

```
my-jarvis/
├── docs/                          # Uploaded PDF files
│   └── your-document.pdf
└── knowledge-base/                # Processed knowledge base
    └── your-document/
        ├── metadata.json         # Processing metadata
        └── chunks/
            ├── chunk-001.md     # Pages 1-5
            ├── chunk-002.md     # Pages 6-10
            ├── chunk-003.md     # Pages 11-15
            └── ...
```

---

## Using the Knowledge Base

### Uploading Documents

1. Go to the web interface at: `https://my-jarvis-erez-dev.fly.dev`
2. Use the file upload feature
3. Select your PDF document
4. Upload completes and processing starts automatically

### Accessing Processed Content

Each chunk is saved as a markdown file with:
- **Chunk number**: Sequential numbering (001, 002, 003...)
- **Page range**: Which pages are in this chunk
- **Extracted text**: Full text content from those pages

### Example Chunk File

**File**: `knowledge-base/quantum-computing-primer/chunks/chunk-001.md`

```markdown
# Chunk 1

**Pages**: 1-5

---

## Page 1

Introduction to Quantum Computing
...

---

## Page 2

Quantum Bits and Superposition
...

---

...
```

### Metadata File

Each document has a `metadata.json` file with processing details:

```json
{
  "file_name": "quantum-computing-primer",
  "original_path": "/workspace/my-jarvis/docs/quantum-computing-primer.pdf",
  "processed_at": "2025-10-19T13:49:00.000000",
  "chunk_count": 60,
  "pages_per_chunk": 5,
  "status": "completed"
}
```

---

## Technical Details

### Processing Script

**Location**: `lib/claude-webui-server/scripts/process_document.py`

**Dependencies**:
- Python 3
- pdfplumber library

**Parameters**:
- Chunk size: 5 pages per chunk
- Text extraction: Uses pdfplumber for accurate text extraction
- Encoding: UTF-8 for all markdown files

### Upload Handler Integration

**File**: `lib/claude-webui-server/handlers/upload.ts`

The upload handler automatically:
1. Detects PDF file uploads
2. Spawns Python process to handle processing
3. Logs processing progress
4. Creates knowledge base structure
5. Returns success when complete

---

## Command Examples

### Manual Script Execution

If you need to manually process a PDF:

```bash
python3 lib/claude-webui-server/scripts/process_document.py \
  /path/to/document.pdf \
  /workspace/my-jarvis \
  document-name
```

### Viewing Knowledge Base

```bash
# List all processed documents
ls -la my-jarvis/knowledge-base/

# View chunks for a specific document
ls -la my-jarvis/knowledge-base/your-document/chunks/

# Read a specific chunk
cat my-jarvis/knowledge-base/your-document/chunks/chunk-001.md

# View metadata
cat my-jarvis/knowledge-base/your-document/metadata.json
```

---

## Working with Claude

### Reading Knowledge Base Content

You can ask Claude to work with your knowledge base:

**Example requests**:
- "Read the knowledge base for quantum-computing-primer and summarize the key concepts"
- "Search the knowledge base for information about superposition"
- "Compare chunk-001 and chunk-010 from the machine-learning document"

**Claude can**:
- Read any chunk file
- Search across multiple chunks
- Summarize content
- Extract specific information
- Compare sections

### Knowledge Base Commands

```bash
# Ask Claude to read a document's knowledge base
"Read the knowledge base guide, then summarize the quantum computing document"

# Ask Claude to search the knowledge base
"Search the knowledge base for all mentions of neural networks"

# Ask Claude to work with specific chunks
"Read chunks 1-5 from the machine-learning document and extract key definitions"
```

---

## Current Limitations

1. **PDF Only**: Currently only processes PDF files
2. **Text Only**: No image extraction (text extraction only)
3. **Fixed Chunk Size**: 5 pages per chunk (optimized for memory)
4. **No Summarization**: Raw text extraction only (AI summarization in future phases)
5. **Manual Search**: No automated indexing yet (planned for future)

---

## Future Enhancements

### Phase 3: AI Summarization
- Add Claude API integration
- Generate summaries for each chunk
- Create document-level summaries

### Phase 4: Conversation Integration
- Ask questions about documents
- Citation tracking
- Cross-document search

### Phase 5: UI Polish
- Visual knowledge base browser
- Search interface
- Document management dashboard

---

## Troubleshooting

### Processing Failures

**Check logs**: Processing output appears in server logs
```bash
# View server logs for processing status
docker logs [container-id] | grep "PDF processing"
```

**Common issues**:
- Large PDFs may take time to process
- Memory limits: 5 pages per chunk prevents memory issues
- Text extraction quality depends on PDF structure

### Accessing Files

**Knowledge base location**: Always in `my-jarvis/knowledge-base/`
**Document name**: Derived from original filename (without .pdf extension)
**Chunk files**: Sequential numbering with zero-padding (001, 002, etc.)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Upload PDF | Use web interface file upload |
| View all documents | `ls my-jarvis/knowledge-base/` |
| View document chunks | `ls my-jarvis/knowledge-base/[document-name]/chunks/` |
| Read chunk | `cat my-jarvis/knowledge-base/[document-name]/chunks/chunk-XXX.md` |
| Check metadata | `cat my-jarvis/knowledge-base/[document-name]/metadata.json` |
| Manual processing | `python3 lib/claude-webui-server/scripts/process_document.py [pdf] [workspace] [name]` |

---

**Last Updated**: 2025-10-19
**Version**: 1.0 (Phase 2 - Chunking and Extraction)
**Status**: Production Ready
