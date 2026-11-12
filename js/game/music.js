/**
 * Música ambiental «cancion.mp3» con volumen progresivo.
 * Idea artística: cuanto más se acerca el participante a los movimientos propuestos, más presencia toma la música
 * y más lo envuelve una experiencia colectiva de ritmo y tradición. El volumen NO depende del tiempo: solo de aciertos reales.
 */
import { CONFIG } from '../config.js';

/** Volumen (0..1) tras `count` pasos correctos. Se adapta a la cantidad real de pasos del reto. */
export function levelForCount(count, totalSteps, cfg = CONFIG.music) {
  const clamp = v => Math.min(cfg.hardMax, Math.max(0, v));
  if (!(count > 0)) return clamp(cfg.start);
  const n = Math.min(count, totalSteps), L = cfg.levels;
  if (L.length === totalSteps) return clamp(L[n - 1]);
  return clamp(cfg.start + (L[L.length - 1] - cfg.start) * (n / totalSteps)); // interpolación lineal si cambian los pasos
}
/** Ganancia final que se aplica al audio: nivel de progreso × volumen elegido por el usuario (0 si está en silencio). */
export function effectiveGain(level, userVol = 1, muted = false, cfg = CONFIG.music) {
  if (muted) return 0;
  return Math.min(cfg.hardMax, Math.max(0, level * Math.min(1, Math.max(0, userVol))));
}

/** Progreso musical (lógica pura): cada paso validado sube el nivel una sola vez. */
export class MusicProgress {
  constructor(totalSteps, cfg = CONFIG.music) { this.total = totalSteps; this.cfg = cfg; this.reset(); }
  reset() { this.done = new Set(); this.level = levelForCount(0, this.total, this.cfg); }
  /** Devuelve true solo si el paso es nuevo (y por tanto el volumen sube). */
  validate(stepId) {
    if (this.done.has(stepId)) return false;
    this.done.add(stepId); this.level = levelForCount(this.done.size, this.total, this.cfg); return true;
  }
  /** Reto completado: el volumen llega al último nivel configurado (75 %), siempre por debajo del tope. */
  complete() { this.level = Math.min(this.cfg.hardMax, Math.max(this.level, ...this.cfg.levels)); }
  get count() { return this.done.size; }
}

export class MusicController {
  constructor({ src = CONFIG.music.src, totalSteps, cfg = CONFIG.music } = {}) {
    this.src = src; this.cfg = cfg; this.progress = new MusicProgress(totalSteps, cfg);
    this.status = 'idle'; // idle | loading | playing | paused | error
    this.muted = false; this.userVol = 1; this.ctx = null; this.gain = null; this.el = null; this.fadeTimer = null;
    this.onStatus = null; this.onLevel = null; this.onFail = null;
  }
  /** ¿Hay (o habrá) música sonando? Sirve para decidir si se usa el ritmo sintético de respaldo. */
  get wanted() { return this.status === 'loading' || this.status === 'playing' || this.status === 'paused'; }
  get level() { return this.progress.level; }
  get target() { return effectiveGain(this.progress.level, this.userVol, this.muted, this.cfg); }
  get currentGain() { return this.gain ? this.gain.gain.value : (this.el ? this.el.volume : 0); }

  _set(status, detail) { this.status = status; this.onStatus && this.onStatus(status, detail); }

