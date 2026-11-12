/** Captura local (Canvas) de la cámara + máscara + marco festivo. Nada se sube a ningún servidor. */
const COLS = ['#FFD600', '#FF1493', '#005BFF', '#39D353', '#FF7900', '#8028DB'];
export function composePhoto({ video, overlay, mirrored, points }) {
  const W = video.videoWidth, H = video.videoHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  ctx.save(); if (mirrored) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.drawImage(video, 0, 0, W, H); ctx.restore();
  ctx.drawImage(overlay, 0, 0, W, H);
  // marco carnavalero
  const b = Math.round(W * 0.025);
  const g = ctx.createLinearGradient(0, 0, W, 0); COLS.forEach((col, i) => g.addColorStop(i / 5, col));
  ctx.strokeStyle = g; ctx.lineWidth = b * 2; ctx.strokeRect(0, 0, W, H);
  // confeti determinista
  for (let i = 0; i < 46; i++) { const x = (i * 97 % 100) / 100 * W, y = (i * 53 % 100) / 100 * H * 0.8; ctx.save(); ctx.translate(x, y); ctx.rotate(i); ctx.fillStyle = COLS[i % 6]; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  // cinta inferior
  const bh = Math.round(H * 0.13); ctx.fillStyle = 'rgba(27,10,58,.88)'; ctx.fillRect(b, H - bh - b, W - 2 * b, bh);
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFD600'; ctx.font = `900 ${Math.round(bh * 0.4)}px "Arial Black", Impact, sans-serif`;
  ctx.fillText('¡YA SOY UNA MARIMONDA!', W / 2, H - b - bh * 0.5);
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(bh * 0.25)}px "Trebuchet MS", sans-serif`;
  ctx.fillText(`Reto Marimonda · ${points} puntos · Carnaval de Barranquilla`, W / 2, H - b - bh * 0.15);
  return c;
}
export const canvasToBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
