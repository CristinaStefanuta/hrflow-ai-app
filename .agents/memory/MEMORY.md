# Memory

- [Auth success UX](auth-success-ux.md) — storing the JWT is not enough; login/register must also toast and navigate to the dashboard.
- [Demo account seeding](demo-account-seeding.md) — verify seeded bcrypt hashes match the documented passwords, or login fails silently from the user’s view.
- [Logout must clear the user query](logout-query-cache.md) — removing the token isn’t enough; stale cached user data keeps the UI logged in.
