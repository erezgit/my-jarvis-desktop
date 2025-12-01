# Context Progress Bar Implementation - Claude Code SDK Integration

## 🎯 Objective
Implement a context/token usage progress bar component in My Jarvis Desktop, directly inspired by the existing TokenContextBar component from the My Jarvis frontend, but adapted to work with the Claude Code SDK streaming architecture.

## 📋 Analysis Summary

### ✅ Completed Research
1. **My Jarvis Frontend Analysis**: Found the exact `TokenContextBar` component that displays token usage
2. **Token Data Structure**: Identified the `ContextData` interface with `tokens_used`, `max_tokens`, and `percentage`
3. **Claude Code SDK Capabilities**: Confirmed that Claude Code SDK provides message-level token usage reporting
4. **Integration Architecture**: Designed approach using UnifiedMessageProcessor pattern

## 🎯 Source Component Analysis

### TokenContextBar Component (My Jarvis Frontend)
**File**: `/spaces/my-jarvis/projects/my-jarvis-frontend/src/components/token-context-bar.tsx`

**Key Features**:
- ✅ Animated progress bar with color gradient based on usage percentage
- ✅ Expandable details showing exact token counts
- ✅ Responsive design with hover effects
- ✅ Smart color system: Blue (0-25%) → Violet (25-75%) → Amber/Red (75-100%)
- ✅ Token formatting (1K, 1.5M format)
- ✅ Click to expand/collapse detailed view

**Data Structure**:
```typescript
interface ContextData {
  tokens_used: number;
  max_tokens: number;
  percentage: number;
}
```

## 🏗️ Integration Architecture

### Current My Jarvis Desktop Architecture
- ✅ **claude-code-webui Foundation**: React 19 + TypeScript + TailwindCSS
- ✅ **UnifiedMessageProcessor**: Central message transformation pipeline
- ✅ **Streaming NDJSON**: Real-time message processing from Claude Code SDK
- ✅ **shadcn/ui Components**: Professional UI component library

### Token Data Source Strategy - CONFIRMED ✅

#### **Result Message Detection (Implemented Approach)**
**Data Source**: Claude Code SDK `SDKResultMessage` (type: "result")
- ✅ **Token data comes from result messages** at the end of each assistant response
- ✅ **Message structure**: Contains `usage` object with `input_tokens` and `output_tokens`
- ✅ **Additional data**: `duration_ms`, `total_cost_usd` also available
- ✅ **Already displayed**: Currently shown in MessageComponents.tsx:102-108

**Architecture Pattern**:
```typescript
// SDKResultMessage structure (from @anthropic-ai/claude-code)
{
  type: "result",
  usage: {
    input_tokens: number,
    output_tokens: number
  },
  duration_ms: number,
  total_cost_usd: number
}
```

**Implementation Strategy**:
1. **Message Detection**: Intercept result messages in `processResultMessage()` (UnifiedMessageProcessor.ts:490)
2. **Data Extraction**: Extract `usage.input_tokens + usage.output_tokens` for total
3. **State Management**: Create `TokenUsageContext` provider with cumulative tracking
4. **Context Update**: Add `onTokenUpdate` callback to `ProcessingContext` interface
5. **Component Integration**: TokenContextBar subscribes to TokenUsageContext

**Key Differences from Voice/File Operations**:
- ✅ **Does NOT replace result message** (unlike voice which returns early)
- ✅ **Adds side-effect callback** to update global token state
- ✅ **Result message still displayed** for user transparency
- ✅ **Cumulative tracking** across conversation (not just per-message)

## 📊 Implementation Plan

### Phase 1: Core Infrastructure (2-3 hours)
**1.1 Token Usage State Management**
- [ ] Create `TokenUsageContext.tsx` in `app/contexts/`
- [ ] Create `useTokenUsage.ts` hook in `app/hooks/`
- [ ] Define `TokenUsageData` interface in `app/types.ts`
- [ ] Provider holds: `tokens_used`, `max_tokens`, `percentage`
- [ ] Cumulative tracking across conversation session

