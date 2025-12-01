# How flyctl Automation Actually Works

**Date:** October 14, 2025
**Question:** "How do you automate flyctl? Do you need to install CLI? How does it execute?"

---

## 🎯 The Simple Answer

**Yes, flyctl needs to be installed**, but automation works just like any other CLI tool (git, npm, docker).

You write scripts that **call flyctl commands** using:
- Node.js: `child_process.exec()` or `child_process.spawn()`
- Python: `subprocess.run()`
- Bash: Direct command execution
- GitHub Actions: Pre-installed flyctl in runners

---

## 🔧 How It Actually Works

### Step 1: Install flyctl Once

**On your laptop:**
```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# OR via Homebrew
brew install flyctl

# OR via npm
npm install -g @flydotio/fly
```

**On CI/CD (GitHub Actions):**
```yaml
# flyctl is pre-installed in GitHub runners
# OR install it:
- uses: superfly/flyctl-actions/setup-flyctl@master
```

---

### Step 2: Authenticate Non-Interactively

**Traditional way (manual):**
```bash
flyctl auth login  # Opens browser, you click "allow"
```

**Automation way (no interaction):**
```bash
# Set token as environment variable
export FLY_API_TOKEN="FlyV1 fm2_lJPE..."

# Now flyctl uses this token automatically
flyctl deploy  # No login prompt!
```

**How it works:**
- flyctl checks for `FLY_API_TOKEN` environment variable
- If found, uses it for all API calls
- No browser, no prompts, perfect for automation

---

### Step 3: Execute Commands from Scripts

### Example 1: Node.js (Simple)

```javascript
const { execSync } = require('child_process');

// Set token in environment
process.env.FLY_API_TOKEN = 'your-token';

// Run flyctl command
const result = execSync('flyctl deploy', {
  cwd: '/path/to/project',
  encoding: 'utf8'
});

console.log(result);
```

### Example 2: Node.js (Advanced - Real-time Output)

```javascript
const { spawn } = require('child_process');

// Spawn flyctl as a child process
const deploy = spawn('flyctl', ['deploy'], {
  cwd: '/path/to/project',
  env: {
    ...process.env,
    FLY_API_TOKEN: 'your-token'
  }
});

// Stream output in real-time
deploy.stdout.on('data', (data) => {
  console.log(data.toString());
});

deploy.stderr.on('data', (data) => {
  console.error(data.toString());
});

deploy.on('close', (code) => {
  console.log(`Deployment finished with code ${code}`);
});
```

### Example 3: Python

```python
import subprocess
import os

# Set token
os.environ['FLY_API_TOKEN'] = 'your-token'

# Run flyctl
result = subprocess.run(
    ['flyctl', 'deploy'],
    cwd='/path/to/project',
    capture_output=True,
    text=True
)

print(result.stdout)
```

### Example 4: Bash Script

```bash
#!/bin/bash

# Set token
export FLY_API_TOKEN="your-token"

# Change to project directory
cd /path/to/project

# Deploy
flyctl deploy

# Get status
flyctl status
```

### Example 5: GitHub Actions

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Fly.io
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        run: |
          flyctl deploy --remote-only
```

---

## 🧩 Breaking Down the Example Script

Let's look at `deploy-script-example.js`:

### Part 1: Check if flyctl is Installed

```javascript
try {
  const version = execSync('flyctl version', { encoding: 'utf8' });
  console.log('✅ flyctl installed:', version);
} catch (error) {
  console.log('❌ flyctl not found - please install it');
  process.exit(1);
}
```

**What this does:**
- Tries to run `flyctl version`
- If it works, flyctl is installed
- If it fails, show installation instructions

### Part 2: Set Authentication

```javascript
const CONFIG = {
  flyApiToken: process.env.FLY_API_TOKEN,
};

// Later, when running commands:
execSync('flyctl deploy', {
  env: {
    ...process.env,           // Keep existing env vars
    FLY_API_TOKEN: CONFIG.flyApiToken  // Add token
  }
});
```

**What this does:**
- Reads token from environment variable
- Passes it to flyctl via environment
- flyctl automatically uses it for authentication

### Part 3: Run Deployment

```javascript
const deploy = spawn('flyctl', ['deploy'], {
  cwd: CONFIG.projectPath,  // Run in project directory
  env: {
    ...process.env,
    FLY_API_TOKEN: CONFIG.flyApiToken
  },
  stdio: 'inherit'  // Show flyctl output in real-time
});

deploy.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Success!');
  } else {
    console.log('❌ Failed');
  }
});
```

**What this does:**
- Spawns flyctl as a separate process
- Passes working directory and environment
- Streams output in real-time
- Handles success/failure

---

## 🔑 Key Concepts

### 1. flyctl is Just a Program

```bash
# These are all the same concept:
git status        # Git CLI
npm install       # npm CLI
docker build .    # Docker CLI
flyctl deploy     # Fly.io CLI

