# Knowledge Base Builder - Implementation Plan

## Status: Ready for Implementation
**Created**: 2025-10-16
**Priority**: High - Immediate user need (Lilach)
**Estimated Timeline**: 1-2 weeks

---

## Overview

Build a system that allows users to upload large PDF/Word documents and automatically process them into an accessible knowledge base that Jarvis can reference during conversations.

---

## Architecture Flow

### High-Level Process
```
User uploads file → Backend saves file → Python script processes →
Knowledge base created → Jarvis accesses during conversations
```

### Detailed Flow

**Step 1: Upload (Frontend)**
- User clicks "Upload Document" button
- File picker opens (accepts .pdf, .docx, .doc)
- JavaScript sends file to backend API endpoint

**Step 2: Receive & Save (Backend - Node.js)**
- Endpoint: `POST /api/knowledge-base/upload`
- Receive file via Multer middleware
- Save to user workspace: `workspace/uploads/documents/original-filename.pdf`
- Return success + file metadata to frontend

**Step 3: Process Trigger (Backend - Node.js)**
- Backend calls Python processing script
- Pass file path and user workspace path as arguments
- Run as background job (non-blocking)
- Return processing status to frontend

**Step 4: Document Processing (Python Script)**

**4a. Chunk the Document**
- For PDF: Use PyPDF2 or pdfplumber
- Split into manageable chunks (e.g., 10-15 pages per chunk)
- For 300-page PDF → ~20-30 chunks
- Save chunk metadata (page ranges, chunk numbers)

**4b. Extract Text from Each Chunk**
- Use `pdfplumber` for PDFs (handles tables, layout)
- Use `python-docx` for Word documents
- Extract all text content from each chunk
- Preserve basic structure (paragraphs, headings)
- Save as markdown files: `chunk-001.md`, `chunk-002.md`, etc.
- Each chunk = raw 1:1 text extraction from document

**4c. Generate Summary**
- After all chunks extracted, read all markdown files
- Use Claude API to create condensed summary
- Target: ~10% of original length (300 pages → ~30 pages)
- Summary captures key concepts, main points, structure
- Save as `summary.md`

**4d. Create Index**
- Generate table of contents with chunk descriptions
- Include: chunk number, page range, brief description (1-2 sentences)
- Use Claude API to analyze each chunk and describe content
- Save as `index.md`

**Step 5: Storage Structure**
```
workspace/knowledge-base/
└── document-name/
    ├── original.pdf              # Original uploaded file
    ├── metadata.json             # File info, processing date, chunk count
    ├── chunks/
    │   ├── chunk-001.md         # Raw text: pages 1-15
    │   ├── chunk-002.md         # Raw text: pages 16-30
    │   └── ...
    ├── summary.md               # Condensed version (~10% size)
    └── index.md                 # Table of contents with descriptions
```

**Step 6: Access During Conversations**
- When user asks question, Jarvis reads `index.md` to find relevant chunks
- Loads specific chunks for detailed information
- References summary for overview context
- Cites source (e.g., "According to chunk-5 pages 60-75...")

---

## Technical Implementation Details

### Frontend Changes

**Component: DocumentUploader.tsx**
```typescript
// New component in app/components/
- File input with drag-and-drop
- Progress indicator during upload
- Success/error messaging
- List of uploaded documents
```

**API Integration**
```typescript
// POST /api/knowledge-base/upload
- FormData with file
- Handle large files (stream if needed)
- Show processing status
```

**UI Location**
- Add to sidebar or main chat interface
- "Knowledge Base" section
- Shows: uploaded documents, processing status, option to upload more

---

### Backend Changes (Node.js)

**New Endpoint: `/api/knowledge-base/upload`**
```javascript
// In lib/claude-webui-server/
import multer from 'multer';
import { spawn } from 'child_process';

const upload = multer({
  dest: 'workspace/uploads/documents/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

router.post('/api/knowledge-base/upload', upload.single('document'), async (req, res) => {
  // 1. Get uploaded file path
  // 2. Get user workspace path
  // 3. Spawn Python script as background process
  // 4. Return processing status
});
```

