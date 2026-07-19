// Generate a "ka" (Taiko rim hit) WAV by mimicking writing-mori/play.html playKa()
// Stereo 48000 Hz to match don.mp3. Duration ~120ms.
const fs = require('fs');
const path = require('path');

const SR = 48000;
const DUR = 0.12; // seconds, source rendered
const N = Math.floor(SR * DUR);

// --- Biquad band-pass filter (RBJ cookbook) ---
function makeBandpass(sampleRate, freq, Q) {
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  // Constant skirt gain BPF (peak gain = Q) — Web Audio uses constant 0dB peak,
  // but skirt form is what we want for a punchy noise burst.
  const b0 =   alpha;
  const b1 =   0;
  const b2 =  -alpha;
  const a0 =   1 + alpha;
  const a1 =  -2 * cosw0;
  const a2 =   1 - alpha;
  // Normalize
  return {
    b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
    a1: a1 / a0, a2: a2 / a0,
    x1: 0, x2: 0, y1: 0, y2: 0,
  };
}
function biquadStep(f, x) {
  const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
  f.x2 = f.x1; f.x1 = x;
  f.y2 = f.y1; f.y1 = y;
  return y;
}

// --- Envelope: exponential ramp from g0 to g1 over [t0, t1] ---
// Web Audio's exponentialRampToValueAtTime: g(t) = g0 * (g1/g0)^((t-t0)/(t1-t0))
function expRamp(t, t0, g0, t1, g1) {
  if (t <= t0) return g0;
  if (t >= t1) return g1;
  const u = (t - t0) / (t1 - t0);
  return g0 * Math.pow(g1 / g0, u);
}

// Noise envelope (matches playKa):
// 0 -> 0.006s : 0.0001 -> 0.4
// 0.006 -> 0.08s : 0.4 -> 0.0001
// after 0.08s : ~0 (source stops at 0.1)
function noiseEnv(t) {
  if (t < 0) return 0;
  if (t < 0.006) return expRamp(t, 0, 0.0001, 0.006, 0.4);
  if (t < 0.08)  return expRamp(t, 0.006, 0.4, 0.08, 0.0001);
  if (t < 0.10)  return 0.0001; // tail
  return 0;
}

// Click envelope:
// 0 -> 0.005s : 0.0001 -> 0.12
// 0.005 -> 0.06s : 0.12 -> 0.0001
function clickEnv(t) {
  if (t < 0) return 0;
  if (t < 0.005) return expRamp(t, 0, 0.0001, 0.005, 0.12);
  if (t < 0.06)  return expRamp(t, 0.005, 0.12, 0.06, 0.0001);
  return 0;
}

// Square click freq sweep: 600 Hz -> 400 Hz over 0..0.05s (exponential)
function clickFreq(t) {
  if (t <= 0) return 600;
  if (t >= 0.05) return 400;
  const u = t / 0.05;
  return 600 * Math.pow(400 / 600, u);
}

const bpf = makeBandpass(SR, 1700, 2.2);

// Generate samples
const samples = new Float32Array(N);
let sqPhase = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  // White noise through bandpass
  const noise = (Math.random() * 2 - 1);
  const filtered = biquadStep(bpf, noise);
  const noisePart = filtered * noiseEnv(t);
  // Square oscillator with sweeping freq
  const f = clickFreq(t);
  sqPhase += 2 * Math.PI * f / SR;
  if (sqPhase > 2 * Math.PI) sqPhase -= 2 * Math.PI;
  const sq = Math.sin(sqPhase) >= 0 ? 1 : -1;
  const clickPart = sq * clickEnv(t);
  samples[i] = noisePart + clickPart;
}

// Find peak; normalize gently to avoid clipping but keep punch.
let peak = 0;
for (let i = 0; i < N; i++) {
  const a = Math.abs(samples[i]);
  if (a > peak) peak = a;
}
const target = 0.9;
const scale = peak > 0 ? Math.min(1, target / peak) : 1;
// If already quiet, don't amplify; if loud, bring down to 0.9.
const finalScale = peak > target ? target / peak : 1;
for (let i = 0; i < N; i++) samples[i] *= finalScale;

// --- Encode WAV (16-bit PCM stereo 48000) ---
const numChannels = 2;
const bitsPerSample = 16;
const byteRate = SR * numChannels * bitsPerSample / 8;
const blockAlign = numChannels * bitsPerSample / 8;
const dataSize = N * numChannels * bitsPerSample / 8;
const buffer = Buffer.alloc(44 + dataSize);
let off = 0;
buffer.write('RIFF', off); off += 4;
buffer.writeUInt32LE(36 + dataSize, off); off += 4;
buffer.write('WAVE', off); off += 4;
buffer.write('fmt ', off); off += 4;
buffer.writeUInt32LE(16, off); off += 4;            // fmt chunk size
buffer.writeUInt16LE(1, off); off += 2;             // PCM
buffer.writeUInt16LE(numChannels, off); off += 2;
buffer.writeUInt32LE(SR, off); off += 4;
buffer.writeUInt32LE(byteRate, off); off += 4;
buffer.writeUInt16LE(blockAlign, off); off += 2;
buffer.writeUInt16LE(bitsPerSample, off); off += 2;
buffer.write('data', off); off += 4;
buffer.writeUInt32LE(dataSize, off); off += 4;
for (let i = 0; i < N; i++) {
  let s = samples[i];
  if (s > 1) s = 1; if (s < -1) s = -1;
  const v = Math.round(s * 32767);
  buffer.writeInt16LE(v, off); off += 2; // L
  buffer.writeInt16LE(v, off); off += 2; // R (mono dup)
}

const outPath = path.resolve(__dirname, '..', 'assets', 'audio', 'sfx', 'quiz', 'ka.wav');
fs.writeFileSync(outPath, buffer);
console.log('Wrote', outPath, 'size=', buffer.length, 'samples=', N, 'peak=', peak.toFixed(4));
