#!/usr/bin/env python3
"""
Viral Research Agent — Discover and analyze trending TikTok/Reels content.

Capabilities:
  - Search TikTok by keyword / hashtag
  - Extract video metrics (views, likes, comments, shares)
  - Analyze hook patterns and script structures
  - Generate "viral template" library
  - Export structured data for Script Agent

Usage:
    from src.agents.viral_research_agent import ViralResearchAgent

    agent = ViralResearchAgent()
    results = await agent.research(
        keywords=["portable blender", "smoothie maker"],
        platforms=["tiktok"],
        max_videos=20,
    )
    agent.export_templates(results, "output/research/viral_templates.json")
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class VideoMeta:
    """Structured data for a single viral video."""
    platform: str = "tiktok"
    video_id: str = ""
    url: str = ""
    author: str = ""
    description: str = ""
    hashtags: list[str] = field(default_factory=list)
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    duration_seconds: int = 0
    music: str = ""
    thumbnail_url: str = ""

    # Analysis results
    hook_type: str = ""           # problem / curiosity / demo / question / comparison
    hook_text: str = ""
    script_structure: str = ""     # 3-act / problem-solution / review / etc
    camera_style: str = ""         # POV / overhead / handheld / studio
    pacing: str = ""               # fast / medium / slow
    key_insights: list[str] = field(default_factory=list)


@dataclass
class ViralTemplate:
    """Reusable viral template extracted from research."""
    template_name: str = ""
    category: str = ""
    hook_pattern: str = ""
    script_flow: list[str] = field(default_factory=list)
    camera_notes: list[str] = field(default_factory=list)
    best_practices: list[str] = field(default_factory=list)
    source_videos: list[str] = field(default_factory=list)


class ViralResearchAgent:
    """
    Research trending content across TikTok, Instagram Reels, YouTube Shorts.
    Extract patterns, hooks, and reusable templates.
    """

    # ── Configuration ────────────────────────────────────────────────────

    PLATFORMS = {
        "tiktok": {
            "search_url": "https://www.tiktok.com/search?q={query}",
            "hashtag_url": "https://www.tiktok.com/tag/{tag}",
            "video_selector": '[data-e2e="search-card-video"]',
        },
        "instagram": {
            "search_url": "https://www.instagram.com/explore/tags/{tag}/",
            "hashtag_url": "https://www.instagram.com/explore/tags/{tag}/",
        },
        "youtube_shorts": {
            "search_url": "https://www.youtube.com/results?search_query={query}+shorts",
        },
    }

    # Hook detection patterns
    HOOK_PATTERNS = {
        "problem": [r"(?i)tired of", r"(?i)hate when", r"(?i)struggling with", r"(?i)sick of"],
        "curiosity": [r"(?i)wait for it", r"(?i)watch what happens", r"(?i)you won't believe"],
        "demo": [r"(?i)look at this", r"(?i)check this out", r"(?i)see how"],
        "question": [r"^\?", r"(?i)ever wonder", r"(?i)did you know"],
        "comparison": [r"(?i)vs\.?", r"(?i)before.*after", r"(?i)this vs that"],
        "social_proof": [r"(?i)viral", r"(?i)everyone.*talking", r"(?i)best selling"],
    }

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = Path(output_dir or "output/research")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ── Public API ───────────────────────────────────────────────────────

    async def research(
        self,
        keywords: list[str],
        platforms: Optional[list[str]] = None,
        max_videos: int = 20,
        headless: bool = True,
    ) -> list[VideoMeta]:
        """
        Main entry point: search across platforms and return structured results.

        Parameters
        ----------
        keywords : list[str]
            Search queries (e.g., ["portable blender", "kitchen gadgets"]).
        platforms : list[str]
            Platforms to search (default: ["tiktok"]).
        max_videos : int
            Maximum videos to collect per keyword.
        headless : bool
            Run browser headless (True) or visible (False).

        Returns
        -------
        list[VideoMeta]
            Analyzed video metadata with hook/script/camera analysis.
        """
        platforms = platforms or ["tiktok"]
        all_results: list[VideoMeta] = []

        for platform in platforms:
            for keyword in keywords:
                print(f"\n[ViralResearch] Searching {platform} for: '{keyword}'")
                try:
                    results = await self._search_platform(platform, keyword, max_videos, headless)
                    all_results.extend(results)
                    print(f"  Found {len(results)} videos for '{keyword}' on {platform}")
                except Exception as e:
                    print(f"  [ERROR] {platform}/{keyword}: {e}")

        # Deduplicate
        seen = set()
        unique = []
        for v in all_results:
            if v.video_id not in seen:
                seen.add(v.video_id)
                unique.append(v)

        # Analyze patterns
        for video in unique:
            self._analyze_video(video)

        # Sort by engagement
        unique.sort(key=lambda v: v.views + v.likes * 2 + v.shares * 3, reverse=True)

        print(f"\n[ViralResearch] Total: {len(unique)} unique videos across {len(platforms)} platform(s)")
        return unique

    async def research_hashtag(
        self,
        hashtags: list[str],
        max_videos: int = 20,
        headless: bool = True,
    ) -> list[VideoMeta]:
        """Research by hashtag instead of keyword search."""
        all_results = []
        for tag in hashtags:
            # Strip # if present
            tag_clean = tag.lstrip("#")
            results = await self._search_platform("tiktok", f"#{tag_clean}", max_videos, headless)
            all_results.extend(results)

        for video in all_results:
            self._analyze_video(video)
        return all_results

    def export_templates(self, videos: list[VideoMeta], output_path: Optional[Path] = None) -> list[ViralTemplate]:
        """
        Generate reusable viral templates from research data.
        Saves to JSON and returns template objects.
        """
        templates = self._generate_templates(videos)

        output_path = output_path or self.output_dir / "viral_templates.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump([asdict(t) for t in templates], f, indent=2, ensure_ascii=False)
        print(f"\n[ViralResearch] Exported {len(templates)} templates -> {output_path}")
        return templates

    def export_report(self, videos: list[VideoMeta], output_path: Optional[Path] = None) -> Path:
        """Generate a markdown research report."""
        output_path = output_path or self.output_dir / "viral_report.md"

        lines = [
            "# Viral Content Research Report\n",
            f"**Generated:** {time.strftime('%Y-%m-%d %H:%M')}\n",
            f"**Videos analyzed:** {len(videos)}\n",
            "\n---\n",
            "\n## Top Videos by Engagement\n",
        ]

        for i, v in enumerate(videos[:10], 1):
            engagement = v.views + v.likes * 2 + v.shares * 3
            lines.append(f"### {i}. {v.description[:80]}\n")
            lines.append(f"- Platform: {v.platform} | Views: {v.views:,} | Likes: {v.likes:,}")
            lines.append(f"- Hook: [{v.hook_type}] {v.hook_text[:100]}")
            lines.append(f"- Structure: {v.script_structure} | Camera: {v.camera_style} | Pacing: {v.pacing}")
            lines.append(f"- Hashtags: {' '.join(v.hashtags[:5])}")
            lines.append(f"- URL: {v.url}\n")

        lines.append("\n## Hook Type Distribution\n")
        hook_counts = {}
        for v in videos:
            hook_counts[v.hook_type] = hook_counts.get(v.hook_type, 0) + 1
        for hook_type, count in sorted(hook_counts.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- **{hook_type}**: {count} videos")

        lines.append("\n## Key Insights\n")
        insights = set()
        for v in videos:
            for ins in v.key_insights:
                insights.add(ins)
        for ins in sorted(insights):
            lines.append(f"- {ins}")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(lines), encoding="utf-8")
        print(f"  [ViralResearch] Report saved -> {output_path}")
        return output_path

    # ── Internal: search ──────────────────────────────────────────────────

    async def _search_platform(self, platform: str, query: str, max_videos: int,
                               headless: bool) -> list[VideoMeta]:
        if platform == "tiktok":
            return await self._search_tiktok(query, max_videos, headless)
        else:
            print(f"  [SKIP] {platform} search not yet implemented")
            return []

    async def _search_tiktok(self, query: str, max_videos: int,
                             headless: bool) -> list[VideoMeta]:
        """
        Search TikTok and extract video metadata.

        Uses Playwright to load the TikTok search page and parse the
        initial server-rendered data, avoiding infinite scroll complexity.
        """
        from src.services.playwright_browser import BrowserService

        results = []
        search_url = f"https://www.tiktok.com/search?q={query.replace(' ', '%20')}"

        async with BrowserService(headless=headless) as browser:
            page = await browser.new_page()

            try:
                # Navigate to search
                await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(3)  # Let dynamic content load

                # Scroll a few times to load more videos
                for _ in range(min(max_videos // 10, 5)):
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(2)

                # Extract video data from the page
                video_data = await page.evaluate("""
                    () => {
                        const videos = [];
                        // TikTok stores video data in __UNIVERSAL_DATA_FOR_REHYDRATION__
                        const script = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
                        if (script && script.textContent) {
                            try {
                                const data = JSON.parse(script.textContent);
                                const items = data?.__DEFAULT_SCOPE__?.['webapp.search-video']?.itemList || [];
                                for (const item of items) {
                                    videos.push({
                                        id: item.id || '',
                                        desc: item.desc || '',
                                        author: item.author?.nickname || item.author?.uniqueId || '',
                                        stats: {
                                            playCount: item.stats?.playCount || 0,
                                            diggCount: item.stats?.diggCount || 0,
                                            commentCount: item.stats?.commentCount || 0,
                                            shareCount: item.stats?.shareCount || 0,
                                        },
                                        music: item.music?.title || '',
                                        duration: item.video?.duration || 0,
                                        cover: item.video?.cover || '',
                                    });
                                }
                            } catch(e) {}
                        }
                        return videos;
                    }
                """)

                for v in video_data:
                    if len(results) >= max_videos:
                        break
                    results.append(VideoMeta(
                        platform="tiktok",
                        video_id=v.get("id", ""),
                        url=f"https://www.tiktok.com/@user/video/{v.get('id', '')}",
                        author=v.get("author", ""),
                        description=v.get("desc", ""),
                        hashtags=self._extract_hashtags(v.get("desc", "")),
                        views=v.get("stats", {}).get("playCount", 0) if isinstance(v.get("stats"), dict) else 0,
                        likes=v.get("stats", {}).get("diggCount", 0) if isinstance(v.get("stats"), dict) else 0,
                        comments=v.get("stats", {}).get("commentCount", 0) if isinstance(v.get("stats"), dict) else 0,
                        shares=v.get("stats", {}).get("shareCount", 0) if isinstance(v.get("stats"), dict) else 0,
                        duration_seconds=v.get("duration", 0),
                        music=v.get("music", ""),
                        thumbnail_url=v.get("cover", ""),
                    ))

            except Exception as e:
                print(f"  [WARN] TikTok search error: {e}")

            await page.close()

        return results

    # ── Analysis ─────────────────────────────────────────────────────────

    def _analyze_video(self, video: VideoMeta) -> None:
        """Analyze a video to detect hook type, structure, camera style, etc."""
        desc = video.description or ""
        desc_lower = desc.lower()

        # Detect hook type
        for hook_type, patterns in self.HOOK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, desc):
                    video.hook_type = hook_type
                    video.hook_text = desc[:120]
                    break
            if video.hook_type:
                break
        if not video.hook_type:
            video.hook_type = "unknown"

        # Detect script structure
        if any(kw in desc_lower for kw in ["before", "after", "transformation"]):
            video.script_structure = "before-after"
        elif any(kw in desc_lower for kw in ["review", "honest", "testing"]):
            video.script_structure = "review"
        elif any(kw in desc_lower for kw in ["pov", "point of view"]):
            video.script_structure = "pov"
        elif any(kw in desc_lower for kw in ["problem", "solution", "fix", "hack"]):
            video.script_structure = "problem-solution"
        elif any(kw in desc_lower for kw in ["unboxing", "new", "just got"]):
            video.script_structure = "unboxing"
        else:
            video.script_structure = "demo"

        # Detect camera style
        if any(kw in desc_lower for kw in ["pov", "handheld"]):
            video.camera_style = "POV/handheld"
        elif any(kw in desc_lower for kw in ["close up", "macro", "detail"]):
            video.camera_style = "macro/close-up"
        elif any(kw in desc_lower for kw in ["studio", "lighting", "setup"]):
            video.camera_style = "studio"
        else:
            video.camera_style = "mixed"

        # Detect pacing
        if video.duration_seconds <= 10:
            video.pacing = "fast"
        elif video.duration_seconds <= 25:
            video.pacing = "medium"
        else:
            video.pacing = "slow"

        # Generate key insights
        insights = []
        if video.views > 100000:
            insights.append(f"High viral potential: {video.views:,} views with {video.hook_type} hook")
        if video.engagement_rate() > 5:
            insights.append(f"Exceptional engagement rate: {video.engagement_rate():.1f}%")
        if video.duration_seconds > 0 and video.duration_seconds <= 15:
            insights.append("Short-form (<15s) outperforming — optimize for brevity")
        if any(tag in [h.lower() for h in video.hashtags] for tag in ["fyp", "viral", "trending"]):
            insights.append("FYP-optimized hashtag strategy detected")
        video.key_insights = insights

    # ── Template generation ──────────────────────────────────────────────

    def _generate_templates(self, videos: list[VideoMeta]) -> list[ViralTemplate]:
        """Cluster videos into reusable templates."""
        templates = []
        hook_groups = {}

        for v in videos:
            key = f"{v.hook_type}_{v.script_structure}"
            if key not in hook_groups:
                hook_groups[key] = []
            hook_groups[key].append(v)

        for key, group in hook_groups.items():
            if len(group) < 2:
                continue

            top = group[0]
            avg_views = sum(v.views for v in group) / len(group)

            templates.append(ViralTemplate(
                template_name=f"{top.hook_type.title()} + {top.script_structure.title()}",
                category=key,
                hook_pattern=top.hook_text,
                script_flow=[
                    f"1. Hook ({top.hook_type}): Grab attention in first 2-3 seconds",
                    f"2. Body: {top.script_structure} format, {top.pacing} pacing",
                    "3. CTA: Direct call-to-action with urgency",
                ],
                camera_notes=[top.camera_style, f"Ideal length: {top.duration_seconds}s"],
                best_practices=[
                    f"Average views: {avg_views:,.0f}",
                    f"Use {top.hook_type} hooks for this category",
                    "Post during peak hours (7-9 PM local time)",
                ],
                source_videos=[v.url for v in group[:3]],
            ))

        return templates

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _extract_hashtags(text: str) -> list[str]:
        return re.findall(r'#\w+', text)


# ── VideoMeta helper ──────────────────────────────────────────────────────

def _add_engagement_method():
    """Monkey-patch: add engagement_rate() to VideoMeta."""
    def engagement_rate(self) -> float:
        if self.views == 0:
            return 0.0
        return ((self.likes + self.comments + self.shares) / self.views) * 100
    VideoMeta.engagement_rate = engagement_rate

_add_engagement_method()


# ── Sync convenience ──────────────────────────────────────────────────────

def research_sync(
    keywords: list[str],
    max_videos: int = 20,
    headless: bool = True,
    output_dir: Optional[Path] = None,
) -> list[VideoMeta]:
    """
    Synchronous wrapper for quick scripts.
    Usage: results = research_sync(["blender", "kitchen gadget"])
    """
    agent = ViralResearchAgent(output_dir=output_dir)

    async def _run():
        return await agent.research(keywords=keywords, max_videos=max_videos, headless=headless)

    return asyncio.run(_run())


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    print("Viral Research Agent — CLI")
    print("Usage: python src/agents/viral_research_agent.py <keyword1,keyword2>")
    print()

    keywords = sys.argv[1].split(",") if len(sys.argv) > 1 else ["portable blender"]
    print(f"Searching: {keywords}")

    results = research_sync(keywords, max_videos=10, headless=True)

    agent = ViralResearchAgent()
    templates = agent.export_templates(results)
    agent.export_report(results)

    print(f"\nTop 5 results:")
    for i, v in enumerate(results[:5], 1):
        print(f"  {i}. [{v.hook_type}] {v.description[:80]} — {v.views:,} views")
