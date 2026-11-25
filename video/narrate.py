#!/usr/bin/env python3
"""Lily's narration for the CheckoutGuard demo video, from ElevenLabs.

usage: python3 -I video/narrate.py WORK_DIR

Writes WORK_DIR/voice/<line id>.mp3 and WORK_DIR/voice.json (each line's file and length in seconds).
The key comes from ELEVENLABS_API_KEY, ~/sealr/assets/video/.env or ~/confidant/video/.env, and is never printed.
Checks the plan's remaining characters before spending any. Replies are cached in ~/.cache/checkoutguard-video.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = Path.home() / ".cache" / "checkoutguard-video"


def load_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"].strip()
    for env in (Path.home() / "sealr" / "assets" / "video" / ".env", Path.home() / "confidant" / "video" / ".env"):
        if env.exists():
            for line in env.read_text().splitlines():
                name, _, value = line.partition("=")
                if name.strip() == "ELEVENLABS_API_KEY" and value.strip():
                    return value.strip().strip("'\"")
    raise SystemExit("No ELEVENLABS_API_KEY found.")


def call(path, key, body=None):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(body).encode() if body else None,
                                 method="POST" if body else "GET", headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit("ElevenLabs HTTP %d: %s" % (e.code, e.read().decode(errors="replace")[:300]))


def seconds(path):
    for line in subprocess.run(["afinfo", str(path)], capture_output=True, text=True).stdout.splitlines():
        if "estimated duration" in line:
            return float(line.split()[2])
    raise SystemExit(f"can't read the length of {path}")


def main():
    work = Path(sys.argv[1])
    spec = json.loads((HERE / "demo.json").read_text())
    voice = spec["voice"]
    key = load_key()
    (work / "voice").mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)

    jobs = []
    for line in spec["lines"]:
        body = {"text": line["text"], "model_id": voice["model_id"], "voice_settings": voice["settings"]}
        h = hashlib.sha256(json.dumps([voice["elevenlabs_voice_id"], body], sort_keys=True).encode()).hexdigest()[:24]
        jobs.append((line, body, CACHE / h))
    need = sum(len(l["text"]) for l, _, c in jobs if not c.exists())
    if need:
        sub = json.loads(call("/v1/user/subscription", key))
        left = sub["character_limit"] - sub["character_count"]
        print(f"Needs {need} characters; the ElevenLabs plan has {left} left this month.")
        if left < need:
            raise SystemExit("Not enough ElevenLabs characters. Nothing was generated.")

    out = []
    for line, body, cached in jobs:
        if not cached.exists():
            cached.write_bytes(call(f"/v1/text-to-speech/{voice['elevenlabs_voice_id']}?output_format=mp3_44100_128", key, body))
            print(f"  {line['id']}: generated")
        dest = work / "voice" / f"{line['id']}.mp3"
        dest.write_bytes(cached.read_bytes())
        out.append({"id": line["id"], "text": line["text"], "file": str(dest), "seconds": round(seconds(dest), 3)})
    (work / "voice.json").write_text(json.dumps(out, indent=1) + "\n")
    print(f"{len(out)} lines, {sum(l['seconds'] for l in out):.1f}s of narration")


if __name__ == "__main__":
    main()
