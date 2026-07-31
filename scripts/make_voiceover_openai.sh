#!/usr/bin/env bash
# make_voiceover_openai.sh — HIGHER-QUALITY voiceover via OpenAI TTS (~$0.04 total).
# Drop-in replacement for scripts/make_voiceover.sh. Writes vo/01..06.mp3, then also
# copies them into video/public/vo/ as .mp3. Update Selah.tsx B[].file to .mp3 (or
# convert to wav) and re-render.
#
#   export OPENAI_API_KEY=sk-...
#   bash scripts/make_voiceover_openai.sh
#   # then in video/src/Selah.tsx change the vo file extensions .wav -> .mp3 and:
#   npx remotion render video/src/index.ts Selah docs/selah-demo.mp4 --codec=h264 --public-dir=video/public
set -euo pipefail
cd "$(dirname "$0")/.."
: "${OPENAI_API_KEY:?set OPENAI_API_KEY first}"
mkdir -p vo video/public/vo
VOICE="${SELAH_VOICE:-nova}"   # warm female; try 'shimmer' or 'onyx' too
MODEL="gpt-4o-mini-tts"        # supports 'instructions' tone steering; or 'tts-1-hd'
TONE="Warm, unhurried, intimate. Let the sentences breathe. A quiet, hopeful storyteller."

gen () {  # $1=index  $2=text
  echo "  beat $1 ($VOICE)"
  curl -sS https://api.openai.com/v1/audio/speech \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg m "$MODEL" --arg v "$VOICE" --arg i "$2" --arg t "$TONE" \
        '{model:$m, voice:$v, input:$i, instructions:$t, response_format:"mp3"}')" \
    --output "vo/$1.mp3"
  cp "vo/$1.mp3" "video/public/vo/$1.mp3"
}

gen 01 "This is Maya. Every morning she runs before the world wakes up. Her watch counts every heartbeat, every mile, every hard moment. It knows exactly when she wants to quit... and in all of that, the one thing that could carry her through has never once shown up. Scripture waits in an app she has to stop and open. So it never comes."
gen 02 "We built Selah to change that. Not another Bible app. Scripture that lives inside the run, and shows up the way a watch speaks."
gen 03 "It starts the moment she does. This is the day that the Lord has made; we will rejoice and be glad in it. Four minutes in... this is the wall. Maya's heart rate spikes, her effort climbs, and her watch feels it. No menu. No pop-up. Just a pulse on her wrist... the exact word, for the exact moment. I can do all things through Christ, who strengthens me. At the peak... they will run, and not be weary. In Maya's language, or any of two thousand others, pulled live from YouVersion. And when she finally slows down... a different kind of word. You ran your race today. Well done."
gen 04 "Every second, Selah reads the body: heart rate, zone, effort. And a classifier names the moment: the wall, the peak, the finish. It pulls the verse from the YouVersion Platform API in the runner's own language, and the Gloo AI Studio API, faith-tuned for ministry, shapes one short, personal line that's safe to read at a hundred and seventy-eight beats per minute. This isn't a mock-up. The notebook runs the whole pipeline, end to end. The demo you just watched is the front of a working system."
gen 05 "There are a billion wearables on a billion wrists, in every language on earth. Every one of them is a place the right word could find someone, at the moment they were built to go through the wall. Not Scripture you go to. Scripture that shows up. That's Selah."
gen 06 "Selah. Meet people where they already are."

echo "DONE -> vo/01..06.mp3 (also in video/public/vo/). NOTE: durations differ from piper;"
echo "re-check B[].dur in video/src/Selah.tsx to keep captions/timing aligned."
