import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ── palette (matches the Selah demo) ──
const INK = '#0a0c10';
const TEAL = '#39d0c8';
const INDIGO = '#8a90ff';
const AMBER = '#f4b642';
const TRUST = '#a98bff';
const PAPER = '#f4efe6';
const FAINT = 'rgba(244,239,230,0.62)';

const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif';

// ── measured Piper (en_US-amy-medium) VO beat durations, seconds ──
// re-sequenced narrative: ache → what-it-is → mechanism → widen → real → grace
const B = {
  b1: { start: 1.5, dur: 19.17, file: 'vo/01.wav' },   // THE ACHE
  b2: { start: 25.5, dur: 1.07, file: 'vo/02.wav' },   // "Until now."
  b3: { start: 28.8, dur: 10.83, file: 'vo/03.wav' },  // WHAT IT IS
  b4: { start: 45.5, dur: 10.79, file: 'vo/04.wav' },  // mechanism: reads the body
  b5: { start: 58.0, dur: 10.33, file: 'vo/05.wav' },  // the wall — Phil 4:13
  b6: { start: 70.5, dur: 7.14, file: 'vo/06.wav' },   // the peak — Isaiah 40:31
  b7: { start: 81.0, dur: 4.24, file: 'vo/07.wav' },   // language
  b8: { start: 93.5, dur: 19.96, file: 'vo/08.wav' },  // NOT JUST ATHLETES
  b9: { start: 115.0, dur: 22.21, file: 'vo/09.wav' }, // IT'S REAL
  b10: { start: 139.0, dur: 3.56, file: 'vo/10.wav' }, // grace: slows down
  b11: { start: 144.0, dur: 2.73, file: 'vo/11.wav' }, // benediction
  b12: { start: 148.5, dur: 6.86, file: 'vo/12.wav' }, // close
};
const END_S = 166;
export const TOTAL_FRAMES = s(END_S);

// ── ACHE: text lines (VO01), shown large & centered, one at a time (near-black) ──
const ACHE_LINES = [
  "It's three in the morning.",
  "She can't sleep — so she walks.",
  'Her heart is racing — not from exercise,',
  'but from a grief no training plan prepared her for.',
  'The one thing that could steady her',
  'is a book she has no hands, no eyes,',
  'no strength to open right now.',
  'So it never comes.',
];

// ── caption lines per beat (b3..b12; b1/b2 handled by the ACHE treatment) ──
const BEAT_LINES: Record<string, string[]> = {
  b3: [
    'This is Selah.',
    'Not another Bible app —',
    "Scripture that finds you when you can't go looking.",
    'The Word, the way a watch speaks — the moment a body needs it.',
  ],
  b4: [
    'Every second, Selah reads the body —',
    'heart rate, effort, recovery — and names the moment.',
    'Most of the time, it says nothing at all.',
    'Just a colour that breathes.',
  ],
  b5: [
    'But when she hits the wall, it feels it.',
    'No menu. No pop-up. A pulse on her wrist.',
    '“I can do all things through Christ, who strengthens me.”',
  ],
  b6: [
    'And at the very edge of what she has left…',
    '“…wings like eagles; they will run, and not be weary.”',
  ],
  b7: [
    'In her language, or two thousand others —',
    'pulled live from YouVersion.',
  ],
  b8: [
    'But this was never about fitness.',
    'The same heartbeat spikes in cardiac rehab —',
    'a heart relearning to beat.',
    'In the ninth hour of labor.',
    "In a nurse's twelfth hour, a soldier's ruck, a parent's dawn.",
    'Wherever a heart races, or finally rests,',
    'the right word can already be there.',
    'Presence — not performance.',
  ],
  b9: [
    "And it's real.",
    'A classifier trained on real biometric sessions names the moment.',
    'The YouVersion Platform API brings the verse.',
    'The Gloo AI Studio API — faith-tuned for ministry —',
    'shapes one short, personal line, safe to read at a glance.',
    'The notebook runs the whole thing, end to end.',
    'Nothing here is faked.',
  ],
  b10: ['And when she finally slows down…', 'a different kind of word.'],
  b11: ['“You ran your race today. Well done.”'],
  b12: [
    'Not Scripture you go to. Scripture that shows up.',
    "That's Selah — for the moments you can't go looking.",
  ],
};

