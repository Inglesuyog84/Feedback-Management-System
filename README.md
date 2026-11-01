# Feedback Management System

A full-stack web-based Feedback Management System developed using HTML, CSS, JavaScript, Node.js, Express.js and SQLite.

## Features

### Admin
- Create, view, update and delete feedback forms.
- Manage feedback questions.
- Support rating, multiple-choice and text questions.
- View and delete submitted responses.
- View feedback summaries and charts.

### User
- Register and log in.
- View active feedback forms.
- Submit feedback.
- View personal submission history.
- Submit feedback only once per form.

## Installation and Setup

1. Clone or download the repository.
2. Install dependencies:

```bash
npm install
```

3. Start the application:

```bash
npm start
```

4. Open your browser:

http://localhost:3000

## Technologies Used

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express.js
- Database: SQLite
- Authentication: bcryptjs and JSON Web Token
- Charts: Chart.js

## Project Structure

- `server.js` – Express backend and REST APIs
- `db.js` – SQLite database configuration
- `index.html` – Login and registration
- `admin.html` – Admin dashboard
- `user.html` – User dashboard
- `app.js` – Frontend JavaScript
- `style.css` – Application styling
- `PRD.md` – Project requirements

## Password Reset

Password reset email functionality requires SMTP configuration. Set the required environment variables in your `.env` file. Never upload SMTP credentials or secrets to GitHub.

## Developer

Suyog Bhaskar Ingle

## License

This project is developed for academic purposes.
