import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/authService';
import { useAuthStore } from '../store/authStore';

/**
 * Mutation di logout. Pulisce sia lo store Zustand che l'intera cache di
 * React Query (tutti i dati protetti, incluse liste utenti per insegnanti,
 * non devono sopravvivere al logout — specie su dispositivi condivisi).
 *
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearUser();
      queryClient.clear();
    },
  });
};
