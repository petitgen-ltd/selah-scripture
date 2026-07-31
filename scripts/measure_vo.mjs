// measure_vo.mjs — after regenerating vo/01..12.wav with a new voice, print each
// clip's duration and flag any beat whose audio would overrun the next beat's
// start (i.e. the narration would overlap). Pure WAV-header parsing, no ffmpeg.
//
//   node scripts/measure_vo.mjs
//
// Current hand-authored beat STARTS (seconds) — synced to the visual clips in
// video/src/Selah.tsx. Keep in sync if you move a beat.
import { readFileSync } from 'node:fs';

const STARTS = {
  '01': 1.5, '02': 25.5, '03': 28.8, '04': 45.5, '05': 58.0, '06': 70.5,
  '07': 81.0, '08': 93.5, '09': 115.0, '10': 139.0, '11': 144.0, '12': 148.5,
};
const END_S = 166;

// duration of a PCM WAV from its header: dataChunkBytes / byteRate
function wavDuration(path) {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not RIFF: ' + path);
  let off = 12, byteRate = 0, dataBytes = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(off + 16); // fmt: +8 sampleRate, +12 byteRate → data starts at off+8
    if (id === 'data') { dataBytes = size; break; }
    off += 8 + size + (size & 1);
  }
  if (!byteRate) throw new Error('no fmt/byteRate: ' + path);
  return dataBytes / byteRate;
}

const keys = Object.keys(STARTS).sort((a, b) => Number(a) - Number(b));
const rows = keys.map((k) => {
  const dur = wavDuration(`vo/${k}.wav`);
  return { k, start: STARTS[k], dur };
});

console.log('\nbeat  start    dur    ends    nextStart  gap/OVERRUN');
console.log('----  -----   -----  ------   ---------  -----------');
let problems = 0;
rows.forEach((r, i) => {
  const ends = r.start + r.dur;
  const nextStart = i + 1 < rows.length ? rows[i + 1].start : END_S;
  const gap = nextStart - ends;
  const flag = gap < 0 ? `OVERRUN ${gap.toFixed(2)}s ⚠` : `+${gap.toFixed(2)}s`;
  if (gap < 0) problems++;
  console.log(
    `${r.k}   ${r.start.toFixed(1).padStart(5)}  ${r.dur.toFixed(2).padStart(6)}  ${ends
      .toFixed(2)
      .padStart(6)}   ${String(nextStart).padStart(6)}     ${flag}`
  );
});

console.log('\n// paste into video/src/Selah.tsx (adjust starts for any OVERRUN above):');
console.log('const B = {');
rows.forEach((r) => {
  console.log(
    `  b${Number(r.k)}: { start: ${r.start}, dur: ${r.dur.toFixed(2)}, file: 'vo/${r.k}.wav' },`
  );
});
console.log('};');

console.log(
  problems
    ? `\n⚠  ${problems} beat(s) overrun — nudge those starts later (and the visual Sequence 'from' if needed) before rendering.`
    : '\n✓ no overruns — safe to render.'
);