type Cue = { from: number; to: number; text: string };

// distribute a beat's lines across its audio span, weighted by character count
function cuesForBeat(start: number, dur: number, lines: string[]): Cue[] {
  const total = lines.reduce((a, l) => a + l.length, 0);
  const cues: Cue[] = [];
  let t = start;
  for (const line of lines) {
    const span = (line.length / total) * dur;
    cues.push({ from: t, to: t + span, text: line });
    t += span;
  }
  return cues;
}

// caption band beats (skip b1/b2 — the ACHE has its own large treatment)
const CAPTIONS: Cue[] = (['b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'] as const).flatMap(
  (k) => cuesForBeat(B[k].start, B[k].dur, BEAT_LINES[k])
);

// ── fade helper ──
const useFade = (inSec = 0.6, outSec = 0.6, durFrames?: number) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const d = durFrames ?? durationInFrames;
  const fin = interpolate(frame, [0, s(inSec)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fout = interpolate(frame, [d - s(outSec), d], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.min(fin, fout);
};

// ── vignette over everything ──
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(120% 80% at 50% 42%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none',
    }}
  />
);

// ── narration caption band (mechanism → close) ──
const CaptionBand: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cue = CAPTIONS.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const localIn = interpolate(t, [cue.from, cue.from + 0.28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const localOut = interpolate(t, [cue.to - 0.28, cue.to], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const op = Math.min(localIn, localOut);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 92 }}
    >
      <div
        style={{
          maxWidth: 1480,
          textAlign: 'center',
          fontFamily: SANS,
          fontSize: 56,
          lineHeight: 1.28,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: PAPER,
          opacity: op,
          textShadow: '0 3px 30px rgba(0,0,0,0.98), 0 1px 4px rgba(0,0,0,0.9)',
          padding: '20px 54px',
          borderRadius: 20,
          background: 'rgba(6,8,12,0.42)',
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

// ── THE ACHE: large centered lines over a dim breathing watch (near-black) ──
const AcheText: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cues = cuesForBeat(B.b1.start, B.b1.dur, ACHE_LINES);
  const cue = cues.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const op = Math.min(
    interpolate(t, [cue.from, cue.from + 0.5], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    interpolate(t, [cue.to - 0.5, cue.to], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const rise = interpolate(t, [cue.from, cue.from + 0.9], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          maxWidth: 1280,
          textAlign: 'center',
          fontFamily: SERIF,
          fontSize: 60,
          lineHeight: 1.34,
          color: PAPER,
          opacity: op,
          transform: `translateY(${rise}px)`,
          textShadow: '0 2px 40px rgba(0,0,0,0.95)',
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

// ── Psalm 23:4 rising wordlessly (end of the ACHE) ──
const PsalmRise: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(1.4, 1.0);
  const rise = interpolate(frame, [0, s(2.2)], [22, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: op }}>
      <div style={{ textAlign: 'center', transform: `translateY(${rise}px)`, maxWidth: 1300 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 17,
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: TRUST,
            marginBottom: 26,
            fontWeight: 700,
          }}
        >
          Psalm 23:4
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1.4, color: PAPER }}>
          Even though I walk through the valley of the shadow…
          <br />
          you are with me.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── verse-ref lower-third (over the demo) ──
const VerseRef: React.FC<{ vref: string; tag: string; accent: string; selah?: boolean }> = ({
  vref,
  tag,
  accent,
  selah,
}) => {
  const op = useFade(0.5, 0.5);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 64 }}
    >
      <div style={{ opacity: op }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 22px',
            borderRadius: 14,
            background: 'rgba(10,12,16,0.72)',
            border: `1px solid ${accent}55`,
          }}
        >
          <div style={{ width: 8, height: 40, borderRadius: 4, background: accent }} />
          <div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 15,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: accent,
                fontWeight: 700,
              }}
            >
              {tag}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 40, color: PAPER, marginTop: 4 }}>
              {vref}
            </div>
          </div>
          {selah && (
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 26,
                color: FAINT,
                marginLeft: 10,
              }}
            >
              Selah
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── title card (WHAT IT IS) ──
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(1.0, 1.0);
  const rise = interpolate(frame, [0, s(1.2)], [26, 0], { extrapolateRight: 'clamp' });
  const track = interpolate(frame, [0, s(2)], [18, 8], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}
    >
      <div style={{ textAlign: 'center', transform: `translateY(${rise}px)` }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 150,
            color: PAPER,
            letterSpacing: track,
            fontWeight: 500,
          }}
        >
          Selah
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 40,
            color: TEAL,
            marginTop: 22,
            letterSpacing: 0.5,
          }}
        >
          Scripture that finds you when you can't go looking.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── language lower-third (mechanism) ──
