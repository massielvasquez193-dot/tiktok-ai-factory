#!/usr/bin/env python3
"""
TikTok AI Video Factory — Main Pipeline
========================================
End-to-end orchestration: Product Brief → AI Video → Final Export

Pipeline stages:
  Stage 1: Product Analysis    (ProductAgent)
  Stage 2: Script Generation   (ScriptAgent)
  Stage 3: Storyboard          (StoryboardAgent)
  Stage 4: AI Video Generation (SeedanceClient)
  Stage 5: Voiceover           (TTSClient)
  Stage 6: Video Composition   (Composer / FFMpegComposer)

Usage:
    # Dry run (no API calls, just scripts + storyboards)
    python src/pipeline.py --brief configs/product_brief.json --dry-run

    # Full production (requires API keys)
    python src/pipeline.py --brief configs/product_brief.json
    python src/pipeline.py --brief configs/product_brief.json --languages en,ms
    python src/pipeline.py --brief configs/product_brief.json --skip-video
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.agents.product_agent import ProductAgent, ProductAnalysis
from src.agents.script_agent import ScriptAgent, SCRIPT_TYPES
from src.agents.storyboard_agent import StoryboardAgent
from src.services.seedance_client import SeedanceClient, SeedanceError
from src.services.tts_client import TTSClient, TTSError
from src.services.composer import FFMpegComposer, Composer, ComposerError
from src.utils.config import (
    load_product_brief,
    load_seedance_config,
    ensure_output_dir,
    write_json,
    write_text,
)


# ── Pipeline Orchestrator ──────────────────────────────────────────────────

class Pipeline:
    """
    End-to-end TikTok video production pipeline.
    """

    def __init__(
        self,
        brief: dict,
        seedance_config: Optional[dict] = None,
        output_dir: Optional[Path] = None,
        languages: Optional[list[str]] = None,
        script_types: Optional[list[str]] = None,
        dry_run: bool = False,
    ):
        self.brief = brief
        self.seedance_config = seedance_config
        self.output_dir = Path(output_dir or "output/pipeline")
        self.languages = languages or ["en"]
        self.script_types = script_types or ["ugc", "review", "problem_solution"]
        self.dry_run = dry_run

        # State
        self.product: Optional[ProductAnalysis] = None
        self.scripts: list[dict] = []
        self.storyboards: list[dict] = []
        self.video_paths: dict[str, Path] = {}
        self.audio_dir: Optional[Path] = None

    # ── Stage runners ────────────────────────────────────────────────────

    def run(self) -> dict:
        """Run the full pipeline and return a manifest of outputs."""
        print("=" * 60)
        print("TikTok AI Video Factory — Pipeline")
        print("=" * 60)

        manifest = {
            "product": self.brief.get("product", {}).get("name", "Unknown"),
            "mode": "dry_run" if self.dry_run else "production",
            "stages": {},
        }

        # Stage 1: Product Analysis
        self._run_stage_1(manifest)

        # Stage 2: Script Generation
        self._run_stage_2(manifest)

        # Stage 3: Storyboard
        self._run_stage_3(manifest)

        # Stage 4: AI Video (skip in dry-run or if no API key)
        if not self.dry_run and self.seedance_config:
            self._run_stage_4(manifest)

        # Stage 5: Voiceover (skip if no TTS key)
        if not self.dry_run:
            self._run_stage_5(manifest)

        # Stage 6: Compose (if we have videos + audio)
        self._run_stage_6(manifest)

        # ── Final manifest ──
        manifest_path = self.output_dir / "pipeline_manifest.json"
        write_json(manifest_path, manifest)

        print("\n" + "=" * 60)
        print(f"Pipeline complete! Manifest: {manifest_path}")
        print("=" * 60)
        return manifest

    def _run_stage_1(self, manifest: dict):
        print("\n── Stage 1: Product Analysis ──")
        agent = ProductAgent(self.brief)
        self.product = agent.analyze()

        out = ensure_output_dir("analysis")
        path = out / "product_analysis.json"
        write_json(path, self.product.__dict__ if hasattr(self.product, '__dict__') else {})

        manifest["stages"]["product_analysis"] = {
            "status": "ok",
            "product": self.product.product_name,
            "benefits": len(self.product.benefits),
            "hooks": len(self.product.hooks),
            "output": str(path),
        }

    def _run_stage_2(self, manifest: dict):
        print("\n── Stage 2: Script Generation ──")
        agent = ScriptAgent(self.product)

        self.scripts = agent.generate_all(
            languages=self.languages,
            script_types=self.script_types,
        )

        out = ensure_output_dir("scripts")
        path = out / "scripts.json"
        write_json(path, self.scripts)

        # Also write human-readable markdown
        md = self._scripts_to_markdown()
        write_text(out / "scripts.md", md)

        manifest["stages"]["script_generation"] = {
            "status": "ok",
            "count": len(self.scripts),
            "languages": self.languages,
            "types": self.script_types,
            "output": str(path),
        }

    def _run_stage_3(self, manifest: dict):
        print("\n── Stage 3: Storyboard ──")
        agent = StoryboardAgent(
            self.scripts,
            product_name=self.product.product_name,
            category=self.product.category,
        )
        self.storyboards = agent.generate_all()

        out = ensure_output_dir("storyboards")
        csv_path = out / "storyboards.csv"
        agent.export_csv(self.storyboards, csv_path)

        # Generate SRT for each storyboard
        srt_paths = []
        for sb in self.storyboards:
            srt_name = f"{sb['script_type']}_{sb['language']}.srt"
            srt_path = out / srt_name
            agent.build_srt(sb, srt_path)
            srt_paths.append(str(srt_path))

        # AI prompts
        prompts_path = out / "ai_video_prompts.md"
        self._write_ai_prompts(prompts_path)

        manifest["stages"]["storyboard"] = {
            "status": "ok",
            "count": len(self.storyboards),
            "csv": str(csv_path),
            "srt_files": srt_paths,
            "ai_prompts": str(prompts_path),
        }

    def _run_stage_4(self, manifest: dict):
        print("\n── Stage 4: AI Video Generation ──")
        try:
            client = SeedanceClient.from_config(self.seedance_config)
        except Exception as e:
            manifest["stages"]["video_generation"] = {"status": "skipped", "reason": str(e)}
            print(f"  [SKIP] Seedance not configured: {e}")
            return

        video_dir = ensure_output_dir("videos", "generated")
        prompts = self._collect_prompts()
        if not prompts:
            manifest["stages"]["video_generation"] = {"status": "skipped", "reason": "No prompts available"}
            return

        print(f"  Generating {len(prompts)} video(s)...")
        try:
            results = client.generate_batch(prompts, parallel=False)
            for i, r in enumerate(results):
                if r["video_url"]:
                    label = r["label"].replace(" ", "_").replace("/", "_")
                    path = video_dir / f"{label}.mp4"
                    try:
                        client.download(r["video_url"], path)
                        self.video_paths[label] = path
                    except Exception as e:
                        print(f"  [WARN] Download failed for {label}: {e}")
                else:
                    print(f"  [WARN] {r['label']}: {r.get('error', 'unknown')}")

            manifest["stages"]["video_generation"] = {
                "status": "ok",
                "total": len(results),
                "downloaded": len(self.video_paths),
                "output_dir": str(video_dir),
            }
        except Exception as e:
            manifest["stages"]["video_generation"] = {"status": "error", "error": str(e)}
            print(f"  [ERROR] Video generation failed: {e}")

    def _run_stage_5(self, manifest: dict):
        print("\n── Stage 5: Voiceover (TTS) ──")
        tts_key = (self.seedance_config or {}).get("tts_api_key", "") or (
            self.brief.get("secrets", {}).get("tts_api_key", "")
        )
        tts_engine = (self.seedance_config or {}).get("tts_engine", "azure")

        if not tts_key:
            manifest["stages"]["voiceover"] = {
                "status": "skipped",
                "reason": "No TTS API key configured (add tts_api_key to config)",
            }
            print("  [SKIP] No TTS API key")
            return

        self.audio_dir = ensure_output_dir("audio")

        try:
            client = TTSClient(engine=tts_engine, api_key=tts_key)
            all_paths = []

            for lang in self.languages:
                client.language = lang
                # Generate for first script of each language
                lang_scripts = [s for s in self.scripts if s.get("language") == lang]
                for script in lang_scripts[:1]:  # One per language
                    paths = client.generate_script(script, self.audio_dir / lang)
                    all_paths.extend(paths)

            manifest["stages"]["voiceover"] = {
                "status": "ok",
                "files": len(all_paths),
                "output_dir": str(self.audio_dir),
            }
        except Exception as e:
            manifest["stages"]["voiceover"] = {"status": "error", "error": str(e)}
            print(f"  [ERROR] TTS failed: {e}")

    def _run_stage_6(self, manifest: dict):
        print("\n── Stage 6: Video Composition ──")
        video_files = list(self.video_paths.values()) if self.video_paths else []

        # In dry run, look for sample videos
        if not video_files:
            sample_dir = self.output_dir.parent / "output" / "videos"
            if sample_dir.exists():
                video_files = sorted(sample_dir.glob("*.mp4"))[:3]

        audio_files = []
        if self.audio_dir and self.audio_dir.exists():
            audio_files = sorted(self.audio_dir.rglob("*.mp3"))

        if not video_files:
            manifest["stages"]["composition"] = {
                "status": "skipped",
                "reason": "No video files available. Generate videos first or provide sample footage.",
            }
            print("  [SKIP] No video files to compose")
            return

        if not audio_files:
            manifest["stages"]["composition"] = {
                "status": "skipped",
                "reason": "No audio files available. Run TTS stage first.",
            }
            print("  [SKIP] No audio files to compose")
            return

        try:
            # Try ffmpeg first (lighter), fall back to moviepy
            composer = FFMpegComposer()
            final_path = composer.compose(
                video_files=video_files[:4],  # Max 4 clips
                audio_file=audio_files[0],
                subtitle_file=self.output_dir.parent / "output" / "storyboards" / "subtitles.srt",
                title="pipeline_final",
            )
            manifest["stages"]["composition"] = {
                "status": "ok",
                "output": str(final_path),
                "size_mb": round(final_path.stat().st_size / 1024 / 1024, 1),
            }
        except ComposerError as e:
            manifest["stages"]["composition"] = {"status": "error", "error": str(e)}
            print(f"  [WARN] Composition failed: {e}")

    # ── Helpers ──────────────────────────────────────────────────────────

    def _collect_prompts(self) -> list[dict]:
        """Collect AI video prompts from storyboards."""
        if not self.storyboards:
            return []

        prompts = []
        for sb in self.storyboards:
            for shot in sb.get("shots", []):
                prompt_text = shot.get("ai_prompt", "")
                if prompt_text:
                    prompts.append({
                        "label": f"{sb['script_type']}_{sb['language']}_shot{shot['shot_number']}",
                        "prompt": prompt_text,
                        "duration": 5,
                    })
        return prompts[:6]  # Limit to 6 to control cost

    def _scripts_to_markdown(self) -> str:
        """Convert scripts to readable markdown."""
        lines = ["# Generated Scripts\n"]
        for s in self.scripts:
            stype = SCRIPT_TYPES.get(s.get("script_type"), s.get("script_type"))
            lang = s.get("language_name", s.get("language"))
            lines.append(f"\n## {stype} ({lang})\n")
            lines.append(f"**Duration:** {s.get('duration_seconds', 25)}s\n")
            lines.append(f"**Hook:** {s.get('hook', {}).get('text', '')}\n")
            for scene in s.get("scenes", []):
                lines.append(f"- [{scene.get('duration_seconds', 0)}s] {scene.get('voiceover', '')}")
            lines.append(f"\n**CTA:** {s.get('cta', {}).get('text', '')}\n")
        return "\n".join(lines)

    def _write_ai_prompts(self, path: Path):
        """Write AI video prompts to markdown for manual review."""
        lines = [
            "# AI Video Generation Prompts\n",
            "> All prompts: Vertical 9:16, realistic product, no copyrighted characters,",
            "> no creator likeness, no competitor branding, clean ecommerce style.\n",
        ]
        for sb in self.storyboards:
            lines.append(f"\n## {sb['script_type']} ({sb['language']})\n")
            for shot in sb.get("shots", []):
                lines.append(f"### Shot {shot['shot_number']}: {shot['shot_type']}\n")
                lines.append(f"```\n{shot['ai_prompt']}\n```\n")
                lines.append(f"Camera: {shot['camera_movement']} | Sound: {shot['sound_design']}\n")
        write_text(path, "\n".join(lines))


# ── CLI ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="TikTok AI Video Factory — End-to-end pipeline"
    )
    parser.add_argument("--brief", type=Path, help="Path to product_brief.json")
    parser.add_argument("--seedance-config", type=Path, help="Path to seedance_config.json")
    parser.add_argument("--out", type=Path, default=Path("output/pipeline"),
                        help="Output directory (default: output/pipeline)")
    parser.add_argument("--languages", type=str, default="en",
                        help="Comma-separated language codes (default: en)")
    parser.add_argument("--script-types", type=str, default="ugc,review,problem_solution",
                        help="Comma-separated script types (default: ugc,review,problem_solution)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip API calls (Seedance + TTS)")
    parser.add_argument("--skip-video", action="store_true",
                        help="Skip video generation (Seedance API)")
    args = parser.parse_args()

    # Load configs
    try:
        brief = load_product_brief(args.brief)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Tip: Copy configs/product_brief.template.json to configs/product_brief.json")
        sys.exit(1)

    seedance_config = None
    if not args.skip_video:
        try:
            seedance_config = load_seedance_config(args.seedance_config)
        except FileNotFoundError:
            print("Warning: No Seedance config found — video generation will be skipped.")
            print("  Copy configs/seedance_config.template.json to configs/seedance_config.json")

    languages = [l.strip() for l in args.languages.split(",")]
    script_types = [s.strip() for s in args.script_types.split(",")]

    # Run pipeline
    pipeline = Pipeline(
        brief=brief,
        seedance_config=seedance_config,
        output_dir=args.out,
        languages=languages,
        script_types=script_types,
        dry_run=args.dry_run,
    )
    manifest = pipeline.run()

    # Print summary
    print(f"\n{'─' * 40}")
    print("Output Summary:")
    for stage, info in manifest.get("stages", {}).items():
        status = info.get("status", "?")
        icon = "[OK]" if status == "ok" else "[SKIP]" if status == "skipped" else "[ERR]"
        print(f"  {icon} {stage}: {status}")
    print(f"\nFull manifest: {args.out / 'pipeline_manifest.json'}")


if __name__ == "__main__":
    main()
