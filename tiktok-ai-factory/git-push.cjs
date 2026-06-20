const { execSync } = require('child_process');
console.log('Pushing to GitHub...');
try {
  const out = execSync('git push origin main 2>&1', { cwd: 'd:\\CCTK视频\\tiktok-ai-factory', encoding: 'utf-8' });
  console.log(out);
  console.log('SUCCESS');
} catch(e) {
  console.error('PUSH FAILED:', e.stderr || e.message);
}
