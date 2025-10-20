# Phase 1: Sandpack Integration - Implementation Plan

**Date**: 2025-10-20
**Goal**: Enable dynamic React/TSX file preview using Sandpack
**Estimated Time**: 2-3 hours
**Status**: Ready for implementation

---

## Overview

Integrate Sandpack into FilePreview component to enable live rendering of `.tsx` and `.jsx` files as interactive React components. This unlocks the ability to create and preview Spectacle presentations dynamically.

---

## Step-by-Step Implementation

### Step 1: Install Sandpack Dependencies ✅ COMPLETED

**Action**: Add Sandpack React library to project

**Command**:
```bash
cd /workspace/my-jarvis/projects/my-jarvis-desktop
npm install @codesandbox/sandpack-react
```

**Result**: ✅ Installed @codesandbox/sandpack-react@2.20.0
- Package added to `package.json` dependencies
- 50 packages added successfully

**Time**: 2 minutes

---

### Step 2: Review Current FilePreview Architecture ✅ COMPLETED

**Action**: Understand existing FilePreview logic before modification

**File to Read**: `app/components/FilePreview/FilePreview.tsx`

**Current Logic**: ✅ Reviewed
- Uses file.extension for type detection
- Conditional rendering for PDF, MD, MDX, code files
- Props: `{ file: FileItem | null, className?: string }`
- White background with dark mode support
- Existing handling for .tsx/.jsx as syntax-highlighted code

**Time**: 5 minutes

---

### Step 3: Create SandpackPreview Component ✅ COMPLETED

**Action**: Create new component for Sandpack-based preview

**File Created**: ✅ `app/components/FilePreview/SandpackPreview.tsx`

**Content**:
```typescript
import { Sandpack } from "@codesandbox/sandpack-react";

interface SandpackPreviewProps {
  filePath: string;
  content: string;
}

export function SandpackPreview({ filePath, content }: SandpackPreviewProps) {
  return (
    <div className="h-full w-full bg-white">
      <Sandpack
        template="react-ts"
        files={{
          "/App.tsx": content
        }}
        options={{
          showNavigator: false,
          showTabs: false,
          showLineNumbers: false,
          showInlineErrors: true,
          showRefreshButton: true,
          editorHeight: "100%",
          autorun: true,
          autoReload: true
        }}
        theme="light"
      />
    </div>
  );
}
```

