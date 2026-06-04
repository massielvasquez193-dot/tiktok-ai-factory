#!/usr/bin/env python3
"""
Seedance API Client — Unified interface for ByteDance Seedance video generation.

Supported providers:
  - aimlapi    (api.aimlapi.com)           — Seedance 1.5 Pro / 1.0 Lite
  - fal        (fal.ai)                    — Seedance 1.5 Pro / 2.0
  - volcengine (Volcengine Ark official)   — Seedance 2.0

Usage:
    from src.services.seedance_client import SeedanceClient

    client = SeedanceClient.from_config("configs/seedance_config.json")
    video_url = client.generate("A golden retriever running on a beach...")
    client.download(video_url, Path("output/videos/my_video.mp4"))
"""

from __future__ import annotations

import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional


# ── Provider-specific defaults ──────────────────────────────────────────────

PROVIDER_DEFAULTS = {
    "aimlapi": {
        "base_url": "https://api.aimlapi.com/v2/video/generations",
        "model": "bytedance/seedance-1-5-pro",
    },
    "fal": {
        "base_url": "https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/text-to-video",
        "model": "fal-ai/bytedance/seedance/v1.5/pro/text-to-video",
    },
    "volcengine": {
        "base_url": "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
        "model": "doubao-seedance-2-0-260128",
    },
}


class SeedanceError(Exception):
    """Raised when the Seedance API returns an error."""


class SeedanceTimeout(SeedanceError):
    """Raised when polling exceeds max_wait_seconds."""


# ── Main client ─────────────────────────────────────────────────────────────

