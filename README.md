# Arnav Roy portfolio: full version (runs in VS Code)

React + Vite + TypeScript front end, with a small Node (Express) server that
adds the same features as the Floot version:

- Admin login at `/login` (only you), and an admin at `/admin` with tabs for
  Projects, Profile, Skills, Experiments and Messages
- Add / edit / delete projects, cover image upload, "signature" projects
- Contact form that saves messages, readable at the bottom of `/admin`
- Automatic "Last updated" date in the footer
- Dark theme, 3D wireframe hero, interactive grid, curtain page transitions

## 1. Set up your login (one time)
1. Copy `.env.example` to a new file named `.env` (same folder).
2. Open `.env` and set:
   - `ADMIN_EMAIL`    the email you will log in with
   - `ADMIN_PASSWORD` a long password only you know
   - `SESSION_SECRET` any long random text
3. Never share or upload `.env` (it is already in `.gitignore`).

## 2. Run it
Install Node.js 18+ from https://nodejs.org, open this folder in VS Code, then
in the terminal:

    npm install
    npm run dev

Open http://localhost:5173 . The admin is at http://localhost:5173/admin
(type the address; there is no public link to it).

## Where things are stored
- `data/db.json`  your profile, projects, skills, experiments and messages.
  It is created the first time the server runs. You can edit it by hand
  (name, intro, bio, skills, experiments, links) and save; changes show up
  on the next page load. Back this file up.
- `uploads/`      cover images you upload.

## Editing your site
Everything is edited in the admin at `/admin`, using the tabs:
Projects, Profile (name, intro, craft, bio, availability, email, links),
Skills & tools, Experiments and Messages. Changes show on the site right away.
(Advanced: all of it lives in `data/db.json`, which you can also edit by hand.)

## Put it online
This version needs a server, so plain static hosting (Netlify drag-and-drop,
GitHub Pages) will not work. Use a host that runs Node, such as Render,
Railway or a VPS:

    npm install
    npm run build
    npm start

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (and optionally `PORT`)
as environment variables on the host, and keep `data/` and `uploads/` on a
persistent disk, or you will lose them when the host restarts. Use HTTPS.

## Security notes
- Admin routes check your login cookie on the server, not just in the browser.
- Wrong passwords are limited to 5 tries per 15 minutes.
- Uploads accept only PNG, JPEG, WebP and GIF up to 8 MB, saved under random names.
- Do not commit `.env`, `data/` or `uploads/`.
