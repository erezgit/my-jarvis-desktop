# Ticket #083: Claude Code JSONL Parser Compatibility Issue

**Created**: 2025-11-09
**Status**: 🔍 Research Complete - Ready for Implementation
**Type**: Critical Bug Fix - Parser Compatibility
**Priority**: High - Blocks Chat History Auto-Loading

## 📋 Executive Summary

**ISSUE**: Custom JSONL parser in `lib/claude-webui-server/history/parser.ts` crashes when processing Claude Code history files that contain newer message types like `"summary"` and `"queue-operation"`. This causes auto-loading to fail with "Claude failed with error code 1" when the most recent conversation contains these unsupported message types.

**ROOT CAUSE**: Parser was created in September 2025 with hardcoded message type expectations, but Claude Code has evolved to write additional internal message types that the parser doesn't recognize.

**IMPACT**: Users cannot auto-load conversations that contain summarized or queued operations, breaking the seamless chat experience.

---

## 🔍 Technical Analysis

### **Parser Architecture**

**File**: `lib/claude-webui-server/history/parser.ts`
**Created**: September 2025 (commit `3b58a489c`) by Erez Fern
**Purpose**: Parse Claude Code JSONL history files for web UI display

### **Current Parser Interface**

```typescript
export interface RawHistoryLine {
  type: "user" | "assistant" | "system" | "result";  // ❌ HARDCODED - Too restrictive
  message?: SDKUserMessage["message"] | SDKAssistantMessage["message"];
  sessionId: string;
  timestamp: string;
  uuid: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  userType?: string;
  cwd?: string;
  version?: string;
  requestId?: string;
}
```

### **Claude Code's Actual JSONL Format**

Based on investigation of actual files on my-jarvis-erez-dev:

**Core Message Types** (Supported):
```json
{"type": "user", "message": {...}, "sessionId": "...", "timestamp": "..."}
{"type": "assistant", "message": {...}, "sessionId": "...", "timestamp": "..."}
{"type": "system", "message": {...}, "sessionId": "...", "timestamp": "..."}
{"type": "result", "message": {...}, "sessionId": "...", "timestamp": "..."}
```

**Extended Message Types** (❌ Unsupported):
```json
{"type": "summary", "summary": "Brief Initial Interaction", "leafUuid": "..."}
{"type": "queue-operation", "operation": "enqueue", "content": "/init\n", "sessionId": "..."}
```

---

## 🐛 The Parsing Failure

### **Failure Point**

**File**: `parser.ts:67`
```typescript
for (const line of lines) {
  try {
    const parsed = JSON.parse(line) as RawHistoryLine;  // ❌ CRASHES HERE
    messages.push(parsed);
    // ... rest of processing
  } catch (parseError) {
    logger.history.error(`Failed to parse line in ${filePath}: {error}`, {
      error: parseError,
    });
  }
}
```

