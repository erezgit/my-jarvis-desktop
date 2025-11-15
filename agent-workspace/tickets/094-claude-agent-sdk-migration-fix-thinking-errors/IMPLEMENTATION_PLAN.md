# 🚀 CLAUDE AGENT SDK MIGRATION - IMPLEMENTATION PLAN

## 📋 Overview

**Objective**: Migrate from deprecated Claude Code SDK to Claude Agent SDK with 2025 best practices
**Root Issue**: `clear_thinking_20251015` API errors due to missing thinking parameter configuration
**Goal**: Fix immediate errors + upgrade to latest standards in single comprehensive migration

**Estimated Duration**: 4-6 hours
**Risk Level**: Medium (package migration + configuration changes)

---

## 🏗️ PHASE 1: Pre-Migration Verification
**Objective**: Verify current state and prepare for direct migration on main branch

### ✅ Pre-Migration Checklist

- [ ] **1.1** Ensure clean working directory
  ```bash
  cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop
  git status
  ```

- [ ] **1.2** Pull latest changes
  ```bash
  git pull origin main
  ```

- [ ] **1.3** Document current working state
  - [ ] Test Erez instance functionality
  - [ ] Screenshot working chat interface
  - [ ] Export current session logs (if any)

- [ ] **1.4** Verify current package versions
  ```bash
  npm list @anthropic-ai/claude-code
  cd lib/claude-webui-server
  npm list @anthropic-ai/claude-code
  ```

**Expected Output**: Clean working tree, current state documented, ready for direct migration

---

## 🔄 PHASE 2: Package Migration
**Objective**: Replace deprecated Claude Code SDK with Claude Agent SDK

### ✅ Package Updates Checklist

- [ ] **2.1** Update root package.json
  ```bash
  cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop
  npm uninstall @anthropic-ai/claude-code
  npm install @anthropic-ai/claude-agent-sdk@latest
  ```

- [ ] **2.2** Update backend package.json
  ```bash
  cd lib/claude-webui-server
  npm uninstall @anthropic-ai/claude-code
  npm install @anthropic-ai/claude-agent-sdk@latest
  ```

- [ ] **2.3** Update package.json dependency entries
  - [ ] Root `/package.json` line 23: `"@anthropic-ai/claude-code": "1.0.108"` → `"@anthropic-ai/claude-agent-sdk": "^0.1.42"`
  - [ ] Backend `/lib/claude-webui-server/package.json` line 57: dependency update
  - [ ] Backend `/lib/claude-webui-server/package.json` line 83: peerDependency update

- [ ] **2.4** Update configuration files
  - [ ] `/lib/claude-webui-server/deno.json` line 27: import map update
  - [ ] `/lib/claude-webui-server/scripts/build-bundle.js` line 21: external deps update

- [ ] **2.5** Verify package installation
  ```bash
  npm list @anthropic-ai/claude-agent-sdk
  cd lib/claude-webui-server && npm list @anthropic-ai/claude-agent-sdk
  ```

**Expected Output**: All package.json files updated, new SDK installed, dependency verification successful

---

## 🔧 PHASE 3: Source Code Import Updates
**Objective**: Update all import statements across frontend and backend

### ✅ Frontend Import Updates Checklist

- [ ] **3.1** Update main types file: `/app/types.ts` (lines 1-7)
- [ ] **3.2** Update types re-export: `/app/types.ts` (lines 272-280)
- [ ] **3.3** Update mock generator: `/app/utils/mockResponseGenerator.ts` (line 1)

### ✅ Backend Import Updates Checklist

- [ ] **3.4** Update chat handler: `/lib/claude-webui-server/handlers/chat.ts` (line 2)
- [ ] **3.5** Update history parser: `/lib/claude-webui-server/history/parser.ts` (lines 6-9)
- [ ] **3.6** Update test mocks: `/lib/claude-webui-server/handlers/chat.test.ts` (lines 5, 13)

### ✅ Import Verification

- [ ] **3.7** TypeScript compilation check
  ```bash
  npm run typecheck
  cd lib/claude-webui-server && npm run typecheck
  ```

- [ ] **3.8** Build verification
  ```bash
  npm run build
  ```

**Expected Output**: All imports updated, TypeScript compilation successful, build passes

---

