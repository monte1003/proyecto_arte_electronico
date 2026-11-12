/** Confeti en canvas (celebraciones) y confeti CSS ligero para la portada. */
const COLS = ['#FFD600', '#FF1493', '#005BFF', '#39D353', '#FF7900', '#8028DB'];
export class ConfettiCanvas {
  constructor(canvas, reduced = false) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.p = []; this.run = false; this.reduced = reduced; this.rain = false; }
  size() { const d = Math.min(devicePixelRatio || 1, 2); this.W = this.cv.clientWidth; this.H = this.cv.clientHeight; this.cv.width = this.W * d; this.cv.height = this.H * d; this.ctx.setTransform(d, 0, 0, d, 0, 0); }
  burst(n = 60, x = this.W / 2, y = this.H * 0.6) {
    if (this.reduced) n = Math.min(n, 12);
    for (let i = 0; i < n && this.p.length < 260; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 7; this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: 4 + Math.random() * 6, c: COLS[(Math.random() * 6) | 0], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 1, ser: Math.random() < .25 }); }
    this.start();
  }
  setRain(on) { this.rain = on && !this.reduced; if (this.rain) this.start(); }
  start() { if (this.run) return; this.run = true; this.size(); const f = () => { if (!this.run) return; this.tick(); requestAnimationFrame(f); }; requestAnimationFrame(f); }
  stop() { this.run = false; this.p = []; this.rain = false; if (this.ctx) this.ctx.clearRect(0, 0, this.W || 0, this.H || 0); }
  tick() {
    const { ctx, W, H } = this; ctx.clearRect(0, 0, W, H);
    if (this.rain && Math.random() < .5) this.p.push({ x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 1.5, vy: 2 + Math.random() * 2.5, r: 4 + Math.random() * 5, c: COLS[(Math.random() * 6) | 0], rot: 0, vr: (Math.random() - .5) * .3, life: 1, ser: Math.random() < .2, rainy: true });
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i]; q.x += q.vx; q.y += q.vy; q.vy += q.rainy ? 0.01 : 0.16; q.vx *= .995; q.rot += q.vr; q.life -= q.rainy ? 0 : 0.011;
      if (q.life <= 0 || q.y > H + 20) { this.p.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, q.life * 1.5); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.strokeStyle = q.c;
      if (q.ser) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-q.r, 0); ctx.quadraticCurveTo(0, -q.r, q.r, 0); ctx.stroke(); } else ctx.fillRect(-q.r / 2, -q.r / 3, q.r, q.r * .6);
      ctx.restore();
    }
    if (!this.rain && !this.p.length) { this.run = false; }
  }
}

export function heroConfetti(el, reduced, light = false) {
  if (reduced) return;
  const n = light ? 14 : 30;
  el.innerHTML = Array.from({ length: n }, (_, i) => `<i style="left:${(i * 37) % 100}%;--s:${6 + (i * 7) % 9}px;--c:${COLS[i % 6]};--d:${7 + (i * 3) % 7}s;--dl:-${(i * 5) % 11}s"></i>`).join('');
}
