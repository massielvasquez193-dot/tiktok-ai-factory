const { execSync } = require('child_process');
const path = require('path');

const repoPath = 'd:\\CCTK视频\\tiktok-ai-factory';

function git(cmd) {
  console.log(`> git ${cmd}`);
  try {
    const out = execSync(`git ${cmd}`, { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' });
    console.log(out.trim());
    return out;
  } catch(e) {
    console.error(`ERROR: ${e.stderr || e.message}`);
    throw e;
  }
}

console.log('=== Git Sync Start ===\n');

// Commit
git('commit -m "v2.1 Full SaaS platform release - Auth, Payments, Admin, Tenant, Tencent Cloud deploy, CI/CD, Documentation"');

// Push
git('push origin main');

// Verify
console.log('\n=== Latest commits ===');
git('log --oneline -3');

console.log('\n=== Sync Complete ===');
