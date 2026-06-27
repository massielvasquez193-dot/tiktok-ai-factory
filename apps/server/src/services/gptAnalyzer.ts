/**
 * GPT Analysis Module — Structured AI Video Analysis
 *
 * Now delegates all LLM calls to the unified LLMClient (Phase 3A infrastructure).
 * No direct fetch() to OpenAI or Anthropic APIs.
 *
 * Outputs 7 structured insights from any TikTok/short-form video:
 *   1. Hook        — the hook phrase (first 3s)
 *   2. Pain Point  — the problem being addressed
 *   3. Solution    — how the product solves it
 *   4. CTA         — call to action
 *   5. Scene Breakdown — shot-by-shot structure
 *   6. Viral Summary   — why this video works
 *   7. Replicable Reason — techniques to copy
 *
 * Mode resolution (via LLMClient):
 *   - real    → calls the real API (requires API key)
 *   - mock    → returns deterministic placeholder
 *   - disabled → returns fallback analysis (no external calls)
 */

import { LLMClient, parseJSON, LLMProvider } from '../lib/llm-client';

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

/**
 * Analyze a video transcript using LLM (OpenAI or Anthropic via LLMClient).
 * Falls back to deterministic analysis when no API key is available.
 */
export async function analyzeVideo(
  subtitle: string,
  ocrText: string,
  sceneData: any[],
  productContext?: string,
): Promise<GPTAnalysis> {
  // Choose provider based on available API keys
  let provider: LLMProvider = 'openai';
  if (process.env.DEEPSEEK_API_KEY) provider = 'deepseek';
  else if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) provider = 'anthropic';

  const client = new LLMClient({ provider });

  // If client is not real (disabled or mock), use fallback
  if (!client.isReal) {
    if (client.mode === 'mock') {
      return mockAnalysis(subtitle, sceneData);
    }
    return fallbackAnalysis(subtitle, sceneData);
  }

  const prompt = buildPrompt(subtitle, ocrText, sceneData, productContext);

  try {
    const result = await client.chat({
      messages: [
        { role: 'system', content: 'You are a TikTok content strategist. Return clean JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    });

    return parseAIResponse(result.content);
  } catch (e: any) {
    console.warn('[GPT Analyzer] LLM call failed: ' + e.message);
    return fallbackAnalysis(subtitle, sceneData);
  }
}

function buildPrompt(
  subtitle: string,
  ocrText: string,
  sceneData: any[],
  productContext?: string,
): string {
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
    '  "viralSummary": "2-3 sentences explaining EXACTLY why this video works",',
    '  "replicableReason": "specific techniques to copy for other products",',
    '  "viralScore": 85,',
    '  "productName": "detected product name or category"',
    '}',
  ].join('\n');
}

/**
 * Parse LLM response into structured GPTAnalysis.
 * Handles markdown fences and missing fields gracefully.
 */
function parseAIResponse(text: string): GPTAnalysis {
  try {
    const result = parseJSON(text) as any;
    return {
      hook: result.hook || '',
      painPoint: result.painPoint || '',
      solution: result.solution || '',
      cta: result.cta || '',
      sceneBreakdown: Array.isArray(result.sceneBreakdown) ? result.sceneBreakdown : [],
      viralSummary: result.viralSummary || '',
      replicableReason: result.replicableReason || '',
      viralScore: typeof result.viralScore === 'number' ? result.viralScore : 70,
      productName: result.productName || 'Unknown',
      usedAI: true,
    };
  } catch {
    // If LLM response can't be parsed, use fallback
    return fallbackAnalysis(text, []);
  }
}

/**
 * Mock analysis — deterministic result for testing.
 * No external API calls made.
 */
export function mockAnalysis(_subtitle: string, scenes: any[]): GPTAnalysis {
  return {
    hook: 'This product changed everything in just 3 days',
    painPoint: 'Struggling with inconsistent results and wasted time',
    solution: 'All-in-one solution that delivers instantly',
    cta: 'Click the link in bio to get yours today',
    sceneBreakdown: scenes.length > 0 ? scenes : [
      { scene: 1, time: '0-3s', type: 'hook', description: 'Bold claim to grab attention' },
      { scene: 2, time: '3-8s', type: 'problem', description: 'Shows the everyday struggle' },
      { scene: 3, time: '8-15s', type: 'solution', description: 'Product reveal as the answer' },
      { scene: 4, time: '15-22s', type: 'proof', description: 'Before/after demonstration' },
      { scene: 5, time: '22-28s', type: 'cta', description: 'Urgent call to action' },
    ],
    viralSummary: 'Strong hook with relatable problem, clear solution, and social proof.',
    replicableReason: 'Use a bold hook, show the pain, reveal the product, prove it works, end with CTA.',
    viralScore: 75,
    productName: 'Detected Product',
    usedAI: false,
  };
}

/**
 * Fallback analysis — when no API is available.
 * Uses simple heuristics on the transcript text.
 */
export function fallbackAnalysis(subtitle: string, scenes: any[]): GPTAnalysis {
  const phrases = subtitle
    .split(/[.!?]+/)
    .filter((s: string) => s.trim().length > 5);

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
