import { G } from './state.js';
import { POSL, CATL, posBadge } from './constants.js';
import { db, sbFetch } from './db.js';
import { showToast } from './nav.js';

// ── MODAL JUGADORA ────────────────────────────────────────────────────────────

var editJugId = null;

export function openModalJugadora(id) {
  editJugId = id || null;
  document.getElementById('mjug-title').textContent = id ? 'EDITAR JUGADORA' : 'NUEVA JUGADORA';
  document.getElementById('btn-del-jug').style.display = id ? 'flex' : 'none';
  var j = id ? G.allJ.find(function(x) { return x.id === id; }) : null;
  document.getElementById('jug-nombre').value = j ? j.nombre : '';
  document.getElementById('jug-alias').value = j ? (j.alias || '') : '';
  document.getElementById('jug-anio').value = j ? (j.anio_nacimiento || '') : '';
  document.getElementById('jug-dorsal').value = '';
  document.getElementById('jug-posicion').value = j ? (j.posicion || '') : '';
  document.getElementById('modal-jugadora').style.display = 'flex';
}

export function closeModalJugadora() { document.getElementById('modal-jugadora').style.display = 'none'; }

export async function saveJugadora() {
  var nombre = document.getElementById('jug-nombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio'); return; }
  var j = {
    id: editJugId || undefined,
    nombre: nombre,
    alias: document.getElementById('jug-alias').value.trim() || null,
    anio_nacimiento: parseInt(document.getElementById('jug-anio').value) || null,
    posicion: document.getElementById('jug-posicion').value || null
  };
  try {
    var res = await db.saveJugadora(j);
    var sv = Array.isArray(res) ? res[0] : res;
    if (editJugId) { var i = G.allJ.findIndex(function(x) { return x.id === editJugId; }); if (i >= 0) G.allJ[i] = Object.assign(G.allJ[i], j); }
    else { if (sv) G.allJ.push(sv); }
    window.renderJugadoras(); closeModalJugadora(); showToast('✅ Jugadora guardada');
  } catch(e) { showToast('Error: ' + e.message); }
}

export async function deleteJugadora() {
  if (!editJugId) return;
  if (!confirm('¿Eliminar esta jugadora?')) return;
  try {
    await db.deleteJugadora(editJugId);
    G.allJ = G.allJ.filter(function(x) { return x.id !== editJugId; });
    window.renderJugadoras(); closeModalJugadora(); showToast('Eliminada');
  } catch(e) { showToast('Error: ' + e.message); }
}

// ── MODAL EQUIPO ──────────────────────────────────────────────────────────────

var editEqId = null;
var plantTemp = [];

export function openModalEquipo(id) {
  editEqId = id || null;
  document.getElementById('meq-title').textContent = id ? 'EDITAR EQUIPO' : 'NUEVO EQUIPO';
  document.getElementById('btn-del-eq').style.display = id ? 'flex' : 'none';
  var eq = id ? G.allE.find(function(x) { return x.id === id; }) : null;
  document.getElementById('eq-nombre').value = eq ? eq.nombre : '';
  document.getElementById('eq-temporada').value = eq ? (eq.temporada || '') : '';
  document.getElementById('eq-categoria').value = eq ? (eq.categoria || '') : '';
  plantTemp = [];
  document.getElementById('modal-equipo').style.display = 'flex';
  if (id) loadPlant(id);
}

async function loadPlant(eid) {
  try {
    var rows = await db.getPlantilla(eid);
    plantTemp = (rows || []).map(function(r) { return { id: r.id, jugadora_id: r.jugadora_id, dorsal: r.dorsal || '', nombre: r.jugadora.nombre, alias: r.jugadora.alias, posicion: r.jugadora.posicion }; });
    renderPlant();
  } catch(e) { showToast('Error cargando plantilla'); }
}

function renderPlant() {
  var el = document.getElementById('eq-plantilla-list'); el.innerHTML = '';
  plantTemp.forEach(function(item, idx) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:7px 10px';
    var di = document.createElement('input'); di.type = 'text'; di.placeholder = '#'; di.value = item.dorsal || ''; di.maxLength = 3;
    di.style.cssText = "width:38px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--accent);font-family:'Bebas Neue',sans-serif;font-size:17px;text-align:center;padding:4px 2px;outline:none";
    di.addEventListener('change', function() { plantTemp[idx].dorsal = this.value.trim(); });
    var sp = document.createElement('span'); sp.style.cssText = 'flex:1;font-size:13px;font-weight:600'; sp.textContent = item.nombre + (item.alias ? ' (' + item.alias + ')' : '');
    var rm = document.createElement('button'); rm.className = 'rmv'; rm.textContent = '✕';
    rm.addEventListener('click', function() { plantTemp.splice(idx, 1); renderPlant(); });
    row.appendChild(di); row.appendChild(sp); row.appendChild(rm);
    el.appendChild(row);
  });
}

