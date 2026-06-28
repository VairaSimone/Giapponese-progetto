import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as invitesService from '../services/invitesService';
import { queryKeys } from '../constants/queryKeys';
import { useAuthStore, selectCanManage } from '../store/authStore';

/**
 * Elenco inviti per la pagina di gestione (insegnante/admin).
 * `enabled: canManage` evita la chiamata (che riceverebbe 403) per gli studenti.
 */
export const useInvitesList = (filters = {}) => {
  const canManage = useAuthStore(selectCanManage);

  return useQuery({
    queryKey: queryKeys.invites.list(filters),
    queryFn: () => invitesService.getInvites(filters),
    enabled: canManage,
    placeholderData: (previousData) => previousData,
  });
};

/** Crea un invito studente e invalida la lista inviti. */
export const useCreateStudentInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invitesService.createStudentInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.all });
    },
  });
};

/** Crea un invito insegnante (solo admin) e invalida la lista inviti. */
export const useCreateTeacherInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invitesService.createTeacherInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.all });
    },
  });
};

/** Revoca un invito pendente e invalida la lista inviti. */
export const useRevokeInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invitesService.revokeInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.all });
    },
  });
};
