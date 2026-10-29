# Internship Portal – Backend API

Flask + MongoDB REST API (JSON only) for the Internship Portal. It replaces the original server-rendered Flask app
(`users.csv` / `profiles.json` / HTML templates) and is meant to be consumed by a separate React + Vite frontend.

## What the original app did → where it lives now

| Original | Backend now |
|---|---|
| `/register`, `/login`, `/logout` (CSV users, **plaintext password column**) | `POST /api/auth/register|login|logout`, `GET /api/auth/me` – hashed passwords (scrypt), JWT |
| `/profile_data` GET/POST (profiles.json) | `GET/PUT/POST/PATCH /api/profile`, `/api/profile/options`, `/api/profile/skills` |
| Government internships page (21 hard-coded items in JS) | `GET /api/internships?type=government` (seeded from your data) |
| Private internships page (24 cards) + dashboard "top picks" (10) | `GET /api/internships?type=private` (34 seeded), `GET /api/dashboard`, `/api/internships/recommended` |
| Apply buttons / Application Management (hard-coded sample data, statuses Applied/Reviewed/Interviewing/Rejected/Accepted) | `/api/applications…` stored per user |
| Assessment test (1 test, 3 questions, timer, score + per-question review) | `/api/assessments…` (server-side timing & grading; correct answers never sent before submit) |
| Feedback page (1–5 stars + suggestion; was not saved anywhere) | `/api/feedback` |
| Flask-Babel languages en/hi/ml | `GET /api/languages`, `GET /api/i18n/<lang>` (your `.po` catalogs as JSON) |

Notes on scope (honest list):
* **No AI features existed in the original, so there is no Gemini integration** and no Gemini key is needed. `/api/internships/recommended` is plain keyword matching on profile skills/field of study/city.
* The original JS referenced a `countriesWithCities` object that was never defined; the city lists in `app/data/locations.json` are new (editable).
* The original "Apply", "feedback submit" and "Search" buttons did nothing server-side; the endpoints for them are new, implemented to match the UI.
* The original sidebar had a `/dashboard` route that did not exist; `GET /api/dashboard` supplies the main-menu data.
* Tested with an in-memory MongoDB mock (`mongomock`) – **not** against a live Atlas cluster in this environment. Run the smoke test below against your own database after configuring it.

## Project layout

```
wsgi.py                 entry point (gunicorn wsgi:app)
config.py               env-based settings
app/__init__.py         app factory (CORS, error handlers, Mongo, indexes, seed)
app/routes/             auth, profile, internships, applications, assessments, feedback, meta (health/i18n/dashboard)
app/services/           business logic (auth/JWT, users, profiles, internships, applications, assessments, i18n, seed)
app/models/             collection names, constants, indexes, serializers
app/data/               seed data extracted from the original app (+ skills, locations)
app/translations/       original hi / ml .po/.mo catalogs
scripts/                seed.py, create_admin.py, migrate_legacy.py
tests/                  pytest suite (19 tests)
render.yaml, Procfile   Render deployment
```

## Setup (local)

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then edit values
python wsgi.py                                         # http://localhost:5000
curl localhost:5000/api/health
```

### MongoDB configuration
* **Local**: `MONGODB_URI=mongodb://localhost:27017`
* **Atlas**: create a cluster → Database Access (user/password) → Network Access (allow your IP, or `0.0.0.0/0` for Render) → Connect → *Drivers* and copy the string:
  `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
  URL-encode special characters in the password. Database name is `MONGODB_DB` (default `internship_portal`).
* Indexes are created on startup. With `AUTO_SEED=true` (default) the internships and assessment are inserted on startup if missing (idempotent, never overwrites your edits). Or run `python scripts/seed.py`.

### Environment variables
| Var | Default | Notes |
|---|---|---|
| `APP_ENV` | development | `production` enforces strong secrets and a non-localhost DB |
| `SECRET_KEY` | – | required in production (32+ chars) |
| `JWT_SECRET_KEY` | = SECRET_KEY | |
| `JWT_EXPIRES_HOURS` | 12 | |
| `MONGODB_URI`, `MONGODB_DB` | see above | |
| `CORS_ORIGINS` | http://localhost:5173 | comma-separated frontend origins |
| `AUTO_SEED` | true | |
| `ENFORCE_APPLICATION_DEADLINE` | false | seed data has past deadlines; enable with real data |
| `ASSESSMENT_GRACE_SECONDS` | 15 | late-submit tolerance |
| `LOGIN_MAX_FAILURES` / `LOGIN_LOCK_MINUTES` | 10 / 15 | per username+IP lockout |
| `PHOTO_MAX_BYTES` | 2097152 | profile photo (base64 data URI) limit |

### Scripts
```bash
python scripts/create_admin.py <username> [email]                      # create/promote an admin (prompts for password)
python scripts/migrate_legacy.py --users users.csv --profiles profiles.json   # import old users + profiles
python scripts/seed.py
pip install -r requirements-dev.txt && pytest                          # tests (use mongomock, no DB needed)
```
`migrate_legacy.py` keeps users' existing scrypt hashes (they can log in with their old passwords) and **ignores the plaintext `password_plain` column**. Your old `users.csv` contains plaintext passwords – delete it after migrating. (Not included in this ZIP.)

## Deploy on Render
1. Push this folder to a Git repo. 2. Render → New → *Blueprint* (uses `render.yaml`) or a Web Service with build `pip install -r requirements.txt`, start `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`, health check `/api/health`.
3. Set env vars: `MONGODB_URI` (Atlas), `CORS_ORIGINS` (your frontend URL, no trailing slash), `SECRET_KEY` (auto-generated by the blueprint), `APP_ENV=production`.
4. In Atlas Network Access allow Render's outbound IPs (or `0.0.0.0/0`). 5. Create an admin via Render Shell: `python scripts/create_admin.py admin you@example.com`.

## API conventions
* Base path `/api`. JSON in, JSON out (`Content-Type: application/json`).
* **Auth**: `Authorization: Bearer <token>` from `/api/auth/login`. Legend below: 🔓 public, 🔑 logged-in user, 🛡 admin.
* **Errors** always: `{"error": {"code": "<machine_code>", "message": "...", "details": {"field": "msg"}}}` (`details` only for validation).
  Status codes: 400 bad JSON/params · 401 missing/invalid/expired token or bad credentials · 403 not admin · 404 · 405 · 409 conflict · 422 validation · 429 too many logins · 500.
* Ids are strings (Mongo ObjectIds). Timestamps are ISO-8601 UTC.
* Paginated lists: `?page=1&limit=20` (max 100) → `{items, page, limit, total, pages}`.
* Frontend tip (Vite): `VITE_API_URL=http://localhost:5000/api`; store the token in memory/localStorage and send the header on every protected call. On 401 `token_expired`/`invalid_token`, redirect to login.

