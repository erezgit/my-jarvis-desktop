# Ticket 104: Universal File Upload System

## Overview
Refactor the current PDF-specific upload functionality to support multiple file types and decouple file upload from PDF processing. Create a new `/my-jarvis/uploads/` directory structure and enable uploading various file types including PDFs, text files, markdown, Excel, CSV, and audio files.

---

## Current Implementation Analysis

### Frontend Components

**FileUploadButton.tsx** (`app/components/chat/FileUploadButton.tsx:1-45`)
- Simple button component with file input
- Currently restricted to `.pdf,.doc,.docx` (line 30)
- Handles file selection and passes to parent via `onFileSelect` callback
- Resets input after selection to allow same file re-upload

**ChatInput.tsx** (`app/components/chat/ChatInput.tsx:1-282`)
- Renders FileUploadButton component (lines 237-242)
- Receives `onFileUpload` prop and passes it to FileUploadButton
- Upload functionality is optional (only renders if `onFileUpload` prop exists)

### Backend Handler

**upload.ts** (`lib/claude-webui-server/handlers/upload.ts:1-91`)

**Current Flow:**
1. Parses multipart form data to extract file
2. Saves file to `my-jarvis/docs/` directory (line 19)
3. **Automatic PDF Processing** - If file is PDF (line 34):
   - Spawns Python script `process_document.py`
   - Extracts text from PDF in chunks of 5 pages
   - Saves to `my-jarvis/knowledge-base/{filename}/chunks/` as markdown files
   - Creates metadata JSON file

**Issues with Current Implementation:**
- ❌ Upload destination hardcoded to `/my-jarvis/docs/`
- ❌ File upload tightly coupled with PDF processing
- ❌ No support for other file types
- ❌ PDF processing happens automatically (no user control)
- ❌ File type validation only in frontend (`.pdf,.doc,.docx`)

### PDF Processing Pipeline

**process_document.py** (`lib/claude-webui-server/scripts/process_document.py:1-210`)

**What it does:**
1. Creates knowledge base structure: `my-jarvis/knowledge-base/{doc-name}/chunks/`
2. Chunks PDF into 5-page segments
3. Extracts text from each page using `pdfplumber`
4. Saves each chunk as markdown file (`chunk-001.md`, `chunk-002.md`, etc.)
5. Creates metadata.json with processing info

**Current usage:**
- Automatically triggered on PDF upload
- No manual trigger mechanism
- Hardcoded to knowledge-base directory

---

## Environment Analysis

### Workspace Structure

**Current Template** (`workspace-template/my-jarvis/`)
```
my-jarvis/
├── docs/         # User documentation & profiles
└── tickets/      # Task tracking
```

**Proposed Addition:**
```
my-jarvis/
├── docs/         # User documentation & profiles
├── tickets/      # Task tracking
└── uploads/      # NEW: Universal file uploads ⭐
```

### Fly.io Volume Configuration

**Volume Mount** (`fly.toml:48-50`)
```toml
[mounts]
  source = "workspace_data"
  destination = "/home/node"
```

**Key Facts:**
- 10GB persistent volume mounted at `/home/node`
- All user data persists across deployments
- Working directory: `/home/node`
- Files in `/home/node/my-jarvis/` are persisted
- Template copied from `/app/workspace-template/` during setup

---

## Proposed Solution

### 1. New Directory Structure

**Add to workspace-template:**
```
workspace-template/
└── my-jarvis/
    ├── docs/
    ├── tickets/
    └── uploads/      # NEW - created during setup (via mkdir, no .gitkeep needed)
```

**Note:** We don't need `.gitkeep` files since the setup script creates the directory programmatically with `mkdir -p`. Users never interact with the workspace-template via Git, so keeping empty directories in version control is unnecessary.

### 2. Frontend Changes

#### A. FileUploadButton.tsx - Remove file type restrictions and add upload state:

```tsx
// BEFORE (line 30)
accept=".pdf,.doc,.docx"

// AFTER - Support all file types
accept="*"
```

**Update props interface:**
```tsx
interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;  // NEW: Track upload state
}
```

**Update component to show spinner during upload:**
```tsx
export function FileUploadButton({
  onFileSelect,
  disabled = false,
  isUploading = false  // NEW
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="*"  // Accept all files
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}  // Disable during upload
        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        title={isUploading ? "Uploading..." : "Upload file"}
      >
        {isUploading ? (
          // Use same spinner pattern as LoadingComponent in MessageComponents.tsx
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <PaperClipIcon className="w-4 h-4" />
        )}
      </button>
    </>
  );
}
```

#### B. Parent Component (ChatInput or ChatPage) - Handle upload state:

```tsx
// Add state for tracking upload
const [isUploadingFile, setIsUploadingFile] = useState(false);

// Handle file upload with loading state
const handleFileUpload = async (file: File) => {
  setIsUploadingFile(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    // Show success message or handle result
    console.log('File uploaded:', result);
  } catch (error) {
    console.error('Upload error:', error);
    // Show error message to user
  } finally {
    setIsUploadingFile(false);
  }
};

// Pass to FileUploadButton
<FileUploadButton
  onFileSelect={handleFileUpload}
  disabled={isLoading}
  isUploading={isUploadingFile}  // NEW
/>
```

### 3. Backend Refactoring

**upload.ts** - Complete refactor:

