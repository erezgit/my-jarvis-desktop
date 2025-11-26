# Fly.io CLI Setup Instructions for My Jarvis Apps

## 🚁 Setting up Fly.io CLI Management from Within Container

These instructions enable a My Jarvis app (like my-jarvis-erez) to manage other Fly.io apps from within its own container. All configuration is stored in the persistent volume.

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Install Fly.io CLI in Container

```bash
# SSH into the My Jarvis app
fly ssh console -a my-jarvis-erez

# Download and install Fly.io CLI (Linux x86_64 version for container)
cd /tmp
curl -L https://fly.io/install.sh | sh

# Move flyctl binary to persistent volume (so it survives restarts)
mkdir -p /home/node/bin
mv ~/.fly/bin/flyctl /home/node/bin/flyctl
chmod +x /home/node/bin/flyctl

# Note: Do NOT create symlinks in /usr/local/bin - they won't persist!
# Instead, we'll use PATH and aliases in the setup script

# Verify installation using full path
/home/node/bin/flyctl version
```

### Step 2: Configure Fly.io CLI with Persistent Storage

```bash
# Create Fly.io configuration directory in persistent volume
mkdir -p /home/node/.fly

# Set environment variable to use persistent Fly config
echo 'export FLY_CONFIG_DIR="/home/node/.fly"' >> /home/node/.bashrc
echo 'export PATH="/home/node/bin:$PATH"' >> /home/node/.bashrc

# Apply environment changes
export FLY_CONFIG_DIR="/home/node/.fly"
export PATH="/home/node/bin:$PATH"

# Verify configuration directory
echo "Fly config will be stored in: $FLY_CONFIG_DIR"
```

### Step 3: Authenticate with Access Token

```bash
# Create config file with your access token
cat > /home/node/.fly/config.yml << 'EOF'
access_token: YOUR_ACCESS_TOKEN_HERE
auto_update: true
metrics_token: ""
EOF

# Set proper permissions
chmod 600 /home/node/.fly/config.yml

# Test authentication using full path
/home/node/bin/flyctl auth whoami
```

### Step 4: Test Fly.io Management Capabilities

```bash
# List all apps (should show your My Jarvis apps)
fly apps list

# Check specific app status
fly status -a my-jarvis-yaron

# List volumes
fly volumes list -a my-jarvis-yaron

# Check app secrets
fly secrets list -a my-jarvis-yaron
```

---

## 🔧 Environment Setup Script

Create this script to automatically configure the environment on each session:

```bash
# Create setup script that runs on every container start
cat > /home/node/setup-flyio.sh << 'EOF'
#!/bin/bash
# Fly.io CLI Environment Setup Script
# This script sets up the environment every time the container starts

# Set environment variables
export FLY_CONFIG_DIR="/home/node/.fly"
export PATH="/home/node/bin:$PATH"

# Create aliases for convenience (these are session-specific, not persistent)
alias fly="/home/node/bin/flyctl"
alias flyctl="/home/node/bin/flyctl"

# Verify Fly CLI is available
if [ -f "/home/node/bin/flyctl" ]; then
    echo "✅ Fly CLI available at: /home/node/bin/flyctl"
    echo "✅ Config directory: $FLY_CONFIG_DIR"
    if [ -f "/home/node/.fly/config.yml" ]; then
        echo "✅ Authenticated as: $(/home/node/bin/flyctl auth whoami 2>/dev/null || echo 'Not authenticated')"
    else
        echo "⚠️  Config file not found - run authentication setup"
    fi
else
    echo "❌ Fly CLI not found - run installation steps"
fi

# Function to make commands available in this session
fly() {
    /home/node/bin/flyctl "$@"
}

flyctl() {
    /home/node/bin/flyctl "$@"
}

# Export the functions so they're available in the current shell
export -f fly flyctl
EOF

# Make script executable
chmod +x /home/node/setup-flyio.sh

# Add to bashrc for automatic loading
echo 'source /home/node/setup-flyio.sh' >> /home/node/.bashrc
```

---

## 📊 Claude Workspace Integration

Add these capabilities to your Claude workspace by updating CLAUDE.md:

