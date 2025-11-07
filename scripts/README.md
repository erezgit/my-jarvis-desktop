# My Jarvis Deployment Scripts

## Directory Structure

```
scripts/
├── setup-new-app.sh       # Main setup script for NEW deployments
├── docker-entrypoint.sh   # Container startup (automatic)
├── health-check.sh        # Health monitoring
├── health-monitor.sh      # Health monitoring daemon
├── after-pack.js         # Electron packaging helper
└── legacy-fixes/          # Old hotfixes (NOT for new apps)
    ├── README.md
    ├── hotfix-claude-config.sh
    ├── hotfix-claude-login.sh
    └── init-claude-config.sh
```

## For NEW App Deployments

Use **ONLY** `setup-new-app.sh` - this script handles everything needed for a new deployment:
- Copies all template files
- Creates Claude configuration for chat history
- Sets up voice generation with OpenAI key
- Fixes all file permissions

## For EXISTING Apps (Legacy)

The `legacy-fixes/` directory contains hotfixes for apps deployed before November 2025.
- Only use these if your app is missing specific functionality
- New apps do NOT need these scripts

## Script Purposes

| Script | Purpose | When Used |
|--------|---------|-----------|
| `setup-new-app.sh` | Complete initialization for new apps | Once, after first deployment |
| `docker-entrypoint.sh` | Container startup, permission fixes | Automatic on every container start |
| `health-check.sh` | Check app health status | Manual or automated monitoring |
| `health-monitor.sh` | Continuous health monitoring | Optional daemon process |
| `after-pack.js` | Electron app packaging | During desktop build only |

## Important Notes

- **Claude Code Authentication**: Users must run `claude login` in the terminal to authenticate
- **Voice Generation**: Works immediately with included OpenAI key (temporary for onboarding)
- **Chat History**: Automatically configured by setup-new-app.sh