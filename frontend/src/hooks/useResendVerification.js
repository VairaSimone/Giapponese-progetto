import { useMutation } from '@tanstack/react-query';
import * as authService from '../services/authService';

/**
 * Mutation per il re-invio dell'email di verifica.
 *
 * Il backend risponde SEMPRE con 200 e messaggio generico, sia che
 * l'account esista e non sia verificato, sia che non esista o sia già
 * verificato (anti user-enumeration). Per questo motivo la UI non deve mai
 * distinguere i casi: mostra un unico esito di "richiesta presa in carico".
 */
export const useResendVerification = () => {
  return useMutation({
    mutationFn: authService.resendVerification,
  });
};
