# Selah — Scripture at the right physiological moment

### A wearable-native companion. Presence, at the speed of a heartbeat.

**The moments you can't go looking.** A billion people wear a device that feels every heartbeat. It knows when Maya hits the wall on her morning run — and it knows the same racing pulse in a hospital corridor, in the ninth hour of labor, on the 3 a.m. walk grief takes you on. In all of it, Scripture has never once shown up — not because it doesn't belong, but because Bible apps wait to be *opened*, and the moment you most need *"they will run and not grow weary"* is the moment your hands will never reach for a phone. **Selah is Scripture for the moments you can't go looking.**

**Not a pop-up — presence.** Selah lives *inside* the effort and speaks the way a watch does: a haptic pulse and one line at the wall; a wordless, ambient glow in the cool-down. It chooses not only the verse but the *volume* — interrupting only when it should, and otherwise simply being there. The name is the Psalmist's word for a lifted pause, placed exactly where a body needs it.

**And it listens.** A racing heart is ambiguous — it could be exertion, or fear, or grief. So Selah does what no Bible app has: you can whisper a few words, and it discerns the verse that meets *you*. Say *"I'm scared,"* and Isaiah 41:10 arrives — *"Do not fear, for I am with you."* Presence becomes a quiet dialogue.

**How it works — three steps, once a second.**

1. **Sense.** A tiny on-device classifier, trained on the provided sessions and evaluated *held-out by session* — it must generalize across people, not memorize — names the moment, and is tuned to stay silent when unsure, because a verse at the wrong moment is worse than none.
2. **Discern.** Gloo's faith-tuned AI chooses the fitting verse for the moment *and* what you said, and shapes one short, pastoral line; the verse is served live from the **YouVersion Platform API** in any of its 2,000+ languages.
3. **Deliver.** The watch speaks it in the moment's native format — haptic pulse, ambient glow, or voice.

**What's real, and IP-safe.** This is live: real verses stream from YouVersion through a deployed proxy, with an on-screen **● live** badge. Gloo's integration is built and wired against its documented API; live activation is currently blocked by a payment-processor decline on our New Zealand cards (raised with the host), so it runs an honest, clearly-labeled simulation meanwhile — one credential from live. We ship no copyrighted translations; any embedded fallback text is public domain.

**The vision.** Not a fitness app. Wherever a heart races or finally rests — the gym, the rehab ward, the delivery room, the long grief-walk — the right word can already be there. Not Scripture you go to. **Scripture that shows up.**

**Live demo:** petitgen-ltd.github.io/selah-scripture — **Code:** github.com/petitgen-ltd/selah-scripture