**1.2 ProcessingContext Extension**
- [ ] Add `onTokenUpdate?: (usage: TokenUsageData) => void` to `ProcessingContext` interface
- [ ] Update ChatPage.tsx to provide `onTokenUpdate` callback in `streamingContext`
- [ ] Connect callback to TokenUsageContext state updater

**1.3 UnifiedMessageProcessor Extension**
- [ ] Modify `processResultMessage()` at line 490-502
- [ ] Extract `usage.input_tokens + usage.output_tokens` from result message
- [ ] Call `context.onTokenUpdate?.()` with cumulative token data
- [ ] **Do NOT return early** - let result message display normally

**1.4 Component Port**
- [ ] Copy TokenContextBar.tsx from `/spaces/my-jarvis/projects/my-jarvis-frontend/src/components/`
- [ ] Replace `useJarvis()` with `useTokenUsage()` hook
- [ ] Update import paths for My Jarvis Desktop
- [ ] **Keep all visual code intact**: gradients, animations, expand/collapse
- [ ] Ensure compatibility with existing TailwindCSS classes

### Phase 2: Integration & Testing (1-2 hours)
**2.1 UI Integration**
- [ ] Add TokenContextBar to ChatPage.tsx at line ~524 (above `<ChatMessages />`)
- [ ] Wrap ChatPage with TokenUsageProvider in App.tsx or ChatStateProvider
- [ ] Position: Below header icons, above chat messages container
- [ ] Implement responsive positioning and sizing
- [ ] Test with various screen sizes and theme modes

**2.2 Real-time Updates**
- [ ] Connect component to streaming token data
- [ ] Implement smooth progress bar animations
- [ ] Test with actual Claude Code SDK conversations

**2.3 Error Handling**
- [ ] Handle missing or malformed token data
- [ ] Graceful fallbacks when token info unavailable
- [ ] Default values and loading states

### Phase 3: Enhancement & Polish (1 hour)
**3.1 Advanced Features**
- [ ] Session window awareness (5-hour rolling limit)
- [ ] Token cost estimation (if available from SDK)
- [ ] Usage analytics and trends

**3.2 User Experience**
- [ ] Hover tooltips with detailed information
- [ ] Keyboard accessibility
- [ ] Performance optimization for frequent updates

## 🎨 Visual Design

### Placement Strategy - CONFIRMED ✅
**Location**: Inside ChatPage.tsx, above `<ChatMessages />` component (line ~524)
- Below header icons (HistoryButton, SettingsButton)
- Above chat messages container
- Inside the chat interface panel (no changes to DesktopLayout.tsx needed)
- Consistent with typical progress indicator patterns
- Non-intrusive but easily visible
- Maintains clean chat interface aesthetic

### Color System (Matching My Jarvis Frontend)
```typescript
const getGradientStyle = (percentage: number) => {
  if (percentage < 25) return 'from-blue-100 to-blue-200'      // Safe usage
  else if (percentage < 50) return 'from-blue-200 to-violet-200' // Moderate
  else if (percentage < 75) return 'from-violet-200 to-violet-300' // Higher
  else if (percentage < 90) return 'from-violet-300 to-amber-200'  // Warning
  else return 'from-amber-300 to-red-300'                     // Critical
}
```

### Responsive Design
- **Mobile**: Simplified view, minimal space usage
- **Desktop**: Full feature set with expandable details
- **Theme Support**: Full light/dark mode compatibility

## 🛠️ Technical Implementation Details

