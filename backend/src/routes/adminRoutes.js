'use strict';

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');

const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const validate = require('../middleware/validate');

const {
  validateIdParam,
  validateRifiutaCandidatura,
} = require('../validators/authValidators');

/**
 * Route AMMINISTRATIVE — montate sotto `/api/admin`.
 * Tutte richiedono ruolo `admin`.
 *
 *   GET  /api/admin/teacher-requests              → elenco candidature insegnante
 *   POST /api/admin/teacher-requests/:id/approve  → approva insegnante
 *   POST /api/admin/teacher-requests/:id/reject   → rifiuta candidatura
 */

router.use(authenticateJWT, authorizeRoles('admin'));

router.get('/teacher-requests', adminController.elencoCandidature);

router.post(
  '/teacher-requests/:id/approve',
  csrfProtection,
  validateIdParam,
  validate,
  adminController.approvaCandidatura
);

router.post(
  '/teacher-requests/:id/reject',
  csrfProtection,
  validateRifiutaCandidatura,
  validate,
  adminController.rifiutaCandidatura
);

module.exports = router;
