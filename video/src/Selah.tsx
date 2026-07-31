import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ── palette ──
const INK = '#080a0e';
const PAPER = '#f4efe6';
const FAINT = 'rgba(244,239,230,0.60)';
const TEAL = '#39d0c8';
const INDIGO = '#8a90ff';
const RENEWAL = '#5fe0a8'; // the whisper answer
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const SANS = '"Space Grotesk", -apple-system, "Segoe UI", Inter, Helvetica, sans-serif';

// ── measured Sarah (ElevenLabs) VO durations, seconds ──
const B = {
  b01: { start: 1.5, dur: 17.46, file: 'vo/01.wav' }, // ache
  b02: { start: 25.0, dur: 1.02, file: 'vo/02.wav' }, // until now
  b03: { start: 27.2, dur: 7.66, file: 'vo/03.wav' }, // name
  b04: { start: 36.0, dur: 8.17, file: 'vo/04.wav' }, // mechanism
  b05: { start: 45.2, dur: 5.02, file: 'vo/05.wav' }, // the wall
  b06: { start: 52.0, dur: 6.73, file: 'vo/06.wav' }, // it listens
  b07: { start: 61.0, dur: 3.11, file: 'vo/07.wav' }, // the right one found her
  b08: { start: 66.8, dur: 11.61, file: 'vo/08.wav' }, // it's real
  b09: { start: 79.2, dur: 11.98, file: 'vo/09.wav' }, // widen
  b10: { start: 91.8, dur: 2.09, file: 'vo/10.wav' }, // presence not performance
  b11: { start: 94.8, dur: 3.72, file: 'vo/11.wav' }, // grace
  b12: { start: 99.2, dur: 2.32, file: 'vo/12.wav' }, // benediction
  b13: { start: 102.6, dur: 3.62, file: 'vo/13.wav' }, // close
};
const END_S = 113;
export const TOTAL_FRAMES = s(END_S);

// ═══ helpers ═══
const useFade = (inSec = 0.8, outSec = 0.8, durFrames?: number) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const d = durFrames ?? durationInFrames;
  return Math.min(
    interpolate(frame, [0, s(inSec)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [d - s(outSec), d], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
};
const rise = (frame: number, delaySec: number, dist = 16, dur = 0.9) =>
  interpolate(frame, [s(delaySec), s(delaySec + dur)], [dist, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

// ═══ atmosphere ═══
const Grain: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.05, mixBlendMode: 'overlay' }}>
    <svg width="100%" height="100%">
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  </AbsoluteFill>
);
const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 42%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
);
const Tint: React.FC<{ color: string; strength?: number }> = ({ color, strength = 0.16 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 50% 8%, ${color}00, ${color}00)`, boxShadow: `inset 0 0 400px 40px ${color}`, opacity: strength, pointerEvents: 'none' }} />
);

// ═══ demo footage on a soft stage ═══
const DemoStage: React.FC<{ src: string; startFrom?: number; scale?: number }> = ({ src, startFrom = 0, scale = 1 }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: `radial-gradient(80% 80% at 50% 34%, #12161d 0%, ${INK} 100%)` }}>
    <div style={{ width: 1600 * scale, borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 130px rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: '100%', display: 'block' }} />
    </div>
  </AbsoluteFill>
);
const FullVideo: React.FC<{ src: string; startFrom?: number }> = ({ src, startFrom = 0 }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </AbsoluteFill>
);
const FadeWrap: React.FC<{ inSec?: number; outSec?: number; children: React.ReactNode }> = ({ inSec = 0.8, outSec = 0.8, children }) => (
  <AbsoluteFill style={{ opacity: useFade(inSec, outSec) }}>{children}</AbsoluteFill>
);

// ═══ THE ACHE — text rising over the dim breathing watch ═══
const ACHE_LINES = [
  "It's three in the morning.",
  "She can't sleep — so she walks.",
  'Her heart is racing — not from exercise,',
  'but from a grief no plan ever prepared her for.',
  'The one thing that could steady her',
  'is a book she has no hands, no strength to open.',
  'So it never comes.',
];
const AcheText: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const total = ACHE_LINES.reduce((a, l) => a + l.length, 0);
  let acc = B.b01.start + 0.6;
  const span = (B.b01.dur - 1.2) / total;
  let cur: { text: string; from: number; to: number } | null = null;
  for (const line of ACHE_LINES) {
    const from = acc;
    const to = acc + line.length * span;
    if (t >= from && t < to) cur = { text: line, from, to };
    acc = to;
  }
  if (!cur) return null;
  const op = Math.min(
    interpolate(t, [cur.from, cur.from + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(t, [cur.to - 0.5, cur.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const y = interpolate(t, [cur.from, cur.from + 0.9], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: 1300, textAlign: 'center', fontFamily: SERIF, fontSize: 60, lineHeight: 1.34, color: PAPER, opacity: op, transform: `translateY(${y}px)`, textShadow: '0 2px 46px rgba(0,0,0,0.96)' }}>{cur.text}</div>
    </AbsoluteFill>
  );
};
const PsalmRise: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(1.6, 1.2);
  const y = interpolate(frame, [0, s(2.4)], [26, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: op }}>
      <div style={{ textAlign: 'center', transform: `translateY(${y}px)`, maxWidth: 1300 }}>
        <div style={{ fontFamily: SANS, fontSize: 16, letterSpacing: 5, textTransform: 'uppercase', color: TEAL, marginBottom: 26, fontWeight: 600 }}>Psalm 23:4</div>
        <div style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 56, lineHeight: 1.42, color: PAPER }}>Even though I walk through the valley of the shadow…<br />you are with me.</div>
      </div>
    </AbsoluteFill>
  );
};

