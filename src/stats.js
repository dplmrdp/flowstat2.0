import { G } from './state.js';
import { posBadge } from './constants.js';
import { db, sbFetch } from './db.js';
import { switchScreen } from './nav.js';

var consultaMode = 'partido';

export function openConsulta(mode) {
  consultaMode = mode || 'partido';
  document.getElementById('consulta-export-btn').style.display = 'none';
  setConsultaMode(consultaMode);
  switchScreen('consulta');
}

export function setConsultaMode(mode) {
  consultaMode = mode;
  document.getElementById('cmode-partido').className  = 'abt' + (mode === 'partido' ? ' b' : '');
  document.getElementById('cmode-jugadora').className = 'abt' + (mode === 'jugadora' ? ' b' : '');
  document.getElementById('consulta-sub').textContent = mode === 'partido' ? 'Por partido' : 'Por jugadora';
  renderConsultaFilters();
}

export function renderConsultaFilters() {
  var el = document.getElementById('consulta-filters');
  var body = document.getElementById('consulta-body');
  body.innerHTML = '';
  if (consultaMode === 'partido') {
    var html = '<div class="ig"><label>Selecciona partido</label>'
      + '<select class="field" id="c-partido-sel" onchange="onConsultaPartidoChange()">'
      + '<option value="">— Elige un partido —</option>';
    G.allP.forEach(function(p) {
      var eq = G.allE.find(function(e) { return e.id === p.equipo_id; });
      var fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
      html += '<option value="' + p.id + '">' + (eq ? eq.nombre : '?') + ' vs ' + p.rival + ' · ' + fecha + '</option>';
    });
    html += '</select></div>';
    html += '<div id="c-set-row" style="display:none;margin-top:8px" class="ig"><label>Ver</label>'
      + '<select class="field" id="c-set-sel" onchange="renderConsultaPartido()">'
      + '<option value="all">Partido completo</option>'
      + '</select></div>';
    el.innerHTML = html;
  } else {
    var html2 = '<div class="ig"><label>Selecciona jugadora</label>'
      + '<select class="field" id="c-jugadora-sel" onchange="renderConsultaJugadora()">'
      + '<option value="">— Elige una jugadora —</option>';
    G.allJ.forEach(function(j) {
      html2 += '<option value="' + j.id + '">' + j.nombre + (j.alias ? ' (' + j.alias + ')' : '') + '</option>';
    });
    html2 += '</select></div>';
    el.innerHTML = html2;
  }
}

export async function onConsultaPartidoChange() {
  var pid = document.getElementById('c-partido-sel').value;
  if (!pid) { document.getElementById('consulta-body').innerHTML = ''; document.getElementById('c-set-row').style.display = 'none'; return; }
  document.getElementById('consulta-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    var p = G.allP.find(function(x) { return x.id === pid; });
    var nSets = p ? (p.sets_ganados || 0) + (p.sets_perdidos || 0) : 0;
    var selEl = document.getElementById('c-set-sel');
    selEl.innerHTML = '<option value="all">Partido completo</option>';
    for (var i = 1; i <= nSets; i++) selEl.innerHTML += '<option value="' + i + '">Set ' + i + '</option>';
    document.getElementById('c-set-row').style.display = nSets > 1 ? 'block' : 'none';
    await renderConsultaPartido();
  } catch(e) { document.getElementById('consulta-body').innerHTML = '<p style="color:var(--accent2);padding:20px">Error: ' + e.message + '</p>'; }
}

