#!/usr/bin/env python3
"""Build the CheckoutGuard explainer: Lily's narration, a timeline, motion-graphics frames, and the final video.

usage: python3 -I video/explainer/build.py WORK_DIR OUT.mp4 [--timeline-only]

narrate.py makes the lines from script.json. Each scene lasts as long as its line (plus breathing room, and at
least the scene's "min" seconds); timeline.js gives explainer.html the scene times and the captions, sentence by
sentence. render_frames.py draws every frame with headless Chrome; encode.swift and finish.swift (one folder up)
make the video and lay the voice on it.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEO = HERE.parent
LEAD, TAIL = 0.5, 0.8  # silence before and after each line, within its scene


def main():
    work, out = Path(sys.argv[1]), Path(sys.argv[2])
    work.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, "-I", str(VIDEO / "narrate.py"), str(work), str(HERE / "script.json")], check=True)
    spec = {l["id"]: l for l in json.loads((HERE / "script.json").read_text())["lines"]}
    voice = json.loads((work / "voice.json").read_text())

    scenes, captions, clips, clock = [], [], [], 0.0
    for v in voice:
        length = max(spec[v["id"]].get("min", 0), v["seconds"] + LEAD + TAIL)
        scenes.append({"id": v["id"], "start": round(clock, 3), "end": round(clock + length, 3)})
        start = clock + LEAD
        clips.append({"file": v["file"], "start": round(start, 3), "volume": 1.0})
        # captions: one sentence at a time, each shown for its share of the line
        parts = [s for s in re.split(r"(?<=[.!?])\s+", v["text"]) if s]
        total = sum(len(s) for s in parts)
        t = start
        for s in parts:
            d = v["seconds"] * len(s) / total
            captions.append({"text": s, "start": round(t, 3), "end": round(t + d + 0.25, 3)})
            t += d
        clock += length
    (HERE / "timeline.js").write_text("window.SCENES = %s;\nwindow.CAPTIONS = %s;\nwindow.TOTAL = %s;\n"
                                      % (json.dumps(scenes), json.dumps(captions), round(clock, 3)))
    print("\n".join(f"{s['start']:6.1f}s  {s['id']:<8} {s['end'] - s['start']:4.1f}s" for s in scenes), f"\ntotal {clock:.1f}s")

    if "--timeline-only" in sys.argv:
        return
    frames = work / "frames"
    shutil.rmtree(frames, ignore_errors=True)
    subprocess.run([sys.executable, "-I", str(HERE / "render_frames.py"), str(frames), "--page", "explainer.html"], check=True)
    mix = {"duration": clock, "voice": clips, "sfx": [], "music": None,
           "voice_ranges": [[c["start"], c["start"] + v["seconds"]] for c, v in zip(clips, voice)]}
    (work / "mix.json").write_text(json.dumps(mix, indent=1))
    for tool in ("encode", "finish"):
        if not (work / tool).exists():
            subprocess.run(["swiftc", "-O", str(VIDEO / f"{tool}.swift"), "-o", str(work / tool)], check=True)
    subprocess.run([str(work / "encode"), str(frames), str(work / "silent.mp4"), "30"], check=True)
    subprocess.run([str(work / "finish"), str(work / "silent.mp4"), str(work / "mix.json"), str(out)], check=True)


if __name__ == "__main__":
    main()
