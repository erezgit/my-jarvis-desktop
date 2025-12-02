# Official Anthropic Google Drive MCP Integration Guide

**Last Updated:** December 2, 2025
**MCP Version:** 2025.1.14
**Package:** @modelcontextprotocol/server-gdrive

## Overview

Anthropic provides an official MCP (Model Context Protocol) server for Google Drive integration. This server enables Claude to access, read, and search Google Drive files through a standardized, secure interface.

## Key Information

### Official NPM Package
```bash
@modelcontextprotocol/server-gdrive
```

- **Publisher:** Anthropic/ModelContextProtocol team
- **License:** MIT
- **Downloads:** ~47,000+ (as of December 2025)
- **Release Date:** November 19, 2024
- **Size:** 10.5 kB

## Installation

### Method 1: Global Installation
```bash
npm install -g @modelcontextprotocol/server-gdrive
```

### Method 2: Using npx (Recommended)
```bash
npx @modelcontextprotocol/server-gdrive
```

## Google Cloud Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Name it something like "My-Jarvis-MCP" or "Claude-Drive-Integration"

### Step 2: Enable Required APIs
1. Navigate to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Drive API**
   - **Google Docs API** (if you need Docs support)
   - **Google Sheets API** (if you need Sheets support)

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Configure consent screen:
   - Choose "External" for user type
   - Fill in required fields
   - Add your email to test users
4. Create OAuth client:
   - Application type: **Desktop app**
   - Name: "Claude MCP Client"
5. Download the credentials JSON file
6. Save as `client_secret.json` or `gcp-oauth.keys.json`

### Step 4: Set Redirect URI
```
http://localhost:3000
```

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "googleDrive": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-gdrive"
      ],
      "env": {
        "CLIENT_ID": "your-client-id-here",
        "CLIENT_SECRET": "your-client-secret-here",
        "REDIRECT_URI": "http://localhost:3000"
      }
    }
  }
}
```

### For Claude Code / Agent SDK

Add to `.claude.json` in your project:

```json
{
  "mcpServers": {
    "googleDrive": {
      "command": "node",
      "args": ["/path/to/@modelcontextprotocol/server-gdrive"],
      "env": {
        "CLIENT_ID": "your-client-id-here",
        "CLIENT_SECRET": "your-client-secret-here",
        "REDIRECT_URI": "http://localhost:3000"
      }
    }
  }
}
```

## Authentication Flow

### Initial Setup
1. Start Claude with the MCP server configured
2. The server will prompt for authentication
3. A browser window opens to Google's OAuth page
4. Sign in with your Google account
5. Grant permissions for Drive access
6. You'll be redirected to localhost:3000 (this will show an error - that's normal)
7. Copy the authorization code from the URL
8. The server saves a `token.json` file for future use

### Token Persistence
- OAuth tokens are saved in `token.json`
- This file allows automatic re-authentication
- Location depends on your configuration
- **Security:** Never commit `token.json` to version control

## Available Tools

Once configured, Claude can use these tools:

### 1. search_drive
Search for files in Google Drive
```
Parameters:
- query: Search query string
Returns: List of matching files with names and MIME types
```

### 2. read_file
Read contents of a file from Google Drive
```
Parameters:
- fileId: Google Drive file ID
Returns: File contents (Google Docs auto-converted to Markdown)
```

### 3. list_files
List files in a specific folder
```
Parameters:
- folderId: (optional) Google Drive folder ID
Returns: List of files with metadata
```

## Security Best Practices

### 1. Credential Management
- **NEVER** commit CLIENT_ID and CLIENT_SECRET to Git
- Store credentials in environment variables
- Use secret managers in production
- Rotate credentials regularly

### 2. File Security
- Add to `.gitignore`:
```
token.json
client_secret.json
gcp-oauth.keys.json
.env
```

### 3. Scope Limitations
- Only request necessary scopes
- Default scope: `https://www.googleapis.com/auth/drive.readonly`
- For write access: `https://www.googleapis.com/auth/drive`

