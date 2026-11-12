/** Estima posición, escala, rotación e inclinación de la cabeza a partir de los puntos de Face Mesh (468). Puro. */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const FACE_IDX = { top: 10, chin: 152, left: 234, right: 454, nose: 1, eyeA: 33, eyeB: 263, lipUp: 13, lipLow: 14 };

export function estimateFace(lm, W, H) {
  const P = i => ({ x: lm[i].x * W, y: lm[i].y * H });
  const a = P(FACE_IDX.eyeA), b = P(FACE_IDX.eyeB);
  const [e1, e2] = a.x < b.x ? [a, b] : [b, a];
  const roll = Math.atan2(e2.y - e1.y, e2.x - e1.x);
  const L = P(FACE_IDX.left), R = P(FACE_IDX.right), top = P(FACE_IDX.top), chin = P(FACE_IDX.chin), nose = P(FACE_IDX.nose);
  const faceW = Math.hypot(R.x - L.x, R.y - L.y), faceH = Math.hypot(chin.x - top.x, chin.y - top.y);
  const center = { x: (L.x + R.x + top.x + chin.x) / 4, y: (L.y + R.y + top.y + chin.y) / 4 };
  const midC = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 };
  const yaw = clamp((nose.x - midC.x) / (faceW / 2), -1, 1);           // giro izquierda/derecha
  const eyeMid = { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 };
  const pitch = (nose.y - eyeMid.y) / Math.max(1, chin.y - eyeMid.y);   // ≈0.5 de frente
  const mouth = Math.hypot(P(FACE_IDX.lipLow).x - P(FACE_IDX.lipUp).x, P(FACE_IDX.lipLow).y - P(FACE_IDX.lipUp).y) / Math.max(1, faceH);
  return { x: center.x, y: center.y, scale: faceW / 400, roll, yaw, pitch, faceW, faceH, mouth };
}
