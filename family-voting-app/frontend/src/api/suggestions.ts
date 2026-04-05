import client from "./client";
import type { Suggestion, SuggestPollPayload, SuggestOptionPayload } from "../types";

export async function getSuggestions(
  familyId: number,
  status: string = "pending"
): Promise<Suggestion[]> {
  const { data } = await client.get<Suggestion[]>("/api/suggestions", {
    params: { family_id: familyId, status },
  });
  return data;
}

export async function suggestPoll(payload: SuggestPollPayload): Promise<Suggestion> {
  const { data } = await client.post<Suggestion>("/api/suggestions/poll", payload);
  return data;
}

export async function suggestOption(payload: SuggestOptionPayload): Promise<Suggestion> {
  const { data } = await client.post<Suggestion>("/api/suggestions/option", payload);
  return data;
}

export async function resolveSuggestion(
  id: number,
  action: "approve" | "reject"
): Promise<Suggestion> {
  const { data } = await client.post<Suggestion>(`/api/suggestions/${id}/resolve`, {
    action,
  });
  return data;
}

export async function deleteSuggestion(id: number): Promise<void> {
  await client.delete(`/api/suggestions/${id}`);
}
