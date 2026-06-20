import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const environmentRoutes = Router();

interface CheckResult {
  name: string;
  key: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  detail?: string;
}

function checkPython(): CheckResult {
  const commands = ['python3', 'python'];
  for (const cmd of commands) {
    try {
      const out = execSync(`${cmd} --version 2>&1`, { timeout: 5000, encoding: 'utf-8' }).trim();
      return { name: 'Python', key: 'python', status: 'pass', message: 'Python 正常', detail: out };
    } catch {}
  }
  try {
    // try "python --version" wrapped differently
    const out = execSync('python --version 2>&1', { timeout: 5000, encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    if (out.toLowerCase().includes('python')) {
      return { name: 'Python', key: 'python', status: 'pass', message: 'Python 正常', detail: out };
    }
  } catch {}
  return { name: 'Python', key: 'python', status: 'fail', message: 'Python 未安装或不在 PATH 中' };
}

function checkFFmpeg(): CheckResult {
  try {
    const out = execSync('ffmpeg -version 2>&1', { timeout: 5000, encoding: 'utf-8' });
    const firstLine = out.split('\n')[0]?.trim() || out.trim();
    return { name: 'FFmpeg', key: 'ffmpeg', status: 'pass', message: 'FFmpeg 正常', detail: firstLine };
  } catch {
    return { name: 'FFmpeg', key: 'ffmpeg', status: 'fail', message: 'FFmpeg 未安装或不在 PATH 中' };
  }
}

function checkEnvKey(envVar: string, name: string, key: string, prefixHint?: string): CheckResult {
  const val = process.env[envVar];
  if (!val || val.trim() === '' || val.startsWith('your_') || val === '***') {
    return { name, key, status: 'fail', message: `${name} 未配置`, detail: `环境变量 ${envVar} 为空或占位符` };
  }
  const masked = val.length > 12 ? `${val.slice(0, 6)}...${val.slice(-4)}` : '****';
  if (prefixHint && !val.startsWith(prefixHint)) {
    return { name, key, status: 'warning', message: `${name} 格式可能不正确`, detail: `当前值: ${masked}（预期前缀: ${prefixHint}）` };
  }
  try {
    // lightweight validation: call a cheap endpoint or just check format
    const testUrl =
      envVar === 'OPENAI_API_KEY'
        ? 'https://api.openai.com/v1/models'
        : envVar === 'ELEVENLABS_API_KEY'
        ? 'https://api.elevenlabs.io/v1/voices'
        : envVar === 'ARK_API_KEY'
        ? 'https://ark.cn-beijing.volces.com/api/v3/models'
        : null;

    if (testUrl) {
      // We don't actually call in prod to avoid cost — format check is enough
    }
    return { name, key, status: 'pass', message: `${name} 已配置`, detail: `Key: ${masked}` };
  } catch {
    return { name, key, status: 'pass', message: `${name} 已配置`, detail: `Key: ${masked}` };
  }
}

function checkLicense(): CheckResult {
  // Check multiple license sources
  const projectRoot = path.resolve(process.cwd(), '..', '..');
  const licensePaths = [
    path.join(projectRoot, '.license'),
    path.join(projectRoot, 'LICENSE.key'),
    path.join(process.cwd(), '.license'),
    path.join(process.cwd(), 'LICENSE.key'),
  ];

  // Also check env var
  const licenseEnv = process.env.TIKTOK_FACTORY_LICENSE;

  if (licenseEnv) {
    try {
      const [expiry] = licenseEnv.split(':');
      const expDate = new Date(expiry);
      if (expDate > new Date()) {
        const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return { name: 'License', key: 'license', status: 'pass', message: 'License 有效', detail: `剩余 ${daysLeft} 天` };
      }
      return { name: 'License', key: 'license', status: 'fail', message: 'License 已过期', detail: `过期时间: ${expDate.toISOString()}` };
    } catch {
      return { name: 'License', key: 'license', status: 'warning', message: 'License 格式异常' };
    }
  }

  for (const p of licensePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8').trim();
        const [expiry] = content.split(':');
        const expDate = new Date(expiry);
        if (expDate > new Date()) {
          const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return { name: 'License', key: 'license', status: 'pass', message: 'License 有效', detail: `剩余 ${daysLeft} 天 (文件: ${path.basename(p)})` };
        }
        return { name: 'License', key: 'license', status: 'fail', message: 'License 已过期', detail: `过期时间: ${expDate.toISOString()}` };
      } catch {
        continue;
      }
    }
  }

  return { name: 'License', key: 'license', status: 'warning', message: 'License 未激活（开发模式）', detail: '设置 TIKTOK_FACTORY_LICENSE 环境变量或放置 .license 文件' };
}

function checkNode(): CheckResult {
  const ver = process.version;
  const major = parseInt(ver.slice(1).split('.')[0], 10);
  if (major >= 18) {
    return { name: 'Node.js', key: 'node', status: 'pass', message: 'Node.js 正常', detail: ver };
  }
  return { name: 'Node.js', key: 'node', status: 'warning', message: 'Node.js 版本较低', detail: `当前 ${ver}，建议 ≥ 18` };
}

function checkDatabase(): CheckResult {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
      return { name: 'Database', key: 'database', status: 'warning', message: 'DATABASE_URL 未配置', detail: '使用默认 SQLite 或内存模式' };
    }
    // Just check connectivity marker — don't actually query here to avoid overhead
    return { name: 'Database', key: 'database', status: 'pass', message: 'Database 已配置', detail: dbUrl.replace(/\/\/.*@/, '//***@').split('?')[0] };
  } catch {
    return { name: 'Database', key: 'database', status: 'warning', message: 'Database 配置检查失败' };
  }
}

function checkRedis(): CheckResult {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (redisUrl) {
    return { name: 'Redis', key: 'redis', status: 'pass', message: 'Redis 已配置', detail: redisUrl.includes('@') ? redisUrl.replace(/\/\/.*@/, '//***@') : redisUrl };
  }
  return { name: 'Redis', key: 'redis', status: 'warning', message: 'Redis 未配置（队列不可用）' };
}

environmentRoutes.get('/check', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const hostname = process.env.HOSTNAME || 'localhost';

  const checks: CheckResult[] = [
    checkNode(),
    checkPython(),
    checkFFmpeg(),
    checkEnvKey('OPENAI_API_KEY', 'OpenAI', 'openai', 'sk-'),
    checkEnvKey('ELEVENLABS_API_KEY', 'ElevenLabs', 'elevenlabs'),
    checkEnvKey('ARK_API_KEY', 'ARK (Volcengine)', 'ark'),
    checkDatabase(),
    checkRedis(),
    checkLicense(),
  ];

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;

  const overall = failCount === 0 ? (warnCount === 0 ? 'healthy' : 'degraded') : 'unhealthy';

  res.json({
    success: true,
    timestamp,
    hostname,
    overall,
    summary: { total: checks.length, pass: passCount, fail: failCount, warning: warnCount },
    checks,
  });
});
