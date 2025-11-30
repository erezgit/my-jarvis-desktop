# Token Flow Architecture Diagram

## Current Broken Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Backend     │    │  useStreamParser │    │    ChatPage     │
│   chat.ts       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ token_update           │                       │
         │ messages               │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│   Stream Data   │              │                       │
│ {"type":        │              │                       │
│  "token_update",│              │                       │
│  "usage": {...}}│              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │                       ▼                       │
         └────────────► ┌─────────────────┐              │
                        │ parseStreamLine │              │
                        │                 │              │
                        └─────────────────┘              │
                                 │                       │
                                 │ setTokenUsage()       │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │ TokenUsage      │              │
                        │ Context         │◄─────────────┤
                        │                 │              │
                        └─────────────────┘              │
                                 │                       │
                                 │ triggers dependency   │
                                 │ array change          │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │   sendMessage   │◄─────────────┤
                        │   useCallback   │              │
                        │                 │              │
                        │ deps: [         │              │
                        │   ...           │              │
                        │   setTokenUsage │              │
                        │   ...           │              │
                        │ ]               │              │
                        └─────────────────┘              │
                                 │                       │
                                 │ RECREATION            │
                                 │ EVERY TOKEN UPDATE    │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │ handleFileUpload│◄─────────────┘
                        │   useCallback   │
                        │                 │
                        │ deps: [         │
                        │   sendMessage   │  ◄── BREAKS HERE
                        │   ...           │      10+ SECOND DELAY
                        │ ]               │
                        └─────────────────┘
```

## Proposed Fixed Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Backend     │    │  useStreamParser │    │    ChatPage     │
│   chat.ts       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ token_update           │                       │
         │ messages               │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│   Stream Data   │              │                       │
│ {"type":        │              │                       │
│  "token_update",│              │                       │
│  "usage": {...}}│              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │                       ▼                       │
         └────────────► ┌─────────────────┐              │
                        │ parseStreamLine │              │
                        │                 │              │
                        └─────────────────┘              │
                                 │                       │
                                 │ DIRECT UPDATE         │
                                 │ (bypass chat state)   │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │ TokenContextBar │              │
                        │ Direct Update   │              │
                        │                 │              │
                        └─────────────────┘              │
                                                         │
                                                         │
                        ┌─────────────────┐              │
                        │   sendMessage   │◄─────────────┤
                        │   useCallback   │              │
                        │                 │              │
                        │ deps: [         │              │
                        │   input         │              │
                        │   allowedTools  │              │
                        │   addMessage    │              │
                        │   ...           │              │
                        │ ]               │ ◄── NO setTokenUsage
                        └─────────────────┘     DEPENDENCY
                                 │                       │
                                 │ STABLE REFERENCE      │
                                 │ NO RECREATION         │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │ handleFileUpload│◄─────────────┘
                        │   useCallback   │
                        │                 │
                        │ deps: [         │
                        │   sendMessage   │  ◄── INSTANT RESPONSE
                        │   ...           │      NO DELAY
                        │ ]               │
                        └─────────────────┘
```

## Key Changes

1. **Decoupled Token Updates**: Token updates go directly to TokenContextBar without affecting ChatPage state
2. **Stable sendMessage**: Remove setTokenUsage from sendMessage dependencies
3. **Instant File Upload**: handleFileUpload no longer recreated on token changes
4. **Preserved Functionality**: File upload still triggers Claude analysis via sendMessage

## Implementation Strategy

1. Create isolated token update handler in useStreamParser
2. Remove setTokenUsage dependency from sendMessage useCallback
3. Update TokenContextBar to receive direct token updates
4. Test file upload performance (should be instant)
5. Verify token display still works correctly