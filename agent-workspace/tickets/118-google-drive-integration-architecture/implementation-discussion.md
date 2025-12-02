# Google Drive Integration Implementation Discussion

**Date:** December 2, 2025
**Participants:** Erez & JARVIS
**Status:** Implementation Path Defined

## Quick Index

1. **Multi-User OAuth Model** - Direct user-to-Google connection without central authority
2. **Container-Per-User Architecture** - Integration with existing Docker container setup and MCP servers
3. **Token Storage Strategy** - Supabase database for encrypted, persistent token storage
4. **Authentication Flow** - OAuth flow from button click to Google Drive activation in file tree
5. **File Preview Implementation** - Native Google Docs/Sheets display via iframe with browser auth
6. **MCP Response Trigger Pattern** - Reuse existing response→trigger pattern for preview refresh
7. **Implementation Roadmap** - 3-week phased approach from backend setup to production
8. **Key Technical Insights** - No authority needed, no restart required, browser session auth
9. **Security Considerations** - Token encryption, container isolation, OAuth best practices
10. **Alternative Approaches** - Three options evaluated with pros/cons
11. **Success Metrics** - Performance and security targets
12. **Next Steps** - Immediate action items for implementation
13. **Questions Resolved** - All architectural questions answered

---

## Key Architectural Decisions

### 1. Multi-User OAuth Model
**Question:** Does each user connect directly to Google Drive, or is there a central authority?

**Answer:** Direct user-to-Google connection. No central authority needed.
- Each user authenticates with their own Google account
- OAuth tokens are specific to that user
- Your app's Client ID/Secret only identify the application to Google
- Similar to how Notion, Slack, and other SaaS handle integrations

### 2. Container-Per-User Architecture Integration

**Current Setup:**
- Each user has their own Docker container
- Each container runs Claude Agent SDK
- Already have MCP servers (jarvis-tools for voice)
- Supabase database for user management

**Google Drive MCP Integration:**
1. Add Google Drive MCP to container's `.claude.json` configuration
2. MCP loads on container start but remains dormant without tokens
3. No restart needed when user authenticates

### 3. Token Storage Strategy

**Recommended Approach:** Store tokens in Supabase
```sql
CREATE TABLE google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  expiry_timestamp TIMESTAMP,
  scopes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits:**
- Tokens persist across container restarts
- Centralized, encrypted storage
- Row-level security per user
- Automatic reconnection on container recreation
- Follows existing multi-tenant patterns

### 4. Authentication Flow

**User Experience:**
1. User sees "Connect Google Drive" button in UI
2. Clicks button → OAuth popup appears
3. Authenticates with their Google account
4. Tokens stored in Supabase
5. Backend writes tokens to container's token file
6. MCP server detects tokens and activates
7. Google Drive appears in file tree immediately

**Technical Flow:**
```javascript
// Frontend
const connectGoogleDrive = async () => {
  const authUrl = await backend.getGoogleAuthUrl(userId);
  window.open(authUrl, 'google-auth');
};

// Backend OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  const tokens = await exchangeCodeForTokens(code);

  // Store in Supabase
  await supabase.from('google_drive_tokens').upsert({
    user_id: userId,
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    expiry_timestamp: tokens.expiry_date
  });

  // Write to user's container
  await writeTokensToContainer(userId, tokens);
});
```

### 5. File Preview Implementation

**Requirement:** Show native Google Docs/Sheets in File Preview component with real-time updates

**Solution:** Iframe embedding with existing browser authentication

**Implementation:**
1. File Preview detects Google Drive file type
2. Renders iframe with Google's editor URL:
   - Docs: `https://docs.google.com/document/d/{FILE_ID}/edit`
   - Sheets: `https://docs.google.com/spreadsheets/d/{FILE_ID}/edit`
3. Relies on user's existing Google browser session for authentication
4. No additional authentication needed if user is logged into Google

