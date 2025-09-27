const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const { appOutDir, electronPlatformName } = context;

  // Determine the path to the packaged server directory
  let serverPath;
  if (electronPlatformName === 'darwin') {
    serverPath = path.join(appOutDir, 'MyJarvisDesktop.app', 'Contents', 'Resources', 'claude-webui-server');
  } else if (electronPlatformName === 'win32') {
    serverPath = path.join(appOutDir, 'resources', 'claude-webui-server');
  } else {
    serverPath = path.join(appOutDir, 'resources', 'claude-webui-server');
  }

  console.log(`Installing dependencies in packaged server: ${serverPath}`);

  if (fs.existsSync(serverPath)) {
    try {
      // Install dependencies in the packaged server directory
      execSync('npm install --production', {
        cwd: serverPath,
        stdio: 'inherit'
      });
      console.log('✅ Server dependencies installed successfully');
    } catch (error) {
      console.error('❌ Failed to install server dependencies:', error.message);
      throw error;
    }
  } else {
    console.error('❌ Server path not found:', serverPath);
  }
};