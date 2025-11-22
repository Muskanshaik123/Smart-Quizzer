# SmartQuizzer (Adaptive Quiz Generator)

This workspace contains a minimal adaptive quiz platform with backend (Express + SQLite) and frontend pages.

## Quick setup (PowerShell)

1. Install dependencies for backend

```powershell
cd e:\smart\backend
npm install
```

2. Create `.env` (optional) with values like:

```
PORT=5000
SESSION_SECRET=your_secret_here
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_app_password
GEMINI_API_KEY=your_gemini_key
```

3. Start server

```powershell
cd e:\smart\backend
node server.js
# or
npm start
```

4. Open the frontend pages in a browser:

- `http://localhost:5000/` - landing
- `http://localhost:5000/login.html` - user login
- `http://localhost:5000/dashboard.html` - user dashboard (requires login)
- `http://localhost:5000/admin-login.html` - admin login
- `http://localhost:5000/admin-dashboard.html` - admin dashboard (requires admin login)

## Notes & next steps

- I added server endpoints for admin delete operations and certificate view/download.
- Frontend now opens certificate view/download pages served by the backend.
- For production, change `SESSION_SECRET`, enable HTTPS, and secure cookies.
- If you want, I can:
  - Improve certificate PDF generation (server-side PDF creation)
  - Add unit tests or simple integration tests
  - Polish certificate UI/CSS and add an in-app viewer modal
  - Add server endpoints for exporting CSVs

If you want me to continue, tell me which of the next steps you'd like me to prioritize.
