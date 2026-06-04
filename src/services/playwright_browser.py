#!/usr/bin/env python3
"""
Playwright Browser Service — Shared browser instance manager.

Handles:
  - Browser lifecycle (launch / close)
  - Cookie / session persistence
  - Anti-detection measures
  - Proxy support

Usage:
    from src.services.playwright_browser import BrowserService

    async with BrowserService() as browser:
        page = await browser.new_page()
        await page.goto("https://www.tiktok.com")
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Optional


class BrowserService:
    """
    Managed Playwright browser instance with session persistence.
    """

    def __init__(
        self,
        headless: bool = True,
        proxy: Optional[dict] = None,
        user_data_dir: Optional[Path] = None,
        viewport: dict = None,
    ):
        self.headless = headless
        self.proxy = proxy
        self.user_data_dir = Path(user_data_dir or Path(__file__).parent.parent.parent / "browser_data")
        self.viewport = viewport or {"width": 390, "height": 844}  # iPhone 14 size

        self._playwright = None
        self._browser = None
        self._context = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

    async def start(self):
        """Launch browser with anti-detection measures."""
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()

        # Browser args for anti-detection
        args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-web-security",
        ]

        launch_options = {
            "headless": self.headless,
            "args": args,
        }

        if self.proxy:
            launch_options["proxy"] = self.proxy

        self._browser = await self._playwright.chromium.launch(**launch_options)

        # Context with realistic fingerprint
        context_options = {
            "viewport": self.viewport,
            "user_agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/17.0 Mobile/15E148 Safari/604.1"
            ),
            "locale": "en-US",
            "timezone_id": "America/New_York",
            "geolocation": {"longitude": -73.9857, "latitude": 40.7484},
            "permissions": ["geolocation"],
        }

        # Load saved session if exists
        session_file = self.user_data_dir / "session.json"
        if session_file.exists():
            try:
                with open(session_file, "r") as f:
                    storage_state = json.load(f)
                context_options["storage_state"] = storage_state
            except Exception:
                pass

        self._context = await self._browser.new_context(**context_options)

    async def stop(self):
        """Save session and close browser."""
        if self._context:
            # Save cookies + storage
            try:
                storage_state = await self._context.storage_state()
                self.user_data_dir.mkdir(parents=True, exist_ok=True)
                with open(self.user_data_dir / "session.json", "w") as f:
                    json.dump(storage_state, f)
            except Exception:
                pass
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def new_page(self):
        """Create a new page in the managed context."""
        if not self._context:
            raise RuntimeError("Browser not started. Use 'async with BrowserService() as browser:'")
        page = await self._context.new_page()

        # Inject stealth scripts
        await page.add_init_script("""
            // Overwrite navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // Overwrite chrome
            window.chrome = { runtime: {} };
            // Overwrite plugins
            Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
            // Overwrite languages
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        """)

        return page

    @property
    def context(self):
        return self._context


# ── Sync wrapper for simple scripts ──────────────────────────────────────

class SyncBrowser:
    """Synchronous wrapper for quick scripts."""

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self._service = None

    def __enter__(self):
        self._service = BrowserService(**self.kwargs)
        loop = asyncio.new_event_loop()
        loop.run_until_complete(self._service.start())
        self.loop = loop
        return self._service

    def __exit__(self, *args):
        self.loop.run_until_complete(self._service.stop())
        self.loop.close()
