import { startOfWeek, format } from "date-fns";

export function getCurrentWeekMonday(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function getDayName(dayNum: number): string {
  return dayNames[dayNum] ?? "Unknown";
}
