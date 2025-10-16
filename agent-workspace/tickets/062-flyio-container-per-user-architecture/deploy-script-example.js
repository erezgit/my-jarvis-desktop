#!/usr/bin/env node
/**
 * Automated Deployment Script for My Jarvis Desktop on Fly.io
 *
 * This script demonstrates how to programmatically deploy to Fly.io
 * by calling flyctl CLI commands from Node.js.
 *
 * Usage:
 *   node deploy-script-example.js
 *
 * Prerequisites:
 *   1. flyctl installed: curl -L https://fly.io/install.sh | sh
 *   2. FLY_API_TOKEN environment variable set
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
  appName: 'my-jarvis-desktop',
  projectPath: path.join(__dirname, '../../projects/my-jarvis-desktop'),
  flyApiToken: process.env.FLY_API_TOKEN,
};

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Step 1: Check Prerequisites
 * Verify that flyctl is installed and accessible
 */
function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');

  // Check if flyctl is installed
  try {
    const version = execSync('flyctl version', { encoding: 'utf8' });
    log(`✅ flyctl is installed: ${version.trim()}`, 'green');
  } catch (error) {
    log('❌ flyctl is not installed!', 'red');
    log('\nInstall it with:', 'yellow');
    log('  curl -L https://fly.io/install.sh | sh', 'yellow');
    log('  OR');
    log('  brew install flyctl', 'yellow');
    process.exit(1);
  }

  // Check if API token is set
  if (!CONFIG.flyApiToken) {
    log('❌ FLY_API_TOKEN environment variable not set!', 'red');
    log('\nSet it with:', 'yellow');
    log('  export FLY_API_TOKEN="your-token-here"', 'yellow');
    process.exit(1);
  }

  log('✅ API token is set', 'green');

  // Check if project directory exists
  try {
    const stat = require('fs').statSync(CONFIG.projectPath);
    if (!stat.isDirectory()) {
      throw new Error('Not a directory');
    }
    log(`✅ Project directory exists: ${CONFIG.projectPath}`, 'green');
  } catch (error) {
    log(`❌ Project directory not found: ${CONFIG.projectPath}`, 'red');
    process.exit(1);
  }
}

/**
 * Step 2: Verify Authentication
 * Test that the API token works
 */
function verifyAuthentication() {
  log('\n🔐 Verifying authentication...', 'cyan');

  try {
    // Try to list apps - this will fail if token is invalid
    const result = execSync('flyctl apps list', {
      env: {
        ...process.env,
        FLY_API_TOKEN: CONFIG.flyApiToken,
      },
      encoding: 'utf8',
    });

    log('✅ Authentication successful', 'green');

    // Check if our app exists
    if (result.includes(CONFIG.appName)) {
      log(`✅ App "${CONFIG.appName}" already exists`, 'green');
      return true;
    } else {
      log(`⚠️  App "${CONFIG.appName}" not found - will be created`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Authentication failed!', 'red');
    log('Please check your FLY_API_TOKEN', 'red');
    process.exit(1);
  }
}

/**
 * Step 3: Create App (if it doesn't exist)
 * This uses flyctl to create the app
 */
function createApp() {
  log('\n📦 Creating app...', 'cyan');

  try {
    // flyctl launch with --no-deploy creates app without deploying
    // It will use fly.toml if it exists
    execSync(`flyctl launch --name ${CONFIG.appName} --no-deploy --copy-config --yes`, {
      cwd: CONFIG.projectPath,
      env: {
        ...process.env,
        FLY_API_TOKEN: CONFIG.flyApiToken,
      },
      stdio: 'inherit', // Show output in real-time
    });

    log('✅ App created successfully', 'green');
  } catch (error) {
    // If app already exists, flyctl will error but we can continue
    if (error.message.includes('already exists')) {
      log('✅ App already exists, continuing...', 'yellow');
    } else {
      log('❌ Failed to create app', 'red');
      throw error;
    }
  }
}

/**
 * Step 4: Deploy the Application
 * This is the main deployment step
 */
async function deployApplication() {
  log('\n🚀 Deploying application...', 'cyan');
  log('This may take 5-10 minutes for the first build...', 'yellow');

  return new Promise((resolve, reject) => {
    // Use spawn instead of execSync to stream output in real-time
    const deploy = spawn('flyctl', ['deploy'], {
      cwd: CONFIG.projectPath,
      env: {
        ...process.env,
        FLY_API_TOKEN: CONFIG.flyApiToken,
      },
      stdio: 'inherit', // Show flyctl output in real-time
    });

    deploy.on('close', (code) => {
      if (code === 0) {
        log('\n✅ Deployment successful!', 'green');
        resolve();
      } else {
        log(`\n❌ Deployment failed with code ${code}`, 'red');
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });

    deploy.on('error', (error) => {
      log('\n❌ Failed to run flyctl deploy', 'red');
      reject(error);
    });
  });
}

/**
 * Step 5: Get Deployment Info
 * Show the URL and status
 */
function getDeploymentInfo() {
  log('\n📊 Getting deployment info...', 'cyan');

  try {
    // Get app status
    const status = execSync('flyctl status', {
      cwd: CONFIG.projectPath,
      env: {
        ...process.env,
        FLY_API_TOKEN: CONFIG.flyApiToken,
      },
      encoding: 'utf8',
    });

    log('\n' + status, 'blue');

    // Get the app URL
    const url = `https://${CONFIG.appName}.fly.dev`;
    log('\n🌐 Your app is live at:', 'green');
    log(`   ${url}`, 'cyan');
    log('\n💡 To test the terminal:', 'yellow');
    log(`   1. Open ${url}`, 'yellow');
    log('   2. Go to Settings → Terminal', 'yellow');
    log('   3. Click "Integrated Terminal"', 'yellow');

    return url;
  } catch (error) {
    log('⚠️  Could not get deployment info', 'yellow');
    return null;
  }
}

/**
 * Main Execution Flow
 */
async function main() {
  try {
    log('=' .repeat(60), 'blue');
    log('  Fly.io Deployment Script for My Jarvis Desktop', 'blue');
    log('=' .repeat(60), 'blue');

    // Step 1: Check prerequisites
    checkPrerequisites();

    // Step 2: Verify authentication
    const appExists = verifyAuthentication();

    // Step 3: Create app if needed
    if (!appExists) {
      createApp();
    }

    // Step 4: Deploy
    await deployApplication();

    // Step 5: Show deployment info
    const url = getDeploymentInfo();

    log('\n' + '=' .repeat(60), 'green');
    log('  🎉 Deployment Complete!', 'green');
    log('=' .repeat(60), 'green');

    if (url) {
      log(`\nYour app: ${url}\n`, 'cyan');
    }

    process.exit(0);
  } catch (error) {
    log('\n❌ Deployment failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the script
main();
