import client from "./client";
import type { AuthResponse, User } from "../types";

export async function googleLogin(token: string): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/api/auth/google", { token });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>("/api/auth/me");
  return data;
}
