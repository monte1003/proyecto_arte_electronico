/** Definición de los pasos del reto y su detector de movimiento real (a partir de landmarks). */
import { bodyFrame, armsUpQuality, HoldTracker, AlternationCounter, clamp, vis, LM } from './poseMath.js';

export const STEPS = [
  { id: 'brazos', name: '¡Arriba esos brazos!', cue: 'Levanta los dos brazos por encima de la cabeza y sostenlos un momento.', beats: 8 },
  { id: 'lados', name: '¡Muévete de lado a lado!', cue: 'Inclínate o desplázate a un lado y luego al otro, siguiendo el balanceo.', beats: 8 },
  { id: 'hombros', name: '¡Sacude los hombros!', cue: 'Sube un hombro y baja el otro, al ritmo del tambor.', beats: 8 },
  { id: 'salto', name: '¡Salta con alegría!', cue: 'Pequeños saltitos o rebotes flexionando las rodillas, sin impacto fuerte.', beats: 8 },
  { id: 'pito', name: '¡Sopla el pito pea-pea!', cue: 'Lleva una mano a la boca, como si soplaras el pito, y bájala. Hazlo varias veces.', beats: 8 },
  { id: 'suelo', name: '¡Agáchate al suelo!', cue: 'Baja el cuerpo flexionando las rodillas, como una tirada al suelo, y vuelve a subir. Sin tirarte.', beats: 8 },
  { id: 'gallina', name: '¡Brazos de gallina!', cue: 'Sube y baja los codos a los lados, como alas, de forma rápida y exagerada.', beats: 8 },
  { id: 'hormigas', name: '¡Ataque de hormigas!', cue: 'Sacude todo el cuerpo con temblores rápidos, como si te atacaran las hormigas.', beats: 8 },
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

/** Pito pea-pea: llevar una mano a la boca (cerca de la nariz) varias veces. */
function whistleBlock(blowsNeeded) {
  let blows = 0, near = false;
  return {
    update(frame, lm) {
      const nose = lm[LM.NOSE], ds = [LM.L_WR, LM.R_WR].filter(i => vis(lm[i], 0.4)).map(i => Math.hypot(lm[i].x - nose.x, lm[i].y - nose.y) / frame.w);
      if (!vis(nose, 0.5) || !ds.length) return { sub: clamp(blows / blowsNeeded), hint: 'Muéstrame tu cara y tus manos' };
      const d = Math.min(...ds);
      if (d < 0.75 && !near) { near = true; blows++; } else if (d > 1.1) near = false;
      const sub = clamp(blows / blowsNeeded);
      return { sub, hint: sub >= 1 ? '¡Qué pea-pea tan sabroso!' : blows ? '¡Otra vez al pito!' : 'Lleva una mano a la boca, como si soplaras el pito' };
    },
  };
}
/** Tirada al suelo (versión segura): agacharse hasta bajar los hombros y volver a subir. */
function crouchBlock(base) {
  let maxD = 0, back = false;
  return {
    update(frame) {
      const d = (frame.mid.y - base.y) / base.w; // positivo = más abajo
      maxD = Math.max(maxD, d);
      if (maxD >= 0.5 && d < 0.2) back = true;
      const sub = back ? 1 : 0.5 * clamp(maxD / 0.5);
      return { sub, hint: sub >= 1 ? '¡Qué tirada al suelo!' : maxD >= 0.5 ? '¡Ahora sube otra vez!' : '¡Agáchate hacia el suelo, sin tirarte!' };
    },
  };
}
/** Brazos de gallina: los codos suben y bajan respecto a los hombros (el rebote del cuerpo no cuenta). */
function flapBlock(flipsNeeded) {
  const alt = new AlternationCounter(0.12);
  let ema = null, last = null;
  return {
    update(frame, lm, t) {
      const el = [LM.L_EL, LM.R_EL].filter(i => vis(lm[i], 0.4)).map(i => (frame.mid.y - lm[i].y) / frame.w);
      if (!el.length) return { sub: clamp(alt.count / flipsNeeded), hint: 'Muéstrame tus codos en el cuadro' };
      const s = el.reduce((a, b) => a + b, 0) / el.length; // positivo = codos por encima de los hombros
      const dt = last === null ? 33 : t - last; last = t;
      if (ema === null) ema = s;
      ema += (s - ema) * (1 - Math.exp(-dt / 600));
      const flips = alt.update(s - ema), sub = clamp(flips / flipsNeeded);
      return { sub, hint: sub >= 1 ? '¡Cacarea, marimondero!' : flips ? '¡Más rápido, esas alas!' : 'Sube y baja los codos como alas' };
    },
  };
}
/** Ataque de hormigas: temblor rápido del cuerpo (las oscilaciones lentas de «lados» no cuentan). */
function antsBlock(base, flipsNeeded) {
  const alt = new AlternationCounter(0.1);
  let ema = null, last = null;
  return {
    update(frame, lm, t) {
      const dt = last === null ? 33 : t - last; last = t;
      if (ema === null) ema = frame.mid.x;
      ema += (frame.mid.x - ema) * (1 - Math.exp(-dt / 120));
      const flips = alt.update((frame.mid.x - ema) / base.w), sub = clamp(flips / flipsNeeded);
      return { sub, hint: sub >= 1 ? '¡Las hormigas ganaron!' : flips ? '¡Sigue temblando!' : '¡Sacude todo el cuerpo, rápido!' };
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
  else if (stepId === 'pito') blocks = [whistleBlock(3)];
  else if (stepId === 'suelo') blocks = [crouchBlock(base)];
  else if (stepId === 'gallina') blocks = [flapBlock(6)];
  else if (stepId === 'hormigas') blocks = [antsBlock(base, 8)];
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
