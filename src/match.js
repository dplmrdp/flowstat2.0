import { G } from './state.js';
import { META, POSL, posBadge, courtSize, mkState } from './constants.js';
import { db } from './db.js';
import { saveLocal, clearLocal } from './storage.js';
import { switchScreen, showToast } from './nav.js';

// ── STAT LOGGING ──────────────────────────────────────────────────────────────

export function logStat(type) {
  if (G.state.matchOver) return;
  var meta = META[type];
  var playerId = null;

  if (!meta.team) {
    if (meta.serve) {
      if (!G.state.currentServer && G.state.serveTeam === 'us') { showToast('Selecciona la sacadora primero'); return; }
      playerId = G.state.currentServer;
    } else {
      if (!G.state.activePlayer) { showToast('Selecciona una jugadora primero'); return; }
      playerId = G.state.activePlayer;
    }
  }

  var sn = G.state.setNum;
  if (meta.team) {
    G.state.teamStats[type] = (G.state.teamStats[type] || 0) + 1;
    if (!G.state.teamStatsBySet[sn]) G.state.teamStatsBySet[sn] = { rival_error: 0, general_error: 0 };
    G.state.teamStatsBySet[sn][type] = (G.state.teamStatsBySet[sn][type] || 0) + 1;
    var el = document.getElementById('cnt-' + type); if (el) el.textContent = G.state.teamStatsBySet[sn][type];
  } else if (playerId) {
    if (!G.state.stats[playerId]) G.state.stats[playerId] = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0, serve_count: 0 };
    G.state.stats[playerId][type] = (G.state.stats[playerId][type] || 0) + 1;
    if (!G.state.statsBySet[sn]) G.state.statsBySet[sn] = {};
    if (!G.state.statsBySet[sn][playerId]) G.state.statsBySet[sn][playerId] = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0, serve_count: 0 };
    G.state.statsBySet[sn][playerId][type] = (G.state.statsBySet[sn][playerId][type] || 0) + 1;
    if (meta.serve && type !== 'serve_count') {
      G.state.stats[playerId].serve_count = (G.state.stats[playerId].serve_count || 0) + 1;
      G.state.statsBySet[sn][playerId].serve_count = (G.state.statsBySet[sn][playerId].serve_count || 0) + 1;
    }
    if (!meta.hidden) {
      var el2 = document.getElementById('cnt-' + type);
      if (el2) el2.textContent = G.conv.reduce(function(s, j) { return s + ((G.state.statsBySet[sn][j.jugadora_id] || {})[type] || 0); }, 0);
    }
  }

  if (meta.point) { if (meta.us) { G.state.scoreUs++; bumpScore('us'); } else { G.state.scoreThem++; bumpScore('them'); } }

  var jug = meta.team ? null : G.conv.find(function(j) { return j.jugadora_id === playerId; });
  G.state.log.push({
    type: type, meta: meta, playerId: playerId,
    player: jug ? (jug.alias || jug.nombre) : '(equipo)',
    scoreUs: G.state.scoreUs, scoreThem: G.state.scoreThem, set: sn,
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  });
  updateScoreUI(); flashBtn(type, meta);
  showToast(meta.label + (jug ? ' · ' + (jug.alias || jug.nombre) : ''));

  if (meta.serve && meta.point && G.state.serveTeam === 'us') {
    if (!meta.us) {
      G.state.serveTeam = 'them'; G.state.currentServer = null;
      document.getElementById('serve-us').classList.remove('active');
      document.getElementById('serve-them').classList.add('active');
      updateServerRow();
    }
  }
  if (meta.point && !meta.serve && G.state.serveTeam !== null) {
    G.state.serveTeam = meta.us ? 'us' : 'them';
    if (!meta.us) G.state.currentServer = null;
    document.getElementById('serve-us').classList.toggle('active', G.state.serveTeam === 'us');
    document.getElementById('serve-them').classList.toggle('active', G.state.serveTeam === 'them');
    updateServerRow();
  }

  if (!meta.team && !meta.serve && !G.state.pinnedPlayer) { G.state.activePlayer = null; renderPlayerSelector(); }
  saveLocal(); checkSetEnd();
}

