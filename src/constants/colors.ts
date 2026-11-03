import { Status, Priority } from "../types/task";

// Tejovex brand palette: soft off-white base with the logo's blue/cyan/red
// used only as accents (see AGENTS.md redesign brief).
export const colors = {
  background: "#F8FAFC",
  backgroundAlt: "#EEF3FB",
  card: "#FFFFFF",
  text: "#1E293B",
  muted: "#64748B",
  primary: "#0E7AD6", // Tejovex cyan/blue
  primaryDeep: "#13227A", // Tejovex deep blue
  accent: "#E11D2E", // Tejovex red
  lavender: "#EEEAFB",
  white: "#FFFFFF",
  border: "#E6EBF4",
  danger: "#B91C1C",
  // Darkened from the usual Tailwind amber/emerald so text on a white
  // card still clears WCAG AA (4.5:1) for body-sized text.
  status: {
    pending: "#6B7280",
    in_progress: "#B45309",
    complete: "#047857",
  } as Record<Status, string>,
  priority: {
    low: "#047857",
    medium: "#B45309",
    high: "#B91C1C",
  } as Record<Priority, string>,
};
