import assert from 'node:assert/strict';
import { createDetector, STEPS } from '../js/game/steps.js';
import { Score } from '../js/game/scoring.js';
import { ChallengeState } from '../js/game/state.js';
import { CONFIG } from '../js/config.js';
import { levelForCount, effectiveGain, MusicProgress, MusicController } from '../js/game/music.js';

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

// --- Música progresiva (lógica, con audio simulado) ---
const M = CONFIG.music, N = STEPS.length;
ok('música: empieza al 10 %', levelForCount(0, N) === 0.10);
ok('música: 1.º…5.º paso correcto = 20/35/50/65/75 %', [1, 2, 3, 4, 5].map(c => levelForCount(c, N)).join() === '0.2,0.35,0.5,0.65,0.75');
ok('música: nunca llega al 100 % (tope duro)', levelForCount(99, N) <= M.hardMax && M.hardMax < 1 && effectiveGain(5, 5) <= M.hardMax);
const lv3 = [0, 1, 2, 3].map(c => levelForCount(c, 3, { ...M, levels: [0.2, 0.5, 0.75] }));
ok('música: se adapta a otra cantidad de pasos (monótona, termina en 75 %)', lv3.join() === '0.1,0.2,0.5,0.75');
const lv4 = [0, 1, 2, 3, 4].map(c => levelForCount(c, 4));
ok('música: si cambia el nº de pasos, interpola de 10 % a 75 %', lv4[0] === 0.1 && Math.abs(lv4[4] - 0.75) < 1e-9 && lv4.every((v, i) => i === 0 || v > lv4[i - 1]));
const mp = new MusicProgress(N);
ok('música: un mismo paso no sube el volumen dos veces', mp.validate('brazos') === true && mp.level === 0.2 && mp.validate('brazos') === false && mp.level === 0.2 && mp.count === 1);
mp.reset(); ok('música: reiniciar devuelve el 10 %', mp.level === 0.1 && mp.count === 0);
ok('música: silencio = 0 y volumen del usuario escala', effectiveGain(0.5, 1, true) === 0 && Math.abs(effectiveGain(0.5, 0.5) - 0.25) < 1e-9);

globalThis.window = globalThis;
const ramps = []; let playing = 0, plays = 0, ctxCount = 0;
class FakeParam { constructor() { this.value = 0; } cancelScheduledValues() {} setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v, t) { ramps.push(+v.toFixed(4)); this.value = v; } }
globalThis.AudioContext = class { constructor() { ctxCount++; this.currentTime = 0; this.state = 'running'; this.destination = {}; } createGain() { const g = { gain: new FakeParam(), connect() { return g; } }; return g; } createMediaElementSource() { return { connect: n => n }; } resume() { return Promise.resolve(); } close() { return Promise.resolve(); } };
globalThis.Audio = class { constructor() { this.currentTime = 0; this.loop = false; } addEventListener() {} setAttribute() {} removeAttribute() {} load() {} pause() { playing = 0; } play() { playing++; plays++; return Promise.resolve(); } };
const mc = new MusicController({ totalSteps: N });
await mc.start();
ok('música (audio simulado): arranca en bucle al 10 %', mc.status === 'playing' && ramps.at(-1) === 0.1 && mc.el.loop === true);
await mc.start(); ok('música: pulsar de nuevo no duplica la reproducción ni el contexto', plays === 1 && ctxCount === 1);
const before = ramps.length;
ok('música: un movimiento incorrecto (sin validar) no cambia el volumen', ramps.length === before && mc.gain.gain.value === 0.1);
ok('música: paso correcto sube a 20 % con rampa suave', mc.validate('brazos') && ramps.at(-1) === 0.2);
const n1 = ramps.length; ok('música: repetir el mismo paso no sube más', mc.validate('brazos') === false && ramps.length === n1);
['lados', 'hombros', 'salto', 'final'].forEach(id => mc.validate(id));
ok('música: tras los 5 pasos queda en 75 %', mc.gain.gain.value === 0.75 && Math.max(...ramps) < 1);
const mp2 = new MusicProgress(N); ['brazos', 'lados', 'salto', 'final'].forEach(id => mp2.validate(id));
ok('música: con 4 pasos correctos queda en 65 %, y «reto completado» lo lleva a 75 % (sin pasar el tope)', mp2.level === 0.65 && (mp2.complete(), mp2.level === 0.75) && mp2.level < 1);
mc.setMuted(true); ok('música: silenciar baja a 0', mc.gain.gain.value === 0);
mc.validate('x'); mc.setMuted(false); ok('música: reactivar vuelve al nivel de progreso', mc.gain.gain.value === 0.75);
mc.setUserVolume(0.4); ok('música: el volumen manual limita la progresión (75 % × 40 % = 30 %)', Math.abs(mc.gain.gain.value - 0.3) < 1e-9);
mc.setUserVolume(1); mc.pause(); ok('música: pausa y reanudación sin reiniciar la canción', mc.status === 'paused' && plays === 1);
await mc.resume(); ok('música: reanuda (misma reproducción)', mc.status === 'playing' && plays === 2 && mc.el.currentTime === 0);
await mc.fadeOut(0.01); ok('música: al finalizar baja gradualmente a 0 y se detiene', ramps.at(-1) === 0 && mc.status === 'paused' && playing === 0);
await mc.start(); ok('música: reiniciar el reto vuelve al 10 %', mc.status === 'playing' && ramps.at(-1) === 0.1 && mc.progress.count === 0);
mc.dispose(); ok('música: dispose libera audio y contexto', mc.el === null && mc.ctx === null && mc.status === 'idle');
const bad = new MusicController({ totalSteps: N }); let failed = false; bad.onFail = () => { failed = true; };
globalThis.Audio = class { constructor() { this.currentTime = 0; } addEventListener() {} setAttribute() {} removeAttribute() {} load() {} pause() {} play() { return Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); } };
await bad.start(); ok('música: si falla la reproducción avisa (ritmo de respaldo) sin romper', bad.status === 'error' && failed);
console.log(`\n${n} pruebas OK`);
