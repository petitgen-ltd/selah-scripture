# Selah — Scripture at the right physiological moment

### A wearable-native companion that meets you at the wall, the peak, and the quiet after.

**The gap.** A billion people wear a device that feels every heartbeat. It knows when Maya hits the wall, empties the tank on the last rep, and finally slows down to breathe. Yet in all that effort, Scripture has never once shown up — not because it doesn't belong, but because no one built the bridge. Bible apps wait to be opened. The moment a runner actually needs *"they will run and not grow weary"* is the moment a phone is the last thing they'll reach for.

**Selah** closes that gap. Not another Bible app — Scripture living *inside* the workout, delivered the way a watch speaks: a haptic pulse and one line at peak effort, an ambient glow in the cool-down, never a pop-up. The name is the Psalmist's word for a lifted pause — placed exactly where a body needs it.

**How it works — three steps, once a second, in the flow.**

1. **Sense.** Heart-rate, zone, effort and recovery stream off the wearable. A lightweight classifier — trained on the hackathon's `biometric movements` sessions — names the *physiological moment*: warm-up, the wall, peak effort, the finish, cool-down.
2. **Discern.** Each moment maps to Scripture built for it — strength at the wall (Phil 4:13), endurance at the peak (Isa 40:31), stillness in recovery (Ps 46:10). The verse and translation are pulled live from the **YouVersion Platform API**, in any of its 2,000+ languages — the runner's own heart language.
3. **Deliver.** The **Gloo AI Studio API** shapes one short, personal line for Maya, for *this* moment — a voice tuned for ministry, never off-tone — and the watch delivers it in the moment's native format (haptic + display at peak; ambient glow at rest).

**Why these choices.** Detection runs on-device and must never fire at the wrong moment, so the classifier is small and anchored on the provided data. Verse retrieval belongs to YouVersion — translation, licensing and 2,000+ languages are solved problems to stand on, not rebuild. Encouragement belongs to Gloo: a faith-tuned model holds the tone pastoral under the one constraint that matters — it's read at 178 bpm, with no room to be wrong.

**What's real, and IP-safe.** The public notebook runs this exact pipeline end-to-end — demo mode out of the box, live against the YouVersion and Gloo APIs the moment keys are added. In live mode, Scripture is served **through YouVersion under its licensing** — we ship no copyrighted translations. Any verse text embedded in the demo is **public domain (World English Bible)**. Nothing is faked; the demo is the front-end of a working system.

**The vision.** Every wearable, every gym, every trail becomes a place the right word can find you — not Scripture you go to, but Scripture that shows up, the moment you were built to go through the wall.