export async function renderConsultaPartido() {
  var pid = document.getElementById('c-partido-sel').value; if (!pid) return;
  var setFilter = document.getElementById('c-set-sel') ? document.getElementById('c-set-sel').value : 'all';
  var body = document.getElementById('consulta-body');
  body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    var r = await db.getStatsP(pid);
    var sj = r[0] || [], se = r[1] || [];
    var co = await db.getConvocatoria(pid);
    var p = G.allP.find(function(x) { return x.id === pid; });
    var eq = p ? G.allE.find(function(e) { return e.id === p.equipo_id; }) : null;
    var jugadoras = (co || []).map(function(row) {
      return { jugadora_id: row.jugadora_id, dorsal: row.dorsal || '', nombre: row.jugadora.nombre, alias: row.jugadora.alias || row.jugadora.nombre, posicion: row.jugadora.posicion };
    });

    var ts = {};
    jugadoras.forEach(function(j) { ts[j.jugadora_id] = {}; });
    sj.forEach(function(s) { if (!ts[s.jugadora_id]) ts[s.jugadora_id] = {}; ts[s.jugadora_id][s.tipo] = (ts[s.jugadora_id][s.tipo] || 0) + s.cantidad; });
    var tts = { rival_error: 0, general_error: 0 };
    se.forEach(function(s) { tts[s.tipo] = (tts[s.tipo] || 0) + s.cantidad; });

    var hasSetData = G.state.partidoId === pid && Object.keys(G.state.statsBySet).length > 0;
    var setData = hasSetData ? G.state.statsBySet : null;
    var teamSetData = hasSetData ? G.state.teamStatsBySet : null;

    if (setFilter !== 'all' && setData) {
      var sn = parseInt(setFilter);
      ts = {}; jugadoras.forEach(function(j) { ts[j.jugadora_id] = Object.assign({}, (setData[sn] || {})[j.jugadora_id] || {}); });
      tts = Object.assign({ rival_error: 0, general_error: 0 }, (teamSetData[sn] || {}));
    }

    var fecha = p ? new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    var resultado = p && p.completado ? p.sets_ganados + '–' + p.sets_perdidos : 'En curso';
    var html = '<div style="padding:14px 16px 0">';
    html += '<div class="stcard" style="margin-bottom:12px">'
      + '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">' + (eq ? eq.nombre : '') + (p && p.competicion ? ' · ' + p.competicion : '') + (fecha ? ' · ' + fecha : '') + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-weight:700;font-size:16px">vs ' + (p ? p.rival : '') + '</div>'
      + '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:26px;color:' + (p && p.completado ? (p.sets_ganados > p.sets_perdidos ? 'var(--green)' : 'var(--accent2)') : 'var(--accent)') + '">' + resultado + '</div>'
      + '</div>'
      + (setFilter !== 'all' ? '<div style="font-size:11px;color:var(--accent);font-weight:700;margin-top:4px">Mostrando: Set ' + setFilter + '</div>' : '')
      + '</div>';

    var T = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0 };
    jugadoras.forEach(function(j) { Object.keys(T).forEach(function(k) { T[k] += (ts[j.jugadora_id] || {})[k] || 0; }); });
    var pts = T.kill + T.ace + T.block + T.tip + (tts.rival_error || 0);
    var err = T.serve_error + T.reception_error + T.attack_error + T.net_fault + T.blockout + (tts.general_error || 0);
    html += '<div class="stitle" style="padding:0 0 6px">Equipo</div>'
      + '<div class="tgrid" style="margin-bottom:14px">'
      + '<div class="tbox g"><div class="tv">' + pts + '</div><div class="tk">Puntos</div></div>'
      + '<div class="tbox r"><div class="tv">' + err + '</div><div class="tk">Errores</div></div>'
      + '<div class="tbox a"><div class="tv">' + T.kill + '</div><div class="tk">Remates</div></div>'
      + '<div class="tbox b"><div class="tv">' + T.ace + '</div><div class="tk">Saques</div></div>'
      + '</div>';

    html += '<div class="stitle" style="padding:0 0 6px">Jugadoras</div>';
    jugadoras.map(function(j) {
      var s = ts[j.jugadora_id] || {};
      var jpts = (s.kill || 0) + (s.ace || 0) + (s.block || 0) + (s.tip || 0);
      var jerr = (s.serve_error || 0) + (s.reception_error || 0) + (s.attack_error || 0) + (s.net_fault || 0) + (s.blockout || 0);
      return { j: j, s: s, pts: jpts, err: jerr };
    }).sort(function(a, b) { return b.pts - a.pts; }).forEach(function(item) {
      var j = item.j, s = item.s;
      html += '<div class="stcard">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:18px;color:var(--accent)">#' + (j.dorsal || '—') + '</span>'
        + '<span style="font-weight:700;font-size:14px">' + j.nombre + '</span>'
        + (j.alias && j.alias !== j.nombre ? '<span style="font-size:11px;color:var(--muted)">(' + j.alias + ')</span>' : '')
        + posBadge(j.posicion, true) + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">'
        + '<div class="tbox g"><div class="tv" style="font-size:16px">' + item.pts + '</div><div class="tk">Pts</div></div>'
        + '<div class="tbox a"><div class="tv" style="font-size:16px">' + (s.kill || 0) + '</div><div class="tk">Rem</div></div>'
        + '<div class="tbox b"><div class="tv" style="font-size:16px">' + (s.ace || 0) + '</div><div class="tk">Saq</div></div>'
        + '<div class="tbox"><div class="tv" style="font-size:16px;color:var(--blue)">' + (s.block || 0) + '</div><div class="tk">Bloq</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:16px">' + item.err + '</div><div class="tk">Err</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:16px">' + (s.serve_error || 0) + '</div><div class="tk">F.Saq</div></div>'
        + '</div></div>';
    });

    if (hasSetData && setFilter === 'all' && G.state.setHistory && G.state.setHistory.length) {
      html += '<div class="stitle" style="padding:12px 0 6px">Por set</div>';
      G.state.setHistory.forEach(function(sh, i) {
        var sn = i + 1, ss = G.state.statsBySet[sn] || {};
        var top = jugadoras.map(function(j) { var ps = ss[j.jugadora_id] || {}; return { n: j.alias || j.nombre.split(' ')[0], p: (ps.kill || 0) + (ps.ace || 0) + (ps.block || 0) + (ps.tip || 0) }; }).filter(function(x) { return x.p > 0; }).sort(function(a, b) { return b.p - a.p; }).slice(0, 4);
        html += '<div class="stcard"><div style="display:flex;align-items:center;justify-content:space-between' + (top.length ? ';margin-bottom:6px' : '') + '">'
          + '<span style="font-weight:700">Set ' + sn + '</span><span style="font-family:\'Bebas Neue\',sans-serif;font-size:22px">' + sh.us + '–' + sh.them + '</span>'
          + '<span style="color:' + (sh.won ? 'var(--green)' : 'var(--accent2)') + ';font-size:12px;font-weight:700">' + (sh.won ? '✓ Ganado' : '✗ Perdido') + '</span></div>'
          + (top.length ? '<div style="display:flex;gap:10px;flex-wrap:wrap">' + top.map(function(x) { return '<span style="font-size:11px;color:var(--muted)">' + x.n + ' <b style="color:var(--text)">' + x.p + 'p</b></span>'; }).join('') + '</div>' : '')
          + '</div>';
      });
    }

    html += '</div>';
    body.innerHTML = html;
    document.getElementById('consulta-export-btn').style.display = 'block';
  } catch(e) { body.innerHTML = '<p style="color:var(--accent2);padding:20px">Error: ' + e.message + '</p>'; }
}

