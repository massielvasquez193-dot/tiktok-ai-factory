#!/usr/bin/env python3
"""
Composer Agent — Assemble final TikTok video from components.

Inputs:
  - Video clips (MP4)
  - Voiceover audio (MP3)
  - Subtitles (SRT)
  - Background music (MP3, optional)
  - Product images (PNG/JPG, optional)
  - Logo / watermark (PNG, optional)

Output:
  - 1080x1920 MP4 (H.264 + AAC)

Dependencies: moviepy (pip install moviepy)

Usage:
    from src.services.composer import Composer

    composer = Composer()
    composer.compose(
        video_files=[...],
        audio_file="output/audio/full.mp3",
        subtitle_file="output/storyboards/subtitles.srt",
        output_path="output/final/video.mp4",
    )
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional


class ComposerError(Exception):
    """Raised when video composition fails."""


class Composer:
    """
    Assembles final TikTok video: video clips + voiceover + subtitles + BGM.

    Produces 1080x1920 MP4 compliant with TikTok specifications.
    """

    # TikTok specs
    TARGET_WIDTH = 1080
    TARGET_HEIGHT = 1920
    FPS = 30
    VIDEO_CODEC = "libx264"
    AUDIO_CODEC = "aac"
    AUDIO_BITRATE = "128k"
    BGM_VOLUME_FACTOR = 0.15  # BGM at 15% to not overpower voice

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = Path(output_dir or "output/final")

    # ── Public API ───────────────────────────────────────────────────────

    def compose(
        self,
        video_files: list[Path | str],
        audio_file: Path | str,
        subtitle_file: Optional[Path | str] = None,
        bgm_file: Optional[Path | str] = None,
        logo_file: Optional[Path | str] = None,
        output_path: Optional[Path | str] = None,
        title: str = "",
    ) -> Path:
        """
        Assemble the final video.

        Parameters
        ----------
        video_files : list
            One or more video clips to concatenate.
        audio_file : Path
            Voiceover MP3 file.
        subtitle_file : Path, optional
            SRT subtitle file for burned-in captions.
        bgm_file : Path, optional
            Background music MP3.
        logo_file : Path, optional
            Logo/watermark PNG (bottom-right corner).
        output_path : Path, optional
            Output MP4 path. Auto-generated if omitted.
        title : str
            Video title for metadata.

        Returns
        -------
        Path
            Path to the final output video.
        """
        try:
            from moviepy import (
                VideoFileClip, AudioFileClip, ImageClip,
                CompositeVideoClip, concatenate_videoclips,
                TextClip,
            )
        except ImportError:
            raise ComposerError(
                "moviepy is required. Install with: pip install moviepy"
            )

        output_path = Path(output_path or self.output_dir / f"final_{title or 'video'}.mp4")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        print(f"[Composer] Assembling final video...")
        print(f"  Videos: {len(video_files)}, Audio: {audio_file}")

        # 1. Load and normalize video clips
        clips = []
        for vf in video_files:
            clip = VideoFileClip(str(vf))
            # Resize to 9:16
            clip = clip.resized(new_size=(self.TARGET_WIDTH, self.TARGET_HEIGHT))
            clips.append(clip)

        if not clips:
            raise ComposerError("No video clips provided")

        video = concatenate_videoclips(clips, method="compose")

        # 2. Load voiceover audio
        voiceover = AudioFileClip(str(audio_file))

        # If video is longer than audio, loop the last frame; if shorter, trim
        if voiceover.duration > video.duration:
            # Extend video to match audio (freeze last frame)
            from moviepy import ColorClip
            pad = ColorClip(
                size=(self.TARGET_WIDTH, self.TARGET_HEIGHT),
                color=(0, 0, 0),
                duration=voiceover.duration - video.duration,
            )
            video = concatenate_videoclips([video, pad])
        else:
            voiceover = voiceover.subclipped(0, video.duration)

        video = video.with_audio(voiceover)

        # 3. Optional BGM
        if bgm_file:
            bgm = AudioFileClip(str(bgm_file))
            bgm = bgm.with_effects([bgm.with_volume_scaled(self.BGM_VOLUME_FACTOR)])
            if bgm.duration < video.duration:
                # Loop BGM
                from moviepy import concatenate_audioclips
                n_loops = int(video.duration / bgm.duration) + 1
                bgm = concatenate_audioclips([bgm] * n_loops)
            bgm = bgm.subclipped(0, video.duration)
            # Mix voiceover + BGM
            from moviepy import CompositeAudioClip
            mixed_audio = CompositeAudioClip([voiceover, bgm])
            video = video.with_audio(mixed_audio)

        # 4. Optional subtitles
        if subtitle_file:
            video = self._add_subtitles(video, subtitle_file)

        # 5. Optional logo
        if logo_file:
            video = self._add_logo(video, logo_file)

        # 6. Render
        print(f"  Rendering {video.duration:.1f}s @ {self.TARGET_WIDTH}x{self.TARGET_HEIGHT}...")
        video.write_videofile(
            str(output_path),
            fps=self.FPS,
            codec=self.VIDEO_CODEC,
            audio_codec=self.AUDIO_CODEC,
            audio_bitrate=self.AUDIO_BITRATE,
            preset="medium",
            threads=4,
        )

        # Cleanup
        for c in clips:
            c.close()
        video.close()
        voiceover.close()

        print(f"  [Composer] Done -> {output_path} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
        return output_path

    def compose_from_storyboard(
        self,
        storyboard: dict,
        video_dir: Path,
        audio_dir: Path,
        output_path: Optional[Path] = None,
        **kwargs,
    ) -> Path:
        """
        High-level: compose from storyboard dict, auto-matching files.
        """
        script_type = storyboard.get("script_type", "scene")
        lang = storyboard.get("language", "en")

        # Collect video files in order
        video_files = sorted(Path(video_dir).glob("*.mp4"))
        if not video_files:
            raise ComposerError(f"No video files found in {video_dir}")

        # Find voiceover
        audio_files = sorted(Path(audio_dir).glob("*.mp3"))
        if not audio_files:
            audio_files = sorted(Path(audio_dir).glob("hook*.mp3"))
        audio_file = audio_files[0] if audio_files else None
        if not audio_file:
            raise ComposerError(f"No audio files found in {audio_dir}")

        # Find SRT
        subtitle_file = Path(audio_dir).parent / "storyboards" / "subtitles.srt"
        if not subtitle_file.exists():
            subtitle_file = None

        output_path = output_path or self.output_dir / f"{script_type}_{lang}.mp4"

        return self.compose(
            video_files=video_files,
            audio_file=audio_file,
            subtitle_file=subtitle_file,
            output_path=output_path,
            title=f"{script_type}_{lang}",
            **kwargs,
        )

    # ── Overlay helpers ──────────────────────────────────────────────────

    def _add_subtitles(self, video, srt_path: Path):
        """
        Burn subtitles into the video using SRT file.
        Creates semi-transparent background + white text.
        """
        try:
            from moviepy import TextClip, CompositeVideoClip
        except ImportError:
            print("  [WARN] moviepy not available — skipping subtitles")
            return video

        # Parse SRT and create text clips
        srt_data = self._parse_srt(srt_path)
        if not srt_data:
            return video

        text_clips = []
        for entry in srt_data:
            start, end, text = entry
            if not text.strip():
                continue

            txt = TextClip(
                text=text,
                font_size=48,
                color="white",
                stroke_color="black",
                stroke_width=2,
                font="Arial",
                method="caption",
                size=(self.TARGET_WIDTH - 120, None),
            )
            txt = txt.with_position(("center", self.TARGET_HEIGHT * 0.78))
            txt = txt.with_start(start)
            txt = txt.with_duration(end - start)
            text_clips.append(txt)

        if text_clips:
            video = CompositeVideoClip([video, *text_clips])

        return video

    def _add_logo(self, video, logo_path: Path):
        """Add logo watermark to bottom-right corner."""
        try:
            from moviepy import ImageClip, CompositeVideoClip
        except ImportError:
            return video

        logo = ImageClip(str(logo_path))
        logo = logo.resized(height=80)  # Scale to 80px height
        logo = logo.with_position((self.TARGET_WIDTH - logo.w - 40, self.TARGET_HEIGHT - logo.h - 40))
        logo = logo.with_duration(video.duration)
        logo = logo.with_opacity(0.8)

        return CompositeVideoClip([video, logo])

    @staticmethod
    def _parse_srt(path: Path) -> list[tuple[float, float, str]]:
        """Parse SRT file into [(start_sec, end_sec, text), ...]."""
        if not path.exists():
            return []

        text = path.read_text(encoding="utf-8")
        entries = []
        blocks = text.strip().split("\n\n")

        for block in blocks:
            lines = block.strip().split("\n")
            if len(lines) >= 3:
                times = lines[1].split(" --> ")
                if len(times) == 2:
                    start = Composer._ts_to_seconds(times[0])
                    end = Composer._ts_to_seconds(times[1])
                    txt = "\n".join(lines[2:])
                    entries.append((start, end, txt))

        return entries

    @staticmethod
    def _ts_to_seconds(ts: str) -> float:
        """Convert SRT timestamp HH:MM:SS,mmm to seconds."""
        ts = ts.strip().replace(",", ".")
        parts = ts.split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        return 0.0


# ── Fallback: ffmpeg-based composer (no moviepy needed) ────────────────────

class FFMpegComposer:
    """
    Lightweight composer using ffmpeg directly. No Python dependencies beyond ffmpeg.
    """

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = Path(output_dir or "output/final")

    def compose(self, video_files: list[Path], audio_file: Path,
                output_path: Optional[Path] = None,
                subtitle_file: Optional[Path] = None,
                title: str = "video") -> Path:
        """
        Concatenate videos, add audio, and burn subtitles using ffmpeg.
        Requires ffmpeg on system PATH.
        """
        import subprocess
        import tempfile

        output_path = Path(output_path or self.output_dir / f"{title}.mp4")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Build concat file
        concat_list = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
        for vf in video_files:
            concat_list.write(f"file '{Path(vf).as_posix()}'\n")
        concat_list.close()

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_list.name,
            "-i", str(audio_file),
            "-vf", f"scale={Composer.TARGET_WIDTH}:{Composer.TARGET_HEIGHT}:force_original_aspect_ratio=decrease,"
                   f"pad={Composer.TARGET_WIDTH}:{Composer.TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264", "-preset", "medium",
            "-c:a", "aac", "-b:a", "128k",
            "-r", "30",
            "-shortest",
            "-map", "0:v:0", "-map", "1:a:0",
        ]

        if subtitle_file and subtitle_file.exists():
            # Burn subtitles
            srt_path = subtitle_file.as_posix().replace(":", "\\\\:")
            cmd.insert(-8, "-vf")
            cmd.insert(-8, f"scale={Composer.TARGET_WIDTH}:{Composer.TARGET_HEIGHT}:force_original_aspect_ratio=decrease,"
                           f"pad={Composer.TARGET_WIDTH}:{Composer.TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2,"
                           f"subtitles={srt_path}:force_style='FontSize=18,PrimaryColour=&H00FFFFFF,"
                           f"OutlineColour=&H00000000,Outline=1,Shadow=1'")

        cmd.append(str(output_path))

        print(f"  [FFMpegComposer] Running ffmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True)

        # Cleanup
        Path(concat_list.name).unlink(missing_ok=True)

        if result.returncode != 0:
            raise ComposerError(f"ffmpeg failed:\n{result.stderr[:500]}")

        print(f"  [FFMpegComposer] Done -> {output_path} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
        return output_path


# ── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    print("Composer module loaded. Use via pipeline.py or import directly.")
    print(f"  Composer (moviepy): {Composer.__doc__}")
    print(f"  FFMpegComposer (ffmpeg): {FFMpegComposer.__doc__}")
