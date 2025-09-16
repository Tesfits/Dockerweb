const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Sanitize username: allow only alphanumeric, underscore, dash
function sanitizeUsername(username) {
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error('Invalid username for Samba. Only letters, numbers, underscores, and dashes allowed.');
  }
  return username;
}

// Create user's Samba home directory
async function createSambaHome(username) {
  username = sanitizeUsername(username);
  const dir = path.join('/storage', username); // Update this path for your Samba volume/folder!
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.chmodSync(dir, 0o700);
    }
    return true;
  } catch (err) {
    throw new Error(`Samba home creation failed: ${err.message}`);
  }
}

// Add a Samba user with password, using smbpasswd via spawn
function addSambaUser(username, password) {
  username = sanitizeUsername(username);

  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password for Samba must be at least 8 characters');
  }

  return new Promise((resolve, reject) => {
    const smbpasswd = spawn('smbpasswd', ['-a', username], { stdio: ['pipe', 'pipe', 'pipe'] });

    // Send password twice to smbpasswd
    smbpasswd.stdin.write(password + '\n');
    smbpasswd.stdin.write(password + '\n');
    smbpasswd.stdin.end();

    let stderr = '';
    let stdout = '';

    smbpasswd.stdout.on('data', (data) => { stdout += data.toString(); });
    smbpasswd.stderr.on('data', (data) => { stderr += data.toString(); });

    smbpasswd.on('close', (code) => {
      if (code === 0) return resolve({ success: true, stdout });
      return reject(new Error('smbpasswd failed: ' + stderr));
    });
  });
}

module.exports = { createSambaHome, addSambaUser, sanitizeUsername };