**Real-time Updates:**
```javascript
// Frontend FilePreview component
const FilePreview = ({ file, claudeResponse }) => {
  const iframeRef = useRef();

  useEffect(() => {
    // Detect Google Drive MCP responses
    if (claudeResponse?.tool === 'google_drive_edit') {
      // Refresh iframe when Claude makes changes
      if (iframeRef.current) {
        iframeRef.current.contentWindow.location.reload();
      }
    }
  }, [claudeResponse]);

  if (file.type === 'google-doc' || file.type === 'google-sheet') {
    return (
      <iframe
        ref={iframeRef}
        src={`https://docs.google.com/${file.type}/d/${file.id}/edit`}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  // Regular file preview for local files
  return <RegularFilePreview file={file} />;
};
```

### 6. MCP Response Trigger Pattern

**Current Pattern (File System):**
- Claude uses Write tool → creates file
- Frontend receives response
- Response triggers file tree refresh

**New Pattern (Google Drive):**
- Claude uses Google Drive MCP → edits document
- Frontend receives response
- Response triggers iframe refresh
- Same architectural pattern, different trigger

**Implementation:**
```javascript
// Response handler
const handleClaudeResponse = (response) => {
  // Existing file system triggers
  if (response.tool === 'write' || response.tool === 'create') {
    refreshFileTree();
  }

  // New Google Drive triggers
  if (response.tool?.startsWith('google_drive_')) {
    const docId = parseDocumentId(response);
    refreshGooglePreview(docId);
  }
};
```

## Implementation Roadmap

### Phase 1: Backend Setup (Week 1)
- [ ] Create Google Cloud project and OAuth credentials
- [ ] Implement OAuth flow in backend
- [ ] Create Supabase table for token storage
- [ ] Add token encryption/decryption utilities

### Phase 2: Container Configuration (Week 1)
- [ ] Update Docker image with Google Drive MCP in `.claude.json`
- [ ] Implement token file watching mechanism
- [ ] Test MCP activation without container restart

### Phase 3: Frontend Integration (Week 2)
- [ ] Add "Connect Google Drive" button
- [ ] Implement OAuth popup flow
- [ ] Update FileTree to show Google Drive folders
- [ ] Modify FilePreview for iframe embedding

### Phase 4: Real-time Sync (Week 2)
- [ ] Implement MCP response detection
- [ ] Add iframe refresh logic
- [ ] Test edit → refresh cycle
- [ ] Optimize refresh timing

### Phase 5: Testing & Polish (Week 3)
- [ ] Test multi-user isolation
- [ ] Verify token refresh mechanism
- [ ] Handle edge cases (expired tokens, revoked access)
- [ ] Performance optimization

## Key Technical Insights

### 1. No Authority Server Needed
- Google OAuth works with app credentials (Client ID/Secret)
- These only identify your app to Google
- Each user grants permissions independently
- Tokens are user-specific, not app-specific

### 2. Container Restart Not Required
- MCP servers can watch for token files
- Dynamic activation when tokens appear
- Maintains session continuity
- Better user experience

### 3. Browser Session Authentication
- Iframes use existing Google cookies
- No need to authenticate the iframe separately
- Simplifies preview implementation
- Native Google editing experience

### 4. Consistent Architecture
- Reuses existing request→response→trigger pattern
- No new architectural patterns needed
- Maintains consistency with file system operations
- Familiar development model

## Security Considerations

### 1. Token Storage
- Encrypt tokens before storing in Supabase
- Use column-level encryption
- Implement row-level security policies
- Regular token rotation

### 2. Container Isolation
- Each container only has access to one user's tokens
- Token files are container-specific
- No cross-container token access
- Process isolation maintained

### 3. OAuth Best Practices
- Use state parameter to prevent CSRF
- Validate redirect URIs
- Implement proper token refresh
- Monitor for suspicious activity

## Alternative Approaches Considered

### Option 1: Pre-configured Dormant MCP
**Pros:** No restart needed
**Cons:** Requires MCP to support token watching

### Option 2: Dynamic MCP Restart
**Pros:** Works with any MCP
**Cons:** 5-second interruption

### Option 3: Backend Proxy (Not Chosen)
**Pros:** Most flexible
**Cons:** More complex, loses MCP benefits

**Decision:** Option 1 selected for seamless user experience

## Success Metrics

- User can connect Google Drive in < 30 seconds
- File preview loads in < 2 seconds
- Updates reflect in preview within 1 second of Claude edit
- Zero cross-user data exposure incidents
- 95% token refresh success rate

## Next Steps

1. Validate Google Drive MCP supports token file watching
2. Design Supabase schema with proper RLS policies
3. Create proof-of-concept with single user
4. Test iframe embedding with private documents
5. Implement full OAuth flow

## Questions Resolved

✅ **Q: Is it just user + Google Drive, or do we need central authority?**
A: Just user + Google Drive. No central authority needed.

✅ **Q: How to handle MCP activation after user authenticates?**
A: Pre-configure MCP, write tokens to file, MCP watches and activates.

✅ **Q: Where to store OAuth tokens?**
A: Supabase with encryption and row-level security.

✅ **Q: How to show Google Docs/Sheets in preview?**
A: Iframe with user's browser session authentication.

✅ **Q: How to refresh preview when Claude makes changes?**
A: Detect MCP responses, trigger iframe reload (same pattern as file tree).

---

**Conclusion:** The implementation path is clear and aligns perfectly with existing architecture. No major architectural changes needed, just extending current patterns to support Google Drive.