### 4. OAuth Best Practices
- Use OAuth 2.1 standards
- Validate redirect URIs
- Implement proper token refresh
- Monitor for unusual access patterns

## Troubleshooting

### Common Issues

**1. Authentication Fails**
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Check redirect URI matches exactly
- Ensure APIs are enabled in Google Cloud Console

**2. "Token expired" Errors**
- Delete `token.json` and re-authenticate
- Check system clock is synchronized

**3. "Scope not authorized"**
- Verify required APIs are enabled
- Check OAuth consent screen configuration
- May need to re-authenticate with new scopes

**4. Connection Issues**
- Verify internet connectivity
- Check firewall/proxy settings
- Try using a different port for redirect URI

## Performance Considerations

### Token Efficiency
- MCP is 85% more token-efficient than direct API calls
- Preserves ~190,000 tokens compared to traditional approaches
- Better accuracy: Opus 4 improved from 49% to 74% with MCP

### Latency
- Google Drive API average latency: 10-45 seconds
- Consider caching frequently accessed files
- Use selective sync for large repositories

### Rate Limits
- 1,000,000,000 requests/day per project
- 1,000 requests/100 seconds per user
- Implement exponential backoff for retries

## Integration with My Jarvis Desktop

### Docker Container Setup
```bash
# Install in container
docker exec -it my-jarvis-container bash
npm install -g @modelcontextprotocol/server-gdrive

# Configure environment
export CLIENT_ID="your-client-id"
export CLIENT_SECRET="your-client-secret"
export REDIRECT_URI="http://localhost:3000"
```

### File System Integration
- Google Drive appears as virtual folder
- Claude accesses files via MCP tools
- No local storage required
- Real-time access to latest versions

## Advanced Configuration

### Multiple Google Accounts
```json
{
  "mcpServers": {
    "googleDrivePersonal": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "CLIENT_ID": "personal-client-id",
        "CLIENT_SECRET": "personal-secret",
        "TOKEN_PATH": "~/.tokens/personal-token.json"
      }
    },
    "googleDriveWork": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "CLIENT_ID": "work-client-id",
        "CLIENT_SECRET": "work-secret",
        "TOKEN_PATH": "~/.tokens/work-token.json"
      }
    }
  }
}
```

### Custom Token Storage
```bash
export GDRIVE_TOKEN_PATH="/secure/location/token.json"
```

## Limitations

### Current Limitations (December 2025)
- Read-only access by default
- No native write support (use enhanced versions for write)
- .docx files not directly supported (convert to Google Docs)
- No real-time collaboration features
- Terminal operations not available for Drive files

### File Type Support
- ✅ Google Docs (auto-converted to Markdown)
- ✅ Google Sheets (read-only in official version)
- ✅ Text files
- ✅ PDFs (content extraction)
- ⚠️ Binary files (limited support)
- ❌ Google Slides (not in official version)

## Alternative MCP Servers

If you need additional features:

### Enhanced Versions
1. **@isaacphi/mcp-gdrive**
   - Adds write capabilities for Google Sheets
   - Full CRUD operations

2. **@piotr-agier/google-drive-mcp**
   - Comprehensive Google Workspace integration
   - Supports Docs, Sheets, Slides

3. **Google Workspace MCP Server**
   - Full suite integration
   - Includes Gmail, Calendar, Drive

## Support and Resources

### Official Resources
- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [GitHub Repository](https://github.com/modelcontextprotocol/servers)
- [NPM Package](https://www.npmjs.com/package/@modelcontextprotocol/server-gdrive)

### Community
- MCP Discord Server
- GitHub Issues for bug reports
- Stack Overflow tag: `mcp-protocol`

## Conclusion

The official Anthropic Google Drive MCP server provides a secure, efficient, and standardized way to integrate Google Drive with Claude. It's the recommended approach for production use, offering significant token savings and native integration with Claude's tool system.

Remember: Always follow security best practices, especially regarding credential management, and consider starting with read-only access before implementing write operations.