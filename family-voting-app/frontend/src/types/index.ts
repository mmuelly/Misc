export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface FamilyMember {
  id: number;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  joined_at: string;
}

export interface Family {
  id: number;
  name: string;
  invite_code: string;
  created_at: string;
  members?: FamilyMember[];
}

export interface PollOption {
  id: number;
  label: string;
  poll_id: number;
}

export interface Poll {
  id: number;
  family_id: number;
  title: string;
  category: "activity" | "meal" | "custom";
  description: string | null;
  options: PollOption[];
  reset_day: number;
  reset_time: string;
  reset_timezone: string;
  created_at: string;
}

export interface Voter {
  user_id: number;
  display_name: string;
  avatar_url: string | null;
}

export interface VoteOption {
  option_id: number;
  label: string;
  vote_count: number;
  voters: Voter[];
}

export interface VotesResponse {
  poll_id: number;
  week_of: string;
  options: VoteOption[];
}

export interface PollWithVotes extends Poll {
  votes?: VotesResponse;
}

export interface HistoryEntry {
  week_of: string;
  options: VoteOption[];
}

export interface CreatePollPayload {
  family_id: number;
  title: string;
  category: string;
  description?: string;
  options: { label: string }[];
  reset_day: number;
  reset_time: string;
  reset_timezone: string;
}

export interface UpdatePollPayload {
  title?: string;
  category?: string;
  description?: string;
  options?: { label: string }[];
  reset_day?: number;
  reset_time?: string;
  reset_timezone?: string;
}