export function flashBtn(type, meta) {
  var b = document.querySelector('[onclick="logStat(\'' + type + '\')"]'); if (!b) return;
  var c = meta.team ? 'ftm' : (meta.us ? 'fpt' : 'fer');
  b.classList.remove('fpt', 'fer', 'ftm'); void b.offsetWidth; b.classList.add(c);
  setTimeout(function() { b.classList.remove(c); }, 420);
}

export function bumpScore(side) {
  var el = document.getElementById(side === 'us' ? 'm-score-us' : 'm-score-them');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  setTimeout(function() { el.classList.remove('bump'); }, 220);
}

export function undoLast() {
  if (!G.state.log.length) { showToast('Nada que deshacer'); return; }
  var last = G.state.log.pop(), sn = last.set;
  if (last.meta.team) {
    G.state.teamStats[last.type] = Math.max(0, (G.state.teamStats[last.type] || 1) - 1);
    if (G.state.teamStatsBySet[sn]) G.state.teamStatsBySet[sn][last.type] = Math.max(0, (G.state.teamStatsBySet[sn][last.type] || 1) - 1);
    var el = document.getElementById('cnt-' + last.type); if (el) el.textContent = (G.state.teamStatsBySet[sn] || {})[last.type] || 0;
  } else {
    if (last.playerId && G.state.stats[last.playerId]) G.state.stats[last.playerId][last.type] = Math.max(0, (G.state.stats[last.playerId][last.type] || 1) - 1);
    if (last.playerId && G.state.statsBySet[sn] && G.state.statsBySet[sn][last.playerId]) G.state.statsBySet[sn][last.playerId][last.type] = Math.max(0, (G.state.statsBySet[sn][last.playerId][last.type] || 1) - 1);
    if (sn === G.state.setNum) { var el2 = document.getElementById('cnt-' + last.type); if (el2) el2.textContent = G.conv.reduce(function(s, j) { return s + ((G.state.statsBySet[sn] || {})[j.jugadora_id] || {})[last.type] || 0; }, 0); }
  }
  if (last.meta.point) { if (last.meta.us) G.state.scoreUs = Math.max(0, G.state.scoreUs - 1); else G.state.scoreThem = Math.max(0, G.state.scoreThem - 1); }
  updateScoreUI(); saveLocal(); showToast('↩️ Deshecho');
}

// ── SERVE ─────────────────────────────────────────────────────────────────────

export function setServe(t) {
  if (t === 'us') {
    G.state.serveTeam = G.state.serveTeam === 'us' ? null : 'us';
    if (!G.state.serveTeam) G.state.currentServer = null;
  } else {
    G.state.serveTeam = G.state.serveTeam === 'them' ? null : 'them';
    G.state.currentServer = null;
  }
  document.getElementById('serve-us').classList.toggle('active', G.state.serveTeam === 'us');
  document.getElementById('serve-them').classList.toggle('active', G.state.serveTeam === 'them');
  document.getElementById('en-juego-bar').style.display = 'none';
  updateServerRow(); saveLocal();
}

export function updateServerRow() {
  var lbl = document.getElementById('psec-label'); if (!lbl) return;
  if (G.state.serveTeam === 'us') {
    lbl.innerHTML = '🏐 <b style="color:var(--accent)">Toca quién saca</b> y vuelves al registro';
  } else if (G.state.currentServer) {
    var srv = G.conv.find(function(x) { return x.jugadora_id === G.state.currentServer; });
    lbl.innerHTML = '🏐 Saca <b style="color:var(--green)">' + (srv ? srv.alias || srv.nombre : '—') + '</b> · 🏐 Nosotras para cambiar';
  } else {
    lbl.innerHTML = 'Jugadora activa · <span style="color:var(--border)">mantén para fijar 📌</span>';
  }
  updateStatPanel(); renderPlayerSelector();
}