// ═══ THE NAME — rings settle, wordmark tightens up ═══
const NameReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = useFade(1.0, 1.0);
  const sp = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const track = interpolate(sp, [0, 1], [22, 7]);
  const ringScale = interpolate(sp, [0, 1], [1.4, 1]);
  const y = interpolate(frame, [0, s(1.2)], [22, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}>
      <div style={{ textAlign: 'center', transform: `translateY(${y}px)` }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', width: 96 - i * 26, height: 96 - i * 26, borderRadius: '50%', border: `2px solid ${TEAL}`, opacity: (1 - i * 0.32) * sp, transform: `scale(${ringScale})` }} />
          ))}
          <div style={{ width: 96, height: 96 }} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 132, fontWeight: 500, color: PAPER, letterSpacing: track }}>Selah</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 38, color: TEAL, marginTop: 20, opacity: interpolate(frame, [s(1.4), s(2.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Scripture that finds you when you can't go looking.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══ verse-ref lower third (colored spine) ═══
const VerseRef: React.FC<{ vref: string; tag: string; accent: string }> = ({ vref, tag, accent }) => {
  const op = useFade(0.6, 0.6);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 66 }}>
      <div style={{ opacity: op, display: 'inline-flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderRadius: 14, background: 'rgba(8,10,14,0.7)', border: `1px solid ${accent}55` }}>
        <div style={{ width: 8, height: 44, borderRadius: 4, background: accent }} />
        <div>
          <div style={{ fontFamily: SANS, fontSize: 17, letterSpacing: 3, textTransform: 'uppercase', color: accent, fontWeight: 700 }}>{tag}</div>
          <div style={{ fontFamily: SERIF, fontSize: 38, color: PAPER, marginTop: 3 }}>{vref}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══ live tag (anti-vaporware) ═══
const LiveTag: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(0.5, 0.6);
  const pulse = 0.55 + 0.45 * Math.sin(frame / 6);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 150, opacity: op }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 999, background: 'rgba(8,10,14,0.8)', border: `1px solid ${RENEWAL}66`, fontFamily: SANS, fontSize: 22, color: PAPER, letterSpacing: 0.5 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: RENEWAL, opacity: pulse, boxShadow: `0 0 12px ${RENEWAL}` }} />
        live · <b style={{ color: RENEWAL }}>YouVersion</b> · Berean Standard Bible
      </div>
    </AbsoluteFill>
  );
};

