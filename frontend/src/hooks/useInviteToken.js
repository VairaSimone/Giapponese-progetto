import { useQuery } from '@tanstack/react-query';
import * as invitesService from '../services/invitesService';
import { queryKeys } from '../constants/queryKeys';

/**
 * Valida un token di invito (endpoint pubblico) e restituisce i dati ereditati
 * ({ email, ruolo, classe, scadenza }) per pre-compilare il form di
 * completamento registrazione.
 *
 * `enabled: Boolean(token)` evita la chiamata quando il token è assente
 * (es. utente che apre /register senza ?token). `retry: false` perché un
 * token non valido/scaduto è un esito atteso, non un errore transitorio da
 * ritentare.
 */
export const useInviteToken = (token) =>
  useQuery({
    queryKey: queryKeys.invites.validate(token),
    queryFn: () => invitesService.validateInviteToken(token),
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });
