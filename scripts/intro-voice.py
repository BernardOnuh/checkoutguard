#!/usr/bin/env python3
"""Lily's narration for the homepage's "Watch intro" film, from ElevenLabs.

usage: python3 -I scripts/intro-voice.py

Reads the lines from dashboard/src/components/landing/intro-lines.json and writes one mp3 per line to
dashboard/public/intro/, plus voice.json, which the film reads to know each file's line. A line whose text
changes gets a new file; until then the film falls back to the browser's own voice for it.
The key comes from ELEVENLABS_API_KEY, ~/sealr/assets/video/.env or ~/confidant/video/.env, and is never printed.
Replies are cached in ~/.cache/checkoutguard-intro, so running this again spends no credits.
"""
import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINES = ROOT / "dashboard" / "src" / "components" / "landing" / "intro-lines.json"
OUT = ROOT / "dashboard" / "public" / "intro"
CACHE = Path.home() / ".cache" / "checkoutguard-intro"
VOICE = {"name": "Lily", "id": "pFZP5JQG7iQjIQuC4Bku", "model_id": "eleven_v3", "settings": {"stability": 0.5, "similarity_boost": 0.8}}


def load_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"].strip()
    for env in (Path.home() / "sealr" / "assets" / "video" / ".env", Path.home() / "confidant" / "video" / ".env"):
        if env.exists():
            for line in env.read_text().splitlines():
                name, _, value = line.partition("=")
                if name.strip() == "ELEVENLABS_API_KEY" and value.strip():
                    return value.strip().strip("'\"")
    raise SystemExit("No ELEVENLABS_API_KEY found (environment, ~/sealr/assets/video/.env or ~/confidant/video/.env).")


def call(path, key, body=None):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(body).encode() if body else None,
                                 method="POST" if body else "GET", headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit("ElevenLabs HTTP %d: %s" % (e.code, e.read().decode(errors="replace")[:300]))


def main():
    lines = json.loads(LINES.read_text())
    key = load_key()
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)

    todo = []
    for text in lines:
        body = {"text": text, "model_id": VOICE["model_id"], "voice_settings": VOICE["settings"]}
        h = hashlib.sha256(json.dumps([VOICE["id"], body], sort_keys=True).encode()).hexdigest()[:12]
        todo.append((text, body, h))
    need = sum(len(t) for t, _, h in todo if not (CACHE / h).exists())
    if need:
        sub = json.loads(call("/v1/user/subscription", key))
        left = sub["character_limit"] - sub["character_count"]
        print(f"Needs {need} characters; your ElevenLabs plan has {left} left this month.")
        if left < need:
            raise SystemExit("Not enough ElevenLabs characters. Nothing was generated; the film keeps the browser voice.")

    manifest = []
    for n, (text, body, h) in enumerate(todo):
        cached = CACHE / h
        if not cached.exists():
            cached.write_bytes(call(f"/v1/text-to-speech/{VOICE['id']}?output_format=mp3_44100_128", key, body))
            print(f"  line {n + 1}: generated")
        else:
            print(f"  line {n + 1}: cached")
        name = f"line-{n + 1}-{h}.mp3"
        (OUT / name).write_bytes(cached.read_bytes())
        manifest.append({"text": text, "file": f"/intro/{name}"})
    for old in OUT.glob("line-*.mp3"):
        if old.name not in {Path(m["file"]).name for m in manifest}:
            old.unlink()
    (OUT / "voice.json").write_text(json.dumps({"voice": f"{VOICE['name']} (ElevenLabs)", "lines": manifest}, indent=1) + "\n")
    print(f"Done: {len(manifest)} lines in dashboard/public/intro/. Refresh the homepage and press Watch intro.")


if __name__ == "__main__":
    main()
