// Servidor estático mínimo, sin dependencias: `node server.js` → http://localhost:5173 (localhost permite usar la cámara).
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.json': 'application/json', '.data': 'application/octet-stream', '.binarypb': 'application/octet-stream', '.tflite': 'application/octet-stream' };
const root = __dirname, port = process.env.PORT || 5173;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root) || f.includes('node_modules')) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
}).listen(port, () => console.log(`Marimonda en http://localhost:${port}`));