const LangLowerThird: React.FC = () => {
  const op = useFade(0.6, 0.7);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 168, opacity: op }}
    >
      <div
        style={{
          padding: '16px 28px',
          borderRadius: 14,
          background: 'rgba(10,12,16,0.8)',
          border: `1px solid ${TEAL}55`,
          fontFamily: SANS,
          fontSize: 32,
          color: PAPER,
        }}
      >
        <b style={{ color: TEAL }}>2,000+ languages</b> &nbsp;·&nbsp; pulled live from YouVersion
      </div>
    </AbsoluteFill>
  );
};

// ── section kicker (NOT JUST ATHLETES) ──
const SectionKicker: React.FC<{ kicker: string; line: string; accent: string }> = ({
  kicker,
  line,
  accent,
}) => {
  const op = useFade(0.8, 0.8);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60, opacity: op }}>
      <div
        style={{
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(10,12,16,0.85) 0%, rgba(10,12,16,0) 100%)',
          padding: '18px 40px 60px',
          borderRadius: 20,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 15,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: accent,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {kicker}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: PAPER }}>{line}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── sign-off ──
const SignOff: React.FC = () => {
  const op = useFade(1.2, 1.4);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: 110, color: PAPER, letterSpacing: 6 }}>Selah</div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: PAPER, marginTop: 16, opacity: 0.9 }}>
          wearable scripture
        </div>
        <div style={{ fontFamily: SANS, fontSize: 22, color: FAINT, marginTop: 26 }}>
          Built with the YouVersion Platform API &nbsp;·&nbsp; Gloo AI Studio
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 24, color: TEAL, marginTop: 30 }}>
          For the moments you can't go looking.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── a framed demo clip on a soft stage ──