export function setModoRally() {
  document.getElementById('en-juego-bar').style.display = 'none';
  G.state.serveTeam = null;
  document.getElementById('serve-us').classList.remove('active');
  document.getElementById('serve-them').classList.remove('active');
  updateServerRow(); saveLocal();
}

export function updateStatPanel() {
  var panel = document.getElementById('stat-panel'); if (!panel) return;
  var needsServer = G.state.serveTeam === 'us' && !G.state.currentServer;
  if (needsServer) panel.classList.add('blocked'); else panel.classList.remove('blocked');
}

// ── PLAYER SELECTOR ───────────────────────────────────────────────────────────

export function renderPlayerSelector() {
  var sel = document.getElementById('player-selector'); sel.innerHTML = '';
  var size = courtSize(G.state.categoria);
  sel.style.gridTemplateColumns = size === 7 ? 'repeat(4,1fr)' : 'repeat(3,1fr)';
  var serveMode = G.state.serveTeam === 'us';
  G.state.onCourt.forEach(function(jid) {
    var j = G.conv.find(function(x) { return x.jugadora_id === jid; }); if (!j) return;
    var pinned   = !serveMode && G.state.pinnedPlayer === jid;
    var selected = !serveMode && G.state.activePlayer === jid;
    var isServer = serveMode && G.state.currentServer === jid;
    var posCol   = j.posicion ? 'var(--pos-' + j.posicion + ')' : 'var(--accent)';
    var tile = document.createElement('div');
    if (isServer || pinned) tile.className = 'ptile pinned';
    else if (selected)      tile.className = 'ptile sel';
    else                    tile.className = 'ptile';
    var numColor = isServer ? 'var(--green)' : (pinned ? 'var(--purple)' : posCol);
    var posAbbr  = j.posicion ? (POSL[j.posicion] || j.posicion).slice(0, 4).toUpperCase() : '';
    tile.innerHTML =
      (isServer ? '<span style="font-size:9px;position:absolute;top:2px;left:3px">🏐</span>' : '')
      + '<span class="pnum" style="color:' + numColor + '">#' + (j.dorsal || '—') + '</span>'
      + '<span class="pnm">' + (j.alias || j.nombre.split(' ')[0]) + '</span>'
      + (posAbbr ? '<span style="font-size:8px;color:' + numColor + ';font-weight:700;opacity:0.8;letter-spacing:0.3px">' + posAbbr + '</span>' : '');
    (function(jid2, pinned2) {
      tile.onclick = function() {
        if (serveMode) {
          G.state.currentServer = G.state.currentServer === jid2 ? null : jid2;
          G.state.serveTeam = null;
          document.getElementById('serve-us').classList.toggle('active', !!G.state.currentServer);
          document.getElementById('serve-them').classList.remove('active');
          document.getElementById('en-juego-bar').style.display = 'none';
          updateServerRow(); updateStatPanel(); saveLocal();
        } else {
          if (pinned2) { G.state.pinnedPlayer = null; G.state.activePlayer = null; }
          else G.state.activePlayer = G.state.activePlayer === jid2 ? null : jid2;
          renderPlayerSelector();
        }
      };
      var pt = null;
      tile.addEventListener('pointerdown', function() {
        pt = setTimeout(function() {
          pt = null;
          if (!serveMode) {
            G.state.pinnedPlayer = pinned2 ? null : jid2; G.state.activePlayer = G.state.pinnedPlayer;
            renderPlayerSelector(); if (navigator.vibrate) navigator.vibrate(40);
          }
        }, 500);
      });
      tile.addEventListener('pointerup', function() { clearTimeout(pt); });
      tile.addEventListener('pointerleave', function() { clearTimeout(pt); });
    })(jid, pinned);
    sel.appendChild(tile);
  });
}

// ── MATCH UI ──────────────────────────────────────────────────────────────────