export function openAddToPlantilla() {
  var used = plantTemp.map(function(x) { return x.jugadora_id; });
  openPicker('Añadir a plantilla', G.allJ.filter(function(j) { return !used.includes(j.id); }), function(j) {
    plantTemp.push({ id: null, jugadora_id: j.id, dorsal: '', nombre: j.nombre, alias: j.alias, posicion: j.posicion });
    renderPlant(); closePicker();
  });
}

export function closeModalEquipo() { document.getElementById('modal-equipo').style.display = 'none'; }

export async function deleteEquipo() {
  if (!editEqId) return;
  if (!confirm('¿Eliminar este equipo? Se eliminarán también sus partidos asociados.')) return;
  try {
    await sbFetch('equipos?id=eq.' + editEqId, { method: 'DELETE', prefer: 'return=minimal' });
    G.allE = G.allE.filter(function(x) { return x.id !== editEqId; });
    G.allP = G.allP.filter(function(x) { return x.equipo_id !== editEqId; });
    window.renderEquipos(); window.renderPartidos(); closeModalEquipo(); showToast('Equipo eliminado');
  } catch(e) { showToast('Error: ' + e.message); }
}

export async function saveEquipo() {
  var nombre = document.getElementById('eq-nombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio'); return; }
  var eq = {
    id: editEqId || undefined,
    nombre: nombre,
    temporada: document.getElementById('eq-temporada').value.trim() || null,
    categoria: document.getElementById('eq-categoria').value || null
  };
  try {
    var res = await db.saveEquipo(eq);
    var sv = Array.isArray(res) ? res[0] : res;
    var eid = editEqId || (sv && sv.id);
    if (!eid) throw new Error('No ID');
    if (editEqId) { var i = G.allE.findIndex(function(x) { return x.id === editEqId; }); if (i >= 0) G.allE[i] = Object.assign(G.allE[i], eq); }
    else { if (sv) G.allE.push(sv); }
    for (var k = 0; k < plantTemp.length; k++) {
      var item = plantTemp[k];
      if (!item.id) await db.addPlantilla(eid, item.jugadora_id, item.dorsal || null);
      else await db.updateDorsal(item.id, item.dorsal || null);
    }
    window.renderEquipos(); closeModalEquipo(); showToast('✅ Equipo guardado');
  } catch(e) { showToast('Error: ' + e.message); }
}

// ── MODAL PARTIDO ─────────────────────────────────────────────────────────────

var editPtId = null;
var convTemp = [];

export function openModalPartido(id, presetEqId) {
  editPtId = id || null;
  document.getElementById('mpt-title').textContent = id ? 'EDITAR PARTIDO' : 'NUEVO PARTIDO';
  document.getElementById('btn-iniciar').style.display = id ? 'flex' : 'none';
  document.getElementById('btn-del-pt').style.display = id ? 'flex' : 'none';
  var today = new Date().toISOString().split('T')[0];
  var sel = document.getElementById('pt-equipo');
  sel.innerHTML = '<option value="">— Selecciona —</option>';
  G.allE.forEach(function(eq) { var o = document.createElement('option'); o.value = eq.id; o.textContent = eq.nombre; sel.appendChild(o); });
  if (id) {
    var p = G.allP.find(function(x) { return x.id === id; });
    if (p) {
      sel.value = p.equipo_id;
      document.getElementById('pt-rival').value = p.rival || '';
      document.getElementById('pt-competicion').value = p.competicion || '';
      document.getElementById('pt-formato').value = p.formato || 3;
      document.getElementById('pt-temporada').value = p.temporada || '';
      document.getElementById('pt-categoria').value = p.categoria || '';
      document.getElementById('pt-fecha').value = p.fecha ? p.fecha.split('T')[0] : today;
    }
    loadConvTemp(id);
  } else {
    if (presetEqId) { sel.value = presetEqId; onEquipoChange(); }
    else { document.getElementById('pt-rival').value = ''; document.getElementById('pt-competicion').value = ''; document.getElementById('pt-temporada').value = ''; document.getElementById('pt-categoria').value = ''; convTemp = []; renderConvTemp(); }
    document.getElementById('pt-fecha').value = today;
  }
  document.getElementById('modal-partido').style.display = 'flex';
}

export async function onEquipoChange() {
  var eid = document.getElementById('pt-equipo').value; if (!eid) return;
  var eq = G.allE.find(function(e) { return e.id === eid; });
  if (eq) {
    if (!document.getElementById('pt-temporada').value && eq.temporada) document.getElementById('pt-temporada').value = eq.temporada;
    if (!document.getElementById('pt-categoria').value && eq.categoria) document.getElementById('pt-categoria').value = eq.categoria;
  }
  convTemp = [];
  try {
    var rows = await db.getPlantilla(eid);
    convTemp = (rows || []).map(function(r) { return { id: null, jugadora_id: r.jugadora_id, dorsal: r.dorsal || '', nombre: r.jugadora.nombre, alias: r.jugadora.alias, posicion: r.jugadora.posicion }; });
    renderConvTemp();
  } catch(e) { showToast('Error'); }
}

