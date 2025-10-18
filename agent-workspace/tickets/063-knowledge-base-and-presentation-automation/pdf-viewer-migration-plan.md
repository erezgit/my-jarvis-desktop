# PDF Viewer Migration Plan - React PDF Implementation

## Status: In Progress
**Created**: 2025-10-18
**Priority**: High - Improves user experience for PDF viewing
**Estimated Timeline**: 1-2 days

---

## Implementation Checklist

- [x] **Phase 1**: Install dependencies (react-pdf, pdfjs-dist) ✅
- [x] **Phase 2**: Configure PDF.js worker ✅
- [x] **Phase 3**: Create PDFViewer component with controls ✅
- [x] **Phase 4**: Update FilePreview to use PDFViewer ✅
- [x] **Phase 5**: Enhance backend for HTTP range requests ✅
- [ ] **Phase 6**: Optional - Add virtualization for large PDFs (deferred)
- [ ] **Testing**: Verify PDF loading, navigation, zoom (to be done in dev deployment)
- [ ] **Deploy**: Update my-jarvis-erez-dev

---

## Overview

Replace the current iframe-based PDF viewer with react-pdf (wojtekmaj) for better performance, streaming support, and user experience when viewing PDF files in the file preview panel.

---

## Current Implementation

**Location**: `/workspace/my-jarvis/projects/my-jarvis-desktop/app/components/FilePreview/FilePreview.tsx` (lines 64-75)

```tsx
// Current iframe approach
if (file.extension === '.pdf') {
  const streamUrl = `/api/stream-file?path=${encodeURIComponent(file.path)}`;
  return (
    <div className={`h-full w-full bg-white dark:bg-gray-900 ${className}`}>
      <iframe
        src={streamUrl}
        className="w-full h-full border-0"
        title={`PDF Preview: ${file.name}`}
      />
    </div>
  );
}
```

**Limitations**:
- No custom controls (zoom, page navigation)
- Limited styling options (browser-dependent)
- Can't extract text easily
- No lazy loading of pages
- Memory inefficient for large PDFs

---

## Research Findings (October 2025)

### Best React PDF Viewer Libraries

**Top Choice: react-pdf by wojtekmaj**
- **NPM**: `react-pdf` (1.4M+ weekly downloads)
- **GitHub**: 10,303 stars
- **Status**: Active, open-source, well-maintained
- **Key Features**:
  - Wraps Mozilla's PDF.js (industry standard)
  - Lazy loading pages on demand
  - Web worker support for off-thread processing
  - HTTP range request support for streaming
  - Virtual scrolling compatibility
  - Custom styling and controls

**Other Options Considered**:
- **Syncfusion React PDF Viewer**: Enterprise, paid, feature-rich but overkill
- **Nutrient Web SDK**: High-performance, commercial, expensive
- **@pdf-viewer/react**: New paid option, less proven
- **pdfjs-dist**: Direct PDF.js wrapper, requires more manual work

---

## Technical Requirements

### 1. Progressive Loading (HTTP Range Requests)

**Server Requirements**:
```
Accept-Ranges: bytes
Content-Length: [file-size]
Content-Range: bytes 0-1023/[total-size]
```

**CORS Headers Needed**:
```
Access-Control-Expose-Headers: Accept-Ranges, Content-Range, Content-Length, Content-Encoding
```

**Backend Changes Required**:
- Update `/api/stream-file` endpoint to support range requests
- Add proper CORS headers for cross-origin requests
- Return `206 Partial Content` status for range requests

### 2. PDF Linearization (Optional Optimization)

For optimal streaming performance, PDFs should be linearized (also called "Fast Web View"):
- Builds an index at the beginning of the file
- Permits precise byte-range fetching
- Enables first-page display before full download

**Tools**: Can use `qpdf --linearize` or other PDF optimization tools

### 3. Performance Best Practices

- **Never render more than 25 pages at once** (PDF.js recommendation)
- Use virtualization for large documents (react-window or react-virtuoso)
- Lazy load pages as user scrolls
- Use web workers to keep UI responsive

---

## Implementation Plan

### Phase 1: Install Dependencies
```bash
npm install react-pdf pdfjs-dist
```

**Peer Dependencies**:
- `react-pdf` requires `pdfjs-dist` as a peer dependency
- Version compatibility: Check latest compatible versions

### Phase 2: Configure PDF.js Worker

**Create worker configuration file**: `app/utils/pdfWorker.ts`
```typescript
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Alternative: Use local worker file for offline support
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
```

### Phase 3: Create PDF Viewer Component

**New Component**: `app/components/FilePreview/PDFViewer.tsx`

