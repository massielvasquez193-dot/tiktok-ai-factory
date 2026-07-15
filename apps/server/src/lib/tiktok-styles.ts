/**
 * TikTok Style System — Batch 3
 *
 * Centralised style enum, prompt templates, and validation.
 * This is the SINGLE SOURCE OF TRUTH for TikTok styles.
 * No other file may define or alter styles independently.
 *
 * Design:
 *   - Styles stored as stable English keys in DB (not display names).
 *   - Backend validates against a strict whitelist.
 *   - Each style carries a prompt template: hook, pacing, camera, narration, etc.
 *   - The final system prompt is built by composeSystemPrompt().
 *   - Providers receive the composed prompt — they never see style keys directly.
 *
 * Credits: styles do NOT affect credit costs. Costs are per-model only.
 */

// ── Style Key (whitelist — the ONLY valid values) ──────────────────────────────

export const VALID_STYLES = [
  'UGC_REVIEW',
  'PROBLEM_SOLUTION',
  'PRODUCT_DEMO',
  'BEFORE_AFTER',
  'UNBOXING',
  'TUTORIAL',
  'AESTHETIC',
  'VIRAL_HOOK',
  'TESTIMONIAL',
  'TREND_REMIX',
] as const;

export type TikTokStyle = (typeof VALID_STYLES)[number];

/** Default style when none is provided. */
export const DEFAULT_STYLE: TikTokStyle = 'UGC_REVIEW';

// ── Display metadata (Chinese name + short description) ────────────────────────

export interface StyleDisplayInfo {
  key: TikTokStyle;
  nameZh: string;
  description: string;
  scene: string;  // Suitable scenarios
}

export const STYLE_DISPLAY: Record<TikTokStyle, StyleDisplayInfo> = {
  UGC_REVIEW: {
    key: 'UGC_REVIEW',
    nameZh: '真人评测',
    description: '真实体验、自然口播、生活化使用感',
    scene: '产品评测、种草推荐、真实使用分享',
  },
  PROBLEM_SOLUTION: {
    key: 'PROBLEM_SOLUTION',
    nameZh: '痛点解决',
    description: '痛点开场、产品解决方案、强前后对比',
    scene: '功效产品、工具类、解决方案型内容',
  },
  PRODUCT_DEMO: {
    key: 'PRODUCT_DEMO',
    nameZh: '产品演示',
    description: '功能演示、细节特写、操作过程',
    scene: '电子产品、美妆工具、使用方法展示',
  },
  BEFORE_AFTER: {
    key: 'BEFORE_AFTER',
    nameZh: '前后对比',
    description: '使用前后视觉对比、效果直观展示',
    scene: '美妆护肤、清洁产品、改造类内容',
  },
  UNBOXING: {
    key: 'UNBOXING',
    nameZh: '开箱体验',
    description: '开箱、包装、配件、第一印象',
    scene: '3C数码、礼盒、新品首发',
  },
  TUTORIAL: {
    key: 'TUTORIAL',
    nameZh: '教程教学',
    description: '分步骤教学、清晰操作流程',
    scene: '化妆教程、使用说明、DIY内容',
  },
  AESTHETIC: {
    key: 'AESTHETIC',
    nameZh: '高质感美学',
    description: '高质感、美学镜头、品牌氛围',
    scene: '高端品牌、生活方式、视觉营销',
  },
  VIRAL_HOOK: {
    key: 'VIRAL_HOOK',
    nameZh: '爆款钩子',
    description: '强钩子、快节奏、平台原生爆款结构',
    scene: '流量款、快速转化、平台热点结合',
  },
  TESTIMONIAL: {
    key: 'TESTIMONIAL',
    nameZh: '用户证言',
    description: '用户证言、推荐理由、信任建立',
    scene: '社交证明、好评展示、口碑营销',
  },
  TREND_REMIX: {
    key: 'TREND_REMIX',
    nameZh: '趋势改编',
    description: '趋势结构改编、热门模板化应用',
    scene: '蹭热点、平台挑战、流行格式',
  },
};

// ── Validation ─────────────────────────────────────────────────────────────────

/**
 * Validate and normalize a style value.
 * Returns the canonical style key, or throws.
 */
