/** Orquestador del reto «Baila como una Marimonda»: une cámara, pose, tutorial, puntuación, rostro y foto. */
import { CONFIG } from '../config.js';
import { STEPS, createDetector } from './steps.js';
import { bodyFrame } from './poseMath.js';
import { Score } from './scoring.js';
import { ChallengeState } from './state.js';
import { Camera, cameraSupport } from './camera.js';
import { PoseRunner, FaceRunner } from './solutions.js';
import { GameAudio } from './audio.js';
import { poseAt, drawDancer } from './dancer.js';
import { MaskFilter } from './maskFilter.js';
import { composePhoto, canvasToBlob, downloadBlob } from './photo.js';
import { ConfettiCanvas } from '../ui/confetti.js';
import { maskSVG, svgToImage } from '../art/maskArt.js';

const $ = id => document.getElementById(id);
const TEST = new URLSearchParams(location.search).has('test'); // permite inyectar landmarks sintéticos en pruebas automáticas
const SKELETON = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

export class Challenge {
  constructor() {
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lowPower = (navigator.hardwareConcurrency || 4) <= 4;
    this.state = new ChallengeState(); this.score = new Score(STEPS.length);
    this.audio = new GameAudio(); this.filter = new MaskFilter();
    this.spb = 60000 / CONFIG.bpm;
    this.starts = []; let acc = 0; STEPS.forEach(s => { this.starts.push(acc); acc += s.beats; }); this.totalBeats = acc;
    this.recent = null; this.baseline = null; this.detector = null; this.idx = -1; this.awarded = false;
    this.clockMs = 0; this.lastTick = performance.now(); this.beat = -CONFIG.countdownBeats; this.lastPoseAt = 0;
    this.learning = false; this.camReady = false; this.faceLm = null; this.lastBeatInt = null; this.hintText = '';
    this.photoBlob = null; this.outTimer = null;
  }

  async init() {
    this.game = $('game'); this.video = $('video'); this.overlay = $('overlay'); this.octx = this.overlay.getContext('2d');
    this.tut = $('tutCanvas'); this.tctx = this.tut.getContext('2d');
    this.camera = new Camera(this.video); this.camera.onended = () => this.stopCamera('La cámara se desconectó.');
    this.fx = new ConfettiCanvas($('fx'), this.reduced);
    this.head = await svgToImage(maskSVG()).catch(() => null);
    this.buildChips(); this.bind();
    this.state.on((s, p) => this.onState(s, p)); this.onState('preparing', null);
    const sup = cameraSupport();
    if (!sup.ok) { $('supportMsg').hidden = false; $('supportMsg').textContent = sup.message; $('btnCam').disabled = true; }
    this.resizeTut(); addEventListener('resize', () => this.resizeTut());
    this.tick(performance.now());
    if (TEST) window.__reto = { pose: lm => this.onPose(lm, performance.now(), true), face: lm => this.onFace(lm, true), challenge: this, score: this.score };
  }

