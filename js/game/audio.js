/** Base rítmica y efectos 100 % sintetizados (originales; sin muestras ni música protegida). */
export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.timer = null; this.next = 0; this.beat = 0; this.bpm = 100; this.master = null; }
  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(this.ctx.destination); return true; }
    catch { return false; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; }
  _tone(t, f0, f1, dur, type, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(t, dur, vol, hp) {
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.connect(f).connect(g).connect(this.master); s.start(t);
  }
  _scheduleBeat(t, n) {
    this._tone(t, 150, 50, 0.16, 'sine', n % 2 === 0 ? 0.9 : 0.55);          // tambor
    this._noise(t + this.spb / 2, 0.05, 0.25, 6000);                           // guacharaca (contratiempo)
    if (n % 4 === 3) this._tone(t + this.spb * 0.75, 1800, 2300, 0.07, 'square', 0.05); // chiflido
  }
  /** Inicia el pulso; devuelve el instante (performance.now) del primer golpe para sincronizar el reloj del juego. */
  start(bpm, fromBeat = 0) {
    if (!this._ensure()) return performance.now();
    this.stop(); this.bpm = bpm; this.spb = 60 / bpm; this.beat = fromBeat;
    this.next = this.ctx.currentTime + 0.08;
    const t0 = performance.now() + 80;
    const tick = () => { while (this.next < this.ctx.currentTime + 0.25) { this._scheduleBeat(this.next, this.beat++); this.next += this.spb; } };
    tick(); this.timer = setInterval(tick, 60);
    return t0;
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  pito() { if (!this._ensure()) return; const t = this.ctx.currentTime; [0, 0.2].forEach(o => this._tone(t + o, 1500, 2100, 0.13, 'square', 0.12)); }
  sfx(kind) {
    if (!this._ensure()) return; const t = this.ctx.currentTime;
    if (kind === 'ok') { this._tone(t, 660, 880, 0.15, 'triangle', 0.25); this._tone(t + 0.08, 990, 1320, 0.18, 'triangle', 0.2); }
    else if (kind === 'partial') this._tone(t, 520, 620, 0.18, 'triangle', 0.2);
    else if (kind === 'miss') this._tone(t, 220, 160, 0.2, 'sine', 0.2);
    else if (kind === 'count') this._tone(t, 880, 880, 0.12, 'square', 0.1);
    else if (kind === 'go') this._tone(t, 1320, 1760, 0.3, 'square', 0.12);
    else if (kind === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(t + i * 0.11, f, f * 1.01, 0.3, 'triangle', 0.25));
    else if (kind === 'shutter') this._noise(t, 0.09, 0.5, 1500);
  }
}
