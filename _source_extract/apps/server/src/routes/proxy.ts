import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export const proxyRoutes = Router();
const PROXY_PATH = path.resolve(process.cwd(), 'proxy.json');

function readProxy(): any {
  if (fs.existsSync(PROXY_PATH)) return JSON.parse(fs.readFileSync(PROXY_PATH, 'utf-8'));
  return { enabled: false, type: 'http', host: '', port: 7890, username: '', password: '' };
}

proxyRoutes.get('/', (_req: Request, res: Response) => {
  res.json(readProxy());
});

proxyRoutes.post('/', (req: Request, res: Response) => {
  const cfg = { ...readProxy(), ...req.body };
  fs.writeFileSync(PROXY_PATH, JSON.stringify(cfg, null, 2));
  res.json(cfg);
});

proxyRoutes.post('/test', (_req: Request, res: Response) => {
  const proxy = readProxy();
  if (!proxy.enabled || !proxy.host) {
    res.json({ success: false, error: 'Proxy not enabled or host not set' });
    return;
  }
  const proto = proxy.type === 'socks5' ? 'socks5' : 'http';
  const proxyEnv = proto + '://' + proxy.host + ':' + proxy.port;
  res.json({ success: true, proxy: proxyEnv, config: proxy });
});