## Endpoints

### Meta
| | Request | Response |
|---|---|---|
| 🔓 `GET /api/health` | – | `{"status":"ok","database":true}` (503 if DB down) |
| 🔓 `GET /api/languages` | – | `{"languages":[{"code":"en","name":"English"},{"code":"hi",…},{"code":"ml",…}],"default":"en"}` |
| 🔓 `GET /api/i18n/<lang>` | `lang` ∈ en, hi, ml | `{"lang":"hi","messages":{"<english msgid>":"<translation>"}}` (`en` → `{}`; fall back to the English key) |
| 🔑 `GET /api/dashboard` | – | `{"username","recommended_count","applied_count","shortlisted_count","top_picks":[Internship+match_score]}` |

### Auth
| | Request body | Response |
|---|---|---|
| 🔓 `POST /api/auth/register` | `{"username":"jane" (3-100, no spaces; may be an email), "password":"min 6", "confirm_password":"…", "email":"optional"}` | 201 `{"message","user":{id,username,email,role,created_at}}`; 409 `username_taken`/`email_taken`; 422 |
| 🔓 `POST /api/auth/login` | `{"username":"jane or email","password":"…"}` | `{"token","token_type":"Bearer","expires_at","user"}`; 401 `invalid_credentials`; 429 |
| 🔑 `GET /api/auth/me` | – | `{"user":{…}}` |
| 🔑 `POST /api/auth/logout` | – | `{"message"}` – token is revoked server-side |
| 🔑 `POST /api/auth/change-password` | `{"current_password","new_password"}` | `{"message"}` |

### Profile (🔑)
Fields: `username, email*, first_name*, last_name*, country*, city, countryCode*, phone*, university*, degree*, field_study*, graduation_year*, linkedin, portfolio, bio, photoData, skills[]` (* required on full save).
Rules: country ∈ India, USA, UK, Australia, Japan; `countryCode`/phone length: +91:10, +1:10, +44:10, +61:9, +81:10 (digits only); year 1900–2100; linkedin/portfolio http(s) URL; `photoData` = `data:image/(png|jpeg|gif|webp);base64,…` ≤ `PHOTO_MAX_BYTES`; skills ≤ 50, de-duplicated case-insensitively.

| | Request | Response |
|---|---|---|
| `GET /api/profile` | – | `{"profile":{…all fields, defaults empty, "updated_at"},"exists":bool}` |
| `PUT` or `POST /api/profile` | full profile JSON | `{"status":"success","profile":{…}}` (replaces) |
| `PATCH /api/profile` | any subset of fields | `{"status":"success","profile":{…}}` (merges) |
| 🔓 `GET /api/profile/options` | – | `{"countries":[{"name","phone_code","phone_length","cities":[…]}]}` |
| 🔓 `GET /api/profile/skills?q=pyt` | – | `{"skills":["python","pytorch"]}` (prefix match, max 7; no `q` → all) |

### Internships
Internship object: `{id, type:"government"|"private", title, company, department, stipend, email, phone, location, eligibility, description, terms, perks, last_date, last_date_iso, duration, logo, skills[], featured, is_active, has_applied (only when a token is sent)}`.

