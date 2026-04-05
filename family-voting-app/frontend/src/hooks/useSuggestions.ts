import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSuggestions,
  suggestPoll,
  suggestOption,
  resolveSuggestion,
  deleteSuggestion,
} from "../api/suggestions";
import type { SuggestPollPayload, SuggestOptionPayload } from "../types";

export function useSuggestions(familyId: number | null, status: string = "pending") {
  return useQuery({
    queryKey: ["suggestions", familyId, status],
    queryFn: () => getSuggestions(familyId!, status),
    enabled: !!familyId,
  });
}

export function useSuggestPoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SuggestPollPayload) => suggestPoll(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useSuggestOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SuggestOptionPayload) => suggestOption(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      queryClient.invalidateQueries({ queryKey: ["poll"] });
    },
  });
}

export function useResolveSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      resolveSuggestion(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      queryClient.invalidateQueries({ queryKey: ["poll"] });
    },
  });
}

export function useDeleteSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSuggestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}