class SeedanceClient:
    """
    Unified Seedance video-generation client.

    Parameters
    ----------
    provider : str
        One of "aimlapi", "fal", "volcengine".
    api_key : str
        API key / bearer token.
    base_url : str | None
        Override the default endpoint for *provider*.
    model : str | None
        Override the default model for *provider*.
    aspect_ratio : str
        Default "9:16".
    resolution : str
        Default "720p".
    duration : int
        Default 5 (seconds).
    generate_audio : bool
        Default False.
    poll_interval : int
        Seconds between status polls (default 10).
    max_wait : int
        Maximum total wait time in seconds (default 600).
    """

    def __init__(
        self,
        provider: str = "volcengine",
        api_key: str = "",
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        aspect_ratio: str = "9:16",
        resolution: str = "720p",
        duration: int = 5,
        generate_audio: bool = False,
        watermark: bool = False,
        enable_safety_checker: bool = True,
        poll_interval: int = 10,
        max_wait: int = 600,
    ):
        if provider not in PROVIDER_DEFAULTS:
            raise ValueError(
                f"Unknown provider '{provider}'. Choose: {list(PROVIDER_DEFAULTS)}"
            )

        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url or PROVIDER_DEFAULTS[provider]["base_url"]
        self.model = model or PROVIDER_DEFAULTS[provider]["model"]
        self.aspect_ratio = aspect_ratio
        self.resolution = resolution
        self.duration = duration
        self.generate_audio = generate_audio
        self.watermark = watermark
        self.enable_safety_checker = enable_safety_checker
        self.poll_interval = poll_interval
        self.max_wait = max_wait

    # ── Factory ──────────────────────────────────────────────────────────

    @classmethod
    def from_config(cls, config: dict | str | Path) -> "SeedanceClient":
        """Create a client from a JSON config dict or file path."""
        if isinstance(config, (str, Path)):
            with open(config, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        else:
            cfg = config

        provider = cfg.get("provider", "volcengine")
        base_url_map = cfg.get("base_url", {})
        model_map = cfg.get("model", {})

        return cls(
            provider=provider,
            api_key=cfg.get("api_key", ""),
            base_url=base_url_map.get(provider) if isinstance(base_url_map, dict) else base_url_map,
            model=model_map.get(provider) if isinstance(model_map, dict) else model_map,
            aspect_ratio=cfg.get("aspect_ratio", "9:16"),
            resolution=cfg.get("resolution", "720p"),
            duration=cfg.get("duration", 5),
            generate_audio=cfg.get("generate_audio", False),
            watermark=cfg.get("watermark", False),
            enable_safety_checker=cfg.get("enable_safety_checker", True),
            poll_interval=cfg.get("poll_interval_seconds", 10),
            max_wait=cfg.get("max_wait_seconds", 600),
        )

    # ── Public API ───────────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        *,
        image_url: Optional[str] = None,
        last_image_url: Optional[str] = None,
        duration: Optional[int] = None,
        aspect_ratio: Optional[str] = None,
    ) -> str:
        """
        Submit a text-to-video task, poll until complete, return the video URL.

        Returns
        -------
        str
            Direct URL to the generated .mp4 file.
        """
        task_id, status_url = self._submit(
            prompt=prompt,
            image_url=image_url,
            last_image_url=last_image_url,
            duration=duration,
            aspect_ratio=aspect_ratio,
        )
        video_url = self._poll(task_id, status_url)
        return video_url

    def generate_batch(
        self,
        prompts: list[dict],
        *,
        parallel: bool = False,
    ) -> list[dict]:
        """
        Generate multiple videos.

        Parameters
        ----------
        prompts : list[dict]
            Each dict has keys: ``prompt`` (required), ``label``, ``image_url``,
            ``last_image_url``, ``duration``, ``aspect_ratio``.
        parallel : bool
            If True, submit all before polling (faster but may hit rate limits).

        Returns
        -------
        list[dict]
            Each dict: ``{label, prompt, video_url, error}``.
        """
        results = []

        if parallel:
            tasks = []
            for p in prompts:
                try:
                    task_id, status_url = self._submit(
                        prompt=p["prompt"],
                        image_url=p.get("image_url"),
                        last_image_url=p.get("last_image_url"),
                        duration=p.get("duration"),
                        aspect_ratio=p.get("aspect_ratio"),
                    )
                    tasks.append((p.get("label", task_id), task_id, status_url))
                except SeedanceError as e:
                    results.append({"label": p.get("label", "unknown"), "prompt": p["prompt"], "video_url": None, "error": str(e)})

            for label, task_id, status_url in tasks:
                try:
                    video_url = self._poll(task_id, status_url)
                    results.append({"label": label, "prompt": "", "video_url": video_url, "error": None})
                except SeedanceError as e:
                    results.append({"label": label, "prompt": "", "video_url": None, "error": str(e)})
        else:
            for p in prompts:
                label = p.get("label", p["prompt"][:40])
                try:
                    video_url = self.generate(
                        prompt=p["prompt"],
                        image_url=p.get("image_url"),
                        last_image_url=p.get("last_image_url"),
                        duration=p.get("duration"),
                        aspect_ratio=p.get("aspect_ratio"),
                    )
                    results.append({"label": label, "prompt": p["prompt"], "video_url": video_url, "error": None})
                except SeedanceError as e:
                    results.append({"label": label, "prompt": p["prompt"], "video_url": None, "error": str(e)})

        return results

    @staticmethod
    def download(video_url: str, output_path: Path, chunk_size: int = 8192) -> Path:
        """
        Download a video from *video_url* to *output_path*.
        Creates parent directories as needed.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        req = urllib.request.Request(video_url, headers={"User-Agent": "TikTokAIVF/1.0"})
        with urllib.request.urlopen(req) as resp:
            with open(output_path, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)

        file_size = output_path.stat().st_size
        print(f"  [OK] Downloaded {file_size / 1024 / 1024:.1f} MB -> {output_path}")
        return output_path

    # ── Internal: HTTP helpers ───────────────────────────────────────────

    def _http_post(self, url: str, payload: dict) -> dict:
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "TikTokAIVF/1.0",
        }
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise SeedanceError(f"HTTP {e.code} from {self.provider}: {body[:500]}") from e
        except urllib.error.URLError as e:
            raise SeedanceError(f"Network error: {e.reason}") from e

    def _http_get(self, url: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "TikTokAIVF/1.0",
        }
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise SeedanceError(f"HTTP {e.code} from {self.provider}: {body[:500]}") from e
        except urllib.error.URLError as e:
            raise SeedanceError(f"Network error: {e.reason}") from e

    # ── Internal: submit & poll ──────────────────────────────────────────

    def _submit(self, prompt, image_url=None, last_image_url=None,
                duration=None, aspect_ratio=None) -> tuple[str, str]:
        if self.provider == "aimlapi":
            return self._submit_aimlapi(prompt, image_url, last_image_url, duration, aspect_ratio)
        elif self.provider == "fal":
            return self._submit_fal(prompt, image_url, duration, aspect_ratio)
        elif self.provider == "volcengine":
            return self._submit_volcengine(prompt, image_url, last_image_url, duration, aspect_ratio)
        else:
            raise SeedanceError(f"Unknown provider: {self.provider}")

    def _poll(self, task_id: str, status_ref: str) -> str:
        if self.provider == "aimlapi":
            return self._poll_aimlapi(task_id, status_ref)
        elif self.provider == "fal":
            return self._poll_fal(task_id, status_ref)
        elif self.provider == "volcengine":
            return self._poll_volcengine(task_id, status_ref)
        else:
            raise SeedanceError(f"Unknown provider: {self.provider}")

    # ── Provider: aimlapi ────────────────────────────────────────────────

    def _submit_aimlapi(self, prompt, image_url, last_image_url, duration, aspect_ratio):
        payload = {
            "model": self.model,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio or self.aspect_ratio,
            "resolution": self.resolution,
            "duration": duration or self.duration,
            "generate_audio": self.generate_audio,
            "watermark": self.watermark,
            "seed": -1,
            "camera_fixed": False,
        }
        if image_url:
            payload["image_url"] = image_url
        if last_image_url:
            payload["last_image_url"] = last_image_url

        resp = self._http_post(self.base_url, payload)
        task_id = resp.get("id") or resp.get("generation_id")
        if not task_id:
            raise SeedanceError(f"aimlapi: no task id in response: {json.dumps(resp)[:300]}")
        print(f"  [aimlapi] Submitted task {task_id}")
        status_url = f"{self.base_url}?generation_id={task_id}"
        return task_id, status_url

    def _poll_aimlapi(self, task_id, status_url):
        elapsed = 0
        while elapsed < self.max_wait:
            time.sleep(self.poll_interval)
            elapsed += self.poll_interval
            resp = self._http_get(status_url)
            gen = resp
            if isinstance(resp, list):
                gen = resp[0] if resp else {}
            status = gen.get("status", "unknown")
            print(f"  [aimlapi] {task_id[:12]}... status={status} ({elapsed}s)")

            if status == "completed":
                video_url = gen.get("video", {}).get("url") or gen.get("url")
                if not video_url:
                    raise SeedanceError("aimlapi: completed but no video URL in response")
                return video_url
            elif status in ("failed", "error", "expired", "cancelled"):
                error_msg = gen.get("error", {}).get("message", gen.get("error", "unknown"))
                raise SeedanceError(f"aimlapi: task {task_id} {status}: {error_msg}")

        raise SeedanceTimeout(f"aimlapi: task {task_id} not complete after {self.max_wait}s")

    # ── Provider: fal.ai ─────────────────────────────────────────────────

    def _submit_fal(self, prompt, image_url, duration, aspect_ratio):
        payload = {
            "prompt": prompt,
            "duration": str(duration or self.duration),
            "resolution": self.resolution,
            "aspect_ratio": aspect_ratio or self.aspect_ratio,
            "generate_audio": self.generate_audio,
            "enable_safety_checker": self.enable_safety_checker,
        }
        if image_url:
            payload["image_url"] = image_url

        resp = self._http_post(self.base_url, payload)
        request_id = resp.get("request_id")
        if not request_id:
            video_url = resp.get("video", {}).get("url")
            if video_url:
                return "__sync__", video_url
            raise SeedanceError(f"fal: no request_id in response: {json.dumps(resp)[:300]}")
        print(f"  [fal] Submitted request {request_id}")
        status_url = f"https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/text-to-video/requests/{request_id}/status"
        return request_id, status_url

    def _poll_fal(self, request_id, status_url):
        if request_id == "__sync__":
            return status_url

        elapsed = 0
        while elapsed < self.max_wait:
            time.sleep(self.poll_interval)
            elapsed += self.poll_interval
            resp = self._http_get(status_url)
            status = resp.get("status", "unknown")
            print(f"  [fal] {request_id[:12]}... status={status} ({elapsed}s)")

            if status == "COMPLETED":
                video_url = resp.get("video", {}).get("url")
                if not video_url:
                    raise SeedanceError("fal: COMPLETED but no video URL")
                return video_url
            elif status in ("FAILED", "CANCELLED", "TIMED_OUT"):
                error_msg = resp.get("error", "unknown error")
                raise SeedanceError(f"fal: request {request_id} {status}: {error_msg}")

        raise SeedanceTimeout(f"fal: request {request_id} not complete after {self.max_wait}s")

    # ── Provider: volcengine (Ark) ───────────────────────────────────────

    def _submit_volcengine(self, prompt, image_url, last_image_url, duration, aspect_ratio):
        content = [{"type": "text", "text": prompt}]
        if image_url:
            content.append({"type": "image_url", "image_url": {"url": image_url, "role": "first_frame"}})
        if last_image_url:
            content.append({"type": "image_url", "image_url": {"url": last_image_url, "role": "last_frame"}})

        payload = {
            "model": self.model,
            "content": content,
            "resolution": self.resolution,
            "ratio": aspect_ratio or self.aspect_ratio,
            "duration": duration or self.duration,
            "generate_audio": self.generate_audio,
            "watermark": self.watermark,
        }

        resp = self._http_post(self.base_url, payload)
        task_id = resp.get("id")
        if not task_id:
            raise SeedanceError(f"volcengine: no id in response: {json.dumps(resp)[:300]}")
        print(f"  [volcengine] Submitted task {task_id}")
        status_url = f"{self.base_url}/{task_id}"
        return task_id, status_url

    def _poll_volcengine(self, task_id, status_url):
        elapsed = 0
        while elapsed < self.max_wait:
            time.sleep(self.poll_interval)
            elapsed += self.poll_interval
            resp = self._http_get(status_url)
            status = resp.get("status", "unknown")
            print(f"  [volcengine] {task_id[:12]}... status={status} ({elapsed}s)")

            if status == "succeeded":
                content = resp.get("content")
                if isinstance(content, dict):
                    video_url = content.get("video_url")
                elif isinstance(content, list) and len(content) > 0:
                    video_url = content[0].get("video_url") if isinstance(content[0], dict) else None
                else:
                    video_url = resp.get("video_url")
                if not video_url:
                    raise SeedanceError(
                        f"volcengine: succeeded but no video URL in response. "
                        f"Keys: {list(resp.keys())} content_type={type(content).__name__}"
                    )
                return video_url
            elif status in ("failed", "expired", "cancelled"):
                error_msg = resp.get("error", {}).get("message", resp.get("error", "unknown error"))
                raise SeedanceError(f"volcengine: task {task_id} {status}: {error_msg}")

        raise SeedanceTimeout(f"volcengine: task {task_id} not complete after {self.max_wait}s")
