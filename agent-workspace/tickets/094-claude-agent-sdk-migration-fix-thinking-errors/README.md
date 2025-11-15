# 🚨 CRITICAL: Claude Code SDK to Claude Agent SDK Migration - Ticket #094

## 📋 Issue Summary

**Problem**: Tamar's Jarvis instance experiences `clear_thinking_20251015` API errors causing Claude Code process crashes with exit code 1, while Erez's instance works due to legacy API session grandfathering.

**Root Cause**: Anthropic released breaking API changes in November 2025 requiring migration from deprecated `@anthropic-ai/claude-code` (v1.0.108) to the new `@anthropic-ai/claude-agent-sdk` with explicit thinking parameter configuration.

**Impact**:
- ❌ New deployments fail with "strategy requires thinking to be enabled" errors
- ⚠️ Existing deployments work temporarily due to API grandfathering (unreliable)
- 🔥 Production stability risk for all future deployments

## 🎯 Migration Objective

Migrate from deprecated Claude Code SDK to official Claude Agent SDK to:
1. Fix `clear_thinking_20251015` API errors
2. Ensure consistent behavior across all deployments
3. Future-proof against further API changes
4. Use officially supported SDK with enhanced features

## 📊 Impact Analysis

### Files Requiring Changes (19+ total):

**Package Dependencies (2 files):**
- `/package.json:23` - Main project dependency
- `/lib/claude-webui-server/package.json:57,83` - Backend dependency + peerDependency

**Source Code (3 files):**
- `/lib/claude-webui-server/handlers/chat.ts:2` - Main integration: `query, PermissionMode`
- `/lib/claude-webui-server/history/parser.ts:6-9` - Type imports: `SDKAssistantMessage, SDKUserMessage`
- `/lib/claude-webui-server/handlers/chat.test.ts:5,13` - Test mocks and imports

**Configuration Files (3 files):**
- `/lib/claude-webui-server/deno.json:27` - Deno import map
- `/lib/claude-webui-server/scripts/build-bundle.js:21` - Build external deps
- `/lib/claude-webui-server/package-lock.json` - Dependency locks (auto-generated)

**🚨 CRITICAL CORRECTION: MAJOR FRONTEND IMPACT DISCOVERED**

### Frontend Dependencies Found (12+ files):
1. `/app/types.ts` - **DIRECT imports and re-exports from Claude Code SDK**
2. `/app/utils/mockResponseGenerator.ts` - **DIRECT import from Claude Code SDK**
3. `/app/hooks/streaming/useStreamParser.ts` - Uses `SDKMessage` types
4. `/app/utils/UnifiedMessageProcessor.ts` - Uses `SDKMessage`, `TimestampedSDKMessage`
5. `/app/utils/messageConversion.ts` - Uses `SDKMessage`, `TimestampedSDKMessage`
6. `/app/hooks/useMessageConverter.ts` - Uses multiple SDK types
7. `/app/utils/messageTypes.ts` - Uses `SDKMessage` type guards
8. `/app/hooks/useHistoryLoader.ts` - Uses `TimestampedSDKMessage`
9. Multiple test files using SDK types for mocking

**The entire frontend streaming, message processing, and history system depends on Claude Code SDK types!**

## 🔧 Technical Migration Plan

### Phase 1: Package Migration

1. **Update Root Package Dependencies (FRONTEND + BACKEND):**
   ```bash
   cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop
   npm uninstall @anthropic-ai/claude-code
   npm install @anthropic-ai/claude-agent-sdk@latest
   ```

2. **Update Backend Package Dependencies:**
   ```bash
   cd lib/claude-webui-server
   npm uninstall @anthropic-ai/claude-code
   npm install @anthropic-ai/claude-agent-sdk@latest
   ```

3. **Update package.json Files:**

   **File: `/package.json`**
   ```diff
   - "@anthropic-ai/claude-code": "1.0.108",
   + "@anthropic-ai/claude-agent-sdk": "^0.1.0",
   ```

   **File: `/lib/claude-webui-server/package.json`**
   ```diff
     "dependencies": {
   -   "@anthropic-ai/claude-code": "1.0.108",
   +   "@anthropic-ai/claude-agent-sdk": "^0.1.0",
       // ... other deps
     },
     "peerDependencies": {
   -   "@anthropic-ai/claude-code": "1.0.108"
   +   "@anthropic-ai/claude-agent-sdk": "^0.1.0"
     }
   ```

