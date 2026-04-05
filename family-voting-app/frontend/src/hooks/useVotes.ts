import { useMutation, useQueryClient } from "@tanstack/react-query";
import { castVote, retractVote } from "../api/votes";

export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollOptionId }: { pollOptionId: number; pollId: number }) =>
      castVote(pollOptionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["poll", variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useRetractVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ voteId }: { voteId: number; pollId: number }) =>
      retractVote(voteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["poll", variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}