### TokenUsageContext Implementation
```typescript
// app/contexts/TokenUsageContext.tsx
interface TokenUsageData {
  tokens_used: number;
  max_tokens: number;
  percentage: number;
}

interface TokenUsageContextType {
  tokenData: TokenUsageData;
  updateTokenUsage: (usage: Partial<TokenUsageData>) => void;
  resetTokenUsage: () => void;
}

export const TokenUsageProvider = ({ children }: { children: ReactNode }) => {
  const [tokenData, setTokenData] = useState<TokenUsageData>({
    tokens_used: 0,
    max_tokens: 200000, // Claude Code SDK default
    percentage: 0
  });

  const updateTokenUsage = useCallback((newTokens: number) => {
    setTokenData(prev => {
      const tokens_used = prev.tokens_used + newTokens;
      const percentage = (tokens_used / prev.max_tokens) * 100;
      return { ...prev, tokens_used, percentage };
    });
  }, []);

  const resetTokenUsage = useCallback(() => {
    setTokenData({ tokens_used: 0, max_tokens: 200000, percentage: 0 });
  }, []);

  return (
    <TokenUsageContext.Provider value={{ tokenData, updateTokenUsage, resetTokenUsage }}>
      {children}
    </TokenUsageContext.Provider>
  );
};
```

### ProcessingContext Extension
```typescript
// app/utils/UnifiedMessageProcessor.ts - Update ProcessingContext interface
export interface ProcessingContext {
  // ... existing fields ...

  // Token usage tracking (NEW)
  onTokenUpdate?: (newTokens: number) => void;
}
```

### UnifiedMessageProcessor Extension
```typescript
// app/utils/UnifiedMessageProcessor.ts - Modify processResultMessage()
private processResultMessage(
  message: Extract<SDKMessage | TimestampedSDKMessage, { type: "result" }>,
  context: ProcessingContext,
  options: ProcessingOptions,
): void {
  const timestamp = options.timestamp || Date.now();
  const resultMessage = convertResultMessage(message, timestamp);
  context.addMessage(resultMessage);

  // NEW: Extract and update token usage
  if (message.usage && context.onTokenUpdate) {
    const totalTokens = message.usage.input_tokens + message.usage.output_tokens;
    context.onTokenUpdate(totalTokens);
  }

  // Clear current assistant message (streaming only)
  if (options.isStreaming) {
    context.setCurrentAssistantMessage?.(null);
  }
}
```

### Component Integration - EXACT LOCATION ✅
```typescript
// app/components/ChatPage.tsx - Line ~522 (after history/settings error views)
// BEFORE: <ChatMessages messages={messages} isLoading={isLoading} />

// Add TokenContextBar import
import { TokenContextBar } from './TokenContextBar';
import { useTokenUsage } from '../hooks/useTokenUsage';

// Inside ChatPage function, add to streamingContext:
const { updateTokenUsage } = useTokenUsage();

const streamingContext: StreamingContext = {
  // ... existing fields ...
  onTokenUpdate: updateTokenUsage, // NEW: Connect token updates
};

// Inside JSX return, at line ~523:
) : (
  <>
    {/* NEW: Token Progress Bar - placed above messages */}
    <TokenContextBar />

    {/* Chat Messages */}
    <ChatMessages messages={messages} isLoading={isLoading} />

    {/* Input */}
    <ChatInput
```

### TokenContextBar Component Adaptation
```typescript
// app/components/TokenContextBar.tsx
// CHANGES from My Jarvis Frontend version:
// 1. Remove: import { useJarvis } from '@/lib/providers/jarvis-provider'
// 2. Add: import { useTokenUsage } from '../hooks/useTokenUsage'
// 3. Replace: const { state } = useJarvis()
// 4. With: const { tokenData } = useTokenUsage()
// 5. Replace: const context = state?.context || { ... }
// 6. With: const context = tokenData || { ... }
// 7. KEEP EVERYTHING ELSE IDENTICAL - all styling, animations, logic
```

## 📁 File Structure

### New Files
```
app/
├── components/
│   └── TokenContextBar.tsx          # Main component (copied from My Jarvis Frontend)
│                                    # Location: app/components/TokenContextBar.tsx
├── hooks/
│   └── useTokenUsage.ts             # Hook to access TokenUsageContext
│                                    # Location: app/hooks/useTokenUsage.ts
└── contexts/
    └── TokenUsageContext.tsx        # Token usage context provider
                                     # Location: app/contexts/TokenUsageContext.tsx
```

