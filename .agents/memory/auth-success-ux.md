---
name: Auth success UX
description: Why login/register must toast and redirect after the token is stored.
---

After a successful login or register mutation, the frontend must:

1. Store the token (`login(res.token)` from AuthContext).
2. Show a confirmation toast so the user knows something happened.
3. Navigate to `/dashboard` (or another authenticated route).

**Why:** Storing the token only updates the AuthContext state; the user remains on the login/register page. Without explicit feedback or a redirect, it looks like the action did nothing, even though the app is now authenticated.

**How to apply:** Use `useLocation` from `wouter` and call `setLocation('/dashboard')` in the mutation `onSuccess` callback, alongside the toast. Keep error handling in `onError` so server messages like "Invalid credentials" are surfaced.
