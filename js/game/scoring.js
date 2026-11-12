/** Puntuación: solo cuenta movimientos realmente validados; cada paso se puntúa UNA vez. */
import { CONFIG } from '../config.js';

export function gradeOf(progress, cfg = CONFIG) {
  if (progress >= cfg.fullThreshold) return 'correct';
  if (progress >= cfg.partialThreshold) return 'partial';
  return 'none';
}

export class Score {
  constructor(totalSteps, cfg = CONFIG) { this.cfg = cfg; this.total = totalSteps; this.reset(); }
  reset() { this.points = 0; this.results = []; this.bonus = 0; }
  has(stepId) { return this.results.some(r => r.id === stepId); }
  /** Registra el resultado de un paso. Devuelve {grade, pts} o null si ya estaba contabilizado. */
  finishStep(stepId, progress) {
    if (this.has(stepId)) return null; // evita contar dos veces el mismo movimiento
    const grade = gradeOf(progress, this.cfg);
    const pts = this.cfg.points[grade];
    this.points += pts;
    this.results.push({ id: stepId, progress, grade, pts });
    return { grade, pts };
  }
  get validated() { return this.results.filter(r => r.grade === 'correct').length; }
  get done() { return this.results.length >= this.total; }
  get passed() { return this.validated >= this.cfg.minValidatedSteps; }
  /** Precisión aproximada: promedio del progreso de los pasos evaluados (0..100). */
  get accuracy() {
    if (!this.results.length) return 0;
    return Math.round((this.results.reduce((s, r) => s + Math.min(1, r.progress), 0) / this.total) * 100);
  }
  /** Al terminar: bonificación por secuencia completada (solo si se supera el umbral). */
  finalize() {
    if (this.done && this.passed && !this.bonus) { this.bonus = this.cfg.points.sequenceBonus; this.points += this.bonus; }
    return this.points;
  }
}
