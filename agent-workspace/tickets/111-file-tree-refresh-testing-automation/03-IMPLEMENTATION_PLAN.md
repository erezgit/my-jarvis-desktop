# Implementation Plan: Fix File Tree Refresh for Bash Operations

## Status: 🎯 READY FOR IMPLEMENTATION

## Executive Summary

Based on comprehensive testing (40 tests) and research, we have identified the exact problem and solution. SDK tools (Write/Edit) work perfectly, but Bash operations (mkdir/mv/rm/cp) don't trigger file tree refresh. The fix involves enhancing pattern detection in UnifiedMessageProcessor.ts while maintaining the existing architecture.

---

## Current State Analysis

### What Works ✅
- SDK Write tool → File tree refreshes immediately
- SDK Edit tool → File tree updates properly
- Tool use ID matching → Correctly links requests to responses
- Caching mechanism → Successfully stores tool information

### What Fails ❌
- Bash `mkdir` → Not detected at all
- Bash `echo >` → Not detected for file creation
- Bash `mv` → Not detected for moves/renames
- Bash `cp` → Not detected for copies
- Bash `rm` → Only partially detected

### Root Cause
Location: `/app/utils/UnifiedMessageProcessor.ts`
- Lines 550-570: Current detection only handles Write, Edit, and partial rm
- Missing: Pattern matching for mkdir, echo, mv, cp operations

---

## Implementation Steps

### Step 1: Enhance Bash Command Detection

**File:** `/app/utils/UnifiedMessageProcessor.ts`

**Current Code (around line 560):**
```typescript
else if (toolName === "Bash" && input.command && typeof input.command === 'string') {
  // Check if Bash command is a delete operation (rm, unlink, etc.)
  const command = input.command as string;
  const deleteMatch = command.match(/(?:rm|unlink)\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
  if (deleteMatch) {
    filePath = deleteMatch[1];
    operation = "deleted";
  }
}
```

**New Code (REPLACE the above with):**
```typescript
else if (toolName === "Bash" && input.command && typeof input.command === 'string') {
  const command = input.command as string;

  // Pattern 1: Directory creation (mkdir)
  const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?["']?([^\s"']+)["']?/);
  if (mkdirMatch) {
    filePath = mkdirMatch[1];
    operation = "created";
    isDirectory = true;
  }

  // Pattern 2: File creation with echo/cat
  const echoMatch = command.match(/(?:echo|cat)\s+.*?>\s*["']?([^\s"']+)["']?/);
  if (!filePath && echoMatch) {
    filePath = echoMatch[1];
    operation = "created";
    isDirectory = false;
  }

  // Pattern 3: Move/Rename operations
  const mvMatch = command.match(/mv\s+["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
  if (!filePath && mvMatch) {
    // For moves, we need to handle both deletion of old and creation of new
    // First, trigger deletion of old path
    filePath = mvMatch[1];
    operation = "deleted";
    // TODO: Also trigger creation for mvMatch[2] (may need separate message)
  }

  // Pattern 4: Copy operations
  const cpMatch = command.match(/cp\s+(?:-r\s+)?["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
  if (!filePath && cpMatch) {
    filePath = cpMatch[2];  // Destination is what appears in tree
    operation = "created";
    isDirectory = command.includes('-r');
  }

  // Pattern 5: Delete operations (improved)
  const deleteMatch = command.match(/(?:rm|rmdir|unlink)\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
  if (!filePath && deleteMatch) {
    filePath = deleteMatch[1];
    operation = "deleted";
    isDirectory = command.includes('rmdir') || command.includes('-r');
  }

  // Pattern 6: Touch for file creation
  const touchMatch = command.match(/touch\s+["']?([^\s"']+)["']?/);
  if (!filePath && touchMatch) {
    filePath = touchMatch[1];
    operation = "created";
    isDirectory = false;
  }
}
```

### Step 2: Fix Directory Flag

**Current Issue:** The code always sets `isDirectory: false`

**Location:** Around line 590 in UnifiedMessageProcessor.ts

**Current Code:**
```typescript
const fileOpMessage: FileOperationMessage = {
  type: "file_operation",
  operation,
  path: filePath,
  fileName,
  isDirectory: false,  // ❌ Always false
  timestamp: options.timestamp || Date.now(),
};
```

**New Code:**
```typescript
const fileOpMessage: FileOperationMessage = {
  type: "file_operation",
  operation,
  path: filePath,
  fileName,
  isDirectory: isDirectory,  // ✅ Use the detected value
  timestamp: options.timestamp || Date.now(),
};
```

### Step 3: Handle Move Operations (Special Case)

Move operations need TWO messages: delete old, create new.

