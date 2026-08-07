// Carries the mode (+ any org fields already typed) picked on the signup
// form's Individual/Organization toggle across the Google OAuth redirect, so
// app/auth/complete-profile doesn't ask the user to pick it a second time.
// sessionStorage survives the redirect (same tab, same origin on return)
// but not a fresh tab/window, which is the intended fallback: complete-profile
// shows its own toggle when this is absent.
const KEY = "ayushman.signup-intent";

export interface SignupIntent {
  mode: "individual" | "organization";
  displayName?: string;
  slug?: string;
  address?: string;
}

export function saveSignupIntent(intent: SignupIntent) {
  sessionStorage.setItem(KEY, JSON.stringify(intent));
}

export function consumeSignupIntent(): SignupIntent | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as SignupIntent;
  } catch {
    return null;
  }
}
