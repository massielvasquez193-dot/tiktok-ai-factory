/**
 * GPT Analysis Module — Structured AI Video Analysis
 *
 * Outputs 7 structured insights from any TikTok/short-form video:
 *   1. Hook        — the hook phrase (first 3s)
 *   2. Pain Point  — the problem being addressed
 *   3. Solution    — how the product solves it
 *   4. CTA         — call to action
 *   5. Scene Breakdown — shot-by-shot structure
 *   6. Viral Summary   — why this video works
 *   7. Replicable Reason — techniques to copy
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY || '';

export interface GPTAnalysis {
  hook: string;
  painPoint: string;
  solution: string;
  cta: string;
  sceneBreakdown: { scene: number; time: string; type: string; description: string }[];
  viralSummary: string;
  replicableReason: string;
  viralScore: number;
  productName: string;
  usedAI: boolean;
}

export async function analyzeVideo(subtitle: string, ocrText: string, sceneData: any[], productContext?: string): Promise<GPTAnalysis> {
  const apiKey = OPENAI_KEY || CLAUDE_KEY;
  const isClaude = !!CLAUDE_KEY && !OPENAI_KEY;

  if (!apiKey) return fallbackAnalysis(subtitle, sceneData);

  const prompt = buildPrompt(subtitle, ocrText, sceneData, productContext);

  try {
    if (isClaude) {
      return await callClaude(prompt);
    }
    return await callOpenAI(prompt);
  } catch (e: any) {
    console.warn('[GPT Analyzer] API call failed: ' + e.message);
    return fallbackAnalysis(subtitle, sceneData);
  }
}

function buildPrompt(subtitle: string, ocrText: string, sceneData: any[], productContext?: string): string {
  const context = productContext ? `Product Context: ${productContext}\n` : '';
  return [
    'You are an expert TikTok content analyst and viral marketing strategist.',
    'Analyze this video transcript and break down EXACTLY why it works.',
    '',
    context,
    '=== TRANSCRIPT ===',
    subtitle.slice(0, 2000) || '(no transcript - analyze based on structure)',
    '',
    '=== OCR TEXT ===',
    ocrText.slice(0, 500) || '(no OCR data)',
    '',
    '=== SCENE DATA ===',
    sceneData.length + ' shots detected',
    '',
    'Return ONLY valid JSON (no markdown):',
    '{',
    '  "hook": "the exact hook phrase used (first 3 seconds)",',
    '  "painPoint": "the specific pain point / frustration being addressed",',
    '  "solution": "how the product or service solves this pain",',
    '  "cta": "call-to-action phrase used at the end",',
    '  "sceneBreakdown": [',
    '    {"scene":1, "time":"0-3s", "type":"hook", "description":"what happens on screen"},',
    '    {"scene":2, "time":"3-8s", "type":"problem", "description":"..."},',
    '    {"scene":3, "time":"8-15s", "type":"solution", "description":"..."},',
    '    {"scene":4, "time":"15-20s", "type":"proof", "description":"..."},',
    '    {"scene":5, "time":"20-25s", "type":"cta", "description":"..."}',
    '  ],',
    '  "viralSummary": "2-3 sentences explaining EXACTLY why this video works (hook strength, pacing, emotional trigger, visual style)",',
    '  "replicableReason": "specific techniques that YOU can copy for other products (camera angles, editing style, script structure, sound design)",',
    '  "viralScore": 85,',
    '  "productName": "detected product name or category"',
    '}',
  ].join('\n');
}

async function callOpenAI(prompt: string): Promise<GPTAnalysis> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a TikTok content strategist. Return clean JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  if (!r.ok) throw new Error('OpenAI: ' + r.status);
  const d: any = await r.json();
  const text: string = d.choices?.[0]?.message?.content || '{}';
  return parseAIResponse(text);
}

async function callClaude(prompt: string): Promise<GPTAnalysis> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error('Claude: ' + r.status);
  const d: any = await r.json();
  const text: string = d.content?.[0]?.text || '{}';
  return parseAIResponse(text);
}

function safeJsonParse(text: string): any {
  try { return JSON.parse(text); } catch { /* fall through */ }
  // Extract first { ... } block
  const i1 = text.indexOf('{'); const i2 = text.lastIndexOf('}');
  if (i1 >= 0 && i2 > i1) {
    try { return JSON.parse(text.substring(i1, i2 + 1)); } catch { /* fall through */ }
  }
  // Extract first [ ... ] block
  const a1 = text.indexOf('['); const a2 = text.lastIndexOf(']');
  if (a1 >= 0 && a2 > a1) {
    try { return JSON.parse(text.substring(a1, a2 + 1)); } catch { /* fall through */ }
  }
  throw new Error('Unable to parse AI response as JSON');
}

function parseAIResponse(text: string): GPTAnalysis {
  let clean = text.trim();
  const result = safeJsonParse(clean);
  return {
    hook: result.hook || '',
    painPoint: result.painPoint || '',
    solution: result.solution || '',
    cta: result.cta || '',
    sceneBreakdown: result.sceneBreakdown || [],
    viralSummary: result.viralSummary || '',
    replicableReason: result.replicableReason || '',
    viralScore: result.viralScore || 70,
    productName: result.productName || 'Unknown',
    usedAI: true,
  };
}

function fallbackAnalysis(subtitle: string, scenes: any[]): GPTAnalysis {
  const phrases = subtitle.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
  return {
    hook: phrases[0]?.trim() || 'Hook detected at 0-3s',
    painPoint: phrases[1]?.trim() || 'Pain point identified',
    solution: phrases[2]?.trim() || 'Solution presented',
    cta: phrases[phrases.length - 1]?.trim() || 'CTA at the end',
    sceneBreakdown: scenes.length > 0 ? scenes : [
      { scene: 1, time: '0-3s', type: 'hook', description: 'Attention-grabbing opening' },
      { scene: 2, time: '3-8s', type: 'problem', description: 'Problem setup' },
      { scene: 3, time: '8-15s', type: 'solution', description: 'Product reveal' },
      { scene: 4, time: '15-22s', type: 'proof', description: 'Demonstration/proof' },
      { scene: 5, time: '22-28s', type: 'cta', description: 'Call to action' },
    ],
    viralSummary: 'Standard video structure with clear hook-problem-solution-CTA flow.',
    replicableReason: 'Use a strong hook in the first 3 seconds, show the problem clearly, demonstrate a real solution, end with a clear CTA.',
    viralScore: 70,
    productName: 'Unknown Product',
    usedAI: false,
  };
}
