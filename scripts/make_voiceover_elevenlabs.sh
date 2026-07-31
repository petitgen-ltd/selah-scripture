#!/usr/bin/env bash
# make_voiceover_elevenlabs.sh — the PREMIUM narrator (most natural / emotional).
# ElevenLabs is the gold standard for warm, human voiceover. ~$5 Starter plan =
# commercial rights for a public video. Matches the current v2 12-beat cut and
# writes vo/01..12.wav (mp3 from the API -> decoded to wav with lame, so the rest
# of the pipeline — measure_vo.mjs + Selah.tsx — is unchanged).
# KEEP THESE TEXTS IN SYNC with scripts/make_voiceover.sh (Piper) + the OpenAI one.
#
#   export ELEVENLABS_API_KEY=...
#   # pick a warm narrator voice_id from https://elevenlabs.io/app/voice-library
#   VOICE_ID=21m00Tcm4TlvDq8ikWAM bash scripts/make_voiceover_elevenlabs.sh
#   node scripts/measure_vo.mjs           # re-time B{} if any beat overruns, then re-render
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY first}"
VOICE_ID="${VOICE_ID:-21m00Tcm4TlvDq8ikWAM}"   # default = 'Rachel' (calm, warm); override with your pick
MODEL="${MODEL:-eleven_multilingual_v2}"       # or 'eleven_v3' for more expressiveness
# warm + expressive but stable enough for narration
SETTINGS='{"stability":0.45,"similarity_boost":0.8,"style":0.35,"use_speaker_boost":true}'
mkdir -p vo video/public/vo
command -v lame >/dev/null || { echo "need 'lame' (brew install lame) to decode mp3->wav"; exit 1; }

gen () {  # $1=index  $2=text
  echo "  beat $1 (voice $VOICE_ID)"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "$2" --arg m "$MODEL" --argjson vs "$SETTINGS" \
          '{text:$t, model_id:$m, voice_settings:$vs}')" \
    --output "vo/$1.mp3"
  lame --quiet --decode "vo/$1.mp3" "vo/$1.wav"
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

echo "DONE -> vo/01..12.wav (also in video/public/vo/). voice_id=$VOICE_ID model=$MODEL"
echo "Next: node scripts/measure_vo.mjs   # check timing, then re-render"
