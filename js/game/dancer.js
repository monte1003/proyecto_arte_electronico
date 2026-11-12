/** Bailarín del tutorial: animación corporal programada (original) que se reproduce en tiempo real.
 *  poseAt() es función pura: dado el paso y el tiempo en pulsos devuelve la postura de referencia. */
import { C } from '../art/maskArt.js';

const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const TAU = Math.PI * 2;
// Ángulos medidos desde "hacia abajo": 0 = colgando, 90 = horizontal hacia afuera, 180 = arriba.
const REST = { cx: 0, cy: 0, lean: 0, shTilt: 0, arm: [12, 6], legSpread: 0.05, bend: 0 };

export function poseAt(stepId, b) {
  const p = { ...REST, arm: [...REST.arm] };
  const bounce = Math.abs(Math.sin(Math.PI * b)) * 0.008;
  p.cy = -bounce;
  const brazos = bb => { const up = ease(bb / 1.4); const a = 12 + up * 158; const w = Math.sin(TAU * bb) * 7 * up; p.arm = [a + w, a + w * 1.4]; };
  const lados = bb => { const x = Math.sin(TAU * bb / 4); p.cx = 0.13 * x; p.lean = 8 * x; p.arm = [95 + 14 * x, 150 + 18 * x]; p.legSpread = 0.1; };
  const hombros = bb => { const s = Math.sin(TAU * bb); p.shTilt = 15 * s; p.arm = [28 - 6 * s, 78 - 10 * s]; };
  const salto = bb => { const j = Math.abs(Math.sin(Math.PI * bb)); p.cy = -0.1 * j; p.bend = 1 - j; p.arm = [58 + 28 * j, 100 + 40 * j]; p.legSpread = 0.1 + 0.05 * (1 - j); };
  if (stepId === 'brazos') brazos(b);
  else if (stepId === 'lados') lados(b);
  else if (stepId === 'hombros') hombros(b);
  else if (stepId === 'salto') salto(b);
  else if (stepId === 'final') { if (b < 6) brazos(b); else if (b < 12) lados(b - 6); else hombros(b - 12); }
  return p;
}

/** Dibuja al bailarín en un canvas de tamaño (w,h). `head` es la imagen de la máscara. */
export function drawDancer(ctx, w, h, p, head, beatPulse = 0) {
  ctx.save(); ctx.clearRect(0, 0, w, h);
  const H = h, cx = w / 2 + p.cx * H, oy = p.cy * H;
  // Aro de luz al ritmo
  const g = ctx.createRadialGradient(w / 2, H * 0.5, H * 0.1, w / 2, H * 0.5, H * (0.55 + beatPulse * 0.08));
  g.addColorStop(0, 'rgba(255,214,0,.28)'); g.addColorStop(1, 'rgba(255,214,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, col, lw) => { ctx.strokeStyle = C.ink; ctx.lineWidth = lw + H * 0.014; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
  const lean = (p.lean * Math.PI) / 180;
  const hip = [cx, H * 0.66 + oy];
  const shMid = [cx + Math.sin(lean) * H * 0.3, H * 0.38 + oy + (1 - Math.cos(lean)) * H * 0.05];
  const tilt = (p.shTilt * Math.PI) / 180, half = H * 0.13;
  const sL = [shMid[0] - Math.cos(tilt) * half, shMid[1] - Math.sin(tilt) * half];
  const sR = [shMid[0] + Math.cos(tilt) * half, shMid[1] + Math.sin(tilt) * half];
  // Piernas
  const spread = p.legSpread * H, kneeY = H * 0.82 + oy * 0.4 + p.bend * H * 0.01;
  [-1, 1].forEach(s => { line([[hip[0] + s * H * 0.045, hip[1]], [cx + s * spread * 1.3, kneeY + p.bend * H * 0.01], [cx + s * spread * 1.6, H * 0.97]], s < 0 ? C.y : C.o, H * 0.06); ctx.fillStyle = C.p; ctx.beginPath(); ctx.ellipse(cx + s * spread * 1.7, H * 0.975, H * 0.05, H * 0.022, 0, 0, TAU); ctx.fill(); });
  // Torso (traje de colores con parches)
  ctx.beginPath(); ctx.moveTo(...sL); ctx.lineTo(...sR); ctx.lineTo(hip[0] + H * 0.09, hip[1]); ctx.lineTo(hip[0] - H * 0.09, hip[1]); ctx.closePath();
  ctx.fillStyle = C.p; ctx.fill(); ctx.lineWidth = H * 0.014; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.fillStyle = C.b; ctx.fillRect(shMid[0] - H * 0.02, shMid[1] + H * 0.06, H * 0.07, H * 0.06);
  ctx.fillStyle = C.g; ctx.fillRect(shMid[0] - H * 0.075, shMid[1] + H * 0.13, H * 0.055, H * 0.05);
  // Brazos
  const L1 = H * 0.17, L2 = H * 0.16;
  [[sL, -1, p.arm], [sR, 1, [p.arm[0], p.arm[1]]]].forEach(([s, sign, a]) => {
    const r1 = (a[0] * Math.PI) / 180, r2 = (a[1] * Math.PI) / 180;
    const el = [s[0] + sign * Math.sin(r1) * L1, s[1] + Math.cos(r1) * L1];
    const hand = [el[0] + sign * Math.sin(r2) * L2, el[1] + Math.cos(r2) * L2];
    line([s, el, hand], C.v, H * 0.045);
    ctx.fillStyle = C.g; ctx.beginPath(); ctx.arc(hand[0], hand[1], H * 0.03, 0, TAU); ctx.fill(); ctx.lineWidth = H * 0.01; ctx.strokeStyle = C.ink; ctx.stroke();
  });
  // Cabeza = máscara de la Marimonda
  const hs = H * 0.3, hx = shMid[0] + Math.sin(lean) * H * 0.04, hy = shMid[1] - H * 0.15;
  if (head) { ctx.translate(hx, hy); ctx.rotate(lean * 0.6 + tilt * 0.3); ctx.drawImage(head, -hs / 2, -hs * 0.43, hs, hs * (350 / 340)); }
  ctx.restore();
}