export function updateMatchUI() {
  document.getElementById('m-team-name').textContent = G.state.teamName;
  document.getElementById('m-rival-name').textContent = G.state.rivalName;
  document.getElementById('m-set-num').textContent = G.state.setNum;
  document.getElementById('serve-us').classList.toggle('active', G.state.serveTeam === 'us');
  document.getElementById('serve-them').classList.toggle('active', G.state.serveTeam === 'them');
  updateScoreUI(); renderPlayerSelector(); renderSetDots(); updateServerRow(); updateStatPanel();
}

export function updateScoreUI() {
  document.getElementById('m-score-us').textContent = G.state.scoreUs;
  document.getElementById('m-score-them').textContent = G.state.scoreThem;
  document.getElementById('m-sets-us').textContent = G.state.setsUs;
  document.getElementById('m-sets-them').textContent = G.state.setsThem;
  renderSetDots();
}

export function renderSetDots() {
  var n = isFixedSets() ? 3 : G.state.format;
  var h = '';
  for (var i = 0; i < n; i++) h += '<div class="sdot' + (i < G.state.setsUs ? ' won' : '') + '"></div>';
  document.getElementById('m-set-dots').innerHTML = h;
}

export function showStats() { renderStats(); document.getElementById('stats-back-btn').onclick = showMatch; switchScreen('stats'); }
export function showMatch() { switchScreen('match'); }

export function switchStatTab(id, el) {
  ['st-team', 'st-players', 'st-log'].forEach(function(x) { document.getElementById(x).style.display = x === id ? 'block' : 'none'; });
  document.querySelectorAll('.tabi').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
}

// ── SET / MATCH LOGIC ─────────────────────────────────────────────────────────

function isFixedSets() { return G.state.format === 30; }
function totalSets() { return isFixedSets() ? 3 : G.state.format; }

export function checkSetEnd() {
  var u = G.state.scoreUs, t = G.state.scoreThem, pts = G.state.setNum === 5 ? 15 : 25;
  if (u >= pts && u - t >= 2) endSet(u > t);
  else if (t >= pts && t - u >= 2) endSet(u > t);
}

export function endSet(won) {
  G.state.setHistory.push({ us: G.state.scoreUs, them: G.state.scoreThem, won: won });
  if (won) G.state.setsUs++; else G.state.setsThem++;
  saveLocal();
  var ts = totalSets(), toWin = Math.ceil(G.state.format / 2);
  var over = isFixedSets()
    ? (G.state.setsUs + G.state.setsThem >= ts)
    : (G.state.setsUs >= toWin || G.state.setsThem >= toWin);
  document.getElementById('set-end-title').textContent = won ? '🏆 ¡SET GANADO!' : '💪 Set perdido';
  document.getElementById('set-end-body').textContent = G.state.scoreUs + '–' + G.state.scoreThem + ' · Sets: ' + G.state.setsUs + '–' + G.state.setsThem;
  document.getElementById('set-end-next').style.display = over ? 'none' : 'flex';
  document.getElementById('set-end-finish').textContent = over ? '🎉 VER RESUMEN' : 'Terminar partido';
  document.getElementById('modal-set-end').style.display = 'flex';
  G.state.matchOver = true;
  document.getElementById('set-end-next').onclick = function() { document.getElementById('modal-set-end').style.display = 'none'; nextSet(); };
  document.getElementById('set-end-finish').onclick = function() { document.getElementById('modal-set-end').style.display = 'none'; finishMatch(); };
}

export function endSetManual() {
  if (!G.state.scoreUs && !G.state.scoreThem) { showToast('Registra alguna acción primero'); return; }
  endSet(G.state.scoreUs > G.state.scoreThem);
}

