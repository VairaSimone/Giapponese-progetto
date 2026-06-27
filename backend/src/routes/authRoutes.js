'use strict';

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { passport, isGoogleConfigured } = require('../config/passport');

const { authenticateJWT } = require('../middleware/auth');
const {
  loginLimiter,
  forgotPasswordLimiter,
  registerLimiter,
  refreshLimiter,
  resendVerificationLimiter,
  teacherRequestLimiter,
} = require('../middleware/rateLimiter');
const { csrfProtection } = require('../middleware/csrf');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const {
  validateRegisterStudent,
  validateRegisterTeacher,
  validateTeacherRequest,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  validateVerifyEmail,
  validateResendVerification,
} = require('../validators/authValidators');

// ─────────────────────────────────────────────
// Route di AUTENTICAZIONE
// La registrazione pubblica libera è stata RIMOSSA: gli studenti si
// registrano solo tramite invito, gli insegnanti tramite candidatura
// (approvazione admin) o invito diretto dell'admin.
// ─────────────────────────────────────────────

// Registrazione su invito / candidatura (pubbliche ma "gated")
router.post('/register-student', registerLimiter, validateRegisterStudent, validate, authController.registerStudent);
router.post('/register-teacher', registerLimiter, validateRegisterTeacher, validate, authController.registerTeacher);
router.post('/teacher-request', teacherRequestLimiter, validateTeacherRequest, validate, authController.teacherRequest);

// Pubbliche
router.post('/login', loginLimiter, validateLogin, validate, authController.login);
router.post('/refresh-token', refreshLimiter, validateRefreshToken, validate, authController.refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, validate, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, validate, authController.resetPassword);
router.post('/verify-email', validateVerifyEmail, validate, authController.verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, validateResendVerification, validate, authController.resendVerification);

// Protette
router.post('/logout', authenticateJWT, csrfProtection, authController.logout);
router.get('/me', authenticateJWT, authController.me);

// ─────────────────────────────────────────────
// GOOGLE OAUTH 2.0
// Disponibili solo se la strategia è configurata (env presenti).
// ─────────────────────────────────────────────
const requireGoogleConfigured = (req, res, next) => {
  if (!isGoogleConfigured) {
    return next(new AppError('Login con Google non disponibile.', 503, 'GOOGLE_OAUTH_DISABLED'));
  }
  next();
};

router.get(
  '/google',
  requireGoogleConfigured,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  requireGoogleConfigured,
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/google/failure',
  }),
  authController.googleCallback
);

router.get('/google/failure', authController.googleFailure);

module.exports = router;