async function loadConvTemp(pid) {
  try {
    var rows = await db.getConvocatoria(pid);
    convTemp = (rows || []).map(function(r) { return { id: r.id, jugadora_id: r.jugadora_id, dorsal: r.dorsal || '', nombre: r.jugadora.nombre, alias: r.jugadora.alias, posicion: r.jugadora.posicion }; });
    renderConvTemp();
  } catch(e) {}
}

function renderConvTemp() {
  var el = document.getElementById('pt-conv-list'); el.innerHTML = '';
  if (!convTemp.length) { el.innerHTML = '<p style="color:var(--muted);font-size:12px">Sin jugadoras. Selecciona equipo o añade.</p>'; return; }
  convTemp.forEach(function(item, idx) {
    var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:7px 10px';
    var di = document.createElement('input'); di.type = 'text'; di.placeholder = '#'; di.value = item.dorsal || ''; di.maxLength = 3;
    di.style.cssText = "width:38px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--accent);font-family:'Bebas Neue',sans-serif;font-size:17px;text-align:center;padding:4px 2px;outline:none";
    di.addEventListener('change', function() { convTemp[idx].dorsal = this.value.trim(); });
    var sp = document.createElement('span'); sp.style.cssText = 'flex:1;font-size:13px;font-weight:600'; sp.textContent = item.nombre + (item.alias ? ' (' + item.alias + ')' : '');
    if (item.posicion) { var b = document.createElement('span'); b.className = 'badge bpos'; b.dataset.p = item.posicion; b.style.fontSize = '9px'; b.textContent = POSL[item.posicion] || item.posicion; sp.appendChild(b); }
    var rm = document.createElement('button'); rm.className = 'rmv'; rm.textContent = '✕';
    rm.addEventListener('click', function() { convTemp.splice(idx, 1); renderConvTemp(); });
    row.appendChild(di); row.appendChild(sp); row.appendChild(rm); el.appendChild(row);
  });
}

export function openAddToConvocatoria() {
  var used = convTemp.map(function(x) { return x.jugadora_id; });
  openPicker('Añadir jugadora', G.allJ.filter(function(j) { return !used.includes(j.id); }), function(j) {
    convTemp.push({ id: null, jugadora_id: j.id, dorsal: '', nombre: j.nombre, alias: j.alias, posicion: j.posicion });
    renderConvTemp(); closePicker();
  });
}

export function closeModalPartido() { document.getElementById('modal-partido').style.display = 'none'; }

export async function savePartido(returnId) {
  var eid = document.getElementById('pt-equipo').value, rival = document.getElementById('pt-rival').value.trim();
  if (!eid) { showToast('Selecciona un equipo'); return null; }
  if (!rival) { showToast('Escribe el nombre del rival'); return null; }
  var fechaVal = document.getElementById('pt-fecha').value;
  var p = {
    id: editPtId || undefined, equipo_id: eid, rival: rival,
    formato: parseInt(document.getElementById('pt-formato').value),
    competicion: document.getElementById('pt-competicion').value.trim() || null,
    temporada: document.getElementById('pt-temporada').value.trim() || null,
    categoria: document.getElementById('pt-categoria').value || null,
    fecha: fechaVal || new Date().toISOString()
  };
  try {
    var res = await db.savePartido(p);
    var sv = Array.isArray(res) ? res[0] : res;
    var pid = editPtId || (sv && sv.id); if (!pid) throw new Error('No ID');
    if (convTemp.length) {
      var rows = convTemp.map(function(item) { return { partido_id: pid, jugadora_id: item.jugadora_id, dorsal: item.dorsal || null }; });
      await db.setConvocatoria(rows);
    }
    if (editPtId) { var i = G.allP.findIndex(function(x) { return x.id === editPtId; }); if (i >= 0) G.allP[i] = Object.assign(G.allP[i], p); }
    else { if (sv) G.allP.unshift(sv); else G.allP.unshift(Object.assign({ id: pid }, p)); }
    window.renderEquipos(); window.renderPartidos();
    if (!returnId) { closeModalPartido(); showToast('✅ Partido guardado'); }
    return pid;
  } catch(e) { showToast('Error: ' + e.message); return null; }
}

