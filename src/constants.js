export const META = {
  rival_error:           { label:'Fallo rival',       point:true,  us:true,  team:true,  serve:false },
  ace:                   { label:'Punto saque',        point:true,  us:true,  team:false, serve:true  },
  kill:                  { label:'Punto remate',       point:true,  us:true,  team:false, serve:false },
  block:                 { label:'Punto bloqueo',      point:true,  us:true,  team:false, serve:false },
  tip:                   { label:'Punto finta',        point:true,  us:true,  team:false, serve:false },
  serve_error:           { label:'Fallo saque',        point:true,  us:false, team:false, serve:true  },
  reception_serve_error: { label:'F.Rec. saque rival', point:true,  us:false, team:false, serve:false },
  reception_error:       { label:'Fallo recepción',    point:true,  us:false, team:false, serve:false },
  attack_error:          { label:'Fallo remate',       point:true,  us:false, team:false, serve:false },
  net_fault:             { label:'Falta red',          point:true,  us:false, team:false, serve:false },
  blockout:              { label:'Blockout',           point:true,  us:false, team:false, serve:false },
  general_error:         { label:'Fallo general',      point:true,  us:false, team:true,  serve:false },
  serve_count:           { label:'Saque',              point:false, us:false, team:false, serve:true,  hidden:true }
};

export const POSL = { colocadora:'Colocadora', opuesta:'Opuesta', central:'Central', libero:'Líbero', receptora:'Receptora' };
export const CATL = { benjamin:'Benjamín', alevin:'Alevín', infantil:'Infantil', cadete:'Cadete', juvenil:'Juvenil', senior:'Sénior' };

export const LS = 'voley_v3';

export function posBadge(pos, small) {
  return pos
    ? '<span class="badge bpos" data-p="' + pos + '"' + (small ? ' style="font-size:9px"' : '') + '>' + (POSL[pos] || pos) + '</span>'
    : '';
}

export function mkState() {
  return {
    partidoId: null, teamName: '', rivalName: '', format: 3, categoria: null,
    onCourt: [], activePlayer: null, pinnedPlayer: null, serveTeam: null,
    currentServer: null,
    setNum: 1, setsUs: 0, setsThem: 0, scoreUs: 0, scoreThem: 0,
    setHistory: [], stats: {}, statsBySet: {},
    teamStats: { rival_error: 0, general_error: 0 }, teamStatsBySet: {},
    log: [], matchOver: false
  };
}

export function courtSize(categoria) {
  return (categoria === 'cadete' || categoria === 'juvenil' || categoria === 'senior') ? 7 : 6;
}