// ═══ caption band (locked per beat) ═══
type Cue = { text: string; from: number; to: number };
const CUES: Cue[] = [
  // b03 name handled by NameReveal; captions for spoken narration beats:
  { text: 'Every second, Selah reads the body — and names the moment.', from: 36.2, to: 40.3 },
  { text: 'Most of the time it says nothing at all. Just a colour that breathes.', from: 40.3, to: 44.0 },
  { text: 'But when she hits the wall — it feels it.', from: 45.4, to: 48.0 },
  { text: 'No menu. A pulse on her wrist.', from: 48.0, to: 50.0 },
  { text: "But a racing heart doesn't always mean the same thing.", from: 52.2, to: 55.2 },
  { text: 'So Selah does something no app has done. It listens.', from: 55.2, to: 58.6 },
  { text: 'She said two words. And the right one found her.', from: 61.2, to: 64.0 },
  { text: 'This is live. Real verses, from the YouVersion Platform, in two thousand languages.', from: 67.0, to: 72.0 },
  { text: "And one short, personal line, shaped by Gloo's faith-tuned voice.", from: 72.0, to: 75.6 },
  { text: 'Nothing here is staged.', from: 75.6, to: 78.0 },
  { text: 'This was never about fitness.', from: 79.4, to: 82.0 },
  { text: 'Cardiac rehab. The ninth hour of labor. A nurse’s twelfth hour.', from: 82.0, to: 86.2 },
  { text: 'Wherever a heart races — or finally rests — the right word can already be there.', from: 86.2, to: 91.0 },
];
const CaptionBand: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cue = CUES.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const op = Math.min(
    interpolate(t, [cue.from, cue.from + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(t, [cue.to - 0.3, cue.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 84 }}>
      <AbsoluteFill style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1500, textAlign: 'center', fontFamily: SANS, fontSize: 52, lineHeight: 1.3, fontWeight: 500, letterSpacing: 0.2, color: PAPER, opacity: op, textShadow: '0 3px 30px rgba(0,0,0,0.98)', padding: '0 60px' }}>{cue.text}</div>
    </AbsoluteFill>
  );
};

// ═══ big centered lines (presence / close) ═══
const BigLine: React.FC<{ text: string; italic?: boolean; size?: number }> = ({ text, italic, size = 64 }) => {
  const frame = useCurrentFrame();
  const op = useFade(0.8, 0.8);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}>
      <div style={{ fontFamily: SERIF, fontStyle: italic ? 'italic' : 'normal', fontSize: size, color: PAPER, textAlign: 'center', maxWidth: 1300, transform: `translateY(${rise(frame, 0, 14)}px)` }}>{text}</div>
    </AbsoluteFill>
  );
};

// ═══ benediction — full frame, no chrome ═══
const Benediction: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(1.0, 1.0);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}>
      <div style={{ textAlign: 'center', transform: `translateY(${rise(frame, 0, 12, 1.1)}px)` }}>
        <div style={{ fontFamily: SANS, fontSize: 15, letterSpacing: 5, textTransform: 'uppercase', color: TEAL, marginBottom: 26, fontWeight: 600 }}>the cool-down</div>
        <div style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 66, lineHeight: 1.35, color: PAPER }}>"You ran your race today.<br />Well done."</div>
      </div>
    </AbsoluteFill>
  );
};

const SignOff: React.FC = () => {
  const op = useFade(1.2, 1.6);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: 116, color: PAPER, letterSpacing: 6 }}>Selah</div>
        <div style={{ fontFamily: SANS, fontSize: 28, color: PAPER, marginTop: 14, opacity: 0.9, letterSpacing: 1 }}>wearable scripture</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: TEAL, marginTop: 30 }}>For the moments you can't go looking.</div>
        <div style={{ fontFamily: SANS, fontSize: 19, color: FAINT, marginTop: 34 }}>YouVersion Platform API · Gloo AI Studio · ● live demo</div>
      </div>
    </AbsoluteFill>
  );
};

