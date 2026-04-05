import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPolls, getPoll, createPoll, updatePoll, deletePoll, getPollHistory } from "../api/polls";
import type { CreatePollPayload, UpdatePollPayload } from "../types";

export function usePolls(familyId: number | null) {
  return useQuery({
    queryKey: ["polls", familyId],
    queryFn: () => getPolls(familyId!),
    enabled: !!familyId,
  });
}

export function usePoll(pollId: number | undefined) {
  return useQuery({
    queryKey: ["poll", pollId],
    queryFn: () => getPoll(pollId!),
    enabled: !!pollId,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePollPayload) => createPoll(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["polls", variables.family_id] });
    },
  });
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePollPayload }) =>
      updatePoll(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["poll", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePoll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function usePollHistory(pollId: number | undefined) {
  return useQuery({
    queryKey: ["pollHistory", pollId],
    queryFn: () => getPollHistory(pollId!),
    enabled: !!pollId,
  });
}
