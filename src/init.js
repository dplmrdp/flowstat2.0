import { G } from './state.js';
import { META, mkState } from './constants.js';
import { db } from './db.js';
import { loadLocal, saveLocal, clearLocal } from './storage.js';
import { showToast, switchScreen } from './nav.js';

export async function init() {
  document.querySelectorAll('.hub-tab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.hub-tab').forEach(function(x) { x.classList.remove('active'); });
      document.querySelectorAll('.hub-pane').forEach(function(x) { x.classList.remove('active'); });
      t.classList.add('active');
      document.getElementById(t.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('lista-equipos').addEventListener('click', function(ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'eeq')   window.openModalEquipo(b.dataset.id);
    if (b.dataset.a === 'npt')   window.openModalPartido(null, b.dataset.id);
    if (b.dataset.a === 'ehist') window.showEqHistory(b.dataset.id);
  });
  document.getElementById('lista-jugadoras').addEventListener('click', function(ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'ejug') window.openModalJugadora(b.dataset.id);
  });
  document.getElementById('lista-partidos').addEventListener('click', function(ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'ept')  window.openModalPartido(b.dataset.id);
    if (b.dataset.a === 'spt')  startById(b.dataset.id);
    if (b.dataset.a === 'stpt') window.viewStatsPartido(b.dataset.id);
  });

  window.setupScoreLongPress();

  var saved = loadLocal();
  if (saved && saved.state && saved.state.partidoId && !saved.state.matchOver) {
    var s = saved.state;
    document.getElementById('recover-body').textContent = s.teamName + ' vs ' + s.rivalName + ' · Sets ' + s.setsUs + '-' + s.setsThem + ' · Set ' + s.setNum;
    document.getElementById('modal-recover').style.display = 'flex';
  }
  await loadData();
}

export async function loadData() {
  try {
    var r = await Promise.all([db.getJugadoras(), db.getEquipos(), db.getPartidos()]);
    G.allJ = r[0] || []; G.allE = r[1] || []; G.allP = r[2] || [];
    window.renderEquipos(); window.renderJugadoras(); window.renderPartidos();
  } catch(e) {
    showToast('Error: ' + e.message);
    ['lista-equipos', 'lista-jugadoras', 'lista-partidos'].forEach(function(id) {
      document.getElementById(id).innerHTML = '<div style="color:var(--accent2);font-size:13px;padding:20px">' + e.message + '<br><button class="abt a" onclick="loadData()" style="margin-top:10px">🔄 Reintentar</button></div>';
    });
  }
}

export async function startById(pid) {
  var p = G.allP.find(function(x) { return x.id === pid; }); if (!p) { showToast('Partido no encontrado'); return; }
  var eq = G.allE.find(function(x) { return x.id === p.equipo_id; });
  try {
    var rows = await db.getConvocatoria(pid);
    G.conv = (rows || []).map(function(r) { return { pj_id: r.id, jugadora_id: r.jugadora_id, dorsal: r.dorsal || '', nombre: r.jugadora.nombre, alias: r.jugadora.alias || r.jugadora.nombre, posicion: r.jugadora.posicion }; });
    if (!G.conv.length) { showToast('Sin jugadoras convocadas'); return; }
    G.state = mkState();
    G.state.partidoId = pid; G.state.teamName = eq ? eq.nombre : 'Equipo'; G.state.rivalName = p.rival; G.state.format = p.formato || 3;
    G.state.categoria = p.categoria || null;
    G.state.onCourt = [];
    G.state.statsBySet[1] = {}; G.state.teamStatsBySet[1] = { rival_error: 0, general_error: 0 };
    G.conv.forEach(function(j) {
      G.state.stats[j.jugadora_id] = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0, serve_count: 0 };
      G.state.statsBySet[1][j.jugadora_id] = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0, serve_count: 0 };
    });
    saveLocal(); window.updateMatchUI(); switchScreen('match');
    window.openSubForLineup();
  } catch(e) { showToast('Error al iniciar: ' + e.message); }
}

export async function recoverMatch() {
  document.getElementById('modal-recover').style.display = 'none';
  var saved = loadLocal(); if (!saved) return;
  G.state = saved.state; G.conv = saved.conv || [];
  if (!G.allJ.length) try { G.allJ = await db.getJugadoras() || []; } catch(e) {}
  Object.keys(META).forEach(function(k) {
    var el = document.getElementById('cnt-' + k); if (!el) return;
    if (META[k].team) el.textContent = (G.state.teamStatsBySet[G.state.setNum] || {})[k] || 0;
    else { var sn = G.state.setNum; el.textContent = G.conv.reduce(function(s, j) { return s + ((G.state.statsBySet[sn] || {})[j.jugadora_id] || {})[k] || 0; }, 0); }
  });
  window.updateMatchUI(); switchScreen('match');
}
