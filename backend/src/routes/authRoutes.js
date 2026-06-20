'use strict';

const express = require('express');
const router = express.Router();

// Controller
const authController = require('../controllers/authController');

// Middleware
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

// Validatori
const {
  validateRegistrazione,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangeEmail,
  validateRefreshToken,
  validateVerifyEmail,
} = require('../validators/authValidators');


// Route pubbliche (non richiedono autenticazione)
router.post('/register', validateRegistrazione, validate, authController.register);
router.post('/login', loginLimiter, validateLogin, validate, authController.login);
router.post('/refresh-token', validateRefreshToken, validate, authController.refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, validate, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, validate, authController.resetPassword);
router.post('/verify-email', validateVerifyEmail, validate, authController.verifyEmail);
// Route protette (richiedono access token valido)
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.me);
router.delete('/me', authenticateJWT, authController.deleteMe); 
router.post('/request-email-change', authenticateJWT, validateChangeEmail, validate, authController.requestEmailChange);
router.get('/confirm-email-change', authController.confirmEmailChange);
router.patch('/me/lingua', authenticateJWT, authController.updateLanguage);
router.get('/gestione/utenti', authenticateJWT, authorizeRoles('insegnante'), authController.getAllUsers);
router.patch('/gestione/utenti/:id/ruolo', authenticateJWT, authorizeRoles('insegnante'), authController.updateUserRole);
router.delete('/gestione/utenti/:id', authenticateJWT, authorizeRoles('insegnante'), authController.deleteUserByTeacher);
module.exports = router;
