import { G } from './state.js';
import { POSL, courtSize } from './constants.js';
import { switchScreen, showToast } from './nav.js';

var pendCourt = [];
var subMode = 'change';

export function openSubForLineup(preselect) {
  subMode = 'lineup';
  pendCourt = preselect ? preselect.slice() : [];
  renderSubGrid();
  document.getElementById('sub-title').textContent = 'SET ' + G.state.setNum + ' — TITULARES';
  document.getElementById('sub-subtitle').textContent = 'Selecciona las 6 jugadoras que empiezan el set';
  switchScreen('sub');
}

export function openSub() {
  subMode = 'change';
  pendCourt = G.state.onCourt.slice();
  renderSubGrid();
  document.getElementById('sub-title').textContent = 'CAMBIO';
  document.getElementById('sub-subtitle').textContent = 'Marca las 6 en pista';
  switchScreen('sub');
}

export function closeSub() { switchScreen('match'); }

function renderSubGrid() {
  var size = courtSize(G.state.categoria);
  var el = document.getElementById('sub-grid-content'); el.innerHTML = '';
  var onL = G.conv.filter(function(j) { return pendCourt.includes(j.jugadora_id); });
  var offL = G.conv.filter(function(j) { return !pendCourt.includes(j.jugadora_id); });

  function addSec(txt, col) {
    var d = document.createElement('div');
    d.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:' + col + ';margin-bottom:6px';
    d.textContent = txt; el.appendChild(d);
  }

  function addGrid(list, on) {
    var g = document.createElement('div');
    g.className = 'subgrid';
    g.style.gridTemplateColumns = size === 7 ? 'repeat(4,1fr)' : 'repeat(3,1fr)';
    list.forEach(function(j) {
      var t = document.createElement('div'); t.className = 'stile' + (on ? ' on' : '');
      var posCol = j.posicion ? 'var(--pos-' + j.posicion + ')' : 'var(--muted)';
      t.innerHTML = '<span class="stn" style="color:' + (on ? 'var(--green)' : 'var(--accent)') + '">' + (j.dorsal || '—') + '</span>'
        + '<span class="sta">' + (j.alias || j.nombre.split(' ')[0]) + '</span>'
        + (j.posicion ? '<span style="font-size:8px;font-weight:700;color:' + posCol + ';text-transform:uppercase;letter-spacing:0.5px">' + (POSL[j.posicion] || j.posicion) + '</span>' : '');
      (function(jid, tile) {
        tile.onclick = function() {
          if (pendCourt.includes(jid)) pendCourt = pendCourt.filter(function(x) { return x !== jid; });
          else { if (pendCourt.length >= size) { showToast('Ya hay ' + size + ' en pista'); return; } pendCourt.push(jid); }
          renderSubGrid();
        };
      })(j.jugadora_id, t);
      g.appendChild(t);
    });
    el.appendChild(g);
  }

  if (onL.length) { addSec('En pista', 'var(--green)'); addGrid(onL, true); }
  var sep = document.createElement('div'); sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0'; el.appendChild(sep);
  addSec('Banquillo', 'var(--muted)');
  if (offL.length) addGrid(offL, false);
  else { var em = document.createElement('div'); em.style.cssText = 'color:var(--muted);font-size:12px;padding:6px 0'; em.textContent = 'Banquillo vacío'; el.appendChild(em); }

  var n = pendCourt.length, btn = document.getElementById('sub-apply-btn');
  if (subMode === 'lineup') {
    btn.textContent = n === size ? '▶ INICIAR SET' : 'TITULARES: ' + n + ' / ' + size + ' — SELECCIONA ' + size;
    btn.style.opacity = n === size ? '1' : '0.6';
  } else {
    btn.textContent = n === size ? 'CONFIRMAR CAMBIO' : 'EN PISTA: ' + n + ' / ' + size;
    btn.style.opacity = n === size ? '1' : '0.5';
  }
}

export function applySub() {
  var size = courtSize(G.state.categoria);
  if (pendCourt.length !== size) { showToast('Deben ser ' + size); return; }
  G.state.onCourt = pendCourt.slice();
  if (!G.state.onCourt.includes(G.state.activePlayer)) G.state.activePlayer = null;
  if (!G.state.onCourt.includes(G.state.pinnedPlayer)) G.state.pinnedPlayer = null;
  window.renderPlayerSelector();
  if (subMode === 'lineup') showToast('✅ Alineación set ' + G.state.setNum);
  else showToast('✅ Cambio aplicado');
  switchScreen('match');
}
