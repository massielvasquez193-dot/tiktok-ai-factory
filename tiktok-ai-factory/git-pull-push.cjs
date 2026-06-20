const { execSync } = require('child_process');
const cwd = 'd:\\CCTK视频\\tiktok-ai-factory';

function run(cmd, label) {
  console.log(`\n=== ${label} ===`);
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    console.log(out.trim());
    console.log(`${label} - OK`);
  } catch(e) {
    console.error(`${label} FAILED:`, e.stderr || e.message);
    process.exit(1);
  }
}

run('git pull --rebase origin main', 'PULL');
run('git push origin main', 'PUSH');
run('git log --oneline -5', 'VERIFY');
