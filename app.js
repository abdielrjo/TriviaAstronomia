'use strict';
const $ = id => document.getElementById(id);
const K_DATOS = 'trivia.rondas', K_ACTUAL = 'trivia.actual', K_EXPORT = 'trivia.exportadas';
const COMODINES = ['50/50', 'cambiar', 'pista'];

// ---------- Almacenamiento ----------
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { alert('No se pudo guardar: ' + e.message); } };

// ---------- Estado ----------
let ronda = null;   // {id, fecha, hora, usados[], nivel, vistos[], intentos[]}
let q = null;       // pregunta actual
let pend = null;    // {comodines[], orden[], elegida}

const ahora = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` };
};
const barajar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const azar = a => a[Math.random() * a.length | 0];

function mostrar(id) {
  for (const s of document.querySelectorAll('section')) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

// ---------- Ronda ----------
function empezar() {
  ronda = { id: Date.now().toString(36), ...ahora(), usados: [], nivel: 1, vistos: [], intentos: [] };
  pend = { comodines: [] };
  cargarPregunta();
}

function cargarPregunta() {
  const opciones = BANCO[ronda.nivel - 1].filter(v => !ronda.vistos.includes(v.id));
  q = azar(opciones);
  ronda.vistos.push(q.id);
  pend.orden = barajar(['A', 'B', 'C', 'D']);
  pend.elegida = null;
  pintarPregunta();
  guardarActual();
}

function pintarPregunta() {
  $('t-nivel').textContent = `Nivel ${ronda.nivel} de 7`;
  $('t-enunciado').textContent = q.t;
  $('t-pista').hidden = true;
  const cont = $('opciones');
  cont.replaceChildren(...pend.orden.map(l => {
    const b = document.createElement('button');
    b.textContent = q.o[l];
    b.dataset.l = l;
    return b;
  }));
  $('b-confirmar').hidden = false;
  $('b-confirmar').disabled = true;
  $('b-seguir').hidden = true;
  $('b-abandonar').hidden = false;
  pintarComodines(false);
  mostrar('s-pregunta');
}

function pintarComodines(respondida) {
  for (const b of $('comodines').children) {
    const c = b.dataset.c, usado = ronda.usados.includes(c);
    b.classList.toggle('gastado', usado);
    b.disabled = respondida || usado || ronda.usados.length >= 2;
  }
}

function usarComodin(c) {
  if (ronda.usados.length >= 2 || ronda.usados.includes(c)) return;
  ronda.usados.push(c);
  pend.comodines.push(c);
  if (c === '50/50') {
    for (const b of $('opciones').children) if (b.dataset.l !== 'A' && b.dataset.l !== q.d) b.hidden = true;
    if (pend.elegida && pend.elegida !== 'A' && pend.elegida !== q.d) elegir(null);
  } else if (c === 'pista') {
    $('t-pista').textContent = 'Pista: ' + q.p;
    $('t-pista').hidden = false;
  } else if (c === 'cambiar') {
    return cargarPregunta();
  }
  pintarComodines(false);
  guardarActual();
}

function elegir(l) {
  pend.elegida = l;
  for (const b of $('opciones').children) b.classList.toggle('elegida', b.dataset.l === l);
  $('b-confirmar').disabled = !l;
}

function confirmar() {
  const acierto = pend.elegida === 'A';
  ronda.intentos.push({ nivel: ronda.nivel, variante: q.id, comodines: pend.comodines.join('+'), elegida: pend.elegida, acierto: acierto ? 1 : 0 });
  for (const b of $('opciones').children) {
    b.disabled = true;
    if (b.dataset.l === 'A') b.classList.add('correcta');
    else if (b.dataset.l === pend.elegida) b.classList.add('incorrecta');
  }
  pintarComodines(true);
  $('b-confirmar').hidden = true;
  $('b-abandonar').hidden = true;
  const s = $('b-seguir');
  s.hidden = false;
  s.textContent = !acierto ? 'Terminar ronda' : ronda.nivel === 7 ? 'Terminar: juego completado' : `Pasar al nivel ${ronda.nivel + 1}`;
  s.onclick = !acierto ? () => terminar('fallo') : ronda.nivel === 7 ? () => terminar('completada') : siguienteNivel;
  guardarActual();
}

function siguienteNivel() {
  ronda.nivel++;
  pend = { comodines: [] };
  cargarPregunta();
}

function cerrarRonda(r, resultado) {
  const alcanzado = r.intentos.filter(i => i.acierto).length;
  const registro = {
    id: r.id, fecha: r.fecha, hora: r.hora,
    sacrificado: r.usados.length === 2 ? COMODINES.find(c => !r.usados.includes(c)) : '',
    nivel_alcanzado: alcanzado, resultado, intentos: r.intentos
  };
  const datos = leer(K_DATOS, []);
  datos.push(registro);
  escribir(K_DATOS, datos);
  localStorage.removeItem(K_ACTUAL);
  return registro;
}

function terminar(resultado) {
  const r = cerrarRonda(ronda, resultado);
  $('t-final').textContent = r.nivel_alcanzado === 7 ? 'Completó los 7 niveles'
    : r.nivel_alcanzado === 0 ? 'No superó el nivel 1' : `Superó el nivel ${r.nivel_alcanzado}`;
  ronda = null;
  mostrar('s-fin');
}

function abandonar() {
  if (confirm('¿Abandonar la ronda? Se guardará como abandonada.')) terminar('abandonada');
}

// Ronda en curso guardada por si la página se recarga o se cierra.
const guardarActual = () => escribir(K_ACTUAL, ronda);

// ---------- Datos y exportación ----------
function csv(filas) {
  const esc = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return '\ufeff' + filas.map(f => f.map(esc).join(',')).join('\r\n');
}

async function exportar() {
  const datos = leer(K_DATOS, []);
  if (!datos.length) return alert('No hay rondas guardadas.');
  const sello = ahora().fecha;
  const rondas = csv([['ronda', 'fecha', 'hora', 'comodin_sacrificado', 'nivel_alcanzado', 'resultado'],
    ...datos.map(r => [r.id, r.fecha, r.hora, r.sacrificado, r.nivel_alcanzado, r.resultado])]);
  const intentos = csv([['ronda', 'nivel', 'variante', 'comodines', 'opcion_elegida', 'acierto'],
    ...datos.flatMap(r => r.intentos.map(i => [r.id, i.nivel, i.variante, i.comodines, i.elegida, i.acierto]))]);
  const archivos = [new File([rondas], `rondas_${sello}.csv`, { type: 'text/csv' }),
    new File([intentos], `intentos_${sello}.csv`, { type: 'text/csv' })];
  try {
    if (navigator.canShare?.({ files: archivos })) await navigator.share({ files: archivos });
    else for (const f of archivos) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    escribir(K_EXPORT, datos.length);
    pintarAjustes();
  } catch (e) { if (e.name !== 'AbortError') alert('No se pudo exportar: ' + e.message); }
}

function pintarAjustes() {
  const n = leer(K_DATOS, []).length, sin = n - leer(K_EXPORT, 0);
  $('t-resumen').textContent = `${n} rondas guardadas, ${sin} sin exportar.`;
  mostrar('s-ajustes');
}

function borrar() {
  if (!confirm('¿Borrar todas las rondas guardadas? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(K_DATOS); localStorage.removeItem(K_EXPORT);
  pintarAjustes();
}

function pintarInicio() {
  const n = leer(K_DATOS, []).length, sin = n - leer(K_EXPORT, 0);
  $('t-guardadas').textContent = sin > 0 ? `${sin} rondas sin exportar.` : '';
  mostrar('s-inicio');
}

// ---------- Eventos ----------
$('b-empezar').onclick = empezar;
$('b-nueva').onclick = pintarInicio;
$('b-ir-ajustes').onclick = pintarAjustes;
$('b-volver').onclick = pintarInicio;
$('b-exportar').onclick = exportar;
$('b-borrar').onclick = borrar;
$('b-confirmar').onclick = confirmar;
$('b-abandonar').onclick = abandonar;
$('opciones').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) elegir(b.dataset.l); };
$('comodines').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) usarComodin(b.dataset.c); };

// Una ronda que quedó a medias (recarga o cierre) se guarda como interrumpida.
const previa = leer(K_ACTUAL, null);
if (previa) {
  const ult = previa.intentos.at(-1);
  const res = ult && !ult.acierto ? 'fallo' : previa.intentos.length === 7 ? 'completada' : 'interrumpida';
  cerrarRonda(previa, res);
}
pintarInicio();