// ═══ music that breathes: ducks to near-silence under the verses ═══
const duckWindows: [number, number][] = [
  [19.0, 25.0], // Psalm 23:4 rise
  [45.0, 51.5], // the wall verse
  [59.5, 66.5], // the whisper peak
  [98.5, 102.0], // benediction
];
const Score: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  let vol = 0.15;
  for (const [a, b] of duckWindows) {
    if (t > a - 1 && t < b + 1) {
      const d = Math.min(interpolate(t, [a - 1, a], [1, 0.22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), interpolate(t, [b, b + 1], [0.22, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
      vol = 0.15 * d;
    }
  }
  const fade = Math.min(interpolate(t, [0, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), interpolate(t, [END_S - 3, END_S], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return <Audio src={staticFile('music/score.mp3')} volume={Math.max(0.02, vol * fade)} />;
};

export const Selah: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    {/* ══ 0:00–0:26 THE ACHE ══ */}
    <Sequence from={0} durationInFrames={s(26)} name="Ache">
      <FadeWrap inSec={1.6} outSec={1.0}><FullVideo src="ambient.webm" /></FadeWrap>
      <AbsoluteFill style={{ background: 'rgba(3,4,6,0.9)' }} />
      <AcheText />
    </Sequence>
    <Sequence from={s(19.2)} durationInFrames={s(6.2)} name="PsalmRise"><PsalmRise /></Sequence>

    {/* ══ 0:26–0:35 THE NAME ══ */}
    <Sequence from={s(26.2)} durationInFrames={s(9.3)} name="Name"><NameReveal /></Sequence>

    {/* ══ 0:35–0:51 MECHANISM + THE WALL ══ */}
    <Sequence from={s(35.5)} durationInFrames={s(16.3)} name="Run">
      <FadeWrap inSec={1.0} outSec={0.7}><Tint color={INDIGO} /><DemoStage src="run.webm" /></FadeWrap>
    </Sequence>
    <Sequence from={s(45.4)} durationInFrames={s(6.0)} name="wall-ref"><VerseRef vref="Philippians 4:13 · live" tag="the wall" accent={INDIGO} /></Sequence>

    {/* ══ 0:51–1:06 THE WHISPER — the peak ══ */}
    <Sequence from={s(51.5)} durationInFrames={s(15.0)} name="Whisper">
      <FadeWrap inSec={0.9} outSec={0.9}><Tint color={RENEWAL} strength={0.2} /><DemoStage src="whisper.webm" startFrom={s(4)} /></FadeWrap>
    </Sequence>
    <Sequence from={s(61.0)} durationInFrames={s(5.5)} name="whisper-ref"><VerseRef vref="Isaiah 41:10 · live" tag='she whispered — "I’m scared"' accent={RENEWAL} /></Sequence>

    {/* ══ 1:06–1:18 IT'S REAL ══ */}
    <Sequence from={s(66.5)} durationInFrames={s(12.3)} name="Real">
      <FadeWrap inSec={0.8} outSec={0.8}><DemoStage src="live.webm" /></FadeWrap>
      <LiveTag />
    </Sequence>

    {/* ══ 1:18–1:31 THE WIDEN ══ */}
    <Sequence from={s(78.8)} durationInFrames={s(13.0)} name="Who">
      <FadeWrap inSec={1.0} outSec={1.0}><FullVideo src="who.webm" /></FadeWrap>
    </Sequence>
    <Sequence from={s(91.5)} durationInFrames={s(3.0)} name="Presence"><BigLine text="Presence — not performance." size={70} /></Sequence>

    {/* ══ 1:34–1:42 GRACE / BENEDICTION ══ */}
    <Sequence from={s(94.6)} durationInFrames={s(4.6)} name="Cooldown">
      <FadeWrap inSec={0.9} outSec={0.7}><Tint color={TEAL} /><DemoStage src="cooldown.webm" /></FadeWrap>
    </Sequence>
    <Sequence from={s(99.0)} durationInFrames={s(3.6)} name="Benediction"><Benediction /></Sequence>

    {/* ══ 1:42–1:53 CLOSE + SIGN-OFF ══ */}
    <Sequence from={s(102.6)} durationInFrames={s(4.2)} name="Close"><BigLine text="Not Scripture you go to. Scripture that shows up." italic size={58} /></Sequence>
    <Sequence from={s(106.8)} durationInFrames={s(6.2)} name="SignOff"><SignOff /></Sequence>

    {/* ── overlays ── */}
    <Grain />
    <Vignette />
    <CaptionBand />

    {/* ── audio ── */}
    <Score />
    {Object.values(B).map((b, i) => (
      <Sequence key={i} from={s(b.start)} name={`vo-${i + 1}`}><Audio src={staticFile(b.file)} volume={1} /></Sequence>
    ))}
  </AbsoluteFill>
);
