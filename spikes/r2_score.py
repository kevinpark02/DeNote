"""R2 spike: score detected notes against a hand-written answer key.

Usage:
    uv run python r2_score.py <result.json> [<result.json> ...]

Example:
    uv run python r2_score.py output/r2/RYI2QisgoaQ_70000-75000.*.json

Each result's answer key is answer_keys/<clip name>.txt: one note per line
(e.g. G4, C#5), in the order they're played. Lines starting with # are comments.
"""

import argparse
import json
from pathlib import Path

import pretty_midi

ANSWER_KEY_DIR = Path(__file__).parent / "answer_keys"


def load_answer_key(path: Path) -> list[int]:
    """Read note names from the answer key and return them as MIDI numbers."""
    notes = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            notes.append(pretty_midi.note_name_to_number(line))
    return notes


def name(pitch: int) -> str:
    return pretty_midi.note_number_to_name(pitch)


def align(expected: list[int], detected: list[int]) -> list[tuple[str, str, str]]:
    """Pair up matching notes, keeping both lists in order, to get the most matches.

    best[i][j] = most matches possible between the first i expected notes
    and the first j detected notes.
    """
    rows, cols = len(expected), len(detected)
    best = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(1, rows + 1):
        for j in range(1, cols + 1):
            if expected[i - 1] == detected[j - 1]:
                best[i][j] = best[i - 1][j - 1] + 1  # pair these two notes
            else:
                best[i][j] = max(best[i - 1][j], best[i][j - 1])  # skip one

    # Walk back from the end to see which choice was made at each step.
    result = []
    i, j = rows, cols
    while i > 0 or j > 0:
        if i > 0 and j > 0 and expected[i - 1] == detected[j - 1]:
            result.append((name(expected[i - 1]), name(detected[j - 1]), "✅"))
            i, j = i - 1, j - 1
        elif j > 0 and (i == 0 or best[i][j - 1] >= best[i - 1][j]):
            result.append(("", name(detected[j - 1]), "➕ extra"))
            j -= 1
        else:
            result.append((name(expected[i - 1]), "", "❌ missed"))
            i -= 1
    result.reverse()
    return result


def score(expected: list[int], detected: list[int]) -> None:
    """Print the aligned notes and the totals."""
    rows = align(expected, detected)
    print(f"  {'expected':10}{'detected':10}")
    for want, got, verdict in rows:
        print(f"  {want:10}{got:10}{verdict}")

    verdicts = [verdict for _, _, verdict in rows]
    correct = verdicts.count("✅")
    print()
    print(f"  Notes correct: {correct}/{len(expected)} = {correct / len(expected):.0%}")
    print(
        f"  Missed: {verdicts.count('❌ missed')} · Extra: {verdicts.count('➕ extra')}"
    )
    precision = correct / len(detected) if detected else 0
    print(f"  Of the {len(detected)} detected notes, {precision:.0%} were right")


def main() -> None:
    parser = argparse.ArgumentParser(description="R2 spike: score detected notes")
    parser.add_argument("results", type=Path, nargs="+", help="JSON from r2_detect.py")
    args = parser.parse_args()

    for result_file in args.results:
        result = json.loads(result_file.read_text())
        clip = Path(result["clip"]).stem
        key_file = ANSWER_KEY_DIR / f"{clip}.txt"
        if not key_file.exists():
            print(f"{result_file.name}: no answer key at {key_file}, skipping\n")
            continue

        expected = load_answer_key(key_file)
        detected = [note["midi"] for note in result["notes"]]
        mode = "separated" if result["separated"] else "full mix"
        print(f"{clip}  ({mode})")
        score(expected, detected)
        print()


if __name__ == "__main__":
    main()