export function validateStyle(raw: unknown): TikTokStyle {
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_STYLE;
  }
  const upper = raw.toUpperCase().trim();
  if (!VALID_STYLES.includes(upper as TikTokStyle)) {
    throw new StyleValidationError(
      `Invalid TikTok style: "${raw}". Valid values: ${VALID_STYLES.join(', ')}`,
    );
  }
  return upper as TikTokStyle;
}

/**
 * Safe resolve — returns the style key or default, never throws.
 */
export function resolveStyle(raw: unknown): TikTokStyle {
  try { return validateStyle(raw); } catch { return DEFAULT_STYLE; }
}

export class StyleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StyleValidationError';
  }
}

// ── Prompt Template Types ──────────────────────────────────────────────────────

interface StylePromptTemplate {
  hookStyle: string;
  pacing: string;
  shotStructure: string;
  cameraLanguage: string;
  narrationTone: string;
  productFocus: string;
  callToAction: string;
  negativeConstraints: string;
}

// ── Prompt Templates (per style) ───────────────────────────────────────────────

const STYLE_PROMPTS: Record<TikTokStyle, StylePromptTemplate> = {
  UGC_REVIEW: {
    hookStyle: 'Organic, genuine reaction — "I finally tried this..." or "This changed everything..."',
    pacing: 'Natural conversational pacing with 1-2 quick cuts for emphasis',
    shotStructure: 'Open with hook → product introduction → usage demo → key benefit → close with personal verdict',
    cameraLanguage: 'Handheld, POV, selfie-style, natural lighting, slight camera shake accepted',
    narrationTone: 'Casual, honest, personal, like telling a friend — not a commercial script',
    productFocus: 'Show product being used naturally, not posed. Close-up on key detail at 2-3 seconds.',
    callToAction: 'Soft CTA — "Link in bio" or "Check it out" — never pushy',
    negativeConstraints: 'NO studio lighting, NO scripted delivery, NO corporate music, NO green screen, NO teleprompter read',
  },
  PROBLEM_SOLUTION: {
    hookStyle: 'Bold problem statement — "Struggling with X?" or "Stop doing Y!" — immediate pain identification',
    pacing: 'Fast problem intro (2-3s), smooth transition to solution (3-4s), satisfying resolution (3-5s)',
    shotStructure: 'Pain point visual → product entrance → solution demo → visible result → CTA',
    cameraLanguage: 'Split-frame or transition effect for before/after, steady focus on result, assertive framing',
    narrationTone: 'Empathetic then confident, "I used to have this problem too" → "Here is what worked"',
    productFocus: 'Hero shot of product with clear label/packaging visible, application/use shown step-by-step',
    callToAction: 'Strong benefit-driven CTA — "Try it for yourself" or "Get your solution today"',
    negativeConstraints: 'NO exaggerated claims, NO fake results, NO misleading before/after, NO medical claims',
  },
  PRODUCT_DEMO: {
    hookStyle: 'Immediate visual showcase — product in action within first 1.5 seconds',
    pacing: 'Steady, methodical pacing. Each feature gets 2-3 seconds. No rushed cuts.',
    shotStructure: 'Wide product shot → close-up detail 1 → close-up detail 2 → function in use → final beauty shot',
    cameraLanguage: 'Smooth tracking shots, macro close-ups, turntable or rotating product view, clean background',
    narrationTone: 'Informative, clear, feature-focused. Voice-over or text overlay. No emotional manipulation.',
    productFocus: 'Product fills 60%+ of frame. Clean minimal background. Text overlays for feature names.',
    callToAction: 'Direct — "Available now" or "Link in bio to shop" with product visible',
    negativeConstraints: 'NO distracting background, NO shaky footage, NO competitor products visible, NO watermarks',
  },
  BEFORE_AFTER: {
    hookStyle: 'Split-screen or transition reveal — immediate visual contrast',
    pacing: 'Before shot (2s) → transition/magic moment (1s) → after reveal (3s) → detail zoom (2s) → CTA (2s)',
    shotStructure: 'Side-by-side or swipe reveal format, identical lighting and angle for both shots',
    cameraLanguage: 'Static tripod or locked-off camera for consistency, even lighting, no filter changes between shots',
    narrationTone: 'Minimal narration — let visuals speak. Optional text overlay with key metric or result.',
    productFocus: 'Product shown at transition point, result clearly visible and unretouched',
    callToAction: 'Curiosity-driven — "See the difference yourself" → product link',
    negativeConstraints: 'NO Photoshop, NO AI-generated fake results, NO misleading timeframes, NO extreme editing',
  },
  UNBOXING: {
    hookStyle: 'Curiosity trigger — package reveal, satisfying box opening sound, "You have to see what just arrived..."',
    pacing: 'Slow buildup (package in frame 2s) → opening moment (3s) → item reveal (2s) → detail tour (5s)',
    shotStructure: 'Package arrival → box opening (ASMR-friendly) → first look → accessories/contents → product in hand',
    cameraLanguage: 'Top-down or first-person POV, macro on texture/details, smooth slow pan, natural light',
    narrationTone: 'Excited but genuine, first-impression authenticity, "I did not expect..." moments',
    productFocus: 'Packaging quality, accessories, first touch impression, size comparison to common object',
    callToAction: 'Teaser — "Full review coming soon, follow for more" or "Link to get yours"',
    negativeConstraints: 'NO fake excitement, NO staged unboxing (obviously pre-opened), NO excessive jump cuts',
  },
  TUTORIAL: {
    hookStyle: 'Result-first — show the finished outcome in first 2 seconds, then "Here is how..."',
    pacing: 'Step markers (text or voice), 3-5s per step, final result showcase at end',
    shotStructure: 'Final result teaser (2s) → step 1 → step 2 → step 3 → full result → CTA',
    cameraLanguage: 'Overhead or fixed angle for steps, close-up for details, clean organized workspace',
    narrationTone: 'Clear, instructional, encouraging. Number each step. Assume viewer is a beginner.',
    productFocus: 'Product shown at each usage step, key ingredients/features highlighted with text',
    callToAction: 'Save/Share — "Save this for later" or "Tag someone who needs this"',
    negativeConstraints: 'NO skipping steps, NO unclear hand positions blocking view, NO fast-forward without explanation',
  },
  AESTHETIC: {
    hookStyle: 'Visual intrigue — beautiful composition, satisfying symmetry, slow reveal of scene',
    pacing: 'Slow, deliberate pacing. Each shot lingers. ASMR-friendly. No rush.',
    shotStructure: 'Establishing beauty shot → detail macro → product integration → lifestyle moment → brand close',
    cameraLanguage: 'Cinematic lighting (soft key + rim), shallow depth of field, golden hour or moody tone, fluid gimbal movement',
    narrationTone: 'Minimal or none. Ambient sound or soft instrumental. Text overlay with brand message.',
    productFocus: 'Product as art object — integrated into beautiful scene, not the sole focus, aspirational placement',
    callToAction: 'Aspirational — brand name + "Discover more" — no direct sales language',
    negativeConstraints: 'NO harsh lighting, NO cluttered background, NO sale/price text, NO aggressive CTAs',
  },
  VIRAL_HOOK: {
    hookStyle: 'Pattern interrupt — unexpected visual, bold text overlay, "Wait for it..." suspense',
    pacing: 'Extremely fast first 3 seconds, quick cuts every 1-2 seconds, momentum builds to payoff',
    shotStructure: 'Hook (1.5s) → escalate (1.5s) → payoff/reveal (3s) → replay/loop bait (2s) → CTA',
    cameraLanguage: 'Dynamic zooms, speed ramps, match cuts, trending transitions, text overlays with sound sync',
    narrationTone: 'High energy, trending audio sync, text-on-screen driven, minimal spoken narration',
    productFocus: 'Product appears at payoff moment, integrated into the hook pattern, memorable positioning',
    callToAction: 'Engagement-driven — "Would you try this?" or "Comment your thoughts"',
    negativeConstraints: 'NO slow openings, NO long explanations, NO copyrighted music, NO misleading clickbait',
  },
  TESTIMONIAL: {
    hookStyle: 'Real person, real story — "I have been using this for X weeks and..." — authentic testimonial opener',
    pacing: 'Person introduction (3s) → problem context (3s) → product experience (5s) → recommendation (3s)',
    shotStructure: 'Face-to-camera intro → b-roll of product use → back to person → result/benefit → recommendation',
    cameraLanguage: 'Interview-style framing, natural environment (home/office), soft natural light, genuine expressions',
    narrationTone: 'First-person authentic, specific details ("3 weeks" not "a while"), genuine enthusiasm',
    productFocus: 'Product shown in real user context, packaging visible, natural integration into daily routine',
    callToAction: 'Trust-based — "If you are looking for X, I recommend this" → link',
    negativeConstraints: 'NO scripted reading, NO actors pretending, NO fake reviews, NO paid-promotion disclaimers needed for organic style',
  },
  TREND_REMIX: {
    hookStyle: 'Immediately recognizable trend format — trending audio, familiar structure, brand/product integration',
    pacing: 'Follows trend template pacing exactly, seamless product integration at the natural reveal point',
    shotStructure: 'Trend intro frames → product integration at trend pivot → trend outro with brand signature',
    cameraLanguage: 'Matches trend aesthetic (varies by trend), product integration should feel native not forced',
    narrationTone: 'Minimal — trending audio carries the content, product appears naturally in the flow',
    productFocus: 'Product placed at the trend "reveal" or "punchline" moment — maximum attention, organic feel',
    callToAction: 'Trend-native — "Get yours" or brand handle only — let the trend format dictate engagement',
    negativeConstraints: 'NO direct copying of copyrighted original content, NO forced/awkward product placement, NO misuse of trending audio rights',
  },
};

