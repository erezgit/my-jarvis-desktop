# Ticket 118: Google Drive Integration Architecture for My Jarvis Desktop

**Date:** December 2, 2025
**Status:** Research Complete
**Priority:** High
**Impact:** Major Architecture Enhancement

## Executive Summary

This ticket explores integrating Google Drive as a virtual filesystem within My Jarvis Desktop, allowing users to seamlessly work with cloud-stored files while maintaining Claude Agent SDK's file system requirements. The proposed solution would display Google Drive as a folder alongside local directories (docs, tickets) in the user's workspace, enabling both cloud and local file operations through a unified interface.

## The Vision

```
/my-jarvis/
├── docs/          (local Docker volume)
├── tickets/       (local Docker volume)
└── google-drive/  (virtual mount to user's Google Drive)
```

Users would see their Google Drive files in the file tree, Claude could read/write to them via MCP tools, and files would persist in the cloud without consuming Docker volume storage.

---

## Part 1: Google Drive MCP Server Options

### 1.1 Available MCP Servers (2025)

#### **@modelcontextprotocol/server-gdrive** (Official)
- **Publisher:** Anthropic/ModelContextProtocol team
- **Features:**
  - List, read, and search files
  - Read Google Sheets with flexible range options
  - Google Docs automatically exported to Markdown
  - OAuth2 authentication flow
- **Installation:** `npm install -g @modelcontextprotocol/server-gdrive`
- **Downloads:** ~4,900 as of January 2025

#### **@isaacphi/mcp-gdrive** (Enhanced)
- **Features:**
  - All features of official version
  - **PLUS write capabilities to Google Sheets**
  - Full CRUD operations
- **Notable:** Most feature-complete option

#### **@piotr-agier/google-drive-mcp** (Comprehensive)
- **Features:**
  - Secure integration with Drive, Docs, Sheets, Slides
  - Manages files through standardized interface
  - Production-ready implementation

#### **Google Docs MCP** (Specialized)
- **GitHub:** a-bonus/google-docs-mcp
- **Features:**
  - Direct editing and formatting of Google Docs
  - Advanced document manipulation
  - Built with fastmcp library

### 1.2 MCP Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "googleDrive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "CLIENT_ID": "your-client-id",
        "CLIENT_SECRET": "your-client-secret",
        "REDIRECT_URI": "http://localhost:3000"
      }
    }
  }
}
```

---

## Part 2: Technical Implementation Approaches

### 2.1 Approach A: Pure MCP Integration (Recommended)

**How it works:**
- Google Drive appears as virtual folder via MCP tools
- Claude uses MCP tools for all Google Drive operations
- No actual file system mounting required
- Files remain in Google Drive, accessed on-demand

**Implementation Steps:**
1. Configure Google Cloud Project with Drive API
2. Set up OAuth2 authentication
3. Install MCP server in Docker container
4. Modify file tree UI to show virtual Google Drive folder
5. Route file operations through MCP based on path

**Pros:**
- ✅ No sync latency or conflicts
- ✅ Zero storage costs (files stay in Google)
- ✅ Works with Claude SDK's existing tool system
- ✅ Real-time access to latest file versions

**Cons:**
- ❌ No terminal access to Google Drive files
- ❌ Can't run `npm install` on cloud-stored projects
- ❌ Requires internet connection for file access

### 2.2 Approach B: Hybrid Sync Architecture

**How it works:**
- On-demand sync between Google Drive and Docker volume
- Files pulled from Google Drive when accessed
- Changes synced back after modifications
- Cache layer for frequently accessed files

**Sync Flow:**
```
User opens file → Check cache → Pull from Google Drive if needed
User saves file → Save locally → Queue for sync → Push to Google Drive
Session ends → Final sync → Clear local cache
```

**Implementation Options:**

#### **Option 1: rclone-based sync**
```bash
# Pull files on session start
rclone sync gdrive:/my-jarvis /home/node/google-drive

