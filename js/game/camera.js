/** Acceso real a la cámara con getUserMedia: permisos, errores claros, cambio de cámara y liberación de recursos. */
export function cameraSupport() {
  if (location.protocol === 'file:') return { ok: false, code: 'file', message: 'Abriste el archivo directamente. La cámara y los modelos necesitan un servidor local: ejecuta «npm start» en la carpeta del proyecto y abre http://localhost:5173.' };
  if (!window.isSecureContext) return { ok: false, code: 'insecure', message: 'El navegador solo permite la cámara en un contexto seguro (HTTPS o localhost).' };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok: false, code: 'unsupported', message: 'Este navegador no permite acceder a la cámara.' };
  return { ok: true };
}

export function describeCameraError(err) {
  const n = err && err.name;
  if (n === 'NotAllowedError' || n === 'PermissionDeniedError' || n === 'SecurityError') return { code: 'denied', message: 'No diste permiso para usar la cámara. Habilítala en el candado de la barra de direcciones y pulsa «Activar cámara» de nuevo.' };
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError') return { code: 'none', message: 'No se encontró ninguna cámara en este dispositivo.' };
  if (n === 'NotReadableError' || n === 'TrackStartError') return { code: 'busy', message: 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.' };
  if (n === 'OverconstrainedError') return { code: 'constraint', message: 'La cámara solicitada no está disponible en este dispositivo.' };
  return { code: 'error', message: 'No se pudo iniciar la cámara (' + (n || 'error desconocido') + ').' };
}

export class Camera {
  constructor(video) { this.video = video; this.stream = null; this.facing = 'user'; this.multiple = false; }
  get active() { return !!this.stream && this.stream.getTracks().some(t => t.readyState === 'live'); }
  /** Se refleja como un espejo solo con la cámara frontal. */
  get mirrored() { return this.facing === 'user'; }
  async start(facing = this.facing) {
    const sup = cameraSupport(); if (!sup.ok) throw Object.assign(new Error(sup.message), { cameraCode: sup.code });
    this.stop();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } } }); }
    catch (e) { const d = describeCameraError(e); throw Object.assign(new Error(d.message), { cameraCode: d.code }); }
    this.stream = stream;
    const s = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
    this.facing = s.facingMode ? (s.facingMode === 'environment' ? 'environment' : 'user') : facing;
    this.video.srcObject = stream; this.video.muted = true; this.video.playsInline = true;
    await this.video.play();
    if (!this.video.videoWidth) await new Promise(r => this.video.addEventListener('loadedmetadata', r, { once: true }));
    try { const dev = await navigator.mediaDevices.enumerateDevices(); this.multiple = dev.filter(d => d.kind === 'videoinput').length > 1; } catch { this.multiple = false; }
    stream.getVideoTracks()[0].addEventListener('ended', () => this.onended && this.onended());
    return { width: this.video.videoWidth, height: this.video.videoHeight, mirrored: this.mirrored };
  }
  async switch() { return this.start(this.facing === 'user' ? 'environment' : 'user'); }
  stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null; this.video.srcObject = null;
  }
}
