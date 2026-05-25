import { G } from './state.js';
import { LS } from './constants.js';

export function saveLocal() {
  try { localStorage.setItem(LS, JSON.stringify({ state: G.state, conv: G.conv })); } catch(e) {}
}

export function loadLocal() {
  try { var r = localStorage.getItem(LS); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

export function clearLocal() {
  try { localStorage.removeItem(LS); } catch(e) {}
}
