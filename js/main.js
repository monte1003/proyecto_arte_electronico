/* Página: navegación, revelado al scroll, línea de tiempo, tarjetas, galería. El reto vive en js/game/. */
import { maskSVG, GALLERY } from './art/maskArt.js';
import { heroConfetti } from './ui/confetti.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const art = (el, label) => { el.innerHTML = `<div class="mk">${maskSVG('aria-hidden="true" focusable="false"')}</div>`; };
art($('#heroMask')); art($('#closingMask'));
heroConfetti($('#confetti'), reduced, (navigator.hardwareConcurrency || 4) <= 4);

/* Menú móvil */
const burger = $('#burger'), menu = $('#menu');
const setMenu = open => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); };
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });

/* Sección activa + volver arriba */
const links = $$('.menu a');
const secObs = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
$$('[data-section]').forEach(s => secObs.observe(s));
const toTop = $('#toTop');
addEventListener('scroll', () => { toTop.hidden = scrollY < 600; }, { passive: true });
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

/* Revelado */
const rev = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); } }), { threshold: 0.12 });
$$('.reveal').forEach(el => rev.observe(el));

/* Línea de tiempo */
$$('.tl-btn').forEach(btn => btn.addEventListener('click', () => {
  const open = btn.getAttribute('aria-expanded') === 'true';
  $$('.tl-btn').forEach(b => { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; });
  if (!open) { btn.setAttribute('aria-expanded', 'true'); $('#' + btn.getAttribute('aria-controls')).hidden = false; }
}));

/* Tarjetas giratorias */
$$('.flip').forEach(card => {
  const toggle = () => { const on = card.classList.toggle('on'); card.setAttribute('aria-pressed', on); };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
});

/* Galería + lightbox */
const gal = $('#gallery'), lb = $('#lightbox');
gal.innerHTML = GALLERY.map((it, i) => `<button class="g-item reveal" style="--bg:${it.bg}" data-i="${i}" aria-label="Ampliar: ${it.t}">${it.svg}<span>${it.t}</span></button>`).join('');
$$('.g-item', gal).forEach(el => rev.observe(el));
let cur = 0, opener = null;
function show(i) { cur = (i + GALLERY.length) % GALLERY.length; const it = GALLERY[cur]; const a = $('#lbArt'); a.style.background = it.bg; a.innerHTML = it.svg; $('#lbCap').innerHTML = `<b>${it.t}</b>${it.d}`; }
function openLb(i, el) { opener = el; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); }
function closeLb() { lb.hidden = true; document.body.style.overflow = ''; opener && opener.focus(); }
gal.addEventListener('click', e => { const b = e.target.closest('.g-item'); if (b) openLb(+b.dataset.i, b); });
$('#lbClose').addEventListener('click', closeLb); $('#lbPrev').addEventListener('click', () => show(cur - 1)); $('#lbNext').addEventListener('click', () => show(cur + 1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
  else if (e.key === 'Tab') { const f = $$('button', lb), a = document.activeElement; if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
});

/* Reto de baile (módulos separados) */
import('./game/challenge.js').then(m => new m.Challenge().init()).catch(err => {
  console.error('No se pudo iniciar el reto:', err);
  const m = $('#supportMsg'); if (m) { m.hidden = false; m.textContent = 'No se pudo iniciar el reto: ' + err.message; }
});
