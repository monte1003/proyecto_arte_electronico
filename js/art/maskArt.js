/** Ilustraciones SVG originales de la Marimonda (paleta del Carnaval). */
export const C = { y: '#FFD600', p: '#FF1493', b: '#005BFF', g: '#39D353', o: '#FF7900', v: '#8028DB', ink: '#1b0a3a' };
const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Máscara completa (para portada, bailarín y cierre). */
export const maskSVG = (extra = '') => `
<svg ${NS} viewBox="-20 0 340 350" ${extra}>
  <g class="ear ear-l"><ellipse cx="50" cy="140" rx="52" ry="78" fill="${C.o}" stroke="${C.ink}" stroke-width="6"/><ellipse cx="58" cy="140" rx="30" ry="52" fill="${C.p}"/></g>
  <g class="ear ear-r"><ellipse cx="250" cy="140" rx="52" ry="78" fill="${C.o}" stroke="${C.ink}" stroke-width="6"/><ellipse cx="242" cy="140" rx="30" ry="52" fill="${C.p}"/></g>
  <ellipse cx="150" cy="150" rx="104" ry="128" fill="${C.y}" stroke="${C.ink}" stroke-width="6"/>
  <path d="M62 82 Q150 40 238 82" fill="none" stroke="${C.ink}" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/>
  <rect x="196" y="150" width="46" height="40" rx="6" fill="${C.b}" transform="rotate(14 219 170)"/>
  <path d="M203 160 l30 8 M201 171 l30 8" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>
  <circle cx="108" cy="118" r="27" fill="#fff" stroke="${C.ink}" stroke-width="5"/><circle cx="192" cy="118" r="27" fill="#fff" stroke="${C.ink}" stroke-width="5"/>
  <circle class="pupil" cx="108" cy="118" r="11" fill="${C.ink}"/><circle class="pupil" cx="192" cy="118" r="11" fill="${C.ink}"/>
  <path d="M76 84 Q106 66 134 88 M166 88 Q194 66 224 84" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>
  <g class="nose"><path d="M138 138 C114 196 120 236 156 246 C190 252 196 224 172 218 C160 186 166 160 162 138 Z" fill="${C.b}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="146" cy="170" rx="5" ry="14" fill="#fff" opacity=".35"/></g>
  <ellipse class="mouth" cx="150" cy="262" rx="48" ry="9" fill="${C.ink}"/>
  <path d="M118 282 L182 282 L170 312 L150 346 L130 312 Z" fill="${C.p}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M118 282 L182 282 L150 300 Z" fill="${C.v}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

/* ===== Capas del FILTRO de realidad aumentada (lienzo 1000×1000, centro del rostro = (500,500),
   ancho del rostro ≈ 400 u. entre x=300 y x=700) ===== */
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

export const EYE = { l: [392, 455], r: [608, 455], rx: 64, ry: 48 };

export const FILTER_LAYERS = {
  hood: `<svg ${NS} viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs><pattern id="wv" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${C.y}"/><path d="M0 14h28M14 0v28" stroke="#E3B800" stroke-width="3"/><path d="M0 0l28 28" stroke="#F2CB00" stroke-width="1.5"/></pattern></defs>
  <g><circle cx="410" cy="150" r="44" fill="${C.p}" stroke="${C.ink}" stroke-width="8"/><circle cx="500" cy="118" r="48" fill="${C.g}" stroke="${C.ink}" stroke-width="8"/><circle cx="590" cy="150" r="44" fill="${C.o}" stroke="${C.ink}" stroke-width="8"/></g>
  <path d="M392 905 L338 985 L500 940 L662 985 L608 905 Z" fill="${C.p}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/><circle cx="500" cy="930" r="34" fill="${C.v}" stroke="${C.ink}" stroke-width="8"/>
  <path fill-rule="evenodd" fill="url(#wv)" stroke="${C.ink}" stroke-width="12" d="${ell(500, 480, 252, 345)}${ell(...EYE.l, EYE.rx, EYE.ry)}${ell(...EYE.r, EYE.rx, EYE.ry)}"/>
  <path d="M290 270 Q500 190 710 270" fill="none" stroke="${C.ink}" stroke-width="7" stroke-dasharray="20 14" stroke-linecap="round"/>
  <rect x="580" y="560" width="120" height="100" rx="14" fill="${C.b}" stroke="${C.ink}" stroke-width="7" transform="rotate(12 640 610)"/><path d="M600 585l75 20M596 618l75 20" stroke="#fff" stroke-width="7" stroke-dasharray="14 10" transform="rotate(12 640 610)"/>
  <rect x="290" y="300" width="96" height="80" rx="12" fill="${C.p}" stroke="${C.ink}" stroke-width="7" transform="rotate(-10 338 340)"/><path d="M304 326h68M304 350h68" stroke="#fff" stroke-width="6" stroke-dasharray="12 9" transform="rotate(-10 338 340)"/>
  <ellipse cx="392" cy="455" rx="${EYE.rx + 6}" ry="${EYE.ry + 6}" fill="none" stroke="${C.p}" stroke-width="16"/><ellipse cx="608" cy="455" rx="${EYE.rx + 6}" ry="${EYE.ry + 6}" fill="none" stroke="${C.p}" stroke-width="16"/>
  <ellipse cx="392" cy="455" rx="${EYE.rx + 14}" ry="${EYE.ry + 14}" fill="none" stroke="${C.ink}" stroke-width="7"/><ellipse cx="608" cy="455" rx="${EYE.rx + 14}" ry="${EYE.ry + 14}" fill="none" stroke="${C.ink}" stroke-width="7"/>
  <path d="M308 372 Q392 306 478 372 M522 372 Q608 306 692 372" fill="none" stroke="${C.v}" stroke-width="30" stroke-linecap="round"/>
  <path d="M308 372 Q392 306 478 372 M522 372 Q608 306 692 372" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round" opacity=".55"/>