```typescript
export async function handleUploadRequest(c: Context<ConfigContext>) {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // NEW: Save to uploads directory instead of docs
    const workspaceRoot = process.cwd();
    const uploadsDir = join(workspaceRoot, 'my-jarvis', 'uploads');

    // Ensure uploads directory exists
    await ensureDir(uploadsDir);

    // Save file to uploads
    const filePath = join(uploadsDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);

    logger.app.info(`File uploaded: ${file.name} to ${filePath}`);

    // REMOVED: Automatic PDF processing
    // User can now trigger processing manually via Jarvis commands

    return c.json({
      success: true,
      filename: file.name,
      path: filePath,
      size: file.size,
      directory: 'my-jarvis/uploads', // Inform user where file was saved
    });
  } catch (error) {
    logger.app.error("Upload error: {error}", { error });
    return c.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, 500);
  }
}
```

### 4. Setup Script Update

**scripts/setup-new-app.sh** - Ensure uploads directory:
```bash
# Add to setup script (after copying workspace-template)
echo "📁 Creating uploads directory..."
mkdir -p /home/node/my-jarvis/uploads
chmod 755 /home/node/my-jarvis/uploads
echo "✅ Uploads directory ready"
```

**Note:** The setup script runs once during initial app setup and creates the directory structure. No `.gitkeep` files are needed since we're creating directories programmatically.

### 5. PDF Processing Decoupling

**New Workflow:**

**Before (Automatic):**
1. User uploads PDF via chat button
2. File saved to `my-jarvis/docs/`
3. PDF automatically processed to knowledge base
4. User has no control over process

**After (On-Demand):**
1. User uploads ANY file via chat button
2. File saved to `my-jarvis/uploads/`
3. User receives confirmation: "File uploaded to my-jarvis/uploads/"
4. User can ask Jarvis: "Convert the PDF I just uploaded to knowledge base"
5. Jarvis runs `process_document.py` manually with user's PDF
6. User has full control and visibility

---

## Implementation Benefits

### ✅ Separation of Concerns
- Upload = file storage only
- Processing = separate user-triggered action
- Clear single responsibility per component

### ✅ Flexibility
- Support any file type (PDFs, Excel, audio, etc.)
- User decides when/if to process files
- Can add new processing types without changing upload

### ✅ User Control
- Upload doesn't trigger expensive operations
- User knows where files are stored
- Can organize uploads directory as needed

### ✅ Best Practices (React/TypeScript)
- Props remain simple and focused
- Backend handler does one thing well
- File type handling centralized
- Easy to test and maintain

### ✅ Fly.io Architecture
- Leverages existing volume mount
- No new infrastructure needed
- Files persist across deployments
- Consistent with existing workspace structure

---

## File Type Support Strategy

### Phase 1: Accept All Files
```typescript
// Simple approach - accept everything
accept="*"
```

**Pros:**
- Maximum flexibility
- No artificial restrictions
- User decides what to upload

**Cons:**
- No client-side validation
- Potentially large files

### Phase 2: Recommended Types (Future)
```typescript
// Specify supported types
accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.xls,.csv,.mp3,.wav,.m4a,.json,.xml"
```

**Pros:**
- Guides user to supported formats
- Better UX with preview
- Can add type-specific icons

### Phase 3: Size Limits (Future)
```typescript
// Backend validation
if (file.size > 50 * 1024 * 1024) { // 50MB
  return c.json({ error: 'File too large (max 50MB)' }, 400);
}
```

---

## Migration Strategy

### For Existing Apps
1. Deploy updated code
2. SSH into app: `fly ssh console -a app-name`
3. Create uploads directory: `mkdir -p /home/node/my-jarvis/uploads`
4. Optional: Move existing docs to uploads if desired

### For New Apps
- Setup script creates uploads directory automatically
- No manual intervention needed

---

## Testing Checklist

- [ ] Upload PDF file → saved to `my-jarvis/uploads/`
- [ ] Upload Excel file → saved to `my-jarvis/uploads/`
- [ ] Upload CSV file → saved to `my-jarvis/uploads/`
- [ ] Upload text file → saved to `my-jarvis/uploads/`
- [ ] Upload MP3 file → saved to `my-jarvis/uploads/`
- [ ] Verify PDF not auto-processed
- [ ] Manually trigger PDF processing via Jarvis command
- [ ] Verify file tree shows uploads directory
- [ ] Test upload of same file twice (should allow)
- [ ] Verify upload response includes correct path

---

## Success Criteria

1. ✅ Any file type can be uploaded
2. ✅ Files land in `my-jarvis/uploads/` directory
3. ✅ Upload is decoupled from processing
4. ✅ PDF processing can be triggered manually
5. ✅ Frontend shows clear file type support
6. ✅ Backend validates and handles gracefully
7. ✅ Existing knowledge base functionality preserved
8. ✅ Documentation updated for new workflow

---

## Related Files

### Frontend
- `/app/components/chat/FileUploadButton.tsx` - Accept attribute change
- `/app/components/chat/ChatInput.tsx` - No changes needed

### Backend
- `/lib/claude-webui-server/handlers/upload.ts` - Complete refactor
- `/lib/claude-webui-server/scripts/process_document.py` - No changes (used on-demand)

### Infrastructure
- `/workspace-template/my-jarvis/uploads/` - New directory
- `/scripts/setup-new-app.sh` - Add uploads directory creation

### Documentation
- `/agent-workspace/docs/deployment.md` - Update with new workflow
- `/workspace-template/CLAUDE.md` - Document upload command

---

## Next Steps

1. Review and approve this plan
2. Update workspace-template with uploads directory
3. Modify FileUploadButton to accept all files
4. Refactor upload.ts handler
5. Update setup script
6. Test with multiple file types
7. Deploy to test instance
8. Update documentation
9. Roll out to production apps

---

*Created: 2025-11-23*
*Status: Ready for Implementation*