```typescript
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export function PDFViewer({ fileUrl, fileName, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setError(error.message);
    setLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-lg mb-2">Failed to load PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 dark:bg-gray-900 ${className}`}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {fileName}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? '...' : `Page ${pageNumber} of ${numPages || '?'}`}
          </span>
          <button
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            Next
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={zoomOut}
            className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            -
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Display Area */}
      <div className="flex-1 overflow-auto flex justify-center items-start p-4">
        {loading && (
          <div className="text-gray-500 dark:text-gray-400">
            Loading PDF...
          </div>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-gray-500">Loading document...</div>}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            loading={<div className="text-gray-500">Loading page...</div>}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
```

### Phase 4: Update FilePreview Component

**Modify**: `app/components/FilePreview/FilePreview.tsx`

```typescript
import { PDFViewer } from './PDFViewer';

// Replace iframe PDF handling (lines 64-75) with:
if (file.extension === '.pdf') {
  const streamUrl = `/api/stream-file?path=${encodeURIComponent(file.path)}`;
  return (
    <PDFViewer
      fileUrl={streamUrl}
      fileName={file.name}
      className={className}
    />
  );
}
```

### Phase 5: Update Backend for Range Requests

**Modify**: `lib/claude-webui-server/handlers/stream-file.ts` (or wherever stream endpoint is)

```typescript
import { Context } from 'hono';
import { createReadStream, statSync } from 'fs';

export async function handleStreamFile(c: Context) {
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ error: 'No file path provided' }, 400);
  }

  try {
    const stats = statSync(filePath);
    const fileSize = stats.size;

    // Check if range request
    const range = c.req.header('Range');

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // Create read stream with range
      const stream = createReadStream(filePath, { start, end });

      // Set headers for partial content
      c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Length', chunkSize.toString());
      c.header('Content-Type', 'application/pdf');

      // CORS headers
      c.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Encoding');

      return c.body(stream, 206); // 206 Partial Content
    } else {
      // Normal full file request
      const stream = createReadStream(filePath);

      c.header('Content-Length', fileSize.toString());
      c.header('Content-Type', 'application/pdf');
      c.header('Accept-Ranges', 'bytes');
      c.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length');

      return c.body(stream, 200);
    }
  } catch (error) {
    console.error('Stream file error:', error);
    return c.json({ error: 'Failed to stream file' }, 500);
  }
}
```

### Phase 6: Add Virtualization (Optional for Large PDFs)

For PDFs with 100+ pages, add virtualization:

```bash
npm install react-window
```

**Enhanced Component**: Use `react-window` to render only visible pages

```typescript
import { FixedSizeList as List } from 'react-window';

// Inside PDFViewer component, replace single Page with:
<List
  height={600}
  itemCount={numPages || 0}
  itemSize={1000}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Page
        pageNumber={index + 1}
        scale={scale}
        loading={<div>Loading page {index + 1}...</div>}
      />
    </div>
  )}
</List>
```

---

## Testing Checklist

### Basic Functionality
- [ ] PDF loads and displays first page
- [ ] Page navigation works (next/previous buttons)
- [ ] Zoom in/out works correctly
- [ ] Page counter shows correct information
- [ ] Loading states display properly
- [ ] Error handling works for invalid PDFs

### Performance
- [ ] Large PDFs (50+ pages) load quickly
- [ ] First page displays before full download
- [ ] Memory usage remains reasonable
- [ ] Scrolling is smooth
- [ ] No UI freezing during PDF parsing

### Edge Cases
- [ ] Small PDFs (1-2 pages) work
- [ ] Large PDFs (500+ pages) work
- [ ] Corrupted PDFs show error message
- [ ] Network interruption handled gracefully
- [ ] Multiple PDFs can be opened in sequence

### Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Rollback Plan

If issues arise:
1. Revert `FilePreview.tsx` to iframe implementation
2. Keep dependencies installed for future attempts
3. Document specific issues encountered
4. File GitHub issues with react-pdf if bugs found

---

## Future Enhancements

### Short-term
- [ ] Add text selection and copy functionality
- [ ] Add search within PDF
- [ ] Add print functionality
- [ ] Add download button

### Long-term
- [ ] Add annotation support
- [ ] Add bookmarks/outline navigation
- [ ] Add thumbnail preview sidebar
- [ ] Add full-screen mode
- [ ] Add keyboard shortcuts (arrow keys, +/-, etc.)

---

## Resources

- **react-pdf Documentation**: https://projects.wojtekmaj.pl/react-pdf/
- **react-pdf GitHub**: https://github.com/wojtekmaj/react-pdf
- **PDF.js Documentation**: https://mozilla.github.io/pdf.js/
- **HTTP Range Requests**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests

---

## Estimated Effort

- **Phase 1-4 (Basic Implementation)**: 4-6 hours
- **Phase 5 (Backend Range Requests)**: 2-3 hours
- **Phase 6 (Virtualization)**: 2-3 hours (if needed)
- **Testing**: 2-3 hours

**Total**: 1-2 days for complete implementation and testing

---

*Created: 2025-10-18*
*Next: Begin Phase 1 - Install dependencies and configure worker*
