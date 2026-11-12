/** Carga local de MediaPipe (sin CDN): los modelos viven en /vendor/mediapipe (copiados desde npm). */
const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) loaded.set(src, new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = () => { loaded.delete(src); rej(new Error('No se pudo cargar ' + src + '. ¿Está corriendo el servidor local (npm start)?')); };
    document.head.appendChild(s);
  }));
  return loaded.get(src);
}

/** Ejecuta una solución de MediaPipe sobre un <video>, con límite de fotogramas por segundo. */
export class SolutionRunner {
  constructor(maxFps = 30) { this.maxFps = maxFps; this.sol = null; this.running = false; this.busy = false; this.last = 0; this.frames = 0; this.raf = 0; }
  async _create() { throw new Error('no implementado'); }
  async init() { if (!this.sol) { this.sol = await this._create(); await this.sol.initialize(); } return this; }
  start(video, onFrame) {
    this.running = true; this.onFrame = onFrame;
    const loop = async () => {
      if (!this.running) return;
      const now = performance.now();
      if (!this.busy && video.readyState >= 2 && video.videoWidth && now - this.last >= 1000 / this.maxFps) {
        this.busy = true; this.last = now;
        try { await this.sol.send({ image: video }); this.frames++; } catch (e) { if (this.onError) this.onError(e); }
        this.busy = false;
      }
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  async dispose() { this.stop(); const s = this.sol; this.sol = null; try { s && (await s.close()); } catch { /* ya cerrado */ } }
}
const mirror = (lm, m) => (m ? lm.map(p => ({ ...p, x: 1 - p.x })) : lm);

export class PoseRunner extends SolutionRunner {
  constructor(opts = {}) { super(opts.maxFps || 30); this.complexity = opts.complexity ?? 0; this.mirrored = true; }
  async _create() {
    await loadScript('vendor/mediapipe/pose/pose.js');
    const p = new window.Pose({ locateFile: f => `vendor/mediapipe/pose/${f}` });
    p.setOptions({ modelComplexity: this.complexity, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    p.onResults(r => this.onFrame && this.onFrame(r.poseLandmarks ? mirror(r.poseLandmarks, this.mirrored) : null));
    return p;
  }
}
export class FaceRunner extends SolutionRunner {
  constructor(opts = {}) { super(opts.maxFps || 30); this.mirrored = true; }
  async _create() {
    await loadScript('vendor/mediapipe/face_mesh/face_mesh.js');
    const f = new window.FaceMesh({ locateFile: n => `vendor/mediapipe/face_mesh/${n}` });
    f.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    f.onResults(r => this.onFrame && this.onFrame(r.multiFaceLandmarks && r.multiFaceLandmarks[0] ? mirror(r.multiFaceLandmarks[0], this.mirrored) : null));
    return f;
  }
}
