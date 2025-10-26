# Ticket #069: GitHub Personal Access Token Deployment Workflow

## Overview
Implement a streamlined, scalable deployment workflow for multi-user My Jarvis instances using GitHub Fine-Grained Personal Access Tokens (PATs) instead of SSH keys. This enables non-technical users like Daniel and Lilach to have websites that update automatically when they talk to Jarvis, without manual git operations.

## Problem Statement
Current SSH key-based deployment requires:
- Complex SSH key management per user
- Manual git push operations
- All-or-nothing repository access
- Difficult to scale across multiple users

## Solution
Use GitHub Fine-Grained Personal Access Tokens with Claude Code automation hooks for a zero-friction deployment workflow:
1. User talks to Jarvis → Jarvis makes changes
2. Jarvis commits changes → Hook auto-pushes to GitHub
3. Vercel detects push → Automatically deploys website
4. Zero manual steps for end user

## Architecture

### Components
1. **GitHub Fine-Grained PAT**: Repository-specific authentication token
2. **Git Credential Helper**: Stores PAT for automatic authentication
3. **Claude Code PostToolUse Hook**: Auto-pushes after git commits
4. **Vercel GitHub Integration**: Auto-deploys on push

### Workflow Diagram
```
User → Jarvis Chat → Code Changes → Git Commit
                                         ↓
                            [PostToolUse Hook Triggers]
                                         ↓
                                    Git Push (PAT auth)
                                         ↓
                                  GitHub Repository
                                         ↓
                              [Vercel detects push]
                                         ↓
                              Automatic Deployment
```

## Implementation Steps

### Step 1: Create GitHub Fine-Grained Personal Access Token

#### 1.1 Navigate to GitHub Settings
```
1. Go to https://github.com/settings/tokens
2. Click "Fine-grained tokens" (not classic tokens)
3. Click "Generate new token"
```

#### 1.2 Configure Token Settings
```
Token name: "My Jarvis - Daniel Website"
Description: "Deployment token for Daniel's therapy website via My Jarvis"
Expiration: 90 days (or custom - recommend setting expiration)
Resource owner: [Your GitHub account/organization]
```

#### 1.3 Select Repository Access
```
Repository access: "Only select repositories"
Select repositories: Choose "daniel-therapy-site" (or specific repo)
```

#### 1.4 Set Repository Permissions
```
Required permissions:
- Contents: Read and write (enables git push/pull)

Optional permissions (if needed):
- Pull requests: Read and write (if using PR workflow)
- Metadata: Read-only (automatically included)
```

**Important**: Do NOT grant unnecessary permissions like:
- Administration
- Actions
- Deployments
- Environments
- Issues
- Packages
- Pages
- Webhooks

#### 1.5 Generate and Copy Token
```
1. Click "Generate token"
2. Copy the token immediately (format: github_pat_XXXXXXXXXX...)
3. Store securely - you won't see it again!
```

### Step 2: Configure Git with Personal Access Token

#### 2.1 For Each User's My Jarvis Instance

Navigate to the user's project directory:
```bash
cd /workspace/my-jarvis/projects/daniel-website
# or wherever the Next.js project lives
```

#### 2.2 Initialize Git Repository (if new project)
```bash
git init
git branch -M main
```

#### 2.3 Configure Git Credential Helper

**Option A: Store credential permanently (simpler)**
```bash
# Configure git to store credentials
git config credential.helper store

# Set remote URL with token embedded
git remote add origin https://github.com/erezgit/daniel-therapy-site.git

# Or update existing remote
git remote set-url origin https://github.com/erezgit/daniel-therapy-site.git
```

**Option B: Use credential store file (more explicit)**
```bash
# Create credentials file
cat > ~/.git-credentials << EOF
https://YOUR_TOKEN_HERE@github.com
EOF

# Secure the file
chmod 600 ~/.git-credentials

# Configure git to use it
git config --global credential.helper 'store --file ~/.git-credentials'
```

**Option C: Use Git Credential Manager (recommended for production)**
```bash
# Configure git to use credential helper with token
git config credential.helper 'cache --timeout=31536000'

# First push will prompt for credentials
# Username: your-github-username
# Password: [paste the PAT token]
```

#### 2.4 Test Authentication
```bash
# Test push access
git push -u origin main

# Should authenticate without prompting for password
# If it prompts, the credential helper isn't configured correctly
```

### Step 3: Configure Claude Code Auto-Push Hook

#### 3.1 Locate Claude Settings File
```bash
# Settings file location in My Jarvis instance
/workspace/.claude/settings.json
```

#### 3.2 Add PostToolUse Hook for Auto-Push

Edit `.claude/settings.json` and add this hook:

