# Session Summary: Feedback Management System

Paste this file (or its contents) into a new chat to continue.

## Project
Mini project topic #2: Feedback Management System. Full-stack web app with CRUD. Roles: Admin and User.
Stack: Node.js + Express, SQLite (better-sqlite3), JWT + bcryptjs, vanilla HTML/CSS/JS, Chart.js (CDN).

## Done
- `PRD.md` - requirements, data model, API outline, pages.
- Backend: `server.js`, `db.js`, `package.json` - all endpoints from the PRD (auth, forms CRUD, questions CRUD, submit response once per form, list/delete responses, summary, my submissions). Default admin seeded: admin@example.com / admin123.
- Frontend in `public/`: `index.html` (login/register), `user.html` (list forms, fill form, my submissions), `admin.html` (form CRUD, question builder, responses table, summary with Chart.js pie/bar), `app.js` (api helper, auth, escaping), `style.css`.
- `README.md`, `.gitignore`.
- Syntax checks passed (`node --check` on backend and on every page's inline script).

## NOT done / known gaps
- **Never run or tested.** `npm install` failed in the build sandbox: network policy blocked `registry.npmjs.org` (HTTP 403 from the egress proxy). So no end-to-end test happened yet.
- No automated tests.
- Optional extras not built: CSV export, anonymous feedback, form deadlines, password change, pagination.
- `JWT_SECRET` falls back to a dev default; set `JWT_SECRET` env var for real use.

## Next steps
1. On your own machine: `npm install && npm start`, open http://localhost:3000.
2. Smoke test: log in as admin, create a form with one question of each type, activate it; register a user, submit; check Responses and Summary as admin; confirm a second submission is rejected.
3. Fix anything that breaks (most likely places: better-sqlite3 install on your Node version, Chart.js CDN needs internet).
4. Optional: add extras above, screenshots, and a short project report (abstract, ER diagram, screenshots) for submission.

## File list
PRD.md, README.md, SUMMARY.md, package.json, db.js, server.js, .gitignore, public/{index.html, admin.html, user.html, app.js, style.css}