// ── System Prompt Composer ─────────────────────────────────────────────────────

export interface ComposePromptInput {
  /** The TikTok style key (already validated). */
  style: TikTokStyle;
  /** User's raw prompt / product description. */
  userPrompt: string;
  /** Additional constraints or overrides (optional). */
  extra?: string;
}

/**
 * Build the final system prompt for a video generation provider.
 *
 * The composed prompt combines:
 *   1. Style-specific template (hook, pacing, camera, tone, etc.)
 *   2. User's product/creative input
 *   3. Brand safety & platform constraints
 *
 * This prompt is what gets sent to Seedance/Kling/Veo.
 * The style key itself is NOT included in the prompt — only the instructions.
 */
export function composeStylePrompt(input: ComposePromptInput): string {
  const tpl = STYLE_PROMPTS[input.style];

  const sections = [
    `[TIKTOK STYLE DIRECTIVE]`,
    `Style: ${STYLE_DISPLAY[input.style].nameZh} (${input.style})`,
    ``,
    `HOOK: ${tpl.hookStyle}`,
    `PACING: ${tpl.pacing}`,
    `SHOTS: ${tpl.shotStructure}`,
    `CAMERA: ${tpl.cameraLanguage}`,
    `NARRATION: ${tpl.narrationTone}`,
    `PRODUCT: ${tpl.productFocus}`,
    `CTA: ${tpl.callToAction}`,
    ``,
    `[CONTENT INPUT]`,
    input.userPrompt,
    ``,
    `[PLATFORM CONSTRAINTS]`,
    `Vertical 9:16 format`,
    `TikTok-native aesthetic`,
    `Safe-for-work, platform-compliant content`,
    `No watermarks from other platforms`,
    `No copyrighted music or visuals`,
    tpl.negativeConstraints,
  ];

  if (input.extra) {
    sections.push('', `[ADDITIONAL]`, input.extra);
  }

  return sections.join('\n');
}

