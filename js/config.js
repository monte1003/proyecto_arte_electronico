/** Parámetros ajustables del reto (todo en un solo lugar). */
export const CONFIG = {
  bpm: 100,                 // tempo de la base rítmica original
  countdownBeats: 4,        // cuenta regresiva antes de bailar
  calibrationHoldMs: 1500,  // tiempo estable de pie para calibrar
  calibrationTimeoutMs: 25000,
  minVisibility: 0.5,       // visibilidad mínima de un punto del cuerpo
  shoulderWidthRange: [0.1, 0.65], // ancho de hombros válido (fracción del cuadro)
  points: { correct: 100, partial: 50, none: 0, sequenceBonus: 200 },
  fullThreshold: 1,         // progreso para movimiento "correcto"
  partialThreshold: 0.5,    // progreso para "parcialmente correcto"
  minValidatedSteps: 3,     // pasos CORRECTOS necesarios para desbloquear la máscara
  modelComplexity: 0,       // 0 = ligero (portátiles y celulares), 1 = completo
  maxPoseFps: 30,
  mouthOpenRatio: 0.05,     // apertura de boca / alto del rostro para activar el pito
  faceLostMs: 500,          // sin rostro durante este tiempo → ocultar filtro
  outOfViewStopMs: 10000,   // sección fuera de pantalla → apagar cámara
};