```json
{
  "hooks": {
    "postToolUse": [
      {
        "name": "auto-push-after-commit",
        "description": "Automatically push to GitHub after git commits",
        "matcher": "Bash(git commit:*)",
        "command": "cd \"$CLAUDE_WORKING_DIR\" && git push origin main 2>&1"
      }
    ]
  }
}
```

**Hook Explanation**:
- `postToolUse`: Runs after any tool completes
- `matcher`: Only triggers for Bash commands containing "git commit"
- `command`: Executes `git push` in the current working directory
- `2>&1`: Captures both stdout and stderr for logging

#### 3.3 Alternative: Project-Specific Hook

For project-specific auto-push (better for multi-project workspaces):

```json
{
  "hooks": {
    "postToolUse": [
      {
        "name": "daniel-website-auto-push",
        "description": "Auto-push Daniel's website after commits",
        "matcher": "Bash(git commit:*)",
        "command": "if [[ \"$CLAUDE_WORKING_DIR\" == *\"daniel-website\"* ]]; then cd \"$CLAUDE_WORKING_DIR\" && git push origin main 2>&1; fi"
      }
    ]
  }
}
```

### Step 4: Create Next.js Project Structure

#### 4.1 Initialize Next.js Project
```bash
cd /workspace/my-jarvis/projects/
npx create-next-app@latest daniel-website --typescript --tailwind --app --no-src-dir

cd daniel-website
```

#### 4.2 Create .gitignore
```bash
cat > .gitignore << EOF
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next
out
build
dist

# Production
.vercel

# Misc
.DS_Store
*.pem
.env*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode
.idea
EOF
```

#### 4.3 Initial Commit
```bash
git add .
git commit -m "feat: Initial Next.js project setup for Daniel's therapy website

Created with Next.js 14, TypeScript, and Tailwind CSS.
Configured for Vercel deployment.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Hook automatically pushes after commit
```

### Step 5: Connect Vercel for Auto-Deployment

#### 5.1 Create Vercel Project
```
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import Git Repository
4. Select "daniel-therapy-site" from GitHub
```

#### 5.2 Configure Build Settings
```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
```

#### 5.3 Environment Variables (if needed)
```
Add any required environment variables:
- API keys
- Database URLs
- Feature flags
```

#### 5.4 Deploy
```
1. Click "Deploy"
2. Wait for initial deployment
3. Note the production URL: daniel-therapy-site.vercel.app
```

#### 5.5 Verify Auto-Deployment
```
1. Make a test change in My Jarvis
2. Jarvis commits the change
3. Hook automatically pushes to GitHub
4. Check Vercel dashboard - should see new deployment triggered
5. Verify changes appear on live site
```

### Step 6: Configure Custom Domain (Optional)

#### 6.1 Add Domain in Vercel
```
1. Go to Project Settings → Domains
2. Add domain: danieltherapy.com
3. Follow DNS configuration instructions
```

#### 6.2 Update DNS Records
```
CNAME: www.danieltherapy.com → cname.vercel-dns.com
A: danieltherapy.com → 76.76.21.21
```

## Security Best Practices

### Token Management
1. **Never commit tokens to git**: Always use git credentials or environment variables
2. **Set token expiration**: Use 90-day expiration and rotate regularly
3. **Minimum permissions**: Only grant "Contents: Read and write"
4. **Per-repository tokens**: Create separate tokens for each project
5. **Regular audits**: Review active tokens monthly in GitHub settings

### Access Control
1. **Repository-specific**: Each token accesses only one repository
2. **User-specific**: Each My Jarvis user has their own token
3. **Revocable**: Can instantly revoke access by deleting token
4. **Audit trail**: GitHub logs all token usage

### Credential Storage
1. **Encrypted storage**: Git credential helper stores encrypted credentials
2. **File permissions**: Ensure `.git-credentials` is chmod 600
3. **Environment isolation**: Each My Jarvis instance has separate credentials
4. **No plaintext**: Never store tokens in code or config files

## Token Rotation Procedure

### When to Rotate Tokens
- Every 90 days (expiration)
- When user leaves/changes access needs
- After suspected compromise
- During security audits

### Rotation Steps
1. Generate new token in GitHub with same permissions
2. Update git credential helper with new token
3. Test git push with new token
4. Revoke old token in GitHub settings
5. Document rotation date

## Troubleshooting

### Issue: Git push prompts for password
**Cause**: Credential helper not configured properly
**Solution**:
```bash
git config credential.helper store
git push  # Enter username and token once
```

### Issue: Hook doesn't trigger after commit
**Cause**: Hook syntax error or matcher not matching
**Solution**:
```bash
# Check Claude Code settings
cat /workspace/.claude/settings.json

# Test hook manually
cd /workspace/my-jarvis/projects/daniel-website
git commit --allow-empty -m "test commit"
# Should see push output
```

