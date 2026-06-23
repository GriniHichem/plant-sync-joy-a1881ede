import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration in minutes into a human-readable "Xj Yh Zmin" string.
 * Examples: 13010 -> "9j 0h 50min", 95 -> "1h 35min", 47 -> "47 min", 0 -> "0 min".
 */
export function formatDuration(minutes?: number | null): string {
  const total = Math.round(Number(minutes ?? 0));
  if (!Number.isFinite(total) || total <= 0) return "0 min";
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins}min`);
  return parts.join(" ");
}