**Processing Script Caller**
```javascript
function processDocument(filePath, workspacePath, fileName) {
  const pythonScript = path.join(__dirname, 'scripts', 'process_document.py');

  const process = spawn('python3', [
    pythonScript,
    filePath,
    workspacePath,
    fileName
  ]);

  // Handle stdout/stderr
  // Log progress
  // Update status in database/file
}
```

**Status Tracking**
- Store processing status in JSON file or database
- Endpoint: `GET /api/knowledge-base/status/:documentId`
- Returns: processing, completed, error

---

### Python Processing Script

**File: `lib/claude-webui-server/scripts/process_document.py`**

```python
#!/usr/bin/env python3
import sys
import os
import json
from pathlib import Path

# Libraries needed
import pdfplumber  # PDF processing
from docx import Document  # Word processing
import anthropic  # Claude API for summarization

def main(file_path, workspace_path, file_name):
    """
    Process document and create knowledge base
    """
    # 1. Determine file type
    file_type = get_file_type(file_path)

    # 2. Create output directory structure
    kb_path = create_kb_structure(workspace_path, file_name)

    # 3. Chunk the document
    chunks = chunk_document(file_path, file_type)

    # 4. Extract text from each chunk
    extracted_chunks = extract_text_from_chunks(chunks, kb_path)

    # 5. Generate summary using Claude API
    summary = generate_summary(extracted_chunks)
    save_summary(summary, kb_path)

    # 6. Generate index using Claude API
    index = generate_index(extracted_chunks)
    save_index(index, kb_path)

    # 7. Save metadata
    save_metadata(kb_path, file_name, len(chunks))

    print("Processing complete!")

def chunk_document(file_path, file_type):
    """Split document into chunks"""
    if file_type == 'pdf':
        return chunk_pdf(file_path, pages_per_chunk=15)
    elif file_type == 'docx':
        return chunk_docx(file_path, pages_per_chunk=15)

def chunk_pdf(file_path, pages_per_chunk=15):
    """Chunk PDF by page ranges"""
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        chunks = []

        for i in range(0, total_pages, pages_per_chunk):
            end_page = min(i + pages_per_chunk, total_pages)
            chunks.append({
                'start_page': i + 1,
                'end_page': end_page,
                'chunk_number': len(chunks) + 1
            })

        return chunks

def extract_text_from_chunks(chunks, kb_path):
    """Extract text from each chunk and save as markdown"""
    extracted = []

    for chunk in chunks:
        # Extract text from pages
        text = extract_pages(chunk['start_page'], chunk['end_page'])

        # Format as markdown
        markdown = format_as_markdown(text, chunk)

        # Save to file
        chunk_file = kb_path / 'chunks' / f"chunk-{chunk['chunk_number']:03d}.md"
        chunk_file.write_text(markdown)

        extracted.append({
            'chunk_number': chunk['chunk_number'],
            'file': str(chunk_file),
            'text': text
        })

    return extracted

def generate_summary(chunks):
    """Use Claude API to generate summary"""
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    # Combine all chunk texts
    full_text = "\n\n".join([c['text'] for c in chunks])

    message = client.messages.create(
        model="claude-sonnet-4",
        max_tokens=8000,
        messages=[{
            "role": "user",
            "content": f"Please create a concise summary of this document, "
                      f"condensing it to approximately 10% of its original length. "
                      f"Capture key concepts, main points, and structure:\n\n{full_text}"
        }]
    )

    return message.content[0].text

def generate_index(chunks):
    """Use Claude API to generate index with descriptions"""
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    index_entries = []

    for chunk in chunks:
        # Ask Claude to describe each chunk
        message = client.messages.create(
            model="claude-sonnet-4",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"In 1-2 sentences, describe the main topic/content "
                          f"of this text:\n\n{chunk['text'][:2000]}"  # First 2000 chars
            }]
        )

        description = message.content[0].text
        index_entries.append({
            'chunk': chunk['chunk_number'],
            'description': description
        })

    return format_index(index_entries)

if __name__ == "__main__":
    file_path = sys.argv[1]
    workspace_path = sys.argv[2]
    file_name = sys.argv[3]

    main(file_path, workspace_path, file_name)
```