### Issue: Authentication failed (403)
**Cause**: Token expired or insufficient permissions
**Solution**:
1. Check token expiration in GitHub settings
2. Verify "Contents: Read and write" permission
3. Regenerate token if expired

### Issue: Push rejected (non-fast-forward)
**Cause**: Remote has commits not in local
**Solution**:
```bash
git pull --rebase origin main
git push origin main
```

## Scaling to Multiple Users

### Per-User Setup Checklist
For each new user (Lilach, Jonathan, etc.):

- [ ] Create GitHub repository: `username-website`
- [ ] Generate fine-grained PAT for that repository only
- [ ] In user's My Jarvis instance:
  - [ ] Create Next.js project: `/workspace/projects/username-website`
  - [ ] Configure git credential helper with their PAT
  - [ ] Add auto-push hook to `.claude/settings.json`
  - [ ] Initial commit and push
- [ ] Connect Vercel to GitHub repository
- [ ] Verify auto-deployment workflow
- [ ] Document token and expiration date

### Token Tracking Spreadsheet
Keep a record of all active tokens:

| User | Repository | Token Name | Created | Expires | Status |
|------|------------|------------|---------|---------|--------|
| Daniel | daniel-therapy-site | My Jarvis - Daniel | 2025-10-22 | 2026-01-20 | Active |
| Lilach | lilach-portfolio | My Jarvis - Lilach | 2025-10-22 | 2026-01-20 | Active |

## Benefits of This Approach

### For End Users
✅ Zero technical knowledge required
✅ Just talk to Jarvis naturally
✅ Changes go live automatically
✅ No git commands to remember
✅ Immediate feedback loop

### For Development
✅ No SSH key management complexity
✅ Fine-grained security per repository
✅ Easy to revoke access
✅ Scales to unlimited users
✅ Audit trail of all changes
✅ Standard git workflow

### For Operations
✅ Centralized token management
✅ Automatic deployments via Vercel
✅ No manual intervention needed
✅ Clear separation between users
✅ Easy to add/remove users

## Alternative Approaches Considered

### 1. SSH Keys (Current Approach)
❌ Complex per-user setup
❌ All-or-nothing repository access
❌ Harder to rotate/revoke
❌ More difficult to scale

### 2. GitHub App Integration (@claude mentions)
❌ Requires GitHub Actions setup
❌ Only works from GitHub interface
❌ Can't be triggered from conversation
❌ Adds complexity for simple use case

### 3. Direct Vercel CLI Deployment
❌ Bypasses git version control
❌ No deployment history
❌ No rollback capability
❌ Doesn't scale well

## Testing Plan

### Phase 1: Proof of Concept (Daniel)
1. Create test repository
2. Generate PAT
3. Configure Daniel's My Jarvis instance
4. Test conversation → commit → auto-push → deploy workflow
5. Verify zero manual steps required

### Phase 2: Second User Validation (Lilach)
1. Repeat setup for Lilach's project
2. Verify complete isolation between users
3. Test both users can work simultaneously
4. Confirm separate PATs work independently

### Phase 3: Production Rollout
1. Document complete setup procedure
2. Create setup automation scripts
3. Train on troubleshooting common issues
4. Monitor token expirations
5. Establish rotation schedule

## Success Criteria

### Technical
- [ ] User commits code via Jarvis conversation
- [ ] Hook automatically pushes to GitHub
- [ ] Vercel automatically deploys within 2 minutes
- [ ] Zero manual git operations required
- [ ] Each user has isolated repository access

### User Experience
- [ ] Daniel can update website by talking to Jarvis
- [ ] Changes go live without technical knowledge
- [ ] No SSH keys or git commands needed
- [ ] Clear feedback when deployment completes

### Operations
- [ ] All tokens documented with expiration dates
- [ ] Rotation procedure established
- [ ] Troubleshooting guide complete
- [ ] Scales to 10+ users without issues

## Next Steps

1. **Create test repository**: Set up `my-jarvis-test-website` for validation
2. **Generate first PAT**: Create token for test repository
3. **Configure test instance**: Set up auto-push hook in development
4. **Validate workflow**: Test end-to-end deployment
5. **Document learnings**: Update this ticket with any issues/solutions
6. **Deploy to Daniel**: Set up production instance
7. **Create setup automation**: Script the repetitive parts

## References

- [GitHub Fine-Grained Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks-guide)
- [Git Credential Storage](https://git-scm.com/docs/git-credential-store)
- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git)

---

**Status**: Planning
**Priority**: High
**Estimated Effort**: 2-3 hours (initial setup), 30 minutes per additional user
**Dependencies**: None
**Risk Level**: Low (non-destructive, easy rollback)
