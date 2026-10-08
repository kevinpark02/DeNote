"""R2 spike: detect the notes in a clip, optionally separating the guitar first.

Usage:
    uv run python r2_detect.py <clip.wav> [--separate]

Example:
    uv run python r2_detect.py output/RYI2QisgoaQ_70000-90000.wav --separate
"""

import argparse
import contextlib
import io
import json
import logging
import tempfile
import time
import warnings
from dataclasses import dataclass
from pathlib import Path

import pretty_midi
import torch
from demucs.api import Separator, save_audio

LOWEST_NOTE = 40  # low E string, open (E2)
HIGHEST_NOTE = 86  # high e string, fret 22 (D6)
MIN_NOTE_MS = 50
MIN_CONFIDENCE = 0.4 # quieter notes are usually background guitar or noise
MERGE_GAP_MS = 30 # same note again within this gap = one note (e.g. vibrato)
OUTPUT_DIR = Path(__file__).parent / "output" / "r2"
# Apple GPU if available; Lambda has no GPU, so production will use "cpu".
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"


@dataclass
class Note:
    start: float  # seconds from the start of the clip
    end: float
    pitch: int  # MIDI note number, e.g. 40 = low E
    amplitude: float  # how strongly the model heard it, 0 to 1

    @property
    def duration_ms(self) -> float:
        return (self.end - self.start) * 1000


def separate_guitar(clip: Path, workdir: Path) -> Path:
    """Run Demucs and save just the guitar track. Returns its path."""
    # shifts=0 makes Demucs give the same result every run (default 1 adds a random shift).
    separator = Separator(model="htdemucs_6s", device=DEVICE, shifts=0)
    _, stems = separator.separate_audio_file(clip)
    guitar = workdir / "guitar.wav"
    save_audio(stems["guitar"], guitar, samplerate=separator.samplerate)
    return guitar


def detect_notes(audio: Path) -> list[Note]:
    """Run basic-pitch and return every note it hears."""
    # basic-pitch prints harmless warnings when imported (TensorFlow not installed,
    # untested scikit-learn/torch versions) and debug lines while it runs. Hide both.
    logging.disable(logging.WARNING)
    with warnings.catch_warnings(), contextlib.redirect_stdout(io.StringIO()):
        warnings.simplefilter("ignore")
        from basic_pitch.inference import predict

        _, _, events = predict(audio)
    logging.disable(logging.NOTSET)
    # basic-pitch returns numpy numbers; convert them to plain Python ones for JSON.
    return [
        Note(float(start), float(end), int(pitch), float(amp))
        for start, end, pitch, amp, _ in events
    ]


def keep_guitar_range(notes: list[Note]) -> list[Note]:
    """Drop notes a guitar in standard tuning can't play."""
    return [n for n in notes if LOWEST_NOTE <= n.pitch <= HIGHEST_NOTE]

def keep_confident_notes(notes: list[Note]) -> list[Note]:
    """Drop notes the model only faintly heard."""
    return [n for n in notes if n.amplitude >= MIN_CONFIDENCE]   

def reduce_to_single_notes(notes: list[Note]) -> list[Note]:
    """When notes overlap, keep the louder one so only one plays at a time."""
    result: list[Note] = []
    for note in sorted(notes, key=lambda n: n.start):
        if result and note.start < result[-1].end:
            previous = result[-1]
            if note.amplitude <= previous.amplitude:
                continue  # quieter than the note already playing: skip it
            previous.end = note.start  # louder: cut the previous note short
        result.append(note)
    return result

def merge_repeated_notes(notes: list[Note]) -> list[Note]:
    """Join a note with the next one if it's the same pitch and starts right after.

    basic-pitch sometimes splits one long note (especially with vibrato) in two.
    """
    result: list[Note] = []
    for note in notes:
        if result:
            previous = result[-1]
            gap_ms = (note.start - previous.end) * 1000
            if note.pitch == previous.pitch and gap_ms <= MERGE_GAP_MS:
                previous.end = note.end  # stretch the previous note instead
                continue
        result.append(note)
    return result

def drop_short_notes(notes: list[Note]) -> list[Note]:
    """Remove "ghost" notes shorter than MIN_NOTE_MS."""
    return [n for n in notes if n.duration_ms >= MIN_NOTE_MS]


def main() -> None:
    parser = argparse.ArgumentParser(description="R2 spike: clip to notes")
    parser.add_argument("clip", type=Path, help="WAV file from r1_download.py")
    parser.add_argument(
        "--separate", action="store_true", help="isolate the guitar with Demucs first"
    )
    args = parser.parse_args()

    timings: dict[str, float] = {}

    with tempfile.TemporaryDirectory() as tmp:
        audio = args.clip
        if args.separate:
            started = time.perf_counter()
            audio = separate_guitar(args.clip, Path(tmp))
            timings[f"separate ({DEVICE})"] = time.perf_counter() - started

        started = time.perf_counter()
        raw = detect_notes(audio)
        timings["detect"] = time.perf_counter() - started

    in_range = keep_guitar_range(raw)
    confident = keep_confident_notes(in_range)
    single = reduce_to_single_notes(confident)
    merged = merge_repeated_notes(single)
    final = drop_short_notes(merged)

    print(
        f"Clip:      {args.clip.name}  ({'separated' if args.separate else 'full mix'})"
    )
    print(f"Detected:  {len(raw)} notes")
    print(f"In range:  {len(in_range)}")
    print(f"Confident: {len(confident)}")
    print(f"Single:    {len(single)}")
    print(f"Merged:    {len(merged)}")
    print(f"Final:     {len(final)}  (after dropping notes < {MIN_NOTE_MS} ms)")
    for phase, seconds in timings.items():
        print(f"{phase.capitalize() + ':':10} {seconds:.1f}s")
    print()
    for n in final:
        name = pretty_midi.note_number_to_name(n.pitch)
        print(
            f"{n.start:6.2f}s  {name:4}  {n.duration_ms:4.0f} ms  amp {n.amplitude:.2f}"
        )

    # Same shape as the lesson's notes JSON in README §6, so R3 and the scorer can use it.
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = "separated" if args.separate else "mix"
    result_file = OUTPUT_DIR / f"{args.clip.stem}.{suffix}.json"
    result = {
        "clip": args.clip.name,
        "separated": args.separate,
        "counts": {
            "detected": len(raw),
            "in_range": len(in_range),
            "confident": len(confident),
            "single": len(single),
            "merged": len(merged),
            "final": len(final),
        },
        "timings_s": {phase: round(s, 2) for phase, s in timings.items()},
        "notes": [
            {
                "start_ms": round(n.start * 1000),
                "dur_ms": round(n.duration_ms),
                "midi": n.pitch,
                "confidence": round(n.amplitude, 2),
            }
            for n in final
        ],
    }
    result_file.write_text(json.dumps(result, indent=2))
    print(f"\nSaved:     {result_file}")


if __name__ == "__main__":
    main()
