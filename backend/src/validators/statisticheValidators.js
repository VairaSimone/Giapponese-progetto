'use strict';

const { query, body } = require('express-validator');
const { ALFABETI } = require('../constants/kanaData');

/**
 * Validator delle statistiche (express-validator), usati prima del middleware
 * `validate`. Coerenti con lo stile degli altri validator del progetto.
 */

// ─────────────────────────────────────────────
// GET /api/statistiche/heatmap
// `giorni` facoltativo: finestra in giorni (7..366). Il service comunque
// normalizza/clampa, qui si rifiutano solo valori palesemente errati.
// ─────────────────────────────────────────────
const validateHeatmap = [
  query('giorni')
    .optional()
    .isInt({ min: 1, max: 366 })
    .withMessage('Il parametro giorni deve essere un intero tra 1 e 366')
    .toInt(),
];

// ─────────────────────────────────────────────
// GET /api/statistiche/caratteri-problematici
// ─────────────────────────────────────────────
const validateCaratteriProblematici = [
  query('alfabeto')
    .optional()
    .trim()
    .isIn(ALFABETI)
    .withMessage(`L'alfabeto deve essere uno di: ${ALFABETI.join(', ')}`),

  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Il parametro limite deve essere un intero tra 1 e 100')
    .toInt(),
];

// ─────────────────────────────────────────────
// POST /api/statistiche/allenamento-intensivo
// ─────────────────────────────────────────────
const validateAllenamentoIntensivo = [
  body('alfabeto')
    .optional()
    .trim()
    .isIn(ALFABETI)
    .withMessage(`L'alfabeto deve essere uno di: ${ALFABETI.join(', ')}`),

  body('limite')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Il parametro limite deve essere un intero tra 1 e 50')
    .toInt(),
];

module.exports = {
  validateHeatmap,
  validateCaratteriProblematici,
  validateAllenamentoIntensivo,
};
