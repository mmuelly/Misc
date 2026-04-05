import client from "./client";
import type { Poll, PollWithVotes, HistoryEntry, CreatePollPayload, UpdatePollPayload } from "../types";

export async function getPolls(familyId: number): Promise<PollWithVotes[]> {
  const { data } = await client.get<PollWithVotes[]>("/api/polls", {
    params: { family_id: familyId },
  });
  return data;
}

export async function getPoll(id: number): Promise<PollWithVotes> {
  const { data } = await client.get<PollWithVotes>(`/api/polls/${id}`);
  return data;
}

export async function createPoll(payload: CreatePollPayload): Promise<Poll> {
  const { data } = await client.post<Poll>("/api/polls", payload);
  return data;
}

export async function updatePoll(id: number, payload: UpdatePollPayload): Promise<Poll> {
  const { data } = await client.patch<Poll>(`/api/polls/${id}`, payload);
  return data;
}

export async function deletePoll(id: number): Promise<void> {
  await client.delete(`/api/polls/${id}`);
}

export async function getPollHistory(id: number): Promise<HistoryEntry[]> {
  const { data } = await client.get<HistoryEntry[]>(`/api/polls/${id}/history`);
  return data;
}
