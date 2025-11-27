# Quick Upgrade Checklist

## Replace [APP_NAME] with actual app name

### Pre-Check
```bash
fly status --app [APP_NAME]
fly releases --app [APP_NAME] | head -3
fly secrets list --app [APP_NAME]
```

### Upgrade Steps (Execute in Order)

1. **Deploy Latest Code**
```bash
fly deploy --app [APP_NAME] --update-only
```

2. **Add MCP Server**
```bash
fly ssh console -a [APP_NAME] -C "cp /app/workspace-template/jarvis-mcp-server.js /home/node/jarvis-mcp-server.js"
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/jarvis-mcp-server.js"
```

3. **Create Uploads Directory**
```bash
fly ssh console -a [APP_NAME] -C "mkdir -p /home/node/my-jarvis/uploads"
fly ssh console -a [APP_NAME] -C "chown -R node:node /home/node/my-jarvis/uploads"
```

4. **Update CLAUDE.md**
```bash
fly ssh console -a [APP_NAME] -C "cp /app/workspace-template/CLAUDE.md /home/node/CLAUDE.md"
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/CLAUDE.md"
```

5. **Set Environment Variables**
```bash
fly secrets set OPENAI_API_KEY="[YOUR_OPENAI_API_KEY]" WORKSPACE_DIR="/home/node" --app [APP_NAME]
fly secrets set DEPLOYMENT_MODE="web" --app [APP_NAME]
```

6. **Update MCP Configuration**
```bash
fly ssh console -a [APP_NAME] -C "python3 -c \"
import json
with open('/home/node/.claude.json', 'r') as f:
    config = json.load(f)
config['projects']['/home/node']['mcpServers'] = {
    'jarvis-tools': {
        'command': 'node',
        'args': ['./jarvis-mcp-server.js'],
        'env': {
            'OPENAI_API_KEY': '\${OPENAI_API_KEY}',
            'WORKSPACE_DIR': '\${WORKSPACE_DIR}'
        }
    }
}
with open('/home/node/.claude.json', 'w') as f:
    json.dump(config, f, indent=2)
print('MCP configuration updated successfully')
\""
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/.claude.json"
```

7. **Restart App**
```bash
fly apps restart [APP_NAME]
sleep 15
```

8. **Test Voice Generation**
```bash
fly ssh console -a [APP_NAME] -C "python3 /home/node/tools/src/cli/auto_jarvis_voice.py 'Upgrade complete' --voice nova --output-dir /home/node/tools/voice --json-output"
```

### Final Verification
- [ ] Health check: `curl https://[APP_NAME].fly.dev/health`
- [ ] Voice test via Claude interface
- [ ] All secrets present: `fly secrets list --app [APP_NAME]`
- [ ] MCP config correct: `fly ssh console -a [APP_NAME] -C "grep -A 10 'mcpServers' /home/node/.claude.json"`

## Critical Notes
- ✅ Use **relative path** `"./jarvis-mcp-server.js"` in MCP config
- ✅ **NEVER delete** app or volume - only update
- ✅ **Test voice** after each upgrade
- ✅ **Wait for health** after restart before testing