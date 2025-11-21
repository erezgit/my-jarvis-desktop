# Ticket 099: MCP File Tools - Implementation Plan [CANCELLED]

**Status**: ✅ RESOLVED - Alternative Solution Found
**Priority**: N/A - Issue Fixed
**Type**: Architecture Research (Not Implemented)
**Research Completed**: 2025-11-21
**Resolution**: Directory alignment fixed the issue

---

## 📋 **IMPLEMENTATION INDEX**

### **🎯 CANCELLED - Alternative Solution Found**

**RESOLUTION**: The file tree refresh issue was solved by aligning the `fileTreeDirectory` with Claude's working directory (`/home/node`) instead of `/home/node/my-jarvis`. The extensive MCP research led to discovering this simpler fix.

**Original Objective (Not Needed):**
Replace Claude Code's default file tools with custom MCP tools (investigation showed this was unnecessary).

### **📊 Actual Resolution**
- ✅ **Directory Alignment**: Changed `fileTreeDirectory` from `/home/node/my-jarvis` to `/home/node`
- ✅ **React Timing Fix**: Changed `useEffect` to `useLayoutEffect` for synchronous execution
- ✅ **MCP Voice Tool**: Successfully moved voice generation to MCP (good architectural decision)
- ❌ **MCP File Tools**: Not implemented (not needed - native tools work fine)

### **🗂️ Implementation Phases [CANCELLED - NOT NEEDED]**

**Note**: The implementation plan below was not executed because the root cause was identified as a simple directory mismatch, not a tool reliability issue.

