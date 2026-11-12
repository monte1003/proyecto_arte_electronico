/** Matemática corporal pura (sin DOM): se puede probar en Node.
 *  Los landmarks llegan en el mismo espacio que se ve en pantalla (espejo si cámara frontal):
 *  x crece hacia la derecha de la pantalla, y hacia abajo. */
export const LM = { NOSE: 0, L_SH: 11, R_SH: 12, L_EL: 13, R_EL: 14, L_WR: 15, R_WR: 16, L_HIP: 23, R_HIP: 24 };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function vis(p, min = 0.5) { return !!p && (p.visibility === undefined || p.visibility >= min); }

export function angle(a, b, c) { // ángulo en b, en grados
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (!d) return 0;
  return (Math.acos(clamp((v1.x * v2.x + v1.y * v2.y) / d, -1, 1)) * 180) / Math.PI;
}

/** Marco del torso: punto medio y ancho de hombros (escala del usuario) + inclinación normalizada. */
export function bodyFrame(lm, min = 0.5) {
  if (!lm) return null;
  const ls = lm[LM.L_SH], rs = lm[LM.R_SH];
  if (!vis(ls, min) || !vis(rs, min)) return null;
  const w = Math.hypot(rs.x - ls.x, rs.y - ls.y);
  if (w < 1e-4) return null;
  return { mid: { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 }, w, tilt: (rs.y - ls.y) / w, ls, rs };
}

/** Altura de la mano sobre el hombro, en anchos de hombro. Usa el codo si la muñeca queda fuera del cuadro. */
export function handHeight(lm, wristIdx, elbowIdx, shoulder, w, min = 0.4) {
  const wr = lm[wristIdx], el = lm[elbowIdx];
  if (vis(wr, min)) return (shoulder.y - wr.y) / w;
  if (vis(el, min)) { const eh = (shoulder.y - el.y) / w; if (eh > 0.3) return eh + 0.5; } // brazo extendido hacia arriba
  return null;
}

/** Calidad 0..1 de "brazos arriba" (el peor de los dos brazos). null si no se ven. */
export function armsUpQuality(lm, frame) {
  const hl = handHeight(lm, LM.L_WR, LM.L_EL, frame.ls, frame.w);
  const hr = handHeight(lm, LM.R_WR, LM.R_EL, frame.rs, frame.w);
  if (hl === null || hr === null) return null;
  const q = h => clamp((h - 0.2) / 0.7);
  return Math.min(q(hl), q(hr));
}

/** Mantener una condición el tiempo requerido (en ms continuos). */
export class HoldTracker {
  constructor(threshold, holdMs) { this.th = threshold; this.ms = holdMs; this.start = null; this.best = 0; }
  update(q, t) {
    if (q !== null && q >= this.th) { if (this.start === null) this.start = t; this.best = Math.max(this.best, t - this.start); }
    else this.start = null;
    return this.progress;
  }
  get progress() { return clamp(this.best / this.ms); }
}

/** Cuenta cambios de lado entre dos extremos (±th): sirve para sacudir hombros o rebotar. */
export class AlternationCounter {
  constructor(th) { this.th = th; this.side = 0; this.count = 0; }
  update(v) {
    if (v > this.th && this.side !== 1) { if (this.side === -1) this.count++; this.side = 1; }
    else if (v < -this.th && this.side !== -1) { if (this.side === 1) this.count++; this.side = -1; }
    return this.count;
  }
}
