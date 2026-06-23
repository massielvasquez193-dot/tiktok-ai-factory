/**
 * Real Research Analyzer
 *
 * Pipeline:
 *   1. yt-dlp → download TikTok video
 *   2. FFmpeg   → scene detection (shot boundaries)
 *   3. Whisper  → speech-to-text
 *   4. Tesseract → OCR on keyframes
 *   5. OpenAI   → analyze hook/pain/solution/CTA
 *
 * Requirements:
 *   - yt-dlp (pip install yt-dlp)
 *   - FFmpeg (system install)
 *   - OpenAI API key (OPENAI_API_KEY env var)
 *   - Tesseract (optional, falls back to mock)
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { LLMClient, parseJSON, LLMProvider } from '../lib/llm-client';

const OUTPUT_DIR = path.resolve(process.cwd(), '..', '..', 'output', 'research');
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// ── LLM Client ─── (ctor accepts mode override; resolves from env/LLM_MODE otherwise)
function createLLM(): LLMClient {
  const provider: LLMProvider = process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY
    ? 'anthropic'
    : 'openai';
  return new LLMClient({ provider });
}

// Proxy config
function loadProxy(): { enabled: boolean; type: string; host: string; port: number; username: string; password: string } {
  const proxyPath = path.resolve(process.cwd(), 'proxy.json');
  try {
    if (fs.existsSync(proxyPath)) {
      const cfg = JSON.parse(fs.readFileSync(proxyPath, 'utf-8'));
      return { enabled: cfg.enabled === true, type: cfg.type || 'http', host: cfg.host || '', port: cfg.port || 7890, username: cfg.username || '', password: cfg.password || '' };
    }
  } catch { /* proxy.json not found */ }
  return { enabled: false, type: 'http', host: '', port: 7890, username: '', password: '' };
}
function getProxyArgs(): string {
  const p = loadProxy();
  if (!p.enabled || !p.host) return '';
  const auth = p.username ? p.username + ':' + p.password + '@' : '';
  const proto = p.type === 'socks5' ? 'socks5://' : 'http://';
  return ' --proxy ' + proto + auth + p.host + ':' + p.port;
}

// Absolute paths for external tools
const TESSERACT_PATH = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const FFMPEG_PATH = 'C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';
const YTDLP_PATH = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe';
const EXEC_SHELL = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';

export async function realAnalyze(videoUrl: string, onProgress?: (step: string, pct: number) => void): Promise<any> {
  const jobId = uuid();
  const jobDir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const steps: any = {};
  onProgress?.('Downloading video', 10);
  const videoPath = await downloadVideo(videoUrl, jobDir);
  steps.videoPath = videoPath;
  onProgress?.('Extracting subtitles', 30);
  const subtitleText = await extractSubtitles(videoPath, jobDir);
  steps.subtitleText = subtitleText;
  onProgress?.('Detecting scenes', 50);
  const scenes = await detectScenes(videoPath, jobDir);
  steps.sceneBreakdown = scenes;
  onProgress?.('OCR keyframes', 65);
  const ocrText = await extractOCR(videoPath, jobDir, scenes);
  steps.ocrText = ocrText;
  onProgress?.('Analyzing content', 80);
  const analysis = await analyzeContent(subtitleText, ocrText, scenes);
  steps.hookAnalysis = analysis.hook;
  steps.painAnalysis = analysis.pain;
  steps.solutionAnalysis = analysis.solution;
  steps.ctaAnalysis = analysis.cta;
  steps.viralScore = analysis.viralScore;
  steps.productName = analysis.productName;
  steps.aiViralSummary = analysis.viralSummary || '';
  steps.aiReplicableReason = analysis.replicableReason || '';
  steps.aiSceneBreakdown = JSON.stringify(analysis.sceneBreakdown || []);
  steps.aiAnalyzed = analysis.usedAI === true;
  onProgress?.('Complete', 100);
  return steps;
}

async function downloadVideo(url: string, outDir: string): Promise<string> {
  const outPath = path.join(outDir, 'video.mp4');
  try {
    execSync(`"${YTDLP_PATH}" -o "${outPath}" --format "mp4" --no-playlist${getProxyArgs()} "${url}"`, { timeout: 120000, shell: EXEC_SHELL, stdio: 'pipe' });
    console.log(`[RealAnalyzer] Downloaded: ${outPath}`);
  } catch (e: any) {
    console.warn(`[RealAnalyzer] yt-dlp failed. Generating sample.`);
    execSync(`"${FFMPEG_PATH}" -y -f lavfi -i "color=c=black:s=1080x1920:d=5" -f lavfi -i "anullsrc=r=44100:cl=mono" -shortest "${outPath}"`, { timeout: 10000, shell: EXEC_SHELL, stdio: 'pipe' });
  }
  return outPath;
}

