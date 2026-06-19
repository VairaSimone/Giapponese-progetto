'use strict';

const { verifyAccessToken } = require('../utils/jwtHelpers');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const Utente = require('../models/Utente');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
/**
 * Middleware di autenticazione JWT.
 *
 * Funzionamento:
 * 1. Legge il Bearer token dall'header Authorization
 * 2. Verifica la firma e la scadenza
 * 3. Cerca l'utente nel DB per assicurarsi che esista ancora
 * 4. Inietta l'utente in req.user per i controller successivi
 */
const authenticateJWT = catchAsync(async (req, res, next) => {
  // 1. Leggi il token dai cookie anziché dagli header
  const token = req.cookies.access_token;

  if (!token) {
    return next(new AppError('Non sei autenticato. Effettua il login per accedere.', 401));
  }

  // 2. Verifica la firma del JWT
  const decoded = jwt.verify(token, jwtConfig.accessSecret);

  // 3. Controlla se l'utente esiste ancora e ottieni il token_version
  const utente = await Utente.findByPk(decoded.id);
  if (!utente) {
    return next(new AppError("L'utente a cui appartiene questo token non esiste più.", 401));
  }

  // 4. VERIFICA LA VERSIONE DEL TOKEN (Invalidazione al logout)
  if (decoded.token_version !== utente.token_version) {
    return next(new AppError("Token non più valido (sessione terminata o password cambiata).", 401));
  }

  // Se tutto ok, inietta l'utente
  req.user = utente;
  next();
});

/**
 * Middleware di autorizzazione basato sui ruoli.
 * Da usare DOPO authenticateJWT.
 *
 * Uso: authorizeRoles('insegnante', 'admin')
 */
const authorizeRoles = (...ruoliConsentiti) => {
  return (req, res, next) => {
    if (!ruoliConsentiti.includes(req.user.ruolo)) {
      return next(
        new AppError(
          `Accesso negato. Ruolo '${req.user.ruolo}' non autorizzato per questa operazione.`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRoles };
