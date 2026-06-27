'use strict';

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Configurazione Passport per il login con Google OAuth 2.0.
 *
 * Strategia STATELESS (`session: false`): non si usano sessioni server né
 * `serializeUser`/`deserializeUser`. Al termine del flusso la strategia
 * restituisce direttamente i token applicativi (access + refresh), coerenti
 * con il resto del sistema basato su cookie httpOnly + JWT.
 *
 * La strategia viene registrata SOLO se le variabili d'ambiente Google sono
 * presenti, così l'app continua ad avviarsi anche senza credenziali OAuth
 * (le route /google rispondono 503 quando non configurate).
 */

const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:3000/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const emailVerificata =
            profile.emails && profile.emails[0] ? profile.emails[0].verified !== false : false;

          const { utente, accessToken: appAccess, refreshToken: appRefresh } =
            await authService.loginOrLinkGoogle({
              googleId: profile.id,
              email,
              emailVerificata,
            });

          // L'oggetto restituito popola req.user nel callback controller.
          return done(null, {
            id: utente.id,
            accessToken: appAccess,
            refreshToken: appRefresh,
          });
        } catch (err) {
          logger.error(`Errore durante l'autenticazione Google: ${err.message}`);
          return done(err);
        }
      }
    )
  );

  logger.info('✅ Strategia Google OAuth 2.0 configurata.');
} else {
  logger.warn('⚠️  Google OAuth non configurato (GOOGLE_CLIENT_ID/SECRET mancanti). Le route /google sono disabilitate.');
}

module.exports = { passport, isGoogleConfigured };
