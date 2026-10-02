"""R1 spike: download a YouTube video's audio and trim it to an exact range.

Usage:
    uv run python r1_download.py <youtube_url> <start> <end>

Example:
    uv run python r1_download.py "https://youtu.be/dQw4w9WgXcQ" 0:43 1:05
"""

import argparse
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

MAX_CLIP_SECONDS = 30
OUTPUT_DIR = Path(__file__).parent / "output"


def parse_time(text: str) -> float:
    """Turn '1:12', '1:12.5' or '45' into seconds (72.0, 72.5, 45.0)."""
    parts = text.split(":")
    if len(parts) > 2:
        raise argparse.ArgumentTypeError(f"invalid time {text!r}, use m:ss")
    try:
        minutes = int(parts[0]) if len(parts) == 2 else 0
        seconds = float(parts[-1])
    except ValueError:
        raise argparse.ArgumentTypeError(f"invalid time {text!r}, use m:ss") from None
    return minutes * 60 + seconds


def download_audio(url: str, workdir: Path) -> tuple[Path, dict]:
    """Download the full audio track. Returns the file path and video info."""
    options = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
    }
    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        path = Path(ydl.prepare_filename(info))
    return path, info


def trim_to_wav(source: Path, destination: Path, start: float, end: float) -> None:
    """Cut [start, end] out of the source and save it as a 44.1 kHz WAV."""
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", str(source),
            "-ss", str(start),
            "-to", str(end),
            "-ar", "44100",
            str(destination),
        ],
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="R1 spike: YouTube clip to WAV")
    parser.add_argument("url", help="YouTube URL (watch, youtu.be or shorts)")
    parser.add_argument("start", type=parse_time, help="start time, e.g. 1:12")
    parser.add_argument("end", type=parse_time, help="end time, e.g. 1:34")
    args = parser.parse_args()

    clip_length = args.end - args.start
    if clip_length <= 0:
        sys.exit("Error: end time must be after start time.")
    if clip_length > MAX_CLIP_SECONDS:
        sys.exit(f"Error: max clip length is {MAX_CLIP_SECONDS} seconds.")

    OUTPUT_DIR.mkdir(exist_ok=True)
    started = time.perf_counter()

    # Everything in this folder is deleted when the block ends, even on errors.
    with tempfile.TemporaryDirectory() as tmp:
        try:
            full_audio, info = download_audio(args.url, Path(tmp))
        except DownloadError as error:
            sys.exit(f"Download failed: {error}")
        downloaded = time.perf_counter()

        if args.end > info["duration"]:
            sys.exit(f"Error: video is only {info['duration']} seconds long.")

        start_ms, end_ms = round(args.start * 1000), round(args.end * 1000)
        clip = OUTPUT_DIR / f"{info['id']}_{start_ms}-{end_ms}.wav"
        trim_to_wav(full_audio, clip, args.start, args.end)
        trimmed = time.perf_counter()

    print(f"Video:    {info['title']} ({info['id']})")
    print(f"Clip:     {args.start:.1f}s -> {args.end:.1f}s ({clip_length:.1f}s)")
    print(f"Saved:    {clip}")
    print(f"Download: {downloaded - started:.1f}s")
    print(f"Trim:     {trimmed - downloaded:.1f}s")


if __name__ == "__main__":
    main()