  bind() {
    $('btnCam').onclick = () => this.enableCamera();
    $('btnBegin').onclick = () => this.begin(false);
    $('btnLearn').onclick = () => this.begin(true);
    $('btnPause').onclick = () => this.togglePause();
    $('btnResume').onclick = () => this.togglePause();
    $('btnRestart').onclick = () => this.restart();
    $('btnRetry').onclick = () => this.restart();
    $('btnToStart').onclick = () => { this.learning = false; this.state.go('preparing'); };
    $('btnStop').onclick = () => this.stopCamera('Cámara desactivada. Pulsa «Activar cámara» cuando quieras volver a bailar.');
    $('btnSwitch').onclick = () => this.switchCamera();
    $('btnMute').onclick = e => { const m = !this.audio.muted; this.audio.setMuted(m); e.currentTarget.setAttribute('aria-pressed', m); e.currentTarget.textContent = m ? '🔇 Sin sonido' : '🔊 Sonido'; };
    $('btnPhoto').onclick = () => this.takePhoto();
    $('btnDownload').onclick = () => this.downloadPhoto();
    $('btnAgain').onclick = () => this.restart();
    $('btnHome').onclick = () => { this.stopCamera('Cámara apagada. ¡Gracias por bailar!'); document.getElementById('inicio').scrollIntoView({ behavior: this.reduced ? 'auto' : 'smooth' }); };
    addEventListener('pagehide', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state.is('playing')) this.togglePause(); });
    new IntersectionObserver(es => {
      if (es[0].isIntersecting) { clearTimeout(this.outTimer); return; }
      if (this.state.is('playing')) this.togglePause();
      clearTimeout(this.outTimer);
      if (this.camera.active) this.outTimer = setTimeout(() => this.stopCamera('Apagué la cámara porque saliste de esta sección.'), CONFIG.outOfViewStopMs);
    }, { threshold: 0.05 }).observe(this.game);
  }

  buildChips() {
    $('stepChips').innerHTML = STEPS.map((s, i) => `<li data-i="${i}"><b>${i + 1}</b><span>${s.name.replace(/[¡!]/g, '')}</span></li>`).join('');
  }

  /* ---------- Estado de la interfaz ---------- */
  onState(s) {
    this.game.dataset.state = s;
    const show = (id, v) => { $(id).hidden = !v; };
    show('startCard', s === 'preparing'); show('calCard', s === 'calibrating'); show('pauseCard', s === 'paused');
    show('resultCard', s === 'result'); show('celebrate', s === 'finished');
    $('btnPause').disabled = !this.state.is('playing', 'paused'); $('btnPause').textContent = s === 'paused' ? '▶ Reanudar' : '⏸ Pausa';
    $('btnRestart').disabled = this.state.is('preparing');
    if (s !== 'playing') $('countCard').hidden = true;
    if (s !== 'finished') { this.fx.stop(); this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height); }
    $('btnSwitch').hidden = !(this.camera && this.camera.active && this.camera.multiple);
    $('btnStop').hidden = !(this.camera && this.camera.active);
    $('stateLabel').textContent = { preparing: 'Preparación', calibrating: 'Calibración', playing: 'En juego', paused: 'Pausa', result: 'Resultado', finished: '¡Máscara desbloqueada!' }[s];
  }
  setHint(text, tone = '') { if (text === this.hintText && !tone) return; this.hintText = text; const h = $('hint'); h.textContent = text; h.className = 'hint ' + tone; }
  floater(text, cls = '') { const f = document.createElement('span'); f.className = 'floater ' + cls; f.textContent = text; $('floaters').appendChild(f); setTimeout(() => f.remove(), 1400); }
  camStatus(t) { $('camStatus').textContent = t; }

  /* ---------- Cámara y modelo ---------- */
  async enableCamera() {
    this.audio._ensure();
    $('btnCam').disabled = true; this.camStatus('Pidiendo permiso para usar la cámara…');
    try {
      const info = await this.camera.start('user');
      this.applyVideoGeometry(info);
    } catch (e) { this.camStatus(e.message); $('btnCam').disabled = false; $('btnCam').textContent = 'Reintentar cámara'; $('btnLearn').hidden = false; return; }
    this.camStatus('Cargando el modelo de detección corporal (se ejecuta en tu navegador)…');
    try { await this.ensurePose(); }
    catch (e) { console.error(e); this.camStatus('No se pudo cargar el modelo de detección: ' + e.message + ' Puedes usar el modo aprendizaje, que NO evalúa tus movimientos.'); $('btnLearn').hidden = false; $('btnCam').disabled = false; return; }
    this.camReady = true; this.camStatus('¡Listo! Párate a un par de pasos de la cámara para que se vean tus hombros y brazos.');
    $('btnBegin').hidden = false; $('btnCam').hidden = true; $('btnBegin').focus();
    this.onState(this.state.value);
  }
  applyVideoGeometry(info) {
    const w = info.width || this.video.videoWidth, h = info.height || this.video.videoHeight;
    this.overlay.width = w; this.overlay.height = h;
    const cam = $('cam'); cam.style.setProperty('--ar', `${w} / ${h}`); cam.style.setProperty('--arn', (w / h).toFixed(4));
    cam.classList.toggle('mirror', info.mirrored); cam.classList.add('live');
    if (this.pose) this.pose.mirrored = info.mirrored; if (this.face) this.face.mirrored = info.mirrored;
  }
  async ensurePose() {
    if (!this.pose) { this.pose = new PoseRunner({ complexity: CONFIG.modelComplexity, maxFps: this.lowPower ? 20 : CONFIG.maxPoseFps }); this.pose.onError = e => console.warn('Pose:', e); }
    this.pose.mirrored = this.camera.mirrored;
    await this.pose.init(); this.pose.start(this.video, lm => this.onPose(lm, performance.now(), false));
  }
  async switchCamera() {
    try { const info = await this.camera.switch(); this.applyVideoGeometry(info); this.onState(this.state.value); }
    catch (e) { this.floater(e.message, 'bad'); }
  }
  stopCamera(msg) {
    this.releaseAll(); this.camReady = false; this.learning = false;
    $('cam').classList.remove('live'); $('btnBegin').hidden = true; $('btnCam').hidden = false; $('btnCam').disabled = false; $('btnCam').textContent = 'Activar cámara';
    if (!this.state.is('preparing')) this.state.go('preparing'); else this.onState('preparing');
    this.camStatus(msg || '');
  }
  releaseAll() {
    clearTimeout(this.outTimer); this.audio.stop();
    this.pose && this.pose.dispose(); this.pose = null; this.face && this.face.dispose(); this.face = null;
    this.camera && this.camera.stop();
  }

  /* ---------- Flujo del reto ---------- */
  begin(learning) {
    this.learning = learning; this.score.reset(); this.idx = -1; this.detector = null; this.clockMs = 0; this.lastBeatInt = null; this.photoBlob = null;
    this.paintHud(); STEPS.forEach((_, i) => this.chip(i, ''));
    if (learning) {
      this.state.go('calibrating'); this.state.go('playing'); this.startClock();
      this.setHint('Modo aprendizaje: aquí NO se evalúan tus movimientos.', 'info'); return;
    }
    if (!this.camReady) return;
    this.calStart = null; this.calBegan = performance.now(); this.state.go('calibrating');
    $('calBar').style.width = '0%'; $('calText').textContent = 'Párate frente a la cámara: se deben ver tus hombros y brazos.';
  }
  async restart() {
    if (this.learning) { this.state.go('preparing'); return this.begin(true); }
    if (!this.camera.active) return this.stopCamera('Activa la cámara para volver a bailar.');
    this.audio.stop(); this.face && (await this.face.dispose()); this.face = null; this.filter.visible = false;
    if (!this.state.is('preparing')) this.state.go(this.state.is('result', 'finished') ? 'calibrating' : 'preparing');
    try { if (!this.pose || !this.pose.running) await this.ensurePose(); } catch (e) { return this.stopCamera('No se pudo reiniciar el modelo: ' + e.message); }
    this.state.value === 'preparing' ? this.begin(false) : this.begin(false);
  }
  startClock() { this.clockMs = 0; this.beat = -CONFIG.countdownBeats; this.audio.start(CONFIG.bpm); this.lastTick = performance.now(); $('countCard').hidden = false; }
  togglePause() {
    if (this.state.is('playing')) { this.state.go('paused'); this.audio.stop(); }
    else if (this.state.is('paused')) { this.state.go('playing'); this.lastTick = performance.now(); this.audio.start(CONFIG.bpm, Math.max(0, Math.floor(this.beat + CONFIG.countdownBeats))); }
  }

  calibrate(lm, now) {
    const f = bodyFrame(lm, CONFIG.minVisibility); let msg = 'No te veo: muestra tus hombros y brazos.';
    let ok = false;
    if (f) {
      const [lo, hi] = CONFIG.shoulderWidthRange;
      if (f.w < lo) msg = 'Acércate un poco a la cámara.'; else if (f.w > hi) msg = 'Aléjate un poco de la cámara.';
      else if (f.mid.x < 0.2 || f.mid.x > 0.8) msg = 'Colócate en el centro del cuadro.';
      else { ok = true; msg = 'Perfecto, quédate quieto…'; }
    }
    if (ok) { if (this.calStart === null || this.calStart === undefined) this.calStart = now; } else this.calStart = null;
    const p = ok ? Math.min(1, (now - this.calStart) / CONFIG.calibrationHoldMs) : 0;
    $('calBar').style.width = Math.round(p * 100) + '%'; $('calText').textContent = msg;
    if (p >= 1) { this.baseline = { ...this.recent }; this.state.go('playing'); this.startClock(); this.setHint('¡Prepárate!', 'info'); }
    else if (now - this.calBegan > CONFIG.calibrationTimeoutMs) { this.state.go('preparing'); this.camStatus('No pude calibrar: asegúrate de que se vean tus hombros y vuelve a intentarlo.'); }
  }

  onPose(lm, now, fromHook = false) {
    if (TEST && !fromHook) return; // en pruebas automáticas solo cuentan los fotogramas inyectados
    if (!this.state.is('calibrating', 'playing', 'paused', 'preparing')) return;
    const f = lm ? bodyFrame(lm, CONFIG.minVisibility) : null;
    if (f) { this.lastPoseAt = now; const a = 0.2; this.recent = this.recent ? { x: this.recent.x + (f.mid.x - this.recent.x) * a, y: this.recent.y + (f.mid.y - this.recent.y) * a, w: this.recent.w + (f.w - this.recent.w) * a } : { x: f.mid.x, y: f.mid.y, w: f.w }; }
    this.drawSkeleton(lm);
    if (this.state.is('calibrating')) return this.calibrate(lm, now);
    if (!this.state.is('playing') || this.learning || this.beat < 0 || !this.detector) return;
    const r = this.detector.update(lm, now, { minVisibility: CONFIG.minVisibility });
    this.setHint(r.hint, r.seen ? (r.progress >= 1 ? 'good' : '') : 'warn');
    $('stepProg').style.width = Math.round(r.progress * 100) + '%';
    if (r.progress >= CONFIG.fullThreshold && !this.awarded) this.award();
  }

  /* ---------- Paso a paso ---------- */
  chip(i, cls) { const li = $('stepChips').children[i]; if (li) li.className = cls; }
  openStep(i) {
    this.idx = i; this.awarded = false; const st = STEPS[i];
    this.detector = this.learning ? null : createDetector(st.id, { ...(this.recent || this.baseline || { x: .5, y: .4, w: .2 }) });
    $('stepName').textContent = st.name; $('stepCue').textContent = st.cue; $('stepProg').style.width = '0%';
    this.chip(i, 'now'); const nx = STEPS[i + 1]; $('nextText').textContent = nx ? `Siguiente: ${nx.name}` : 'Último paso: ¡da todo!';
    this.audio.sfx('count');
  }
  award() {
    const st = STEPS[this.idx]; const res = this.score.finishStep(st.id, this.detector.progress); if (!res) return;
    this.awarded = true; this.chip(this.idx, 'done'); this.paintHud();
    this.floater(`+${res.pts} ⭐`, 'good'); this.audio.sfx('ok'); this.fx.size(); this.fx.burst(this.lowPower ? 30 : 60);
  }
  closeStep() {
    if (this.idx < 0 || this.learning) return;
    if (!this.awarded) {
      const res = this.score.finishStep(STEPS[this.idx].id, this.detector ? this.detector.progress : 0);
      if (res) {
        this.chip(this.idx, res.grade === 'partial' ? 'partial' : res.grade === 'correct' ? 'done' : 'miss');
        this.floater(res.grade === 'partial' ? '+50 · casi' : res.grade === 'none' ? 'Sin reconocer' : `+${res.pts}`, res.grade === 'none' ? 'bad' : 'ok');
        this.audio.sfx(res.grade === 'partial' ? 'partial' : 'miss');
      }
    }
    this.paintHud();
  }
  paintHud() {
    $('score').textContent = String(this.score.points); $('acc').textContent = this.learning ? '—' : this.score.accuracy + '%';
    const done = this.score.results.length, cur = this.detector && !this.awarded && this.idx >= 0 ? Math.min(1, this.detector.progress) : 0;
    const pct = Math.round(((done + cur) / STEPS.length) * 100); $('progBar').style.width = pct + '%'; $('progWrap').setAttribute('aria-valuenow', pct);
    $('validated').textContent = `${this.score.validated} · meta ${CONFIG.minValidatedSteps}`;
  }

  advance(now) {
    this.beat = this.clockMs / this.spb - CONFIG.countdownBeats;
    if (this.beat < 0) {
      const k = Math.ceil(-this.beat); if (k !== this.lastBeatInt) { this.lastBeatInt = k; $('countNum').textContent = k > 3 ? 'Prepárate' : String(k); if (k <= 3) this.audio.sfx('count'); }
      $('stepName').textContent = 'Mira el tutorial 👀'; $('stepCue').textContent = 'Empieza en unos pulsos…'; return;
    }
    if (!$('countCard').hidden) { $('countCard').hidden = true; this.audio.sfx('go'); }
    if (this.beat >= this.totalBeats) return this.finishGame();
    let i = 0; while (i + 1 < STEPS.length && this.starts[i + 1] <= this.beat) i++;
    if (i !== this.idx) { this.closeStep(); this.openStep(i); }
    const sb = this.beat - this.starts[i], left = Math.max(0, (STEPS[i].beats - sb) * this.spb / 1000);
    $('timerVal').textContent = left.toFixed(1) + ' s';
    if (!this.learning && this.detector) { if (now - this.lastPoseAt > 700 && !TEST) this.setHint('No te veo bien: muestra hombros y brazos', 'warn'); this.paintHud(); }
    const bi = Math.floor(this.beat); if (bi !== this.lastBeatInt) { this.lastBeatInt = bi; this.pulse(bi); }
  }
  pulse(bi) { const bs = $('beatBar').children; for (let k = 0; k < bs.length; k++) bs[k].classList.toggle('on', k === bi % 4); }

  finishGame() {
    this.closeStep(); this.audio.stop(); this.idx = -1; this.detector = null;
    this.state.go('result');
    if (this.learning) { $('resTitle').textContent = '¡Terminaste el recorrido!'; $('resText').textContent = 'Este fue el modo aprendizaje: no se evaluaron tus movimientos ni se otorgaron puntos. Activa la cámara para jugar de verdad y desbloquear tu máscara.'; $('resStats').hidden = true; $('btnRetry').hidden = false; $('btnRetry').textContent = 'Repetir el tutorial'; return; }
    $('resStats').hidden = false; const pts = this.score.finalize(); this.paintHud();
    $('resPoints').textContent = pts; $('resAcc').textContent = this.score.accuracy + '%'; $('resSteps').textContent = `${this.score.validated} de ${STEPS.length}`;
    $('resList').innerHTML = this.score.results.map(r => `<li class="${r.grade}"><span>${STEPS.find(s => s.id === r.id).name}</span><b>${r.pts ? '+' + r.pts : '0'}</b></li>`).join('');
    if (this.score.passed) {
      $('resTitle').textContent = '¡Reto completado!'; $('resText').textContent = `Validaste ${this.score.validated} movimientos (se necesitaban ${CONFIG.minValidatedSteps}). Bonificación de secuencia: +${this.score.bonus}. ¡Prepárate para tu máscara!`;
      this.audio.sfx('win'); this.fx.size(); this.fx.burst(120); $('btnRetry').hidden = true;
      setTimeout(() => this.unlock(), 2800);
    } else {
      $('resTitle').textContent = '¡Casi lo logras!'; $('resText').textContent = `Validaste ${this.score.validated} movimientos y se necesitan ${CONFIG.minValidatedSteps} para desbloquear la máscara. ¡Inténtalo otra vez, marimondero!`; $('btnRetry').hidden = false; $('btnRetry').textContent = 'Intentar de nuevo';
    }
  }

  /* ---------- Recompensa: filtro AR ---------- */
  async unlock() {
    if (!this.state.is('result') || !this.score.passed) return; // la máscara solo se desbloquea superando el reto
    this.state.go('finished'); this.hintText = ''; $('hint').textContent = ''; $('hint').className = 'hint';
    $('winPts').textContent = this.score.points; $('faceStatus').textContent = 'Cargando seguimiento facial…';
    this.pose && (await this.pose.dispose()); this.pose = null;
    this.fx.size(); this.fx.setRain(true); this.fx.burst(100);
    try {
      await this.filter.load();
      if (!this.face) { this.face = new FaceRunner({ maxFps: this.lowPower ? 20 : 30 }); }
      this.face.mirrored = this.camera.mirrored; await this.face.init();
      this.filter.onMouthOpen = () => this.audio.pito();
      this.face.start(this.video, lm => this.onFace(lm, false));
      $('faceStatus').textContent = 'Mírate a la cámara: abre la boca para hacer sonar el pito 🎺';
    } catch (e) { console.error(e); $('faceStatus').textContent = 'No se pudo iniciar el seguimiento facial: ' + e.message; }
  }
  onFace(lm, fromHook = false) {
    if (TEST && !fromHook) return; if (!this.state.is('finished')) return;
    this.faceLm = lm; this.faceAt = performance.now();
  }
  drawFilter(now) {
    const W = this.overlay.width, H = this.overlay.height; if (!W) return;
    const has = this.filter.update(this.faceLm && now - this.faceAt < 200 ? this.faceLm : null, W, H, now);
    this.filter.draw(this.octx, W, H, now);
    if (this.face || TEST) $('faceStatus').classList.toggle('warn', !has);
    if (!has && (this.face || TEST) && this.filter.img) $('faceStatus').textContent = 'No te veo la cara: regresa al encuadre.';
    else if (has) $('faceStatus').textContent = 'Abre la boca para hacer sonar el pito 🎺';
  }
  async takePhoto() {
    const c = composePhoto({ video: this.video, overlay: this.overlay, mirrored: this.camera.mirrored, points: this.score.points });
    this.audio.sfx('shutter'); this.photoBlob = await canvasToBlob(c);
    const prev = $('photoPrev'); prev.src = c.toDataURL('image/jpeg', 0.8); $('photoWrap').hidden = false; $('btnDownload').disabled = false;
    $('cam').classList.add('flash'); setTimeout(() => $('cam').classList.remove('flash'), 300);
  }
  downloadPhoto() { if (this.photoBlob) downloadBlob(this.photoBlob, 'mi-mascara-marimonda.png'); }

  /* ---------- Dibujo ---------- */
  drawSkeleton(lm) {
    const ctx = this.octx, W = this.overlay.width, H = this.overlay.height; ctx.clearRect(0, 0, W, H);
    if (!lm || this.state.is('finished')) return;
    const lw = Math.max(3, W / 110);
    const ok = i => lm[i] && (lm[i].visibility === undefined || lm[i].visibility > 0.4);
    ctx.lineCap = 'round';
    SKELETON.forEach(([a, b]) => { if (!ok(a) || !ok(b)) return; ctx.beginPath(); ctx.moveTo(lm[a].x * W, lm[a].y * H); ctx.lineTo(lm[b].x * W, lm[b].y * H); ctx.strokeStyle = '#1b0a3a'; ctx.lineWidth = lw + 4; ctx.stroke(); ctx.strokeStyle = '#39D353'; ctx.lineWidth = lw; ctx.stroke(); });
    [11, 12, 13, 14, 15, 16].forEach(i => { if (!ok(i)) return; ctx.beginPath(); ctx.arc(lm[i].x * W, lm[i].y * H, lw * (i > 14 ? 1.8 : 1.2), 0, 6.283); ctx.fillStyle = i > 14 ? '#FFD600' : '#FF1493'; ctx.fill(); ctx.strokeStyle = '#1b0a3a'; ctx.lineWidth = 2; ctx.stroke(); });
  }
  resizeTut() { const d = Math.min(devicePixelRatio || 1, 2), c = this.tut; c.width = Math.max(10, c.clientWidth * d); c.height = Math.max(10, c.clientHeight * d); }
  drawTutorial(now) {
    const c = this.tut; if (!c.width || (this.reduced && !this.state.is('playing', 'paused'))) return;
    let step = STEPS[Math.max(0, this.idx)].id, b;
    if (this.state.is('playing', 'paused') && this.beat >= 0 && this.idx >= 0) b = this.beat - this.starts[this.idx];
    else { step = 'idle'; b = now / this.spb; }
    const pulse = 1 - ((now / this.spb) % 1);
    drawDancer(this.tctx, c.width, c.height, poseAt(step, b), this.head, pulse);
    if (this.state.is('playing') && this.beat < 0) { this.tctx.fillStyle = 'rgba(27,10,58,.0)'; }
  }
  tick(now) {
    requestAnimationFrame(t => this.tick(t));
    const dt = Math.min(400, now - this.lastTick); this.lastTick = now;
    if (this.state.is('playing')) { this.clockMs += dt; this.advance(now); }
    if (this.state.is('paused')) { /* reloj detenido */ }
    if (this.state.is('finished')) this.drawFilter(now);
    this.drawTutorial(now);
  }
}
