# PDF Text Extraction Guide

## Overview

This guide explains the efficient parallel process for extracting text from PDF files. The process involves converting PDF pages to images in batches, then using parallel agents to simultaneously extract text from multiple images into Markdown files.

## When to Use This Process

- When a user uploads a PDF file to a ticket
- When the user explicitly asks to extract text from a PDF
- This is an on-demand process - only start when requested

## Folder Structure in Ticket

When working on PDF extraction in a ticket, create this structure:

```
my-jarvis/tickets/XXX-ticket-name/
├── document.pdf                           # The original PDF
├── document-extraction/
│   ├── images/                           # Temporary folder for page images
│   │   ├── page_001.png
│   │   ├── page_002.png
│   │   └── ...
│   ├── markdown/                         # Final markdown files
│   │   ├── pages_001-050/               # Organized in folders of 50
│   │   │   ├── page_001.md
│   │   │   ├── page_002.md
│   │   │   └── ...
│   │   ├── pages_051-100/
│   │   │   ├── page_051.md
│   │   │   └── ...
│   │   └── ...
│   └── extraction-progress.md            # Progress tracking document
```

**Organization:**
- Markdown files are organized into folders of 50 pages each (pages_001-050, pages_051-100, etc.)
- This keeps the structure clean and navigable for large PDFs
- **Important**: After each batch is complete, delete the images/ folder - we only keep the markdown files

## Step-by-Step Process

### Step 1: Setup Folder Structure
```bash
cd "my-jarvis/tickets/XXX-ticket-name/"
mkdir -p document-extraction/images
mkdir -p document-extraction/markdown/pages_001-050
```
Create additional folders as needed (pages_051-100, pages_101-150, etc.)

### Step 2: Convert Batch of Pages to Images
Convert pages in batches of 10 to avoid memory issues.

Command for batch (e.g., pages 1-10):
```python
python3 -c "
from pdf2image import convert_from_path

pdf_path = 'path/to/document.pdf'
output_dir = 'path/to/document-extraction/images'

print('Converting pages 1-10 to images...')
images = convert_from_path(pdf_path, first_page=1, last_page=10, dpi=150)

for i, image in enumerate(images, start=1):
    image.save(f'{output_dir}/page_{i:03d}.png', 'PNG')
    print(f'Converted page {i}')

print(f'Successfully converted {len(images)} pages')
"
```

**What happens:**
- Converts 10 pages at a time (adjust first_page/last_page for each batch)
- Uses DPI=150 for good quality without excessive memory usage
- Images numbered sequentially: page_001.png, page_002.png, etc.
- All images saved in the images/ folder

### Step 3: Extract Text Using Parallel Agents
This is the key efficiency improvement: Launch 10 agents in parallel, each processing one page simultaneously.

**Command:** Use the Task tool to launch 10 parallel agents in a single message:
- For each page (11-20 in this example):
  - Agent reads: images/page_011.png
  - Agent extracts text visually
  - Agent creates: markdown/pages_001-050/page_011.md

**Agent prompt template:**
```
Read the image file at: /workspace/path/to/images/page_XXX.png

Extract all text from this image and create a markdown file at: /workspace/path/to/markdown/pages_YYY-ZZZ/page_XXX.md

Use this format:
# Document Name - Page XXX
**Page XXX of TOTAL**
---
## Page XXX
[Text content]

At the bottom add:
---
Page XXX
Document Name

Return ONLY: "Page XXX extraction complete"
```

Launch all 10 agents in parallel by including 10 Task tool calls in a single message.

### Step 4: Clean Up Images After Batch
After all 10 pages are extracted:
```bash
rm -f path/to/document-extraction/images/*.png
```
This deletes temporary images while keeping markdown files.

### Step 5: Repeat for All Batches
Continue this cycle:
1. Convert next 10 pages to images
2. Launch 10 parallel agents to extract text
3. Delete images
4. Move to next batch

## Complete Example Workflow

**User:** "Please extract the text from document.pdf (316 pages)"

**Process:**

1. **Setup (One Time)**
```bash
cd "my-jarvis/tickets/003-documents/"
mkdir -p document-extraction/images
mkdir -p document-extraction/markdown/pages_001-050
mkdir -p document-extraction/markdown/pages_051-100
mkdir -p document-extraction/markdown/pages_101-150
mkdir -p document-extraction/markdown/pages_151-200
mkdir -p document-extraction/markdown/pages_201-250
mkdir -p document-extraction/markdown/pages_251-300
mkdir -p document-extraction/markdown/pages_301-316
```

2. **Batch 1: Pages 1-10**
   - Convert to images using Python script
   - Extract text with 10 parallel agents - Launch all agents in one message using Task tool
   - Clean up images

3. **Repeat for Batches 2-32**
   - Continue the same process for pages 11-20, 21-30, etc.

## Performance

- **Sequential Processing**: ~10 minutes per batch of 10 pages
- **Parallel Processing**: ~1 minute per batch of 10 pages
- **Speed Improvement**: ~10x faster using parallel agents

## Progress Tracking

Create an extraction-progress.md file to track completion:

```markdown
# Document Name - PDF Text Extraction Progress

**PDF**: document.pdf
**Total Pages**: XXX
**Extraction Method**: Parallel agents (10 agents simultaneously)

## Progress Tracking

### Batch 1: Pages 1-10
- [x] Convert to images
- [x] Extract text to markdown
- [x] Delete images
- **Status**: ✅ Completed

### Batch 2: Pages 11-20
- [ ] Convert to images
- [ ] Extract text to markdown
- [ ] Delete images
- **Status**: Pending

## Completed Files
Total markdown files created: XX / XXX pages (X.X% complete)
```

## Important Notes

- **Text Extraction**: Claude reads images visually and extracts text accurately
- **Parallel Processing**: 10 agents work simultaneously - 10x speed improvement
- **Batch Size**: 10 pages per batch prevents memory issues
- **Folder Organization**: 50 pages per folder keeps structure navigable
- **On-Demand Only**: Only start when user explicitly requests it
- **Keep Organized**: Always work within the ticket folder structure
- **Delete Images**: Clean up images/ after each batch to save disk space

## Dependencies

Required Python packages:
- `pdf2image` - for converting PDF pages to images
- System dependency: `poppler-utils` (for pdf2image to work)

Install if needed:
```bash
pip install pdf2image --break-system-packages
apt-get update && apt-get install -y poppler-utils
```

## Troubleshooting

- **Memory Issues**: If conversion fails, reduce batch size from 10 to 5 pages
- **Agent Failures**: Rerun failed pages individually
- **Text Quality Issues**: Ensure DPI is at least 150 for clear text

---

*Last Updated: 2025-11-06*
*Version: 2.0 - Parallel Processing*
*Status: Active Guide - Proven Effective*