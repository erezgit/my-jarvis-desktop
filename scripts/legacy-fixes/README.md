# Legacy Fixes Directory

## ⚠️ IMPORTANT: These scripts are NOT for new apps!

These scripts are hotfixes for apps that were deployed BEFORE November 2025.

### When to Use These Scripts

Only use these scripts if you have an EXISTING app that's experiencing specific issues:

1. **hotfix-claude-config.sh** - If chat history is broken (apps deployed before node user migration)
2. **hotfix-claude-login.sh** - DEPRECATED - Users should run `claude login` in terminal instead
3. **init-claude-config.sh** - DEPRECATED - Functionality moved to setup-new-app.sh

### For NEW Apps

**DO NOT USE THESE SCRIPTS!**

New apps should only use `/app/scripts/setup-new-app.sh` which handles everything.

---

These scripts are kept for backwards compatibility with existing deployments only.