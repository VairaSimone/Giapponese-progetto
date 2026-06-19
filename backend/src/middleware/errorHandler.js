'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
// Gestori specifici per errori di terze parti
// ─────────────────────────────────────────────

/** Sequelize: violazione di unique constraint (es. email duplicata) */
const handleSequelizeUniqueError = (err) => {
  const field = err.errors?.[0]?.path || 'campo';
  // Personalizziamo il messaggio per renderlo più leggibile all'utente finale
  const messaggio = field === 'email' 
    ? 'Questo indirizzo email è già registrato. Scegline un altro.' 
    : `Valore duplicato per il campo: ${field}`;
    
  return new AppError(messaggio, 409, 'DUPLICATE_VALUE');
};

/** Sequelize: errore di validazione del modello */
const handleSequelizeValidationError = (err) => {
  const messages = err.errors.map((e) => e.message).join('. ');
  return new AppError(`Dati non validi: ${messages}`, 400, 'VALIDATION_ERROR');
};

/** JWT: token malformato o manomesso */
const handleJWTError = () =>
  new AppError('Token non valido. Autenticazione fallita.', 401, 'INVALID_TOKEN');

/** JWT: token scaduto */
const handleJWTExpiredError = () =>
  new AppError('Il tuo token è scaduto. Effettua nuovamente il login o il refresh.', 401, 'TOKEN_EXPIRED');

// ─────────────────────────────────────────────
// Formattatori di risposta
// ─────────────────────────────────────────────

/** In sviluppo: mostra stack trace e tutti i dettagli */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    code: err.code,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

/** In produzione: solo informazioni sicure da esporre al client */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // Errore atteso: possiamo dire qualcosa di utile al client
    return res.status(err.statusCode).json({
      status: err.status,
      code: err.code,
      message: err.message,
    });
  }

  // Errore di programmazione (bug): non esporre dettagli interni
  logger.error('ERRORE NON OPERAZIONALE:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Si è verificato un errore interno. Riprova più tardi.',
  });
};

// ─────────────────────────────────────────────
// Middleware principale
// ─────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  // Spostiamo la conversione in cima, così vale sia per DEV che per PROD
  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;
  error.stack = err.stack;

  if (error.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueError(error);
  if (error.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Imposta valori di default se mancanti dopo la conversione
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Log dell'errore
  if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} ${error.message}`, {
      path: req.path,
      method: req.method,
      stack: error.stack,
    });
  } else {
    logger.warn(`${error.statusCode} ${error.message}`, {
      path: req.path,
      method: req.method,
    });
  }

  // Invio della risposta in base all'ambiente
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;