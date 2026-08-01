# Selah — Scripture at the right physiological moment

### A wearable-native companion. Presence, at the speed of a heartbeat.

**The moments you can't go looking.** A billion people wear a device that feels every heartbeat. It knows when Maya hits the wall on her run — and it knows the same racing pulse in a hospital corridor, in the ninth hour of labor, on the 3 a.m. walk grief takes you on. In all of it, Scripture has never once shown up — not because it doesn't belong, but because Bible apps wait to be *opened*, and the moment you most need *"they will run and not grow weary"* is the moment your hands will never reach for a phone. **Selah is Scripture for the moments you can't go looking.**

**Not a pop-up — presence.** Selah lives *inside* the effort and speaks the way a watch does: a haptic pulse and one line at the wall; a wordless, ambient glow in the cool-down. It chooses not only the verse but the *volume* — interrupting only when it should. The name is the Psalmist's word for a lifted pause, placed where a body needs it.

**And it listens.** A racing heart is ambiguous — exertion, fear, or grief. So Selah does what no Bible app has: whisper a few words, and it discerns the verse that meets *you*. Say *"I'm scared,"* and Isaiah 41:10 arrives — *"Do not fear, for I am with you."* Presence becomes a quiet dialogue.

**How it works — once a second.**

1. **Sense.** A classifier names the physiological moment from heart-rate, effort and recovery, evaluated **held-out by session** — it must generalize to people it has never seen (0.45 macro-F1 vs a 0.02 baseline; session-context features *double* it). Because a verse at the wrong moment is worse than none, it's tuned to **abstain when unsure**: above 0.70 confidence it is *never wrong* — 100% precision at 19% coverage.
2. **Discern.** Given the moment *and* what you whispered, **Gloo's** faith-tuned AI chooses the verse **from a curated, safe set** — so it can't invent a reference — and writes one pastoral line; **YouVersion** serves the authoritative text in 2,000+ languages.
3. **Deliver.** The watch speaks it natively — haptic, glow, or voice.

**Built to be real.** App → a deployed **Cloudflare Worker** proxy → YouVersion + Gloo; keys live server-side, cached and rate-limited so it survives on a $20 credit. Verses stream live (● live badge); the engine is tested (46 tests, CI); the notebook runs end-to-end. Gloo is wired and running an honest, labeled simulation while a card-payment decline is resolved — one credential from live. No copyrighted translations ship; embedded fallback is public domain.

**The vision.** Not a fitness app. Wherever a heart races or finally rests — the gym, the rehab ward, the delivery room, the grief-walk — the right word can be there. Not Scripture you go to. **Scripture that shows up.**

**Try it live:** petitgen-ltd.github.io/selah-scripture — **Code + notebook:** github.com/petitgen-ltd/selah-scripture