### Phase 2: Frontend Type Migration (CRITICAL)

4. **Update Frontend Direct Imports:**

   **File: `/app/types.ts` (lines 1-7):**
   ```diff
   import type {
   -  SDKUserMessage,
   -  SDKAssistantMessage,
   -  SDKSystemMessage,
   -  SDKResultMessage,
   -  PermissionMode as SDKPermissionMode,
   - } from "@anthropic-ai/claude-code";
   +  SDKUserMessage,
   +  SDKAssistantMessage,
   +  SDKSystemMessage,
   +  SDKResultMessage,
   +  PermissionMode as SDKPermissionMode,
   + } from "@anthropic-ai/claude-agent-sdk";
   ```

   **File: `/app/types.ts` (lines 272-280):**
   ```diff
   // Re-export SDK types
   export type {
     SDKMessage,
     SDKSystemMessage,
     SDKResultMessage,
     SDKAssistantMessage,
     SDKUserMessage,
   - } from "@anthropic-ai/claude-code";
   + } from "@anthropic-ai/claude-agent-sdk";
   ```

   **File: `/app/utils/mockResponseGenerator.ts` (line 1):**
   ```diff
   - import type { SDKMessage } from "@anthropic-ai/claude-code";
   + import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
   ```

### Phase 3: Backend Source Code Migration

4. **Update Chat Handler Imports and Logic:**

   **File: `/lib/claude-webui-server/handlers/chat.ts`**
   ```diff
   - import { query, type PermissionMode } from "@anthropic-ai/claude-code";
   + import { query, type PermissionMode } from "@anthropic-ai/claude-agent-sdk";
   ```

   **Update query options (lines 42-53):**
   ```diff
     const queryOptions = {
       abortController,
       executable: "node" as const,
       executableArgs: [],
       pathToClaudeCodeExecutable: cliPath,
       cwd: workingDirectory,
       additionalDirectories: workingDirectory ? [workingDirectory] : [],
   +   // Add thinking configuration for clear_thinking_20251015 strategy
   +   thinking: {
   +     type: "enabled" as const,
   +     budget_tokens: 10000
   +   },
       ...(sessionId ? { resume: sessionId } : {}),
       ...(allowedTools ? { allowedTools } : {}),
       ...(permissionMode ? { permissionMode } : {}),
     };
   ```

5. **Update History Parser Types:**

   **File: `/lib/claude-webui-server/history/parser.ts`**
   ```diff
   import type {
     SDKAssistantMessage,
     SDKUserMessage,
   - } from "@anthropic-ai/claude-code";
   + } from "@anthropic-ai/claude-agent-sdk";
   ```

6. **Update Test Mocks:**

   **File: `/lib/claude-webui-server/handlers/chat.test.ts`**
   ```diff
   - import { query } from "@anthropic-ai/claude-code";
   + import { query } from "@anthropic-ai/claude-agent-sdk";

   vi.mock(
   - "@anthropic-ai/claude-code",
   + "@anthropic-ai/claude-agent-sdk",
     (): MockClaudeCode => ({
       query: vi.fn(),
     }),
   );
   ```

### Phase 3: Configuration Updates

7. **Update Deno Configuration:**

   **File: `/lib/claude-webui-server/deno.json`**
   ```diff
   "imports": {
   - "@anthropic-ai/claude-code": "npm:@anthropic-ai/claude-code@1.0.108",
   + "@anthropic-ai/claude-agent-sdk": "npm:@anthropic-ai/claude-agent-sdk@^0.1.0",
   }
   ```

8. **Update Build Configuration:**

   **File: `/lib/claude-webui-server/scripts/build-bundle.js`**
   ```diff
   external: [
   - "@anthropic-ai/claude-code",
   + "@anthropic-ai/claude-agent-sdk",
   ]
   ```

## ⚠️ Breaking Changes & Compatibility

