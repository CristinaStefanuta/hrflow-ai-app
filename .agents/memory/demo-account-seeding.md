---
name: Demo account seeding
description: Ensure seeded demo-account password hashes match the passwords advertised to users.
---

When seeding demo users, generate the `password_hash` with the exact password the user will type. If the hash is produced with a different password or a placeholder, bcrypt will reject the correct password and the server will return `401 Invalid credentials`.

**Why:** The user sees the app as broken because they are not authenticated and the frontend previously showed no feedback on either success or failure.

**How to apply:** When seeding or resetting demo accounts, compare the hash in the runtime environment to verify `bcrypt.compare(password, hash)` returns `true` before declaring the seed valid. Document the passwords next to the demo accounts so they stay in sync.
