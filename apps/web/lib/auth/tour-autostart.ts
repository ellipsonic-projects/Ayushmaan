// Marks that the in-app tour should auto-start once, right after the
// account is provisioned for the first time (signup-form.tsx and
// auth/complete-profile/page.tsx, the two places that call
// register-profile/register-tenant for a brand-new user). TourProvider
// consumes-and-clears this on the very next mount, so the tour never
// auto-starts again on subsequent logins — only a manual "Take a Tour"
// click can restart it after that.
const KEY = "ayushman.tour-autostart-pending";

export function markTourAutostartPending() {
  sessionStorage.setItem(KEY, "1");
}

export function consumeTourAutostartPending(): boolean {
  const pending = sessionStorage.getItem(KEY) === "1";
  if (pending) sessionStorage.removeItem(KEY);
  return pending;
}
