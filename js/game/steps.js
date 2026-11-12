/** Definición de los pasos del reto y su detector de movimiento real (a partir de landmarks). */
import { bodyFrame, armsUpQuality, HoldTracker, AlternationCounter, clamp } from './poseMath.js';

export const STEPS = [
  { id: 'brazos', name: '¡Arriba esos brazos!', cue: 'Levanta los dos brazos por encima de la cabeza y sostenlos un momento.', beats: 8 },
  { id: 'lados', name: '¡Muévete de lado a lado!', cue: 'Inclínate o desplázate a un lado y luego al otro, siguiendo el balanceo.', beats: 8 },
  { id: 'hombros', name: '¡Sacude los hombros!', cue: 'Sube un hombro y baja el otro, al ritmo del tambor.', beats: 8 },
  { id: 'salto', name: '¡Salta con alegría!', cue: 'Pequeños saltitos o rebotes flexionando las rodillas, sin impacto fuerte.', beats: 8 },
  { id: 'final', name: '¡El paso final de la Marimonda!', cue: 'Combina: brazos arriba, balanceo a los lados y sacudida de hombros.', beats: 18 },
];

/* ---- Bloques de detección reutilizables. Cada uno: update(frame, lm, t) → {sub: 0..1, hint} ---- */
function armsBlock() {
  const full = new HoldTracker(0.8, 600), half = new HoldTracker(0.45, 600);
  return {
    update(frame, lm, t) {
      const q = armsUpQuality(lm, frame);
      full.update(q, t); half.update(q, t);
      const sub = Math.max(full.progress, 0.5 * half.progress);
      let hint = '¡Arriba esos brazos!';
      if (q === null) hint = 'Muéstrame tus brazos en el cuadro';
      else if (q >= 0.8) hint = sub >= 1 ? '¡Excelente movimiento!' : '¡Así se baila! Sostén un instante…';
      else if (q >= 0.45) hint = '¡Sube un poco más los brazos!';
      return { sub, hint };
    },
  };
}
function sideBlock(base, reach) {
  let maxR = 0, maxL = 0;
  return {
    update(frame) {
      const off = (frame.mid.x - base.x) / base.w;
      maxR = Math.max(maxR, off); maxL = Math.max(maxL, -off);
      const sub = (clamp(maxR / reach) + clamp(maxL / reach)) / 2;
      let hint = '¡Sigue el ritmo!';
      if (sub >= 1) hint = '¡Muy bien, marimondero!';
      else if (maxR < reach * 0.5 && maxL < reach * 0.5) hint = '¡Muévete hacia un lado!';
      else if (maxR < reach) hint = '¡Ahora hacia tu derecha!';
      else if (maxL < reach) hint = '¡Ahora hacia tu izquierda!';
      return { sub, hint };
    },
  };
}
function shakeBlock(flipsNeeded) {
  const alt = new AlternationCounter(0.07);
  return {
    update(frame) {
      const flips = alt.update(frame.tilt);
      const sub = clamp(flips / flipsNeeded);
      return { sub, hint: sub >= 1 ? '¡Así se baila!' : flips ? '¡Sigue sacudiendo los hombros!' : 'Sube un hombro y baja el otro' };
    },
  };
}
function jumpBlock(base) {
  const alt = new AlternationCounter(0.06);
  let ema = null, last = null;
  return {
    update(frame, lm, t) {
      const s = (base.y - frame.mid.y) / base.w; // positivo = más arriba
      const dt = last === null ? 33 : t - last; last = t;
      if (ema === null) ema = s;
      ema += (s - ema) * (1 - Math.exp(-dt / 700)); // quita la deriva lenta
      const flips = alt.update(s - ema);
      const sub = clamp(flips / 4);
      return { sub, hint: sub >= 1 ? '¡Excelente salto!' : flips ? '¡Más impulso, sigue saltando!' : '¡Salta con alegría!' };
    },
  };
}

/** Crea el detector de un paso. `base` = {x,y,w} medido al iniciar el paso. */
export function createDetector(stepId, base) {
  let blocks;
  if (stepId === 'brazos') blocks = [armsBlock()];
  else if (stepId === 'lados') blocks = [sideBlock(base, 0.4)];
  else if (stepId === 'hombros') blocks = [shakeBlock(3)];
  else if (stepId === 'salto') blocks = [jumpBlock(base)];
  else if (stepId === 'final') blocks = [armsBlock(), sideBlock(base, 0.3), shakeBlock(2)]; // en orden
  else throw new Error('Paso desconocido: ' + stepId);

  let progress = 0, phase = 0, hint = '';
  return {
    get progress() { return progress; },
    /** lm: landmarks (espacio de pantalla) o null si no hay persona. */
    update(lm, t, cfg = {}) {
      const frame = bodyFrame(lm, cfg.minVisibility ?? 0.5);
      if (!frame) return { progress, hint: 'No te veo bien: muestra hombros y brazos', seen: false };
      const r = blocks[phase].update(frame, lm, t);
      hint = r.hint;
      let cur = r.sub;
      if (r.sub >= 1 && phase < blocks.length - 1) { phase++; cur = 0; hint = '¡Sigue con el siguiente movimiento!'; }
      progress = Math.max(progress, (phase + cur) / blocks.length);
      return { progress, hint, seen: true, phase };
    },
  };
}
