# File Operation Architecture Analysis

## Current Architecture (v1.33.3)

### Overview
The system detects file operations (create, modify, delete) and creates `FileOperationMessage` objects to trigger UI updates in the file tree and preview pane.

### Detection Flow

#### 1. **Write Tool (Create)**
**Location**: `UnifiedMessageProcessor.ts:220-224`
```typescript
if (toolName === "Write" && input.file_path && typeof input.file_path === 'string') {
  filePath = input.file_path;
  operation = "created";
}
```
- **Trigger Point**: `processToolResult()` - runs when tool completes
- **Data Source**: Cached tool input from `tool_use` message
- **Reliability**: ✅ 100% - has explicit `file_path` parameter
- **Status**: ✅ WORKING

#### 2. **Edit Tool (Modify)**
**Location**: `UnifiedMessageProcessor.ts:225-229`
```typescript
else if (toolName === "Edit" && input.file_path && typeof input.file_path === 'string') {
  filePath = input.file_path;
  operation = "modified";
}
```
- **Trigger Point**: `processToolResult()` - runs when tool completes
- **Data Source**: Cached tool input from `tool_use` message
- **Reliability**: ✅ 100% - has explicit `file_path` parameter
- **Status**: ✅ WORKING (fixed in v1.33.2)

#### 3. **Bash Tool (Delete)** ⚠️ PROBLEMATIC
**Location**: `UnifiedMessageProcessor.ts:230-239`
```typescript
else if (toolName === "Bash" && input.command && typeof input.command === 'string') {
  const command = input.command as string;
  const deleteMatch = command.match(/(?:rm|unlink)\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
  if (deleteMatch) {
    filePath = deleteMatch[1];
    operation = "deleted";
  }
}
```
- **Trigger Point**: `processToolResult()` - runs when tool completes
- **Data Source**: Regex parsing of Bash command string
- **Reliability**: ⚠️ ~60% - depends on command format
- **Issues**:
  1. Regex may not capture all command variations
  2. Path extraction from string is fragile
  3. No explicit `file_path` parameter like Write/Edit
  4. Bash commands can have complex formats (pipes, multiple files, wildcards)
- **Status**: ❌ NOT WORKING CONSISTENTLY

### UI Response Flow

**Location**: `DesktopLayout.tsx:82-166`

#### For Create/Modify Operations:
1. Expand tree to show parent directory
2. Fetch file content via backend API
3. Auto-select file and show in preview
4. Update message count to prevent re-processing

#### For Delete Operations:
```typescript
if (fileOpMessage.operation === 'deleted') {
  // Just refresh the file tree
  queryClient.invalidateQueries({ queryKey: ['fileTree'] });
  setLastProcessedMessageCount(messages.length);
  return;
}
```
- Simpler flow: just invalidate file tree cache
- No file selection or preview update needed

---

## Architectural Issues

### 1. **Inconsistent Detection Methods**
- **Write/Edit**: Direct parameter access (reliable)
- **Delete**: String parsing (unreliable)

### 2. **No Standard Delete Tool**
- Claude Code doesn't have a native "Delete" tool
- Must rely on Bash commands (rm, unlink, etc.)
- No guaranteed command format

### 3. **Bash Command Variations**
Examples that may fail:
```bash
rm -rf /path/to/file
rm "/path with spaces/file.txt"
rm file1.txt file2.txt  # Multiple files
find . -name "*.tmp" -delete
```

### 4. **Timing Issues**
- All detection happens in `processToolResult()` (after tool completes)
- This is correct for Write/Edit but may miss Bash context

---

## Proposed Solutions

### Option 1: Improve Regex Pattern (Quick Fix)
Enhance the regex to handle more cases:
```typescript
const deleteMatch = command.match(/(?:rm|unlink)\s+(?:-[rfv]+\s+)*(.+)/);
// Then parse multiple paths, handle quotes, etc.
```
**Pros**: Simple, no architecture change
**Cons**: Still fragile, won't catch all cases

### Option 2: Parse Bash Tool Results (Better)
Check the tool result for success messages:
```typescript
if (toolName === "Bash" && command.includes("rm")) {
  // Check result for deleted files
  // Look for patterns in output
}
```
**Pros**: More reliable than just command parsing
**Cons**: Still depends on output format

### Option 3: Explicit File Operation Protocol (Best)
Create a standard pattern for file operations:
```typescript
// In CLAUDE.md, instruct to use specific format:
// For delete: Use Bash with marker comment
Bash("rm /path/to/file.txt # FILE_DELETE")

// Then detect:
if (command.includes("# FILE_DELETE")) {
  // Extract path reliably
}
```
**Pros**: Explicit, reliable, extensible
**Cons**: Requires user instruction adherence

### Option 4: Backend API Delete Endpoint (Ideal)
Create a proper Delete tool via backend API:
```typescript
// New API endpoint: DELETE /api/files/delete
// New tool detection similar to Write/Edit
if (toolName === "Delete" && input.file_path) {
  operation = "deleted";
}
```
**Pros**: Consistent with Write/Edit, 100% reliable
**Cons**: Requires backend implementation

---

## Current State Summary

| Operation | Tool | Detection Method | Reliability | Status |
|-----------|------|-----------------|-------------|---------|
| Create | Write | Direct parameter | 100% | ✅ Working |
| Modify | Edit | Direct parameter | 100% | ✅ Working |
| Delete | Bash | Regex parsing | ~60% | ❌ Unreliable |

---

## Recommendation

**Short-term**: Implement Option 3 (Explicit Protocol)
- Update CLAUDE.md with file operation instructions
- Add marker comments for deletes
- Improve regex to detect markers

**Long-term**: Implement Option 4 (Backend API)
- Create `/api/files/delete` endpoint
- Add proper Delete tool to Claude Code
- Achieve full consistency across all operations

---

## Debug Checklist

When delete doesn't work, check:
1. ✅ Was FileOperationMessage created? (Check `[FILE_OP_DEBUG]` logs)
2. ✅ Was operation set to "deleted"? (Check `Result - filePath:` log)
3. ✅ Did DesktopLayout receive the message? (Check `[DESKTOP_LAYOUT_DEBUG]`)
4. ✅ Was queryClient.invalidateQueries called? (Check for "Delete operation" log)
5. ✅ What was the actual Bash command? (Check `Cached input:` log)
6. ✅ Did the regex match? (Check for "Delete operation detected" log)
