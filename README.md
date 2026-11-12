# La Máscara de la Marimonda — Reto «Baila como una Marimonda»

Proyecto colectivo (Isac Monterrosa, Oscar Velez, Juliana Martelo y Gabriela Pineda).
Sitio estático (HTML + CSS + JavaScript en módulos ES) con visión artificial **local** en el navegador:
MediaPipe Pose (cuerpo) y MediaPipe Face Mesh (rostro). No usa CDN ni envía video a ningún servidor.

## Cómo ejecutarlo (necesario para la cámara)
```
npm start            # abre http://localhost:5173
```
La cámara solo funciona en HTTPS o localhost, por eso **no** basta con abrir index.html con doble clic.
Si falta la carpeta `vendor/`, ejecuta antes `npm install` (copia los modelos de MediaPipe desde npm).

Otros comandos: `npm test` (lógica de evaluación y puntuación), `npm run build` (genera `dist/`).

## Estructura
- `index.html`, `css/styles.css` — contenido del Word y diseño carnavalero
- `js/main.js` — navegación, línea de tiempo, tarjetas, galería
- `js/config.js` — parámetros del reto (BPM, umbrales, puntos, pasos necesarios)
- `js/game/camera.js` — getUserMedia, permisos, cambio de cámara, liberación
- `js/game/solutions.js` — carga local y ejecución de MediaPipe Pose / Face Mesh
- `js/game/poseMath.js`, `steps.js` — métricas corporales y detector de cada paso
- `js/game/scoring.js`, `state.js` — puntuación (una vez por paso) y estados del reto
- `js/game/dancer.js`, `audio.js` — tutorial animado y ritmo sintético originales
- `js/game/faceMath.js`, `maskFilter.js` — pose de la cabeza y filtro AR de la máscara
- `js/game/photo.js`, `challenge.js` — foto local y orquestación
- `vendor/mediapipe/` — modelos y WASM locales · `test/` — pruebas · `server.js` — servidor estático
