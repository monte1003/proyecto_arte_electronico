// Copia los modelos y el WASM de MediaPipe (instalados con npm) a vendor/, para que la página funcione sin CDN.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const jobs = [
  ['@mediapipe/pose', 'pose', f => !/heavy/.test(f) && !/\.(md|json|ts)$/.test(f)],
  ['@mediapipe/face_mesh', 'face_mesh', f => !/\.(md|json|ts)$/.test(f)],
];
for (const [pkg, dir, keep] of jobs) {
  const src = path.join(root, 'node_modules', pkg), dst = path.join(root, 'vendor', 'mediapipe', dir);
  if (!fs.existsSync(src)) { console.error(`Falta ${pkg}. Ejecuta «npm install» primero.`); process.exit(1); }
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) if (keep(f)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log('vendor/mediapipe/' + dir + ' listo');
}
