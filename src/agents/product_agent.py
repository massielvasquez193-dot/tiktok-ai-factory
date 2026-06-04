#!/usr/bin/env python3
"""
Product Agent — Analyze product brief, extract selling points,
generate structured product data for downstream agents.

Usage:
    from src.agents.product_agent import ProductAgent

    agent = ProductAgent()
    result = agent.analyze(product_brief)
    print(result["benefits"])
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class ProductAnalysis:
    """Structured output of the Product Agent."""
    product_name: str = ""
    category: str = ""
    price: str = ""
    offer: str = ""
    target_country: str = "US"
    audience_persona: str = ""
    benefits: list[str] = field(default_factory=list)
    pain_points: list[str] = field(default_factory=list)
    objections: list[str] = field(default_factory=list)
    claims: list[dict] = field(default_factory=list)
    tone_suggestions: list[str] = field(default_factory=list)
    unique_selling_points: list[str] = field(default_factory=list)
    hooks: list[str] = field(default_factory=list)


class ProductAgent:
    """
    Analyze a product brief and produce structured, actionable product data.

    Reads the brief, validates it, and extracts/derives:
    - Core product info
    - Target audience profile
    - Selling points (benefits + USPs)
    - High-converting hook angles
    - Objection handling points
    """

    def __init__(self, brief: Optional[dict] = None):
        self.brief = brief or {}
        self._product = self.brief.get("product", {})
        self._audience = self.brief.get("audience", {})
        self._creative = self.brief.get("creative", {})

    # ── Main entry ───────────────────────────────────────────────────────

    def analyze(self, brief: Optional[dict] = None) -> ProductAnalysis:
        """
        Run full product analysis. Returns a ProductAnalysis dataclass.
        Accepts brief as argument or uses the one passed to __init__.
        """
        if brief is not None:
            self.brief = brief
            self._product = brief.get("product", {})
            self._audience = brief.get("audience", {})
            self._creative = brief.get("creative", {})

        result = ProductAnalysis(
            product_name=self._product.get("name", "Unknown Product"),
            category=self._product.get("category", "General"),
            price=self._product.get("price", "$XX.XX"),
            offer=self._product.get("offer", "Check the link for today's deal"),
            target_country=self._product.get("target_country", "US"),
            audience_persona=self._audience.get("persona", ""),
            benefits=self._extract_benefits(),
            pain_points=self._safe_list(self._audience.get("pain_points")),
            objections=self._safe_list(self._audience.get("objections")),
            claims=self._product.get("claims", self.brief.get("claims", [])),
            tone_suggestions=self._derive_tone(),
            unique_selling_points=self._derive_usps(),
            hooks=self._generate_hooks(),
        )
        return result

    def to_json(self, result: Optional[ProductAnalysis] = None) -> str:
        """Serialize analysis result to JSON string."""
        if result is None:
            result = self.analyze()
        return json.dumps(asdict(result), indent=2, ensure_ascii=False)

    # ── Extraction helpers ───────────────────────────────────────────────

    def _extract_benefits(self) -> list[str]:
        """Merge explicit benefits from product + audience outcomes."""
        outcomes = self._safe_list(self._audience.get("desired_outcomes"))
        # Also derive from claims
        for claim in self._safe_list(self.brief.get("claims", [])):
            if isinstance(claim, dict) and claim.get("status") == "verified":
                outcomes.append(claim.get("claim", ""))
        return list(dict.fromkeys(outcomes))  # deduplicate, preserve order

    def _derive_usps(self) -> list[str]:
        """Derive unique selling propositions from brief data."""
        usps = []
        name = self._product.get("name", "")
        category = self._product.get("category", "")
        claims = self._safe_list(self.brief.get("claims", []))

        # From verified claims
        for c in claims:
            if isinstance(c, dict) and c.get("status") == "verified":
                usps.append(c.get("claim", ""))

        # From product features (heuristic)
        name_lower = name.lower()
        if any(kw in name_lower for kw in ["portable", "mini", "compact"]):
            usps.append("Ultra-portable design")
        if any(kw in name_lower for kw in ["rechargeable", "usb", "cordless"]):
            usps.append("Cordless convenience")
        if any(kw in category.lower() for kw in ["blender", "mixer"]):
            usps.append("Powerful motor despite compact size")

        return list(dict.fromkeys(usps))

    def _derive_tone(self) -> list[str]:
        """Suggest TikTok-native tones based on product and audience."""
        tones = []
        persona = self._audience.get("persona", "").lower()
        creative = self._creative.get("tone", "")

        if creative:
            tones.append(creative)

        if any(kw in persona for kw in ["busy", "professional", "office"]):
            tones.extend(["fast-paced", "problem-solution"])
        if any(kw in persona for kw in ["fitness", "gym", "athlete"]):
            tones.extend(["energetic", "motivational"])
        if any(kw in persona for kw in ["mom", "parent", "family"]):
            tones.extend(["relatable", "warm", "genuine"])

        # Default fallback
        if not tones:
            tones = ["energetic", "relatable", "credible"]

        return list(dict.fromkeys(tones))

    def _generate_hooks(self) -> list[str]:
        """Generate 8-10 varied TikTok hooks from product/audience data."""
        name = self._product.get("name", "this product")
        category = self._product.get("category", "this item")
        price = self._product.get("price", "$XX")
        pains = self._safe_list(self._audience.get("pain_points"))
        outcomes = self._safe_list(self._audience.get("desired_outcomes"))
        objections = self._safe_list(self._audience.get("objections"))

        p1 = self._as_sentence(pains[0]) if pains else "the daily struggle"
        p2 = self._as_sentence(pains[1]) if len(pains) > 1 else p1
        o1 = self._as_sentence(outcomes[0]) if outcomes else "a better way"
        obj1 = self._as_sentence(objections[0]) if objections else "if it actually works"

        hooks = [
            # Problem hooks
            f"Tired of {p1}? This {category} changes everything.",
            f"If {p2} keeps wasting your time, you need this.",
            # Curiosity hooks
            f"The {category} going viral for {o1} — let's test it.",
            f"I bought the {name} so you don't have to. Here's the truth.",
            f"Three seconds in, and you'll want one of these.",
            # Demo-tease hooks
            f"Watch what happens when you use the {name}. Wait for it.",
            f"This is what 20 seconds with the {name} looks like.",
            # Question hooks
            f"Ever wonder if a {price.replace('$', '')} {category} is actually worth it?",
            f"Want {o1}? Here's the shortcut.",
            # Objection hook
            f"You asked {obj1.rstrip('?')} — here's the answer.",
        ]

        seen = set()
        unique = []
        for h in hooks:
            if h not in seen:
                seen.add(h)
                unique.append(h)
        return unique

    # ── Utility ──────────────────────────────────────────────────────────

    @staticmethod
    def _safe_list(value) -> list:
        if isinstance(value, list):
            return value
        if value in (None, ""):
            return []
        return [value]

    @staticmethod
    def _as_sentence(text: str) -> str:
        t = text.strip().rstrip(".")
        if not t:
            return "a common frustration"
        return t[0].lower() + t[1:] if len(t) > 1 else t.lower()


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from src.utils.config import load_product_brief, write_json, ensure_output_dir

    brief = load_product_brief(sys.argv[1] if len(sys.argv) > 1 else None)
    agent = ProductAgent(brief)
    result = agent.analyze()

    out_dir = ensure_output_dir("analysis")
    out_path = out_dir / "product_analysis.json"
    write_json(out_path, asdict(result))
    print(f"\n[ProductAgent] Analysis saved to {out_path}")
    print(f"  Product: {result.product_name}")
    print(f"  Benefits: {len(result.benefits)}, Hooks: {len(result.hooks)}")
    print(f"  USPs: {result.unique_selling_points}")