export function nextSet() {
  var prevCourt = G.state.onCourt.slice();
  G.state.setNum++; G.state.scoreUs = 0; G.state.scoreThem = 0; G.state.matchOver = false;
  G.state.pinnedPlayer = null; G.state.activePlayer = null; G.state.serveTeam = null; G.state.currentServer = null;
  var sn = G.state.setNum;
  G.state.statsBySet[sn] = {};
  G.state.teamStatsBySet[sn] = { rival_error: 0, general_error: 0 };
  G.conv.forEach(function(j) {
    G.state.statsBySet[sn][j.jugadora_id] = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0, serve_count: 0 };
  });
  Object.keys(META).forEach(function(k) { var el = document.getElementById('cnt-' + k); if (el) el.textContent = '0'; });
  document.getElementById('serve-us').classList.remove('active');
  document.getElementById('serve-them').classList.remove('active');
  saveLocal(); updateMatchUI();
  window.openSubForLineup(prevCourt);
}

export async function finishMatch() {
  try {
    var rj = [];
    G.conv.forEach(function(j) {
      var s = G.state.stats[j.jugadora_id] || {};
      Object.keys(s).forEach(function(t) { if (s[t] > 0) rj.push({ partido_id: G.state.partidoId, jugadora_id: j.jugadora_id, tipo: t, cantidad: s[t] }); });
    });
    var re = [];
    Object.keys(G.state.teamStats).forEach(function(t) { if (G.state.teamStats[t] > 0) re.push({ partido_id: G.state.partidoId, tipo: t, cantidad: G.state.teamStats[t] }); });
    await db.saveStats(rj, re);
    await db.updateResult(G.state.partidoId, G.state.setsUs, G.state.setsThem);
    var i = G.allP.findIndex(function(x) { return x.id === G.state.partidoId; });
    if (i >= 0) { G.allP[i].sets_ganados = G.state.setsUs; G.allP[i].sets_perdidos = G.state.setsThem; G.allP[i].completado = true; }
    clearLocal(); showToast('✅ Partido guardado');
  } catch(e) { showToast('⚠️ Sin conexión — datos locales'); }
  window.renderPartidos(); window.renderEquipos();
  window.openConsulta('partido');
  setTimeout(async function() {
    var sel = document.getElementById('c-partido-sel');
    if (sel && G.state.partidoId) { sel.value = G.state.partidoId; await window.onConsultaPartidoChange(); }
  }, 100);
  var bk = document.createElement('button'); bk.className = 'big-btn sec';
  bk.style.cssText = 'margin:12px 16px;font-size:16px;padding:11px;width:calc(100% - 32px)';
  bk.textContent = '← VOLVER AL MENÚ';
  bk.onclick = function() { bk.remove(); switchScreen('hub'); };
  setTimeout(function() { var b = document.getElementById('consulta-body'); if (b) b.appendChild(bk); }, 400);
}

// ── STATS RENDER (partido en curso) ───────────────────────────────────────────

