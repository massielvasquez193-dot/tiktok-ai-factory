#!/usr/bin/env python3
"""
Voice Agent — Multi-engine TTS (Text-to-Speech) client.

Supported engines:
  - openai     (OpenAI TTS — tts-1 / tts-1-hd)
  - elevenlabs (ElevenLabs — most natural voices)
  - azure      (Azure Cognitive Services — best Asian language support)

Usage:
    from src.services.tts_client import TTSClient

    client = TTSClient(engine="azure", api_key="...")
    path = client.generate("Hello world!", output_path="output/voice.mp3")
"""

from __future__ import annotations

import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional


# ── Voice presets per language ─────────────────────────────────────────────

LANGUAGE_VOICES = {
    "en": {
        "openai": {"model": "tts-1", "voice": "nova"},
        "elevenlabs": {"voice_id": "21m00Tcm4TlvDq8ikWAM"},
        "azure": {"voice_name": "en-US-JennyNeural"},
    },
    "ms": {
        "openai": {"model": "tts-1", "voice": "nova"},
        "elevenlabs": {"voice_id": "default"},
        "azure": {"voice_name": "ms-MY-YasminNeural"},
    },
    "th": {
        "openai": {"model": "tts-1", "voice": "shimmer"},
        "elevenlabs": {"voice_id": "default"},
        "azure": {"voice_name": "th-TH-PremwadeeNeural"},
    },
    "fil": {
        "openai": {"model": "tts-1", "voice": "nova"},
        "elevenlabs": {"voice_id": "default"},
        "azure": {"voice_name": "fil-PH-BlessicaNeural"},
    },
    "es": {
        "openai": {"model": "tts-1", "voice": "nova"},
        "elevenlabs": {"voice_id": "default"},
        "azure": {"voice_name": "es-US-PalomaNeural"},
    },
}


class TTSError(Exception):
    """Raised when TTS generation fails."""


class TTSClient:
    """
    Multi-engine Text-to-Speech client.

    Parameters
    ----------
    engine : str
        One of "openai", "elevenlabs", "azure".
    api_key : str
        API key for the selected engine.
    language : str
        ISO language code (en, ms, th, fil, es).
    """

    def __init__(self, engine: str = "azure", api_key: str = "",
                 language: str = "en", region: str = "southeastasia"):
        if engine not in ("openai", "elevenlabs", "azure"):
            raise ValueError(f"Unknown engine '{engine}'. Choose: openai, elevenlabs, azure")

        self.engine = engine
        self.api_key = api_key
        self.language = language
        self.region = region
        self.voice_config = LANGUAGE_VOICES.get(language, LANGUAGE_VOICES["en"]).get(engine, {})

    # ── Public API ───────────────────────────────────────────────────────

    def generate(self, text: str, output_path: Optional[Path] = None,
                 speed: float = 1.0) -> Path:
        """
        Generate TTS audio and save to *output_path*.
        Returns the output path.
        """
        if not output_path:
            output_path = Path(f"output/audio/tts_{int(time.time())}.mp3")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if self.engine == "openai":
            self._generate_openai(text, output_path, speed)
        elif self.engine == "elevenlabs":
            self._generate_elevenlabs(text, output_path, speed)
        elif self.engine == "azure":
            self._generate_azure(text, output_path, speed)

        print(f"  [VoiceAgent/{self.engine}] {self.language}: {output_path} ({output_path.stat().st_size} bytes)")
        return output_path

    def generate_script(self, script: dict, output_dir: Optional[Path] = None) -> list[Path]:
        """
        Generate TTS for each scene in a script, returning a list of audio file paths.

        Produces:
          - Full voiceover (all scenes concatenated)
          - Individual scene files
        """
        output_dir = Path(output_dir or f"output/audio/{script.get('script_type', 'unknown')}")
        output_dir.mkdir(parents=True, exist_ok=True)

        self.language = script.get("language", "en")
        self.voice_config = LANGUAGE_VOICES.get(self.language, LANGUAGE_VOICES["en"]).get(self.engine, {})

        paths = []
        for i, scene in enumerate(script.get("scenes", [])):
            voice = scene.get("voiceover", "")
            if voice:
                path = self.generate(voice, output_dir / f"scene_{i + 1:02d}.mp3")
                paths.append(path)

        # Also generate hook and CTA
        hook = script.get("hook", {})
        if hook.get("text"):
            self.generate(hook["text"], output_dir / "hook.mp3")
        cta = script.get("cta", {})
        if cta.get("text"):
            self.generate(cta["text"], output_dir / "cta.mp3")

        return paths

    def generate_multilingual(self, text: str, languages: list[str],
                              output_dir: Optional[Path] = None) -> dict[str, Path]:
        """Generate the same text in multiple languages."""
        output_dir = Path(output_dir or "output/audio/multilingual")
        results = {}
        for lang in languages:
            self.language = lang
            self.voice_config = LANGUAGE_VOICES.get(lang, LANGUAGE_VOICES["en"]).get(self.engine, {})
            path = self.generate(text, output_dir / f"{lang}.mp3")
            results[lang] = path
        return results

    # ── Engine: OpenAI TTS ───────────────────────────────────────────────

    def _generate_openai(self, text: str, output_path: Path, speed: float):
        url = "https://api.openai.com/v1/audio/speech"
        payload = {
            "model": self.voice_config.get("model", "tts-1"),
            "input": text,
            "voice": self.voice_config.get("voice", "nova"),
            "speed": speed,
            "response_format": "mp3",
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                output_path.write_bytes(resp.read())
        except urllib.error.HTTPError as e:
            raise TTSError(f"OpenAI TTS error {e.code}: {e.read().decode()[:300]}") from e

    # ── Engine: ElevenLabs ───────────────────────────────────────────────

    def _generate_elevenlabs(self, text: str, output_path: Path, speed: float):
        voice_id = self.voice_config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                output_path.write_bytes(resp.read())
        except urllib.error.HTTPError as e:
            raise TTSError(f"ElevenLabs error {e.code}: {e.read().decode()[:300]}") from e

    # ── Engine: Azure TTS ────────────────────────────────────────────────

    def _generate_azure(self, text: str, output_path: Path, speed: float):
        voice_name = self.voice_config.get("voice_name", "en-US-JennyNeural")
        url = f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"

        # SSML for speed control
        ssml = (
            f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{self.language}'>"
            f"<voice name='{voice_name}'>"
            f"<prosody rate='{speed}'>"
            f"{text}"
            f"</prosody></voice></speak>"
        )

        headers = {
            "Ocp-Apim-Subscription-Key": self.api_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            "User-Agent": "TikTokAIVF/1.0",
        }
        req = urllib.request.Request(url, data=ssml.encode("utf-8"), headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                output_path.write_bytes(resp.read())
        except urllib.error.HTTPError as e:
            raise TTSError(f"Azure TTS error {e.code}: {e.read().decode()[:300]}") from e
