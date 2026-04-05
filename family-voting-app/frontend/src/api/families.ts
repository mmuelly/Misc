import client from "./client";
import type { Family } from "../types";

export async function createFamily(name: string): Promise<Family> {
  const { data } = await client.post<Family>("/api/families", { name });
  return data;
}

export async function getFamily(id: number): Promise<Family> {
  const { data } = await client.get<Family>(`/api/families/${id}`);
  return data;
}

export async function joinFamily(invite_code: string): Promise<Family> {
  const { data } = await client.post<Family>("/api/families/join", { invite_code });
  return data;
}

export async function updateFamily(id: number, name: string): Promise<Family> {
  const { data } = await client.patch<Family>(`/api/families/${id}`, { name });
  return data;
}

export async function removeFamilyMember(familyId: number, userId: number): Promise<void> {
  await client.delete(`/api/families/${familyId}/members/${userId}`);
}