export function renderStats() {
  var T = { ace: 0, kill: 0, block: 0, tip: 0, serve_error: 0, reception_error: 0, attack_error: 0, net_fault: 0, blockout: 0 };
  G.conv.forEach(function(j) { Object.keys(T).forEach(function(k) { T[k] += (G.state.stats[j.jugadora_id] || {})[k] || 0; }); });
  var re = G.state.teamStats.rival_error || 0, ge = G.state.teamStats.general_error || 0;
  var pts = T.kill + T.ace + T.block + T.tip + re, err = T.serve_error + T.reception_error + T.attack_error + T.net_fault + T.blockout + ge;
  var th = '<div style="margin-bottom:10px"><div class="stitle">Totales del partido</div><div class="tgrid">'
    + '<div class="tbox g"><div class="tv">' + pts + '</div><div class="tk">Puntos</div></div>'
    + '<div class="tbox r"><div class="tv">' + err + '</div><div class="tk">Errores</div></div>'
    + '<div class="tbox a"><div class="tv">' + T.kill + '</div><div class="tk">Remates</div></div>'
    + '<div class="tbox b"><div class="tv">' + T.ace + '</div><div class="tk">Saques</div></div>'
    + '</div></div>';
  if (G.state.setHistory.length) {
    th += '<div class="stitle">Por set</div>';
    G.state.setHistory.forEach(function(s, i) {
      var sn = i + 1, ss = G.state.statsBySet[sn] || {};
      var top = G.conv.map(function(j) { var ps = ss[j.jugadora_id] || {}; return { n: j.alias || j.nombre.split(' ')[0], p: (ps.kill || 0) + (ps.ace || 0) + (ps.block || 0) + (ps.tip || 0) }; }).filter(function(x) { return x.p > 0; }).sort(function(a, b) { return b.p - a.p; }).slice(0, 3);
      th += '<div class="stcard"><div style="display:flex;align-items:center;justify-content:space-between' + (top.length ? ';margin-bottom:6px' : '') + '">'
        + '<span style="font-weight:700">Set ' + sn + '</span><span style="font-family:\'Bebas Neue\',sans-serif;font-size:22px">' + s.us + '–' + s.them + '</span>'
        + '<span style="color:' + (s.won ? 'var(--green)' : 'var(--accent2)') + ';font-size:12px;font-weight:700">' + (s.won ? '✓ Ganado' : '✗ Perdido') + '</span></div>'
        + (top.length ? '<div style="display:flex;gap:10px;flex-wrap:wrap">' + top.map(function(x) { return '<span style="font-size:11px;color:var(--muted)">' + x.n + ' <b style="color:var(--text)">' + x.p + 'p</b></span>'; }).join('') + '</div>' : '')
        + '</div>';
    });
  }
  document.getElementById('st-team').innerHTML = th;

  var ph = '';
  G.conv.map(function(j) { var s = G.state.stats[j.jugadora_id] || {}; return { j: j, s: s, pts: (s.kill || 0) + (s.ace || 0) + (s.block || 0) + (s.tip || 0), err: (s.serve_error || 0) + (s.reception_error || 0) + (s.reception_serve_error || 0) + (s.attack_error || 0) + (s.net_fault || 0) + (s.blockout || 0) }; })
    .sort(function(a, b) { return b.pts - a.pts; }).forEach(function(item) {
      var j = item.j, s = item.s;
      var nSaques = s.serve_count || 0;
      var pctAce = nSaques > 0 ? Math.round((s.ace || 0) / nSaques * 100) : 0;
      var pctErrSaque = nSaques > 0 ? Math.round((s.serve_error || 0) / nSaques * 100) : 0;
      ph += '<div class="stcard"><div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">'
        + '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:18px;color:var(--accent)">#' + (j.dorsal || '—') + '</span>'
        + '<span style="font-weight:700;font-size:14px">' + j.nombre + '</span>'
        + (j.alias && j.alias !== j.nombre ? '<span style="font-size:11px;color:var(--muted)">(' + j.alias + ')</span>' : '')
        + posBadge(j.posicion, true)
        + (G.state.onCourt.includes(j.jugadora_id) ? '<span style="font-size:9px;font-weight:700;color:var(--green)">PISTA</span>' : '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:5px">'
        + '<div class="tbox g"><div class="tv" style="font-size:17px">' + item.pts + '</div><div class="tk">Pts</div></div>'
        + '<div class="tbox a"><div class="tv" style="font-size:17px">' + (s.kill || 0) + '</div><div class="tk">Rem</div></div>'
        + '<div class="tbox b"><div class="tv" style="font-size:17px">' + (s.ace || 0) + '</div><div class="tk">Saq</div></div>'
        + '<div class="tbox"><div class="tv" style="font-size:17px;color:var(--blue)">' + (s.block || 0) + '</div><div class="tk">Bloq</div></div>'
        + '<div class="tbox"><div class="tv" style="font-size:17px;color:var(--purple)">' + (s.tip || 0) + '</div><div class="tk">Finta</div></div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:5px">'
        + '<div class="tbox r"><div class="tv" style="font-size:17px">' + item.err + '</div><div class="tk">Err</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:17px">' + (s.serve_error || 0) + '</div><div class="tk">F.Saq</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:17px">' + (s.reception_serve_error || 0) + '</div><div class="tk">F.Rs</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:17px">' + (s.reception_error || 0) + '</div><div class="tk">F.Rec</div></div>'
        + '<div class="tbox r"><div class="tv" style="font-size:17px">' + ((s.net_fault || 0) + (s.blockout || 0)) + '</div><div class="tk">Red/Out</div></div>'
        + '</div>'
        + (nSaques > 0 ? '<div style="background:var(--surface);border-radius:8px;padding:6px 8px;font-size:11px;color:var(--muted)">Saques: <b style="color:var(--text)">' + nSaques + '</b> · Directos: <b style="color:var(--green)">' + pctAce + '%</b> · Errores: <b style="color:var(--accent2)">' + pctErrSaque + '%</b></div>' : '')
        + '</div>';
    });
  if ((G.state.teamStats.rival_error || 0) + (G.state.teamStats.general_error || 0) > 0)
    ph += '<div class="stcard" style="border-color:rgba(107,122,153,0.3)"><div class="stitle">Acciones de equipo</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="tbox g"><div class="tv">' + (G.state.teamStats.rival_error || 0) + '</div><div class="tk">Fallo rival</div></div><div class="tbox r"><div class="tv">' + (G.state.teamStats.general_error || 0) + '</div><div class="tk">F. General</div></div></div></div>';
  document.getElementById('st-players').innerHTML = ph || '<p style="color:var(--muted);padding:20px">Sin datos</p>';

  var icons = { kill: '💥', ace: '🎯', block: '🛡️', tip: '🤙', rival_error: '❌', serve_error: '🚫', reception_error: '😬', attack_error: '📉', net_fault: '🕸️', blockout: '🏀', general_error: '⚠️' };
  document.getElementById('st-log').innerHTML = G.state.log.length
    ? G.state.log.slice().reverse().map(function(e) {
        return '<div class="logi ' + (e.meta.point ? (e.meta.us ? 'pev' : 'eev') : '') + '"><span style="font-size:17px">' + (icons[e.type] || '•') + '</span><div style="flex:1;font-size:12px"><div style="font-weight:700">' + e.meta.label + '</div><div style="color:var(--muted);font-size:11px">' + e.player + ' · Set ' + e.set + '</div></div><div style="text-align:right"><div style="font-family:\'Bebas Neue\',sans-serif;font-size:15px">' + e.scoreUs + '–' + e.scoreThem + '</div><div style="font-size:11px;color:var(--muted)">' + e.time + '</div></div></div>';
      }).join('')
    : '<p style="color:var(--muted);padding:20px;font-size:13px">Sin acciones.</p>';
}

export function exportStats() {
  var txt = 'ESTADÍSTICAS: ' + G.state.teamName + ' vs ' + G.state.rivalName + '\nSets: ' + G.state.setsUs + '–' + G.state.setsThem + '\n\n';
  G.state.setHistory.forEach(function(s, i) { txt += 'Set ' + (i + 1) + ': ' + s.us + '–' + s.them + ' (' + (s.won ? 'Ganado' : 'Perdido') + ')\n'; });
  txt += '\n--- JUGADORAS ---\n';
  G.conv.forEach(function(j) {
    var s = G.state.stats[j.jugadora_id] || {};
    txt += '\n#' + (j.dorsal || '—') + ' ' + j.nombre + '\n  Puntos: Remate=' + (s.kill || 0) + ' Saque=' + (s.ace || 0) + ' Bloqueo=' + (s.block || 0) + ' Finta=' + (s.tip || 0) + '\n  Errores: Saque=' + (s.serve_error || 0) + ' Recep=' + (s.reception_error || 0) + ' Remate=' + (s.attack_error || 0) + ' Red=' + (s.net_fault || 0) + ' Blockout=' + (s.blockout || 0) + '\n';
  });
  txt += '\nEquipo: Fallo rival=' + (G.state.teamStats.rival_error || 0) + ' | Fallo general=' + (G.state.teamStats.general_error || 0) + '\n';
  if (navigator.share) navigator.share({ title: 'VóleyStats', text: txt }).catch(function() {});
  else {
    var el = document.createElement('textarea'); el.value = txt; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); showToast('📋 Copiado');
  }
}