# Push changes back
rclone sync /home/node/google-drive gdrive:/my-jarvis
```

#### **Option 2: Node.js sync libraries**
- **sync-gdrive** npm package
- **google-drive-sync-directory** for automated monitoring
- Custom implementation with Google Drive API v3

**Pros:**
- ✅ Terminal access to synced files
- ✅ Can run code/builds on Google Drive projects
- ✅ Works offline with cached files

**Cons:**
- ❌ Sync latency (10-45 seconds for Google Drive)
- ❌ Potential sync conflicts
- ❌ Storage duplication during sessions

### 2.3 Approach C: FUSE Virtual Filesystem

**How it works:**
- Mount Google Drive as virtual filesystem using FUSE
- Files appear local but are fetched/saved to cloud on-demand
- Transparent to Claude SDK

**Available Implementations:**
- **node-gdrive-fuse**: Node.js-based FUSE mount
- **google-drive-ocamlfuse**: Production-ready OCaml implementation
- **rclone mount**: Battle-tested virtual mount solution

**Challenges:**
- Complex to implement in Docker containers
- Performance issues with large files
- Not recommended for production use

---

## Part 3: Google Drive API Capabilities

### 3.1 Core Operations (API v3)

**File Operations:**
- Create: Upload files up to 5,120 GB
- Read: Stream or download files
- Update: Modify metadata and content
- Delete: Permanent deletion
- List: Browse with pagination

**Real-time Updates:**
- Watch API for webhook notifications
- Push notifications for file changes
- Requires HTTPS endpoint with valid SSL

**Rate Limits:**
- 1,000,000,000 requests per day per project
- 1,000 requests per 100 seconds per user
- Burst limit: 3,000 requests per 100 seconds

### 3.2 Performance Considerations

**Based on 2025 benchmarks:**
- Google Drive sync latency: 10-45 seconds average
- Dropbox comparison: 0.5-2 seconds (much faster)
- API response time: ~2-20 seconds for updates
- File Stream cache issues reported

**Optimization Strategies:**
- Keep frequently used files offline/cached
- Use batch operations where possible
- Implement smart caching with checksums
- Consider selective sync for large repositories

---

## Part 4: Integration with Current Architecture

### 4.1 Current Claude SDK Requirements

**File System Dependencies:**
- Real files at `/home/node` for workspace
- `.claude.json` for conversation history
- Bash tool needs actual directories
- Terminal operations require local files

### 4.2 Proposed Integration Points

```typescript
// Backend modification for path routing
async function handleFileOperation(path: string, operation: string) {
  if (path.startsWith('/my-jarvis/google-drive/')) {
    // Route to MCP Google Drive tools
    return await mcpGoogleDrive[operation](path);
  } else {
    // Use local file system
    return await fs[operation](path);
  }
}
```

### 4.3 UI Changes Required

**File Tree Component:**
```typescript
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  source: 'local' | 'google-drive';  // New field
  icon?: 'google-drive' | 'folder' | 'file';
}
```

**Visual Indicators:**
- Google Drive icon for cloud files
- Sync status indicators
- Offline availability badges

---

## Part 5: Implementation Roadmap

### Phase 1: Proof of Concept (Week 1)
- [ ] Set up Google Cloud Project
- [ ] Configure OAuth2 authentication
- [ ] Test MCP server locally
- [ ] Verify Claude can access Google Drive files

### Phase 2: Backend Integration (Week 2)
- [ ] Install MCP server in Docker container
- [ ] Add routing logic for Google Drive paths
- [ ] Implement file operation handlers
- [ ] Test with Claude Agent SDK

### Phase 3: Frontend Integration (Week 3)
- [ ] Modify file tree to show Google Drive
- [ ] Add authentication flow UI
- [ ] Implement file preview for Google Docs
- [ ] Add sync status indicators

### Phase 4: Optimization (Week 4)
- [ ] Add caching layer
- [ ] Implement selective sync
- [ ] Optimize for large files
- [ ] Add error handling and retry logic

---

## Part 6: Security & Compliance

### Authentication
- OAuth2 with refresh tokens
- Tokens stored securely (never in code)
- Per-user Google Drive isolation
- Scoped permissions (least privilege)

### Data Privacy
- Files remain in user's Google account
- No server-side storage of file contents
- Audit logging for all operations
- GDPR-compliant data handling

---

## Part 7: Cost-Benefit Analysis

### Benefits
1. **Zero Storage Costs**: Users bring their own storage
2. **Automatic Backup**: Files backed up to Google Drive
3. **Cross-Device Access**: Work from anywhere
4. **Collaboration**: Share folders with teammates
5. **Version History**: Google Drive's built-in versioning

### Costs
1. **Development Time**: 4 weeks estimated
2. **Complexity**: Additional authentication layer
3. **Performance**: Potential latency vs local files
4. **Internet Dependency**: Requires connection for cloud files

---

## Part 8: Migration Strategy

### For New Users
1. Optional: "Connect Google Drive" during onboarding
2. Default: Local workspace only
3. Gradual adoption as users see benefits

### For Existing Users
1. Feature flag for beta testing
2. Opt-in migration wizard
3. Parallel operation (both local and cloud)
4. Gradual transition over 3 months

---

## Part 9: Alternative Considerations

### Dropbox Integration
- Better performance (2s vs 45s sync)
- Similar MCP server availability
- Consider as future option

### S3/Supabase Storage
- More control over infrastructure
- Better performance potential
- Higher complexity to implement

### Hybrid Approach
- Local for active work
- Google Drive for archive
- Best of both worlds

---

## Part 10: Recommendations

### Immediate Action (Recommended)
**Implement Pure MCP Integration (Approach A)**
- Fastest to implement
- Least complex
- Provides immediate value
- Can evolve to hybrid later

### Long-term Vision
1. Start with MCP integration
2. Add selective sync for popular files
3. Implement smart caching
4. Eventually offer multiple storage backends

### Success Metrics
- User adoption rate > 50%
- Storage cost reduction > 80%
- User satisfaction score > 8/10
- Zero data loss incidents

---

## Conclusion

Integrating Google Drive into My Jarvis Desktop is technically feasible and offers significant benefits. The MCP server approach provides the best balance of functionality, complexity, and time-to-market. While there are performance considerations compared to local storage, the benefits of cloud storage, zero infrastructure costs, and seamless collaboration make this a compelling enhancement.

The phased approach allows for gradual rollout and learning, with the ability to optimize based on real usage patterns. This positions My Jarvis Desktop as a modern, cloud-native development environment while maintaining the powerful Claude Agent SDK capabilities users expect.

---

## Appendix: Technical Resources

### Official Documentation
- [Google Drive API v3](https://developers.google.com/workspace/drive/api/reference/rest/v3)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Agent SDK](https://docs.anthropic.com/claude/docs/claude-agent-sdk)

### MCP Servers
- [NPM: @modelcontextprotocol/server-gdrive](https://www.npmjs.com/package/@modelcontextprotocol/server-gdrive)
- [GitHub: Google Drive MCP Implementations](https://github.com/search?q=google+drive+mcp)

### Integration Libraries
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [rclone documentation](https://rclone.org/drive/)
- [node-gdrive-fuse](https://github.com/thejinx0r/node-gdrive-fuse)

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Author:** JARVIS AI Assistant
**Status:** Ready for Review