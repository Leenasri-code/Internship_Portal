# Internship Portal - React + Vite frontend

Standalone frontend for the Internship Portal. It is a React single-page app (Vite, React Router, Axios) that
talks to a **separately hosted Python Flask backend** over a configurable API URL.
No backend code, database access or secrets live in this project.

## What is included (ported from the original Flask templates)

| Original route | Frontend route | Notes |
|---|---|---|
| `/` (language select) | `/` | English / हिन्दी / മലയാളം, translations converted from the `.po` files |
| `/login` | `/login` | Axios -> `POST {API}/auth/login` |
| `/register` | `/register` | Axios -> `POST {API}/auth/register`, same validations/messages |
| `/main_menu` | `/main_menu` | Dashboard: stats, search, recommended internships, apply / view |
| `/profile` + `/profile_data` | `/profile` | Full form, skills autocomplete, photo upload, city list, phone rules, toast |
| `/assessment` | `/assessment` | Timed test, previous/next, results review |
| `/applications` | `/applications` | List + detail view, status badges |
| `/private_internships` | `/private_internships` | 24 listings, working type/location filters, apply / details |
| `/government_internships` | `/government_internships` | 21 listings, detail view, apply |
| `/feedback` | `/feedback` | Star rating + suggestions -> `POST {API}/feedback` |
| `/logout` | sidebar *Logout* | clears the session |

## Requirements

* Node.js 18 or newer (20 LTS recommended) and npm

## Install and run

```bash
npm install
cp .env.example .env        # Windows (cmd): copy .env.example .env
# edit .env  ->  VITE_API_BASE_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```

Production build / local preview:

```bash
npm run build               # outputs ./dist
npm run preview             # serves ./dist on http://localhost:4173
```

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | URL of the Flask API (no trailing slash) |
| `VITE_API_PREFIX` | `/api` | Path prefix of the API routes (empty = root) |
| `VITE_API_WITH_CREDENTIALS` | `true` | Send the Flask session cookie (needs CORS credentials on the API) |
| `VITE_ENABLE_FALLBACK_DATA` | `true` | If a *data* endpoint (internships, applications, assessments, feedback) is missing/unreachable, use the bundled sample data from the original project |
| `VITE_DEMO_MODE` | `false` | Run with **no backend** (any username/password signs in; data kept in localStorage) |

Only `VITE_*` values are bundled into the browser build - never put secrets in them.

## Connecting to the Flask backend

All endpoints are listed in `src/api/endpoints.js` and described in
[`docs/BACKEND_API_CONTRACT.md`](docs/BACKEND_API_CONTRACT.md), including the CORS / cookie settings Flask needs.
**Heads-up:** your original `app.py` is server-rendered (form posts + redirects); only `/profile_data` returns JSON.
Add the JSON routes from the contract (a Blueprint at `/api` is the simplest way) so login, registration and profile
work against the real backend. Until the data routes exist, those screens use the sample data automatically.

Quick UI preview without any backend: set `VITE_DEMO_MODE=true` in `.env` and run `npm run dev`.

## Deploy on Render (Static Site)

1. Push this folder to a Git repository (the folder root must contain `package.json`).
2. In Render choose **New -> Static Site** (or **New -> Blueprint** to use the included `render.yaml`).
3. Settings if configuring manually:
   * **Build command:** `npm install && npm run build`
   * **Publish directory:** `dist`
   * **Environment:** `VITE_API_BASE_URL=https://<your-flask-service>.onrender.com`
   * **Redirects/Rewrites:** add a rewrite `/*  ->  /index.html` (already in `render.yaml`) so deep links such as `/profile` survive a refresh.
4. On the Flask service, allow your static-site URL in CORS and set the session cookie to `SameSite=None; Secure`
   (see the contract doc).

## Project structure

```
src/
  api/          Axios client + one module per backend area (auth, profile, internships, ...)
  components/   Sidebar, layout, protected route, modal, toast ...
  context/      AuthContext (session) and LanguageContext (i18n)
  data/         Sample data from the original templates (used as offline fallback)
  i18n/         translations.json (from translations/*.po)
  pages/        One component per original page
  styles/       base / layout (from menu.css) / auth (from login.css) / profile + scoped utility CSS
public/         favicon, local fallback images, _redirects
```

## Notes on differences from the original templates

* The original loaded Tailwind and Bootstrap globally from CDNs. In a single-page app that would restyle every
  page, so the classes the pages actually use are shipped as small **scoped** stylesheets
  (`tailwind-lite.css`, `bootstrap-lite.css`); Font Awesome still loads from the same cdnjs URL as before.
* Fixed original bugs: the profile city list (`countriesWithCities` was never defined), skills not being restored
  on load, the missing `#toast` element, links to a non-existent `/dashboard`, and the Save button being
  overridden to transparent by `menu.css`.
* Pages that were reachable without logging in (feedback, applications, ...) now require a session, like the profile.
* The private-internship "Internship type" filter was empty in the original; a simple `type` category was added.
* Images/logos that pointed to external hosts (Unsplash, flaticon, randomuser) are unchanged, with local fallbacks.
* `static/main_menu/login.js` in the original was unused dead code (no matching form ids) and is not ported.