</svg>`,
  earL: `<svg ${NS} viewBox="0 0 1000 1000" width="1000" height="1000"><g transform="rotate(-10 262 470)"><ellipse cx="150" cy="440" rx="130" ry="195" fill="${C.o}" stroke="${C.ink}" stroke-width="12"/><ellipse cx="170" cy="445" rx="76" ry="138" fill="${C.p}"/><path d="M110 330 Q150 290 195 330" fill="none" stroke="${C.y}" stroke-width="14" stroke-linecap="round"/></g></svg>`,
  earR: `<svg ${NS} viewBox="0 0 1000 1000" width="1000" height="1000"><g transform="rotate(10 738 470)"><ellipse cx="850" cy="440" rx="130" ry="195" fill="${C.o}" stroke="${C.ink}" stroke-width="12"/><ellipse cx="830" cy="445" rx="76" ry="138" fill="${C.p}"/><path d="M890 330 Q850 290 805 330" fill="none" stroke="${C.y}" stroke-width="14" stroke-linecap="round"/></g></svg>`,
  nose: `<svg ${NS} viewBox="0 0 1000 1000" width="1000" height="1000"><path d="M446 462 C410 640 428 830 500 912 C586 842 596 650 556 462 Z" fill="${C.b}" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/><ellipse cx="470" cy="620" rx="13" ry="70" fill="#fff" opacity=".35"/><ellipse cx="478" cy="850" rx="14" ry="20" fill="${C.ink}" opacity=".5"/><ellipse cx="524" cy="850" rx="14" ry="20" fill="${C.ink}" opacity=".5"/></svg>`,
};
// Puntos de giro (en el lienzo 1000×1000)
export const PIVOTS = { earL: [270, 470], earR: [730, 470], nose: [500, 470] };

/* ===== Ilustraciones de la galería ===== */
const earSVG = `<svg ${NS} viewBox="0 0 300 300"><ellipse cx="150" cy="150" rx="82" ry="122" fill="${C.o}" stroke="${C.ink}" stroke-width="8"/><ellipse cx="150" cy="156" rx="48" ry="84" fill="${C.p}"/><path d="M118 90 Q150 60 182 90" fill="none" stroke="${C.y}" stroke-width="8" stroke-linecap="round"/></svg>`;
const noseSVG = `<svg ${NS} viewBox="0 0 300 300"><path d="M130 30 C60 140 70 240 160 262 C240 276 252 200 190 190 C160 150 175 80 170 30 Z" fill="${C.b}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/><ellipse cx="128" cy="120" rx="10" ry="34" fill="#fff" opacity=".35"/></svg>`;
const fiqueSVG = `<svg ${NS} viewBox="0 0 300 300"><defs><pattern id="wv2" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#d9a85a"/><path d="M0 10h20M10 0v20" stroke="#a97830" stroke-width="3"/><path d="M0 0l20 20M20 0L0 20" stroke="#c18f43" stroke-width="1.5"/></pattern></defs><path d="M50 60 L110 30 Q150 56 190 30 L250 60 L226 118 L214 112 L214 262 L86 262 L86 112 L74 118 Z" fill="url(#wv2)" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/><rect x="118" y="150" width="64" height="52" rx="6" fill="${C.p}" stroke="${C.ink}" stroke-width="5" transform="rotate(-6 150 176)"/><path d="M126 164h48M126 180h48" stroke="#fff" stroke-width="4" stroke-dasharray="6 5" transform="rotate(-6 150 176)"/></svg>`;
const pitoSVG = `<svg ${NS} viewBox="0 0 300 300"><rect x="40" y="120" width="190" height="60" rx="30" fill="${C.y}" stroke="${C.ink}" stroke-width="8"/><rect x="190" y="100" width="48" height="40" rx="8" fill="${C.o}" stroke="${C.ink}" stroke-width="7"/><ellipse cx="110" cy="150" rx="16" ry="9" fill="${C.ink}"/><g stroke="${C.p}" stroke-width="9" stroke-linecap="round" fill="none"><path d="M254 70 q22 20 0 40"/><path d="M270 54 q36 34 0 72"/><path d="M80 80 q-20-16 -4-34"/></g><g fill="${C.g}"><circle cx="252" cy="220" r="10"/><circle cx="62" cy="230" r="8"/></g></svg>`;
const corbataSVG = `<svg ${NS} viewBox="0 0 300 300"><path d="M110 40 L190 40 L172 100 L150 270 L128 100 Z" fill="${C.p}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/><path d="M110 40 L190 40 L150 74 Z" fill="${C.v}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/><path d="M134 140 L166 128 M138 180 L164 168 M142 220 L160 212" stroke="${C.y}" stroke-width="7" stroke-linecap="round"/></svg>`;
const coloresSVG = `<svg ${NS} viewBox="0 0 300 300"><g stroke="${C.ink}" stroke-width="7"><rect x="30" y="30" width="110" height="110" rx="22" fill="${C.y}"/><rect x="160" y="30" width="110" height="110" rx="22" fill="${C.p}"/><rect x="30" y="160" width="110" height="110" rx="22" fill="${C.b}"/><rect x="160" y="160" width="110" height="110" rx="22" fill="${C.g}"/></g><circle cx="150" cy="150" r="44" fill="${C.o}" stroke="${C.ink}" stroke-width="7"/><circle cx="150" cy="150" r="18" fill="${C.v}"/></svg>`;

