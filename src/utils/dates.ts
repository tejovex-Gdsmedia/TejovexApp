// Human-readable relative time, for example "3 days ago" or "in 2 hours".
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);

  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = abs;
  let unit = "second";
  for (const [amount, name] of units) {
    if (value < amount) {
      unit = name;
      break;
    }
    value = Math.floor(value / amount);
    unit = name;
  }

  const rounded = Math.max(1, Math.round(value));
  const plural = rounded === 1 ? unit : `${unit}s`;

  if (abs < 30) return "just now";
  return diffSec < 0 ? `${rounded} ${plural} ago` : `in ${rounded} ${plural}`;
}

// "Jan 5, 2026, 3:30 PM"
export function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "Jan 5, 2026"
export function formatDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
