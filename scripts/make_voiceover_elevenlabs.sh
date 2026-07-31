#!/usr/bin/env bash
# make_voiceover_elevenlabs.sh — the WARM, INTENTIONAL narration (ElevenLabs, Starter+).
# Per-beat emotional direction: each line gets its own stability/style so the judge
# FEELS it — vulnerable+breathy for the grief, intimate for the whisper, gentle for
# the benediction. Beats match the re-cut (ache → name → mechanism → WHISPER peak →
# it's-real → widen → grace). Writes vo/01..14.wav (mp3 from API → wav via lame).
#
#   export ELEVENSLAB_API_KEY=...   (script maps it to ELEVENLABS_API_KEY)
#   VOICE_ID=<id> bash scripts/make_voiceover_elevenlabs.sh
#   node scripts/measure_vo.mjs      # re-time B{} in Selah.tsx, then render
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env 2>/dev/null; set +a; }
export ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-${ELEVENSLAB_API_KEY:-}}"
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY (or ELEVENSLAB_API_KEY in .env)}"
VOICE_ID="${VOICE_ID:-EXAVITQu4vr4xnSDxMaL}"   # default Sarah (warm F); override with your pick
MODEL="${MODEL:-eleven_multilingual_v2}"
mkdir -p vo video/public/vo
command -v lame >/dev/null || { echo "need lame (brew install lame)"; exit 1; }

# gen <index> <stability> <style> <text>
gen () {
  local i="$1" stab="$2" style="$3" text="$4"
  echo "  beat $i  (stability=$stab style=$style)"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "$text" --arg m "$MODEL" --argjson st "$stab" --argjson sy "$style" \
          '{text:$t, model_id:$m, voice_settings:{stability:$st, similarity_boost:0.85, style:$sy, use_speaker_boost:true}}')" \
    --output "vo/$i.mp3"
  lame --quiet --decode "vo/$i.mp3" "vo/$i.wav"
  cp "vo/$i.wav" "video/public/vo/$i.wav"
}

# ── THE ACHE (vulnerable, breathy, slow) ──
gen 01 0.30 0.55 "It's three in the morning. She can't sleep, so she walks. Her heart is racing... not from exercise. From a grief no plan ever prepared her for. The one thing that could steady her is a book she has no hands, no strength to open. So it never comes."
gen 02 0.40 0.50 "Until now."
# ── THE NAME (calm, clear) ──
gen 03 0.45 0.35 "This is Selah. Not another Bible app. The Word, arriving the way a watch speaks, at the exact moment a body needs it."
# ── THE MECHANISM (settled, on the run) ──
gen 04 0.45 0.35 "Every second, Selah reads the body, and names the moment. Most of the time it says nothing at all. Just a colour that breathes."
gen 05 0.40 0.42 "But when she hits the wall, it feels it. No menu. A pulse on her wrist."
# ── THE WHISPER — the peak (intimate → tender, moved) ──
gen 06 0.35 0.52 "But a racing heart doesn't always mean the same thing. So Selah does something no app has done. It listens."
gen 07 0.30 0.58 "She said two words. And the right one found her."
# ── IT'S REAL (grounded, confident) ──
gen 08 0.52 0.30 "This is live. Real verses, from the YouVersion Platform, in two thousand languages. And one short, personal line, shaped by Gloo's faith-tuned voice. Nothing here is staged."
# ── THE WIDEN (compassionate) ──
gen 09 0.40 0.48 "This was never about fitness. Cardiac rehab. The ninth hour of labor. A nurse's twelfth hour. Wherever a heart races, or finally rests, the right word can already be there."
gen 10 0.45 0.52 "Presence. Not performance."
# ── GRACE / BENEDICTION (gentle, close) ──
gen 11 0.35 0.50 "And when she finally slows... a different kind of word."
gen 12 0.33 0.55 "You ran your race today. Well done."
gen 13 0.40 0.48 "Not Scripture you go to. Scripture that shows up."

echo "DONE -> vo/01..13.wav (also video/public/vo/). voice=$VOICE_ID"
echo "Next: node scripts/measure_vo.mjs   # re-time the composition, then render"