export async function renderConsultaJugadora() {
  var jid = document.getElementById('c-jugadora-sel').value; if (!jid) return;
  var body = document.getElementById('consulta-body');
  body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    var j = G.allJ.find(function(x) { return x.id === jid; });
    var statsRows = await sbFetch('stats_jugadora?jugadora_id=eq.' + jid + '&select=*');
    statsRows = statsRows || [];
    var pjRows = await sbFetch('partido_jugadoras?jugadora_id=eq.' + jid + '&select=partido_id,dorsal');
    pjRows = pjRows || [];

    var html = '<div style="padding:14px 16px 0">';
    html += '<div class="stcard" style="margin-bottom:14px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="flex:1"><div style="font-weight:700;font-size:16px">' + j.nombre + '</div>'
      + (j.alias ? '<div style="font-size:12px;color:var(--muted)">' + j.alias + '</div>' : '') + '</div>'
      + posBadge(j.posicion, false) + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:6px">' + (j.anio_nacimiento ? 'Nacida en ' + j.anio_nacimiento + ' · ' : '') + pjRows.length + ' partido' + (pjRows.length !== 1 ? 's' : '') + ' jugados</div>'
      + '</div>';

    var TOT = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0 };
    statsRows.forEach(function(s) { if (TOT.hasOwnProperty(s.tipo)) TOT[s.tipo] += s.cantidad || 0; });
    var tpts = TOT.kill + TOT.ace + TOT.block + TOT.tip, terr = TOT.serve_error + TOT.reception_error + TOT.attack_error + TOT.net_fault + TOT.blockout;
    html += '<div class="stitle" style="padding:0 0 6px">Totales acumulados (' + pjRows.length + ' partidos)</div>'
      + '<div class="tgrid" style="margin-bottom:6px">'
      + '<div class="tbox g"><div class="tv">' + tpts + '</div><div class="tk">Puntos</div></div>'
      + '<div class="tbox r"><div class="tv">' + terr + '</div><div class="tk">Errores</div></div>'
      + '<div class="tbox a"><div class="tv">' + TOT.kill + '</div><div class="tk">Remates</div></div>'
      + '<div class="tbox b"><div class="tv">' + TOT.ace + '</div><div class="tk">Saques</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">'
      + '<div class="tbox"><div class="tv" style="font-size:20px;color:var(--blue)">' + TOT.block + '</div><div class="tk">Bloqueos</div></div>'
      + '<div class="tbox"><div class="tv" style="font-size:20px;color:var(--purple)">' + TOT.tip + '</div><div class="tk">Fintas</div></div>'
      + '<div class="tbox r"><div class="tv" style="font-size:20px">' + TOT.serve_error + '</div><div class="tk">F.Saque</div></div>'
      + '<div class="tbox r"><div class="tv" style="font-size:20px">' + TOT.reception_error + '</div><div class="tk">F.Recep</div></div>'
      + '</div>';

    if (pjRows.length) {
      html += '<div class="stitle" style="padding:0 0 6px">Por partido</div>';
      var byPartido = {};
      statsRows.forEach(function(s) { if (!byPartido[s.partido_id]) byPartido[s.partido_id] = {}; byPartido[s.partido_id][s.tipo] = (byPartido[s.partido_id][s.tipo] || 0) + s.cantidad; });
      pjRows.forEach(function(pj) {
        var p = G.allP.find(function(x) { return x.id === pj.partido_id; });
        var eqp = p ? G.allE.find(function(e) { return e.id === p.equipo_id; }) : null;
        var s = byPartido[pj.partido_id] || {};
        var pts = (s.kill || 0) + (s.ace || 0) + (s.block || 0) + (s.tip || 0);
        var err = (s.serve_error || 0) + (s.reception_error || 0) + (s.attack_error || 0) + (s.net_fault || 0) + (s.blockout || 0);
        var fecha = p ? new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
        var res = p && p.completado ? p.sets_ganados + '–' + p.sets_perdidos : '';
        html += '<div class="stcard">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          + '<div><div style="font-weight:700;font-size:13px">vs ' + (p ? p.rival : '?') + '</div>'
          + '<div style="font-size:11px;color:var(--muted)">' + (eqp ? eqp.nombre : '') + (fecha ? ' · ' + fecha : '') + '</div></div>'
          + (res ? '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:18px;color:' + (p.sets_ganados > p.sets_perdidos ? 'var(--green)' : 'var(--accent2)') + '">' + res + '</div>' : '')
          + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">'
          + '<div class="tbox g"><div class="tv" style="font-size:15px">' + pts + '</div><div class="tk">Pts</div></div>'
          + '<div class="tbox a"><div class="tv" style="font-size:15px">' + (s.kill || 0) + '</div><div class="tk">Rem</div></div>'
          + '<div class="tbox b"><div class="tv" style="font-size:15px">' + (s.ace || 0) + '</div><div class="tk">Saq</div></div>'
          + '<div class="tbox"><div class="tv" style="font-size:15px;color:var(--blue)">' + (s.block || 0) + '</div><div class="tk">Bloq</div></div>'
          + '<div class="tbox r"><div class="tv" style="font-size:15px">' + err + '</div><div class="tk">Err</div></div>'
          + '<div class="tbox r"><div class="tv" style="font-size:15px">' + (s.serve_error || 0) + '</div><div class="tk">F.Saq</div></div>'
          + '</div></div>';
      });
    } else {
      html += '<p style="color:var(--muted);font-size:13px;padding:10px 0">Sin partidos registrados.</p>';
    }
    html += '</div>';
    body.innerHTML = html;
  } catch(e) { body.innerHTML = '<p style="color:var(--accent2);padding:20px">Error: ' + e.message + '</p>'; }
}

export async function viewStatsPartido(pid) {
  openConsulta('partido');
  setTimeout(async function() {
    var sel = document.getElementById('c-partido-sel');
    if (sel) { sel.value = pid; await onConsultaPartidoChange(); }
  }, 50);
}