| | Request | Response |
|---|---|---|
| 🔓 `GET /api/internships` | query: `type`, `q` (title/company/location/department/eligibility/description), `location`, `featured=true`, `page`, `limit` (sends `has_applied` if token present) | paginated list |
| 🔓 `GET /api/internships/government` · `/private` | same filters | paginated list |
| 🔓 `GET /api/internships/<id>` | – | `{"internship":{…}}` |
| 🔑 `GET /api/internships/recommended` | – | `{"items":[Internship+match_score]}` top 5 by profile match |
| 🛡 `POST /api/internships` | `{type*, title*, company, department, stipend, email, phone, location, eligibility, description, terms, perks, last_date ("15 Sep 2025" / "15-Sep-2025" / "2025-09-15"), duration, logo(url), skills[], featured}` | 201 `{"internship"}`; 409 duplicate |
| 🛡 `PUT/PATCH /api/internships/<id>` | any subset | `{"internship"}` |
| 🛡 `DELETE /api/internships/<id>` | – | soft-delete `{"message"}` |

### Applications (🔑 — users only ever see their own)
Application: `{id, internship_id, internship:{title,company,department,location,duration,stipend,type,email,phone}, status, applied_on:"YYYY-MM-DD", notes, status_history:[{status,at}], created_at, updated_at}`. Statuses: `Applied, Reviewed, Interviewing, Rejected, Accepted`.

| | Request | Response |
|---|---|---|
| `POST /api/applications` | `{"internship_id":"…","notes":"optional"}` | 201 `{"application"}`; 409 `already_applied`; 404; 400 `deadline_passed` (if enforced) |
| `GET /api/applications` | `?status=` | `{"items":[…]}` newest first |
| `GET /api/applications/summary` | – | `{"total","by_status":{…},"applied" (in progress),"shortlisted" (= Interviewing)}` |
| `GET /api/applications/<id>` | – | `{"application"}` |
| `PATCH /api/applications/<id>` | `{"notes":"…"}` | `{"application"}` |
| `DELETE /api/applications/<id>` | – | withdraw `{"message"}` (not allowed once Accepted) |
| 🛡 `GET /api/admin/applications` | `?status=&internship_id=&page=&limit=` | paginated, includes `user_id`, `username` |
| 🛡 `PATCH /api/applications/<id>/status` | `{"status":"Reviewed","notes":"optional"}` | `{"application"}` |

### Assessments (🔑)
Flow: list → `POST …/start` (starts server timer) → answer in UI → `POST …/submit` with `attempt_id`. Questions never include correct answers.

| | Request | Response |
|---|---|---|
| `GET /api/assessments` | – | `{"items":[{id,title,duration_minutes,question_count,best_score}]}` |
| `GET /api/assessments/<id>` | – | `{"assessment":{…,"questions":[{id,text,options:[{id,text}]}]}}` |
| `POST /api/assessments/<id>/start` | – | 201 `{"attempt_id","started_at","expires_at","duration_minutes","title","questions":[…]}` |
| `POST /api/assessments/<id>/submit` | `{"attempt_id":"…","answers":{"1":"b","2":"b"}}` (unanswered = omit) | `{"attempt_id","score","total","percentage","details":[{question_id,text,your_answer (null=no answer),your_answer_text,correct_answer,correct_answer_text,is_correct}]}`; 409 `time_expired` (after duration + grace) / `already_submitted` |
| `GET /api/assessments/attempts` | – | `{"items":[submitted attempts (without details)]}` |
| `GET /api/assessments/attempts/<attempt_id>` | – | `{"attempt":{…,"details":[…]}}` |
| 🛡 `POST /api/assessments` | `{"title","duration_minutes":1-300,"questions":[{"id"?, "text","options":[{"id":"a","text":"…"}…≥2],"correct":"a"}]}` | 201 `{"assessment"}` (includes answers) |
| 🛡 `GET /api/assessments/<id>/admin` · `PUT/PATCH /api/assessments/<id>` · `DELETE /api/assessments/<id>` | | with answers / updated / soft-deleted |

### Feedback
| | Request | Response |
|---|---|---|
| 🔑 `POST /api/feedback` | `{"rating":1-5 (integer), "suggestion":"optional ≤2000 chars"}` | 201 `{"message","feedback":{id,username,rating,suggestion,created_at}}` |
| 🔑 `GET /api/feedback/mine` | – | `{"items":[…]}` |
| 🛡 `GET /api/feedback` | `?page=&limit=` | `{"items","page","limit","total","average_rating"}` |

## Security summary
Passwords hashed with scrypt (Werkzeug) – never stored or returned in plaintext; JWT (HS256) with expiry and server-side revocation on logout; admin role checks; ownership checks on applications/attempts (404 for other users' ids); regex-escaped search; request size limit; per-username+IP login lockout; strict CORS allow-list; secrets only via environment; production refuses to start with weak/missing secrets.