## ⚙️ PHASE 4: Configuration Enhancement
**Objective**: Add 2025 best practices - thinking parameters, system prompts, enhanced security

### ✅ Thinking Parameter Configuration

- [ ] **4.1** Update chat handler with thinking configuration
  - **File**: `/lib/claude-webui-server/handlers/chat.ts`
  - **Location**: Lines 42-53 (queryOptions object)
  - **Addition**: Add thinking parameter

- [ ] **4.2** Test thinking parameter with different budget levels
  - [ ] Basic: 1024 tokens (minimum)
  - [ ] Standard: 10000 tokens (recommended)
  - [ ] Advanced: 20000+ tokens (for complex tasks)

### ✅ System Prompt Configuration

- [ ] **4.3** Add explicit system prompt configuration
  - **File**: `/lib/claude-webui-server/handlers/chat.ts`
  - **Addition**: systemPrompt with claude_code preset

- [ ] **4.4** Enable project settings loading
  - **Addition**: settingSources: ['project'] for CLAUDE.md support

### ✅ CLAUDE.md Project Context

- [ ] **4.5** Create project-level CLAUDE.md
  - **File**: `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/CLAUDE.md`
  - **Content**: Project conventions, architecture, commands

- [ ] **4.6** Test CLAUDE.md loading in queries

### ✅ Enhanced Security Configuration

- [ ] **4.7** Add security hooks (optional enhancement)
  - **Pre-tool use validation**
  - **Post-tool use logging**

- [ ] **4.8** Enhanced permission controls
  - **Explicit allowedTools configuration**
  - **Least-privilege tool access**

**Expected Output**: Thinking parameters configured, system prompt explicit, CLAUDE.md integrated, enhanced security active

---

## 🧪 PHASE 5: Testing & Validation
**Objective**: Comprehensive testing to ensure migration success

### ✅ Local Development Testing

- [ ] **5.1** Backend server startup test
  ```bash
  cd lib/claude-webui-server
  npm run start
  ```

- [ ] **5.2** Frontend development server test
  ```bash
  npm run dev
  ```

- [ ] **5.3** TypeScript and linting validation
  ```bash
  npm run typecheck
  npm run lint
  cd lib/claude-webui-server && npm run typecheck && npm run lint
  ```

- [ ] **5.4** Build process verification
  ```bash
  npm run build
  ```

### ✅ Integration Testing

- [ ] **5.5** Basic chat functionality
  - [ ] Send simple message: "Hello"
  - [ ] Verify response received
  - [ ] Check for thinking parameter usage
  - [ ] Confirm no `clear_thinking_20251015` errors

- [ ] **5.6** Tool execution testing
  - [ ] File operations (Read, Write, Edit)
  - [ ] Terminal commands (Bash)
  - [ ] Search operations (Grep, Glob)

- [ ] **5.7** Permission mode testing
  - [ ] Test with different permission modes
  - [ ] Verify allowedTools restrictions work
  - [ ] Test abort functionality

- [ ] **5.8** Streaming functionality
  - [ ] Long-running operations
  - [ ] Message processing consistency
  - [ ] Session continuity

### ✅ Error Scenarios Testing

- [ ] **5.9** Network interruption handling
- [ ] **5.10** Invalid command handling
- [ ] **5.11** Permission denied scenarios
- [ ] **5.12** Abort operation testing

**Expected Output**: All tests pass, no errors in logs, full functionality confirmed

---

## 🚀 PHASE 6: Deployment & Monitoring
**Objective**: Deploy to production and monitor for issues

### ✅ Deployment Checklist

