# MyJarvis Tools Architecture

## Overview
This document analyzes our custom tool implementation patterns and standards based on the Claude Agent SDK architecture. The voice message tool serves as our reference implementation.

---

## Voice Message Tool Analysis

**Status:** ✅ REFERENCE IMPLEMENTATION - Follows Claude Agent SDK Best Practices

### Architecture Flow

#### 1. Tool Invocation
- ✅ **Tool Input**: Uses standard Bash tool with structured command
- ✅ **Command Pattern**: `jarvis_voice.sh --voice echo "message"`
- ✅ **Parameter Structure**: Clear flags and quoted text input

#### 2. Tool Processing
- ✅ **Bash Wrapper**: Shell script validates inputs and formats command
- ✅ **Python Core**: Dedicated Python module handles the actual generation
- ✅ **Error Handling**: Comprehensive validation and fallback logic
- ✅ **Environment Detection**: Smart deployment mode detection (electron/web/local)

#### 3. Tool Result Processing
- ✅ **Success Response**: Returns structured string with file path
- ✅ **Pattern**: `"Audio generated successfully at: /path/to/file.mp3"`
- ✅ **Predictable Format**: Consistent success message format

#### 4. Frontend Message Processing
- ✅ **Cache Lookup**: Uses tool_use_id to retrieve original command
- ✅ **Pattern Detection**: `command?.includes('jarvis_voice.sh')`
- ✅ **Content Parsing**: Extracts audio path with regex pattern
- ✅ **Message Creation**: Creates structured VoiceMessage object

#### 5. Frontend Message Object
```typescript
{
  type: "voice",
  content: "extracted message text",
  audioUrl: "/api/voice/filename.mp3", // or file:// for electron
  timestamp: number,
  autoPlay: boolean
}
```

#### 6. UI Integration
- ✅ **Auto-play Logic**: Environment-aware audio playback
- ✅ **URL Handling**: Different protocols for web vs electron
- ✅ **State Management**: Proper component lifecycle handling

---

## Analysis Summary

### ✅ What Works Perfectly
1. **Structured Input/Output Flow**: Clear command → processing → structured response
2. **Cache-Based Detection**: Reliable tool identification via command content
3. **Environment Awareness**: Smart detection of deployment context
4. **Consistent Message Format**: Predictable success/error patterns
5. **Frontend Integration**: Seamless UI component integration

### 🔄 Current Pattern vs Ideal Claude Agent SDK
- **Current**: Uses Bash tool wrapper → detects via cache lookup → parses string response
- **Ideal**: Would use custom MCP tool → returns structured JSON directly

### 📝 Key Insights for File Operations
1. **Pattern Detection Works**: Cache lookup + command pattern matching is reliable
2. **Structured Responses Possible**: Voice tool proves structured UI integration works
3. **Message Type System**: Frontend handles different message types elegantly
4. **Auto-behavior Logic**: Environment-aware features work well

---

## File Operations Problem

### ❌ Current File Tools (Write/Edit/Delete)
- ❌ **Unstructured Response**: Returns plain text "File created successfully at: /path"
- ❌ **Inconsistent Parsing**: String parsing prone to edge cases
- ❌ **Cache Dependency**: File tree refresh depends on cache hits (90% reliable)

### ✅ Solution: Mirror Voice Pattern
- ✅ **Keep Bash Wrapper Approach**: Proven pattern that works
- ✅ **Standardize Success Messages**: Make file operations return predictable formats
- ✅ **Enhance Detection Logic**: Improve cache-based pattern matching
- ✅ **Create Structured Messages**: File operation messages with operation type, path, timestamps

---

## Recommended Implementation Strategy

### Phase 1: Enhance Current Pattern (Low Risk)
1. Standardize file operation success message formats
2. Improve cache-based detection reliability
3. Add structured FileOperationMessage creation
4. Test with existing Write/Edit tools

### Phase 2: Custom MCP Tools (Future Enhancement)
1. Create custom file operation tools using createSdkMcpServer
2. Return structured JSON responses directly
3. Replace built-in Write/Edit in allowedTools configuration
4. Maintain backward compatibility

---

## Conclusion

The voice message tool demonstrates that our current architecture can reliably handle structured tool responses and UI integration. The cache-based pattern detection works well and should be enhanced for file operations rather than completely replaced.

**Next Steps:**
1. Apply voice tool patterns to file operations
2. Standardize success message formats
3. Enhance FileOperationMessage creation
4. Consider custom MCP tools for future versions

---

*Document Created: 2025-11-19*
*Status: Architecture Analysis Complete*