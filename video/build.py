#!/usr/bin/env python3
"""Cut the recorded demo against Lily's narration and encode it.

usage: python3 -I video/build.py WORK_DIR OUT.mp4

Reads WORK_DIR/takes.json (from record.py) and WORK_DIR/voice.json (from narrate.py). Each shot lasts as long as
its line, or longer if its real-time footage needs it. Real-time segments play at normal speed; time-lapse
segments (labelled in the footage with the real time elapsed) are sped up to fill the rest. A shot shorter than
its line holds its last frame. Then encode.swift makes the silent 30 fps video and finish.swift lays the voice on it.
"""
import bisect
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FPS = 30
LEAD, TAIL = 0.5, 0.9  # silence before and after each line, within its shot
MIN_LAPSE = 3.0        # the shortest a sped-up segment may play


def main():
    work, out = Path(sys.argv[1]), Path(sys.argv[2])
    takes = json.loads((work / "takes.json").read_text())
    voice = {v["id"]: v for v in json.loads((work / "voice.json").read_text())}
    frames = takes["frames"]
    times = [t for _, t in frames]

    def frame_at(src):
        k = bisect.bisect_right(times, src) - 1
        return frames[max(k, 0)][0]

    dest = work / "cut"
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir()
    n, clock, clips, plan = 0, 0.0, [], []
    for shot in takes["shots"]:
        segs = shot["segments"]
        real = sum(s["end"] - s["start"] for s in segs if s["mode"] == "real")
        lapses = [s for s in segs if s["mode"] == "lapse"]
        line = voice[shot["id"]]["seconds"]
        length = max(line + LEAD + TAIL, real + MIN_LAPSE * len(lapses))
        spare = length - real
        lapse_total = sum(s["end"] - s["start"] for s in lapses) or 1
        outs = []
        for s in segs:
            src = s["end"] - s["start"]
            if s["mode"] == "real":
                outs.append((s, src, src))
            else:
                outs.append((s, src, max(MIN_LAPSE, spare * src / lapse_total)))
        hold = length - sum(o for _, _, o in outs)  # > 0 only when there's no time-lapse to stretch

        steps = int(round(length * FPS))
        for k in range(steps):
            u, src_t = k / FPS, None
            for s, src, o in outs:
                if u < o:
                    src_t = s["start"] + u * (src / o)
                    break
                u -= o
            if src_t is None:  # holding the last frame
                src_t = segs[-1]["end"]
            n += 1
            os.link(work / "frames" / f"{frame_at(src_t):06d}.jpg", dest / f"{n:06d}.jpg")
        clips.append({"file": voice[shot["id"]]["file"], "start": round(clock + LEAD, 3), "volume": 1.0})
        plan.append(f"{clock:6.1f}s  {shot['id']:<10} {length:5.1f}s (line {line:4.1f}s, real {real:5.1f}s, "
                    + ", ".join(f"sped up {src:.0f}s→{o:.1f}s" for s, src, o in outs if s["mode"] == "lapse")
                    + (f", hold {hold:.1f}s" if hold > 0.05 else "") + ")")
        clock += length
    print("\n".join(plan))
    print(f"total {clock:.1f}s, {n} frames")

    mix = {"duration": clock, "voice": clips, "sfx": [], "music": None,
           "voice_ranges": [[c["start"], c["start"] + voice[s["id"]]["seconds"]] for c, s in zip(clips, takes["shots"])]}
    (work / "mix.json").write_text(json.dumps(mix, indent=1))
    for tool in ("encode", "finish"):
        if not (work / tool).exists():
            subprocess.run(["swiftc", "-O", str(HERE / f"{tool}.swift"), "-o", str(work / tool)], check=True)
    subprocess.run([str(work / "encode"), str(dest), str(work / "silent.mp4"), str(FPS)], check=True)
    subprocess.run([str(work / "finish"), str(work / "silent.mp4"), str(work / "mix.json"), str(out)], check=True)


if __name__ == "__main__":
    main()