### Modified Files
```
app/
├── components/
│   └── ChatPage.tsx                 # Line ~523: Add <TokenContextBar />
│                                    # Line ~192: Add onTokenUpdate to streamingContext
├── utils/
│   └── UnifiedMessageProcessor.ts   # Line ~32: Add onTokenUpdate to ProcessingContext
│                                    # Line ~490: Modify processResultMessage() to extract tokens
└── types.ts                         # Add TokenUsageData interface (if not in context file)
```

## 🎯 Success Criteria

### Functional Requirements
- ✅ **Real-time Updates**: Progress bar updates as conversation progresses
- ✅ **Accurate Display**: Token counts match Claude Code SDK reporting
- ✅ **Visual Feedback**: Color coding indicates usage level appropriately
- ✅ **Responsive Design**: Works across all device sizes

### Technical Requirements
- ✅ **Performance**: No impact on chat streaming performance
- ✅ **Reliability**: Graceful handling of missing token data
- ✅ **Accessibility**: Keyboard navigation and screen reader support
- ✅ **Theme Support**: Full light/dark mode compatibility

### User Experience Requirements
- ✅ **Non-intrusive**: Doesn't interfere with chat experience
- ✅ **Informative**: Users understand their usage at a glance
- ✅ **Professional**: Matches overall My Jarvis Desktop aesthetic

## 🚀 Deployment Strategy

### Development Testing
1. **Local Testing**: Test with actual Claude Code SDK conversations
2. **Edge Cases**: Test with various token usage levels and scenarios
3. **Performance Testing**: Ensure no impact on streaming performance

### Integration Testing
1. **Component Integration**: Verify seamless integration with existing UI
2. **State Management**: Test token usage state across conversation sessions
3. **Error Handling**: Test graceful degradation scenarios

### User Acceptance
1. **Visual Polish**: Ensure component matches My Jarvis Desktop design language
2. **Usability Testing**: Validate that users find the information useful
3. **Performance Validation**: Confirm no negative impact on app performance

## 📈 Future Enhancements

### Phase 2 Features (Future Tickets)
- **Usage Analytics**: Historical usage tracking and trends
- **Cost Estimation**: Real-time cost calculation based on current pricing
- **Session Management**: Visual indication of session windows and limits
- **Export Functionality**: Export usage data for billing/analysis

### Advanced Integration
- **Settings Integration**: Allow users to set custom usage alerts
- **Notification System**: Warn users approaching limits
- **Multi-Session Support**: Track usage across multiple concurrent sessions

## 📚 References

### Source Components
- **My Jarvis TokenContextBar**: `/spaces/my-jarvis/projects/my-jarvis-frontend/src/components/token-context-bar.tsx`
- **My Jarvis ContextData**: `/spaces/my-jarvis/projects/my-jarvis-frontend/src/lib/agent-state.ts:46-51`

### Claude Code SDK Documentation
- **Cost Tracking**: https://docs.claude.com/en/docs/claude-code/sdk/sdk-cost-tracking
- **Usage Monitor**: https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor
- **API Integration**: https://apidog.com/blog/a-comprehensive-guide-to-the-claude-code-sdk/

### Architecture References
- **UnifiedMessageProcessor**: `app/utils/UnifiedMessageProcessor.ts:1-400`
- **claude-code-webui Foundation**: `app/components/ChatPage.tsx:1-200`
- **shadcn/ui Components**: `app/components/ui/`

---

## ⏱️ Estimated Timeline: 4-6 hours
- **Phase 1 (Infrastructure)**: 2-3 hours
- **Phase 2 (Integration)**: 1-2 hours
- **Phase 3 (Polish)**: 1 hour

## 🎯 Priority: High
**Justification**: Context awareness is crucial for user experience and cost management in AI applications. This feature directly enhances user confidence and usage transparency.

---

*Created: 2025-09-28*
*Status: Ready for Implementation*
*Assigned: Available for immediate start*