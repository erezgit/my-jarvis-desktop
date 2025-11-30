# File Upload 10-Second Delay - Failed Attempts

## Problem Statement
File upload button in production (Fly.io deployment) has a 10-second delay before the file dialog opens.

## Failed Attempt 1: Dynamic Input Creation
**Hypothesis**: Browser security delays on reused hidden file inputs
**Solution Attempted**: Create fresh input element dynamically on each click
**Result**: ❌ FAILED - Still 10-second delay

### What We Tried:
1. Created `FileUploadButtonAlternative.tsx` that:
   - Creates new `<input type="file">` element on each click
   - Adds it to DOM temporarily
   - Clicks it programmatically
   - Removes it after file selection

2. Observations during testing:
   - Original button (reused input): 10-second delay
   - Alternative button (dynamic input): Appeared instant in initial test
   - But production deployment still has 10-second delay

### Logs Collected:
```
[FILE_UPLOAD_BUTTON] Button clicked, triggering file input
[FILE_UPLOAD_BUTTON] Input element state: {disabled: false, type: 'file', accept: '', multiple: false, hasEventListeners: false}
[FILE_UPLOAD_BUTTON] Event is trusted: false  // <-- Important: Event not trusted
[FILE_UPLOAD_BUTTON] File input triggered in 1ms
[FILE_UPLOAD_BUTTON] 100ms after click - dialog should be visible
[FILE_UPLOAD_BUTTON] 1 second after click - checking if stuck
// Then 10-second delay before dialog actually appears
```

## Failed Attempt 2: Token Tracking Removal
**Hypothesis**: React re-render loops causing delays
**Solution Attempted**: Removed all token tracking logic from frontend
**Result**: ❌ FAILED - Still 10-second delay

### What We Tried:
1. Removed token_update handling from useStreamParser
2. Made TokenContextBar show static zeros
3. Removed DirectTokenContext completely
4. Used useRef to stabilize sendMessage reference
5. Reduced handleFileUpload dependencies from 3 to 2

**Result**: No improvement in file upload delay

## Important Observations

### 1. Event Trust Issue
The click event shows `isTrusted: false` which might be significant. Browsers treat untrusted events differently.

### 2. Environment-Specific
- Works fine in development (local)
- Only happens in production (Fly.io)
- Suggests it's not purely a React/JavaScript issue

### 3. Timing Pattern
- JavaScript executes instantly (1-2ms)
- Delay happens AFTER our code completes
- Suggests browser/OS level issue

### 4. WebSocket Error
There's a WebSocket connection error to `ws://localhost:8081/` (Vite dev server) appearing in production, which shouldn't be there.

## New Hypothesis: Untrusted Events

The key observation is `isTrusted: false` on the click event. Browsers treat untrusted (programmatic) events differently than user-initiated events. For file inputs, this is a critical security boundary.

### Attempted Solution 3: Label Wrapping
Using a `<label>` element to wrap the button, which triggers the file input naturally when clicked, creating a trusted event chain.

## Next Investigation Areas

1. **Content Security Policy (CSP)**
   - Check if Fly.io or our production setup has CSP headers blocking file inputs
   - Look for security headers that might delay file operations

2. **Event Trust / Security Context**
   - The `isTrusted: false` might be key
   - Browser might be adding delay for programmatic clicks on file inputs
   - Need to investigate if this is browser-specific behavior

3. **Production Build Issues**
   - WebSocket connection to localhost suggests dev code in production
   - Check if Vite is building correctly for production
   - Look for development-only code that shouldn't be in production

4. **Browser-Specific Security**
   - File inputs have special security considerations
   - Some browsers delay programmatic access to file system
   - Check if this happens in all browsers or just Chrome/specific versions

5. **Fly.io Platform Specifics**
   - Check if Fly.io proxy adds any delays
   - Look for platform-specific security features
   - Check response headers from Fly.io

## Versions Deployed
- v1.4.49: Removed token tracking
- v1.4.50: Added logging, optimized memoization
- v1.4.51: Added alternative button with dynamic input
- v1.4.52: Used only dynamic input approach

All versions still exhibit the 10-second delay.