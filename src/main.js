import './style.css';

import { switchScreen, showToast } from './nav.js';
import { saveLocal, loadLocal, clearLocal } from './storage.js';
import { renderEquipos, renderJugadoras, renderPartidos, showEqHistory } from './hub.js';
import {
  openModalJugadora, closeModalJugadora, saveJugadora, deleteJugadora,
  openModalEquipo, closeModalEquipo, saveEquipo, deleteEquipo, openAddToPlantilla,
  openModalPartido, closeModalPartido, savePartido, deletePartido, onEquipoChange,
  openAddToConvocatoria, iniciarPartidoDesdeModal,
  openPicker, closePicker, closePickerModal,
  openRosterModal, closeRosterModal,
  openScoreEdit, closeScoreEdit, applyScoreEdit, setupScoreLongPress,
  discardRecover
} from './modals.js';
import {
  logStat, undoLast,
  setServe, updateServerRow, setModoRally, updateStatPanel,
  renderPlayerSelector,
  updateMatchUI, updateScoreUI, renderSetDots,
  showStats, showMatch, switchStatTab,
  checkSetEnd, endSet, endSetManual, nextSet, finishMatch,
  renderStats, exportStats, bumpScore
} from './match.js';
import { openSubForLineup, openSub, closeSub, applySub } from './sub.js';
import {
  openConsulta, setConsultaMode, renderConsultaFilters,
  onConsultaPartidoChange, renderConsultaPartido,
  renderConsultaJugadora, viewStatsPartido
} from './stats.js';
import { init, loadData, startById, recoverMatch } from './init.js';

// Expose everything to window so inline onclick handlers work
Object.assign(window, {
  switchScreen, showToast,
  saveLocal, loadLocal, clearLocal,
  renderEquipos, renderJugadoras, renderPartidos, showEqHistory,
  openModalJugadora, closeModalJugadora, saveJugadora, deleteJugadora,
  openModalEquipo, closeModalEquipo, saveEquipo, deleteEquipo, openAddToPlantilla,
  openModalPartido, closeModalPartido, savePartido, deletePartido, onEquipoChange,
  openAddToConvocatoria, iniciarPartidoDesdeModal,
  openPicker, closePicker, closePickerModal,
  openRosterModal, closeRosterModal,
  openScoreEdit, closeScoreEdit, applyScoreEdit, setupScoreLongPress,
  discardRecover,
  logStat, undoLast,
  setServe, updateServerRow, setModoRally, updateStatPanel,
  renderPlayerSelector,
  updateMatchUI, updateScoreUI, renderSetDots,
  showStats, showMatch, switchStatTab,
  checkSetEnd, endSet, endSetManual, nextSet, finishMatch,
  renderStats, exportStats, bumpScore,
  openSubForLineup, openSub, closeSub, applySub,
  openConsulta, setConsultaMode, renderConsultaFilters,
  onConsultaPartidoChange, renderConsultaPartido,
  renderConsultaJugadora, viewStatsPartido,
  init, loadData, startById, recoverMatch
});

setupScoreLongPress();
init();