const DemoStage: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(80% 80% at 50% 35%, #14181f 0%, ${INK} 100%)`,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <div
      style={{
        width: 1600,
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <OffthreadVideo src={src} muted style={{ width: '100%', display: 'block' }} />
    </div>
  </AbsoluteFill>
);

const FadeWrap: React.FC<{ inSec?: number; outSec?: number; children: React.ReactNode }> = ({
  inSec = 0.6,
  outSec = 0.6,
  children,
}) => {
  const op = useFade(inSec, outSec);
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

const Watermark: React.FC = () => (
  <AbsoluteFill
    style={{
      padding: 44,
      pointerEvents: 'none',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    }}
  >
    <div style={{ fontFamily: SERIF, fontSize: 28, color: PAPER, opacity: 0.42, letterSpacing: 2 }}>
      Selah
    </div>
  </AbsoluteFill>
);

// dark scrim that eases off as the watch "glows" at the end of the ACHE
const AcheScrim: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const a = interpolate(t, [0, 2, 28], [0.98, 0.87, 0.87], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{ background: `rgba(3,4,6,${a})`, pointerEvents: 'none' }} />;
};

export const Selah: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      {/* ══ 0:00–0:28 THE ACHE — near-black, text over the dim breathing watch, Psalm 23:4 rises ══ */}
      <Sequence from={0} durationInFrames={s(28.2)} name="AcheBg">
        <FadeWrap inSec={1.6} outSec={1.0}>
          <AbsoluteFill style={{ background: '#000' }}>
            <OffthreadVideo
              src={staticFile('ambient.webm')}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AbsoluteFill>
        </FadeWrap>
        <AcheScrim />
      </Sequence>
      <Sequence from={0} durationInFrames={s(20.5)} name="AcheText">
        <AcheText />
      </Sequence>
      <Sequence from={s(20.6)} durationInFrames={s(7.6)} name="PsalmRise">
        <PsalmRise />
      </Sequence>

      {/* ══ 0:28–0:44 WHAT IT IS ══ */}
      <Sequence from={s(28.2)} durationInFrames={s(16)} name="Title">
        <TitleCard />
      </Sequence>

      {/* ══ 0:44–1:32 THE MECHANISM (on the run) ══ */}
      <Sequence from={s(44)} durationInFrames={s(36.5)} name="DemoRun">
        <FadeWrap inSec={0.9} outSec={0.7}>
          <DemoStage src={staticFile('run.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(57.5)} durationInFrames={s(9.5)} name="v-wall">
        <VerseRef vref="Philippians 4:13 · public domain" tag="the wall" accent={INDIGO} selah />
      </Sequence>
      <Sequence from={s(69.5)} durationInFrames={s(8.5)} name="v-peak">
        <VerseRef vref="Isaiah 40:31 · wings like eagles" tag="the peak" accent={AMBER} />
      </Sequence>
      {/* language beat */}
      <Sequence from={s(80.5)} durationInFrames={s(12)} name="DemoLang">
        <FadeWrap inSec={0.7} outSec={0.8}>
          <DemoStage src={staticFile('lang.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(81)} durationInFrames={s(10.5)} name="langLowerThird">
        <LangLowerThird />
      </Sequence>

      {/* ══ 1:32–1:54 NOT JUST ATHLETES ══ */}
      <Sequence from={s(92.5)} durationInFrames={s(22)} name="Who">
        <AbsoluteFill style={{ background: '#000' }}>
          <FadeWrap inSec={1.0} outSec={1.0}>
            <OffthreadVideo
              src={staticFile('who.webm')}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </FadeWrap>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={s(93.5)} durationInFrames={s(20)} name="whoKicker">
        <SectionKicker
          kicker="Not just athletes"
          line="Presence, not performance."
          accent={TRUST}
        />
      </Sequence>

      {/* ══ 1:54–2:18 IT'S REAL ══ */}
      <Sequence from={s(114.5)} durationInFrames={s(24)} name="Build">
        <AbsoluteFill style={{ background: '#000' }}>
          <FadeWrap inSec={0.9} outSec={1.0}>
            <OffthreadVideo
              src={staticFile('build.webm')}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </FadeWrap>
        </AbsoluteFill>
      </Sequence>
      {/* (the build section already credits both APIs on-screen — no extra lower-third) */}

      {/* ══ 2:18–2:35 CLOSE ON GRACE ══ */}
      <Sequence from={s(138)} durationInFrames={s(17.5)} name="Cooldown">
        <FadeWrap inSec={0.9} outSec={0.9}>
          <DemoStage src={staticFile('cooldown.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(143)} durationInFrames={s(9)} name="v-benediction">
        <VerseRef vref="You ran your race today. Well done." tag="cool-down" accent={TEAL} />
      </Sequence>

      {/* ══ 2:35–2:46 SIGN-OFF ══ */}
      <Sequence from={s(155.5)} durationInFrames={s(10.5)} name="SignOff">
        <SignOff />
      </Sequence>

      {/* ── PERSISTENT OVERLAYS ── */}
      <Vignette />
      <CaptionBand />
      <Sequence from={s(44)} durationInFrames={s(111)} name="watermark">
        <Watermark />
      </Sequence>

      {/* ── AUDIO ── */}
      <Audio src={staticFile('music/calm.wav')} volume={0.11} />
      {Object.values(B).map((b, i) => (
        <Sequence key={i} from={s(b.start)} name={`vo-${i + 1}`}>
          <Audio src={staticFile(b.file)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
