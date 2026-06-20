'use strict';

const { verifyAccessToken } = require('../utils/jwtHelpers');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const Utente = require('../models/Utente');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const authenticateJWT = (req, res, next) => {
  try {

    let token;
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Non sei autenticato. Effettua il login per accedere.', 401));
    }

   
const decoded = jwt.verify(token, jwtConfig.access.secret);
    req.user = {
      id: decoded.id,
      ruolo: decoded.ruolo
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Il tuo token è scaduto. Effettua nuovamente il login.', 401));
    }
    return next(new AppError('Token non valido. Autenticazione fallita.', 401));
  }
};


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