export async function deletePartido() {
  if (!editPtId) return;
  if (!confirm('¿Eliminar este partido y todas sus estadísticas?')) return;
  try {
    await sbFetch('partidos?id=eq.' + editPtId, { method: 'DELETE', prefer: 'return=minimal' });
    G.allP = G.allP.filter(function(x) { return x.id !== editPtId; });
    window.renderEquipos(); window.renderPartidos(); closeModalPartido(); showToast('Partido eliminado');
  } catch(e) { showToast('Error: ' + e.message); }
}

export async function iniciarPartidoDesdeModal() {
  var pid = await savePartido(true); if (!pid) return;
  editPtId = pid; closeModalPartido(); window.startById(pid);
}

// ── PICKER ────────────────────────────────────────────────────────────────────

var pickerCb = null;

export function openPicker(title, list, cb) {
  pickerCb = cb;
  document.getElementById('picker-title').textContent = title.toUpperCase();
  var el = document.getElementById('picker-body'); el.innerHTML = '';
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px 0"><div style="font-size:32px;margin-bottom:8px">✅</div><p style="color:var(--muted);font-size:14px;margin-bottom:16px">Todas las jugadoras ya están añadidas.</p><button class="big-btn sec" style="font-size:16px;padding:12px" onclick="closePicker()">CERRAR</button></div>';
    document.getElementById('modal-picker').style.display = 'flex'; return;
  }
  list.forEach(function(j) {
    var btn = document.createElement('div'); btn.style.cssText = 'display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:10px 12px;cursor:pointer';
    btn.innerHTML = '<div style="flex:1"><div style="font-weight:700;font-size:14px">' + j.nombre + (j.alias ? ' <span style="color:var(--muted);font-weight:400;font-size:12px">(' + j.alias + ')</span>' : '') + '</div><div style="font-size:11px;color:var(--muted)">' + (j.anio_nacimiento ? j.anio_nacimiento : '') + (j.posicion ? ' · ' + (POSL[j.posicion] || j.posicion) : '') + '</div></div><span style="color:var(--accent);font-size:18px">+</span>';
    btn.addEventListener('click', function() { if (pickerCb) pickerCb(j); });
    el.appendChild(btn);
  });
  document.getElementById('modal-picker').style.display = 'flex';
}

export function closePicker() { document.getElementById('modal-picker').style.display = 'none'; pickerCb = null; }
export { closePicker as closePickerModal };

// ── ROSTER EN PARTIDO ─────────────────────────────────────────────────────────

export function openRosterModal() {
  var el = document.getElementById('roster-match-body'); el.innerHTML = '';
  G.conv.forEach(function(j) {
    var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:8px 10px';
    row.innerHTML = '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:16px;color:var(--accent)">#' + (j.dorsal || '—') + '</span>'
      + '<span style="flex:1;font-size:13px;font-weight:600">' + (j.alias || j.nombre) + '</span>'
      + posBadge(j.posicion, true)
      + (G.state.onCourt.includes(j.jugadora_id) ? '<span style="font-size:9px;font-weight:700;color:var(--green)">PISTA</span>' : '');
    el.appendChild(row);
  });
  document.getElementById('modal-roster-match').style.display = 'flex';
}

export function closeRosterModal() { document.getElementById('modal-roster-match').style.display = 'none'; }

// ── SCORE EDIT ────────────────────────────────────────────────────────────────

var sesSide = null;

export function openScoreEdit(side) {
  sesSide = side;
  document.getElementById('score-edit-label').textContent = 'Puntos — ' + (side === 'us' ? G.state.teamName : G.state.rivalName);
  var inp = document.getElementById('score-edit-input'); inp.value = side === 'us' ? G.state.scoreUs : G.state.scoreThem;
  document.getElementById('modal-score-edit').style.display = 'flex';
  setTimeout(function() { inp.focus(); inp.select(); }, 80);
}

export function closeScoreEdit() { document.getElementById('modal-score-edit').style.display = 'none'; }

export function applyScoreEdit() {
  var v = parseInt(document.getElementById('score-edit-input').value);
  if (isNaN(v) || v < 0) { showToast('Valor no válido'); return; }
  if (sesSide === 'us') G.state.scoreUs = v; else G.state.scoreThem = v;
  window.updateScoreUI(); window.saveLocal(); closeScoreEdit(); showToast('✏️ Marcador actualizado');
}

export function setupScoreLongPress() {
  ['us', 'them'].forEach(function(s) {
    var el = document.getElementById('m-score-' + s), t = null;
    el.addEventListener('pointerdown', function() { t = setTimeout(function() { t = null; openScoreEdit(s); if (navigator.vibrate) navigator.vibrate(40); }, 600); });
    el.addEventListener('pointerup', function() { clearTimeout(t); });
    el.addEventListener('pointerleave', function() { clearTimeout(t); });
  });
}

// ── RECOVER ───────────────────────────────────────────────────────────────────

export function discardRecover() {
  document.getElementById('modal-recover').style.display = 'none';
  window.clearLocal();
}
