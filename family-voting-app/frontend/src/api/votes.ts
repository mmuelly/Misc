import client from "./client";

export async function castVote(pollOptionId: number): Promise<{ id: number }> {
  const { data } = await client.post<{ id: number }>("/api/votes", {
    poll_option_id: pollOptionId,
  });
  return data;
}

export async function retractVote(voteId: number): Promise<void> {
  await client.delete(`/api/votes/${voteId}`);
}
