// "Compilación" de producción: copia el sitio estático a dist/ (HTML/CSS/JS sin transpilar + vendor).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const e of ['index.html', 'css', 'js', 'vendor']) fs.cpSync(path.join(root, e), path.join(out, e), { recursive: true });
console.log('Producción lista en dist/ (sírvela con cualquier servidor estático).');
