'use strict';

const express = require('express');
const router = express.Router();

const inviteController = require('../controllers/inviteController');

const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const { inviteLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const {
  validateInvitoStudente,
  validateInvitoInsegnante,
  validateInviteTokenParam,
  validateIdParam,
} = require('../validators/authValidators');

/**
 * Route di gestione INVITI — montate sotto `/api/invites`.
 *
 *   POST   /api/invites/student          → insegnante|admin crea invito studente
 *   POST   /api/invites/teacher          → admin crea invito insegnante (onboarding)
 *   GET    /api/invites/validate/:token  → PUBBLICA: valida/precompila il form
 *   GET    /api/invites                  → insegnante|admin: elenco inviti
 *   DELETE /api/invites/:id              → autore|admin: revoca invito
 */

// ── PUBBLICA: validazione token per il frontend (nessuna autenticazione) ──
router.get('/validate/:token', validateInviteTokenParam, validate, inviteController.validaToken);

// ── Protette ──
router.post(
  '/student',
  authenticateJWT,
  csrfProtection,
  authorizeRoles('insegnante', 'admin'),
  inviteLimiter,
  validateInvitoStudente,
  validate,
  inviteController.creaInvitoStudente
);

router.post(
  '/teacher',
  authenticateJWT,
  csrfProtection,
  authorizeRoles('admin'),
  inviteLimiter,
  validateInvitoInsegnante,
  validate,
  inviteController.creaInvitoInsegnante
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('insegnante', 'admin'),
  inviteController.elencoInviti
);

router.delete(
  '/:id',
  authenticateJWT,
  csrfProtection,
  authorizeRoles('insegnante', 'admin'),
  validateIdParam,
  validate,
  inviteController.revocaInvito
);

module.exports = router;
