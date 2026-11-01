# Product Requirements Document: Feedback Management System

## 1. Overview
A full-stack web application where an **Admin** creates feedback forms and a **User** fills them in. The admin can then view all responses and a summary (with charts).

## 2. Goals
- Provide full CRUD for feedback forms and their questions (Admin).
- Let users register, log in and submit feedback once per form.
- Give the admin a clear view of individual responses and an aggregated summary.

## 3. Users and Roles
| Role | Capabilities |
|------|--------------|
| Admin | Log in, create/edit/delete forms, create/edit/delete questions, view responses, view summary |
| User | Register, log in, see active forms, submit feedback, view own past submissions |

## 4. Functional Requirements

### 4.1 Authentication
- FR1: Users can register (name, email, password). Passwords are hashed.
- FR2: Login for both roles; session via JWT.
- FR3: Role-based access: admin-only routes are protected.
- FR4: A default admin account is seeded.

### 4.2 Feedback Forms (Admin, CRUD)
- FR5: Create a form with title, description and active/inactive status.
- FR6: Edit a form's details.
- FR7: Delete a form (also deletes its questions and responses).
- FR8: List all forms.

### 4.3 Questions (Admin, CRUD)
- FR9: Add questions to a form. Types: **rating (1-5)**, **multiple choice**, **text**.
- FR10: Edit a question (text, type, options, required flag).
- FR11: Delete a question.

### 4.4 Submitting Feedback (User)
- FR12: View the list of active forms.
- FR13: Open a form and answer all questions; required questions are validated.
- FR14: A user can submit a given form only once.
- FR15: User can view their own submissions.

### 4.5 Responses and Summary (Admin)
- FR16: View the list of responses per form (who, when, answers).
- FR17: Delete a response.
- FR18: Summary per form: total responses, average rating per rating question, option counts for multiple-choice questions (chart), and list of text answers.

## 5. Non-Functional Requirements
- Simple, responsive UI; works in modern browsers.
- Passwords hashed with bcrypt; parameterized SQL queries.
- Runs locally with `npm install && npm start`.

## 6. Tech Stack
- Backend: Node.js, Express
- Database: SQLite (better-sqlite3)
- Auth: JWT + bcryptjs
- Frontend: HTML, CSS, vanilla JavaScript, Chart.js (CDN)

## 7. Data Model
- **users**(id, name, email UNIQUE, password_hash, role, created_at)
- **forms**(id, title, description, is_active, created_at)
- **questions**(id, form_id FK, text, type, options JSON, required, position)
- **responses**(id, form_id FK, user_id FK, submitted_at, UNIQUE(form_id, user_id))
- **answers**(id, response_id FK, question_id FK, value)

## 8. API Outline
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/forms`, `GET/PUT/DELETE /api/forms/:id`
- `POST /api/forms/:id/questions`, `PUT/DELETE /api/questions/:id`
- `POST /api/forms/:id/responses` (user), `GET /api/forms/:id/responses` (admin), `DELETE /api/responses/:id` (admin)
- `GET /api/forms/:id/summary` (admin), `GET /api/my/responses` (user)

## 9. Pages
- `index.html` (login/register), `admin.html` (forms, question builder, responses, summary), `user.html` (available forms, fill form, my submissions)

## 10. Out of Scope (possible extras)
Email notifications, CSV export, anonymous feedback, form deadlines.

## 11. Milestones
1. PRD  2. Backend  3. Frontend  4. Testing and summary
