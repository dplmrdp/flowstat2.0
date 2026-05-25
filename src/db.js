const SB_URL = 'https://oersaonzbdvzikvvelii.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lcnNhb256YmR2emlrdnZlbGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTU5NzAsImV4cCI6MjA4OTA5MTk3MH0.APh5hJps0ZuZ092122cszPabnuQV2ANY8XGhSKnIAJE';

export async function sbFetch(path, opts) {
  opts = opts || {};
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, 10000);
  try {
    var headers = {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation'
    };
    if (opts.headers) Object.keys(opts.headers).forEach(function(k) { headers[k] = opts.headers[k]; });
    var fo = { method: opts.method || 'GET', headers: headers, signal: ctrl.signal };
    if (opts.body) fo.body = opts.body;
    var res = await fetch(SB_URL + '/rest/v1/' + path, fo);
    if (!res.ok) { var e = await res.text(); throw new Error('HTTP ' + res.status + ': ' + e); }
    var txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('Timeout — sin respuesta');
    throw e;
  } finally { clearTimeout(timer); }
}

export const db = {
  getJugadoras: function() { return sbFetch('jugadoras?select=*&order=nombre.asc'); },
  saveJugadora: function(j) {
    var b = JSON.stringify({ nombre: j.nombre, alias: j.alias || null, anio_nacimiento: j.anio_nacimiento || null, posicion: j.posicion || null });
    if (j.id) return sbFetch('jugadoras?id=eq.' + j.id, { method: 'PATCH', prefer: 'return=representation', body: b });
    return sbFetch('jugadoras', { method: 'POST', body: b });
  },
  deleteJugadora: function(id) { return sbFetch('jugadoras?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' }); },
  getEquipos: function() { return sbFetch('equipos?select=*&order=creado_en.asc'); },
  saveEquipo: function(e) {
    var b = JSON.stringify({ nombre: e.nombre, temporada: e.temporada || null, categoria: e.categoria || null });
    if (e.id) return sbFetch('equipos?id=eq.' + e.id, { method: 'PATCH', prefer: 'return=representation', body: b });
    return sbFetch('equipos', { method: 'POST', body: b });
  },
  getPlantilla: function(eid) { return sbFetch('equipo_jugadoras?equipo_id=eq.' + eid + '&select=*,jugadora:jugadoras(id,nombre,alias,posicion)'); },
  addPlantilla: function(eid, jid, dorsal) {
    return sbFetch('equipo_jugadoras', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ equipo_id: eid, jugadora_id: jid, dorsal: dorsal || null }) });
  },
  removePlantilla: function(id) { return sbFetch('equipo_jugadoras?id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' }); },
  updateDorsal: function(id, d) { return sbFetch('equipo_jugadoras?id=eq.' + id, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ dorsal: d }) }); },
  getPartidos: function() { return sbFetch('partidos?select=*&order=fecha.desc'); },
  savePartido: function(p) {
    var b = JSON.stringify({ equipo_id: p.equipo_id, rival: p.rival, formato: p.formato, temporada: p.temporada || null, competicion: p.competicion || null, categoria: p.categoria || null, fecha: p.fecha || null });
    if (p.id) return sbFetch('partidos?id=eq.' + p.id, { method: 'PATCH', prefer: 'return=representation', body: b });
    return sbFetch('partidos', { method: 'POST', body: b });
  },
  updateResult: function(id, g, l) { return sbFetch('partidos?id=eq.' + id, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ sets_ganados: g, sets_perdidos: l, completado: true }) }); },
  getConvocatoria: function(pid) { return sbFetch('partido_jugadoras?partido_id=eq.' + pid + '&select=*,jugadora:jugadoras(id,nombre,alias,posicion)'); },
  setConvocatoria: function(rows) { return sbFetch('partido_jugadoras', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows) }); },
  getStatsP: function(pid) { return Promise.all([sbFetch('stats_jugadora?partido_id=eq.' + pid + '&select=*'), sbFetch('stats_equipo?partido_id=eq.' + pid + '&select=*')]); },
  saveStats: function(rj, re) {
    var p1 = rj.length ? sbFetch('stats_jugadora', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rj) }) : Promise.resolve();
    var p2 = re.length ? sbFetch('stats_equipo', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(re) }) : Promise.resolve();
    return Promise.all([p1, p2]);
  }
};