export const GALLERY = [
  { t: 'Orejas gigantes', d: 'Orejas gigantescas que imitaban las de un elefante o un primate.', bg: C.p, svg: earSVG },
  { t: 'Nariz larga', d: 'Larga nariz fálica: la exageración de los rasgos como herramienta para ridiculizar al político y a la élite.', bg: C.b, svg: noseSVG },
  { t: 'Costales de fique', d: 'Sacos viejos de tela (costales de fique), con ropa al revés o rota: la creatividad del reciclaje popular.', bg: '#8a5a1a', svg: fiqueSVG },
  { t: 'Pito pea-pea', d: 'Sonidos agudos producidos por un pito de millo o «pito de agua»; la sonoridad estridente del pito pea-pea.', bg: C.v, svg: pitoSVG },
  { t: 'La corbata', d: 'Uno de los rasgos exagerados (orejas gigantes, nariz fálica, corbata) para ridiculizar al político y a la élite.', bg: C.o, svg: corbataSVG },
  { t: 'Colores vivos', d: 'Con el paso de los años, el disfraz evolucionó hacia colores vivos y llamativos.', bg: '#1f9d3a', svg: coloresSVG },
];

/** Convierte un SVG en <img> listo para dibujar en canvas. */
export function svgToImage(svg) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = () => rej(new Error('No se pudo cargar la ilustración'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