**Configuration Choices**:
- `template: "react-ts"` - TypeScript support
- `showNavigator: false` - Hide file browser (we're showing single file)
- `showTabs: false` - Single file view
- `showLineNumbers: false` - Preview only, not editing
- `editorHeight: "100%"` - Fill available space
- `autorun: true` - Execute immediately
- `theme: "light"` - Match app's light theme (white background)

**Time**: 10 minutes

---

### Step 4: Modify FilePreview to Detect TSX/JSX Files ✅ COMPLETED

**Action**: Add new condition to FilePreview component

**File Modified**: ✅ `app/components/FilePreview/FilePreview.tsx`

**Changes**:

1. **Import new component**:
```typescript
import { SandpackPreview } from './SandpackPreview';
```

2. **Add file type detection**:
```typescript
const isReactFile = /\.(tsx|jsx)$/.test(filePath);
```

3. **Add conditional render** (before other conditions):
```typescript
if (isReactFile) {
  return <SandpackPreview filePath={filePath} content={content} />;
}
```

**Complete Flow**:
```typescript
export function FilePreview({ filePath, content }: FilePreviewProps) {
  const isPDF = filePath.endsWith('.pdf');
  const isMarkdown = /\.(md|mdx)$/.test(filePath);
  const isReactFile = /\.(tsx|jsx)$/.test(filePath);

  // NEW: React file preview
  if (isReactFile) {
    return <SandpackPreview filePath={filePath} content={content} />;
  }

  // Existing: PDF preview
  if (isPDF) {
    return <PDFViewer filePath={filePath} />;
  }

  // Existing: Markdown preview
  if (isMarkdown) {
    return <MDXContent content={content} />;
  }

  // Existing: Default text viewer
  return <TextViewer content={content} />;
}
```

**Time**: 15 minutes

---

### Step 5: Create Sample Spectacle Presentation ✅ COMPLETED

**Action**: Create test file to verify integration

**File Created**: ✅ `/workspace/my-jarvis/test-presentation.tsx`

**Content**:
```tsx
import { Deck, Slide, Heading, Text } from 'spectacle';

export default function TestPresentation() {
  return (
    <Deck>
      <Slide backgroundColor="#ffffff">
        <Heading color="#1a1a1a">Welcome to My Jarvis</Heading>
        <Text color="#666666">Dynamic Presentation Testing</Text>
      </Slide>

      <Slide backgroundColor="#f5f5f5">
        <Heading fontSize="h2" color="#1a1a1a">Slide Two</Heading>
        <Text color="#333333">This is a test of Sandpack integration</Text>
      </Slide>

      <Slide backgroundColor="#ffffff">
        <Heading fontSize="h2" color="#1a1a1a">Slide Three</Heading>
        <Text color="#333333">Press arrow keys to navigate</Text>
      </Slide>
    </Deck>
  );
}
```

**Note**: This file will initially fail because Spectacle is not installed yet. That's expected - we're just testing if Sandpack renders the file.

**Time**: 5 minutes

---

### Step 6: Test Basic Sandpack Rendering

**Action**: Open test file in app and verify Sandpack loads

**Steps**:
1. Start the app: `npm run dev`
2. Navigate to test-presentation.tsx in file tree
3. Click to open in file preview

**Expected Behavior**:
- File preview shows Sandpack component
- Sandpack loads with light theme
- Shows error: "Could not find module 'spectacle'" (expected)

**Success Criteria**:
- ✅ Sandpack component renders
- ✅ Light theme applied (white background)
- ✅ Error message is clear and visible
- ✅ No crashes or blank screen

**If Fails**:
- Check browser console for errors
- Verify Sandpack installed correctly
- Check component import paths

**Time**: 5 minutes

---

### Step 7: Install Spectacle for Testing ✅ COMPLETED

**Action**: Add Spectacle as dependency for presentations

**Command**:
```bash
npm install spectacle
```

**Result**: ✅ Installed spectacle@10.2.3
- 492 packages added successfully
- Spectacle and dependencies available

**Configuration**: Tell Sandpack about Spectacle

**Modify**: `SandpackPreview.tsx`

**Add customSetup**:
```typescript
<Sandpack
  template="react-ts"
  files={{
    "/App.tsx": content
  }}
  customSetup={{
    dependencies: {
      "spectacle": "^10.0.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    }
  }}
  options={{
    // ... existing options
  }}
  theme="light"
/>
```

**Why**: Sandpack needs to know which npm packages to load from CDN

**Time**: 5 minutes

---

### Step 8: Test Full Spectacle Rendering

**Action**: Verify Spectacle presentation renders correctly

**Steps**:
1. Refresh the app (or hot reload should trigger)
2. Open test-presentation.tsx again
3. Wait for Sandpack to bundle Spectacle (~2-5 seconds first time)

**Expected Behavior**:
- Sandpack shows loading indicator
- Spectacle presentation renders in preview
- Shows "Welcome to My Jarvis" heading
- Can navigate slides with arrow keys or clicks

**Success Criteria**:
- ✅ All three slides render
- ✅ Navigation works (arrow keys)
- ✅ Styling matches Spectacle design
- ✅ Light theme background
- ✅ No console errors

**Time**: 5 minutes

---

### Step 9: Test Hot Reload

**Action**: Verify changes to TSX file update preview automatically

**Steps**:
1. With test-presentation.tsx open in preview
2. Edit the file (change heading text)
3. Save the file

**Expected Behavior**:
- Preview updates automatically
- No need to refresh browser
- Changes appear within 1-2 seconds

**Success Criteria**:
- ✅ Preview updates on file save
- ✅ No manual refresh needed
- ✅ Changes are accurate

**Time**: 3 minutes

---

### Step 10: Style Integration and Polish

**Action**: Ensure Sandpack preview integrates cleanly with app design

**Checklist**:
- [ ] White background matches FilePreview container
- [ ] No border/padding inconsistencies
- [ ] Loading states are clear
- [ ] Error messages are readable
- [ ] Height fills available space correctly

**Potential Adjustments**:

If preview doesn't fill space:
```typescript
<div className="h-full w-full bg-white">
  <Sandpack
    options={{
      editorHeight: "100%"
    }}
  />
</div>
```

If errors are hard to read:
```typescript
options={{
  showInlineErrors: true,
  showErrorOverlay: true
}}
```

**Time**: 10 minutes

---

### Step 11: Test Edge Cases

**Action**: Verify robustness with various scenarios

**Test Cases**:

1. **Empty TSX file**:
   - Create empty .tsx file
   - Should show clear error

2. **Invalid syntax**:
   - Add syntax error to test-presentation.tsx
   - Should show helpful error message

3. **Large file**:
   - Create presentation with 10+ slides
   - Should render without performance issues

4. **JSX (not TSX)**:
   - Create .jsx file
   - Should work identically

5. **Switching between files**:
   - Open PDF, then TSX, then MD
   - All previews should work correctly

**Success Criteria**:
- ✅ All cases handle gracefully
- ✅ Clear error messages
- ✅ No crashes or blank screens

**Time**: 15 minutes

---

### Step 12: Document Usage

**Action**: Add comments and documentation for future reference

**Update**: `SandpackPreview.tsx`

**Add JSDoc comments**:
```typescript
/**
 * SandpackPreview - Live React component preview using Sandpack
 *
 * Renders .tsx and .jsx files as interactive React components.
 * Primarily used for Spectacle presentations but supports any React code.
 *
 * Features:
 * - Hot reload on file changes
 * - npm package support via CDN
 * - TypeScript support
 * - Light theme matching app design
 */
```

**Time**: 5 minutes

---

## Files Created/Modified Summary

### New Files:
- `app/components/FilePreview/SandpackPreview.tsx` (new component)
- `/workspace/my-jarvis/test-presentation.tsx` (test file)

### Modified Files:
- `package.json` (add dependencies)
- `app/components/FilePreview/FilePreview.tsx` (add TSX detection)

### Dependencies Added:
- `@codesandbox/sandpack-react`
- `spectacle`

---

## Verification Checklist

Before marking this phase complete, verify:

- [ ] Sandpack installed and imports successfully
- [ ] TSX files detected and routed to SandpackPreview
- [ ] Simple React components render
- [ ] Spectacle presentations render with all slides
- [ ] Navigation works (arrow keys, clicks)
- [ ] Hot reload updates preview on file save
- [ ] Light theme applied (white background)
- [ ] Error messages clear and helpful
- [ ] No console errors or warnings
- [ ] Performance acceptable (loads in <5 seconds)
- [ ] Edge cases handled gracefully

---

## Expected Outcome

After completing this implementation:

**Capability**: Users can create `.tsx` files with React components (including Spectacle presentations) and see them render live in the file preview.

**Example Workflow**:
1. User: "Create a presentation about my business"
2. Jarvis: Creates `business-presentation.tsx` with Spectacle code
3. User opens file in app
4. Sees live, interactive presentation
5. Can navigate through slides
6. User: "Add a slide about market analysis"
7. Jarvis: Edits TSX file
8. Preview updates automatically
9. User sees new slide immediately

**Next Phase**: PDF export (desktop and mobile)

---

## Troubleshooting

### Issue: Sandpack doesn't render

**Check**:
- Browser console for import errors
- Sandpack package installed: `npm list @codesandbox/sandpack-react`
- Component imported correctly in FilePreview
- File path ends with .tsx or .jsx

### Issue: Spectacle not found

**Check**:
- Spectacle installed: `npm list spectacle`
- customSetup dependencies configured in Sandpack
- CDN access (Sandpack fetches from unpkg.com)

### Issue: Preview is blank

**Check**:
- File content is valid TSX
- Browser console for errors
- Sandpack error overlay enabled
- Component exports default function

### Issue: Hot reload doesn't work

**Check**:
- File watcher running
- FilePreview receives updated content prop
- Sandpack autoReload option enabled

---

## Timeline

**Total Estimated Time**: 2-3 hours

Breakdown:
- Setup and installation: 30 minutes
- Component creation: 45 minutes
- Testing and debugging: 60 minutes
- Documentation: 15 minutes
- Buffer: 30 minutes

---

## Success Metrics

**Phase 1 Complete When**:
- ✅ Any TSX file opens in Sandpack preview
- ✅ Spectacle presentations render with navigation
- ✅ Hot reload works on file edits
- ✅ Light theme integration clean
- ✅ No major bugs or crashes

**Ready for Phase 2** (PDF Export):
- ✅ Users can create and iterate on presentations
- ✅ Preview is reliable and performant
- ✅ Foundation solid for adding export functionality

---

## Next Steps After Phase 1

Once Sandpack integration is complete and tested:

1. **User Feedback**: Test with real presentation creation
2. **Performance**: Monitor bundle times and memory usage
3. **Phase 2 Planning**: Design PDF export implementation
4. **Daniel Demo**: Prepare for tomorrow's meeting

---

**Created by**: Jarvis AI
**Ready for Review**: Yes
**Approved**: Pending
**Start Implementation**: After approval
