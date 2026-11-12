import assert from 'node:assert/strict';
import { createDetector, STEPS } from '../js/game/steps.js';
import { Score } from '../js/game/scoring.js';
import { ChallengeState } from '../js/game/state.js';
import { CONFIG } from '../js/config.js';

const base = { x: 0.5, y: 0.4, w: 0.2 };
// Persona sintética (espacio pantalla). opts: dx, dy, tilt, arms (altura de manos en anchos de hombro)
function person({ dx = 0, dy = 0, tilt = 0, hands = -1.5 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.99 }));
  const cx = 0.5 + dx, cy = 0.4 + dy, w = 0.2;
  lm[11] = { x: cx - w / 2, y: cy - tilt * w / 2, visibility: 0.99 };
  lm[12] = { x: cx + w / 2, y: cy + tilt * w / 2, visibility: 0.99 };
  lm[13] = { x: cx - w / 2, y: cy + 0.1, visibility: 0.99 }; lm[14] = { x: cx + w / 2, y: cy + 0.1, visibility: 0.99 };
  const hy = cy - hands * w; // hands>0 = por encima del hombro
  lm[15] = { x: cx - w / 2, y: hy, visibility: 0.99 }; lm[16] = { x: cx + w / 2, y: hy, visibility: 0.99 };
  return lm;
}
const run = (id, frames, dtMs = 33) => { const d = createDetector(id, base); let t = 0, r; for (const f of frames) { r = d.update(f, t); t += dtMs; } return { p: d.progress, r }; };
const rep = (f, n) => Array.from({ length: n }, () => f);
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); console.log('OK  ', name); n++; };

// --- Brazos arriba ---
ok('quieto con brazos abajo NO puntúa', run('brazos', rep(person({ hands: -1 }), 120)).p === 0);
ok('brazos arriba sostenidos = 1', run('brazos', rep(person({ hands: 1.4 }), 40)).p === 1);
ok('brazos arriba solo un instante (<600 ms) NO completa', run('brazos', [...rep(person({ hands: 1.4 }), 10), ...rep(person({ hands: -1 }), 40)]).p < 0.6);
ok('brazos a media altura = parcial (0.5)', run('brazos', rep(person({ hands: 0.55 }), 40)).p === 0.5);
ok('sin persona → 0', run('brazos', rep(null, 100)).p === 0);
// --- Lados ---
const sway = []; for (let i = 0; i < 90; i++) sway.push(person({ dx: 0.2 * 0.5 * Math.sin(i / 90 * Math.PI * 2 * 1.5) * 1 }));
ok('balanceo ± a ambos lados = 1', run('lados', sway.map((_, i) => person({ dx: 0.1 * Math.sin(i / 10) }))).p === 1);
ok('moverse a un solo lado = parcial (0.5)', run('lados', rep(person({ dx: 0.1 }), 60)).p === 0.5);
ok('quieto NO puntúa en lados', run('lados', rep(person(), 150)).p === 0);
// --- Hombros ---
ok('sacudir hombros alternando = 1', run('hombros', Array.from({ length: 80 }, (_, i) => person({ tilt: 0.25 * Math.sin(i / 3) }))).p === 1);
ok('quieto NO puntúa en hombros', run('hombros', rep(person(), 150)).p === 0);
// --- Salto ---
ok('saltar (rebotar) = 1', run('salto', Array.from({ length: 120 }, (_, i) => person({ dy: -0.07 * Math.max(0, Math.sin(i / 3.5)) })), 33).p === 1);
ok('quieto NO puntúa en salto', run('salto', rep(person(), 200)).p === 0);
// --- Final (combinado, en orden) ---
const combo = [...rep(person({ hands: 1.4 }), 30), ...Array.from({ length: 60 }, (_, i) => person({ dx: 0.08 * Math.sin(i / 5) })), ...Array.from({ length: 60 }, (_, i) => person({ tilt: 0.25 * Math.sin(i / 3) }))];
ok('final combinado completo = 1', run('final', combo).p === 1);
ok('final con solo brazos ≈ 1/3 (no completa)', Math.abs(run('final', rep(person({ hands: 1.4 }), 40)).p - 1 / 3) < 0.01);
ok('final: el orden importa (hombros primero no avanza)', run('final', Array.from({ length: 80 }, (_, i) => person({ tilt: 0.25 * Math.sin(i / 3) }))).p === 0);

// --- Puntuación ---
const s = new Score(5);
ok('correcto +100', s.finishStep('brazos', 1).pts === 100);
ok('no se cuenta dos veces el mismo paso', s.finishStep('brazos', 1) === null && s.points === 100);
ok('parcial +50', s.finishStep('lados', 0.6).pts === 50);
ok('no reconocido 0', s.finishStep('hombros', 0.2).pts === 0);
s.finishStep('salto', 1); s.finishStep('final', 1);
ok('3 correctos = pasa el umbral', s.validated === 3 && s.passed && s.done);
ok('bonificación de secuencia +200', s.finalize() === 100 + 50 + 0 + 100 + 100 + 200);
const f = new Score(5); STEPS.forEach(st => f.finishStep(st.id, 0));
ok('sin movimiento: 0 puntos y NO desbloquea', f.finalize() === 0 && !f.passed);
const g = new Score(5); ['brazos', 'lados', 'hombros', 'salto', 'final'].forEach((id, i) => g.finishStep(id, i < 2 ? 1 : 0.6));
ok('2 correctos + 3 parciales NO alcanza el umbral', !g.passed);

// --- Estados ---
const st = new ChallengeState(); const seen = []; st.on((a, b) => seen.push(`${b}>${a}`));
ok('preparing → playing es inválido', st.go('playing') === false && st.value === 'preparing');
['calibrating', 'playing', 'paused', 'playing', 'result', 'finished'].forEach(x => st.go(x));
ok('flujo completo de estados', seen.join() === 'preparing>calibrating,calibrating>playing,playing>paused,paused>playing,playing>result,result>finished');
ok('config: umbral configurable', CONFIG.minValidatedSteps === 3);
console.log(`\n${n} pruebas OK`);
