#!/usr/bin/env bash
# make_voiceover_elevenlabs.sh — WARM, INTENTIONAL, CONTINUOUS narration.
# Per-beat emotional direction (stability/style) PLUS request-stitching:
# each line is generated with previous_text/next_text context so Sarah's
# intonation FLOWS between sentences like one continuous read (fixes the
# "each sentence resets" feel). Writes vo/01..13.wav.
#
#   VOICE_ID=<id> bash scripts/make_voiceover_elevenlabs.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env 2>/dev/null; set +a; }
export ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-${ELEVENSLAB_API_KEY:-}}"
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY (or ELEVENSLAB_API_KEY in .env)}"
VOICE_ID="${VOICE_ID:-EXAVITQu4vr4xnSDxMaL}"   # Sarah (warm F)
MODEL="${MODEL:-eleven_multilingual_v2}"
mkdir -p vo video/public/vo
command -v lame >/dev/null || { echo "need lame (brew install lame)"; exit 1; }

# beats: text | stability | style  (order = narrative order)
TEXTS=(
  "It's three in the morning. She can't sleep, so she walks. Her heart is racing... not from exercise. From a grief no plan ever prepared her for. The one thing that could steady her is a book she has no hands, no strength to open. So it never comes."
  "Until now."
  "This is Selah. Not another Bible app. The Word, arriving the way a watch speaks, at the exact moment a body needs it."
  "Every second, Selah reads the body, and names the moment. Most of the time it says nothing at all. Just a colour that breathes."
  "But when she hits the wall, it feels it. No menu. A pulse on her wrist."
  "But a racing heart doesn't always mean the same thing. So Selah does something no app has done. It listens."
  "She said two words. And the right one found her."
  "This is live. Real verses, from the YouVersion Platform, in two thousand languages. And one short, personal line, shaped by Gloo's faith-tuned voice. Nothing here is staged."
  "This was never about fitness. Cardiac rehab. The ninth hour of labor. A nurse's twelfth hour. Wherever a heart races, or finally rests, the right word can already be there."
  "Presence. Not performance."
  "And when she finally slows... a different kind of word."
  "You ran your race today. Well done."
  "Not Scripture you go to. Scripture that shows up."
)
STAB=(0.30 0.40 0.45 0.45 0.40 0.35 0.30 0.52 0.40 0.45 0.35 0.33 0.40)
STYLE=(0.55 0.50 0.35 0.35 0.42 0.52 0.58 0.30 0.48 0.52 0.50 0.55 0.48)

N=${#TEXTS[@]}
for ((i=0; i<N; i++)); do
  idx=$(printf "%02d" $((i+1)))
  if [ $i -eq 0 ]; then prev=""; else prev="${TEXTS[$((i-1))]}"; fi
  if [ $((i+1)) -ge $N ]; then next=""; else next="${TEXTS[$((i+1))]}"; fi
  echo "  beat $idx  (stability=${STAB[$i]} style=${STYLE[$i]})"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "${TEXTS[$i]}" --arg m "$MODEL" --arg p "$prev" --arg nx "$next" \
          --argjson st "${STAB[$i]}" --argjson sy "${STYLE[$i]}" \
          '{text:$t, model_id:$m, previous_text:$p, next_text:$nx, voice_settings:{stability:$st, similarity_boost:0.85, style:$sy, use_speaker_boost:true}}')" \
    --output "vo/$idx.mp3"
  lame --quiet --decode "vo/$idx.mp3" "vo/$idx.wav"
  cp "vo/$idx.wav" "video/public/vo/$idx.wav"
done
echo "DONE -> vo/01..$(printf '%02d' "$N").wav  (voice=$VOICE_ID, stitched for continuity)"