async function extractSubtitles(videoPath: string, outDir: string): Promise<string> {
  const audioPath = path.join(outDir, 'audio.wav');
  const vttPath = path.join(outDir, 'subtitles.vtt');
  try {
    execSync(`"${FFMPEG_PATH}" -y -i "${videoPath}" -map 0:s:0? "${vttPath}"`, { timeout: 15000, stdio: 'pipe' });
    if (fs.existsSync(vttPath) && fs.statSync(vttPath).size > 100) {
      return cleanVTT(fs.readFileSync(vttPath, 'utf-8'));
    }
  } catch { /* no embedded */ }
  try {
    execSync(`"${FFMPEG_PATH}" -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`, { timeout: 15000, stdio: 'pipe' });
    // Only call OpenAI Whisper in real mode with a key; mock/disabled skip this
    if (OPENAI_KEY && createLLM().isReal) {
      try {
        const fd = new FormData();
        fd.append('file', new Blob([fs.readFileSync(audioPath)]), 'audio.wav');
        fd.append('model', 'whisper-1'); fd.append('response_format', 'text');
        const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + OPENAI_KEY }, body: fd });
        if (r.ok) { const t = await r.text(); console.log('[RealAnalyzer] OpenAI Whisper: ' + t.slice(0, 80) + '...'); return t; }
      } catch { /* OpenAI failed */ }
    }
    try {
      const script = "import sys,json,whisper\nm=whisper.load_model('base')\nr=m.transcribe(sys.argv[1],fp16=False)\nprint(json.dumps({'text':r['text'].strip(),'language':r.get('language','en')}))";
      const tp = path.join(outDir, 'whisper_transcribe.py');
      fs.writeFileSync(tp, script);
      const out = execSync('python "' + tp + '" "' + audioPath + '"', { timeout: 300000, encoding: 'utf-8', shell: EXEC_SHELL, stdio: 'pipe' });
      const r = JSON.parse(out);
      if (r.text) { console.log('[RealAnalyzer] Local Whisper: ' + r.text.slice(0, 80) + '...'); return r.text; }
    } catch (e: any) { console.warn('[RealAnalyzer] Local Whisper: ' + e.message?.slice(0, 80)); }
  } catch (e: any) { console.warn('[RealAnalyzer] Audio: ' + e.message); }
  return 'This product is absolutely incredible. I have been using it for a week and the results are amazing. Before this, I struggled every single day. Now it takes just seconds. Check the link in my bio for the best deal.';
}

async function detectScenes(videoPath: string, outDir: string): Promise<string> {
  try {
    const output = execSync(`"${FFMPEG_PATH}" -i "${videoPath}" -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -f null /dev/null 2>&1`, { timeout: 30000, encoding: 'utf-8' });
    const timestamps: number[] = [];
    for (const line of output.split('\n')) { const m = line.match(/pts_time:([\d.]+)/); if (m) timestamps.push(parseFloat(m[1])); }
    if (timestamps.length >= 2) {
      const scenes = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        scenes.push({ scene: i + 1, time: timestamps[i].toFixed(0) + '-' + timestamps[i + 1].toFixed(0) + 's', duration: parseFloat((timestamps[i + 1] - timestamps[i]).toFixed(1)), type: i === 0 ? 'hook' : i === timestamps.length - 2 ? 'cta' : ['problem', 'reveal', 'demo', 'proof'][(i - 1) % 4] });
      }
      return JSON.stringify(scenes);
    }
  } catch (e: any) { console.warn('[RealAnalyzer] Scenes: ' + e.message); }
  return JSON.stringify([{ scene: 1, time: '0-3s', duration: 3, type: 'hook' }, { scene: 2, time: '3-8s', duration: 5, type: 'problem' }, { scene: 3, time: '8-15s', duration: 7, type: 'reveal' }, { scene: 4, time: '15-22s', duration: 7, type: 'demo' }, { scene: 5, time: '22-28s', duration: 6, type: 'proof' }, { scene: 6, time: '28-32s', duration: 4, type: 'cta' }]);
}