**Dependencies to Install**
```bash
pip install pdfplumber python-docx anthropic
```

---

### Integration with Jarvis Conversations

**When user asks a question:**

1. **Check for knowledge base**
   - Look in `workspace/knowledge-base/` for available documents
   - Read `index.md` files to understand available knowledge

2. **Search index for relevant chunks**
   - Read index.md
   - Identify which chunks might contain relevant information

3. **Load relevant chunks**
   - Read specific `chunk-XXX.md` files
   - Include in conversation context

4. **Cite sources**
   - Reference chunk number and page range in responses
   - Example: "According to your document (pages 45-60)..."

**Automatic Context Injection**
- When user mentions "my documents" or asks domain-specific questions
- Automatically load summary.md for overview
- Load specific chunks based on semantic relevance

---

## File Upload Handling Details

### For Large Files (100MB+)

**Option 1: Standard Upload with Multer (Recommended to start)**
```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'workspace/uploads/documents/')
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});
```

**Option 2: Chunked Upload (If needed for very large files)**
- Frontend splits file into chunks
- Upload chunks sequentially
- Backend reassembles on completion
- More complex but handles 300MB+ files better

Start with Option 1, upgrade to Option 2 if needed.

---

## Implementation Phases

### Phase 1: Basic Upload & Storage (Days 1-2) ✅ COMPLETE
- [✅] Create DocumentUploader React component (`FileUploadButton.tsx` - integrated into ChatInput)
- [✅] Add upload endpoint to backend (`handlers/upload.ts` - POST /api/upload-document)
- [✅] Save files to workspace (`workspace/uploads/`)
- [✅] Display upload success/error (chat messages in ChatPage.tsx)

### Phase 2: Python Processing Script (Days 3-5)
- [ ] Write Python script skeleton
- [ ] Implement PDF chunking with pdfplumber
- [ ] Implement text extraction
- [ ] Save chunks as markdown files
- [ ] Test with sample PDFs

### Phase 3: AI Summarization (Days 6-7)
- [ ] Integrate Claude API for summary generation
- [ ] Generate index with chunk descriptions
- [ ] Create metadata.json
- [ ] Test with full workflow

### Phase 4: Conversation Integration (Days 8-10)
- [ ] Detect when to load knowledge base
- [ ] Read index.md and identify relevant chunks
- [ ] Load chunks into conversation context
- [ ] Add citation formatting

### Phase 5: UI Polish & Testing (Days 11-14)
- [ ] Show processing progress in UI
- [ ] Display knowledge base documents
- [ ] Add document management (view, delete)
- [ ] End-to-end testing with Lilach's documents
- [ ] Handle error cases

---

## Testing Strategy

### Unit Tests
- PDF chunking logic
- Text extraction accuracy
- Markdown formatting

### Integration Tests
- Full upload → process → access workflow
- Claude API integration
- File system operations

### User Testing
- Upload Lilach's actual documents
- Ask questions and verify Jarvis accesses knowledge base
- Test with 300-page PDF
- Test with Word documents

---

## Success Criteria

- [ ] User can upload PDF/Word documents up to 100MB
- [ ] Documents automatically processed into knowledge base
- [ ] Processing completes within reasonable time (5-10 min for 300 pages)
- [ ] Jarvis can access and reference document content in conversations
- [ ] Jarvis cites specific sections when answering questions
- [ ] Lilach successfully uses this with her 4 documents

---

## Open Questions / Decisions Needed

1. **Chunk size**: 10 pages? 15 pages? Configurable?
2. **Summary length**: Exactly 10%? Or adaptive based on content?
3. **Multiple documents**: How to handle multiple documents in knowledge base?
4. **Search mechanism**: Do we need semantic search or is index + manual lookup sufficient?
5. **Update/versioning**: Can users re-upload and update documents?

---

## Future Enhancements (Not in initial scope)

- Semantic search across knowledge base
- OCR for scanned PDFs
- Image/diagram extraction and description
- Multi-document cross-referencing
- Knowledge base query interface (separate from chat)
- Export knowledge base as structured document

---

*This implementation plan focuses on the knowledge base builder as the first automation feature. Presentation creator will be separate ticket/plan.*
