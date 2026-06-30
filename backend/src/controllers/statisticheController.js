'use strict';

const catchAsync = require('../utils/catchAsync');
const statisticheService = require('../services/statisticheService');

/**
 * StatisticheController — livello sottile tra route e StatisticheService.
 * Heatmap attività, streak di studio, caratteri problematici e generazione
 * del pool di allenamento intensivo.
 */

// ─────────────────────────────────────────────
// GET /api/statistiche/heatmap?giorni=365
// Griglia dei contributi (attività per giorno).
// ─────────────────────────────────────────────
exports.heatmap = catchAsync(async (req, res) => {
  const giorni = req.query.giorni;

  const dati = await statisticheService.getHeatmap(req.user.id, giorni);

  res.status(200).json({
    status: 'success',
    data: dati,
  });
});

// ─────────────────────────────────────────────
// GET /api/statistiche/streak
// Stato della streak di studio (corrente + record + rischio).
// ─────────────────────────────────────────────
exports.streak = catchAsync(async (req, res) => {
  const dati = await statisticheService.getStreak(req.user.id);

  res.status(200).json({
    status: 'success',
    data: dati,
  });
});

// ─────────────────────────────────────────────
// GET /api/statistiche/caratteri-problematici?alfabeto=&limite=
// Caratteri su cui l'utente sbaglia di più.
// ─────────────────────────────────────────────
exports.caratteriProblematici = catchAsync(async (req, res) => {
  const { alfabeto, limite } = req.query;

  const dati = await statisticheService.getCaratteriProblematici(req.user.id, {
    alfabeto,
    limite,
  });

  res.status(200).json({
    status: 'success',
    data: dati,
  });
});

// ─────────────────────────────────────────────
// POST /api/statistiche/allenamento-intensivo
// Genera un pool di quiz mirato sui soli caratteri problematici (sola lettura,
// POST per via dei filtri facoltativi nel body).
// ─────────────────────────────────────────────
exports.allenamentoIntensivo = catchAsync(async (req, res) => {
  const { alfabeto, limite } = req.body;

  const sessione = await statisticheService.generaAllenamentoIntensivo(req.user.id, {
    alfabeto,
    limite,
  });

  res.status(200).json({
    status: 'success',
    data: { sessione },
  });
});
