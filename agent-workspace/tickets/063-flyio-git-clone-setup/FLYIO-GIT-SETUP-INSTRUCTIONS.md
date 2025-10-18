# Git Clone Setup Instructions for Fly.io Web Instance

**Repository**: `my-jarvis-desktop`
**Target**: Fly.io web applications (my-jarvis-erez, my-jarvis-erez-dev, my-jarvis-lilah)

---

## Repository Information

- **GitHub Repository**: `erezgit/my-jarvis-desktop`
- **SSH URL**: `git@github.com:erezgit/my-jarvis-desktop.git`
- **HTTPS URL**: `https://github.com/erezgit/my-jarvis-desktop.git`
- **Main Branch**: `main`

---

## Recommended Method: HTTPS with Personal Access Token

### Why HTTPS Instead of SSH?
- ✅ No SSH key management in containers
- ✅ Easy to automate with environment variables
- ✅ Token can be revoked if compromised
- ✅ Simpler setup for Docker/Fly.io environments
- ✅ Works immediately without key generation

### Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Click "Generate new token (classic)"
3. Configure token:
   - **Note**: `my-jarvis-flyio-clone-token`
   - **Expiration**: Choose your preferred duration (recommend 90 days or longer)
   - **Scopes**: Check `repo` (Full control of private repositories)
4. Click "Generate token" at the bottom
5. **IMPORTANT**: Copy the token immediately (you won't see it again!)
   - Token format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Set Token as Environment Variable in Fly.io

```bash
# For production instance
fly secrets set GITHUB_TOKEN="ghp_your_token_here" --app my-jarvis-erez

# For dev instance
fly secrets set GITHUB_TOKEN="ghp_your_token_here" --app my-jarvis-erez-dev

# For Lilah's instance
fly secrets set GITHUB_TOKEN="ghp_your_token_here" --app my-jarvis-lilah
```

### Step 3: Clone Repository in Fly.io Container

**Option A: Using environment variable (recommended for scripts)**
```bash
git clone https://${GITHUB_TOKEN}@github.com/erezgit/my-jarvis-desktop.git
cd my-jarvis-desktop
```

**Option B: Direct token in URL (for manual testing)**
```bash
git clone https://ghp_your_token_here@github.com/erezgit/my-jarvis-desktop.git
cd my-jarvis-desktop
```

### Step 4: Verify Clone Success

```bash
# Check git status
cd my-jarvis-desktop
git status

# Verify branch
git branch

# View recent commits
git log --oneline -5

# Confirm remote URL
git remote -v
```

---

## Alternative Method: SSH (If You Prefer Key-Based Auth)

### Step 1: Generate SSH Key in Fly.io Container

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "flyio@my-jarvis-desktop" -f ~/.ssh/id_ed25519 -N ""

# Display public key (copy entire output)
cat ~/.ssh/id_ed25519.pub
```

### Step 2: Add Public Key to GitHub

1. Copy the output from `cat ~/.ssh/id_ed25519.pub`
2. Go to: https://github.com/settings/keys
3. Click "New SSH key"
4. Configure:
   - **Title**: `my-jarvis-flyio-production` (or appropriate instance name)
   - **Key**: Paste the public key
5. Click "Add SSH key"

### Step 3: Test SSH Connection

```bash
# Test GitHub SSH connection
ssh -T git@github.com

# Expected output:
# Hi erezgit! You've successfully authenticated, but GitHub does not provide shell access.
```

### Step 4: Clone with SSH

```bash
git clone git@github.com:erezgit/my-jarvis-desktop.git
cd my-jarvis-desktop
```

---

## Common Git Commands After Setup

```bash
# Navigate to repository
cd my-jarvis-desktop

# Pull latest changes
git pull origin main

# Check current status
git status

# View commit history
git log --oneline -10

# Check which branch you're on
git branch

# Switch to a different branch
git checkout branch-name

# View remote configuration
git remote -v
```

---

## Troubleshooting

### Issue: "Permission denied (publickey)"
**Solution**: SSH key not added to GitHub or not configured correctly
- Verify key with: `ssh -T git@github.com`
- Check key is added at: https://github.com/settings/keys

### Issue: "Authentication failed" (HTTPS)
**Solution**: Token invalid or expired
- Generate new token at: https://github.com/settings/tokens
- Update Fly.io secret: `fly secrets set GITHUB_TOKEN="new_token"`

### Issue: "Repository not found"
**Solution**: Check repository name and access
- Verify URL: `https://github.com/erezgit/my-jarvis-desktop`
- Ensure token has `repo` scope

### Issue: "Could not resolve host"
**Solution**: Network connectivity issue
- Check DNS: `ping github.com`
- Verify Fly.io network settings

---

## Security Best Practices

1. **Never commit tokens to code**: Use environment variables only
2. **Use short-lived tokens**: Set expiration dates on GitHub tokens
3. **Rotate tokens regularly**: Generate new tokens every 90 days
4. **Limit token scope**: Only grant necessary permissions (`repo` only)
5. **Monitor token usage**: Check GitHub settings for token activity
6. **Revoke compromised tokens immediately**: https://github.com/settings/tokens

---

## Quick Copy-Paste Commands

### Complete HTTPS Setup (Recommended)
```bash
# 1. Set token in Fly.io
fly secrets set GITHUB_TOKEN="ghp_your_token_here" --app my-jarvis-erez

# 2. SSH into Fly.io container
fly ssh console --app my-jarvis-erez

# 3. Clone repository
git clone https://${GITHUB_TOKEN}@github.com/erezgit/my-jarvis-desktop.git

# 4. Navigate and verify
cd my-jarvis-desktop
git status
git log --oneline -5
```

---

## Summary

**For Fly.io web instances, use HTTPS with Personal Access Token**:
- ✅ Simpler setup
- ✅ No SSH key management
- ✅ Easy to automate
- ✅ Environment variable based (secure)

**Repository**: `https://github.com/erezgit/my-jarvis-desktop.git`
**Clone Command**: `git clone https://${GITHUB_TOKEN}@github.com/erezgit/my-jarvis-desktop.git`

---

*Created: October 16, 2025*
*Ticket: 063-flyio-git-clone-setup*
