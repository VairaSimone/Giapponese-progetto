import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminService from '../services/adminService';
import { queryKeys } from '../constants/queryKeys';
import { useAuthStore, selectIsAdmin } from '../store/authStore';

/**
 * Elenco candidature insegnante per il pannello admin.
 * `enabled: isAdmin` evita la chiamata (403) per i non-admin.
 */
export const useTeacherRequestsList = (filters = {}) => {
  const isAdmin = useAuthStore(selectIsAdmin);

  return useQuery({
    queryKey: queryKeys.teacherRequests.list(filters),
    queryFn: () => adminService.getTeacherRequests(filters),
    enabled: isAdmin,
    placeholderData: (previousData) => previousData,
  });
};

/** Approva una candidatura insegnante e invalida la lista. */
export const useApproveTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.approveTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherRequests.all });
      // L'utente approvato compare ora tra gli utenti attivi.
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

/** Rifiuta una candidatura insegnante e invalida la lista. */
export const useRejectTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.rejectTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherRequests.all });
    },
  });
};
