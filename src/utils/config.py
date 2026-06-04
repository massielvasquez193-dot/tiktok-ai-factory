"""
Configuration loader — unified config management for the entire pipeline.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional


# ── Project root detection ─────────────────────────────────────────────────

def find_project_root() -> Path:
    """Locate the project root by scanning for CLAUDE.md."""
    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / "CLAUDE.md").exists():
            return parent
    return current


PROJECT_ROOT = find_project_root()
CONFIG_DIR = PROJECT_ROOT / "configs"
OUTPUT_DIR = PROJECT_ROOT / "output"


# ── Config loaders ─────────────────────────────────────────────────────────

def load_json(path: Path | str) -> dict:
    """Load and return a JSON dictionary from *path*."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_product_brief(brief_path: Optional[Path | str] = None) -> dict:
    """
    Load product brief from *brief_path*, falling back to
    $PRODUCT_BRIEF env var, then configs/product_brief.json.
    """
    if brief_path:
        return load_json(Path(brief_path))
    env_path = os.environ.get("PRODUCT_BRIEF")
    if env_path:
        return load_json(Path(env_path))
    default = CONFIG_DIR / "product_brief.json"
    if default.exists():
        return load_json(default)
    raise FileNotFoundError(
        "No product brief found. Run with --brief, set PRODUCT_BRIEF env var, "
        f"or create {default}"
    )


def load_seedance_config(config_path: Optional[Path | str] = None) -> dict:
    """
    Load Seedance config from *config_path*, falling back to
    $SEEDANCE_CONFIG env var, then configs/seedance_config.json.
    """
    if config_path:
        return load_json(Path(config_path))
    env_path = os.environ.get("SEEDANCE_CONFIG")
    if env_path:
        return load_json(Path(env_path))
    default = CONFIG_DIR / "seedance_config.json"
    if default.exists():
        return load_json(default)
    raise FileNotFoundError(
        "No Seedance config found. Copy configs/seedance_config.template.json "
        f"to {default} and fill in your API key."
    )


# ── Output path helpers ────────────────────────────────────────────────────

def ensure_output_dir(*subdirs: str) -> Path:
    """Ensure output/*subdirs* exists and return the path."""
    path = OUTPUT_DIR.joinpath(*subdirs)
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_text(path: Path, text: str) -> None:
    """Write *text* to *path*, creating parent directories."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


def write_json(path: Path, data: dict | list) -> None:
    """Write JSON to *path*, with consistent formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  [OK] {path}")