  /** Crea el audio y el contexto (hay que llamarlo desde un gesto del usuario). No reproduce nada. */
  prime() {
    if (this.el) { this.ctx && this.ctx.state === 'suspended' && this.ctx.resume().catch(() => {}); return true; }
    try {
      const el = new Audio(); el.src = this.src; el.loop = true; el.preload = 'auto'; el.setAttribute('playsinline', '');
      el.addEventListener('error', () => this._fail('No se pudo cargar la canción.'));
      this.el = el;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { this.ctx = new AC(); this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.ctx.createMediaElementSource(el).connect(this.gain); this.gain.connect(this.ctx.destination); this.ctx.resume().catch(() => {}); }
      else el.volume = 0;
      return true;
    } catch (e) { this._fail('Tu navegador no pudo preparar el audio.'); return false; }
  }
  _fail(msg) {
    if (this.status === 'error') return;
    this._set('error', msg); this.onFail && this.onFail(msg);
  }
  _ramp(to, sec) {
    clearTimeout(this.fadeTimer);
    if (this.gain) {
      const g = this.gain.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + Math.max(0.02, sec));
    } else if (this.el) this.el.volume = to;
  }
  _applyTarget(sec) { this._ramp(this.target, sec); this.onLevel && this.onLevel(this.progress.level, this.target); }

  /** Inicia (o reinicia) la experiencia musical al 10 %. Idempotente: nunca crea dos reproducciones. */
  async start() {
    if (this.status === 'error') this._set('idle'); // reintento tras un fallo anterior
    if (!this.prime()) return false;
    this.progress.reset(); clearTimeout(this.fadeTimer); this.onLevel && this.onLevel(this.progress.level, 0);
    if (this.status === 'playing' || this.status === 'loading') { this._applyTarget(this.cfg.riseSec); return true; } // ya suena: solo vuelve al nivel inicial
    this._set('loading');
    this._ramp(0, 0.02); this.el.currentTime = 0;
    try { await this.ctx?.resume(); await this.el.play(); }
    catch (e) { this._fail(e && e.name === 'NotAllowedError' ? 'El navegador bloqueó el audio; pulsa el botón de sonido.' : 'No se pudo reproducir la canción.'); return false; }
    if (this.status === 'error') return false;
    this._set('playing'); this._applyTarget(this.cfg.fadeInSec); return true;
  }
  /** Un paso correcto nuevo sube el volumen; repetirlo o fallar no cambia nada. */
  validate(stepId) {
    if (!this.progress.validate(stepId)) return false;
    if (this.wanted) this._applyTarget(this.cfg.riseSec); else this.onLevel && this.onLevel(this.progress.level, this.target);
    return true;
  }
  complete() { this.progress.complete(); if (this.wanted) this._applyTarget(this.cfg.riseSec); }
  setMuted(m) { this.muted = !!m; if (this.wanted) this._applyTarget(0.25); }
  setUserVolume(v) { this.userVol = Math.min(1, Math.max(0, v)); if (this.wanted) this._applyTarget(0.15); }
  pause() {
    if (this.status !== 'playing') return; this._ramp(0, 0.25);
    this.fadeTimer = setTimeout(() => { this.el && this.el.pause(); }, 300); this._set('paused');
  }
  async resume() {
    if (this.status !== 'paused') return; clearTimeout(this.fadeTimer);
    try { await this.ctx?.resume(); await this.el.play(); } catch { return this._fail('No se pudo reanudar la canción.'); }
    this._set('playing'); this._applyTarget(0.6);
  }
  /** Reducción gradual hasta el silencio; después pausa la canción. Devuelve una promesa al terminar. */
  fadeOut(sec = this.cfg.fadeOutSec) {
    if (!this.wanted) return Promise.resolve();
    this._ramp(0, sec);
    return new Promise(res => { this.fadeTimer = setTimeout(() => { this.el && this.el.pause(); if (this.status !== 'error') this._set('paused'); res(); }, sec * 1000 + 60); });
  }
  /** Detiene todo y vuelve al volumen inicial. */
  stop() { clearTimeout(this.fadeTimer); if (this.el) { this.el.pause(); try { this.el.currentTime = 0; } catch {} } this._ramp(0, 0.02); this.progress.reset(); if (this.status !== 'error') this._set('idle'); }
  /** Libera audio y contexto (al apagar la cámara o cerrar la página). */
  dispose() {
    clearTimeout(this.fadeTimer);
    if (this.el) { this.el.pause(); this.el.removeAttribute('src'); this.el.load(); this.el = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; this.gain = null; }
    this.progress.reset(); this._set('idle');
  }
}
