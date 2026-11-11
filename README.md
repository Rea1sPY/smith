# SMITH BROTHERS — Alpha Roleplay family site
Node.js + Express + SQLite (better-sqlite3). Requires Node 18+.

1. `npm install`
2. Copy `.env.example` to `.env`; set a long random `JWT_SECRET` and the first admin (`ADMIN_USER`/`ADMIN_PASS`). Start once, then delete `ADMIN_PASS` from `.env`.
3. `npm start` → site at http://localhost:3000 , admin at http://localhost:3000/admin.html
4. Optional: put a background image at `public/bg.jpg`.
5. In production, serve behind HTTPS (e.g. Caddy/nginx) and set `COOKIE_SECURE=1`.

Back up the `data/`, `uploads/` and `private_uploads/` folders. Application screenshots are private (admins only).
Roles: Moderator (applications, announcements) · Admin (+members, rules, status, settings, deletes) · Super Admin (+admin accounts).

## Hosting on Railway
Set variables JWT_SECRET, ADMIN_USER, ADMIN_PASS, COOKIE_SECURE=1, DATA_DIR=/data and attach a Volume mounted at /data. Without a volume, data is lost on every redeploy.