# They can all be called from scripts!
```

### 2. Environment Variables = Authentication

```bash
# Git
export GIT_TOKEN="..."

# Docker
export DOCKER_PASSWORD="..."

# Fly.io
export FLY_API_TOKEN="..."

# All work the same way!
```

### 3. Child Processes = Automation

```javascript
// JavaScript can run ANY command
execSync('git status')
execSync('npm install')
execSync('docker build')
execSync('flyctl deploy')

// It's all the same mechanism!
```

---

## 🚀 Real-World Example: CI/CD Pipeline

### Scenario: Deploy on Every Git Push

```javascript
// hooks/post-commit
#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Auto-deploying to Fly.io...');

try {
  // Run deployment
  execSync('flyctl deploy --remote-only', {
    env: {
      ...process.env,
      FLY_API_TOKEN: process.env.FLY_API_TOKEN
    },
    stdio: 'inherit'
  });

  console.log('✅ Deployed successfully!');
} catch (error) {
  console.log('❌ Deployment failed');
  process.exit(1);
}
```

**Result:** Every time you `git commit`, it auto-deploys!

---

## 💡 Why This Approach Works

### Advantages

1. **Standard Practice**
   - This is how GitHub Actions works
   - This is how CircleCI works
   - This is how every CI/CD platform works

2. **Simple & Reliable**
   - flyctl is battle-tested
   - Handles edge cases you'd miss
   - Gets updates and bug fixes

3. **Full Features**
   - Access all flyctl commands
   - No API limitations
   - Future-proof as Fly adds features

4. **Easy Debugging**
   - Can run commands manually
   - Can see exact output
   - Can test locally first

---

## 🎓 Mental Model

### Before (Wrong Thinking):

```
❌ "CLI tools are manual, APIs are automated"
❌ "I need to avoid CLI to be professional"
❌ "Automation means pure HTTP requests"
```

### After (Correct Thinking):

```
✅ "CLI tools can be scripted"
✅ "Automation means removing manual steps"
✅ "Use the right tool for the job"
```

### Analogy:

**Git Example:**
```javascript
// Would you write this?
fetch('https://github.com/api/repos/.../commits', {
  method: 'POST',
  body: JSON.stringify({ message: 'feat: new feature' })
})

// Or this?
execSync('git commit -m "feat: new feature"')

// The CLI is SIMPLER and more reliable!
```

**Same with Fly.io:**
```javascript
// Complex: Build image, push to registry, create machine
// 100+ lines of code, error-prone

// Simple: Let flyctl handle it
execSync('flyctl deploy')
```

---

## 📊 Comparison: CLI vs Pure API

| Aspect | Using flyctl | Pure API |
|--------|-------------|----------|
| **Lines of Code** | 10 | 100+ |
| **Error Handling** | Built-in | You write it |
| **Build Support** | Yes | No |
| **Future Features** | Automatic | You update |
| **Debugging** | Easy | Complex |
| **Setup Time** | 5 min | Hours |

---

## 🎯 Recommendation

### For My Jarvis Desktop:

**Phase 1: Use the Script**
```bash
# 1. Install flyctl once
curl -L https://fly.io/install.sh | sh

# 2. Set your token
export FLY_API_TOKEN="your-token"

# 3. Run the deployment script
node deploy-script-example.js
```

**What Happens:**
1. Script checks prerequisites
2. Authenticates using your token
3. Creates app (if needed)
4. Deploys using flyctl
5. Shows you the URL

**Time:** 5-10 minutes (first time)
**Maintenance:** Almost zero
**Reliability:** Very high

---

## 🔮 Future: Hybrid Approach

**Once you need multi-container:**

```javascript
// Step 1: Build once using flyctl
execSync('flyctl deploy --build-only')

// Step 2: Create 100 machines using API
for (const user of users) {
  await fetch('POST /v1/apps/my-app/machines', {
    headers: { Authorization: `Bearer ${FLY_API_TOKEN}` },
    body: JSON.stringify({
      config: {
        image: 'registry.fly.io/my-app:latest',
        env: { USER_ID: user.id }
      }
    })
  })
}
```

**Best of both worlds!**

---

## 📝 Quick Reference

### Installing flyctl:
```bash
curl -L https://fly.io/install.sh | sh
```

### Setting token:
```bash
export FLY_API_TOKEN="your-token"
```

### Running from Node.js:
```javascript
execSync('flyctl deploy', {
  env: { ...process.env, FLY_API_TOKEN: 'token' }
})
```

### Running from Python:
```python
subprocess.run(['flyctl', 'deploy'],
  env={'FLY_API_TOKEN': 'token'})
```

### Running from Bash:
```bash
FLY_API_TOKEN="token" flyctl deploy
```

---

**Bottom Line:** flyctl automation is just running CLI commands from scripts. It's simple, standard, and works great! 🚀