- [ ] **6.1** Commit all changes with descriptive message
  ```bash
  git add .
  git commit -m "feat: Migrate to Claude Agent SDK with 2025 standards

  - Replace deprecated @anthropic-ai/claude-code with @anthropic-ai/claude-agent-sdk
  - Add thinking parameter configuration to fix clear_thinking_20251015 errors
  - Implement explicit system prompt configuration
  - Add CLAUDE.md project context integration
  - Enhanced security with explicit tool controls
  - Maintains backward compatibility for all existing functionality

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

- [ ] **6.2** Deploy to Erez instance first (testing)
  ```bash
  ./deploy-to-app.sh my-jarvis-erez
  ```

- [ ] **6.3** Monitor Erez deployment
  ```bash
  fly logs -a my-jarvis-erez
  ```

- [ ] **6.4** Test Erez instance thoroughly
  - [ ] Basic chat functionality
  - [ ] Tool operations
  - [ ] Session continuity
  - [ ] No thinking-related errors

### ✅ Production Deployment

- [ ] **6.5** Deploy to Tamar instance (production)
  ```bash
  ./deploy-to-app.sh my-jarvis-tamar
  ```

- [ ] **6.6** Monitor Tamar deployment
  ```bash
  fly logs -a my-jarvis-tamar
  ```

- [ ] **6.7** Verify issue resolution
  - [ ] No more `clear_thinking_20251015` errors
  - [ ] Chat functionality restored
  - [ ] Performance improvements (if any)

### ✅ Post-Deployment Monitoring

- [ ] **6.8** Monitor for 24 hours minimum
- [ ] **6.9** Check error logs for any regressions
- [ ] **6.10** Validate user experience consistency
- [ ] **6.11** Performance benchmarking (response times)

**Expected Output**: Successful deployment to both instances, error resolution confirmed, no regressions detected

---

# 💻 CODE EXAMPLES

## 📝 Example 1: Updated chat.ts Configuration

**File**: `/lib/claude-webui-server/handlers/chat.ts` (lines 42-60)

**Before** (Current - Missing Thinking):
```typescript
// Build SDK options - use same configuration as working my-jarvis-erez
const queryOptions = {
  abortController,
  executable: "node" as const,
  executableArgs: [],
  pathToClaudeCodeExecutable: cliPath,
  cwd: workingDirectory,
  additionalDirectories: workingDirectory ? [workingDirectory] : [],
  ...(sessionId ? { resume: sessionId } : {}),
  ...(allowedTools ? { allowedTools } : {}),
  ...(permissionMode ? { permissionMode } : {}),
};
```

**After** (With 2025 Standards):
```typescript
// Build SDK options with 2025 best practices
const queryOptions = {
  abortController,
  executable: "node" as const,
  executableArgs: [],
  pathToClaudeCodeExecutable: cliPath,
  cwd: workingDirectory,
  additionalDirectories: workingDirectory ? [workingDirectory] : [],

  // ✅ REQUIRED: Thinking parameter configuration (fixes clear_thinking_20251015)
  thinking: {
    type: "enabled" as const,
    budget_tokens: 10000 // Optimal balance of performance and speed
  },

  // ✅ BEST PRACTICE: Explicit system prompt configuration
  systemPrompt: {
    type: "preset" as const,
    preset: "claude_code" // Maintains Claude Code behavior
  },

  // ✅ ENHANCEMENT: Enable CLAUDE.md project context loading
  settingSources: ['project'],

  // ✅ SECURITY: Enhanced tool control with least-privilege principle
  ...(allowedTools ? {
    allowedTools: allowedTools.length > 0 ? allowedTools : [
      "Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch"
    ]
  } : {}),

  // ✅ MAINTAINED: Existing functionality
  ...(sessionId ? { resume: sessionId } : {}),
  ...(permissionMode ? { permissionMode } : {}),
};
```

## 📝 Example 2: Updated Import Statements

**File**: `/app/types.ts` (lines 1-7)

**Before**:
```typescript
import type {
  SDKUserMessage,
  SDKAssistantMessage,
  SDKSystemMessage,
  SDKResultMessage,
  PermissionMode as SDKPermissionMode,
} from "@anthropic-ai/claude-code";
```

**After**:
```typescript
import type {
  SDKUserMessage,
  SDKAssistantMessage,
  SDKSystemMessage,
  SDKResultMessage,
  PermissionMode as SDKPermissionMode,
} from "@anthropic-ai/claude-agent-sdk";
```

**File**: `/lib/claude-webui-server/handlers/chat.ts` (line 2)

**Before**:
```typescript
import { query, type PermissionMode } from "@anthropic-ai/claude-code";
```

**After**:
```typescript
import { query, type PermissionMode } from "@anthropic-ai/claude-agent-sdk";
```

## 📝 Example 3: Package.json Updates

**File**: `/package.json` (line 23)

**Before**:
```json
"dependencies": {
  "@anthropic-ai/claude-code": "1.0.108",
  // ... other deps
}
```

**After**:
```json
"dependencies": {
  "@anthropic-ai/claude-agent-sdk": "^0.1.42",
  // ... other deps
}
```

## 📝 Example 4: CLAUDE.md Project Context

**File**: `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/CLAUDE.md`

```markdown
# My Jarvis Desktop - Project Context

