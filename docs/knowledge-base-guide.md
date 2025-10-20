# Knowledge Base System - User Guide

## Overview

The Knowledge Base system allows you to upload large PDF documents and automatically process them into an accessible knowledge base that Jarvis can reference during conversations.

---

## Quick Start

### 1. Upload Your Document

In the chat interface, click the **📎 Upload Document** button and select your PDF file (up to 100MB).

### 2. Processing

The system will automatically:
- Save your document to the workspace
- Split it into manageable chunks (5 pages per chunk by default)
- Extract text from each chunk
- Create markdown files for easy reference

### 3. Use in Conversations

Once processed, simply ask Jarvis questions about your document:
- "What does my document say about [topic]?"
- "Summarize chapter 3"
- "Find information about [specific concept]"

Jarvis will automatically search the knowledge base and cite specific sections.

---

## How It Works

### Processing Flow

```
Upload PDF → Backend Saves File → Python Script Processes →
Knowledge Base Created → Jarvis Accesses During Conversations
```

### What Gets Created

When you upload a document named `example.pdf`, the system creates:

```
workspace/knowledge-base/example/
├── metadata.json              # Processing info, chunk count, timestamp
└── chunks/
    ├── chunk-001.md          # Pages 1-5
    ├── chunk-002.md          # Pages 6-10
    ├── chunk-003.md          # Pages 11-15
    └── ...
```

### Chunk Structure

Each chunk file contains:
- **Header**: Chunk number and page range
- **Content**: Extracted text organized by page
- **Separators**: Clear page boundaries for easy navigation

Example chunk file:
```markdown
# Chunk 1

**Pages**: 1-5

---

## Page 1

[Text from page 1...]

---

## Page 2

[Text from page 2...]

---
```

---

## Using the Python Processing Script

### Manual Processing (Advanced)

If you need to process a document manually or re-process with different settings:

```bash
cd /workspace/my-jarvis/projects/my-jarvis-desktop
python3 lib/claude-webui-server/scripts/process_document.py \
  <file_path> \
  <workspace_path> \
  <document_name>
```

**Arguments:**
- `file_path`: Full path to the PDF file
- `workspace_path`: Your workspace directory (usually `/workspace`)
- `document_name`: Name for the knowledge base directory (without extension)

**Example:**
```bash
python3 lib/claude-webui-server/scripts/process_document.py \
  /workspace/uploads/theory-book.pdf \
  /workspace \
  theory-book
```

### Script Configuration

The script has configurable settings in `process_document.py`:

**Pages Per Chunk** (Line 47)
```python
chunks = chunk_pdf(file_path, pages_per_chunk=5)
```

- **Default**: 5 pages per chunk
- **Recommended for large PDFs**: 5-10 pages
- **For small documents**: Can increase to 15-20 pages
- **Memory consideration**: Smaller chunks = less memory usage

**Why 5 Pages?**
- Fits within 1GB memory limit on Fly.io
- Prevents instance freezing during processing
- Creates manageable file sizes
- Faster processing and better reliability

---

## Troubleshooting

### Instance Freezing During Processing

**Symptom**: The my-jarvis-erez instance becomes unresponsive during PDF processing

**Cause**: PDF processing is memory-intensive. Processing too many pages at once can exceed the 1GB memory limit.

**Solution**: The script is configured to process 5 pages per chunk by default, which should work within the memory limit.

**If still freezing**:
1. Reduce chunk size to 3 pages:
   ```python
   chunks = chunk_pdf(file_path, pages_per_chunk=3)
   ```
2. Process smaller PDFs (under 100 pages)
3. Consider increasing instance memory to 2GB (costs ~$2-4/month)

### Processing Takes Too Long

**Expected Times**:
- 50-page PDF: ~2-3 minutes
- 100-page PDF: ~4-6 minutes
- 300-page PDF: ~12-15 minutes

**If slower than expected**:
1. Check instance health: `fly status --app my-jarvis-erez`
2. Monitor logs: `fly logs --app my-jarvis-erez`
3. Restart if frozen: `fly machine restart <machine-id> --app my-jarvis-erez`

### No Output Files Created

**Check**:
1. Did the upload succeed? Check `workspace/uploads/`
2. Is the Python script present? Check `lib/claude-webui-server/scripts/process_document.py`
3. Are dependencies installed? Run `pip install pdfplumber`

**Re-run processing**:
```bash
python3 lib/claude-webui-server/scripts/process_document.py \
  /path/to/file.pdf \
  /workspace \
  document-name
```