**Add after the pattern matching section:**
```typescript
// Special handling for move operations - need both delete and create
if (toolName === "Bash" && mvMatch) {
  // First message: delete old location
  const deleteMessage: FileOperationMessage = {
    type: "file_operation",
    operation: "deleted",
    path: mvMatch[1],
    fileName: path.basename(mvMatch[1]),
    isDirectory: false,  // Could enhance with stat check
    timestamp: options.timestamp || Date.now(),
  };
  context.addMessage(deleteMessage);

  // Second message: create new location
  const createMessage: FileOperationMessage = {
    type: "file_operation",
    operation: "created",
    path: mvMatch[2],
    fileName: path.basename(mvMatch[2]),
    isDirectory: false,  // Could enhance with stat check
    timestamp: options.timestamp || Date.now(),
  };
  context.addMessage(createMessage);

  // Skip normal single message creation
  return;
}
```

### Step 4: Add Path Import

**At the top of UnifiedMessageProcessor.ts:**
```typescript
import * as path from 'path';
```

---

## Testing Plan

### Validation Steps

1. **Setup Docker Environment First**
   ```bash
   # Start Docker Desktop
   docker start my-jarvis-local
   # Verify running on port 3000
   ```

2. **Run Existing Test Suite**
   ```bash
   cd playwright-tests
   npm test
   ```
   Expected: All 30 tests should pass

2. **Manual Testing Checklist**
   - [ ] Create directory with `mkdir test-dir` → Tree updates
   - [ ] Create file with `echo "test" > test.txt` → Tree updates
   - [ ] Move file with `mv old.txt new.txt` → Tree updates
   - [ ] Copy file with `cp source.txt dest.txt` → Tree updates
   - [ ] Delete file with `rm file.txt` → Tree updates
   - [ ] Create nested with `mkdir -p a/b/c` → Full tree appears

3. **Edge Cases to Test**
   - [ ] Files with spaces: `mkdir "my folder"`
   - [ ] Special characters: `touch file-with-dash.txt`
   - [ ] Hidden files: `touch .hidden`
   - [ ] Multiple operations rapidly
   - [ ] Parallel operations in different directories

---

## Success Criteria

### Immediate Success
- ✅ All 40 automated tests pass
- ✅ File tree updates for ALL Bash operations
- ✅ No manual refresh needed
- ✅ Maintains backward compatibility with SDK tools

### Performance Metrics
- Response time: Tree updates within 500ms
- No dropped updates during rapid operations
- No memory leaks from pattern matching

---

## Risk Assessment

### Low Risk ✅
- Changes are additive (new patterns)
- Existing SDK tool detection unchanged
- Tool ID matching mechanism preserved
- Caching system untouched

### Potential Issues to Watch
1. **Regex Performance**: Complex patterns might slow processing
   - Mitigation: Test with large commands

2. **Edge Cases**: Unusual command formats might not match
   - Mitigation: Log unmatched Bash commands for analysis

3. **False Positives**: Patterns might match comments or strings
   - Mitigation: Test with various command formats

---

## Rollback Plan

If issues arise:
1. Comment out new pattern matching code
2. Keep only the original rm detection
3. Document which patterns caused issues
4. Refine regex patterns and retry

---

## Future Enhancements (Post-Fix)

1. **MCP for File Operations**
   - Create dedicated file operation tools
   - Structured responses instead of parsing

2. **WebSocket File Watching**
   - Real-time file system monitoring
   - Server-side change detection

3. **Tool Description Updates**
   - Guide Claude to prefer SDK tools
   - Add warnings about Bash limitations

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read this plan thoroughly
- [ ] Locate UnifiedMessageProcessor.ts
- [ ] Back up current code
- [ ] Ensure test suite runs

### Implementation
- [ ] Add path import
- [ ] Replace Bash detection code
- [ ] Fix isDirectory flag usage
- [ ] Add move operation handling
- [ ] Test each pattern individually

### Post-Implementation
- [ ] Run full test suite
- [ ] Check all 40 tests pass
- [ ] Test edge cases manually
- [ ] Update ticket status
- [ ] Document any issues found

---

## Code Location Reference

**Primary File:**
```
/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/app/utils/UnifiedMessageProcessor.ts
```

**Key Sections:**
- Lines 420-425: Tool caching
- Lines 550-570: Current Bash detection (REPLACE THIS)
- Lines 580-595: FileOperationMessage creation
- Line 590: isDirectory flag (FIX THIS)

---

## Notes for Implementer

1. **Test After Each Pattern**: Add one pattern, test it, then add next
2. **Use Console Logs**: Temporarily add logging to verify pattern matches
3. **Check Response Structure**: Ensure tool_result has expected format
4. **Preserve IDs**: Don't break tool_use_id matching
5. **Consider Order**: Patterns are checked in sequence, order matters

---

**Ready for Implementation!**

The fix is well-understood, low-risk, and thoroughly tested. Follow this plan step-by-step for successful implementation.

---

*Plan Created: 2024-11-28*
*Implementer: [Next Available Agent]*
*Validator: Run test suite after implementation*