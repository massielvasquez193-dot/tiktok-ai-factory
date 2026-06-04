#!/usr/bin/env python3
"""
Script Agent — Generate TikTok short-video scripts in multiple formats and languages.

Supports 5 script types:
  - ugc              (user-generated-content style)
  - review           (unboxing / review)
  - before_after     (transformation)
  - pov              (point-of-view)
  - problem_solution (pain → solution)

Supports 5 languages: English, Malay, Thai, Filipino, Spanish.

Usage:
    from src.agents.script_agent import ScriptAgent

    agent = ScriptAgent(product_analysis)
    scripts = agent.generate_all()
    for s in scripts:
        print(s["script_type"], s["language"])
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


# ── Script data classes ────────────────────────────────────────────────────

@dataclass
class ScriptScene:
    scene_number: int
    voiceover: str = ""
    on_screen_text: str = ""
    duration_seconds: int = 3
    camera: str = ""
    shot_type: str = ""


@dataclass
class Script:
    script_type: str = ""
    language: str = "en"
    language_name: str = "English"
    duration_seconds: int = 25
    hook: dict = field(default_factory=dict)
    scenes: list[ScriptScene] = field(default_factory=list)
    cta: dict = field(default_factory=dict)
    hashtags: list[str] = field(default_factory=list)
    compliance_notes: list[str] = field(default_factory=list)


# ── Language configs ────────────────────────────────────────────────────────

LANGUAGES = {
    "en": "English",
    "ms": "Malay",
    "th": "Thai",
    "fil": "Filipino",
    "es": "Spanish",
}

SCRIPT_TYPES = {
    "ugc": "UGC (User Generated Content)",
    "review": "Review / Unboxing",
    "before_after": "Before & After",
    "pov": "POV (Point of View)",
    "problem_solution": "Problem → Solution",
}


class ScriptAgent:
    """
    Generate TikTok video scripts from product data in multiple formats
    and languages. Designed for e-commerce / affiliate marketing use.
    """

    def __init__(self, analysis: dict | object):
        """
        *analysis* can be a ProductAnalysis dataclass or a dict from product_agent.
        """
        if hasattr(analysis, '__dataclass_fields__'):
            self.data = asdict(analysis)
        else:
            self.data = analysis

    # ── Public API ────────────────────────────────────────────────────────

    def generate_all(self, languages: Optional[list[str]] = None,
                     script_types: Optional[list[str]] = None) -> list[dict]:
        """
        Generate all script type x language combinations.
        Returns a list of Script dataclasses as dicts.
        """
        langs = languages or ["en"]
        types = script_types or list(SCRIPT_TYPES.keys())

        results = []
        for st in types:
            for lang in langs:
                script = self.generate(st, lang)
                results.append(asdict(script))
        return results

    def generate(self, script_type: str = "ugc", language: str = "en") -> Script:
        """
        Generate a single script of the given type and language.
        """
        name = self.data.get("product_name", "this product")
        category = self.data.get("category", "product")
        offer = self.data.get("offer", "today's offer")
        benefits = self.data.get("benefits", [])
        pain_points = self.data.get("pain_points", [])
        hooks = self.data.get("hooks", [])
        price = self.data.get("price", "$XX")

        # Pick a hook — prefer first one
        hook_text = hooks[0] if hooks else f"Check out this {category}!"

        # Generate script structure based on type
        if script_type == "ugc":
            script = self._build_ugc(name, category, offer, benefits, pain_points, hook_text, language, price)
        elif script_type == "review":
            script = self._build_review(name, category, offer, benefits, pain_points, hook_text, language, price)
        elif script_type == "before_after":
            script = self._build_before_after(name, category, offer, benefits, pain_points, hook_text, language, price)
        elif script_type == "pov":
            script = self._build_pov(name, category, offer, benefits, pain_points, hook_text, language, price)
        elif script_type == "problem_solution":
            script = self._build_problem_solution(name, category, offer, benefits, pain_points, hook_text, language, price)
        else:
            script = self._build_ugc(name, category, offer, benefits, pain_points, hook_text, language, price)

        script.script_type = script_type
        script.language = language
        script.language_name = LANGUAGES.get(language, language)
        script.hashtags = self._build_hashtags(name, category)
        return script

    # ── Script builders ───────────────────────────────────────────────────

    def _build_ugc(self, name, category, offer, benefits, pains, hook, lang, price):
        """UGC style — feels like a friend sharing a find."""
        benefit_text = benefits[0] if benefits else "how well it works"
        pain_text = self._as_sentence(pains[0]) if pains else "the usual hassle"

        return Script(
            duration_seconds=25,
            hook={"text": hook, "duration_seconds": 3},
            scenes=[
                ScriptScene(1, f"Honestly, I was so tired of {pain_text}. Nothing seemed to work.",
                            "POV: You're about to find the fix", 5, "handheld POV", "hook"),
                ScriptScene(2, f"Then I found the {name}. At first I was skeptical — {price} for a {category}?",
                            f"{name} unboxing", 5, "overhead shot", "reveal"),
                ScriptScene(3, f"But look at this. {benefit_text.capitalize()}. It's honestly impressive.",
                            "Wait for it...", 7, "macro close-up", "demo"),
                ScriptScene(4, f"I've been using it for a couple weeks now and I'm genuinely impressed.",
                            "2 weeks later...", 4, "lifestyle b-roll", "social_proof"),
                ScriptScene(5, f"If you want {self._as_gerund(benefit_text)}, this is it. {offer}.",
                            f"Tap link | {offer}", 4, "product beauty", "cta"),
            ],
            cta={"text": f"Tap the link to check it out. {offer}!", "duration_seconds": 2},
        )

    def _build_review(self, name, category, offer, benefits, pains, hook, lang, price):
        """Review / unboxing style."""
        benefit_text = benefits[0] if benefits else "the performance"
        return Script(
            duration_seconds=25,
            hook={"text": hook, "duration_seconds": 3},
            scenes=[
                ScriptScene(1, f"Full honest review of the {name}. No filter, not sponsored.",
                            "HONEST REVIEW", 4, "face-to-camera", "hook"),
                ScriptScene(2, f"First thing you notice — this thing is compact. Fits in one hand.",
                            f"Compact {category}", 4, "handheld reveal", "feature"),
                ScriptScene(3, f"Here's the real test. Let's see if it can actually handle this.",
                            "REAL TEST", 6, "top-down demo", "demo"),
                ScriptScene(4, f"Okay that's impressive. {benefit_text.capitalize()}. No joke.",
                            "Result: PASSED", 5, "close-up result", "proof"),
                ScriptScene(5, f"Bottom line: for {price}, this is a solid buy. {offer}.",
                            f"Verdict: BUY | {offer}", 5, "final shot", "cta"),
            ],
            cta={"text": f"Link in bio for the best price. {offer}!", "duration_seconds": 2},
        )

    def _build_before_after(self, name, category, offer, benefits, pains, hook, lang, price):
        """Before & After transformation script."""
        pain_text = self._as_sentence(pains[0]) if pains else "before"
        benefit_text = benefits[0] if benefits else "after"
        return Script(
            duration_seconds=20,
            hook={"text": hook, "duration_seconds": 3},
            scenes=[
                ScriptScene(1, f"BEFORE: {pain_text}. Every single day.",
                            "BEFORE", 3, "dim lighting", "problem"),
                ScriptScene(2, f"AFTER: {benefit_text}. And it takes literally seconds.",
                            "AFTER", 3, "bright lighting", "solution"),
                ScriptScene(3, f"The difference? The {name}. Here's what changed.",
                            "What changed?", 5, "split screen", "transition"),
                ScriptScene(4, f"This is {price} well spent. {offer}. Don't wait.",
                            f"Transform yours | {offer}", 4, "product shot", "cta"),
            ],
            cta={"text": f"Your turn. Tap the link! {offer}", "duration_seconds": 2},
        )

    def _build_pov(self, name, category, offer, benefits, pains, hook, lang, price):
        """POV script — first person perspective."""
        benefit_text = benefits[0] if benefits else "getting it done"
        return Script(
            duration_seconds=18,
            hook={"text": hook, "duration_seconds": 3},
            scenes=[
                ScriptScene(1, f"POV: You just got the {name} and your mornings are about to change.",
                            "POV: new product day", 4, "POV handheld", "hook"),
                ScriptScene(2, f"This is what 30 seconds looks like now. {benefit_text.capitalize()}.",
                            "30 seconds later...", 6, "POV time-lapse", "demo"),
                ScriptScene(3, f"No mess, no stress. Just results. {offer} for a limited time.",
                            f"Grab yours | {offer}", 3, "POV satisfaction", "cta"),
            ],
            cta={"text": f"Tap the link and see for yourself!", "duration_seconds": 2},
        )

    def _build_problem_solution(self, name, category, offer, benefits, pains, hook, lang, price):
        """Problem → Solution arc."""
        pain_text = pains[0] if pains else "the problem"
        benefit_text = benefits[0] if benefits else "the fix"
        pain2 = self._as_sentence(pains[1]) if len(pains) > 1 else pain_text
        return Script(
            duration_seconds=25,
            hook={"text": hook, "duration_seconds": 3},
            scenes=[
                ScriptScene(1, f"Here's the problem: {pain_text}. And {pain2}.",
                            "THE PROBLEM", 4, "frustration scene", "problem"),
                ScriptScene(2, f"I tried everything. Expensive alternatives, hacks, nothing worked consistently.",
                            "Tried everything...", 4, "montage", "buildup"),
                ScriptScene(3, f"Then I found the {name}. {benefit_text.capitalize()}. Game over.",
                            "THE FIX", 6, "demo reveal", "solution"),
                ScriptScene(4, f"If you're dealing with {pain_text}, stop overcomplicating it.",
                            "Don't overthink it", 5, "lifestyle", "empathy"),
                ScriptScene(5, f"This is the easiest {category} I've tried. {offer}.",
                            f"Easy fix | {offer}", 4, "CTA shot", "cta"),
            ],
            cta={"text": f"Fix this today. Tap the link! {offer}", "duration_seconds": 2},
        )

    # ── Helpers ──────────────────────────────────────────────────────────

    def _build_hashtags(self, name: str, category: str) -> list[str]:
        tags = set()
        brand_slug = "".join(c for c in name if c.isalnum())
        tags.add(f"#{brand_slug}")
        for word in category.split():
            clean = "".join(c for c in word if c.isalnum())
            if clean:
                tags.add(f"#{clean}")
        tags.update({"#TikTokShop", "#TikTokMadeMeBuyIt", "#AmazonFinds"})
        return list(tags)[:10]

    @staticmethod
    def _as_sentence(text: str) -> str:
        t = text.strip().rstrip(".")
        if not t:
            return "a common frustration"
        return t[0].lower() + t[1:] if len(t) > 1 else t.lower()

    @staticmethod
    def _as_gerund(text: str) -> str:
        t = text.strip()
        if not t:
            return "getting results"
        words = t.split()
        verb = words[0].lower()
        gerunds = {
            "make": "making", "get": "getting", "do": "doing", "go": "going",
            "take": "taking", "have": "having", "use": "using", "find": "finding",
            "create": "creating", "build": "building", "try": "trying",
            "see": "seeing", "feel": "feeling", "lose": "losing", "save": "saving",
            "enjoy": "enjoying", "drink": "drinking", "eat": "eating",
            "apply": "applying", "carry": "carrying",
        }
        gerund = gerunds.get(verb, verb.rstrip("e") + "ing" if verb.endswith("e") else verb + "ing")
        return gerund + " " + " ".join(words[1:]).rstrip(".")


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, json
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from src.utils.config import load_product_brief, write_json, ensure_output_dir
    from src.agents.product_agent import ProductAgent

    # Load product brief, run Product Agent, then Script Agent
    brief = load_product_brief(sys.argv[1] if len(sys.argv) > 1 else None)
    product = ProductAgent(brief).analyze()

    agent = ScriptAgent(product)
    scripts = agent.generate_all(
        languages=["en"],
        script_types=["ugc", "review", "problem_solution"],
    )

    out_dir = ensure_output_dir("scripts")
    out_path = out_dir / "scripts.json"
    write_json(out_path, scripts)
    print(f"\n[ScriptAgent] Generated {len(scripts)} scripts -> {out_path}")
