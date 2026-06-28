import { useMutation } from '@tanstack/react-query';
import * as authService from '../services/authService';

/**
 * Completamento registrazione studente da invito. Non effettua login
 * automatico: al successo l'account è attivo e l'utente può autenticarsi.
 */
export const useRegisterStudent = () =>
  useMutation({ mutationFn: authService.registerStudent });

/** Completamento registrazione insegnante da invito (onboarding admin). */
export const useRegisterTeacher = () =>
  useMutation({ mutationFn: authService.registerTeacher });

/**
 * Candidatura insegnante (self-service). Al successo l'account resta
 * 'in_attesa': l'utente NON può ancora effettuare il login (lo comunica la UI).
 */
export const useTeacherRequest = () =>
  useMutation({ mutationFn: authService.teacherRequest });
