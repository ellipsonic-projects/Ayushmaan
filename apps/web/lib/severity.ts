export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// Sequential warm scale — each level visually distinct so severity reads at a glance:
// LOW (calm blue) -> MEDIUM (caution amber) -> HIGH (warning orange) -> CRITICAL (danger red).
export const severityTextClass: Record<Severity, string> = {
  LOW: "text-blue-600 dark:text-blue-400",
  MEDIUM: "text-amber-600 dark:text-amber-500",
  HIGH: "text-orange-600 dark:text-orange-500",
  CRITICAL: "text-red-600 dark:text-red-500",
};

export const severityDotClass: Record<Severity, string> = {
  LOW: "bg-blue-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-600",
};

export const severityBorderClass: Record<Severity, string> = {
  LOW: "border-l-blue-500",
  MEDIUM: "border-l-amber-500",
  HIGH: "border-l-orange-500",
  CRITICAL: "border-l-red-500",
};

export const severityBadgeClass: Record<Severity, string> = {
  LOW: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-500",
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-500",
};
