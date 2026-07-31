#!/usr/bin/env bash
# make_voiceover.sh — generate the 6-beat narration from docs/video-script.md using Piper (offline neural TTS).
# Zero signup. Outputs vo/01..06.wav (mono 22.05k). Remotion imports wav directly.
#
#   bash scripts/make_voiceover.sh
#
# UPGRADE TO OPENAI TTS (higher quality, ~$0.04):  export OPENAI_API_KEY=sk-...  then run
#   scripts/make_voiceover_openai.sh  (writes the same vo/01..06.mp3) and re-render.
set -euo pipefail
cd "$(dirname "$0")/.."
source .venv/bin/activate
MODEL="vo/models/en_US-amy-medium.onnx"
mkdir -p vo

say_beat () {  # $1=index  $2=text
  echo "  beat $1"
  printf '%s' "$2" | piper -m "$MODEL" -f "vo/$1.wav" >/dev/null 2>&1
}

say_beat 01 "This is Maya. Every morning she runs before the world wakes up. Her watch counts every heartbeat, every mile, every hard moment. It knows exactly when she wants to quit... and in all of that, the one thing that could carry her through has never once shown up. Scripture waits in an app she has to stop and open. So it never comes."

say_beat 02 "We built Selah to change that. Not another Bible app. Scripture that lives inside the run, and shows up the way a watch speaks."

say_beat 03 "It starts the moment she does. This is the day that the Lord has made; we will rejoice and be glad in it. Four minutes in... this is the wall. Maya's heart rate spikes, her effort climbs, and her watch feels it. No menu. No pop-up. Just a pulse on her wrist... the exact word, for the exact moment. I can do all things through Christ, who strengthens me. At the peak... they will run, and not be weary. In Maya's language, or any of two thousand others, pulled live from YouVersion. And when she finally slows down... a different kind of word. You ran your race today. Well done."

say_beat 04 "Every second, Selah reads the body: heart rate, zone, effort. And a classifier names the moment: the wall, the peak, the finish. It pulls the verse from the YouVersion Platform API in the runner's own language, and the Gloo AI Studio API, faith-tuned for ministry, shapes one short, personal line that's safe to read at a hundred and seventy-eight beats per minute. This isn't a mock-up. The notebook runs the whole pipeline, end to end. The demo you just watched is the front of a working system."

say_beat 05 "There are a billion wearables on a billion wrists, in every language on earth. Every one of them is a place the right word could find someone, at the moment they were built to go through the wall. Not Scripture you go to. Scripture that shows up. That's Selah."

say_beat 06 "Selah. Meet people where they already are."

echo "DONE -> vo/01..06.wav"