/**
 * Get the display info for a style key, or a safe fallback for unknown/legacy data.
 */
export function getStyleDisplay(key: string | null | undefined): StyleDisplayInfo {
  if (!key) return STYLE_DISPLAY[DEFAULT_STYLE];
  try {
    const resolved = validateStyle(key);
    return STYLE_DISPLAY[resolved];
  } catch {
    return {
      key: DEFAULT_STYLE,
      nameZh: `未知风格 (原值)`,
      description: '历史任务，无风格记录',
      scene: '',
    };
  }
}

/**
 * Return style display info for API responses.
 * Includes a displayName for legacy tasks that have no style recorded.
 */
export function styleForApi(key: string | null | undefined): {
  key: string;
  nameZh: string;
  description: string;
  isLegacy: boolean;
} {
  if (!key || !(VALID_STYLES as readonly string[]).includes(key.toUpperCase())) {
    return {
      key: DEFAULT_STYLE,
      nameZh: STYLE_DISPLAY[DEFAULT_STYLE].nameZh + ' (默认)',
      description: '未选择风格时的默认展示模式',
      isLegacy: true,
    };
  }
  const info = STYLE_DISPLAY[key as TikTokStyle];
  return { key, nameZh: info.nameZh, description: info.description, isLegacy: false };
}