### API Changes:
1. **Thinking Parameter**: Now required for `clear_thinking_20251015` strategy
2. **System Prompt**: SDK no longer uses Claude Code's system prompt by default
3. **Package Name**: Complete rebrand from `claude-code` to `claude-agent-sdk`
4. **Zod Compatibility**: Agent SDK requires Zod 3.x (we use 4.x - potential peer dep warning)

### Behavior Changes:
1. **Default Settings**: SDK no longer reads filesystem settings by default
2. **Error Handling**: Updated error types and structure
3. **Session Management**: Enhanced context management features

## 🧪 Testing Strategy

### Pre-Migration Testing:
1. **Backup Current State:**
   ```bash
   git branch backup-before-claude-agent-sdk-migration
   git checkout -b claude-agent-sdk-migration
   ```

2. **Document Current Behavior:**
   - Test Erez instance functionality
   - Screenshot working chat interface
   - Export test conversation logs

### Post-Migration Testing:
1. **Local Development Testing:**
   ```bash
   cd lib/claude-webui-server
   npm run test         # Run all tests
   npm run typecheck    # Verify TypeScript
   npm run build        # Verify build
   npm run start        # Test local server
   ```

2. **Integration Testing:**
   - Test chat functionality with various permission modes
   - Verify conversation history loading
   - Test abort functionality
   - Validate error handling

3. **Deployment Testing:**
   ```bash
   # Test on Erez first (as specified)
   ./deploy-to-app.sh my-jarvis-erez

   # Monitor logs for any issues
   fly logs -a my-jarvis-erez

   # Only deploy to Tamar after Erez validation
   ./deploy-to-app.sh my-jarvis-tamar
   ```

## 🚀 Deployment Strategy

### Phase 1: Erez Testing (Safe)
1. Deploy migration to my-jarvis-erez
2. Test all functionality thoroughly
3. Monitor for 24 hours minimum
4. Document any issues found

### Phase 2: Tamar Production (After validation)
1. Only proceed if Erez testing successful
2. Deploy to my-jarvis-tamar
3. Verify thinking errors are resolved
4. Monitor both instances for stability

### Rollback Plan:
```bash
# If issues arise, immediate rollback
git checkout main
./deploy-to-app.sh my-jarvis-erez  # or my-jarvis-tamar
```

## 🔍 Monitoring & Validation

### Success Metrics:
- ✅ No more `clear_thinking_20251015` errors in Tamar logs
- ✅ Chat functionality works on both instances
- ✅ Conversation history loads correctly
- ✅ All permission modes function properly
- ✅ Tests pass completely

### Key Logs to Monitor:
```bash
# Check for Claude Agent SDK initialization
fly logs -a my-jarvis-tamar | grep "Claude.*SDK\|Agent.*SDK"

# Monitor for thinking-related errors
fly logs -a my-jarvis-tamar | grep "thinking\|clear_thinking"

# General error monitoring
fly logs -a my-jarvis-tamar | grep "ERROR\|Failed\|exit.*code"
```

## 📚 References

- [Claude Agent SDK Official Docs](https://docs.claude.com/en/docs/agent-sdk/overview)
- [Migration Guide](https://docs.claude.com/en/docs/claude-code/sdk/migration-guide)
- [Claude Agent SDK TypeScript Reference](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Thinking Parameter Configuration](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)

## ⚡ Execution Checklist

- [ ] **Phase 1**: Update package dependencies
- [ ] **Phase 2**: Update source code imports and logic
- [ ] **Phase 3**: Update configuration files
- [ ] **Phase 4**: Run comprehensive test suite
- [ ] **Phase 5**: Deploy to Erez for testing
- [ ] **Phase 6**: Monitor Erez for 24+ hours
- [ ] **Phase 7**: Deploy to Tamar after validation
- [ ] **Phase 8**: Verify thinking errors resolved
- [ ] **Phase 9**: Monitor both instances for stability

## 🎯 Expected Outcome

After successful migration:
- ✅ Both Erez and Tamar instances use Claude Agent SDK
- ✅ Thinking parameter properly configured
- ✅ No more `clear_thinking_20251015` API errors
- ✅ Consistent behavior across all deployments
- ✅ Future-proof against API changes
- ✅ Enhanced Agent SDK features available