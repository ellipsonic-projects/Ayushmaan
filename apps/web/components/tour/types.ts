export type TourRole = "client" | "consultant" | "admin" | "superadmin";

export interface TourStep {
  target: string; // CSS selector for the element to spotlight
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  // Path relative to the role's base path (e.g. "/dashboard", "/cases/:id").
  // If set and the current route doesn't match, the tour pauses with a
  // "Navigate to X" prompt until the route changes to match.
  route?: string;
}
