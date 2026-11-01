# Feedback Management System

Full-stack mini project: Admin builds feedback forms, users submit feedback, admin views responses and a chart summary.

## Run
```bash
npm install
npm start
# open http://localhost:3000
```
Default admin: `admin@example.com` / `admin123` (seeded on first run). Users register themselves from the login page.

## Password reset email
The login page includes **Forgot password?**. Configure SMTP before using it:

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-email@example.com"
$env:SMTP_PASS = "your-smtp-password-or-app-password"
$env:MAIL_FROM = "your-email@example.com"
$env:APP_BASE_URL = "http://localhost:3000"
npm start
```

Use an app password when your email provider requires two-factor authentication. Reset links expire after 10 minutes and can only be used once. Never commit SMTP credentials to source control.

Reset emails display the sender name **Feedback Management System**. Gmail may still show the authenticated `SMTP_USER` address in sender details because Gmail does not allow an SMTP client to spoof a different Gmail address.

## Structure
- `server.js` - Express REST API (auth, forms, questions, responses, summary)
- `db.js` - SQLite schema + admin seed (creates `feedback.db`)
- `public/` - frontend: `index.html` (login/register), `admin.html`, `user.html`, `app.js` (helpers), `style.css`
- `PRD.md` - requirements document

## Features
- Admin: CRUD for forms and questions (rating 1-5, multiple choice, text), view/delete responses, summary with Chart.js
- User: register/login, fill active forms (once per form), view own submissions
