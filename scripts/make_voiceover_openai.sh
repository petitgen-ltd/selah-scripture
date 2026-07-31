#!/usr/bin/env bash
# make_voiceover_openai.sh — WARM, natural narration via OpenAI TTS (the tonight upgrade).
# gpt-4o-mini-tts sounds human where Piper doesn't; ~$0.04 total; full usage rights.
# Matches the CURRENT v2 12-beat cut (ache -> what-it-is -> mechanism -> widen -> real ->
# grace) and writes vo/01..12.wav — the exact files video/src/Selah.tsx references.
# KEEP THESE TEXTS IN SYNC with scripts/make_voiceover.sh (the Piper version).
#
#   export OPENAI_API_KEY=sk-...
#   VOICE=nova bash scripts/make_voiceover_openai.sh      # nova/shimmer (warm F), onyx (warm M)
#   node scripts/measure_vo.mjs                            # prints new durations + a B{} to paste
#   # re-time B{} starts in video/src/Selah.tsx if any beat overruns its slot, then:
#   node_modules/.bin/remotion render video/src/index.ts Selah docs/selah-demo.mp4 \
#        --codec=h264 --public-dir=video/public --concurrency=4
set -euo pipefail
cd "$(dirname "$0")/.."
: "${OPENAI_API_KEY:?set OPENAI_API_KEY first}"
VOICE="${VOICE:-${SELAH_VOICE:-nova}}"
MODEL="${MODEL:-gpt-4o-mini-tts}"      # supports 'instructions' tone steering
TONE="Warm, unhurried, intimate — a trusted friend reading softly at bedside. Let the sentences breathe. Never announcer-like or upbeat; tender and grounded."
mkdir -p vo video/public/vo

gen () {  # $1=index  $2=text
  echo "  beat $1 ($VOICE)"
  curl -sS https://api.openai.com/v1/audio/speech \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg m "$MODEL" --arg v "$VOICE" --arg i "$2" --arg t "$TONE" \
        '{model:$m, voice:$v, input:$i, instructions:$t, response_format:"wav"}')" \
    --output "vo/$1.wav"
  cp "vo/$1.wav" "video/public/vo/$1.wav"
}

# ── 0:00–0:28  THE ACHE ──
gen 01 "It's three in the morning. She can't sleep, so she walks. Her heart is racing... not from exercise, but from a grief no training plan ever prepared her for. The one thing that could steady her is a book she has no hands, no eyes, no strength to open right now. So it never comes."
gen 02 "Until now."
# ── 0:28–0:44  WHAT IT IS ──
gen 03 "This is Selah. Not another Bible app... Scripture that finds you when you can't go looking. The Word, arriving the way a watch speaks, at the exact moment a body needs it."
# ── 0:44–1:40  THE MECHANISM ──
gen 04 "Every second, Selah reads the body: heart rate, effort, recovery, and names the moment. Most of the time, it says nothing at all. Just a colour that breathes."
gen 05 "But when she hits the wall, it feels it. No menu. No pop-up. A pulse on her wrist. I can do all things through Christ, who strengthens me."
gen 06 "And at the very edge of what she has left... they will mount up with wings like eagles; they will run, and not be weary."
gen 07 "In her language, or two thousand others, pulled live from YouVersion."
# ── 1:40–2:12  NOT JUST ATHLETES ──
gen 08 "But this was never about fitness. The same heartbeat spikes in cardiac rehab, a heart relearning to beat. In the ninth hour of labor. In a nurse's twelfth hour, a soldier's ruck, a parent's dawn. Wherever a heart races, or finally rests, the right word can already be there. Presence... not performance."
# ── 2:12–2:34  IT'S REAL ──
gen 09 "And it's real. A classifier trained on real biometric sessions names the moment. The YouVersion Platform API brings the verse. The Gloo AI Studio API, faith-tuned for ministry, shapes one short, personal line, safe to read at a glance. The notebook runs the whole thing, end to end. Nothing here is faked."
# ── 2:34–2:52  CLOSE ON GRACE ──
gen 10 "And when she finally slows down... a different kind of word."
gen 11 "You ran your race today. Well done."
gen 12 "Not Scripture you go to. Scripture that shows up. That's Selah, for the moments you can't go looking."

echo "DONE -> vo/01..12.wav (also copied to video/public/vo/). voice=$VOICE"
echo "Next: node scripts/measure_vo.mjs   # new durations differ from Piper — re-time B{} then re-render"