## 🏗️ Architecture Overview

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Context + Custom Hooks
- **Deployment**: Static build + Docker

### Backend
- **Framework**: Hono (Node.js)
- **AI SDK**: Claude Agent SDK (latest)
- **Deployment**: Fly.io

## 📋 Development Conventions

### Voice Communication
- **MANDATORY**: All interactions must use voice communication
- **Pattern**: Start + End voice messages only
- **Tool**: `/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh`

### Concurrency Requirements
- **CRITICAL**: All operations must be concurrent/parallel in single message
- **Pattern**: Batch all related operations together
- **Tools**: TodoWrite, file operations, bash commands

### File Organization
- **Source**: `/src` - Source code
- **Tests**: `/tests` - Test files
- **Docs**: `/docs` - Documentation
- **Config**: `/config` - Configuration
- **Scripts**: `/scripts` - Utility scripts

## ⚡ Build Commands

```bash
# Development
npm run dev              # Start development server
npm run start:backend    # Start backend only

# Quality Assurance
npm run lint            # ESLint checking
npm run typecheck       # TypeScript validation
npm run format          # Prettier formatting

# Production
npm run build           # Build for production
npm run preview         # Preview production build
```

## 🧪 Testing Strategy

```bash
# Backend Testing
cd lib/claude-webui-server
npm run test           # Run backend tests
npm run typecheck      # TypeScript validation

# Integration Testing
npm run test:production    # Full production test
npm run verify:safe-push   # Pre-push validation
```

## 🚀 Deployment

### Development Instances
- **Erez**: my-jarvis-erez (testing/staging)
- **Tamar**: my-jarvis-tamar (production)

### Deployment Commands
```bash
./deploy-to-app.sh my-jarvis-erez    # Deploy to testing
./deploy-to-app.sh my-jarvis-tamar   # Deploy to production
```

## 🔒 Security Guidelines

### Permission Modes
- **default**: Standard with confirmations
- **acceptEdits**: Auto-accept file changes
- **bypassPermissions**: Auto-accept all (use sparingly)

### Tool Access
- **Principle**: Least-privilege access
- **Standard Tools**: Read, Write, Edit, Bash, Grep, Glob, WebFetch
- **Restricted**: System commands, network access

## 📊 Performance Standards

### Response Time Targets
- **Chat Response**: < 2 seconds first token
- **Tool Execution**: < 10 seconds typical
- **File Operations**: < 1 second for standard files

### Resource Usage
- **Memory**: < 500MB typical usage
- **CPU**: Efficient streaming processing
- **Network**: Optimized for Claude API calls
```

---

## ✅ MIGRATION COMPLETION CHECKLIST

### Final Validation
- [ ] **All phases completed successfully**
- [ ] **No `clear_thinking_20251015` errors in logs**
- [ ] **Both Erez and Tamar instances operational**
- [ ] **Chat functionality fully restored**
- [ ] **Tool operations working correctly**
- [ ] **Session continuity maintained**
- [ ] **Performance meets or exceeds previous baseline**

### Documentation Updates
- [ ] **Update README.md if needed**
- [ ] **Update deployment documentation**
- [ ] **Archive old migration documents**
- [ ] **Create post-migration summary**

### Team Communication
- [ ] **Notify of successful migration**
- [ ] **Document any lessons learned**
- [ ] **Share performance improvements**
- [ ] **Plan future enhancement opportunities**

---

## 🎯 SUCCESS METRICS

1. **✅ Error Resolution**: Zero `clear_thinking_20251015` errors
2. **✅ Functionality Parity**: All previous features working
3. **✅ Performance**: Equal or better response times
4. **✅ Stability**: 24+ hours without issues
5. **✅ Standards Compliance**: Full 2025 best practices implemented

**Expected Timeline**: 4-6 hours for complete migration
**Risk Mitigation**: Comprehensive backup and rollback procedures
**Success Indicator**: Both instances operational with enhanced capabilities