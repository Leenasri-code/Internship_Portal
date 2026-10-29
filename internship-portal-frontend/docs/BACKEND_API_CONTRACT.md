# Backend API contract (Flask)

The frontend talks to a **separately hosted** Flask API through Axios. Every URL is built from
`VITE_API_BASE_URL` + `VITE_API_PREFIX` (default `/api`) + the paths below, and all of them are defined in
one file: [`src/api/endpoints.js`](../src/api/endpoints.js).

> **Important - what your uploaded Flask app does today**
>
> The original `app.py` is a server-rendered app: `/login` and `/register` accept HTML form posts and answer
> with redirects + flashed messages, and only `/profile_data` (GET/POST) is a JSON endpoint.
> Applications, assessments, internships and feedback were static HTML/JS (no routes).
> To use this frontend against it you need to expose the JSON routes below (easiest: a Flask Blueprint
> mounted at `/api` that reuses your existing `load_users`, `check_password_hash`, `load_profiles`, ...).
> Until the *data* routes exist the frontend falls back to the bundled sample data
> (`VITE_ENABLE_FALLBACK_DATA=true`); **login, register and profile always require the real backend**
> (or `VITE_DEMO_MODE=true` for a no-backend preview).

## Auth (session cookie)

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/auth/login` | `{ "username", "password" }` | `200 { "username" }` + session cookie | `400/401 { "error" }` |
| POST | `/auth/register` | `{ "username", "password", "confirm_password" }` | `201 { "message" }` | `400 { "error" }` (missing fields / mismatch), `409 { "error" }` (username exists) |
| POST | `/auth/logout` | - | `200 { "status": "success" }` | |
| GET | `/auth/me` | - | `200 { "username" }` | `401` when not logged in |

Replaces the original `POST /login`, `POST /register`, `GET /logout`.

## Profile

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/profile` | - | `200 {profile}` (or `{}` for a new user), `401` if not logged in |
| POST | `/profile` | `{profile}` | `200 { "status": "success" }` |

Same JSON shape the original `/profile_data` used:
`username, email, first_name, last_name, country, city, countryCode, phone, university, degree, field_study,
graduation_year, linkedin, portfolio, bio, photoData (base64 data URL), skills (array of strings)`.

## Internships

`GET /internships?category=recommended|private|government` -> array (or `{ "items": [...] }`).

* **recommended** item: `{ id, title, company, location, duration, applyBy, stipend, logo }`
* **private** item: `{ id, title, email, phone, qualification, location, lastDate, stipend, description: [string], type }`
* **government** item: `{ id, title, stipend, email, phone, location, department, apply, description, terms, perks, lastDate }`

## Applications

* `GET /applications` -> `[ { id, status, applied_on, internship: { title, company, location, duration, stipend }, notes } ]`
  (`status`: `Applied | Reviewed | Interviewing | Rejected | Accepted`)
* `POST /applications` `{ internship_id, category, internship: {title, company, location, duration, stipend} }` -> `201 {application}`

## Assessments

* `GET /assessments` -> `[ { id, title, duration_minutes, questions: [ { id, text, options: [ { id, text } ] } ] } ]`
* `POST /assessments/:id/submit` `{ "answers": { "<questionId>": "<optionId>" } }`
  -> `{ score, total, details: [ { question_id, question, user_answer, user_answer_text, correct_answer, correct_answer_text, is_correct } ] }`

Grade on the server so correct answers never have to be shipped to the browser.

## Feedback

`POST /feedback` `{ "rating": 1-5, "suggestion": "..." }` -> `201 { "status": "success" }`

## CORS + cookies (required because the frontend and API live on different origins)

```python
# pip install flask-cors
from flask_cors import CORS

app.config.update(
    SECRET_KEY=os.environ["SECRET_KEY"],      # keep secrets in backend env vars only
    SESSION_COOKIE_SAMESITE="None",           # cross-site cookie (frontend on another domain)
    SESSION_COOKIE_SECURE=True,               # required with SameSite=None (HTTPS)
)
CORS(app,
     resources={r"/api/*": {"origins": ["https://your-frontend.onrender.com", "http://localhost:5173"]}},
     supports_credentials=True)
```

Notes
* Do not use `origins="*"` together with `supports_credentials=True`; list the exact frontend URLs.
* The original `users.csv` stores `password_plain` next to the hash - worth dropping from the backend.
* The frontend contains **no** secrets: only `VITE_*` values (a public URL and feature flags) reach the browser.