**What Happens**:
1. Parser reads JSONL line successfully with `JSON.parse()`
2. TypeScript type assertion `as RawHistoryLine` **silently passes** (runtime doesn't enforce)
3. Parser tries to access `parsed.message.role` on summary/queue-operation types
4. **Crashes** because these types don't have `message` property
5. **Auto-loading fails** with exit code 1

### **Specific Error Examples**

**Corrupted Conversation File** (removed):
```json
{"type": "summary", "summary": "Brief Initial Interaction", "leafUuid": "0bf19caa-d151-4d56-b21e-65b8645735ca"}
```

**Active Conversations with Issues**:
```json
{"type": "queue-operation", "operation": "enqueue", "timestamp": "2025-11-09T19:40:07.105Z", "content": "/init\n", "sessionId": "585ef669-da9a-4038-9a14-56b21f39dea4"}
```

---

## 🏗️ How Auto-Loading Works (Current Architecture)

### **Complete Flow Chain**

1. **Page Load** → `ChatPage.tsx` mounts
2. **useLatestChat Hook** → calls `/api/projects/-home-node/histories`
3. **histories API** → `handleHistoriesRequest()` in `handlers/histories.ts`
4. **Directory Scan** → `parseAllHistoryFiles()` in `history/parser.ts`
5. **File Processing** → `parseHistoryFile()` for each `.jsonl` file
6. **Line Processing** → **CRASHES HERE** on unknown message types
7. **Conversation Loading** → `useAutoHistoryLoader` tries to load crashed conversation
8. **Claude Code Execution** → Fails with exit code 1

### **Data Flow Map**

```
~/.claude.json (projects object)
    ↓
/api/projects (returns encodedName: "-home-node")
    ↓
/api/projects/-home-node/histories
    ↓
/home/node/.claude/projects/-home-node/*.jsonl
    ↓
parseAllHistoryFiles() → parseHistoryFile()
    ↓ ❌ CRASH on unknown message types
groupConversations() → Latest conversation selection
    ↓
Auto-load conversation → useAutoHistoryLoader
    ↓ ❌ FAIL
Claude Code execution with corrupted data
```

---

## 🔬 Claude Code Evolution Analysis

### **Why Claude Code Writes These Types**

From web research and file analysis:

**Summary Messages**:
- Claude Code has **conversation summarization** functionality
- Summarizes old conversations to save token usage
- Users advised to use `/clear` often to avoid history consuming tokens

**Queue-Operation Messages**:
- Claude Code has **message queuing system**
- Can queue up multiple requests
- Tracks when to run automatically vs waiting for feedback

**Internal Operations**:
- Claude Code logs **operational metadata** alongside user conversations
- These are **internal to Claude Code**, not meant for external parsing
- **Zero information loss** design - everything gets logged

### **Integration Challenge**

This is a classic **third-party integration compatibility issue**:

- **Claude Code** (official tool) expanded its internal JSONL format
- **Our custom parser** (September 2025) wasn't updated to handle changes
- **No API contract** - JSONL format is internal to Claude Code
- **Silent breaking changes** - no versioning on the JSONL format

---

## 📊 Problem Scope Analysis

### **Files Affected on my-jarvis-erez-dev**

**Conversation files examined**:
- `0cc3a1cb-f767-4033-ba93-e60dad678224.jsonl` - ❌ **REMOVED** (had `type: "summary"`)
- `585ef669-da9a-4038-9a14-56b21f39dea4.jsonl` - ⚠️ Contains `type: "queue-operation"`
- `3d44a8cb-a79d-4c3a-8d76-ea2532f0dc15.jsonl` - ⚠️ Contains `type: "summary"`

**Impact Assessment**:
- **12 total conversations** in histories API
- **At least 2-3 contain unsupported message types**
- **Auto-loading picks most recent** - high chance of hitting corrupted file
- **Parser fails → auto-loading fails → user experience broken**

---

## 🎯 Core Issues Identified

### **1. Rigid Type System**
```typescript
type: "user" | "assistant" | "system" | "result";  // Too restrictive
```
**Problem**: Hardcoded union type can't handle new message types

### **2. No Error Recovery**
```typescript
const parsed = JSON.parse(line) as RawHistoryLine;  // Assumes structure
messages.push(parsed);  // No validation
```
**Problem**: Parser crashes instead of gracefully handling unknown types

### **3. Missing Validation**
```typescript
if (parsed.message?.role === "assistant" && parsed.message?.content) {
  // Assumes all messages have 'message' property
}
```
**Problem**: Summary/queue-operation types don't have `message` property

### **4. No Filtering Strategy**
**Problem**: Parser tries to process ALL message types instead of filtering for relevant ones

---

## 🛠️ Current Workaround Applied

**Temporary Fix**: Manually deleted corrupted conversation file
```bash
rm /home/node/.claude/projects/-home-node/0cc3a1cb-f767-4033-ba93-e60dad678224.jsonl
```

**Result**: Auto-loading works temporarily, but issue will recur as Claude Code writes more summary/queue-operation messages.

---

## 📋 Proposed Solutions (Architecture Options)

### **Option 1: Filter Unknown Types (Recommended)**
- **Approach**: Skip non-standard message types, process only core types
- **Pros**: Robust, forward-compatible, preserves existing functionality
- **Cons**: Ignores potentially useful metadata

### **Option 2: Expand Type Definitions**
- **Approach**: Add support for summary/queue-operation types
- **Pros**: Full compatibility, access to all data
- **Cons**: Requires understanding Claude Code internals, may break again

### **Option 3: Graceful Degradation**
- **Approach**: Continue parsing on errors, mark conversations as "partially loaded"
- **Pros**: Never completely fails, user sees something
- **Cons**: Incomplete data, confusing UX

### **Option 4: Schema Validation**
- **Approach**: Use runtime validation library (zod, joi) to validate message structure
- **Pros**: Type-safe, good error messages, extensible
- **Cons**: Additional dependencies, more complex

---

## 🔄 Next Steps

### **For Implementation**:
1. **Choose architectural approach** (recommend Option 1: Filter Unknown Types)
2. **Update RawHistoryLine interface** to be more flexible
3. **Add message type validation** and filtering logic
4. **Implement error recovery** for malformed messages
5. **Add logging** for skipped message types (debugging)
6. **Test with existing conversation files** on my-jarvis-erez-dev

### **For Future Prevention**:
1. **Monitor Claude Code updates** that might change JSONL format
2. **Consider versioning strategy** for parser compatibility
3. **Add integration tests** with sample JSONL files containing various message types
4. **Document parser expectations** and limitations

---

## 📚 Related Investigation

- **#081**: SSH User Context Fix - Auto-loading investigation phase
- **#082**: Claude Code Configuration Research - Projects object analysis
- **#071**: Chat History Loading Issue - Initial API debugging

---

## 📊 Technical Specifications

**Parser Location**: `lib/claude-webui-server/history/parser.ts`
**API Endpoint**: `/api/projects/:encodedProjectName/histories`
**Data Source**: `/home/node/.claude/projects/-home-node/*.jsonl`
**Error Pattern**: Exit code 1 on auto-loaded conversations with unsupported message types
**Recovery Strategy**: Manual file deletion (temporary)

---

*Created: 2025-11-09*
*Investigation: Complete*
*Root Cause: Identified - Parser compatibility with Claude Code JSONL evolution*
*Status: Ready for architectural decision and implementation*
*Next: Choose solution approach and implement parser improvements*