```markdown
## 🚁 Fly.io Management Commands

You can now manage Fly.io apps directly from this workspace using these commands:

### App Management
- `fly apps list` - List all your Fly.io apps
- `fly status -a APP_NAME` - Check app status
- `fly logs -a APP_NAME` - View app logs
- `fly ssh console -a APP_NAME` - SSH into app

### Volume Management
- `fly volumes list -a APP_NAME` - List app volumes
- `fly volumes extend VOLUME_ID -s SIZE -a APP_NAME` - Extend volume
- `fly volumes snapshot create VOLUME_ID -a APP_NAME` - Create snapshot

### Secrets Management
- `fly secrets list -a APP_NAME` - List app secrets
- `fly secrets set KEY=value -a APP_NAME` - Set secret
- `fly secrets unset KEY -a APP_NAME` - Remove secret

### Deployment
- `fly deploy -a APP_NAME --update-only` - Deploy with volume preservation
- `fly machine restart MACHINE_ID -a APP_NAME` - Restart specific machine
- `fly scale count 1 -a APP_NAME` - Scale app instances

### User Management (via fly postgres)
You can also manage Supabase database users and create new My Jarvis instances through the workspace.

### Environment Setup
Run `source /home/node/setup-flyio.sh` to ensure Fly CLI environment is configured.
```

---

## 🔑 Access Token Setup

### Getting Your Access Token

1. **From your local machine** (where Fly.io is already configured):
```bash
# Extract your current access token
cat ~/.fly/config.yml | grep access_token | cut -d' ' -f2
```

2. **Or create a new token** via Fly.io dashboard:
   - Go to https://fly.io/dashboard/personal/tokens
   - Create a new access token with appropriate permissions
   - Copy the token for use in Step 3 above

### Token Permissions Needed
- **Apps**: Read, Write (to manage app deployments)
- **Volumes**: Read, Write (to manage storage)
- **Secrets**: Read, Write (to manage environment variables)
- **Organizations**: Read (to list apps)

---

## 🛡️ Security Considerations

### File Permissions
```bash
# Ensure sensitive files have proper permissions
chmod 600 /home/node/.fly/config.yml
chmod 700 /home/node/.fly/
chmod +x /home/node/bin/flyctl
```

### Environment Variables
```bash
# Verify sensitive data is not exposed
env | grep -i fly
echo "Config dir: $FLY_CONFIG_DIR"
```

### Testing Security
```bash
# Test that token works but is secure
fly auth whoami
ls -la /home/node/.fly/
cat /home/node/.fly/config.yml | head -5
```

---

## 🚀 Usage Examples

### Create New My Jarvis User and App

```bash
# 1. Create new Supabase user (you'll implement this)
# 2. Create new Fly.io app
fly apps create my-jarvis-newuser --region sjc

# 3. Deploy app
fly deploy -a my-jarvis-newuser

# 4. Create volume
fly volumes create workspace_data -a my-jarvis-newuser -s 10 -r sjc

# 5. Set secrets
fly secrets set \
  JWT_SECRET="your-jwt-secret" \
  LOGIN_URL="https://www.myjarvis.io/login" \
  OPENAI_API_KEY="your-openai-key" \
  DEPLOYMENT_MODE="web" \
  -a my-jarvis-newuser
```

### Update Existing App

```bash
# Update app with latest code
fly deploy -a my-jarvis-target --update-only

# Extend volume if needed
fly volumes list -a my-jarvis-target
fly volumes extend VOLUME_ID -s 10 -a my-jarvis-target

# Update secrets
fly secrets set OPENAI_API_KEY="new-key" -a my-jarvis-target
```

---

## 📝 Verification Checklist

After setup, verify these items:

- [ ] ✅ Fly CLI installed in `/home/node/bin/flyctl`
- [ ] ✅ Configuration directory at `/home/node/.fly/`
- [ ] ✅ Access token configured in `/home/node/.fly/config.yml`
- [ ] ✅ Environment variables set in `.bashrc`
- [ ] ✅ `fly auth whoami` returns your email
- [ ] ✅ `fly apps list` shows your My Jarvis apps
- [ ] ✅ Setup script at `/home/node/setup-flyio.sh` works
- [ ] ✅ All files have proper permissions (600 for config, 700 for directory)
- [ ] ✅ Claude workspace updated with Fly.io commands

---

## 🔄 Maintenance

### Updating Fly CLI

```bash
# Download latest version
cd /tmp
curl -L https://fly.io/install.sh | sh
mv ~/.fly/bin/flyctl /home/node/bin/flyctl
chmod +x /home/node/bin/flyctl

# Verify update
fly version
```

### Backing Up Configuration

```bash
# Backup Fly config
cp -r /home/node/.fly /home/node/.fly.backup

# List backup
ls -la /home/node/.fly.backup/
```

---

**Created**: 2025-11-23
**Purpose**: Enable Fly.io management from within My Jarvis apps
**Storage**: All configuration in persistent `/home/node` volume
**Security**: Token-based authentication with proper file permissions

**Next Steps**: Test setup in my-jarvis-erez, then implement user/app creation automation