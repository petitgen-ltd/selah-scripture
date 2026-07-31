#!/usr/bin/env python3
"""make_music.py — synthesize a calm, cinematic ambient bed (owned, CC0-safe).

A slow, breathing pad on a Dmaj9 voicing with a sparse bell arpeggio and long
swells. Written so the video ALWAYS has music even if the Pixabay download is
blocked. To swap in a real Pixabay track instead, drop it at video/public/music/calm.mp3.

    python scripts/make_music.py            # -> video/public/music/calm.wav
"""
import math, wave, struct, os, random

SR = 44100
DUR = 165.0            # seconds; covers the whole composition
OUT = "video/public/music/calm.wav"
random.seed(7)

def note(f):  # frequency of a MIDI-ish note number relative to A4=440
    return f

# Dmaj9 pad: D3 A3 D4 F#4 A4 C#5 E5 — warm, hopeful, unresolved
CHORD = [146.83, 220.00, 293.66, 369.99, 440.00, 554.37, 659.25]
BELL  = [587.33, 739.99, 880.00, 1108.73]  # D5 F#5 A5 C#6 — sparse high bells

n = int(SR * DUR)
buf = [0.0] * n

# ---- pad: each partial fades in/out on its own slow LFO, gentle detune ----
for i, base in enumerate(CHORD):
    phase = random.random() * math.tau
    lfo_rate = 0.03 + 0.017 * i          # very slow amplitude swell
    lfo_ph = random.random() * math.tau
    detune = 1.0 + (random.random() - 0.5) * 0.004
    amp = 0.16 / (1 + i * 0.35)          # higher partials quieter
    for s in range(n):
        t = s / SR
        swell = 0.5 + 0.5 * math.sin(t * math.tau * lfo_rate + lfo_ph)
        v = math.sin(t * math.tau * base * detune + phase)
        v += 0.25 * math.sin(t * math.tau * base * detune * 2 + phase)  # soft 2nd harmonic
        buf[s] += amp * swell * v

# ---- sparse bell arpeggio: one soft bell every ~5-8s with long decay ----
t_cursor = 6.0
bi = 0
while t_cursor < DUR - 4:
    f = BELL[bi % len(BELL)]
    bi += 1
    start = int(t_cursor * SR)
    decay = 3.2
    dur_s = int(decay * SR)
    bamp = 0.09
    for s in range(dur_s):
        if start + s >= n:
            break
        t = s / SR
        env = math.exp(-t * (1.0 / (decay * 0.35)))
        v = math.sin(t * math.tau * f) + 0.4 * math.sin(t * math.tau * f * 2.01)
        buf[start + s] += bamp * env * v
    t_cursor += 5.0 + random.random() * 3.0

# ---- global fade in/out + soft-clip ----
fade = int(4.0 * SR)
for s in range(n):
    g = 1.0
    if s < fade:
        g *= s / fade
    if s > n - fade:
        g *= (n - s) / fade
    x = buf[s] * g
    # gentle tanh soft-clip
    buf[s] = math.tanh(x * 1.2) * 0.9

os.makedirs(os.path.dirname(OUT), exist_ok=True)
peak = max(1e-6, max(abs(v) for v in buf))
norm = 0.7 / peak
with wave.open(OUT, "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for v in buf:
        frames += struct.pack("<h", int(max(-1, min(1, v * norm)) * 32767))
    w.writeframes(bytes(frames))
print("wrote", OUT, round(DUR, 1), "s")
