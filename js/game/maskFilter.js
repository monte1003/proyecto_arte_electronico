/** Filtro de realidad aumentada: dibuja la máscara de la Marimonda (capas SVG) alineada al rostro. */
import { FILTER_LAYERS, PIVOTS, svgToImage } from '../art/maskArt.js';
import { estimateFace } from './faceMath.js';
import { CONFIG } from '../config.js';

export class MaskFilter {
  constructor() { this.img = null; this.s = null; this.alpha = 0; this.lastSeen = 0; this.flapUntil = 0; this.mouthWasOpen = false; this.onMouthOpen = null; this.visible = false; }
  async load() {
    if (this.img) return;
    const entries = await Promise.all(Object.entries(FILTER_LAYERS).map(async ([k, v]) => [k, await svgToImage(v)]));
    this.img = Object.fromEntries(entries);
  }
  /** Actualiza con los landmarks más recientes (o null si no hay rostro). Devuelve true si hay rostro. */
  update(lm, W, H, now) {
    if (!lm) { if (now - this.lastSeen > CONFIG.faceLostMs) this.visible = false; return this.visible; }
    const f = estimateFace(lm, W, H); this.lastSeen = now; this.visible = true;
    if (!this.s) this.s = { ...f }; else {
      const k = 0.55; // suavizado (reduce temblor sin perder respuesta)
      for (const key of ['x', 'y', 'scale', 'yaw', 'pitch', 'mouth', 'faceW', 'faceH']) this.s[key] += (f[key] - this.s[key]) * k;
      let d = f.roll - this.s.roll; d = Math.atan2(Math.sin(d), Math.cos(d)); this.s.roll += d * k;
    }
    const open = f.mouth > CONFIG.mouthOpenRatio;
    if (open && !this.mouthWasOpen) { this.flapUntil = now + 700; this.onMouthOpen && this.onMouthOpen(); }
    this.mouthWasOpen = open;
    return true;
  }
  draw(ctx, W, H, now) {
    ctx.clearRect(0, 0, W, H);
    const target = this.visible ? 1 : 0; this.alpha += (target - this.alpha) * 0.25;
    if (!this.img || !this.s || this.alpha < 0.02) return;
    const s = this.s, flap = now < this.flapUntil ? Math.sin(now * 0.03) * 0.35 * ((this.flapUntil - now) / 700 + 0.3) : 0;
    ctx.save(); ctx.globalAlpha = this.alpha;
    ctx.translate(s.x + s.yaw * s.faceW * 0.04, s.y + (s.pitch - 0.52) * s.faceH * 0.3);
    ctx.rotate(s.roll); const k = s.scale * 1.02; ctx.scale(k * (1 - 0.28 * Math.abs(s.yaw)), k); ctx.translate(-500, -500);
    const layer = (name, rot) => { ctx.save(); const [px, py] = PIVOTS[name] || [500, 500]; ctx.translate(px, py); ctx.rotate(rot); ctx.translate(-px, -py); ctx.drawImage(this.img[name], 0, 0, 1000, 1000); ctx.restore(); };
    layer('earL', -flap); layer('earR', flap); layer('hood', 0); layer('nose', flap * 0.25);
    ctx.restore();
  }
}