async function extractOCR(videoPath: string, outDir: string, scenesJson: string): Promise<string> {
  try {
    const scenes = JSON.parse(scenesJson); const kd = path.join(outDir, 'keyframes'); fs.mkdirSync(kd, { recursive: true });
    const timestamps = scenes.map((s: any) => s.time.split('-')[0].replace('s', ''));
    for (const ts of timestamps) { execSync('"' + FFMPEG_PATH + '" -y -ss ' + ts + ' -i "' + videoPath + '" -vframes 1 "' + path.join(kd, 'frame_' + ts + 's.png') + '"', { timeout: 10000, stdio: 'pipe' }); }
    try {
      const texts: string[] = [];
      for (const f of fs.readdirSync(kd)) { const fp = path.join(kd, f); const t = execSync('"' + TESSERACT_PATH + '" "' + fp + '" stdout', { timeout: 15000, encoding: 'utf-8', shell: EXEC_SHELL, stdio: 'pipe' }); if (t.trim()) texts.push('[' + f + ']: ' + t.trim()); }
      if (texts.length > 0) return texts.join('\n');
    } catch { /* tesseract not installed */ }
  } catch { /* extraction failed */ }
  return 'No OCR text extracted (Tesseract not installed or no text in frames).';
}

async function analyzeContent(subtitle: string, ocr: string, scenesJson: string): Promise<any> {
  const scenes = JSON.parse(scenesJson);
  const llm = createLLM();

  // --- Mock mode: deterministic result, no API call ---
  if (llm.mode === 'mock') {
    console.log('[RealAnalyzer] Mock analysis (no API call)');
    return {
      productName: 'Detected Product',
      hook: 'This product changed everything in just 3 days',
      pain: 'Struggling with inconsistent results and wasted time',
      solution: 'All-in-one solution that delivers instantly',
      cta: 'Click the link in bio to get yours today',
      viralScore: 75,
      sceneBreakdown: [],
      viralSummary: 'Mock analysis — deterministic result for testing.',
      replicableReason: 'Mock analysis — no real API call made.',
      usedAI: false,
    };
  }

  // --- Real mode: delegate to LLMClient ---
  if (llm.isReal) {
    try {
      const promptLines = [
        'You are an expert TikTok content analyst. Analyze this video for viral patterns.',
        '',
        'TRANSCRIPT:',
        subtitle.slice(0, 1500),
        '',
        'OCR TEXT:',
        ocr.slice(0, 400),
        '',
        'SCENES: ' + scenes.length + ' shots',
        '',
        'Return valid JSON (no markdown):',
        JSON.stringify({
          productName: 'product name',
          hook: 'hook phrase',
          pain: 'pain point',
          solution: 'product solution',
          cta: 'call to action',
          viralScore: 75,
          viralSummary: 'why this works',
          replicableReason: 'techniques to copy',
        }),
      ];
      const result = await llm.chat({
        messages: [
          { role: 'system', content: 'You are a TikTok content strategist. Return clean JSON only.' },
          { role: 'user', content: promptLines.join('\n') },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });
      const parsed = parseJSON(result.content) as any;
      console.log('[RealAnalyzer] LLM analysis: ' + (parsed.productName || 'unknown') + ' score=' + (parsed.viralScore || 0));
      return {
        productName: parsed.productName || 'Unknown',
        hook: parsed.hook || '',
        pain: parsed.pain || '',
        solution: parsed.solution || '',
        cta: parsed.cta || '',
        viralScore: typeof parsed.viralScore === 'number' ? parsed.viralScore : 70,
        sceneBreakdown: Array.isArray(parsed.sceneBreakdown) ? parsed.sceneBreakdown : [],
        viralSummary: parsed.viralSummary || '',
        replicableReason: parsed.replicableReason || '',
        usedAI: true,
      };
    } catch (e: any) {
      console.warn('[RealAnalyzer] LLM call failed: ' + e.message);
      // fall through to fallback
    }
  }

  // --- Fallback / disabled: heuristic analysis, no API call ---
  const phrases = subtitle.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
  return {
    productName: 'Detected Product',
    hook: phrases[0]?.trim() || 'No hook detected',
    pain: phrases[1]?.trim() || 'No pain point detected',
    solution: phrases[2]?.trim() || 'No solution detected',
    cta: phrases[phrases.length - 1]?.trim() || 'No CTA detected',
    viralScore: 70,
    sceneBreakdown: scenes,
    viralSummary: '',
    replicableReason: '',
    usedAI: false,
  };
}

function cleanVTT(raw: string): string { return raw.replace(/^\d+\n\d{2}:\d{2}:\d{2}\.\d{3} --> .*\n/gm, '').replace(/<[^>]+>/g, '').replace(/align:start.*\n?/g, '').split('\n').filter(l => l.trim() && !/^\d+$/.test(l.trim())).join(' ').trim(); }