### Hebrew/RTL Text Issues

The script supports Hebrew and right-to-left languages. If text appears garbled:
1. Ensure PDF uses Unicode encoding (not image-based)
2. Check that pdfplumber extracted text correctly
3. For scanned PDFs, OCR is not currently supported

---

## Best Practices

### Document Preparation

1. **File Size**: Keep PDFs under 100MB for best performance
2. **Quality**: Use text-based PDFs (not scanned images)
3. **Structure**: Well-structured PDFs with clear headings work best
4. **Language**: Any language supported, including Hebrew, Arabic, etc.

### Naming Conventions

- Use descriptive names: `music-theory-workbook` not `document1`
- Avoid spaces: Use hyphens or underscores
- Use English characters for directory names (even if content is Hebrew)

### Processing Strategy

**For Large Documents (200+ pages)**:
- Process during low-usage times
- Monitor the instance during processing
- Consider breaking into multiple smaller PDFs

**For Multiple Documents**:
- Process one at a time
- Wait for each to complete before uploading next
- Check knowledge base structure after each upload

---

## Advanced Usage

### Accessing Knowledge Base Files

All processed documents are in:
```
/workspace/knowledge-base/<document-name>/
```

You can:
- Read chunk files directly
- Edit markdown if needed
- Add custom notes to chunks
- Organize multiple documents

### Referencing Specific Chunks

When asking Jarvis questions, you can reference specific chunks:
- "Read chunk 5 from my music theory document"
- "What does chunk 12 say about harmony?"
- "Compare chunks 3 and 7"

### Multiple Documents

The system supports multiple documents in the knowledge base:
```
workspace/knowledge-base/
├── music-theory/
│   └── chunks/...
├── harmony-workbook/
│   └── chunks/...
└── composition-guide/
    └── chunks/...
```

Jarvis can search across all documents or focus on specific ones when you specify.

---

## Deployment Updates

### When Script Changes Are Made

If the processing script (`process_document.py`) is updated:

1. **Commit changes locally**:
   ```bash
   git add lib/claude-webui-server/scripts/process_document.py
   git commit -m "Update PDF processing script"
   git push
   ```

2. **Deploy to Fly.io**:
   ```bash
   fly deploy --app my-jarvis-erez --update-only
   ```

3. **Verify deployment**:
   ```bash
   fly ssh console --app my-jarvis-erez -C \
     "cat /workspace/my-jarvis/projects/my-jarvis-desktop/lib/claude-webui-server/scripts/process_document.py | grep pages_per_chunk"
   ```

---

## Performance Optimization

### Memory Usage

**Current Configuration**:
- Instance memory: 1GB
- Pages per chunk: 5
- Max PDF size: 100MB

**If you need to process larger documents**:

Option 1: Increase memory (fly.toml):
```toml
[[vm]]
  memory = "2gb"  # Cost: ~$2-4/month
```

Option 2: Reduce chunk size (process_document.py):
```python
chunks = chunk_pdf(file_path, pages_per_chunk=3)  # Smaller chunks
```

### Processing Speed

**Factors affecting speed**:
1. PDF complexity (tables, images, formatting)
2. File size
3. Number of pages
4. Instance resources

**To speed up**:
- Use well-structured, text-based PDFs
- Process smaller documents in batches
- Ensure instance isn't running other heavy tasks

---

## FAQ

### Q: Can I upload Word documents?
A: Currently only PDF files are supported. Convert .docx files to PDF first.

### Q: What happens to the original file?
A: The original PDF is saved in `workspace/uploads/` and kept for reference.

### Q: Can I delete processed documents?
A: Yes, simply delete the directory in `workspace/knowledge-base/<document-name>/`

### Q: How does Jarvis know which document to search?
A: Jarvis automatically searches all documents in the knowledge base. You can specify a document by name in your question.

### Q: Can I re-process a document?
A: Yes, upload it again and it will overwrite the previous version.

### Q: What if processing fails midway?
A: The instance will restart automatically via health checks. Re-run the processing manually or re-upload the file.

---

## Support

For issues or questions:
1. Check instance status: `fly status --app my-jarvis-erez`
2. Review logs: `fly logs --app my-jarvis-erez`
3. Restart if needed: `fly machine restart <machine-id> --app my-jarvis-erez`
4. Consult the implementation plan: `tickets/063-knowledge-base-and-presentation-automation/`

---

**Last Updated**: October 19, 2025
**Version**: 1.0
**Script Location**: `lib/claude-webui-server/scripts/process_document.py`