| **Phase** | **Duration** | **Objective** | **Deliverable** |
|-----------|--------------|---------------|-----------------|
| [Phase 1](#phase-1-mcp-server-extension) | 1-2 days | Extend existing MCP server | Working file tools server |
| [Phase 2](#phase-2-core-file-operations) | 2-3 days | Implement core file operations | Write, Edit, MultiEdit tools |
| [Phase 3](#phase-3-chat-integration) | 1 day | Update UnifiedMessageProcessor | One-liner chat messages |
| [Phase 4](#phase-4-configuration-updates) | 1 day | Configure allowedTools | Tool replacement active |
| [Phase 5](#phase-5-testing-validation) | 1 day | Comprehensive testing | Validated implementation |
| [Phase 6](#phase-6-deployment-monitoring) | 1 day | Deploy and monitor | Production ready |

### **🔗 Dependencies**
- ✅ Existing MCP voice server (jarvis-mcp-server.js)
- ✅ UnifiedMessageProcessor system
- ✅ allowedTools configuration system
- ✅ FileOperationMessage display system

---

## 🚀 **DETAILED IMPLEMENTATION PLAN**

### **Phase 1: MCP Server Extension** *(1-2 days)*
**Objective**: Extend existing jarvis-mcp-server.js with file operation capabilities

#### **Step 1.1: Server Setup & Dependencies**
- [ ] Add Node.js fs module imports to jarvis-mcp-server.js
- [ ] Add path module for file path operations
- [ ] Test basic server functionality remains intact
- [ ] Verify voice generation still works

#### **Step 1.2: Tool Schema Definitions**
- [ ] Add write_file tool schema to ListToolsRequestSchema handler
  ```javascript
  {
    name: 'write_file',
    description: 'Create or overwrite a file with content',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to file' },
        content: { type: 'string', description: 'File content to write' }
      },
      required: ['file_path', 'content']
    }
  }
  ```
- [ ] Add edit_file tool schema
- [ ] Add multi_edit_file tool schema
- [ ] Validate schemas with test cases

#### **Step 1.3: Basic Tool Handler Framework**
- [ ] Extend CallToolRequestSchema handler with tool routing
- [ ] Add placeholder implementations for each file tool
- [ ] Test tool discovery and registration
- [ ] Verify no conflicts with voice generation

---

### **Phase 2: Core File Operations** *(2-3 days)*
**Objective**: Implement Priority 1 file tools with structured JSON responses

#### **Step 2.1: Write Tool Implementation**
- [ ] Implement write_file handler in CallToolRequestSchema
- [ ] Add directory creation if parent path doesn't exist
- [ ] Handle file permissions and error cases
- [ ] Return structured response format:
  ```javascript
  {
    content: [{
      type: 'text',
      text: `File created successfully!\n\nFILE_OPERATION:${JSON.stringify({
        operation: 'file_created',
        path: file_path,
        fileName: path.basename(file_path),
        timestamp: Date.now(),
        success: true
      })}`
    }]
  }
  ```
- [ ] Test write_file with various file types and paths
- [ ] Verify error handling for invalid paths/permissions

#### **Step 2.2: Edit Tool Implementation**
- [ ] Implement edit_file handler with string replacement
- [ ] Add old_string, new_string, replace_all parameters
- [ ] Handle uniqueness validation for old_string
- [ ] Return structured response with edit confirmation
- [ ] Test precise replacement scenarios
- [ ] Test replace_all functionality

#### **Step 2.3: MultiEdit Tool Implementation**
- [ ] Implement multi_edit_file handler for batch operations
- [ ] Add atomic transaction support (all edits or none)
- [ ] Handle edit conflict detection and validation
- [ ] Return comprehensive edit summary with metadata
- [ ] Test complex multi-operation scenarios
- [ ] Verify atomicity and rollback on failures

#### **Step 2.4: Error Handling & Validation**
- [ ] Implement comprehensive error responses
- [ ] Add file existence validation
- [ ] Handle permission denied scenarios
- [ ] Add input validation for all parameters
- [ ] Test edge cases and error conditions

---

### **Phase 3: Chat Integration** *(1 day)*
**Objective**: Update UnifiedMessageProcessor to recognize MCP file tools

#### **Step 3.1: Detection Logic Extension**
- [ ] Modify UnifiedMessageProcessor.ts lines 296-305
- [ ] Add MCP tool name detection:
  ```typescript
  else if (toolName === "mcp__jarvis-tools__write_file" && input.file_path) {
    filePath = input.file_path;
    operation = "created";
    console.log('[FILE_OP_DEBUG] ✅ MCP Write tool detected!');
  }
  else if (toolName === "mcp__jarvis-tools__edit_file" && input.file_path) {
    filePath = input.file_path;
    operation = "modified";
    console.log('[FILE_OP_DEBUG] ✅ MCP Edit tool detected!');
  }
  else if (toolName === "mcp__jarvis-tools__multi_edit_file" && input.file_path) {
    filePath = input.file_path;
    operation = "modified";
    console.log('[FILE_OP_DEBUG] ✅ MCP MultiEdit tool detected!');
  }
  ```
- [ ] Test detection logic with new MCP tools
- [ ] Verify existing native tool detection still works

#### **Step 3.2: FileOperationMessage Integration**
- [ ] Test FileOperationMessage creation for MCP tools
- [ ] Verify one-liner chat messages appear correctly:
  - "📁 Created file: components/Button.tsx"
  - "📝 Modified file: utils/helpers.ts"
- [ ] Ensure no duplicate messages or conflicts
- [ ] Test chat display consistency

---

### **Phase 4: Configuration Updates** *(1 day)*
**Objective**: Configure allowedTools to replace native file tools

#### **Step 4.1: allowedTools Configuration**
- [ ] Update chat.ts allowedTools array around line 201
- [ ] Add MCP file tools to allowedTools:
  ```typescript
  allowedTools: [
    "mcp__jarvis-tools__voice_generate",     // ✅ Keep existing
    "mcp__jarvis-tools__write_file",         // 🆕 Replace Write
    "mcp__jarvis-tools__edit_file",          // 🆕 Replace Edit
    "mcp__jarvis-tools__multi_edit_file"     // 🆕 Replace MultiEdit
    // Native Write/Edit/MultiEdit automatically excluded
  ]
  ```
- [ ] Test tool availability and priority
- [ ] Verify native tools are properly excluded

#### **Step 4.2: MCP Server Registration**
- [ ] Confirm jarvis-mcp-server.js is properly registered in mcpServers
- [ ] Test MCP server connectivity and tool discovery
- [ ] Verify logging and debugging output
- [ ] Test end-to-end tool execution

---

### **Phase 5: Testing & Validation** *(1 day)*
**Objective**: Comprehensive testing of complete implementation

#### **Step 5.1: Functional Testing**
- [ ] Test write_file creates files correctly
- [ ] Test edit_file modifies files with precise replacements
- [ ] Test multi_edit_file performs batch operations atomically
- [ ] Test file tree updates appear immediately and correctly
- [ ] Test chat messages show proper one-liners
- [ ] Test error scenarios and edge cases

#### **Step 5.2: Integration Testing**
- [ ] Test alongside existing voice generation (no conflicts)
- [ ] Test file operations in various project directories
- [ ] Test large files and complex edit operations
- [ ] Test simultaneous operations and race conditions
- [ ] Verify file tree state consistency

#### **Step 5.3: Performance Testing**
- [ ] Compare performance vs native tools
- [ ] Test with large files and many operations
- [ ] Measure file tree update latency
- [ ] Monitor memory usage and resource consumption

---

### **Phase 6: Deployment & Monitoring** *(1 day)*
**Objective**: Deploy to production and monitor performance

#### **Step 6.1: Production Deployment**
- [ ] Deploy updated jarvis-mcp-server.js
- [ ] Deploy updated UnifiedMessageProcessor.ts
- [ ] Deploy updated chat.ts configuration
- [ ] Verify all deployments successful

#### **Step 6.2: Monitoring & Validation**
- [ ] Monitor file tree update reliability (target: 100%)
- [ ] Monitor chat message consistency
- [ ] Monitor performance metrics
- [ ] Collect user feedback on file operations
- [ ] Document any issues or optimizations needed

#### **Step 6.3: Rollback Plan**
- [ ] Prepare rollback to native tools if needed
- [ ] Create feature flag for gradual rollout
- [ ] Document troubleshooting procedures
- [ ] Plan gradual user migration strategy

---

## ✅ **COMPLETION CRITERIA**

### **Phase 1 Complete When:**
- [ ] jarvis-mcp-server.js extended with file tool schemas
- [ ] Tool discovery working for all 3 file tools
- [ ] Voice generation still functioning normally

### **Phase 2 Complete When:**
- [ ] All file tools implemented with structured responses
- [ ] Error handling comprehensive and tested
- [ ] File operations working reliably

### **Phase 3 Complete When:**
- [ ] UnifiedMessageProcessor recognizes MCP file tools
- [ ] One-liner chat messages appearing correctly
- [ ] No conflicts with existing message types

### **Phase 4 Complete When:**
- [ ] allowedTools configured to use only MCP file tools
- [ ] Native file tools successfully excluded
- [ ] Tool priority working as expected

### **Phase 5 Complete When:**
- [ ] All tests passing with 100% reliability
- [ ] File tree updates working perfectly
- [ ] Performance acceptable vs native tools

### **Phase 6 Complete When:**
- [ ] Production deployment successful
- [ ] Monitoring showing 100% file tree reliability
- [ ] Zero user-reported issues with file operations

---

## 🎯 **SUCCESS METRICS**

| **Metric** | **Current State** | **Target State** | **Measurement** |
|------------|-------------------|------------------|-----------------|
| **File Tree Reliability** | ~85% (cache issues) | 100% | File operation detection rate |
| **Chat Message Accuracy** | ~90% | 100% | Correct one-liner display rate |
| **Tool Response Time** | ~100ms | <150ms | Average MCP tool execution |
| **Zero Breaking Changes** | N/A | 100% | Existing functionality preserved |

**🎉 Project Success = All metrics achieved + Zero user complaints about file tree inconsistencies**