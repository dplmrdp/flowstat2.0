import { G } from './state.js';
import { CATL, POSL } from './constants.js';

export function renderEquipos() {
  var el = document.getElementById('lista-equipos');
  if (!G.allE.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay equipos.</p>'; return; }
  el.innerHTML = '';
  G.allE.forEach(function(eq) {
    var n = G.allP.filter(function(p) { return p.equipo_id === eq.id; }).length;
    var c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div style="display:flex;align-items:flex-start;justify-content:space-between">'
      + '<div><div class="card-title">' + eq.nombre + '</div>'
      + '<div class="card-sub">' + (eq.temporada || '') + (eq.categoria ? ' · <span class="badge bcat">' + (CATL[eq.categoria] || eq.categoria) + '</span>' : '') + ' · ' + n + ' partido' + (n !== 1 ? 's' : '') + '</div></div></div>'
      + '<div class="card-actions">'
      + '<button class="abt a" data-a="eeq" data-id="' + eq.id + '">✏️ Editar</button>'
      + '<button class="abt g" data-a="npt" data-id="' + eq.id + '">⚡ Partido</button>'
      + '<button class="abt b" data-a="ehist" data-id="' + eq.id + '">📋 Historial</button>'
      + '</div>';
    el.appendChild(c);
  });
}

export function renderJugadoras() {
  var el = document.getElementById('lista-jugadoras');
  if (!G.allJ.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay jugadoras.</p>'; return; }
  el.innerHTML = '';
  G.allJ.forEach(function(j) {
    var c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="flex:1"><div class="card-title">' + j.nombre + (j.alias ? ' <span style="color:var(--muted);font-weight:400;font-size:12px">· ' + j.alias + '</span>' : '') + '</div>'
      + '<div class="card-sub">' + (j.anio_nacimiento ? j.anio_nacimiento + ' · ' : '') + (j.posicion ? '<span class="badge bpos" data-p="' + j.posicion + '">' + (POSL[j.posicion] || j.posicion) + '</span>' : '') + '</div></div>'
      + '<button class="abt a" data-a="ejug" data-id="' + j.id + '">✏️</button></div>';
    el.appendChild(c);
  });
}

export function renderPartidos() {
  var el = document.getElementById('lista-partidos');
  if (!G.allP.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay partidos.</p>'; return; }
  el.innerHTML = '';
  G.allP.forEach(function(p) {
    var eq = G.allE.find(function(e) { return e.id === p.equipo_id; });
    var fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
    var res = p.completado ? (p.sets_ganados + '–' + p.sets_perdidos) : 'En curso';
    var col = !p.completado ? 'var(--accent)' : p.sets_ganados > p.sets_perdidos ? 'var(--green)' : 'var(--accent2)';
    var c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="flex:1"><div class="card-title">vs ' + p.rival + '</div>'
      + '<div class="card-sub">' + (eq ? eq.nombre : '—') + ' · ' + fecha + (p.competicion ? ' · ' + p.competicion : '') + '</div></div>'
      + '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;color:' + col + '">' + res + '</div></div>'
      + '<div class="card-actions">'
      + '<button class="abt a" data-a="ept" data-id="' + p.id + '">✏️ Editar</button>'
      + (!p.completado ? '<button class="abt g" data-a="spt" data-id="' + p.id + '">⚡ Iniciar</button>' : '')
      + '<button class="abt b" data-a="stpt" data-id="' + p.id + '">📊 Stats</button>'
      + '</div>';
    el.appendChild(c);
  });
}

export function showEqHistory(eid) {
  document.querySelectorAll('.hub-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.hub-pane').forEach(function(p) { p.classList.remove('active'); });
  var t = document.querySelector('[data-tab="tab-partidos"]'); t.classList.add('active');
  document.getElementById('tab-partidos').classList.add('active');
  var el = document.getElementById('lista-partidos'); el.innerHTML = '';
  G.allP.filter(function(p) { return p.equipo_id === eid; }).forEach(function(p) {
    var fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
    var res = p.completado ? (p.sets_ganados + '–' + p.sets_perdidos) : 'En curso';
    var col = !p.completado ? 'var(--accent)' : p.sets_ganados > p.sets_perdidos ? 'var(--green)' : 'var(--accent2)';
    var c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><div class="card-title">vs ' + p.rival + '</div><div class="card-sub">' + fecha + (p.competicion ? ' · ' + p.competicion : '') + '</div></div><div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;color:' + col + '">' + res + '</div></div>';
    el.appendChild(c);
  });
  if (!el.children.length) el.innerHTML = '<p style="color:var(--muted);font-size:13px">Sin partidos para este equipo.</p>';
}
