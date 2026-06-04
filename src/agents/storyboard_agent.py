#!/usr/bin/env python3
"""
Storyboard Agent — Convert scripts into detailed shot-by-shot storyboards.

Generates:
  - Shot list with timing, camera movement, visual description
  - AI video prompt for each shot
  - SRT subtitle file

Usage:
    from src.agents.storyboard_agent import StoryboardAgent

    agent = StoryboardAgent(scripts)
    storyboards = agent.generate_all()
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class Shot:
    shot_number: int
    timecode: str = ""
    shot_type: str = ""
    visual_description: str = ""
    camera_movement: str = ""
    on_screen_text: str = ""
    voiceover: str = ""
    ai_prompt: str = ""
    sound_design: str = ""
    transition: str = "cut"


@dataclass
class Storyboard:
    script_type: str = ""
    language: str = ""
    total_duration: int = 0
    aspect_ratio: str = "9:16"
    shots: list[Shot] = field(default_factory=list)


class StoryboardAgent:
    """
    Generate detailed storyboards from scripts produced by ScriptAgent.
    Each shot includes an AI video generation prompt for Seedance/Kling/etc.
    """

    CAMERA_OPTIONS = [
        "push in", "pull out", "pan left", "pan right", "tilt up",
        "static locked", "handheld POV", "overhead", "dolly",
        "macro close-up", "slow push", "tracking shot",
    ]

    TRANSITIONS = ["jump cut", "cut on action", "match cut", "speed ramp", "hard cut"]

    def __init__(self, scripts: list[dict], product_name: str = "",
                 category: str = "", aspect_ratio: str = "9:16"):
        self.scripts = scripts
        self.product_name = product_name
        self.category = category
        self.aspect_ratio = aspect_ratio

    # ── Public API ────────────────────────────────────────────────────────

    def generate_all(self) -> list[dict]:
        """Generate storyboard for each script."""
        results = []
        for script in self.scripts:
            sb = self._build_storyboard(script)
            results.append(asdict(sb))
        return results

    def generate_for_script(self, script: dict) -> Storyboard:
        """Generate storyboard for a single script."""
        return self._build_storyboard(script)

    def export_csv(self, storyboards: list[dict], out_path: Path) -> Path:
        """Write all storyboards to CSV."""
        out_path.parent.mkdir(parents=True, exist_ok=True)
        header = ["script_type", "language", "shot_number", "timecode",
                  "shot_type", "visual", "camera_movement", "on_screen_text",
                  "voiceover", "ai_prompt", "sound", "transition"]

        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            for sb_dict in storyboards:
                for shot in sb_dict.get("shots", []):
                    writer.writerow([
                        sb_dict["script_type"], sb_dict["language"],
                        shot["shot_number"], shot["timecode"], shot["shot_type"],
                        shot["visual_description"], shot["camera_movement"],
                        shot["on_screen_text"], shot["voiceover"],
                        shot["ai_prompt"], shot["sound_design"], shot["transition"],
                    ])
        print(f"  [StoryboardAgent] CSV exported -> {out_path}")
        return out_path

    def build_srt(self, storyboard: dict, out_path: Path) -> Path:
        """Generate SRT subtitle file from a storyboard."""
        entries = []
        for i, shot in enumerate(storyboard.get("shots", []), 1):
            start, end = self._parse_timecode(shot["timecode"])
            entries.append(
                f"{i}\n"
                f"{self._fmt_srt(start)} --> {self._fmt_srt(end)}\n"
                f"{shot['voiceover']}\n"
            )
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("\n".join(entries), encoding="utf-8")
        print(f"  [StoryboardAgent] SRT exported -> {out_path}")
        return out_path

    # ── Internal builders ─────────────────────────────────────────────────

    def _build_storyboard(self, script: dict) -> Storyboard:
        stype = script.get("script_type", "ugc")
        lang = script.get("language", "en")
        scenes = script.get("scenes", [])
        hook = script.get("hook", {})
        cta = script.get("cta", {})

        total_dur = script.get("duration_seconds", sum(s.get("duration_seconds", 3) for s in scenes))

        shots = []
        time = 0

        # Hook shot
        hook_dur = hook.get("duration_seconds", 3)
        shots.append(Shot(
            shot_number=1,
            timecode=f"{time}-{time + hook_dur}s",
            shot_type="hook",
            visual_description=f"Fast reveal: {self.product_name}",
            camera_movement="push in",
            on_screen_text=scenes[0].get("on_screen_text", "") if scenes else hook.get("text", ""),
            voiceover=hook.get("text", ""),
            ai_prompt=self._build_ai_prompt("hook", f"product reveal of {self.product_name}",
                                            "push in", "beat hit"),
            sound_design="beat hit",
            transition="jump cut",
        ))
        time += hook_dur

        # Scene shots
        for i, scene in enumerate(scenes):
            dur = scene.get("duration_seconds", 3)
            stype_shot = scene.get("shot_type", "demo")
            cam = scene.get("camera", "handheld POV") if isinstance(scene, dict) else "handheld POV"
            voice = scene.get("voiceover", "") if isinstance(scene, dict) else scene.voiceover

            shots.append(Shot(
                shot_number=i + 2,
                timecode=f"{time}-{time + dur}s",
                shot_type=stype_shot,
                visual_description=f"Scene: {voice[:80]}",
                camera_movement=cam,
                on_screen_text=scene.get("on_screen_text", "") if isinstance(scene, dict) else "",
                voiceover=voice,
                ai_prompt=self._build_ai_prompt(stype_shot, voice, cam, "clean whoosh"),
                sound_design="clean whoosh",
                transition="cut on action",
            ))
            time += dur

        # CTA shot
        cta_dur = cta.get("duration_seconds", 2)
        if time < total_dur:
            cta_dur = total_dur - time
        shots.append(Shot(
            shot_number=len(scenes) + 2,
            timecode=f"{time}-{time + cta_dur}s",
            shot_type="cta",
            visual_description=f"Product beauty shot with offer text",
            camera_movement="slow push out",
            on_screen_text=cta.get("text", "Tap link!"),
            voiceover=cta.get("text", "Tap the link!"),
            ai_prompt=self._build_ai_prompt("cta", "product beauty shot with clean background",
                                            "slow push", "music lift"),
            sound_design="music lift",
            transition="hard cut",
        ))

        return Storyboard(
            script_type=stype,
            language=lang,
            total_duration=total_dur,
            aspect_ratio=self.aspect_ratio,
            shots=shots,
        )

    def _build_ai_prompt(self, shot_type: str, description: str,
                         camera: str, mood: str) -> str:
        """Build a Seedance/Kling-ready AI video prompt."""
        prompt = (
            f"Vertical {self.aspect_ratio} realistic short video, "
            f"{self._camera_prompt(camera)}, "
            f"showing {description}, "
            f"natural lighting, ecommerce product demo style, "
            f"TikTok native aesthetic, UGC feel, 4K."
        )
        return prompt

    def _camera_prompt(self, camera: str) -> str:
        """Convert shorthand camera to natural English for AI prompts."""
        mapping = {
            "push in": "smooth push-in camera movement",
            "pull out": "smooth pull-out camera movement",
            "handheld POV": "handheld POV shot, slight natural shake",
            "overhead": "overhead flat-lay shot",
            "macro close-up": "macro close-up with shallow depth of field",
            "slow push": "slow gentle push-in, cinematic",
            "static locked": "static locked-off tripod shot",
            "dolly": "smooth dolly camera movement",
        }
        return mapping.get(camera, "smooth camera movement")

    # ── SRT helpers ──────────────────────────────────────────────────────

    def _parse_timecode(self, tc: str) -> tuple[int, int]:
        m = re.match(r'(\d+)-(\d+)s?', tc.strip())
        if m:
            return int(m.group(1)), int(m.group(2))
        return 0, 2

    @staticmethod
    def _fmt_srt(seconds: int) -> str:
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:02d},000"


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, json
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from src.agents.product_agent import ProductAgent
    from src.agents.script_agent import ScriptAgent
    from src.utils.config import load_product_brief, ensure_output_dir

    brief = load_product_brief(sys.argv[1] if len(sys.argv) > 1 else None)
    product = ProductAgent(brief).analyze()
    scripts_data = ScriptAgent(product).generate_all(languages=["en"], script_types=["ugc"])

    agent = StoryboardAgent(
        scripts_data,
        product_name=product.product_name,
        category=product.category,
    )
    storyboards = agent.generate_all()

    out_dir = ensure_output_dir("storyboards")
    agent.export_csv(storyboards, out_dir / "storyboards.csv")
    if storyboards:
        agent.build_srt(storyboards[0], out_dir / "subtitles.srt")
    print(f"\n[StoryboardAgent] {len(storyboards)} storyboard(s) generated -> {out_dir}")
