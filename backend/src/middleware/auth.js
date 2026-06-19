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
const authenticateJWT = (req, res, next) => {
  try {
    // 1. Recupera il token dai cookie (o dall'header come fallback)
    let token;
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Non sei autenticato. Effettua il login per accedere.', 401));
    }

    // 2. Verifica la validità e la firma del token
    const decoded = jwt.verify(token, jwtConfig.accessSecret);

    // 3. VANTAGGIO DELLO STATELESS: Nessuna query al DB!
    // Popoliamo req.user solo con le informazioni presenti nel payload del JWT
    req.user = {
      id: decoded.id,
      ruolo: decoded.ruolo
    };

    next();
  } catch (err) {
    // Gestione specifica degli errori di JWT (scadenza o manomissione)
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Il tuo token è scaduto. Effettua nuovamente il login.', 401));
    }
    return next(new AppError('Token non valido. Autenticazione fallita.', 401));
  }
};
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
