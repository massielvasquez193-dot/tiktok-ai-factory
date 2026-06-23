/**
 * Shared Pipeline Runner — executes multi-step AI video generation pipelines.
 *
 * Phase 3A: infrastructure only. Steps use mock implementations by default.
 * Designed to be imported by campaigns.ts, campaignsV2.ts, videoGenerator.ts,
 * agent.ts, and automationTasks.ts — replacing duplicated runPipeline helpers.
 *
 * Usage:
 *   import { PipelineRunner, defineStep } from '../lib/pipeline-runner';
 *   const runner = new PipelineRunner({ onProgress: (pct, step) => console.log(pct, step) });
 *   const result = await runner.run([
 *     defineStep('research',   ctx => doResearch(ctx)),
 *     defineStep('scripts',    ctx => generateScripts(ctx)),
 *     defineStep('storyboard', ctx => buildStoryboard(ctx)),
 *     defineStep('prompts',    ctx => buildPrompts(ctx)),
 *     defineStep('video',      ctx => generateVideo(ctx)),
 *   ], initialContext);
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Shared context passed through every step. Callers extend this per pipeline. */
export interface PipelineContext {
  productId?: string;
  country?: string;
  language?: string;
  [key: string]: unknown;
}

/** A single pipeline step. */
export interface PipelineStep<TContext extends PipelineContext = PipelineContext> {
  name: string;
  execute: (ctx: TContext) => Promise<Partial<TContext>>;
}

/** Progress callback signature. */
export type ProgressCallback = (stepIndex: number, stepName: string, percent: number, message?: string) => void;

export interface PipelineOptions {
  /** Called after each step completes. */
  onProgress?: ProgressCallback;
  /** If true, stops on first step error. Default: false (continues). */
  stopOnError?: boolean;
  /** Timeout per step in ms. Default: 300_000 (5 min). */
  stepTimeoutMs?: number;
}

export interface PipelineResult<TContext extends PipelineContext = PipelineContext> {
  /** Final merged context after all steps. */
  context: TContext;
  /** Per-step results. */
  steps: { name: string; success: boolean; error?: string; durationMs: number }[];
  /** Whether all steps succeeded. */
  success: boolean;
}

// ── Runner ───────────────────────────────────────────────────────────────────

export class PipelineRunner<TContext extends PipelineContext = PipelineContext> {
  private options: Required<PipelineOptions>;

  constructor(options: PipelineOptions = {}) {
    this.options = {
      onProgress: options.onProgress ?? (() => {}),
      stopOnError: options.stopOnError ?? false,
      stepTimeoutMs: options.stepTimeoutMs ?? 300_000,
    };
  }

  /**
   * Execute a list of steps sequentially, merging each step's output into context.
   */
  async run(steps: PipelineStep<TContext>[], initialContext: TContext): Promise<PipelineResult<TContext>> {
    const ctx: TContext = { ...initialContext };
    const results: PipelineResult['steps'] = [];
    let allSucceeded = true;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const start = Date.now();
      const pctBefore = Math.round((i / steps.length) * 100);
      this.options.onProgress(i, step.name, pctBefore, `Starting ${step.name}...`);

      try {
        const stepResult = await withTimeout(
          step.execute(ctx),
          this.options.stepTimeoutMs,
          `Step "${step.name}" timed out after ${this.options.stepTimeoutMs}ms`,
        );

        // Merge non-undefined results back into context
        if (stepResult && typeof stepResult === 'object') {
          Object.assign(ctx, stepResult);
        }

        const durationMs = Date.now() - start;
        const pctAfter = Math.round(((i + 1) / steps.length) * 100);
        this.options.onProgress(i + 1, step.name, pctAfter, `Completed ${step.name} (${durationMs}ms)`);
        results.push({ name: step.name, success: true, durationMs });
      } catch (err: any) {
        const durationMs = Date.now() - start;
        results.push({ name: step.name, success: false, error: err.message, durationMs });
        allSucceeded = false;

        if (this.options.stopOnError) {
          break;
        }
      }
    }

    return { context: ctx, steps: results, success: allSucceeded };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a typed step definition. */
export function defineStep<TContext extends PipelineContext = PipelineContext>(
  name: string,
  execute: (ctx: TContext) => Promise<Partial<TContext>>,
): PipelineStep<TContext> {
  return { name, execute };
}

/** Utility: run a promise with a timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(v => { clearTimeout(timer); resolve(v); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}
