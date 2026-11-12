/** Máquina de estados del reto: preparación, calibración, ejecución, pausa, resultado y finalización. */
export const STATES = ['preparing', 'calibrating', 'playing', 'paused', 'result', 'finished'];
const ALLOWED = {
  preparing: ['calibrating'],
  calibrating: ['playing', 'preparing'],
  playing: ['paused', 'result', 'preparing'],
  paused: ['playing', 'preparing'],
  result: ['finished', 'calibrating', 'preparing'],
  finished: ['calibrating', 'preparing'],
};
export class ChallengeState {
  constructor() { this.value = 'preparing'; this.listeners = []; }
  on(fn) { this.listeners.push(fn); }
  is(...s) { return s.includes(this.value); }
  go(next) {
    if (next === this.value) return true;
    if (!ALLOWED[this.value].includes(next)) { console.warn(`Transición inválida ${this.value} → ${next}`); return false; }
    const prev = this.value; this.value = next;
    this.listeners.forEach(fn => fn(next, prev));
    return true;
  }
}
