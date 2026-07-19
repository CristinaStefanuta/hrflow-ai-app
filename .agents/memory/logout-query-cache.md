---
name: Logout must clear the user query
description: Why logout needs to remove the cached user query, not just the token.
---

The `useGetMe` query is enabled only when a token exists. Disabling the query by removing the token does **not** clear its cached data — React Query keeps the previous user object. Because the AuthContext derives `user` from that cached data, the UI stays authenticated and the `AuthGuard` never redirects.

**Why:** Token removal alone leaves stale user data in the cache, so logout appears to do nothing.

**How to apply:** In the logout handler, remove the `getMe` query from the cache (`queryClient.removeQueries({ queryKey: getGetMeQueryKey() })`) in addition to clearing the token. Then navigate to `/login` (or rely on the AuthGuard) so the user is returned to the public auth page.
