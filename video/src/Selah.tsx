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
const PAPER = '#f4efe6';
const FAINT = 'rgba(244,239,230,0.62)';

const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif';

// ── measured VO beat durations (piper en_US-amy-medium), seconds ──
const B = {
  b1: { start: 1.5, dur: 21.76, file: 'vo/01.wav' },
  b2: { start: 25.0, dur: 9.1, file: 'vo/02.wav' },
  b3: { start: 38.0, dur: 38.43, file: 'vo/03.wav' },
  b4: { start: 81.0, dur: 32.35, file: 'vo/04.wav' },
  b5: { start: 117.0, dur: 16.47, file: 'vo/05.wav' },
  b6: { start: 139.0, dur: 3.26, file: 'vo/06.wav' },
};
const END_S = 149;
export const TOTAL_FRAMES = s(END_S);

// ── narration caption lines per beat (hard-coded from docs/video-script.md) ──
const BEAT_LINES: Record<string, string[]> = {
  b1: [
    'This is Maya. Every morning she runs before the world wakes up.',
    'Her watch counts every heartbeat, every mile, every hard moment.',
    'It knows exactly when she wants to quit —',
    'and the one thing that could carry her through has never shown up.',
    'Scripture waits in an app she has to stop and open. So it never comes.',
  ],
  b2: [
    'We built Selah to change that.',
    'Not another Bible app — Scripture that lives inside the run,',
    'and shows up the way a watch speaks.',
  ],
  b3: [
    'It starts the moment she does.',
    '“This is the day that the LORD has made.”',
    'Four minutes in — this is the wall.',
    'Her heart rate spikes, her effort climbs, and her watch feels it.',
    'No menu. No pop-up. Just a pulse on her wrist.',
    '“I can do all things through Christ, who strengthens me.”',
    'At the peak — “they will run, and not be weary.”',
    'In her language, or any of two thousand others — live from YouVersion.',
    'And when she finally slows down… a different kind of word.',
    '“You ran your race today. Well done.”',
  ],
  b4: [
    'Every second, Selah reads the body — heart rate, zone, effort.',
    'A classifier names the moment: the wall, the peak, the finish.',
    'It pulls the verse from the YouVersion Platform API,',
    "in the runner's own language,",
    'and the Gloo AI Studio API — faith-tuned for ministry —',
    'shapes one short line, safe to read at 178 beats per minute.',
    "This isn't a mock-up.",
    'The notebook runs the whole pipeline, end to end.',
  ],
  b5: [
    'A billion wearables, on a billion wrists,',
    'in every language on earth.',
    'Every one is a place the right word could find someone —',
    'at the moment they were built to go through the wall.',
    'Not Scripture you go to. Scripture that shows up.',
  ],
  b6: ['Selah. Meet people where they already are.'],
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

const CAPTIONS: Cue[] = Object.entries(B).flatMap(([k, b]) =>
  cuesForBeat(b.start, b.dur, BEAT_LINES[k])
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

// ── Ken Burns still ──
const KenBurns: React.FC<{ src: string; zoom?: number; from?: number }> = ({
  src,
  zoom = 1.12,
  from = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [from, from * zoom], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

// ── vignette + grain over everything ──
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(120% 80% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none',
    }}
  />
);

// ── narration caption band ──
const CaptionBand: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cue = CAPTIONS.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const localIn = interpolate(t, [cue.from, cue.from + 0.25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const localOut = interpolate(t, [cue.to - 0.25, cue.to], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const op = Math.min(localIn, localOut);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}
    >
      <div
        style={{
          maxWidth: 1300,
          textAlign: 'center',
          fontFamily: SANS,
          fontSize: 38,
          lineHeight: 1.35,
          fontWeight: 500,
          color: PAPER,
          opacity: op,
          textShadow: '0 2px 24px rgba(0,0,0,0.9)',
          padding: '0 60px',
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

// ── verse reference lower-third (during the demo) ──
const VerseRef: React.FC<{ ref: string; tag: string; accent: string; selah?: boolean }> = ({
  ref,
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
            backdropFilter: 'blur(6px)',
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
            <div style={{ fontFamily: SERIF, fontSize: 30, color: PAPER, marginTop: 2 }}>
              {ref}
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

// ── title card ──
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const op = useFade(1.0, 1.0);
  const rise = interpolate(frame, [0, s(1.2)], [26, 0], { extrapolateRight: 'clamp' });
  const track = interpolate(frame, [0, s(2)], [18, 8], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: INK,
        opacity: op,
      }}
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
            fontFamily: SANS,
            fontSize: 34,
            color: TEAL,
            marginTop: 18,
            letterSpacing: 1,
          }}
        >
          the right word, at the right moment
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── API lower-third for the tech beat ──
const ApiLowerThird: React.FC = () => {
  const op = useFade(0.6, 0.6);
  const chip = (label: string, sub: string, accent: string) => (
    <div
      style={{
        padding: '16px 26px',
        borderRadius: 14,
        background: 'rgba(10,12,16,0.8)',
        border: `1px solid ${accent}66`,
      }}
    >
      <div style={{ fontFamily: SANS, fontSize: 26, color: PAPER, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 16, color: accent, marginTop: 4 }}>{sub}</div>
    </div>
  );
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 170, opacity: op }}
    >
      <div style={{ display: 'flex', gap: 20 }}>
        {chip('YouVersion Platform API', 'the verse · 2,000+ languages', TEAL)}
        {chip('Gloo AI Studio API', 'faith-tuned · the personal line', INDIGO)}
      </div>
    </AbsoluteFill>
  );
};

// ── big vision text ──
const VisionText: React.FC<{ lines: string[] }> = ({ lines }) => {
  const op = useFade(0.8, 0.8);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: op }}>
      <div style={{ textAlign: 'center', maxWidth: 1400 }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: SERIF,
              fontSize: 62,
              lineHeight: 1.25,
              color: PAPER,
              textShadow: '0 2px 30px rgba(0,0,0,0.9)',
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── sign-off ──
const SignOff: React.FC = () => {
  const op = useFade(1.0, 1.2);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center', background: INK, opacity: op }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: 110, color: PAPER, letterSpacing: 6 }}>
          Selah
        </div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: PAPER, marginTop: 16, opacity: 0.9 }}>
          wearable scripture
        </div>
        <div style={{ fontFamily: SANS, fontSize: 22, color: FAINT, marginTop: 26 }}>
          Built with the YouVersion Platform API &nbsp;·&nbsp; Gloo AI Studio
        </div>
        <div style={{ fontFamily: SANS, fontSize: 20, color: TEAL, marginTop: 30 }}>
          Meet people where they already are.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── a framed demo clip on a soft stage ──
const DemoStage: React.FC<{ src: string; muted?: boolean }> = ({ src }) => (
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

export const Selah: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      {/* ── VISUALS ── */}

      {/* Intro / hero (0–24) */}
      <Sequence from={0} durationInFrames={s(24.5)} name="Hero">
        <AbsoluteFill style={{ background: '#000' }}>
          <FadeWrap inSec={1.2} outSec={1.2}>
            <KenBurns src={staticFile('stills/01-hero.png')} zoom={1.14} />
          </FadeWrap>
        </AbsoluteFill>
      </Sequence>

      {/* Title (24.3–38) */}
      <Sequence from={s(24.3)} durationInFrames={s(13.9)} name="Title">
        <TitleCard />
      </Sequence>

      {/* Demo run (38–80) */}
      <Sequence from={s(38)} durationInFrames={s(42)} name="DemoRun">
        <FadeWrap inSec={0.8} outSec={0.8}>
          <DemoStage src={staticFile('run.webm')} />
        </FadeWrap>
      </Sequence>

      {/* verse-ref lower-thirds over the run */}
      <Sequence from={s(43.5)} durationInFrames={s(6)} name="v-warmup">
        <VerseRef ref="Psalm 118:24 · WEB" tag="warm-up" accent={TEAL} />
      </Sequence>
      <Sequence from={s(50)} durationInFrames={s(7.5)} name="v-wall">
        <VerseRef ref="Philippians 4:13 · WEB" tag="the wall" accent={INDIGO} selah />
      </Sequence>
      <Sequence from={s(58)} durationInFrames={s(7)} name="v-peak">
        <VerseRef ref="Isaiah 40:31 · WEB" tag="the peak" accent={AMBER} />
      </Sequence>
      <Sequence from={s(70.5)} durationInFrames={s(7.5)} name="v-cool">
        <VerseRef ref="You ran your race today. Well done." tag="cool-down" accent={TEAL} />
      </Sequence>

      {/* Tech beat: lift + hiit + lang footage (80–116) */}
      <Sequence from={s(80)} durationInFrames={s(17)} name="Lift">
        <FadeWrap inSec={0.7} outSec={0.6}>
          <DemoStage src={staticFile('lift.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(97)} durationInFrames={s(11)} name="HIIT">
        <FadeWrap inSec={0.6} outSec={0.6}>
          <DemoStage src={staticFile('hiit.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(108)} durationInFrames={s(8.5)} name="Lang">
        <FadeWrap inSec={0.6} outSec={0.8}>
          <DemoStage src={staticFile('lang.webm')} />
        </FadeWrap>
      </Sequence>
      <Sequence from={s(86)} durationInFrames={s(26)} name="apiLowerThird">
        <ApiLowerThird />
      </Sequence>

      {/* Vision montage (116–138) */}
      <Sequence from={s(116)} durationInFrames={s(22.5)} name="Vision">
        <AbsoluteFill style={{ background: '#000' }}>
          <FadeWrap inSec={1.0} outSec={1.0}>
            <MontageStills />
          </FadeWrap>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={s(117)} durationInFrames={s(9)} name="vision-1">
        <VisionText lines={['A billion wrists.', 'Every language on earth.']} />
      </Sequence>
      <Sequence from={s(127)} durationInFrames={s(10.5)} name="vision-2">
        <VisionText lines={['Not Scripture you go to.', 'Scripture that shows up.']} />
      </Sequence>

      {/* Sign-off (138–149) */}
      <Sequence from={s(138)} durationInFrames={s(11)} name="SignOff">
        <SignOff />
      </Sequence>

      {/* ── PERSISTENT OVERLAYS ── */}
      <Vignette />
      {/* single root-level CaptionBand: reads ABSOLUTE frame so cue times stay correct */}
      <CaptionBand />

      {/* watermark */}
      <Sequence from={s(38)} durationInFrames={s(99)} name="watermark">
        <Watermark />
      </Sequence>

      {/* ── AUDIO ── */}
      <Audio src={staticFile('music/calm.wav')} volume={0.13} />
      {Object.values(B).map((b, i) => (
        <Sequence key={i} from={s(b.start)} name={`vo-${i + 1}`}>
          <Audio src={staticFile(b.file)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// small helpers that need their own frame context
const FadeWrap: React.FC<{ inSec?: number; outSec?: number; children: React.ReactNode }> = ({
  inSec = 0.6,
  outSec = 0.6,
  children,
}) => {
  const op = useFade(inSec, outSec);
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

const Watermark: React.FC = () => (
  <AbsoluteFill style={{ padding: 40, pointerEvents: 'none' }}>
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 30,
        color: PAPER,
        opacity: 0.55,
        letterSpacing: 2,
      }}
    >
      Selah
    </div>
  </AbsoluteFill>
);

const MontageStills: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = s(22.5);
  const stills = ['stills/03-wall.png', 'stills/04-peak.png', 'stills/05-cooldown.png'];
  const each = dur / stills.length;
  return (
    <AbsoluteFill>
      {stills.map((src, i) => {
        const start = i * each;
        const op = interpolate(
          frame,
          [start, start + s(1), start + each - s(1), start + each],
          [0, 0.5, 0.5, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const scale = interpolate(frame, [start, start + each], [1.05, 1.15], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <AbsoluteFill key={i} style={{ opacity: op }}>
            <Img
              src={staticFile(src)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
